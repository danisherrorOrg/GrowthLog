from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal
from zoneinfo import ZoneInfo

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.schemas import ReviewModel, ReviewUpdateModel
from models.quick_checks import DATE_PATTERN

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
def get_reviews(
    period_type: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    uid = str(current_user["_id"])
    q = {"user_id": uid}
    if period_type:
        q["period_type"] = period_type
    return serialize_list(db.reviews.find(q).sort("start_date", DESCENDING))


def _utc_bounds(user, start_date: str, end_date: str):
    """The user's local [start_date 00:00, end_date + 1 day 00:00) as UTC datetimes."""
    try:
        tz = ZoneInfo(user.get("timezone") or "UTC")
    except Exception:
        tz = timezone.utc
    start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=tz)
    end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=tz) + timedelta(days=1)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def _quick_check_summary(uid: str, start_date: str, end_date: str):
    checks = list(db.quick_checks.find(
        {"user_id": uid, "date": {"$gte": start_date, "$lte": end_date}},
        {"verdict": 1, "action": 1, "worth_it": 1},
    ))
    not_now = [c for c in checks if c.get("verdict") == "not_now"]
    return {
        "total": len(checks),
        "go": len(checks) - len(not_now),
        "not_now": len(not_now),
        "caught": sum(1 for c in not_now if c.get("action") in ("skipped", "parked")),
        "done_anyway": sum(1 for c in not_now if c.get("action") == "doing"),
        "worth_it": sum(1 for c in checks if c.get("worth_it") is True),
        "not_worth_it": sum(1 for c in checks if c.get("worth_it") is False),
    }


def _decisions_in_range(uid: str, start, end):
    cursor = db.decisions.find(
        {"user_id": uid, "created_at": {"$gte": start, "$lt": end}},
        {"task": 1, "verdict": 1, "verdict_title": 1, "worth_it": 1},
    ).sort("created_at", DESCENDING).limit(10)
    return [{
        "id": str(d["_id"]), "task": d.get("task", ""), "verdict": d.get("verdict"),
        "verdict_title": d.get("verdict_title", ""), "worth_it": d.get("worth_it"),
    } for d in cursor]


def _previous_intentions(uid: str, period_type: Optional[str], start_date: str):
    """What the user said they'd focus on in the review just before this period."""
    if not period_type:
        return None
    prev = db.reviews.find_one(
        {"user_id": uid, "period_type": period_type, "start_date": {"$lt": start_date},
         "intentions": {"$nin": [None, ""]}},
        sort=[("start_date", DESCENDING)],
    )
    if not prev:
        return None
    return {"period_label": prev.get("period_label", ""), "intentions": prev["intentions"]}


