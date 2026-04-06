from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from bson import ObjectId, errors as bson_errors
import bcrypt
import jwt
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import BackgroundTasks
from dotenv import load_dotenv
from prompts import QUOTES, CATEGORY_PROMPTS
import random


load_dotenv()


app = FastAPI(title="GrowthLog API", version="2.2.0")

# --- CORS: restrict to your frontend origin in production ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(bson_errors.InvalidId)
async def invalid_id_handler(request, exc):
    return JSONResponse(status_code=400, content={"detail": "Invalid ID format"})

def get_env_variable(name):
    value = os.getenv(name)
    if value is None:
        raise RuntimeError(f"Missing required env variable: {name}")
    return value

MONGO_URL = get_env_variable("MONGO_URL")
JWT_SECRET = get_env_variable("JWT_SECRET")

# SMTP Config (Optional in dev, required for prod)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_SENDER = os.getenv("SMTP_SENDER", "noreply@growthlog.app")

DB_NAME = os.getenv("DB_NAME", "growthlog")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
security = HTTPBearer()

# --- Ensure indexes on startup ---
@app.on_event("startup")
def create_indexes():
    # Category uniqueness: try to create, but don't crash the whole app if there's legacy duplicate data
    try:
        db.categories.create_index([("user_id", ASCENDING), ("name", ASCENDING)], unique=True)
    except Exception as e:
        print(f"WARNING: Could not create unique index on categories: {e}. Please deduplicate manually.")
    db.categories.create_index([("user_id", ASCENDING), ("archived", ASCENDING)])
    db.goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.goals.create_index([("user_id", ASCENDING), ("category_id", ASCENDING)])
    db.daily_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.manifestations.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.snapshots.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

# --- In-memory cache (swap for Redis in production) ---
_cache = {}
CACHE_TTL = 60

def utcnow():
    return datetime.now(timezone.utc)

def cache_get(key):
    if key in _cache:
        val, exp = _cache[key]
        if utcnow().timestamp() < exp:
            return val
        del _cache[key]
    return None

def cache_set(key, val, ttl=CACHE_TTL):
    _cache[key] = (val, utcnow().timestamp() + ttl)

def cache_invalidate(prefix):
    for k in [k for k in list(_cache.keys()) if k.startswith(prefix)]:
        del _cache[k]


# --- Password hashing (bcrypt instead of sha256) ---
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(uid: str, version: int = 1) -> str:
    return jwt.encode(
        {"user_id": uid, "v": version, "exp": utcnow() + timedelta(days=30)},
        JWT_SECRET, algorithm="HS256"
    )

# --- Email Utility ---
def send_email(to_email: str, subject: str, body: str):
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS]):
        print(f"DEBUG EMAIL (MOCK): To: {to_email}, Subject: {subject}, Body: {body}")
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        return False


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

