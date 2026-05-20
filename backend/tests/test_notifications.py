import pytest
from core.database import db
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from utils.cache import utcnow

def test_notifications_endpoint(client, auth_headers, test_user_data):
    # Get current user from db
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])
    
    # 1. Clean environment: Check initial notifications
    # Should have a "consistency nudge" since streak is 0 and no log today
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "consistency"
    assert "Self-Reflection Nudge" in notifications[0]["title"]

    # 2. Update streak to 3 and check if we get a streak warning instead
    db.users.update_one({"_id": user["_id"]}, {"$set": {"streak": 3}})
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "streak_warning"
    assert "Protect your 3-day streak" in notifications[0]["message"]

    # 3. Create a daily log for today to resolve the streak warning
    tz_str = user.get("timezone", "UTC")
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = ZoneInfo("UTC")
    today_str = utcnow().astimezone(tz).strftime("%Y-%m-%d")
    
    db.daily_logs.insert_one({
        "user_id": uid,
        "date": today_str,
        "mood": 8,
        "notes": "Great day!"
    })
    
    # Now there should be NO log consistency notifications
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 0

    # 4. Overdue to-dos
    yesterday_str = (utcnow().astimezone(tz) - timedelta(days=1)).strftime("%Y-%m-%d")
    db.todos.insert_one({
        "user_id": uid,
        "title": "Overdue task",
        "status": "pending",
        "due_date": yesterday_str
    })
    
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "overdue_todos"
    assert "1 overdue task" in notifications[0]["message"]

    # Clean up overdue to-do
    db.todos.delete_many({"user_id": uid})

    # 5. Upcoming to-dos (due tomorrow)
    tomorrow_str = (utcnow().astimezone(tz) + timedelta(days=1)).strftime("%Y-%m-%d")
    db.todos.insert_one({
        "user_id": uid,
        "title": "Upcoming task",
        "status": "pending",
        "due_date": tomorrow_str
    })
    
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "upcoming_todo"
    assert "Upcoming task" in notifications[0]["message"]
    assert "tomorrow" in notifications[0]["message"]

    # Clean up to-do
    db.todos.delete_many({"user_id": uid})

    # 6. Upcoming goal deadlines (due tomorrow)
    db.goals.insert_one({
        "user_id": uid,
        "title": "Upcoming goal",
        "status": "active",
        "current_deadline": tomorrow_str
    })
    
    resp = client.get("/notifications", headers=auth_headers)
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "upcoming_goal"
    assert "Upcoming goal" in notifications[0]["message"]
    assert "tomorrow" in notifications[0]["message"]

    # Clean up goal
    db.goals.delete_many({"user_id": uid})
