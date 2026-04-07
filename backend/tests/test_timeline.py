import pytest
from datetime import datetime
from core.database import db

def test_get_timeline_unauthorized(client):
    """Verify that unauthorized requests are rejected."""
    # FastAPI's HTTPBearer returns 403 Forbidden by default for missing credentials
    response = client.get("/timeline")
    assert response.status_code == 403

def test_get_timeline_empty(client, auth_headers):
    """Verify that a new user starts with an empty timeline."""
    response = client.get("/timeline", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []

def test_get_timeline_aggregation(client, auth_headers, test_user_data):
    """Verify that the timeline aggregates data from multiple sources."""
    # Crucial: Fetch the correct user that was created by auth_headers fixture
    user = db.users.find_one({"email": test_user_data["email"]})
    assert user is not None, f"User with email {test_user_data['email']} not found in DB"
    uid = str(user["_id"])

    # 1. Insert Daily Log
    db.daily_logs.insert_one({
        "user_id": uid,
        "date": "2026-04-01",
        "highlight": "Great day!",
        "overall_rating": 8,
        "entries": [{"id": 1, "text": "Something cool happened"}]
    })

    # 2. Insert Goal
    db.goals.insert_one({
        "user_id": uid,
        "title": "Learn Pytest",
        "description": "Write a test suite",
        "created_at": datetime(2026, 4, 2, 10, 0, 0),
        "current_deadline": "2026-04-15",
        "status": "active"
    })

    # 3. Insert Manifestation
    db.manifestations.insert_one({
        "user_id": uid,
        "vision": "A New Car",
        "start_date": "2026-04-03",
        "target_date": "2026-06-01",
        "status": "active"
    })

    # 4. Insert Snapshot
    db.snapshots.insert_one({
        "user_id": uid,
        "date": "2026-04-04",
        "description": "Weekly reflection",
        "mood": 7
    })

    response = client.get("/timeline", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Verify counts:
    # 1 Daily Log
    # 2 Goal events (Created, Deadline)
    # 2 Manifestation events (Started, Target)
    # 1 Snapshot
    assert len(data) == 6

    # Verify specific types
    types = [event["type"] for event in data]
    assert "daily_log" in types
    assert "goal_created" in types
    assert "goal_deadline" in types
    assert "manifestation_started" in types
    assert "manifestation_target" in types
    assert "snapshot" in types

def test_get_timeline_filtering(client, auth_headers, test_user_data):
    """Verify that start_date and end_date filtering works."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    db.daily_logs.insert_many([
        {"user_id": uid, "date": "2026-01-01", "highlight": "Jan Log"},
        {"user_id": uid, "date": "2026-02-01", "highlight": "Feb Log"},
        {"user_id": uid, "date": "2026-03-01", "highlight": "Mar Log"}
    ])

    # Filter for February only
    response = client.get("/timeline?start_date=2026-02-01&end_date=2026-02-28", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["date"] == "2026-02-01"

def test_get_timeline_sorting(client, auth_headers, test_user_data):
    """Verify that the timeline is sorted by date descending."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    # Insert items out of order
    db.daily_logs.insert_many([
        {"user_id": uid, "date": "2026-05-10", "highlight": "Newer Log"},
        {"user_id": uid, "date": "2026-05-01", "highlight": "Older Log"}
    ])
    
    response = client.get("/timeline", headers=auth_headers)
    data = response.json()
    
    dates = [event["date"] for event in data if event["date"]]
    assert len(dates) >= 2
    assert dates == sorted(dates, reverse=True)

def test_get_timeline_milestones(client, auth_headers, test_user_data):
    """Verify that user milestones appear in the timeline."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = user["_id"]

    # Add a milestone to the user document
    db.users.update_one(
        {"_id": uid},
        {"$set": {"milestones": [
            {
                "type": "Seven Day Streak",
                "earned_at": "2026-04-05"
            }
        ]}}
    )

    response = client.get("/timeline", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    milestone_events = [e for e in data if e["type"] == "milestone"]
    assert len(milestone_events) == 1
    assert milestone_events[0]["description"] == "Seven Day Streak"
    assert milestone_events[0]["date"] == "2026-04-05"
