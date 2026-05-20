import re
import logging
from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from core.database import db
from api.deps import get_current_user

router = APIRouter(prefix="/timeline", tags=["timeline"])

logger = logging.getLogger(__name__)

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

    # Escape search query for regex safety to prevent ReDoS
    escaped_q = re.escape(q) if q else None

    # Parse category_ids
    cat_list = None
    if category_ids:
        cat_list = category_ids.split(",")

    # Fetch categories for enrichment with dual-type support
    uid_obj = ObjectId(uid) if ObjectId.is_valid(uid) else None
    uid_query = {"user_id": {"$in": [uid, uid_obj]}}
    db_categories = list(db.categories.find(uid_query))
    logger.debug(f"uid={uid}, uid_obj={uid_obj}, found_cats={len(db_categories)}")
    for c in db_categories:
        logger.debug(f"cat_id={str(c['_id'])}, user_id_in_db={c.get('user_id')}, type={type(c.get('user_id'))}")

    cat_map = {str(c["_id"]): {
        "id": str(c["_id"]),
        "name": c.get("name", "General"), 
        "icon": c.get("icon", "📁"), 
        "color": c.get("color", "#888")
    } for c in db_categories}

    # 1. Daily Logs
    log_query = {"$or": [
        {"user_id": uid},
        {"user_id": ObjectId(uid) if ObjectId.is_valid(uid) else None}
    ]}
    if start_date or end_date:
        log_query["date"] = {}
        if start_date: log_query["date"]["$gte"] = start_date
        if end_date: log_query["date"]["$lte"] = end_date
    
    if q:
        log_query["$or"] = [
            {"highlight": {"$regex": escaped_q, "$options": "i"}},
            {"entries.text": {"$regex": escaped_q, "$options": "i"}}
        ]
        
    logs = db.daily_logs.find(log_query)
    for log in logs:
        log_entries = log.get("entries", [])
        log_highlight = log.get("highlight", "").lower()
        q_lower = q.lower() if q else None
        
        matches_filter = False
        
        if cat_list:
            # If category filtering is on, we MUST have a matching entry
            for entry in log_entries:
                cid = str(entry.get("category_id"))
                if cid in cat_list:
                    # Does it also match search? (Search can match highlight or this entry)
                    if not q or (q_lower in log_highlight) or (q_lower in entry.get("text", "").lower()):
                        matches_filter = True
                        break
        else:
            # No category filtering. Match based on search query or just include everything.
            if not q:
                matches_filter = True
            elif q_lower in log_highlight:
                matches_filter = True
            else:
                # Check entries for search query match even if highlight didn't match
                matches_filter = any(q_lower in entry.get("text", "").lower() for entry in log_entries)

        if not matches_filter:
            continue
            
        # Enrich ALL categories and ALL entries since the log as a whole matched
        log_cats = []
        enriched_entries = []
        for entry in log_entries:
            cid = str(entry.get("category_id"))
            cat_info = cat_map.get(cid, {"id": cid, "name": "General", "icon": "📁", "color": "#888"})
            enriched_entries.append({**entry, "category": cat_info})
            if cat_info not in log_cats:
                log_cats.append(cat_info)

        main_cat = log_cats[0] if log_cats else {"name": "Pulse", "icon": "🔥", "color": "#6b8c6b"}
        
        events.append({
            "id": str(log["_id"]),
            "type": "daily_log",
            "date": log.get("date"),
            "title": "Daily Log",
            "description": log.get("highlight", ""),
            "status": "logged",
            "category": main_cat,
            "categories": log_cats,
            "data": {
                "mood": log.get("overall_rating", 5),
                "entries_count": len(enriched_entries),
                "entries": enriched_entries
            }
        })

    # 2. Goals
    goal_query = {"$or": [
        {"user_id": uid},
        {"user_id": ObjectId(uid) if ObjectId.is_valid(uid) else None}
    ]}
    if q:
        goal_query["$or"] = [
            {"title": {"$regex": escaped_q, "$options": "i"}},
            {"description": {"$regex": escaped_q, "$options": "i"}}
        ]
    if cat_list:
        goal_query["category_id"] = {"$in": cat_list}
        
    goals = db.goals.find(goal_query)
    for goal in goals:
        main_cat = cat_map.get(str(goal.get("category_id")), {"id": str(goal.get("category_id")), "name": "General", "icon": "📁", "color": "#888"})
        
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
                "category": main_cat,
                "categories": [main_cat]
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
                "category": main_cat,
                "categories": [main_cat]
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
                    "category": main_cat,
                    "categories": [main_cat]
                })

    # 3. Manifestations
    manif_query = {"$or": [
        {"user_id": uid},
        {"user_id": ObjectId(uid) if ObjectId.is_valid(uid) else None}
    ]}
    if q:
        manif_query["$or"] = [
            {"vision": {"$regex": escaped_q, "$options": "i"}},
            {"notes": {"$regex": escaped_q, "$options": "i"}}
        ]
    if cat_list:
        manif_query["categories"] = {"$in": cat_list}
        
    manifestations = db.manifestations.find(manif_query)
    for m in manifestations:
        m_cat_ids = m.get("categories", [])
        m_cats = []
        for cid in m_cat_ids:
            cid_str = str(cid)
            if cid_str in cat_map:
                m_cats.append(cat_map[cid_str])
            else:
                # Log but add a fallback to show SOMETHING
                logger.warning(f"Category {cid_str} not found in cat_map for user {uid}")
        
        if not m_cats:
            m_cats = [{"id": "manifestation", "name": "Manifestation", "icon": "💫", "color": "#e76f51"}]
        
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
                "category": m_cats[0],
                "categories": m_cats
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
                "category": m_cats[0],
                "categories": m_cats
            })
 
    # 4. Snapshots
    if not cat_list: # Snapshots don't have categories in schema yet
        snap_query = {"user_id": uid}
        if start_date or end_date:
            snap_query["date"] = {}
            if start_date: snap_query["date"]["$gte"] = start_date
            if end_date: snap_query["date"]["$lte"] = end_date
        if q:
            snap_query["description"] = {"$regex": escaped_q, "$options": "i"}
        
        snapshots = db.snapshots.find(snap_query)
        for snap in snapshots:
            snap_cat = {"id": "snapshot", "name": "Snapshot", "icon": "📸", "color": "#9b5de5"}
            events.append({
                "id": str(snap["_id"]),
                "type": "snapshot",
                "date": snap.get("date"),
                "title": "Snapshot Captured",
                "description": snap.get("description", ""),
                "status": "recorded",
                "category": snap_cat,
                "categories": [snap_cat],
                "data": {
                    "mood": snap.get("mood", 5)
                }
            })

    # 5. Milestones
    if not cat_list:
        user = db.users.find_one({"_id": ObjectId(uid)})
        if user and "milestones" in user:
            for mil in user["milestones"]:
                m_date = mil.get("earned_at")
                if m_date and ((not start_date or m_date >= start_date) and (not end_date or m_date <= end_date)):
                    mil_cat = {"id": "milestone", "name": "Milestone", "icon": "★", "color": "#ffb703"}
                    events.append({
                        "id": f"milestone_{uid}_{m_date}_{mil['type']}",
                        "type": "milestone",
                        "date": m_date,
                        "title": "New Achievement!",
                        "description": mil["type"],
                        "status": "earned",
                        "category": mil_cat,
                        "categories": [mil_cat]
                    })

    # Final Sorting & Pagination
    events.sort(key=lambda x: x["date"] or "", reverse=True)
    
    total_events = len(events)
    paginated_events = events[skip : skip + limit]
    
    return {
        "events": paginated_events,
        "total": total_events,
        "has_more": (skip + limit) < total_events
    }
