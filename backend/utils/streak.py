from bson import ObjectId
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pymongo import DESCENDING
from core.database import db
from utils.cache import utcnow

def _get_local_now(user: dict):
    tz_str = user.get("timezone", "UTC")
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = ZoneInfo("UTC")
    return utcnow().astimezone(tz)

def recalculate_user_streak(uid: str):
    """Accurately calculates the current and longest streak using a paginated query that stops on gaps."""
    user = db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        return 0

    now_local = _get_local_now(user)
    today = now_local.strftime("%Y-%m-%d")
    yesterday = (now_local - timedelta(days=1)).strftime("%Y-%m-%d")

    current_streak = 0
    longest_streak = user.get("longest_streak", 0)
    
    skip = 0
    limit = 30
    check_date = None
    last_log = None
    streak_broken = False
    
    while not streak_broken:
        logs = list(db.daily_logs.find({"user_id": uid}, {"date": 1}).sort("date", DESCENDING).skip(skip).limit(limit))
        if not logs:
            if skip == 0:
                db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak": 0, "last_log_date": None, "shield_milestones": []}})
                return 0
            break
            
        dates = []
        for l in logs:
            if not dates or dates[-1] != l["date"]:
                dates.append(l["date"])
                
        if skip == 0:
            last_log = dates[0]
            if last_log < yesterday:
                streak_broken = True
                break
            check_date = last_log
            
        for d in dates:
            if d == check_date:
                current_streak += 1
                check_date = (datetime.strptime(check_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                streak_broken = True
                break
                
        skip += limit

    longest_streak = max(longest_streak, current_streak)

    # Award shields for consistency milestones (every 7 days)
    streak_shields = user.get("streak_shields", 0)
    shield_milestones = user.get("shield_milestones", [])
    
    # If streak is 0, we can reset shield_milestones
    if current_streak == 0:
        shield_milestones = []
    else:
        # Check if they hit a new multiple of 7 milestone
        # e.g., 7, 14, 21, 28, etc.
        if current_streak % 7 == 0 and current_streak not in shield_milestones:
            shield_milestones.append(current_streak)
            streak_shields += 1
            # Add an activity log or action for earning shield
            from utils.activity import log_activity
            log_activity(uid, "earn", "shield", str(user["_id"]), f"Earned a streak shield at {current_streak}-day milestone! 🛡️")

    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {
        "streak": current_streak,
        "longest_streak": longest_streak,
        "last_log_date": last_log,
        "streak_shields": streak_shields,
        "shield_milestones": shield_milestones
    }})
    return current_streak

def check_and_apply_streak_shields(user: dict) -> dict:
    shields = user.get("streak_shields", 0)
    if shields <= 0:
        return user

    uid = str(user["_id"])
    now_local = _get_local_now(user)
    yesterday = (now_local - timedelta(days=1)).strftime("%Y-%m-%d")

    last_log_date = user.get("last_log_date")
    if not last_log_date:
        return user
        
    if last_log_date >= yesterday:
        return user

    curr_date_str = last_log_date
    shields_consumed = 0
    
    while curr_date_str < yesterday and shields > 0:
        next_dt = datetime.strptime(curr_date_str, "%Y-%m-%d") + timedelta(days=1)
        next_date_str = next_dt.strftime("%Y-%m-%d")
        
        # Create a shielded log for next_date_str
        db.daily_logs.insert_one({
            "user_id": uid,
            "date": next_date_str,
            "local_date": next_date_str,
            "utc_date": utcnow().strftime("%Y-%m-%d"),
            "entries": [],
            "highlight": "Streak saved by Shield! 🛡️",
            "overall_rating": 5,
            "is_shielded": True,
            "created_at": utcnow()
        })
        
        # Log activity for shield activation
        from utils.activity import log_activity
        log_activity(uid, "use", "shield", next_date_str, f"Streak shield activated to save streak on {next_date_str}! 🛡️")
        
        shields -= 1
        shields_consumed += 1
        curr_date_str = next_date_str

    if shields_consumed > 0:
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"streak_shields": shields}}
        )
        recalculate_user_streak(uid)
        # Fetch updated user doc
        user = db.users.find_one({"_id": user["_id"]})
        
    return user
