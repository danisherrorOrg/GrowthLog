from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from core.rate_limit import limiter
from bson import ObjectId, errors as bson_errors
from datetime import timedelta, timezone
import secrets

from core.database import db
from core.security import hash_password, verify_password, create_token
from core.config import ALLOWED_ORIGINS
from utils.cache import utcnow, cache_get, cache_set, cache_invalidate_exact, cache_invalidate_prefix
from utils.email import send_email, render_email
from utils.helpers import clean_update
from utils.user_data import wipe_user_data, default_categories, USER_PROGRESS_RESET
from api.deps import get_current_user
from models.schemas import (
    RegisterModel, LoginModel, ProfileUpdateModel, PasswordChangeModel,
    EmailChangeModel, PublicToggleModel
)

router = APIRouter(prefix="/auth", tags=["auth"])
public_router = APIRouter(prefix="/public", tags=["public"])

VERIFICATION_TTL = timedelta(hours=24)


def _queue_verification_email(background_tasks: BackgroundTasks, to_email: str, name: str, token: str, new_address: bool = False):
    link = f"{ALLOWED_ORIGINS[0]}/verify/{token}"
    if new_address:
        subject = "Verify your new email ✦"
        body = render_email(
            "Verify your new email",
            [f"Hi {name}, you recently changed your email address on GrowthLog.",
             "Please verify your new email to keep your account secure. This link expires in 24 hours."],
            "Verify My Email", link,
            note="If you didn't request this change, please contact support immediately.",
        )
    else:
        subject = "Verify your GrowthLog ✦"
        body = render_email(
            f"Welcome to GrowthLog, {name}!",
            ["We're thrilled to have you join our community of intentional growth. Your journey starts here.",
             "Please verify your email to unlock your public profile. This link expires in 24 hours."],
            "Verify My Email", link,
        )
    background_tasks.add_task(send_email, to_email, subject, body)

@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, data: RegisterModel, background_tasks: BackgroundTasks):
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    result = db.users.insert_one({
        "name": data.name, "email": data.email,
        "password": hash_password(data.password),
        "created_at": utcnow(),
        "streak": 0, "longest_streak": 0, "last_log_date": None,
        "bio": "", "avatar_emoji": "🌱", "timezone": "UTC",
        "is_verified": False, "verification_token": None,
        "email_notifications": True,
        "category_colors": ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'],
        "category_icons": ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡']
    })

    uid_str = str(result.inserted_id)
    db.users.update_one({"_id": result.inserted_id}, {"$set": {"token_version": 1}})

    db.categories.insert_many(default_categories(uid_str))

    verify_token = secrets.token_urlsafe(32)
    db.users.update_one({"_id": ObjectId(uid_str)}, {"$set": {
        "verification_token": verify_token,
        "verification_token_expires": utcnow() + VERIFICATION_TTL,
        "verification_sent_at": utcnow(),
    }})
    _queue_verification_email(background_tasks, data.email, data.name, verify_token)

    return {"token": create_token(uid_str, 1),
            "user": {"id": uid_str, "name": data.name, "email": data.email, "created_at": utcnow().isoformat(), "is_verified": False, "streak_shields": 0, "shield_milestones": []}}

@router.post("/verify/send")
@limiter.limit("3/minute")
def send_verification(request: Request, background_tasks: BackgroundTasks, current_user=Depends(get_current_user)):
    if current_user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="User is already verified")
    
    last_sent = current_user.get("verification_sent_at")
    if last_sent:
        if last_sent.tzinfo is None: last_sent = last_sent.replace(tzinfo=timezone.utc)
        if (utcnow() - last_sent).total_seconds() < 60:
            raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another email")

    token = secrets.token_urlsafe(32)
    expires = utcnow() + VERIFICATION_TTL

    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "verification_token": token,
        "verification_token_expires": expires,
        "verification_sent_at": utcnow()
    }})
    # A pending email change is verified at the new address
    pending = current_user.get("pending_email")
    _queue_verification_email(
        background_tasks, pending or current_user["email"], current_user.get("name", "there"), token,
        new_address=bool(pending),
    )
    return {"success": True}

@router.get("/verify/{token}")
def verify_email(token: str):
    user = db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    expires = user.get("verification_token_expires")
    if expires:
        if expires.tzinfo is None: expires = expires.replace(tzinfo=timezone.utc)
        if utcnow() > expires:
            raise HTTPException(status_code=400, detail="Verification link has expired")
    
    updates = {"is_verified": True, "verification_token": None, "verification_token_expires": None}
    if user.get("pending_email"):
        updates["email"] = user["pending_email"]
        updates["pending_email"] = None
        
    db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    return {"success": True}

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginModel):
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(str(user["_id"]), user.get("token_version", 1)),
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "created_at": user.get("created_at", utcnow()).isoformat(), "streak_shields": user.get("streak_shields", 0), "shield_milestones": user.get("shield_milestones", [])}}

