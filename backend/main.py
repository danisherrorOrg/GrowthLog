from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import hashlib
import jwt
from dotenv import load_dotenv
import os

load_dotenv()
from collections import defaultdict

app = FastAPI(title="GrowthLog API", version="2.0.0")

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


def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()


def create_token(uid):
    return jwt.encode(
        {"user_id": uid, "exp": datetime.utcnow() + timedelta(days=30)},
        JWT_SECRET, algorithm="HS256"
    )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # FIX: use `except Exception` not bare `except:` so HTTPException isn't swallowed
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
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


def clean_update(data_dict: dict) -> dict:
    """Filter out None values but keep empty strings, 0, False."""
    return {k: v for k, v in data_dict.items() if v is not None}


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


class GoalReflectionAddModel(BaseModel):
    text: str
    date: Optional[str] = None


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


class SnapshotModel(BaseModel):
    description: str
    values: Optional[List[str]] = []
    mood: Optional[int] = 5
    date: Optional[str] = None


class SnapshotUpdateModel(BaseModel):
    description: Optional[str] = None
    values: Optional[List[str]] = None
    mood: Optional[int] = None


# ─── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(data: RegisterModel):
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    result = db.users.insert_one({
        "name": data.name, "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.utcnow(),
        "streak": 0, "longest_streak": 0, "last_log_date": None,
    })
    return {"token": create_token(str(result.inserted_id)),
            "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email}}


@app.post("/auth/login")
def login(data: LoginModel):
    user = db.users.find_one({"email": data.email, "password": hash_password(data.password)})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(str(user["_id"])),
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}}


@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return {"id": str(current_user["_id"]), "name": current_user["name"], "email": current_user["email"],
            "streak": current_user.get("streak", 0), "longest_streak": current_user.get("longest_streak", 0)}


# ─── Categories ────────────────────────────────────────────────────────────────

@app.get("/categories")
def get_categories(include_archived: bool = False, current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if not include_archived:
        q["archived"] = {"$ne": True}
    return serialize_list(db.categories.find(q))


@app.post("/categories")
def create_category(data: CategoryModel, current_user=Depends(get_current_user)):
    cat = {
        "user_id": str(current_user["_id"]), "name": data.name, "icon": data.icon,
        "color": data.color, "description": data.description,
        "archived": False, "created_at": datetime.utcnow(),
    }
    result = db.categories.insert_one(cat)
    cat["id"] = str(result.inserted_id)
    del cat["_id"]
    return cat


@app.put("/categories/{category_id}")
def update_category(category_id: str, data: CategoryUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.dict())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.categories.update_one(
        {"_id": ObjectId(category_id), "user_id": str(current_user["_id"])},
        {"$set": fields}
    )
    return {"success": True}


@app.put("/categories/{category_id}/restore")
def restore_category(category_id: str, current_user=Depends(get_current_user)):
    db.categories.update_one(
        {"_id": ObjectId(category_id), "user_id": str(current_user["_id"])},
        {"$set": {"archived": False}}
    )
    return {"success": True}


@app.delete("/categories/{category_id}")
def delete_category(category_id: str, current_user=Depends(get_current_user)):
    db.categories.update_one(
        {"_id": ObjectId(category_id), "user_id": str(current_user["_id"])},
        {"$set": {"archived": True}}
    )
    return {"success": True}


@app.get("/categories/{category_id}/logs")
def get_category_logs(category_id: str, days: int = 90, current_user=Depends(get_current_user)):
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    logs = db.daily_logs.find({
        "user_id": str(current_user["_id"]),
        "date": {"$gte": since},
        "entries.category_id": category_id,
    })
    result = []
    for log in logs:
        log["entries"] = [e for e in log.get("entries", []) if e.get("category_id") == category_id]
        result.append(serialize(log))
    return result


# ─── Goals ─────────────────────────────────────────────────────────────────────

@app.get("/goals")
def get_goals(
    sort_by: str = "created_at", sort_order: str = "desc",
    category_id: Optional[str] = None, status: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    q = {"user_id": str(current_user["_id"])}
    if category_id:
        q["category_id"] = category_id
    if status:
        q["status"] = status
    direction = -1 if sort_order == "desc" else 1
    valid_sort = {"created_at", "current_deadline", "title", "status"}
    sf = sort_by if sort_by in valid_sort else "created_at"
    return serialize_list(db.goals.find(q).sort(sf, direction))


@app.get("/goals/category/{category_id}")
def get_goals_by_category(category_id: str, current_user=Depends(get_current_user)):
    return serialize_list(db.goals.find({"user_id": str(current_user["_id"]), "category_id": category_id}))


@app.post("/goals")
def create_goal(data: GoalModel, current_user=Depends(get_current_user)):
    goal = {
        "user_id": str(current_user["_id"]), "category_id": data.category_id,
        "title": data.title, "description": data.description,
        "original_deadline": data.deadline, "current_deadline": data.deadline,
        "status": "active", "reflection": None, "reflections": [],
        "extension_history": [], "created_at": datetime.utcnow(),
    }
    result = db.goals.insert_one(goal)
    goal["id"] = str(result.inserted_id)
    del goal["_id"]
    return goal


@app.put("/goals/{goal_id}")
def update_goal(goal_id: str, data: GoalUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.dict())
    if "deadline" in fields:
        fields["current_deadline"] = fields.pop("deadline")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$set": fields}
    )
    return {"success": True}


@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, current_user=Depends(get_current_user)):
    r = db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"success": True}


