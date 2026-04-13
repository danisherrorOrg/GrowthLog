from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from core.database import db
from utils.cache import utcnow, cache_invalidate
from utils.helpers import serialize, serialize_list
from api.deps import get_current_user, validate_user_owns_category
from models.schemas import DailyLogModel

router = APIRouter(prefix="/logs", tags=["logs"])

def _get_local_now(user: dict):
    tz_str = user.get("timezone", "UTC")
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = ZoneInfo("UTC")
    return utcnow().astimezone(tz)

def recalculate_user_streak(uid: str):
    """Accurately calculates the current and longest streak based on recent logs."""
    user = db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        return 0

    logs = list(db.daily_logs.find({"user_id": uid}, {"date": 1}).sort("date", DESCENDING).limit(30))
    if not logs:
        db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak": 0, "last_log_date": None}})
        return 0
        
    now_local = _get_local_now(user)
    today = now_local.strftime("%Y-%m-%d")
    yesterday = (now_local - timedelta(days=1)).strftime("%Y-%m-%d")

    # Dedup dates in case of multi-log entries on same day (should be unique but just in case)
    dates = sorted(list(set([l["date"] for l in logs])), reverse=True)
    
    current_streak = 0
    longest_streak = user.get("longest_streak", 0)
    
    last_log = dates[0]
    # If the last log is older than yesterday local time, the streak is broken.
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
                
        if current_streak == len(dates) and user.get("streak", 0) > current_streak:
            if last_log == today and user.get("last_log_date") != today:
                current_streak = user.get("streak", 0) + 1
            else:
                current_streak = user.get("streak", 0)

    longest_streak = max(longest_streak, current_streak)

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
        since = (_get_local_now(current_user) - timedelta(days=days)).strftime("%Y-%m-%d")
        query["date"] = {"$gte": since}
    
    cursor = db.daily_logs.find(query).sort("date", DESCENDING).skip(skip).limit(limit)
    return serialize_list(cursor)

@router.get("/today")
def get_today_log(current_user=Depends(get_current_user)):
    today = _get_local_now(current_user).strftime("%Y-%m-%d")
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": today})
    return serialize(log) if log else None

@router.get("/{date}")
def get_log_by_date(date: str, current_user=Depends(get_current_user)):
    log = db.daily_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    return serialize(log) if log else None

@router.post("")
def create_log(data: DailyLogModel, current_user=Depends(get_current_user)):
    today = data.date if data.date else _get_local_now(current_user).strftime("%Y-%m-%d")
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
        return {"id": str(existing["_id"]), "success": True, "updated": True}

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
    return {"id": str(result.inserted_id), "success": True, "streak": streak}

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
