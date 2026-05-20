from fastapi import APIRouter, HTTPException, Depends, Request
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from core.database import db
from utils.cache import utcnow, cache_invalidate_exact, cache_invalidate_prefix
from utils.helpers import serialize, serialize_list
from api.deps import get_current_user, validate_user_owns_category
from models.schemas import DailyLogModel
from core.rate_limit import limiter


router = APIRouter(prefix="/logs", tags=["logs"])

from utils.streak import recalculate_user_streak, _get_local_now

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
@limiter.limit("10/minute")
def create_log(request: Request, data: DailyLogModel, current_user=Depends(get_current_user)):
    """
    Creates or updates a daily log.
    NOTE: 'date' is always stored as the user's local timezone string (e.g. '2026-04-15') 
    to ensure streak continuity perfectly aligns with their physical days. 
    We also store 'utc_date' for system cron evaluations.
    """
    local_now = _get_local_now(current_user)
    today = data.date if data.date else local_now.strftime("%Y-%m-%d")
    utc_today = utcnow().strftime("%Y-%m-%d")
    uid = str(current_user["_id"])

    for entry in data.entries:
        validate_user_owns_category(entry.category_id, uid)

    existing = db.daily_logs.find_one({"user_id": uid, "date": today})
    entries = [e.model_dump() for e in data.entries]
    if existing:
        db.daily_logs.update_one({"_id": existing["_id"]},
            {"$set": {"entries": entries, "highlight": data.highlight, "overall_rating": data.overall_rating,
                      "gratitude": data.gratitude or [], "regret": data.regret or "",
                      "utc_date": utc_today, "local_date": today}})
        cache_invalidate_prefix(f"dashboard:{uid}:")
        cache_invalidate_exact(f"stats:{uid}")
        from utils.activity import log_activity
        log_activity(uid, "update", "log", str(existing["_id"]), "Updated daily log")
        return {"id": str(existing["_id"]), "success": True, "updated": True}

    result = db.daily_logs.insert_one({
        "user_id": uid, "date": today, "local_date": today, "utc_date": utc_today, "entries": entries,
        "highlight": data.highlight, "overall_rating": data.overall_rating,
        "gratitude": data.gratitude or [], "regret": data.regret or "",
        "created_at": utcnow(),
    })
    
    streak = recalculate_user_streak(uid)
    from utils.activity import log_activity
    log_activity(uid, "create", "log", str(result.inserted_id), "Created daily log")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
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
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return {"success": True}
