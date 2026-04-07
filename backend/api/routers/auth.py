from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from bson import ObjectId, errors as bson_errors
from datetime import timedelta, timezone
import secrets

from core.database import db
from core.security import hash_password, verify_password, create_token
from core.config import ALLOWED_ORIGINS
from utils.cache import utcnow, cache_get, cache_set, cache_invalidate
from utils.email import send_email
from utils.helpers import clean_update
from api.deps import get_current_user
from models.schemas import (
    RegisterModel, LoginModel, ProfileUpdateModel, PasswordChangeModel,
    EmailChangeModel, PublicToggleModel
)

router = APIRouter(prefix="/auth", tags=["auth"])
public_router = APIRouter(prefix="/public", tags=["public"])

@router.post("/register")
def register(data: RegisterModel, background_tasks: BackgroundTasks):
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
    })

    uid_str = str(result.inserted_id)
    db.users.update_one({"_id": result.inserted_id}, {"$set": {"token_version": 1}})

    default_categories = [
        {"user_id": uid_str, "name": "Mind", "icon": "🧠", "color": "#c9a84c", "description": "Learning, intellect, and mental health", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Body", "icon": "💪", "color": "#6b8c6b", "description": "Physical health, fitness, and nutrition", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Career", "icon": "💼", "color": "#5b8ba8", "description": "Professional growth and work tasks", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Finance", "icon": "💰", "color": "#8b6bc4", "description": "Wealth, savings, and investments", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Spirit", "icon": "🌿", "color": "#c46b8b", "description": "Peace, philosophy, and connection", "archived": False, "created_at": utcnow()}
    ]
    db.categories.insert_many(default_categories)

    verify_token = secrets.token_urlsafe(32)
    db.users.update_one({"_id": ObjectId(uid_str)}, {"$set": {"verification_token": verify_token, "verification_sent_at": utcnow()}})
    
    base_url = ALLOWED_ORIGINS[0]
    verification_link = f"{base_url}/verify/{verify_token}"
    
    email_body = f"""
    <div style="font-family: sans-serif; max-width: 500px; padding: 40px; background: #fdfcf9; border: 1px solid #eee; border-radius: 16px; color: #0d0d0d;">
        <h2 style="font-family: serif; color: #6b8c6b; font-size: 24px;">Welcome to GrowthLog, {data.name}! ✦</h2>
        <p style="font-size: 15px; line-height: 1.6;">We're thrilled to have you join our community of intentional growth. Your journey starts here.</p>
        <p style="font-size: 15px; line-height: 1.6;">Please verify your email to unlock your public profile and start your first log:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_link}" style="display: inline-block; background: #6b8c6b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold;">Verify My Email ○</a>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">If the button doesn't work, copy this link: <br/>{verification_link}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">GrowthLog — The Holistic Tracking Platform</p>
    </div>
    """
    background_tasks.add_task(send_email, data.email, "Verify your GrowthLog ✦", email_body)

    return {"token": create_token(uid_str, 1),
            "user": {"id": uid_str, "name": data.name, "email": data.email, "created_at": utcnow().isoformat(), "is_verified": False}}

@router.post("/verify/send")
def send_verification(current_user=Depends(get_current_user)):
    if current_user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="User is already verified")
    
    last_sent = current_user.get("verification_sent_at")
    if last_sent:
        if last_sent.tzinfo is None: last_sent = last_sent.replace(tzinfo=timezone.utc)
        if (utcnow() - last_sent).total_seconds() < 60:
            raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another email")

    token = secrets.token_urlsafe(32)
    expires = utcnow() + timedelta(hours=24)

    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "verification_token": token,
        "verification_token_expires": expires,
        "verification_sent_at": utcnow()
    }})
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
    
    db.users.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True, "verification_token": None, "verification_token_expires": None}})
    return {"success": True}

@router.post("/login")
def login(data: LoginModel):
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(str(user["_id"]), user.get("token_version", 1)),
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "created_at": user.get("created_at", utcnow()).isoformat()}}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    u = current_user
    return {
        "id": str(u["_id"]), "name": u["name"], "email": u["email"],
        "streak": u.get("streak", 0), "longest_streak": u.get("longest_streak", 0),
        "bio": u.get("bio", ""), "avatar_emoji": u.get("avatar_emoji", "🌱"),
        "timezone": u.get("timezone", "UTC"),
        "created_at": u.get("created_at", utcnow()).isoformat(),
        "is_public": u.get("is_public", False),
        "is_verified": u.get("is_verified", False),
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
def change_email(data: EmailChangeModel, current_user=Depends(get_current_user)):
    if not verify_password(data.password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if db.users.find_one({"email": data.new_email}):
        raise HTTPException(status_code=400, detail="Email is already in use")
    
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "email": data.new_email,
        "is_verified": False,
        "verification_token": None,
        "verification_token_expires": None
    }})
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
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_public", False):
        raise HTTPException(status_code=403, detail="Profile is private")
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

@router.delete("/me")
def delete_account(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.categories.delete_many({"user_id": uid})
    db.category_templates.delete_many({"user_id": uid})
    db.goals.delete_many({"user_id": uid})
    db.manifestations.delete_many({"user_id": uid})
    db.snapshots.delete_many({"user_id": uid})
    db.daily_logs.delete_many({"user_id": uid})
    db.users.delete_one({"_id": current_user["_id"]})
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"categories:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}

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
    }
    cache_set(cache_key, result, ttl=300)
    return result
