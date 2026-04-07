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
    data = response.json()
    assert data["events"] == []
    assert data["total"] == 0
    assert data["has_more"] is False

def test_get_timeline_aggregation(client, auth_headers, test_user_data):
    """Verify that the timeline aggregates data from multiple sources."""
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
    events = data["events"]

    # Verify counts:
    # 1 Daily Log
    # 2 Goal events (Created, Deadline)
    # 2 Manifestation events (Started, Target)
    # 1 Snapshot
    assert len(events) == 6
    assert data["total"] == 6

    # Verify specific types and data
    types = [event["type"] for event in events]
    assert "daily_log" in types
    assert "goal_created" in types
    assert "goal_deadline" in types
    assert "manifestation_started" in types
    assert "manifestation_target" in types
    assert "snapshot" in types

    # Verify detailed data for daily_log
    log_event = next(e for e in events if e["type"] == "daily_log")
    assert "entries" in log_event["data"]
    assert len(log_event["data"]["entries"]) == 1
    assert log_event["data"]["entries"][0]["text"] == "Something cool happened"

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
    events = data["events"]
    assert len(events) == 1
    assert events[0]["date"] == "2026-02-01"

def test_get_timeline_pagination(client, auth_headers, test_user_data):
    """Verify that pagination (limit/skip) works."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    db.daily_logs.insert_many([
        {"user_id": uid, "date": f"2026-08-{i:02d}", "highlight": f"Log {i}"}
        for i in range(1, 11) # 10 logs
    ])

    # Get first 5
    response = client.get("/timeline?limit=5&skip=0", headers=auth_headers)
    data = response.json()
    assert len(data["events"]) == 5
    assert data["total"] == 10
    assert data["has_more"] is True

    # Get next 5
    response = client.get("/timeline?limit=5&skip=5", headers=auth_headers)
    data = response.json()
    assert len(data["events"]) == 5
    assert data["has_more"] is False

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
    events = data["events"]
    
    dates = [event["date"] for event in events if event["date"]]
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
    events = data["events"]
    
    milestone_events = [e for e in events if e["type"] == "milestone"]
    assert len(milestone_events) == 1
    assert milestone_events[0]["description"] == "Seven Day Streak"
    assert milestone_events[0]["date"] == "2026-04-05"

def test_get_timeline_data_types(client, auth_headers, test_user_data):
    """Verify that the timeline handles both datetime and string timestamps."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    # 1. Goal with string created_at
    db.goals.insert_one({
        "user_id": uid,
        "title": "String Goal",
        "created_at": "2026-05-15T10:00:00",
        "status": "active"
    })

    # 2. Goal with datetime created_at
    db.goals.insert_one({
        "user_id": uid,
        "title": "Datetime Goal",
        "created_at": datetime(2026, 5, 16, 10, 0, 0),
        "status": "active"
    })

    response = client.get("/timeline?start_date=2026-05-15&end_date=2026-05-17", headers=auth_headers)
    data = response.json()
    events = data["events"]
    assert len(events) == 2
    titles = [e["title"] for e in events]
    assert "String Goal" in titles
    assert "Datetime Goal" in titles

def test_get_timeline_missing_optional_fields(client, auth_headers, test_user_data):
    """Verify that the timeline doesn't break when optional fields are missing."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    # Goal without deadline
    db.goals.insert_one({
        "user_id": uid,
        "title": "No Deadline Goal",
        "created_at": datetime(2026, 6, 1),
        "status": "active"
        # current_deadline is missing
    })

    # Manifestation without target_date
    db.manifestations.insert_one({
        "user_id": uid,
        "vision": "Vague Vision",
        "start_date": "2026-06-02",
        "status": "active"
        # target_date is missing
    })

    response = client.get("/timeline?start_date=2026-06-01", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    events = data["events"]
    assert len(events) >= 2

def test_get_timeline_idempotency_and_overlap(client, auth_headers, test_user_data):
    """Verify that multiple events on the same day are all shown."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    # Three logs on the same day (unlikely but should be handled)
    db.daily_logs.insert_many([
        {"user_id": uid, "date": "2026-07-01", "highlight": "Log 1"},
        {"user_id": uid, "date": "2026-07-01", "highlight": "Log 2"},
        {"user_id": uid, "date": "2026-07-01", "highlight": "Log 3"}
    ])

    response = client.get("/timeline?start_date=2026-07-01&end_date=2026-07-01", headers=auth_headers)
    data = response.json()
    events = data["events"]
    assert len(events) == 3

def test_get_timeline_multi_category(client, auth_headers, test_user_data):
    """Verify that multi-category manifestations are correctly filtered and display all tags."""
    user = db.users.find_one({"email": test_user_data["email"]})
    uid = str(user["_id"])

    # Clean up before testing
    db.categories.delete_many({"user_id": uid})
    db.manifestations.delete_many({"user_id": uid})
    db.daily_logs.delete_many({"user_id": uid})

    # 1. Create two categories
    cat1_oid = db.categories.insert_one({"user_id": uid, "name": "Health", "icon": "🍎", "color": "#ff0000"}).inserted_id
    cat2_oid = db.categories.insert_one({"user_id": uid, "name": "Wealth", "icon": "💰", "color": "#00ff00"}).inserted_id
    cat1_id = str(cat1_oid)
    cat2_id = str(cat2_oid)
    
    assert db.categories.count_documents({"user_id": uid}) == 2

    # 2. Add a manifestation with both categories
    db.manifestations.insert_one({
        "user_id": uid,
        "vision": "Healthy & Wealthy life",
        "categories": [cat1_id, cat2_id],
        "start_date": "2026-08-01",
        "status": "active"
    })

    # 3. Add a daily log with two entries
    db.daily_logs.insert_one({
        "user_id": uid,
        "date": "2026-08-02",
        "entries": [
            {"category_id": cat1_id, "text": "Gym session"},
            {"category_id": cat2_id, "text": "Stock market check"}
        ]
    })

    # Test A: Filter by Category 1 (Health)
    response = client.get(f"/timeline?category_ids={cat1_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    events = data["events"]
    
    manif_events = [e for e in events if e["type"] == "manifestation_started"]
    assert len(manif_events) > 0, f"Manifestation not found with cat filter. Response: {data}"
    manif_event = manif_events[0]
    
    assert "categories" in manif_event, f"Categories field missing. Event: {manif_event}"
    returned_cat_ids = [c.get("id") for c in manif_event["categories"]]
    
    # Debugging print (will show up on -s)
    print(f"DEBUG: cat1_id={cat1_id}, cat2_id={cat2_id}, returned={returned_cat_ids}")
    
    assert cat1_id in returned_cat_ids, f"cat1_id missing. Got: {returned_cat_ids}"
    assert cat2_id in returned_cat_ids, f"cat2_id missing. Got: {returned_cat_ids}"
    assert len(manif_event["categories"]) == 2

    # Verify daily log
    log_events = [e for e in events if e["type"] == "daily_log"]
    assert len(log_events) > 0
    log_event = log_events[0]
    log_cat_ids = [c.get("id") for c in log_event["categories"]]
    assert cat1_id in log_cat_ids
    assert cat2_id in log_cat_ids
    assert len(log_event["categories"]) == 2
