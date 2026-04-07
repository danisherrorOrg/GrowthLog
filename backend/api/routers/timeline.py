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
    q: Optional[str] = Query(None, description="Search query"),
    category_ids: Optional[str] = Query(None, description="Comma-separated category IDs"),
    limit: int = Query(20, description="Number of events to return"),
    skip: int = Query(0, description="Offset for pagination"),
    current_user=Depends(get_current_user)
):
    uid = str(current_user["_id"])
    events = []

    # Parse category_ids
    cat_filter = None
    if category_ids:
        cat_filter = category_ids.split(",")

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
    
    # If search is present, we filter by highlight or any entry text
    if q:
        log_query["$or"] = [
            {"highlight": {"$regex": q, "$options": "i"}},
            {"entries.text": {"$regex": q, "$options": "i"}}
        ]
        
    logs = db.daily_logs.find(log_query)
    for log in logs:
        enriched_entries = []
        for entry in log.get("entries", []):
            cid = str(entry.get("category_id"))
            # Filter entries by category if specified
            if cat_filter and cid not in cat_filter:
                continue
            
            # Filter entries by search if specified
            if q and q.lower() not in entry.get("text", "").lower() and q.lower() not in log.get("highlight", "").lower():
                continue

            cat_info = cat_map.get(cid, {"name": "General", "icon": "📁", "color": "#888"})
            enriched_entries.append({**entry, "category": cat_info})

        # Skip log if it has no entries after filtering (unless it matches q in the highlight)
        if not enriched_entries and not (q and q.lower() in log.get("highlight", "").lower()):
            if cat_filter: # If category filter is on, and no entries match, skip.
                continue

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
    if cat_filter:
        goal_query["category_id"] = {"$in": cat_filter}
    if q:
        goal_query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"reflection": {"$regex": q, "$options": "i"}}
        ]

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
                 
    # 3. Manifestations (Manifestations don't have categories in this schema yet, but check q)
    if not cat_filter:
        manif_query = {"user_id": uid}
        if q:
            manif_query["$or"] = [
                {"vision": {"$regex": q, "$options": "i"}},
                {"notes": {"$regex": q, "$options": "i"}}
            ]
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

    # 4. Snapshots (No categories, but check q)
    if not cat_filter:
        snap_query = {"user_id": uid}
        if start_date or end_date:
            snap_query["date"] = {}
            if start_date: snap_query["date"]["$gte"] = start_date
            if end_date: snap_query["date"]["$lte"] = end_date
        if q:
            snap_query["description"] = {"$regex": q, "$options": "i"}
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

    # 5. Milestones (No categories, but check q)
    if not cat_filter:
        user = db.users.find_one({"_id": current_user["_id"]})
        if user and "milestones" in user:
            for ms in user["milestones"]:
                ms_date = ms.get("earned_at")
                ms_d = None
                if isinstance(ms_date, datetime):
                    ms_d = ms_date.strftime("%Y-%m-%d")
                elif isinstance(ms_date, str):
                    ms_d = ms_date[:10]
                    
                matches_q = not q or q.lower() in ms.get("type", "").lower()
                if ms_d and matches_q and ((not start_date or ms_d >= start_date) and (not end_date or ms_d <= end_date)):
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
    
    # Apply pagination
    paginated_events = events[skip : skip + limit]
    
    return {
        "events": paginated_events,
        "total": len(events),
        "has_more": skip + limit < len(events)
    }
