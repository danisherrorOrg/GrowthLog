import pytest
from bson import ObjectId
from core.database import db
from utils.activity import log_activity

def test_log_activity_utility(test_user_data):
    """Verify that the log_activity utility correctly inserts records."""
    # Ensure user exists for the test (or just use a dummy UID since it's a utility test)
    uid = "507f1f77bcf86cd799439011"
    
    # 1. Clear existing logs for this uid (if any)
    db.activity_logs.delete_many({"user_id": uid})
    
    # 2. Call utility
    log_activity(
        user_id=uid,
        action="create",
        entity_type="goal",
        entity_id="60b1e1e1e1e1e1e1e1e1e1e1",
        description="Created a test goal"
    )
    
    # 3. Verify in DB
    log = db.activity_logs.find_one({"user_id": uid})
    assert log is not None
    assert log["action"] == "create"
    assert log["entity_type"] == "goal"
    assert log["description"] == "Created a test goal"
    assert "created_at" in log

def test_api_activity_history(client, auth_headers):
    """Verify that actions in all core modules trigger activity logs visible via API."""
    user_resp = client.get("/auth/me", headers=auth_headers)
    uid = user_resp.json()["id"]
    db.activity_logs.delete_many({"user_id": uid})

    # 1. Category
    cat_id = client.post("/categories", headers=auth_headers, json={"name": "Act Cat", "icon": "📝", "color": "#123456"}).json()["id"]
    
    # 2. Book
    book_id = client.post("/books", headers=auth_headers, json={"title": "Act Book", "author": "User", "status": "reading"}).json()["id"]
    
    # 3. Quote
    quote_id = client.post("/quotes", headers=auth_headers, json={"content": "Act Quote", "author": "User"}).json()["id"]
    
    # 4. Reframe
    ref_id = client.post("/reframes", headers=auth_headers, json={"trigger": "bad", "original_thought": "x", "reframe": "y"}).json()["id"]
    
    # 5. Thought
    thought_id = client.post("/thoughts", headers=auth_headers, json={"content": "I am logic."}).json()["id"]
    
    # 6. Todo
    todo_id = client.post("/todos", headers=auth_headers, json={"title": "Act Todo", "priority": "medium"}).json()["id"]

    # Fetch activity logs
    resp = client.get("/activity", headers=auth_headers)
    assert resp.status_code == 200
    logs = resp.json()
    
    # Verify all actions are logged
    entity_ids = [l["entity_id"] for l in logs]
    assert cat_id in entity_ids
    assert book_id in entity_ids
    assert quote_id in entity_ids
    assert ref_id in entity_ids
    assert thought_id in entity_ids
    assert todo_id in entity_ids

    # Verify specific types
    types = [l["entity_type"] for l in logs]
    assert "category" in types
    assert "book" in types
    assert "quote" in types
    assert "reframe" in types
    assert "thought" in types
    assert "todo" in types

def test_activity_unauthorized(client):
    """Verify that unauthorized requests to /activity are rejected."""
    resp = client.get("/activity")
    assert resp.status_code == 403

def test_activity_pagination(client, auth_headers):
    """Verify pagination on activity logs."""
    # Insert 10 dummy logs directly
    user_resp = client.get("/auth/me", headers=auth_headers)
    uid = user_resp.json()["id"]
    
    db.activity_logs.delete_many({"user_id": uid})
    
    for i in range(10):
        log_activity(uid, "test", "dummy", str(i), f"Log {i}")
        
    # Get with limit 5
    resp = client.get("/activity?limit=5", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 5