def serialize(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

def serialize_list(docs):
    return [serialize(doc) for doc in docs]

def clean_update(data_dict):
    return {k: v for k, v in data_dict.items() if v is not None}

def validate_user_owns_category(category_id: str, user_id: str):
    """Raise 403 if the category doesn't belong to this user."""
    cat = db.categories.find_one({"_id": ObjectId(category_id), "user_id": user_id})
    if not cat:
        raise HTTPException(status_code=403, detail="Category not found or access denied")


# --- Models ---

class RegisterModel(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty or only whitespace")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginModel(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateModel(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_emoji: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None

class PasswordChangeModel(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v

class CategoryModel(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Category name cannot be empty")
        return v

class CategoryTemplateModel(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = ""

class CategoryUpdateModel(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class GoalModel(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = ""
    deadline: str

class GoalUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    category_id: Optional[str] = None

class GoalReflectModel(BaseModel):
    status: str
    reflection: str
    new_deadline: Optional[str] = None

class MicroGoalModel(BaseModel):
    text: str
    time_spent: Optional[int] = 0

class GoalReflectionAddModel(BaseModel):
    text: str
    date: Optional[str] = None

class NoteModel(BaseModel):
    text: str

class DailyLogEntryModel(BaseModel):
    category_id: str
    text: str
    mood: int
    energy: int
    emotions: Optional[List[str]] = []
    time_spent: Optional[int] = 0

    @field_validator("mood", "energy")
    @classmethod
    def clamp_rating(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Rating must be between 1 and 10")
        return v

class DailyLogModel(BaseModel):
    date: Optional[str] = None
    entries: List[DailyLogEntryModel]
    highlight: Optional[str] = ""
    overall_rating: Optional[int] = 5

    @field_validator("overall_rating")
    @classmethod
    def clamp_overall(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Overall rating must be between 1 and 10")
        return v

class ManifestationModel(BaseModel):
    vision: str
    target_days: Optional[int] = None
    target_date: Optional[str] = None
    categories: Optional[List[str]] = []
    notes: Optional[str] = ""

class ManifestationUpdateModel(BaseModel):
    vision: Optional[str] = None
    target_date: Optional[str] = None
    notes: Optional[str] = None
    categories: Optional[List[str]] = None

class ManifestationProgressModel(BaseModel):
    text: str
    type: Optional[str] = "improvement"

class ManifestationProgressUpdateModel(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None

class ManifestationCompleteModel(BaseModel):
    text: str



class SnapshotModel(BaseModel):
    description: str
    values: Optional[List[str]] = []
    mood: Optional[int] = 5
    date: Optional[str] = None

    @field_validator("mood")
    @classmethod
    def clamp_mood(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Mood must be between 1 and 10")
        return v

class SnapshotUpdateModel(BaseModel):
    description: Optional[str] = None
    values: Optional[List[str]] = None
    mood: Optional[int] = None


# --- Auth ---

@app.post("/auth/register")
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
    # Default token version is 1
    db.users.update_one({"_id": result.inserted_id}, {"$set": {"token_version": 1}})

    default_categories = [
        {"user_id": uid_str, "name": "Mind", "icon": "🧠", "color": "#c9a84c", "description": "Learning, intellect, and mental health", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Body", "icon": "💪", "color": "#6b8c6b", "description": "Physical health, fitness, and nutrition", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Career", "icon": "💼", "color": "#5b8ba8", "description": "Professional growth and work tasks", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Finance", "icon": "💰", "color": "#8b6bc4", "description": "Wealth, savings, and investments", "archived": False, "created_at": utcnow()},
        {"user_id": uid_str, "name": "Spirit", "icon": "🌿", "color": "#c46b8b", "description": "Peace, philosophy, and connection", "archived": False, "created_at": utcnow()}
    ]
    db.categories.insert_many(default_categories)

    # Email Verification (Background)
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

@app.post("/auth/verify/send")
def send_verification(current_user=Depends(get_current_user)):
    if current_user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="User is already verified")
    
    # Anti-spam: 60s cooldown
    last_sent = current_user.get("verification_sent_at")
    if last_sent:
        # Pymongo might return it as aware or naive depending on how it was stored
        if last_sent.tzinfo is None: last_sent = last_sent.replace(tzinfo=timezone.utc)
        if (utcnow() - last_sent).total_seconds() < 60:
            raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another email")

    uid = str(current_user["_id"])
    token = secrets.token_urlsafe(32)
    expires = utcnow() + timedelta(hours=24)

    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "verification_token": token,
        "verification_token_expires": expires,
        "verification_sent_at": utcnow()
    }})
    
    # MOCK EMAIL SENDING
    print(f"\n--- MOCK EMAIL ---")
    print(f"To: {current_user['email']}")
    print(f"Subject: Verify your GrowthLog Account")
    print(f"Link: http://localhost:3000/verify/{token}")
    print(f"Expires in: 24 hours")
    print(f"------------------\n")
    
    return {"success": True}

@app.get("/auth/verify/{token}")
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

@app.post("/auth/login")

def login(data: LoginModel):
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(str(user["_id"]), user.get("token_version", 1)),
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "created_at": user.get("created_at", utcnow()).isoformat()}}

@app.get("/auth/me")
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


@app.put("/auth/profile")
def update_profile(data: ProfileUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.users.update_one({"_id": current_user["_id"]}, {"$set": fields})
    return {"success": True}

@app.put("/auth/password")
def change_password(data: PasswordChangeModel, current_user=Depends(get_current_user)):
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Increment token_version to invalidate all existing JWTs
    new_version = current_user.get("token_version", 1) + 1
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "password": hash_password(data.new_password),
        "token_version": new_version
    }})
    return {"success": True}

class EmailChangeModel(BaseModel):
    new_email: str
    password: str

@app.put("/auth/email")
def change_email(data: EmailChangeModel, current_user=Depends(get_current_user)):
    if not verify_password(data.password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if db.users.find_one({"email": data.new_email}):
        raise HTTPException(status_code=400, detail="Email is already in use")
    # Security: Reset verification status on email change
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "email": data.new_email,
        "is_verified": False,
        "verification_token": None,
        "verification_token_expires": None
    }})
    return {"success": True, "email": data.new_email, "is_verified": False}

class PublicToggleModel(BaseModel):
    is_public: bool

@app.put("/auth/public")
def toggle_public(data: PublicToggleModel, current_user=Depends(get_current_user)):
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"is_public": data.is_public}})
    return {"success": True, "is_public": data.is_public}

