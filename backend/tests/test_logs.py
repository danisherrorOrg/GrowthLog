import pytest
from datetime import datetime, timedelta
from core.database import db

def test_daily_log_lifecycle(client, auth_headers):
    """Verify all operations for daily logs."""
    # 1. Setup - Get category
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    today = datetime.now().strftime("%Y-%m-%d")

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
    
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
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
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        client.post("/logs", headers=auth_headers, json={
            "date": date, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": f"log {i}"}]
        })
    
    # Request range of 2 days (includes today, yesterday, 2 days ago)
    resp = client.get("/logs?days=2", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3