@app.put("/goals/{goal_id}/reflect")
def reflect_goal(goal_id: str, data: GoalReflectModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update = {"status": data.status, "reflection": data.reflection, "reflected_at": datetime.utcnow()}
    ref_entry = {"text": data.reflection, "status_change": data.status, "date": datetime.utcnow().isoformat()}

    if data.status == "extended" and data.new_deadline:
        # FIX: include user_id in find_one to prevent fetching another user's goal
        goal = db.goals.find_one({"_id": ObjectId(goal_id), "user_id": uid})
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        db.goals.update_one({"_id": ObjectId(goal_id)}, {"$push": {"extension_history": {
            "old_deadline": goal["current_deadline"], "new_deadline": data.new_deadline,
            "reason": data.reflection, "extended_at": datetime.utcnow().isoformat(),
        }}})
        update["current_deadline"] = data.new_deadline

    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid},
        {"$set": update, "$push": {"reflections": ref_entry}}
    )
    return {"success": True}


@app.post("/goals/{goal_id}/reflections")
def add_goal_reflection(goal_id: str, data: GoalReflectionAddModel, current_user=Depends(get_current_user)):
    entry = {"text": data.text, "status_change": None, "date": data.date or datetime.utcnow().isoformat()}
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$push": {"reflections": entry}}
    )
    return {"success": True}


# ─── Daily Logs ────────────────────────────────────────────────────────────────

@app.get("/logs")
def get_logs(days: int = 30, current_user=Depends(get_current_user)):
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    return serialize_list(db.daily_logs.find({"user_id": str(current_user["_id"]), "date": {"$gte": since}}))


@app.get("/logs/today")
def get_today_log(current_user=Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": today})
    return serialize(log) if log else None


@app.post("/logs")
def create_log(data: DailyLogModel, current_user=Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    uid = str(current_user["_id"])
    existing = db.daily_logs.find_one({"user_id": uid, "date": today})
    entries = [e.dict() for e in data.entries]
    if existing:
        db.daily_logs.update_one(
            {"_id": existing["_id"]},
            {"$set": {"entries": entries, "highlight": data.highlight, "overall_rating": data.overall_rating}}
        )
        return {"success": True, "updated": True}

    db.daily_logs.insert_one({
        "user_id": uid, "date": today, "entries": entries,
        "highlight": data.highlight, "overall_rating": data.overall_rating,
        "created_at": datetime.utcnow(),
    })

    user = db.users.find_one({"_id": ObjectId(uid)})
    last = user.get("last_log_date")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    streak = user.get("streak", 0)
    if last == yesterday:
        streak += 1
    elif last != today:
        streak = 1
    longest = max(streak, user.get("longest_streak", 0))
    db.users.update_one({"_id": ObjectId(uid)},
                        {"$set": {"streak": streak, "longest_streak": longest, "last_log_date": today}})
    return {"success": True, "streak": streak}


# ─── Manifestations ────────────────────────────────────────────────────────────

@app.get("/manifestations")
def get_manifestations(status_filter: Optional[str] = None, current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if status_filter and status_filter != "all":
        q["status"] = status_filter
    return serialize_list(db.manifestations.find(q).sort("created_at", -1))


@app.post("/manifestations")
def create_manifestation(data: ManifestationModel, current_user=Depends(get_current_user)):
    start = datetime.utcnow()
    if data.target_date:
        target_str = data.target_date
        target_days = (datetime.strptime(data.target_date, "%Y-%m-%d") - start).days
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
        "created_at": datetime.utcnow(),
    }
    result = db.manifestations.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    return item


@app.put("/manifestations/{m_id}")
def update_manifestation(m_id: str, data: ManifestationUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.dict())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": fields}
    )
    return {"success": True}


@app.delete("/manifestations/{m_id}")
def delete_manifestation(m_id: str, current_user=Depends(get_current_user)):
    r = db.manifestations.delete_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}