@app.get("/public/u/{user_id}")
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


@app.delete("/auth/me")
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



@app.get("/auth/stats")
def get_user_stats(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cache_key = f"stats:{uid}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    created_at = current_user.get("created_at", utcnow())
    # Use aggregation pipelines to count in one DB round-trip
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
    cache_set(cache_key, result, ttl=300)  # 5-min cache for stats
    return result



# --- Categories ---

@app.get("/categories")
def get_categories(include_archived: bool = False, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cache_key = f"categories:{uid}:{include_archived}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    q = {"user_id": uid}
    if not include_archived:
        q["archived"] = {"$ne": True}
    result = serialize_list(db.categories.find(q))
    cache_set(cache_key, result)
    return result

@app.post("/categories")
def create_category(data: CategoryModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cat = {
        "user_id": uid, "name": data.name, "icon": data.icon,
        "color": data.color, "description": data.description,
        "archived": False, "created_at": utcnow(),
    }
    try:
        result = db.categories.insert_one(cat)
        cat["id"] = str(result.inserted_id)
        del cat["_id"]
        cache_invalidate(f"categories:{uid}")
        return cat
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail=f"A category named '{data.name}' already exists.")

@app.get("/categories/templates")
def get_category_templates(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.category_templates.find({"user_id": uid}))

@app.post("/categories/templates")
def create_category_template(data: CategoryTemplateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    template = {
        "user_id": uid, "name": data.name, "icon": data.icon,
        "color": data.color, "description": data.description,
        "created_at": utcnow(),
    }
    result = db.category_templates.insert_one(template)
    template["id"] = str(result.inserted_id)
    del template["_id"]
    return template

@app.delete("/categories/templates/{template_id}")
def delete_category_template(template_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.category_templates.delete_one({"_id": ObjectId(template_id), "user_id": uid})
    return {"success": True}


@app.put("/categories/{category_id}")
def update_category(category_id: str, data: CategoryUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": fields})
        cache_invalidate(f"categories:{uid}")
        cache_invalidate(f"dashboard:{uid}")
        return {"success": True}
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail=f"A category named '{fields.get('name', 'unknown')}' already exists.")


@app.put("/categories/{category_id}/restore")
def restore_category(category_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": {"archived": False}})
    cache_invalidate(f"categories:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.delete("/categories/{category_id}")
def delete_category(category_id: str, permanent: bool = False, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    if permanent:
        r = db.categories.delete_one({"_id": ObjectId(category_id), "user_id": uid})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        db.daily_logs.update_many({"user_id": uid}, {"$pull": {"entries": {"category_id": category_id}}})
        db.goals.delete_many({"user_id": uid, "category_id": category_id})
    else:
        db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": {"archived": True}})
    cache_invalidate(f"categories:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.get("/categories/{category_id}/logs")
def get_category_logs(category_id: str, days: int = 90, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    logs = db.daily_logs.find({"user_id": uid, "date": {"$gte": since}, "entries.category_id": category_id})
    result = []
    for log in logs:
        log["entries"] = [e for e in log.get("entries", []) if e.get("category_id") == category_id]
        result.append(serialize(log))
    return result


# --- Goals ---

@app.get("/goals")
def get_goals(sort_by: str = "created_at", sort_order: str = "desc",
              category_id: Optional[str] = None, status: Optional[str] = None,
              current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if category_id:
        q["category_id"] = category_id
    if status:
        q["status"] = status
    direction = DESCENDING if sort_order == "desc" else ASCENDING
    sf = sort_by if sort_by in {"created_at", "current_deadline", "title", "status"} else "created_at"
    return serialize_list(db.goals.find(q).sort(sf, direction))

@app.get("/goals/category/{category_id}")
def get_goals_by_category(category_id: str, current_user=Depends(get_current_user)):
    return serialize_list(db.goals.find({"user_id": str(current_user["_id"]), "category_id": category_id}))

@app.get("/goals/{goal_id}")
def get_goal(goal_id: str, current_user=Depends(get_current_user)):
    goal = db.goals.find_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return serialize(goal)

@app.post("/goals")
def create_goal(data: GoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    # Validate the category belongs to this user
    validate_user_owns_category(data.category_id, uid)
    goal = {
        "user_id": uid, "category_id": data.category_id,
        "title": data.title, "description": data.description,
        "original_deadline": data.deadline, "current_deadline": data.deadline,
        "status": "active", "reflection": None, "reflections": [],
        "notes": [], "micro_goals": [], "extension_history": [], "created_at": utcnow(),
    }
    result = db.goals.insert_one(goal)
    goal["id"] = str(result.inserted_id)
    del goal["_id"]
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return goal



@app.put("/goals/{goal_id}")
def update_goal(goal_id: str, data: GoalUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if "deadline" in fields:
        fields["current_deadline"] = fields.pop("deadline")
    if "category_id" in fields:
        validate_user_owns_category(fields["category_id"], uid)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": uid}, {"$set": fields})
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}


@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, current_user=Depends(get_current_user)):
    r = db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}



@app.put("/goals/{goal_id}/reflect")
def reflect_goal(goal_id: str, data: GoalReflectModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update = {"status": data.status, "reflection": data.reflection, "reflected_at": utcnow()}
    ref_entry = {"text": data.reflection, "status_change": data.status, "date": utcnow().isoformat()}
    if data.status == "extended" and data.new_deadline:
        goal = db.goals.find_one({"_id": ObjectId(goal_id), "user_id": uid})
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        db.goals.update_one({"_id": ObjectId(goal_id)}, {"$push": {"extension_history": {
            "old_deadline": goal["current_deadline"], "new_deadline": data.new_deadline,
            "reason": data.reflection, "extended_at": utcnow().isoformat(),
        }}})
        update["current_deadline"] = data.new_deadline
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": uid},
                        {"$set": update, "$push": {"reflections": ref_entry}})
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}



@app.post("/goals/{goal_id}/reflections")
def add_goal_reflection(goal_id: str, data: GoalReflectionAddModel, current_user=Depends(get_current_user)):
    entry = {"id": str(ObjectId()), "text": data.text, "status_change": None,
             "date": data.date or utcnow().isoformat()}
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$push": {"reflections": entry}})
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}


@app.delete("/goals/{goal_id}/reflections/{reflection_id}")
def delete_goal_reflection(goal_id: str, reflection_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid},
        {"$pull": {"reflections": {"id": reflection_id}}}
    )
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@app.put("/goals/{goal_id}/reflections/{reflection_id}")
def update_goal_reflection(goal_id: str, reflection_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    # Atomic update using positional operator
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "reflections.id": reflection_id},
        {"$set": {"reflections.$.text": data.text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or reflection not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.post("/goals/{goal_id}/notes")
def add_goal_note(goal_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    note = {"id": str(ObjectId()), "text": data.text, "date": utcnow().isoformat()}
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$push": {"notes": note}})
    return {"success": True}

@app.delete("/goals/{goal_id}/notes/{note_id}")
def delete_goal_note(goal_id: str, note_id: str, current_user=Depends(get_current_user)):
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$pull": {"notes": {"id": note_id}}})
    return {"success": True}

@app.put("/goals/{goal_id}/notes/{note_id}")
def update_goal_note(goal_id: str, note_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    # Atomic update using positional operator
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "notes.id": note_id},
        {"$set": {"notes.$.text": data.text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or note not found")
    return {"success": True}

@app.post("/goals/{goal_id}/micro-goals")
def add_micro_goal(goal_id: str, data: MicroGoalModel, current_user=Depends(get_current_user)):
    mg_id = str(ObjectId())
    mg = {"id": mg_id, "text": data.text, "completed": False, "time_spent": data.time_spent or 0}
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$push": {"micro_goals": mg}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True, "id": mg_id}


@app.put("/goals/{goal_id}/micro-goals/{mg_id}")
def update_micro_goal(goal_id: str, mg_id: str, data: MicroGoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    # Atomic update using positional operator
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "micro_goals.id": mg_id},
        {"$set": {"micro_goals.$.text": data.text, "micro_goals.$.time_spent": data.time_spent}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or micro-goal not found")
    
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}



@app.put("/goals/{goal_id}/micro-goals/{mg_id}/toggle")
def toggle_micro_goal(goal_id: str, mg_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    # Atomic toggle using $[element] syntax
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid},
        [{"$set": {
            "micro_goals": {
                "$map": {
                    "input": "$micro_goals",
                    "as": "mg",
                    "in": {
                        "$cond": [
                            {"$eq": ["$$mg.id", mg_id]},
                            {"$mergeObjects": ["$$mg", {"completed": {"$not": "$$mg.completed"}}]},
                            "$$mg"
                        ]
                    }
                }
            }
        }}]
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or micro-goal not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.delete("/goals/{goal_id}/micro-goals/{mg_id}")
def delete_micro_goal(goal_id: str, mg_id: str, current_user=Depends(get_current_user)):
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$pull": {"micro_goals": {"id": mg_id}}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}



# --- Daily Logs ---

@app.get("/logs")
def get_logs(days: int = 30, current_user=Depends(get_current_user)):
    # Cap historical queries at 365 days for performance
    days = min(max(days, 1), 365)
    since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    return serialize_list(db.daily_logs.find({"user_id": str(current_user["_id"]), "date": {"$gte": since}}).sort("date", DESCENDING))

@app.get("/logs/today")
def get_today_log(current_user=Depends(get_current_user)):
    today = utcnow().strftime("%Y-%m-%d")
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": today})
    return serialize(log) if log else None

@app.get("/logs/{date}")
def get_log_by_date(date: str, current_user=Depends(get_current_user)):
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    return serialize(log) if log else None

def recalculate_user_streak(uid: str):
    """Accurately calculates the current and longest streak based on all logs."""
    logs = list(db.daily_logs.find({"user_id": uid}, {"date": 1}).sort("date", DESCENDING))
    if not logs:
        db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak": 0, "last_log_date": None}})
        return 0

    dates = sorted([l["date"] for l in logs], reverse=True)
    today = utcnow().strftime("%Y-%m-%d")
    yesterday = (utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    # Check if the streak is still active (logged today or yesterday)
    last_log = dates[0]
    if last_log != today and last_log != yesterday:
        current_streak = 0
    else:
        # Calculate current streak
        check_date = last_log
        for d in dates:
            if d == check_date:
                current_streak += 1
                check_date = (datetime.strptime(check_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                break

    # Calculate longest streak across all history
    check_date = dates[0]
    for i, d in enumerate(dates):
        if i == 0:
            temp_streak = 1
        else:
            prev_day = (datetime.strptime(dates[i-1], "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            if d == prev_day:
                temp_streak += 1
            else:
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)

    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {
        "streak": current_streak,
        "longest_streak": longest_streak,
        "last_log_date": last_log
    }})
    return current_streak

@app.post("/logs")
def create_log(data: DailyLogModel, current_user=Depends(get_current_user)):
    today = data.date if data.date else utcnow().strftime("%Y-%m-%d")
    uid = str(current_user["_id"])

    # Validate all category_ids belong to this user
    for entry in data.entries:
        validate_user_owns_category(entry.category_id, uid)

    existing = db.daily_logs.find_one({"user_id": uid, "date": today})
    entries = [e.model_dump() for e in data.entries]
    if existing:
        db.daily_logs.update_one({"_id": existing["_id"]},
            {"$set": {"entries": entries, "highlight": data.highlight, "overall_rating": data.overall_rating}})
        cache_invalidate(f"dashboard:{uid}")
        cache_invalidate(f"stats:{uid}")
        return {"success": True, "updated": True}

    db.daily_logs.insert_one({
        "user_id": uid, "date": today, "entries": entries,
        "highlight": data.highlight, "overall_rating": data.overall_rating,
        "created_at": utcnow(),
    })
    
    # Recalculate streak robustly
    streak = recalculate_user_streak(uid)
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True, "streak": streak}


@app.delete("/logs/{date}")
def delete_log(date: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.daily_logs.delete_one({"user_id": uid, "date": date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    # Robust streak recalculation after deletion
    recalculate_user_streak(uid)
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}



# --- Manifestations ---

@app.get("/manifestations")
def get_manifestations(status_filter: Optional[str] = None, current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if status_filter and status_filter != "all":
        q["status"] = status_filter
    return serialize_list(db.manifestations.find(q).sort("created_at", DESCENDING))

@app.get("/manifestations/{m_id}")
def get_manifestation(m_id: str, current_user=Depends(get_current_user)):
    item = db.manifestations.find_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(item)

@app.post("/manifestations")
def create_manifestation(data: ManifestationModel, current_user=Depends(get_current_user)):
    start = utcnow()
    if data.target_date:
        target_str = data.target_date
        # Parse as UTC-0
        target_date_obj = datetime.strptime(data.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        target_days = (target_date_obj - start).days
    elif data.target_days:
        target_str = (start + timedelta(days=data.target_days)).strftime("%Y-%m-%d")
        target_days = data.target_days
    else:
        raise HTTPException(status_code=400, detail="Provide target_days or target_date")

    item = {
        "user_id": str(current_user["_id"]), "vision": data.vision,
        "target_days": target_days, "categories": data.categories, "notes": data.notes,
        "start_date": start.strftime("%Y-%m-%d"), "target_date": target_str,
        "status": "active", "reflection": None, "progress_entries": [],
        "manifestation_notes": [], "created_at": utcnow(),
    }
    result = db.manifestations.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return item



@app.put("/manifestations/{m_id}")
def update_manifestation(m_id: str, data: ManifestationUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])}, {"$set": fields})
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}


@app.delete("/manifestations/{m_id}")
def delete_manifestation(m_id: str, current_user=Depends(get_current_user)):
    r = db.manifestations.delete_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}



@app.put("/manifestations/{m_id}/archive")
def archive_manifestation(m_id: str, current_user=Depends(get_current_user)):
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$set": {"status": "archived"}})
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}


@app.post("/manifestations/{m_id}/progress")
def add_manifestation_progress(m_id: str, data: ManifestationProgressModel, current_user=Depends(get_current_user)):
    entry = {"id": str(ObjectId()), "text": data.text, "type": data.type, "date": utcnow().isoformat()}
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$push": {"progress_entries": entry}})
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}


@app.put("/manifestations/{m_id}/progress/{entry_id}")
def update_manifestation_progress(m_id: str, entry_id: str, data: ManifestationProgressUpdateModel,
                                   current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.dict())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data = {f"progress_entries.$.{k}": v for k, v in fields.items()}
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": uid, "progress_entries.id": entry_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manifestation or progress entry not found")
        
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.delete("/manifestations/{m_id}/progress/{entry_id}")
def delete_manifestation_progress(m_id: str, entry_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": uid},
        {"$pull": {"progress_entries": {"id": entry_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manifestation not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@app.post("/manifestations/{m_id}/notes")
def add_manifestation_note(m_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    note = {"id": str(ObjectId()), "text": data.text, "date": utcnow().isoformat()}
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$push": {"manifestation_notes": note}})
    return {"success": True}

@app.delete("/manifestations/{m_id}/notes/{note_id}")
def delete_manifestation_note(m_id: str, note_id: str, current_user=Depends(get_current_user)):
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$pull": {"manifestation_notes": {"id": note_id}}})
    return {"success": True}

@app.put("/manifestations/{m_id}/complete")
def complete_manifestation(m_id: str, data: ManifestationCompleteModel, current_user=Depends(get_current_user)):
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": {"status": "completed", "reflection": data.text, "completed_at": utcnow()}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}



# --- Snapshots ---

@app.get("/snapshots/compare")
def compare_snapshots(snap1_id: str, snap2_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    s1 = db.snapshots.find_one({"_id": ObjectId(snap1_id), "user_id": uid})
    s2 = db.snapshots.find_one({"_id": ObjectId(snap2_id), "user_id": uid})
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {"snapshot1": serialize(s1), "snapshot2": serialize(s2)}

@app.get("/snapshots")
def get_snapshots(current_user=Depends(get_current_user)):
    return serialize_list(db.snapshots.find({"user_id": str(current_user["_id"])}).sort("date", DESCENDING))

@app.get("/snapshots/{snap_id}")
def get_snapshot(snap_id: str, current_user=Depends(get_current_user)):
    snap = db.snapshots.find_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])})
    if not snap:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(snap)

@app.post("/snapshots")
def create_snapshot(data: SnapshotModel, current_user=Depends(get_current_user)):
    item = {
        "user_id": str(current_user["_id"]), "description": data.description,
        "values": data.values, "mood": data.mood,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "created_at": utcnow(),
    }
    result = db.snapshots.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return item


@app.put("/snapshots/{snap_id}")
def update_snapshot(snap_id: str, data: SnapshotUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.dict())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.snapshots.update_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])}, {"$set": fields})
    uid = str(current_user["_id"])
    cache_invalidate(f"stats:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@app.delete("/snapshots/{snap_id}")
def delete_snapshot(snap_id: str, current_user=Depends(get_current_user)):
    r = db.snapshots.delete_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}



@app.get("/prompts/quote")
def get_quote():
    # Use the current day as a seed for the daily quote
    day_of_year = datetime.now().timetuple().tm_yday
    quote = QUOTES[day_of_year % len(QUOTES)]
    return quote

@app.get("/prompts/daily")
def get_daily_prompts():
    # Provide one random prompt for each category dimension
    day_seed = datetime.now().timetuple().tm_yday
    prompts = {}
    for cat, p_list in CATEGORY_PROMPTS.items():
        prompts[cat] = p_list[day_seed % len(p_list)]
    return prompts


# --- Dashboard ---

@app.get("/dashboard")
def get_dashboard(days: int = 30, current_user=Depends(get_current_user)):
    # Cap historical queries at 365 days for performance
    days = min(max(days, 1), 365)
    uid = str(current_user["_id"])
    cache_key = f"dashboard:{uid}:{days}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # 1. Aggregate Logs for trends, heatmap, and category consistency
    pipeline = [
        {"$match": {"user_id": uid, "date": {"$gte": since}}},
        {"$facet": {
            "trends": [
                {"$sort": {"date": 1}},
                {"$project": {
                    "date": 1,
                    "overall_rating": {"$ifNull": ["$overall_rating", 5]},
                    "highlight": {"$ifNull": ["$highlight", ""]},
                    "entry_count": {"$size": {"$ifNull": ["$entries", []]}},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "avg_energy": {"$avg": "$entries.energy"},
                    "time_spent": {"$sum": "$entries.time_spent"}
                }}
            ],
            "category_stats": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": "$entries.category_id",
                    "count": {"$sum": 1},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "time_spent": {"$sum": "$entries.time_spent"}
                }}
            ],
            "weekly_summary": [
                {"$project": {
                    "date_obj": {"$dateFromString": {"dateString": "$date"}},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "avg_energy": {"$avg": "$entries.energy"}
                }},
                {"$group": {
                    "_id": {"$isoWeek": "$date_obj"},
                    "logs": {"$sum": 1},
                    "mood_sum": {"$sum": "$avg_mood"},
                    "energy_sum": {"$sum": "$avg_energy"}
                }},
                {"$sort": {"_id": 1}}
            ],
            "emotions": [
                {"$unwind": "$entries"},
                {"$unwind": "$entries.emotions"},
                {"$group": {
                    "_id": "$entries.emotions",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ],
            "totals": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": None,
                    "total_time": {"$sum": "$entries.time_spent"},
                    "log_count": {"$sum": 1} # This is entries count, let's get logs count separately
                }}
            ]
        }}
    ]
    
    agg_result = list(db.daily_logs.aggregate(pipeline))[0]
    logs_count = db.daily_logs.count_documents({"user_id": uid, "date": {"$gte": since}})
    
    # Process aggregation results
    heatmap = {t["date"]: {"rating": t["overall_rating"], "highlight": t["highlight"], "count": t["entry_count"]} for t in agg_result["trends"]}
    mood_trend = [{"date": t["date"], "mood": round(t["avg_mood"] or 5, 1)} for t in agg_result["trends"]]
    energy_trend = [{"date": t["date"], "energy": round(t["avg_energy"] or 5, 1)} for t in agg_result["trends"]]
    time_spent_trend = [{"date": t["date"], "time_spent": t["time_spent"]} for t in agg_result["trends"]]
    
    cat_stats_map = {s["_id"]: s for s in agg_result["category_stats"]}
    categories = list(db.categories.find({"user_id": uid, "archived": {"$ne": True}}))
    cat_consistency = [
        {
            "name": c["name"], "icon": c["icon"], "color": c["color"], "id": str(c["_id"]),
            "count": cat_stats_map.get(str(c["_id"]), {}).get("count", 0),
            "percentage": round((cat_stats_map.get(str(c["_id"]), {}).get("count", 0) / max(logs_count, 1)) * 100),
            "avg_mood": round(cat_stats_map.get(str(c["_id"]), {}).get("avg_mood", 5) or 5, 1),
            "time_spent": cat_stats_map.get(str(c["_id"]), {}).get("time_spent", 0)
        }
        for c in categories
    ]
    
    weekly_summary = [
        {
            "week": f"W{w['_id']}",
            "logs": w["logs"],
            "avg_mood": round(w["mood_sum"] / max(w["logs"], 1), 1),
            "avg_energy": round(w["energy_sum"] / max(w["logs"], 1), 1)
        }
        for w in agg_result["weekly_summary"]
    ]
    
    # 2. Parallel fetch for Goals and Manifestations (small result sets)
    goals = list(db.goals.aggregate([
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    goal_counts = {g["_id"]: g["count"] for g in goals}
    
    manifestations_count = db.manifestations.count_documents({"user_id": uid, "status": "active"})
    
    # 3. Generate Automated Insights
    insights = []
    if cat_consistency:
        # Sort by time spent
        by_time = sorted(cat_consistency, key=lambda x: x["time_spent"], reverse=True)
        top_cat = by_time[0]
        if top_cat["time_spent"] > 0:
            insights.append({
                "type": "top_performer",
                "text": f"You're investing heavily in {top_cat['icon']} {top_cat['name']}! {top_cat['time_spent']} minutes logged recently.",
                "color": top_cat["color"]
            })
        
        # Sort by avg mood (only those with logs)
        logged_cats = [c for c in cat_consistency if c["count"] > 0]
        if logged_cats:
            by_mood = sorted(logged_cats, key=lambda x: x["avg_mood"], reverse=True)
            happiest_cat = by_mood[0]
            insights.append({
                "type": "mood_booster",
                "text": f"{happiest_cat['icon']} {happiest_cat['name']} seems to be your happiest space right now.",
                "color": happiest_cat["color"]
            })

            # Check for neglected categories
            neglected = sorted(cat_consistency, key=lambda x: x["count"])
            if neglected[0]["count"] < logs_count / 2:
                insights.append({
                    "type": "balance_nudge",
                    "text": f"Your {neglected[0]['icon']} {neglected[0]['name']} could use a bit more attention this week.",
                    "color": neglected[0]["color"]
                })

    # 4. Prepare Radar Data (Balance visualization)
    radar_data = []
    for c in cat_consistency:
        # Scale count to 0-10 relative to total logs
        activity_score = round((c["count"] / max(logs_count, 1)) * 10, 1)
        radar_data.append({
            "subject": f"{c['icon']} {c['name']}",
            "mood": c["avg_mood"],
            "activity": activity_score,
            "full": 10
        })

    result = {
        "streak": current_user.get("streak", 0),
        "longest_streak": current_user.get("longest_streak", 0),
        "total_logs": logs_count,
        "total_time_spent": sum(c["time_spent"] for c in cat_consistency),
        "heatmap": heatmap,
        "mood_trend": mood_trend,
        "energy_trend": energy_trend,
        "time_spent_trend": time_spent_trend,
        "weekly_summary": weekly_summary,
        "category_consistency": cat_consistency,
        "emotion_trends": [{"label": e["_id"], "count": e["count"]} for e in agg_result["emotions"]],
        "radar_data": radar_data,
        "insights": insights,
        "goals": {
            "total": sum(goal_counts.values()),
            "completed": goal_counts.get("completed", 0),
            "active": goal_counts.get("active", 0),
        },
        "active_manifestations": manifestations_count,
    }

    cache_set(cache_key, result, ttl=300) # Increased TTL for optimized dashboard
    return result


@app.get("/")
def root():
    return {"message": "GrowthLog API v2.2 running"}
# --- Automated Reminders (Nudge Feature) ---
@app.post("/admin/nudge-silent-users")
def nudge_silent_users(background_tasks: BackgroundTasks):
    """
    Finds all users who haven't logged today and sends them a nudge.
    In production, this would be called by a Cron job or a task scheduler.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # 1. Get IDs of users who have logged today
    logged_user_ids = db.daily_logs.distinct("user_id", {"date": today_str})
    logged_user_ids = [ObjectId(_id) for _id in logged_user_ids]
    
    # 2. Find all users NOT in that list who have notifications ENABLED
    silent_users = list(db.users.find({
        "_id": {"$nin": logged_user_ids}, 
        "email_verified": True,
        "email_notifications": {"$ne": False}
    }))
    
    for user in silent_users:
        subject = "✦ A small nudge for your future self"
        body = f"""
        <div style="font-family: sans-serif; max-width: 500px; padding: 40px; background: #fdfcf9; border: 1px solid #eee;">
            <h2 style="font-family: serif; color: #6b8c6b;">Keep the streak alive, {user['name']}?</h2>
            <p>Growth is built on small, daily reflections. You haven't checked in today yet!</p>
            <p>It only takes 2 minutes to record how you're feeling and what you've learned.</p>
            <a href="{ALLOWED_ORIGINS[0]}/log" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px;">Log Today's Growth →</a>
            <p style="font-size: 12px; color: #999; margin-top: 40px;">GrowthLog — Holistic Tracking for the Intentional Life</p>
        </div>
        """
        background_tasks.add_task(send_email, user['email'], subject, body)
        
    return {"status": "success", "nudge_count": len(silent_users)}
