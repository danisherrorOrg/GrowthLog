from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from core.database import db
from utils.cache import utcnow
from api.deps import get_current_user
from utils.helpers import serialize
from utils.streak import _get_local_now

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    
    # Calculate user local time
    now_local = _get_local_now(current_user)
    today_str = now_local.strftime("%Y-%m-%d")
    three_days_later_str = (now_local + timedelta(days=3)).strftime("%Y-%m-%d")
    
    notifications = []
    
    # 1. Consistency & Streak Warnings
    # Check if a log has been created today
    today_log = db.daily_logs.find_one({"user_id": uid, "date": today_str})
    if not today_log:
        streak = current_user.get("streak", 0)
        shields = current_user.get("streak_shields", 0)
        if streak > 0:
            shield_suffix = f" (You have {shields} active Streak Shield{'s' if shields > 1 else ''} to protect you! 🛡️)" if shields > 0 else ""
            notifications.append({
                "id": f"streak-warning-{today_str}",
                "type": "streak_warning",
                "title": "Streak Alert! 🔥",
                "message": f"Protect your {streak}-day streak! Write today's daily log to keep your momentum going.{shield_suffix}",
                "urgency": "high" if shields == 0 else "medium",
                "icon": "🔥",
                "link": "/log",
                "created_at": now_local.isoformat()
            })
        else:
            notifications.append({
                "id": f"consistency-{today_str}",
                "type": "consistency",
                "title": "Self-Reflection Nudge 🌱",
                "message": "You haven't logged today yet. Small daily steps lead to massive transformations.",
                "urgency": "medium",
                "icon": "🌱",
                "link": "/log",
                "created_at": now_local.isoformat()
            })
            
    # 2. Overdue To-Dos
    overdue_count = db.todos.count_documents({
        "user_id": uid, 
        "status": "pending", 
        "due_date": {"$lt": today_str}
    })
    if overdue_count > 0:
        notifications.append({
            "id": f"overdue-todos-{overdue_count}-{today_str}",
            "type": "overdue_todos",
            "title": "Overdue Tasks ☑",
            "message": f"You have {overdue_count} overdue task(s) waiting for action. Clear them to free up mental space.",
            "urgency": "medium",
            "icon": "☑",
            "link": "/todos",
            "created_at": now_local.isoformat()
        })
        
    # 3. Upcoming To-Do Deadlines (Next 3 Days)
    upcoming_todos = list(db.todos.find({
        "user_id": uid,
        "status": "pending",
        "due_date": {"$gte": today_str, "$lte": three_days_later_str}
    }).sort("due_date", 1))
    
    for todo in upcoming_todos:
        todo_id = str(todo["_id"])
        due_str = todo.get("due_date", "")
        try:
            diff = (datetime.strptime(due_str, "%Y-%m-%d").date() - now_local.date()).days
            if diff == 0:
                due_in = "today"
            elif diff == 1:
                due_in = "tomorrow"
            else:
                due_in = f"in {diff} days"
        except Exception:
            due_in = f"on {due_str}"
            
        notifications.append({
            "id": f"todo-deadline-{todo_id}",
            "type": "upcoming_todo",
            "title": "To-Do Deadline ⏰",
            "message": f"Task '{todo['title']}' is due {due_in}.",
            "urgency": "medium",
            "icon": "⏰",
            "link": "/todos",
            "created_at": now_local.isoformat()
        })
        
    # 4. Upcoming Goal Deadlines (Next 3 Days)
    upcoming_goals = list(db.goals.find({
        "user_id": uid,
        "status": {"$in": ["active", "extended"]},
        "current_deadline": {"$gte": today_str, "$lte": three_days_later_str}
    }).sort("current_deadline", 1))
    
    for goal in upcoming_goals:
        goal_id = str(goal["_id"])
        due_str = goal.get("current_deadline", "")
        try:
            diff = (datetime.strptime(due_str, "%Y-%m-%d").date() - now_local.date()).days
            if diff == 0:
                due_in = "today"
            elif diff == 1:
                due_in = "tomorrow"
            else:
                due_in = f"in {diff} days"
        except Exception:
            due_in = f"on {due_str}"
            
        notifications.append({
            "id": f"goal-deadline-{goal_id}",
            "type": "upcoming_goal",
            "title": "Goal Deadline 🎯",
            "message": f"Goal '{goal['title']}' is due {due_in}.",
            "urgency": "high",
            "icon": "🎯",
            "link": f"/goals/{goal_id}",
            "created_at": now_local.isoformat()
        })
        
    # 5. Streak Shields Status
    shields = current_user.get("streak_shields", 0)
    if shields > 0:
        notifications.append({
            "id": f"streak-shield-status-{uid}",
            "type": "streak_shield_status",
            "title": "Streak Shield Active 🛡️",
            "message": f"You are currently protected by {shields} Streak Shield{'s' if shields > 1 else ''}. If you miss a day, a shield will automatically save your streak!",
            "urgency": "info",
            "icon": "🛡️",
            "link": "/profile",
            "created_at": now_local.isoformat()
        })
        
    return notifications