@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    new_version = current_user.get("token_version", 1) + 1
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"token_version": new_version}})
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "profile", uid, "Logged out")
    return {"success": True}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    u = current_user
    return {
        "id": str(u["_id"]), "name": u["name"], "email": u["email"],
        "streak": u.get("streak", 0), "longest_streak": u.get("longest_streak", 0),
        "streak_shields": u.get("streak_shields", 0), "shield_milestones": u.get("shield_milestones", []),
        "bio": u.get("bio", ""), "avatar_emoji": u.get("avatar_emoji", "🌱"),
        "timezone": u.get("timezone", "UTC"),
        "created_at": u.get("created_at", utcnow()).isoformat(),
        "is_public": u.get("is_public", False),
        "is_verified": u.get("is_verified", False),
        "pending_email": u.get("pending_email"),
        "category_colors": u.get("category_colors", ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b']),
        "category_icons": u.get("category_icons", ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡'])
    }

@router.put("/profile")
def update_profile(data: ProfileUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.users.update_one({"_id": current_user["_id"]}, {"$set": fields})
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "profile", uid, "Updated profile")
    return {"success": True}

@router.put("/password")
def change_password(data: PasswordChangeModel, current_user=Depends(get_current_user)):
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_version = current_user.get("token_version", 1) + 1
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "password": hash_password(data.new_password),
        "token_version": new_version
    }})
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "profile", uid, "Changed password")
    return {"success": True}

@router.put("/email")
def change_email(data: EmailChangeModel, background_tasks: BackgroundTasks, current_user=Depends(get_current_user)):
    if not verify_password(data.password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if db.users.find_one({"email": data.new_email}):
        raise HTTPException(status_code=400, detail="Email is already in use")
    
    verify_token = secrets.token_urlsafe(32)
    expires = utcnow() + timedelta(hours=24)
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "pending_email": data.new_email,
        "verification_token": verify_token,
        "verification_token_expires": expires,
        "verification_sent_at": utcnow()
    }})

    _queue_verification_email(background_tasks, data.new_email, current_user.get("name", "there"), verify_token, new_address=True)

    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "profile", uid, "Changed email")
    return {"success": True, "email": data.new_email, "is_verified": False}

@router.put("/public")
def toggle_public(data: PublicToggleModel, current_user=Depends(get_current_user)):
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"is_public": data.is_public}})
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "profile", uid, "Toggled public profile")
    return {"success": True, "is_public": data.is_public}

@public_router.get("/u/{user_id}")
def get_public_stats(user_id: str):
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except bson_errors.InvalidId:
        raise HTTPException(status_code=404, detail="User not found")
    if not user or not user.get("is_public", False):
        raise HTTPException(status_code=404, detail="User not found")
    created_at = user.get("created_at", utcnow())
    return {
        "name": user["name"],
        "bio": user.get("bio", ""),
        "avatar_emoji": user.get("avatar_emoji", "🌱"),
        "created_at": created_at.isoformat(),
        "streak": user.get("streak", 0),
        "longest_streak": user.get("longest_streak", 0),
        "total_logs": db.daily_logs.count_documents({"user_id": user_id}),
        "completed_goals": db.goals.count_documents({"user_id": user_id, "status": "completed"}),
        "total_manifestations": db.manifestations.count_documents({"user_id": user_id}),
        "total_snapshots": db.snapshots.count_documents({"user_id": user_id})
    }

@router.delete("/me/data")
def delete_all_data(current_user=Depends(get_current_user)):
    """Erase everything the user has logged but keep the account, login and profile settings."""
    uid = str(current_user["_id"])
    deleted = wipe_user_data(uid)
    db.users.update_one({"_id": current_user["_id"]}, {"$set": USER_PROGRESS_RESET})
    db.categories.insert_many(default_categories(uid))
    return {"success": True, "deleted": deleted}

@router.delete("/me")
def delete_account(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    wipe_user_data(uid)
    db.users.delete_one({"_id": current_user["_id"]})

    # Invalidate token explicitly for its entire 30-day lifetime
    db.jwt_blocklist.insert_one({"user_id": uid, "expire_at": utcnow() + timedelta(days=30)})
    return {"success": True, "action": "logout"}

@router.get("/stats")
def get_user_stats(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cache_key = f"stats:{uid}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    created_at = current_user.get("created_at", utcnow())
    goal_pipeline = list(db.goals.aggregate([
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    goal_counts = {g["_id"]: g["count"] for g in goal_pipeline}
    manifestation_pipeline = list(db.manifestations.aggregate([
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    m_counts = {m["_id"]: m["count"] for m in manifestation_pipeline}
    result = {
        "total_logs": db.daily_logs.count_documents({"user_id": uid}),
        "total_goals": sum(goal_counts.values()),
        "completed_goals": goal_counts.get("completed", 0),
        "total_manifestations": sum(m_counts.values()),
        "completed_manifestations": m_counts.get("completed", 0),
        "total_snapshots": db.snapshots.count_documents({"user_id": uid}),
        "total_categories": db.categories.count_documents({"user_id": uid, "archived": {"$ne": True}}),
        "days_since_join": (utcnow() - (created_at.replace(tzinfo=timezone.utc) if created_at.tzinfo is None else created_at)).days,
        "streak": current_user.get("streak", 0),
        "longest_streak": current_user.get("longest_streak", 0),
        "streak_shields": current_user.get("streak_shields", 0),
    }
    cache_set(cache_key, result, ttl=300)
    return result
