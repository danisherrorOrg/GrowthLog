from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list
from api.deps import get_current_user
from models.schemas import (
    AntiGoalModel, HabitGraveyardModel,
    TimeEntryModel, ScreenTimeModel, ProcrastinationLogModel, NotToDoModel
)

router = APIRouter(prefix="/insights", tags=["insights"])

# ──────────────────────────────────────────────
#  Anti-Goals
# ──────────────────────────────────────────────

@router.get("/anti-goals")
def get_anti_goals(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.anti_goals.find({"user_id": uid}).sort("created_at", DESCENDING))

@router.post("/anti-goals")
def create_anti_goal(data: AntiGoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "text": data.text,
        "reason": data.reason or "",
        "created_at": utcnow(),
    }
    result = db.anti_goals.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "anti_goal", str(result.inserted_id), f"Created anti-goal: {data.text[:60]}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/anti-goals/{item_id}")
def update_anti_goal(item_id: str, data: AntiGoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.anti_goals.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"text": data.text, "reason": data.reason or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anti-goal not found")
    from utils.activity import log_activity
    log_activity(uid, "update", "anti_goal", item_id, "Updated anti-goal")
    return {"success": True}

@router.delete("/anti-goals/{item_id}")
def delete_anti_goal(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.anti_goals.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Anti-goal not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "anti_goal", item_id, "Deleted anti-goal")
    return {"success": True}

# ──────────────────────────────────────────────
#  Habit Graveyard
# ──────────────────────────────────────────────

@router.get("/habit-graveyard")
def get_habit_graveyard(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.habit_graveyard.find({"user_id": uid}).sort("created_at", DESCENDING))

@router.post("/habit-graveyard")
def create_habit_graveyard(data: HabitGraveyardModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "habit": data.habit,
        "reason": data.reason or "",
        "started_at": data.started_at or "",
        "abandoned_at": data.abandoned_at or "",
        "created_at": utcnow(),
    }
    result = db.habit_graveyard.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "habit_graveyard", str(result.inserted_id), f"Logged habit to graveyard: {data.habit[:60]}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/habit-graveyard/{item_id}")
def update_habit_graveyard(item_id: str, data: HabitGraveyardModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.habit_graveyard.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"habit": data.habit, "reason": data.reason or "", "started_at": data.started_at or "", "abandoned_at": data.abandoned_at or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit graveyard entry not found")
    from utils.activity import log_activity
    log_activity(uid, "update", "habit_graveyard", item_id, "Updated habit graveyard entry")
    return {"success": True}

@router.delete("/habit-graveyard/{item_id}")
def delete_habit_graveyard(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.habit_graveyard.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit graveyard entry not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "habit_graveyard", item_id, "Deleted habit graveyard entry")
    return {"success": True}


# ──────────────────────────────────────────────
#  Time Tracking
# ──────────────────────────────────────────────

@router.get("/time-entries")
def get_time_entries(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.time_entries.find({"user_id": uid}).sort("date", DESCENDING))

@router.post("/time-entries")
def create_time_entry(data: TimeEntryModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "category": data.category,
        "hours": data.hours,
        "notes": data.notes or "",
        "created_at": utcnow(),
    }
    result = db.time_entries.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "time_entry", str(result.inserted_id), f"Logged {data.hours}h for {data.category}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/time-entries/{item_id}")
def update_time_entry(item_id: str, data: TimeEntryModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.time_entries.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or utcnow().strftime("%Y-%m-%d"), "category": data.category, "hours": data.hours, "notes": data.notes or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return {"success": True}

@router.delete("/time-entries/{item_id}")
def delete_time_entry(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.time_entries.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Screen Time
# ──────────────────────────────────────────────

@router.get("/screen-time")
def get_screen_time(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.screen_time.find({"user_id": uid}).sort("date", DESCENDING))

@router.post("/screen-time")
def create_screen_time(data: ScreenTimeModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "app_category": data.app_category,
        "hours": data.hours,
        "notes": data.notes or "",
        "created_at": utcnow(),
    }
    result = db.screen_time.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "screen_time", str(result.inserted_id), f"Logged screen time: {data.app_category}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/screen-time/{item_id}")
def update_screen_time(item_id: str, data: ScreenTimeModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.screen_time.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or utcnow().strftime("%Y-%m-%d"), "app_category": data.app_category, "hours": data.hours, "notes": data.notes or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Screen time entry not found")
    return {"success": True}

@router.delete("/screen-time/{item_id}")
def delete_screen_time(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.screen_time.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Screen time entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Procrastination Log
# ──────────────────────────────────────────────

@router.get("/procrastination")
def get_procrastination(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.procrastination_log.find({"user_id": uid}).sort("date", DESCENDING))

@router.post("/procrastination")
def create_procrastination(data: ProcrastinationLogModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "what": data.what,
        "why": data.why or "",
        "outcome": data.outcome or "",
        "created_at": utcnow(),
    }
    result = db.procrastination_log.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "procrastination", str(result.inserted_id), f"Logged procrastination: {data.what[:60]}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/procrastination/{item_id}")
def update_procrastination(item_id: str, data: ProcrastinationLogModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.procrastination_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "what": data.what, "why": data.why or "", "outcome": data.outcome or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Procrastination entry not found")
    return {"success": True}

@router.delete("/procrastination/{item_id}")
def delete_procrastination(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.procrastination_log.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Procrastination entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Not-to-do List
# ──────────────────────────────────────────────

@router.get("/not-to-do")
def get_not_to_do(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.not_to_do.find({"user_id": uid}).sort("created_at", DESCENDING))

@router.post("/not-to-do")
def create_not_to_do(data: NotToDoModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = {
        "user_id": uid,
        "text": data.text,
        "reason": data.reason or "",
        "created_at": utcnow(),
    }
    result = db.not_to_do.insert_one(doc)
    from utils.activity import log_activity
    log_activity(uid, "create", "not_to_do", str(result.inserted_id), f"Added not-to-do: {data.text[:60]}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/not-to-do/{item_id}")
def update_not_to_do(item_id: str, data: NotToDoModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.not_to_do.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"text": data.text, "reason": data.reason or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not-to-do item not found")
    return {"success": True}

@router.delete("/not-to-do/{item_id}")
def delete_not_to_do(item_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.not_to_do.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not-to-do item not found")
    return {"success": True}
