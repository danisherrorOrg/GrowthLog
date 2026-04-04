from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date, timedelta
from pymongo import MongoClient
from bson import ObjectId
import hashlib
import jwt
from dotenv import load_dotenv
import os

load_dotenv()
from collections import defaultdict

app = FastAPI(title="GrowthLog API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_env_variable(name: str) -> str:
    value = os.getenv(name)
    if value is None:
        raise RuntimeError(f"Missing required env variable: {name}")
    return value

MONGO_URL = get_env_variable("MONGO_URL")
JWT_SECRET = get_env_variable("JWT_SECRET")

client = MongoClient(MONGO_URL)
db = client["growthlog"]

security = HTTPBearer()

# ─── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["user_id"]
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
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

# ─── Models ────────────────────────────────────────────────────────────────────

class RegisterModel(BaseModel):
    name: str
    email: str
    password: str

class LoginModel(BaseModel):
    email: str
    password: str

class CategoryModel(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = ""

class GoalModel(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = ""
    deadline: str

class GoalReflectModel(BaseModel):
    status: str  # completed, extended, abandoned
    reflection: str
    new_deadline: Optional[str] = None

class DailyLogEntryModel(BaseModel):
    category_id: str
    text: str
    mood: int
    energy: int
    emotions: Optional[List[str]] = []

class DailyLogModel(BaseModel):
    entries: List[DailyLogEntryModel]
    highlight: Optional[str] = ""
    overall_rating: Optional[int] = 5

class ManifestationModel(BaseModel):
    vision: str
    target_days: int
    categories: Optional[List[str]] = []

class SnapshotModel(BaseModel):
    description: str
    values: Optional[List[str]] = []
    mood: Optional[int] = 5

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(data: RegisterModel):
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.utcnow(),
        "streak": 0,
        "longest_streak": 0,
        "last_log_date": None,
        "reminder_time": "20:00",
        "timezone": "UTC",
    }
    result = db.users.insert_one(user)
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email}}

@app.post("/auth/login")
def login(data: LoginModel):
    user = db.users.find_one({"email": data.email, "password": hash_password(data.password)})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(str(user["_id"]))
    return {"token": token, "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}}

@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return {"id": str(current_user["_id"]), "name": current_user["name"], "email": current_user["email"],
            "streak": current_user.get("streak", 0), "longest_streak": current_user.get("longest_streak", 0)}

# ─── Categories ────────────────────────────────────────────────────────────────

@app.get("/categories")
def get_categories(current_user=Depends(get_current_user)):
    cats = db.categories.find({"user_id": str(current_user["_id"]), "archived": {"$ne": True}})
    return serialize_list(cats)

@app.post("/categories")
def create_category(data: CategoryModel, current_user=Depends(get_current_user)):
    cat = {
        "user_id": str(current_user["_id"]),
        "name": data.name,
        "icon": data.icon,
        "color": data.color,
        "description": data.description,
        "archived": False,
        "created_at": datetime.utcnow(),
    }
    result = db.categories.insert_one(cat)
    cat["id"] = str(result.inserted_id)
    del cat["_id"]
    return cat

@app.delete("/categories/{category_id}")
def delete_category(category_id: str, current_user=Depends(get_current_user)):
    db.categories.update_one(
        {"_id": ObjectId(category_id), "user_id": str(current_user["_id"])},
        {"$set": {"archived": True}}
    )
    return {"success": True}

# ─── Goals ─────────────────────────────────────────────────────────────────────

@app.get("/goals")
def get_goals(current_user=Depends(get_current_user)):
    goals = db.goals.find({"user_id": str(current_user["_id"])})
    return serialize_list(goals)

@app.get("/goals/category/{category_id}")
def get_goals_by_category(category_id: str, current_user=Depends(get_current_user)):
    goals = db.goals.find({"user_id": str(current_user["_id"]), "category_id": category_id})
    return serialize_list(goals)

@app.post("/goals")
def create_goal(data: GoalModel, current_user=Depends(get_current_user)):
    goal = {
        "user_id": str(current_user["_id"]),
        "category_id": data.category_id,
        "title": data.title,
        "description": data.description,
        "original_deadline": data.deadline,
        "current_deadline": data.deadline,
        "status": "active",
        "reflection": None,
        "extension_history": [],
        "created_at": datetime.utcnow(),
    }
    result = db.goals.insert_one(goal)
    goal["id"] = str(result.inserted_id)
    del goal["_id"]
    return goal

@app.put("/goals/{goal_id}/reflect")
def reflect_goal(goal_id: str, data: GoalReflectModel, current_user=Depends(get_current_user)):
    update = {"status": data.status, "reflection": data.reflection, "reflected_at": datetime.utcnow()}
    if data.status == "extended" and data.new_deadline:
        goal = db.goals.find_one({"_id": ObjectId(goal_id)})
        extension = {
            "old_deadline": goal["current_deadline"],
            "new_deadline": data.new_deadline,
            "reason": data.reflection,
            "extended_at": datetime.utcnow().isoformat()
        }
        update["current_deadline"] = data.new_deadline
        db.goals.update_one({"_id": ObjectId(goal_id)}, {"$push": {"extension_history": extension}})
    db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": update})
    return {"success": True}

# ─── Daily Logs ────────────────────────────────────────────────────────────────

@app.get("/logs")
def get_logs(days: int = 30, current_user=Depends(get_current_user)):
    since = datetime.utcnow() - timedelta(days=days)
    logs = db.daily_logs.find({"user_id": str(current_user["_id"]), "date": {"$gte": since.strftime("%Y-%m-%d")}})
    return serialize_list(logs)

@app.get("/logs/today")
def get_today_log(current_user=Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": today})
    return serialize(log) if log else None

@app.post("/logs")
def create_log(data: DailyLogModel, current_user=Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    user_id = str(current_user["_id"])

    existing = db.daily_logs.find_one({"user_id": user_id, "date": today})
    entries = [e.dict() for e in data.entries]

    if existing:
        db.daily_logs.update_one({"_id": existing["_id"]}, {"$set": {"entries": entries, "highlight": data.highlight, "overall_rating": data.overall_rating}})
        return {"success": True, "updated": True}

    log = {
        "user_id": user_id,
        "date": today,
        "entries": entries,
        "highlight": data.highlight,
        "overall_rating": data.overall_rating,
        "created_at": datetime.utcnow(),
    }
    db.daily_logs.insert_one(log)

    # Update streak
    user = db.users.find_one({"_id": ObjectId(user_id)})
    last_log = user.get("last_log_date")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    current_streak = user.get("streak", 0)

    if last_log == yesterday:
        current_streak += 1
    elif last_log != today:
        current_streak = 1

    longest = max(current_streak, user.get("longest_streak", 0))
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"streak": current_streak, "longest_streak": longest, "last_log_date": today}})

    return {"success": True, "streak": current_streak}