@app.put("/manifestations/{m_id}/archive")
def archive_manifestation(m_id: str, current_user=Depends(get_current_user)):
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": {"status": "archived"}}
    )
    return {"success": True}


@app.post("/manifestations/{m_id}/progress")
def add_manifestation_progress(m_id: str, data: ManifestationProgressModel, current_user=Depends(get_current_user)):
    entry = {"text": data.text, "type": data.type, "date": datetime.utcnow().isoformat()}
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$push": {"progress_entries": entry}}
    )
    return {"success": True}


@app.put("/manifestations/{m_id}/complete")
def complete_manifestation(m_id: str, reflection: dict, current_user=Depends(get_current_user)):
    # FIX: was missing user_id filter — any user could complete another user's manifestation
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": {"status": "completed", "reflection": reflection.get("text"), "completed_at": datetime.utcnow()}}
    )
    return {"success": True}


# ─── Snapshots ─────────────────────────────────────────────────────────────────

# NOTE: /snapshots/compare must come before /snapshots/{snap_id} to avoid
# FastAPI matching "compare" as a snap_id path param.
# Here it's safe because compare is GET and the others are PUT/DELETE,
# but keeping it first is best practice.

@app.get("/snapshots/compare")
def compare_snapshots(snap1_id: str, snap2_id: str, current_user=Depends(get_current_user)):
    s1 = db.snapshots.find_one({"_id": ObjectId(snap1_id), "user_id": str(current_user["_id"])})
    s2 = db.snapshots.find_one({"_id": ObjectId(snap2_id), "user_id": str(current_user["_id"])})
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {"snapshot1": serialize(s1), "snapshot2": serialize(s2)}


@app.get("/snapshots")
def get_snapshots(current_user=Depends(get_current_user)):
    return serialize_list(db.snapshots.find({"user_id": str(current_user["_id"])}).sort("date", -1))


@app.post("/snapshots")
def create_snapshot(data: SnapshotModel, current_user=Depends(get_current_user)):
    item = {
        "user_id": str(current_user["_id"]), "description": data.description,
        "values": data.values, "mood": data.mood,
        "date": data.date or datetime.utcnow().strftime("%Y-%m-%d"),
        "created_at": datetime.utcnow(),
    }
    result = db.snapshots.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    return item


@app.put("/snapshots/{snap_id}")
def update_snapshot(snap_id: str, data: SnapshotUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.dict())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.snapshots.update_one(
        {"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])},
        {"$set": fields}
    )
    return {"success": True}


@app.delete("/snapshots/{snap_id}")
def delete_snapshot(snap_id: str, current_user=Depends(get_current_user)):
    r = db.snapshots.delete_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"success": True}


# ─── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(days: int = 30, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    logs = list(db.daily_logs.find({"user_id": uid, "date": {"$gte": since}}))
    goals = list(db.goals.find({"user_id": uid}))
    categories = list(db.categories.find({"user_id": uid, "archived": {"$ne": True}}))
    manifestations = list(db.manifestations.find({"user_id": uid, "status": "active"}))

    heatmap = {l["date"]: l.get("overall_rating", 5) for l in logs}
    mood_trend = []
    for log in sorted(logs, key=lambda x: x["date"]):
        ratings = [e.get("mood", 5) for e in log.get("entries", [])]
        mood_trend.append({"date": log["date"], "mood": round(sum(ratings) / len(ratings), 1) if ratings else 5})

    cat_counts = defaultdict(int)
    for log in logs:
        for e in log.get("entries", []):
            cat_counts[e["category_id"]] += 1

    cat_consistency = [
        {
            "name": c["name"], "icon": c["icon"], "color": c["color"],
            "count": cat_counts.get(str(c["_id"]), 0),
            "percentage": round((cat_counts.get(str(c["_id"]), 0) / max(len(logs), 1)) * 100),
        }
        for c in categories
    ]

    user = db.users.find_one({"_id": ObjectId(uid)})
    return {
        "streak": user.get("streak", 0),
        "longest_streak": user.get("longest_streak", 0),
        "total_logs": len(logs),
        "heatmap": heatmap,
        "mood_trend": mood_trend,
        "category_consistency": cat_consistency,
        "goals": {
            "total": len(goals),
            "completed": len([g for g in goals if g["status"] == "completed"]),
            "active": len([g for g in goals if g["status"] == "active"]),
        },
        "active_manifestations": len(manifestations),
    }


@app.get("/")
def root():
    return {"message": "GrowthLog API v2 running"}