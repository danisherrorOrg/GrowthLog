from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from bson import ObjectId
from core.config import JWT_SECRET
from core.database import db

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Security: Invalidate tokens if the password was changed (version mismatch)
        if payload.get("v") != user.get("token_version", 1):
             raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
             
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
