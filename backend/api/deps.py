from fastapi import HTTPException, Request, Response
import jwt
from bson import ObjectId
from core.config import JWT_SECRET, AUTH_COOKIE_NAME, AUTH_COOKIE_SECURE, AUTH_COOKIE_SAMESITE, CSRF_HEADER
from core.database import db
from core.security import TOKEN_TTL
from utils.streak import check_and_apply_streak_shields

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def set_auth_cookie(response: Response, token: str):
    # httpOnly: page scripts can't read it, so an XSS bug can't steal the session
    response.set_cookie(
        AUTH_COOKIE_NAME, token,
        max_age=int(TOKEN_TTL.total_seconds()),
        httponly=True, secure=AUTH_COOKIE_SECURE, samesite=AUTH_COOKIE_SAMESITE, path="/",
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie(
        AUTH_COOKIE_NAME, httponly=True, secure=AUTH_COOKIE_SECURE, samesite=AUTH_COOKIE_SAMESITE, path="/",
    )


def _get_token(request: Request) -> str:
    # Bearer header is still accepted for API clients and tests; the browser app uses the cookie
    auth = request.headers.get("authorization")
    if auth:
        scheme, _, credentials = auth.partition(" ")
        if scheme.lower() != "bearer" or not credentials:
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        return credentials

    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # CSRF: browsers attach cookies to cross-site requests, but a cross-site page can't add a
    # custom header without a CORS preflight, which only our ALLOWED_ORIGINS pass.
    if request.method not in SAFE_METHODS and not request.headers.get(CSRF_HEADER):
        raise HTTPException(status_code=403, detail="Missing CSRF header")
    return token


def get_current_user(request: Request):
    token = _get_token(request)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
        # A deleted account has no user doc, so its old tokens stop here (ObjectIds are never reused)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Security: Invalidate tokens if the password was changed (version mismatch)
        if payload.get("v") != user.get("token_version", 1):
             raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

        # No DB calls unless a missed day actually needs a shield
        user = check_and_apply_streak_shields(user)

        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def validate_user_owns_category(category_id: str, user_id: str):
    """Raise 403 if the category doesn't belong to this user."""
    cat = db.categories.find_one({"_id": ObjectId(category_id), "user_id": user_id})
    if not cat:
        raise HTTPException(status_code=403, detail="Category not found or access denied")
