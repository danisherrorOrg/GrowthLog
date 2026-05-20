import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from core.database import db
from utils.cache import utcnow
from utils.streak import recalculate_user_streak, check_and_apply_streak_shields, _get_local_now

def test_streak_shield_milestones(client, auth_headers):
    """Verify that shields are earned at 7-day milestones, and reset milestones when streak drops to 0."""
    # Fetch current user profile
    me = client.get("/auth/me", headers=auth_headers).json()
    uid = me["id"]
    
    # Ensure they start with 0 shields
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak_shields": 0, "shield_milestones": [], "streak": 0, "longest_streak": 0}})
    
    # Get categories to create logs
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    user_doc = db.users.find_one({"_id": ObjectId(uid)})
    now_local = _get_local_now(user_doc)
    
    # Remove any existing logs
    db.daily_logs.delete_many({"user_id": uid})
    
    # 1. Add logs for 7 consecutive days directly (today, D-1, ..., D-6) to bypass API rate limits
    db.daily_logs.insert_many([
        {
            "user_id": uid, "date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "local_date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "utc_date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "entries": [{"category_id": cat_id, "mood": 7, "energy": 7, "text": f"Day {i}"}],
            "highlight": f"Day {i}", "overall_rating": 7, "created_at": utcnow()
        }
        for i in range(7)
    ])
        
    # Recalculate streak
    recalculate_user_streak(uid)
    
    # Verify user earned 1 shield at 7-day milestone
    updated_user = db.users.find_one({"_id": ObjectId(uid)})
    assert updated_user["streak"] == 7
    assert updated_user["streak_shields"] == 1
    assert updated_user["shield_milestones"] == [7]
    
    # Check activity log exists for shield earning (using correct entity_type)
    act = db.activity_logs.find_one({"user_id": uid, "action": "earn", "entity_type": "shield"})
    assert act is not None
    assert "7-day" in act["description"]

    # 2. Deleting logs so streak drops to 0 resets milestones but keeps the shield!
    # Delete directly from DB to bypass API-driven shield activation during deletion
    db.daily_logs.delete_many({"user_id": uid})
        
    recalculate_user_streak(uid)
    
    updated_user = db.users.find_one({"_id": ObjectId(uid)})
    assert updated_user["streak"] == 0
    assert updated_user["streak_shields"] == 1  # Keeps the shield already earned!
    assert updated_user["shield_milestones"] == []  # Resets milestones list!
    
    # 3. If they build a streak again, they can earn another shield at 7 (insert directly)
    db.daily_logs.insert_many([
        {
            "user_id": uid, "date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "local_date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "utc_date": (now_local - timedelta(days=i)).strftime("%Y-%m-%d"),
            "entries": [{"category_id": cat_id, "mood": 7, "energy": 7, "text": f"Day {i} new"}],
            "highlight": f"Day {i} new", "overall_rating": 7, "created_at": utcnow()
        }
        for i in range(7)
    ])
        
    recalculate_user_streak(uid)
    
    updated_user = db.users.find_one({"_id": ObjectId(uid)})
    assert updated_user["streak"] == 7
    assert updated_user["streak_shields"] == 2  # Has 2 shields now!
    assert updated_user["shield_milestones"] == [7]


def test_streak_shield_self_healing(client, auth_headers):
    """Verify that missed days automatically consume active shields to save streaks on API request."""
    me = client.get("/auth/me", headers=auth_headers).json()
    uid = me["id"]
    
    # Remove all existing logs
    db.daily_logs.delete_many({"user_id": uid})
    
    # 1. Setup user with 1 shield, and logs ending D-2 (meaning D-1 / yesterday was missed)
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak_shields": 1, "shield_milestones": [], "streak": 0, "last_log_date": None}})
    
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    user_doc = db.users.find_one({"_id": ObjectId(uid)})
    now_local = _get_local_now(user_doc)
    
    # Log for D-2, D-3, D-4
    d2 = (now_local - timedelta(days=2)).strftime("%Y-%m-%d")
    d3 = (now_local - timedelta(days=3)).strftime("%Y-%m-%d")
    d4 = (now_local - timedelta(days=4)).strftime("%Y-%m-%d")
    
    # Insert logs directly into DB to bypass API-driven shield activation during setup
    db.daily_logs.insert_many([
        {
            "user_id": uid, "date": d, "local_date": d, "utc_date": d,
            "entries": [{"category_id": cat_id, "mood": 8, "energy": 8, "text": "log"}],
            "highlight": "log", "overall_rating": 8, "created_at": utcnow()
        }
        for d in [d2, d3, d4]
    ])
    
    recalculate_user_streak(uid)
    
    # Verify initial state before self-healing: D-1 is yesterday and it's missing.
    # The last_log_date is d2.
    user_doc = db.users.find_one({"_id": ObjectId(uid)})
    assert user_doc["streak_shields"] == 1
    assert user_doc["last_log_date"] == d2
    
    # 2. Trigger self-healing via an API call (like getting /auth/me) which calls get_current_user dependency
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    
    # The API response should show updated state immediately!
    user_data = resp.json()
    assert user_data["streak_shields"] == 0  # Consumed!
    
    # The streak should be saved and incremented!
    # Original logs: D-2, D-3, D-4 (3 days). Shield saved D-1, so consecutive days is D-1, D-2, D-3, D-4 = 4 days!
    assert user_data["streak"] == 4
    
    # 3. Verify that the placeholder shielded log was created
    d1 = (now_local - timedelta(days=1)).strftime("%Y-%m-%d")
    shielded_log = db.daily_logs.find_one({"user_id": uid, "date": d1})
    assert shielded_log is not None
    assert shielded_log.get("is_shielded") is True
    assert shielded_log.get("highlight") == "Streak saved by Shield! 🛡️"
    
    # Check activity log for shield activation (using correct entity_type)
    act = db.activity_logs.find_one({"user_id": uid, "action": "use", "entity_type": "shield"})
    assert act is not None
    assert d1 in act["description"]


def test_streak_shields_api_integration(client, auth_headers):
    """Verify that streak_shields count is correctly exposed in auth and dashboard APIs."""
    me = client.get("/auth/me", headers=auth_headers).json()
    uid = me["id"]
    
    # Manually set streak shields to 5
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"streak_shields": 5}})
    
    # 1. Verify /auth/me returns streak_shields
    me_resp = client.get("/auth/me", headers=auth_headers).json()
    assert me_resp["streak_shields"] == 5
    
    # 2. Verify /auth/stats returns streak_shields
    # Invalidate stats cache first
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"updated_at": utcnow()}})
    stats_resp = client.get("/auth/stats", headers=auth_headers).json()
    assert stats_resp["streak_shields"] == 5
    
    # 3. Verify /dashboard returns streak_shields
    dash_resp = client.get("/dashboard", headers=auth_headers).json()
    assert dash_resp["streak_shields"] == 5
    
    # 4. Verify /notifications returns active streak shield warning and status
    notifs = client.get("/notifications", headers=auth_headers).json()
    # Should have a shield status notification since shields > 0
    shield_status_notif = next((n for n in notifs if n["type"] == "streak_shield_status"), None)
    assert shield_status_notif is not None
    assert "protected by 5" in shield_status_notif["message"]