# ─── Manifestations ────────────────────────────────────────────────────────────

@app.get("/manifestations")
def get_manifestations(current_user=Depends(get_current_user)):
    items = db.manifestations.find({"user_id": str(current_user["_id"])})
    return serialize_list(items)

@app.post("/manifestations")
def create_manifestation(data: ManifestationModel, current_user=Depends(get_current_user)):
    start = datetime.utcnow()
    target = start + timedelta(days=data.target_days)
    item = {
        "user_id": str(current_user["_id"]),
        "vision": data.vision,
        "target_days": data.target_days,
        "categories": data.categories,
        "start_date": start.strftime("%Y-%m-%d"),
        "target_date": target.strftime("%Y-%m-%d"),
        "status": "active",
        "reflection": None,
        "created_at": datetime.utcnow(),
    }
    result = db.manifestations.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    return item

@app.put("/manifestations/{m_id}/complete")
def complete_manifestation(m_id: str, reflection: dict, current_user=Depends(get_current_user)):
    db.manifestations.update_one(
        {"_id": ObjectId(m_id)},
        {"$set": {"status": "completed", "reflection": reflection.get("text"), "completed_at": datetime.utcnow()}}
    )
    return {"success": True}

# ─── Snapshots ─────────────────────────────────────────────────────────────────

@app.get("/snapshots")
def get_snapshots(current_user=Depends(get_current_user)):
    items = db.snapshots.find({"user_id": str(current_user["_id"])})
    return serialize_list(items)

@app.post("/snapshots")
def create_snapshot(data: SnapshotModel, current_user=Depends(get_current_user)):
    item = {
        "user_id": str(current_user["_id"]),
        "description": data.description,
        "values": data.values,
        "mood": data.mood,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "created_at": datetime.utcnow(),
    }
    result = db.snapshots.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    return item

# ─── Dashboard / Insights ──────────────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(days: int = 30, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    logs = list(db.daily_logs.find({"user_id": user_id, "date": {"$gte": since}}))
    goals = list(db.goals.find({"user_id": user_id}))
    categories = list(db.categories.find({"user_id": user_id, "archived": {"$ne": True}}))
    manifestations = list(db.manifestations.find({"user_id": user_id, "status": "active"}))

    # Heatmap data
    heatmap = {log["date"]: log.get("overall_rating", 5) for log in logs}

    # Mood trend
    mood_trend = []
    for log in sorted(logs, key=lambda x: x["date"]):
        ratings = [e.get("mood", 5) for e in log.get("entries", [])]
        avg_mood = sum(ratings) / len(ratings) if ratings else 5
        mood_trend.append({"date": log["date"], "mood": round(avg_mood, 1)})

    # Category consistency
    cat_counts = defaultdict(int)
    for log in logs:
        for entry in log.get("entries", []):
            cat_counts[entry["category_id"]] += 1

    cat_consistency = []
    for cat in categories:
        cat_id = str(cat["_id"])
        cat_consistency.append({
            "name": cat["name"],
            "icon": cat["icon"],
            "color": cat["color"],
            "count": cat_counts.get(cat_id, 0),
            "percentage": round((cat_counts.get(cat_id, 0) / max(len(logs), 1)) * 100)
        })

    # Goal stats
    total_goals = len(goals)
    completed = len([g for g in goals if g["status"] == "completed"])
    active = len([g for g in goals if g["status"] == "active"])

    user = db.users.find_one({"_id": ObjectId(user_id)})

    return {
        "streak": user.get("streak", 0),
        "longest_streak": user.get("longest_streak", 0),
        "total_logs": len(logs),
        "heatmap": heatmap,
        "mood_trend": mood_trend,
        "category_consistency": cat_consistency,
        "goals": {"total": total_goals, "completed": completed, "active": active},
        "active_manifestations": len(manifestations),
    }

@app.get("/")
def root():
    return {"message": "GrowthLog API is running"}
