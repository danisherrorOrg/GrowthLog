from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId

from core.database import db
from api.deps import get_current_user

router = APIRouter(prefix="/timeline", tags=["timeline"])

@router.get("")
def get_timeline(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    current_user=Depends(get_current_user)
):
    uid = str(current_user["_id"])
    events = []

    # Fetch categories for enrichment
    categories = list(db.categories.find({"user_id": uid}))
    cat_map = {str(c["_id"]): {
        "name": c.get("name", "General"), 
        "icon": c.get("icon", "📁"), 
        "color": c.get("color", "#888")
    } for c in categories}

    # 1. Daily Logs
    log_query = {"user_id": uid}
    if start_date or end_date:
        log_query["date"] = {}
        if start_date: log_query["date"]["$gte"] = start_date
        if end_date: log_query["date"]["$lte"] = end_date
        
    logs = db.daily_logs.find(log_query)
    for log in logs:
        enriched_entries = []
        for entry in log.get("entries", []):
            cat_info = cat_map.get(str(entry.get("category_id")), {
                "name": "General", "icon": "📁", "color": "#888"
            })
            enriched_entries.append({
                **entry,
                "category": cat_info
            })

        events.append({
            "id": str(log["_id"]),
            "type": "daily_log",
            "date": log.get("date"),
            "title": "Daily Log",
            "description": log.get("highlight", ""),
            "status": "logged",
            "data": {
                "mood": log.get("overall_rating", 5),
                "entries_count": len(enriched_entries),
                "entries": enriched_entries
            }
        })

    # 2. Goals
    goal_query = {"user_id": uid}
    goals = db.goals.find(goal_query)
    for goal in goals:
        # Goal Created Event
        created_at = goal.get("created_at")
        created_date = None
        if isinstance(created_at, datetime):
            created_date = created_at.strftime("%Y-%m-%d")
        elif isinstance(created_at, str):
            created_date = created_at[:10]
            
        if created_date and ((not start_date or created_date >= start_date) and (not end_date or created_date <= end_date)):
            events.append({
                "id": str(goal["_id"]) + "_created",
                "source_id": str(goal["_id"]),
                "type": "goal_created",
                "date": created_date,
                "title": goal.get("title", ""),
                "description": goal.get("description", ""),
                "status": "active",
                "category": cat_map.get(str(goal.get("category_id")), {"name": "General", "icon": "📁", "color": "#888"})
            })
        
        # Goal Deadline Event
        deadline = goal.get("current_deadline")
        if deadline and ((not start_date or deadline >= start_date) and (not end_date or deadline <= end_date)):
            events.append({
                "id": str(goal["_id"]) + "_deadline",
                "source_id": str(goal["_id"]),
                "type": "goal_deadline",
                "date": deadline,
                "title": goal.get("title", ""),
                "description": goal.get("description", ""),
                "status": goal.get("status", "active"),
                "category": cat_map.get(str(goal.get("category_id")), {"name": "General", "icon": "📁", "color": "#888"})
            })

        # Goal Completed Event
        if goal.get("status") in ["completed", "completed_late"]:
            completed_at = goal.get("completed_at")
            comp_date = None
            if isinstance(completed_at, datetime):
                comp_date = completed_at.strftime("%Y-%m-%d")
            elif isinstance(completed_at, str):
                comp_date = completed_at[:10]
            
            if comp_date and ((not start_date or comp_date >= start_date) and (not end_date or comp_date <= end_date)):
                events.append({
                    "id": str(goal["_id"]) + "_completed",
                    "source_id": str(goal["_id"]),
                    "type": "goal_completed",
                    "date": comp_date,
                    "title": goal.get("title", ""),
                    "description": goal.get("reflection", ""),
                    "status": goal.get("status"),
                    "category": cat_map.get(str(goal.get("category_id")), {"name": "General", "icon": "📁", "color": "#888"})
                })
                 
    # 3. Manifestations
    manif_query = {"user_id": uid}
    manifestations = db.manifestations.find(manif_query)
    for m in manifestations:
        start_d = m.get("start_date")
        if start_d and ((not start_date or start_d >= start_date) and (not end_date or start_d <= end_date)):
            events.append({
                "id": str(m["_id"]) + "_started",
                "source_id": str(m["_id"]),
                "type": "manifestation_started",
                "date": start_d,
                "title": m.get("vision", ""),
                "description": m.get("notes", ""),
                "status": "active",
                "category": {"name": "Manifestation", "icon": "💫", "color": "#e76f51"}
            })
            
        target = m.get("target_date")
        if target and ((not start_date or target >= start_date) and (not end_date or target <= end_date)):
            events.append({
                "id": str(m["_id"]) + "_target",
                "source_id": str(m["_id"]),
                "type": "manifestation_target",
                "date": target,
                "title": m.get("vision", ""),
                "description": m.get("notes", ""),
                "status": m.get("status", "active"),
                "category": {"name": "Manifestation", "icon": "💫", "color": "#e76f51"}
            })

    # 4. Snapshots
    snap_query = {"user_id": uid}
    if start_date or end_date:
        snap_query["date"] = {}
        if start_date: snap_query["date"]["$gte"] = start_date
        if end_date: snap_query["date"]["$lte"] = end_date
    snapshots = db.snapshots.find(snap_query)
    for snap in snapshots:
        events.append({
            "id": str(snap["_id"]),
            "type": "snapshot",
            "date": snap.get("date"),
            "title": "Snapshot Captured",
            "description": snap.get("description", ""),
            "status": "recorded",
            "category": {"name": "Snapshot", "icon": "📸", "color": "#9b5de5"},
            "data": {
                "mood": snap.get("mood", 5)
            }
        })

    # 5. Milestones
    user = db.users.find_one({"_id": current_user["_id"]})
    if user and "milestones" in user:
        for ms in user["milestones"]:
            ms_date = ms.get("earned_at")
            ms_d = None
            if isinstance(ms_date, datetime):
                ms_d = ms_date.strftime("%Y-%m-%d")
            elif isinstance(ms_date, str):
                ms_d = ms_date[:10]
                
            if ms_d and ((not start_date or ms_d >= start_date) and (not end_date or ms_d <= end_date)):
                events.append({
                    "id": "ms_" + ms.get("type", "unknown") + "_" + (ms_d or "empty"),
                    "type": "milestone",
                    "date": ms_d,
                    "title": "Milestone Earned",
                    "description": ms.get("type", ""),
                    "status": "earned",
                    "category": {"name": "Milestone", "icon": "★", "color": "#ffb703"}
                })

    # Sort events by date descending
    def get_date_val(e):
        return e.get("date") or "1970-01-01"
        
    events.sort(key=get_date_val, reverse=True)
    
    return events