@router.get("/stats")
def get_review_stats(
    start_date: str = Query(..., pattern=DATE_PATTERN),
    end_date: str = Query(..., pattern=DATE_PATTERN),
    period_type: Optional[Literal["weekly", "monthly", "yearly"]] = None,
    current_user=Depends(get_current_user)
):
    """
    Aggregate stats for all daily_logs in the given date range.
    Returns mood avg, energy avg, time invested, top category, top emotions,
    log count, goal completions, highlights, gratitude items, the period's
    quick checks and decisions, and the previous review's intentions.
    """
    uid = str(current_user["_id"])
    utc_start, utc_end = _utc_bounds(current_user, start_date, end_date)
    extras = {
        "quick_checks": _quick_check_summary(uid, start_date, end_date),
        "decisions": _decisions_in_range(uid, utc_start, utc_end),
        "previous_intentions": _previous_intentions(uid, period_type, start_date),
    }

    # ── Daily log aggregation ──────────────────────────────────────────────
    pipeline = [
        {"$match": {"user_id": uid, "date": {"$gte": start_date, "$lte": end_date}}},
        {"$facet": {
            "overview": [
                {"$group": {
                    "_id": None,
                    "log_count": {"$sum": 1},
                    "avg_mood": {"$avg": "$overall_rating"},
                    "total_time": {"$sum": {"$sum": "$entries.time_spent"}},
                    "highlights": {"$push": "$highlight"},
                    "gratitude_items": {"$push": "$gratitude"},
                }}
            ],
            "entry_stats": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": None,
                    "avg_entry_mood": {"$avg": "$entries.mood"},
                    "avg_entry_energy": {"$avg": "$entries.energy"},
                }}
            ],
            "category_time": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": "$entries.category_id",
                    "time_spent": {"$sum": "$entries.time_spent"},
                    "count": {"$sum": 1},
                    "avg_mood": {"$avg": "$entries.mood"},
                }}
            ],
            "emotions": [
                {"$unwind": "$entries"},
                {"$unwind": "$entries.emotions"},
                {"$group": {"_id": "$entries.emotions", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 8},
            ],
        }}
    ]

    agg = list(db.daily_logs.aggregate(pipeline))
    if not agg:
        return {**_empty_stats(), **extras}

    result = agg[0]
    overview = result["overview"][0] if result["overview"] else {}
    entry_stats = result["entry_stats"][0] if result["entry_stats"] else {}

    log_count = overview.get("log_count", 0)
    avg_mood = round(entry_stats.get("avg_entry_mood") or 0, 1)
    avg_energy = round(entry_stats.get("avg_entry_energy") or 0, 1)
    total_time = overview.get("total_time", 0)

    # Flatten gratitude
    all_gratitude = []
    for g_list in overview.get("gratitude_items", []):
        if g_list:
            all_gratitude.extend([g for g in g_list if g and g.strip()])
    # Deduplicate & take top 5
    seen = set()
    gratitude_items = []
    for g in all_gratitude:
        if g not in seen:
            seen.add(g)
            gratitude_items.append(g)
        if len(gratitude_items) >= 5:
            break

    # Highlights (non-empty)
    highlights = [h for h in overview.get("highlights", []) if h and h.strip()][:5]

    # Top category resolution
    top_category = None
    if result["category_time"]:
        top_cat_raw = max(result["category_time"], key=lambda x: x.get("time_spent", 0))
        cat_doc = db.categories.find_one({"_id": ObjectId(top_cat_raw["_id"])}) if top_cat_raw["_id"] else None
        if cat_doc:
            top_category = {
                "id": str(cat_doc["_id"]),
                "name": cat_doc["name"],
                "icon": cat_doc["icon"],
                "color": cat_doc["color"],
                "time_spent": top_cat_raw["time_spent"],
            }

    # Category breakdown (for bar chart)
    category_breakdown = []
    for c in result["category_time"]:
        if not c["_id"]:
            continue
        try:
            cat_doc = db.categories.find_one({"_id": ObjectId(c["_id"])})
        except Exception:
            cat_doc = None
        if cat_doc:
            category_breakdown.append({
                "name": cat_doc["name"],
                "icon": cat_doc["icon"],
                "color": cat_doc["color"],
                "time_spent": c.get("time_spent", 0),
                "count": c.get("count", 0),
                "avg_mood": round(c.get("avg_mood") or 0, 1),
            })
    category_breakdown.sort(key=lambda x: x["time_spent"], reverse=True)

    # Goals finished during the period, and those still open now
    goals_completed = db.goals.count_documents({
        "user_id": uid,
        "status": "completed",
        "reflected_at": {"$gte": utc_start, "$lt": utc_end},
    })
    goals_active = db.goals.count_documents({
        "user_id": uid,
        "status": {"$in": ["active", "extended"]},
    })

    # Consistency score (logged days / total days in range)
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        total_days = max((end_dt - start_dt).days + 1, 1)
    except Exception:
        total_days = 1
    consistency = round((log_count / total_days) * 100)

    return {
        "log_count": log_count,
        "total_days": total_days,
        "consistency": consistency,
        "avg_mood": avg_mood,
        "avg_energy": avg_energy,
        "total_time": total_time,
        "highlights": highlights,
        "gratitude_items": gratitude_items,
        "top_category": top_category,
        "category_breakdown": category_breakdown,
        "top_emotions": [{"label": e["_id"], "count": e["count"]} for e in result["emotions"]],
        "goals_completed": goals_completed,
        "goals_active": goals_active,
        **extras,
    }


@router.post("")
def create_review(data: ReviewModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    if db.reviews.find_one({"user_id": uid, "period_type": data.period_type, "start_date": data.start_date}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="You already reviewed this period. Edit that review instead.")
    doc = {
        "user_id": uid,
        "period_type": data.period_type,
        "period_label": data.period_label,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "rating": data.rating,
        "wins": data.wins,
        "challenges": data.challenges,
        "learnings": data.learnings,
        "intentions": data.intentions,
        "tags": data.tags or [],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result = db.reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    del doc["_id"]
    return doc


@router.put("/{review_id}")
def update_review(review_id: str, data: ReviewUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields["updated_at"] = utcnow()
    result = db.reviews.update_one(
        {"_id": ObjectId(review_id), "user_id": uid},
        {"$set": fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True}


@router.delete("/{review_id}")
def delete_review(review_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.reviews.delete_one({"_id": ObjectId(review_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True}


def _empty_stats():
    return {
        "log_count": 0, "total_days": 0, "consistency": 0,
        "avg_mood": 0, "avg_energy": 0, "total_time": 0,
        "highlights": [], "gratitude_items": [],
        "top_category": None, "category_breakdown": [],
        "top_emotions": [], "goals_completed": 0, "goals_active": 0,
    }
