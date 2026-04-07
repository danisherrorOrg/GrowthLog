from fastapi import APIRouter, Depends
from datetime import datetime, timedelta

from core.database import db
from utils.cache import utcnow, cache_get, cache_set
from api.deps import get_current_user
from prompts import QUOTES, CATEGORY_PROMPTS

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
prompts_router = APIRouter(prefix="/prompts", tags=["prompts"])

@prompts_router.get("/quote")
def get_quote():
    day_of_year = datetime.now().timetuple().tm_yday
    quote = QUOTES[day_of_year % len(QUOTES)]
    return quote

@prompts_router.get("/daily")
def get_daily_prompts():
    day_seed = datetime.now().timetuple().tm_yday
    prompts = {}
    for cat, p_list in CATEGORY_PROMPTS.items():
        prompts[cat] = p_list[day_seed % len(p_list)]
    return prompts

@router.get("")
def get_dashboard(days: int = 30, current_user=Depends(get_current_user)):
    days = min(max(days, 1), 365)
    uid = str(current_user["_id"])
    cache_key = f"dashboard:{uid}:{days}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    pipeline = [
        {"$match": {"user_id": uid, "date": {"$gte": since}}},
        {"$facet": {
            "trends": [
                {"$sort": {"date": 1}},
                {"$project": {
                    "date": 1,
                    "overall_rating": {"$ifNull": ["$overall_rating", 5]},
                    "highlight": {"$ifNull": ["$highlight", ""]},
                    "entry_count": {"$size": {"$ifNull": ["$entries", []]}},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "avg_energy": {"$avg": "$entries.energy"},
                    "time_spent": {"$sum": "$entries.time_spent"}
                }}
            ],
            "category_stats": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": "$entries.category_id",
                    "count": {"$sum": 1},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "time_spent": {"$sum": "$entries.time_spent"}
                }}
            ],
            "weekly_summary": [
                {"$project": {
                    "date_obj": {"$dateFromString": {"dateString": "$date"}},
                    "avg_mood": {"$avg": "$entries.mood"},
                    "avg_energy": {"$avg": "$entries.energy"}
                }},
                {"$group": {
                    "_id": {"$isoWeek": "$date_obj"},
                    "logs": {"$sum": 1},
                    "mood_sum": {"$sum": "$avg_mood"},
                    "energy_sum": {"$sum": "$avg_energy"}
                }},
                {"$sort": {"_id": 1}}
            ],
            "emotions": [
                {"$unwind": "$entries"},
                {"$unwind": "$entries.emotions"},
                {"$group": {
                    "_id": "$entries.emotions",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ],
            "totals": [
                {"$unwind": "$entries"},
                {"$group": {
                    "_id": None,
                    "total_time": {"$sum": "$entries.time_spent"},
                    "log_count": {"$sum": 1} # This is entries count, let's get logs count separately
                }}
            ]
        }}
    ]
    
    agg_result = list(db.daily_logs.aggregate(pipeline))[0]
    logs_count = db.daily_logs.count_documents({"user_id": uid, "date": {"$gte": since}})
    
    heatmap = {t["date"]: {"rating": t["overall_rating"], "highlight": t["highlight"], "count": t["entry_count"]} for t in agg_result["trends"]}
    mood_trend = [{"date": t["date"], "mood": round(t["avg_mood"] or 5, 1)} for t in agg_result["trends"]]
    energy_trend = [{"date": t["date"], "energy": round(t["avg_energy"] or 5, 1)} for t in agg_result["trends"]]
    time_spent_trend = [{"date": t["date"], "time_spent": t["time_spent"]} for t in agg_result["trends"]]
    
    cat_stats_map = {s["_id"]: s for s in agg_result["category_stats"]}
    categories = list(db.categories.find({"user_id": uid, "archived": {"$ne": True}}))
    cat_consistency = [
        {
            "name": c["name"], "icon": c["icon"], "color": c["color"], "id": str(c["_id"]),
            "count": cat_stats_map.get(str(c["_id"]), {}).get("count", 0),
            "percentage": round((cat_stats_map.get(str(c["_id"]), {}).get("count", 0) / max(logs_count, 1)) * 100),
            "avg_mood": round(cat_stats_map.get(str(c["_id"]), {}).get("avg_mood", 5) or 5, 1),
            "time_spent": cat_stats_map.get(str(c["_id"]), {}).get("time_spent", 0)
        }
        for c in categories
    ]
    
    weekly_summary = [
        {
            "week": f"W{w['_id']}",
            "logs": w["logs"],
            "avg_mood": round(w["mood_sum"] / max(w["logs"], 1), 1),
            "avg_energy": round(w["energy_sum"] / max(w["logs"], 1), 1)
        }
        for w in agg_result["weekly_summary"]
    ]
    
    goals = list(db.goals.aggregate([
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    goal_counts = {g["_id"]: g["count"] for g in goals}
    
    manifestations_count = db.manifestations.count_documents({"user_id": uid, "status": "active"})
    todos_count = db.todos.count_documents({"user_id": uid, "status": "pending"})
    
    insights = []
    if cat_consistency:
        by_time = sorted(cat_consistency, key=lambda x: x["time_spent"], reverse=True)
        top_cat = by_time[0]
        if top_cat["time_spent"] > 0:
            insights.append({
                "type": "top_performer",
                "text": f"You're investing heavily in {top_cat['icon']} {top_cat['name']}! {top_cat['time_spent']} minutes logged recently.",
                "color": top_cat["color"]
            })
        
        logged_cats = [c for c in cat_consistency if c["count"] > 0]
        if logged_cats:
            by_mood = sorted(logged_cats, key=lambda x: x["avg_mood"], reverse=True)
            happiest_cat = by_mood[0]
            insights.append({
                "type": "mood_booster",
                "text": f"{happiest_cat['icon']} {happiest_cat['name']} seems to be your happiest space right now.",
                "color": happiest_cat["color"]
            })

            neglected = sorted(cat_consistency, key=lambda x: x["count"])
            if neglected[0]["count"] < logs_count / 2:
                insights.append({
                    "type": "balance_nudge",
                    "text": f"Your {neglected[0]['icon']} {neglected[0]['name']} could use a bit more attention this week.",
                    "color": neglected[0]["color"]
                })

    radar_data = []
    for c in cat_consistency:
        activity_score = round((c["count"] / max(logs_count, 1)) * 10, 1)
        radar_data.append({
            "subject": f"{c['icon']} {c['name']}",
            "mood": c["avg_mood"],
            "activity": activity_score,
            "full": 10
        })

    result = {
        "streak": current_user.get("streak", 0),
        "longest_streak": current_user.get("longest_streak", 0),
        "total_logs": logs_count,
        "total_time_spent": sum(c["time_spent"] for c in cat_consistency),
        "heatmap": heatmap,
        "mood_trend": mood_trend,
        "energy_trend": energy_trend,
        "time_spent_trend": time_spent_trend,
        "weekly_summary": weekly_summary,
        "category_consistency": cat_consistency,
        "emotion_trends": [{"label": e["_id"], "count": e["count"]} for e in agg_result["emotions"]],
        "radar_data": radar_data,
        "insights": insights,
        "goals": {
            "total": sum(goal_counts.values()),
            "completed": goal_counts.get("completed", 0),
            "active": goal_counts.get("active", 0),
        },
        "active_manifestations": manifestations_count,
        "todos_pending": todos_count,

    }

    cache_set(cache_key, result, ttl=300)
    return result
