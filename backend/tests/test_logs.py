import pytest
from datetime import datetime, timedelta, timezone
from core.database import db

def test_daily_log_lifecycle(client, auth_headers):
    """Verify all operations for daily logs."""
    # 1. Setup - Get category
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 2. Create Log (also tests update if date exists)
    log_data = {
        "date": today,
        "entries": [{"category_id": cat_id, "mood": 8, "energy": 7, "text": "Today's log", "time_spent": 30}],
        "highlight": "The highlight",
        "overall_rating": 9
    }
    resp = client.post("/logs", headers=auth_headers, json=log_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 3. Get Log by Date
    resp = client.get(f"/logs/{today}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["date"] == today
    assert resp.json()["highlight"] == "The highlight"

    # 4. Get Today's Log
    resp = client.get("/logs/today", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["date"] == today

    # 5. Delete Log
    resp = client.delete(f"/logs/{today}", headers=auth_headers)
    assert resp.status_code == 200
    
    # 6. Verify Deleted
    resp = client.get(f"/logs/{today}", headers=auth_headers)
    assert resp.json() is None

def test_streak_calculation_on_delete(client, auth_headers):
    """Verify that deleting a log correctly updates the user's streak."""
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Log for yesterday
    client.post("/logs", headers=auth_headers, json={
        "date": yesterday, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "y"}]
    })
    # Log for today
    client.post("/logs", headers=auth_headers, json={
        "date": today, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "t"}]
    })
    
    # Verify streak is 2
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 2

    # Delete today's log -> streak should drop to 1 (yesterday still exists)
    client.delete(f"/logs/{today}", headers=auth_headers)
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 1

    # Delete yesterday's log -> streak should drop to 0
    client.delete(f"/logs/{yesterday}", headers=auth_headers)
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 0

def test_get_logs_range(client, auth_headers):
    """Test retrieving logs within a specific range."""
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    # Create logs for last 3 days
    for i in range(3):
        date = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        client.post("/logs", headers=auth_headers, json={
            "date": date, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": f"log {i}"}]
        })
    
    # Request range of 2 days (includes today, yesterday, 2 days ago)
    resp = client.get("/logs?days=2", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3

def test_log_cross_user_isolation(client, auth_headers, other_user_headers):
    """Verify that users cannot access or modify each other's logs."""
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # 1. User A creates a log
    client.post("/logs", headers=auth_headers, json={
        "date": today, "entries": [], "highlight": "Secret"
    })
    
    # 2. User B tries to fetch it by date
    resp = client.get(f"/logs/{today}", headers=other_user_headers)
    assert resp.json() is None
    
    # 3. User B tries to delete it
    resp = client.delete(f"/logs/{today}", headers=other_user_headers)
    assert resp.status_code == 404


def test_blank_gratitude_lines_are_not_saved(client, auth_headers):
    cat_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log = {"date": today, "entries": [{"category_id": cat_id, "mood": 7, "energy": 7, "text": "x"}],
           "gratitude": ["  coffee ", "", "   "]}
    assert client.post("/logs", headers=auth_headers, json=log).status_code == 200
    assert client.get(f"/logs/{today}", headers=auth_headers).json()["gratitude"] == ["coffee"]

    log["gratitude"] = ["", "", ""]
    assert client.post("/logs", headers=auth_headers, json=log).status_code == 200
    assert client.get(f"/logs/{today}", headers=auth_headers).json()["gratitude"] == []


def test_dashboard_has_no_made_up_mood(client, auth_headers):
    """Categories without entries have no mood, and consistency counts days, not entries."""
    dash = client.get("/dashboard?days=30", headers=auth_headers).json()
    assert dash["total_logs"] == 0
    assert all(c["avg_mood"] is None for c in dash["category_consistency"])
    assert all(r["mood"] == 0 for r in dash["radar_data"])

    cats = client.get("/categories", headers=auth_headers).json()
    now = datetime.now(timezone.utc)
    for offset in (1, 2):
        day = (now - timedelta(days=offset)).strftime("%Y-%m-%d")
        client.post("/logs", headers=auth_headers, json={"date": day, "entries": [
            {"category_id": cats[0]["id"], "mood": 8, "energy": 6, "text": "a"},
        ]})

    dash = client.get("/dashboard?days=30", headers=auth_headers).json()
    by_id = {c["id"]: c for c in dash["category_consistency"]}
    assert dash["total_logs"] == 2
    assert by_id[cats[0]["id"]]["count"] == 2
    assert by_id[cats[0]["id"]]["avg_mood"] == 8
    assert by_id[cats[1]["id"]]["count"] == 0
    assert by_id[cats[1]["id"]]["avg_mood"] is None
