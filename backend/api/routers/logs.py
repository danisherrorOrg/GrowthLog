from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta

from core.database import db
from utils.cache import utcnow, cache_invalidate
from utils.helpers import serialize, serialize_list
from api.deps import get_current_user, validate_user_owns_category
from models.schemas import DailyLogModel

router = APIRouter(prefix="/logs", tags=["logs"])

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
    
    last_log = dates[0]
    # If the last log is older than yesterday, the streak is broken.
    # We use >= yesterday to stay active even if log date is "tomorrow" in UTC terms.
    if last_log < yesterday:
        current_streak = 0
    else:
        check_date = last_log
        for d in dates:
            if d == check_date:
                current_streak += 1
                check_date = (datetime.strptime(check_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                break

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

@router.get("")
def get_logs(days: int = 30, limit: int = 20, skip: int = 0, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if days > 0:
        since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        query["date"] = {"$gte": since}
    
    cursor = db.daily_logs.find(query).sort("date", DESCENDING).skip(skip).limit(limit)
    return serialize_list(cursor)

@router.get("/today")
def get_today_log(current_user=Depends(get_current_user)):
    today = utcnow().strftime("%Y-%m-%d")
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": today})
    return serialize(log) if log else None

@router.get("/{date}")
def get_log_by_date(date: str, current_user=Depends(get_current_user)):
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    return serialize(log) if log else None

@router.post("")
def create_log(data: DailyLogModel, current_user=Depends(get_current_user)):
    today = data.date if data.date else utcnow().strftime("%Y-%m-%d")
    uid = str(current_user["_id"])

    for entry in data.entries:
        validate_user_owns_category(entry.category_id, uid)

    existing = db.daily_logs.find_one({"user_id": uid, "date": today})
    entries = [e.model_dump() for e in data.entries]
    if existing:
        db.daily_logs.update_one({"_id": existing["_id"]},
            {"$set": {"entries": entries, "highlight": data.highlight, "overall_rating": data.overall_rating,
                      "gratitude": data.gratitude or [], "regret": data.regret or ""}})
        cache_invalidate(f"dashboard:{uid}")
        cache_invalidate(f"stats:{uid}")
        from utils.activity import log_activity
        log_activity(uid, "update", "log", str(existing["_id"]), "Updated daily log")
        return {"success": True, "updated": True}

    result = db.daily_logs.insert_one({
        "user_id": uid, "date": today, "entries": entries,
        "highlight": data.highlight, "overall_rating": data.overall_rating,
        "gratitude": data.gratitude or [], "regret": data.regret or "",
        "created_at": utcnow(),
    })
    
    streak = recalculate_user_streak(uid)
    from utils.activity import log_activity
    log_activity(uid, "create", "log", str(result.inserted_id), "Created daily log")
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True, "streak": streak}

@router.delete("/{date}")
def delete_log(date: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.daily_logs.delete_one({"user_id": uid, "date": date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    recalculate_user_streak(uid)
    from utils.activity import log_activity
    log_activity(uid, "delete", "log", date, "Deleted daily log")
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}
