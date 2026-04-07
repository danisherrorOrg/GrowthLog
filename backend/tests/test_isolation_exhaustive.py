import pytest
from bson import ObjectId

def test_exhaustive_isolation(client, auth_headers, other_user_headers):
    """Exhaustively test cross-user isolation for all major modules."""
    
    # --- 1. SET UP USER A'S DATA ---
    # Category
    cat = client.post("/categories", headers=auth_headers, json={"name": "A", "icon": "A", "color": "#000"}).json()
    cat_id = cat["id"]
    
    # Goal
    goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "A Goal", "deadline": "2025-12-31"
    }).json()
    goal_id = goal["id"]
    
    # Manifestation
    man = client.post("/manifestations", headers=auth_headers, json={
        "vision": "A Vision", "target_days": 10, "categories": []
    }).json()
    man_id = man["id"]
    
    # Book
    book = client.post("/books", headers=auth_headers, json={
        "title": "A Book", "author": "A", "status": "reading"
    }).json()
    book_id = book["id"]
    
    # Recommendation / Quote (User A adds a quote)
    quote = client.post("/quotes", headers=auth_headers, json={
        "content": "A Quote", "author": "A", "tags": []
    }).json()
    quote_id = quote["id"]
    
    # Reframe
    reframe = client.post("/reframes", headers=auth_headers, json={
        "trigger": "A", "original_thought": "A", "reframe": "A"
    }).json()
    reframe_id = reframe["id"]
    
    # Snapshot
    snap = client.post("/snapshots", headers=auth_headers, json={
        "description": "A Snapshot", "values": [], "mood": 8
    }).json()
    snap_id = snap["id"]
    
    # Thought
    thought = client.post("/thoughts", headers=auth_headers, json={
        "content": "A Thought"
    }).json()
    thought_id = thought["id"]
    
    # Todo
    todo = client.post("/todos", headers=auth_headers, json={
        "title": "A Todo", "priority": "high"
    }).json()
    todo_id = todo["id"]
    
    # Daily Log
    log_resp = client.post("/logs", headers=auth_headers, json={
        "date": "2025-01-01",
        "entries": [{"category_id": cat_id, "text": "A", "mood": 5, "energy": 5}],
        "highlight": "A"
    })
    log_date = "2025-01-01"

    # --- 2. VERIFY ISOLATION FOR USER B ---
    # CATEGORIES
    assert client.put(f"/categories/{cat_id}", headers=other_user_headers, json={"name": "X"}).status_code == 404, "Cat PUT fail"
    assert client.delete(f"/categories/{cat_id}", headers=other_user_headers).status_code == 404, "Cat DEL fail"
    
    # GOALS
    assert client.get(f"/goals/{goal_id}", headers=other_user_headers).status_code == 404, "Goal GET fail"
    assert client.put(f"/goals/{goal_id}", headers=other_user_headers, json={"title": "X"}).status_code == 404, "Goal PUT fail"
    assert client.post(f"/goals/{goal_id}/notes", headers=other_user_headers, json={"text": "X"}).status_code == 404, "Goal NOTE fail"
    assert client.post(f"/goals/{goal_id}/reflections", headers=other_user_headers, json={"text": "X"}).status_code == 404, "Goal REF fail"
    assert client.post(f"/goals/{goal_id}/micro-goals", headers=other_user_headers, json={"text": "X"}).status_code == 404, "Goal MG fail"
    assert client.delete(f"/goals/{goal_id}", headers=other_user_headers).status_code == 404, "Goal DEL fail"
    
    # MANIFESTATIONS
    assert client.get(f"/manifestations/{man_id}", headers=other_user_headers).status_code == 404, "Man GET fail"
    assert client.put(f"/manifestations/{man_id}", headers=other_user_headers, json={"vision": "X"}).status_code == 404, "Man PUT fail"
    assert client.post(f"/manifestations/{man_id}/progress", headers=other_user_headers, json={"text": "X"}).status_code == 404, "Man PROG fail"
    assert client.delete(f"/manifestations/{man_id}", headers=other_user_headers).status_code == 404, "Man DEL fail"
    
    # BOOKS
    assert client.put(f"/books/{book_id}", headers=other_user_headers, json={"title": "X"}).status_code == 404, "Book PUT fail"
    assert client.delete(f"/books/{book_id}", headers=other_user_headers).status_code == 404, "Book DEL fail"
    
    # QUOTES
    assert client.put(f"/quotes/{quote_id}", headers=other_user_headers, json={"content": "X"}).status_code == 404, "Quote PUT fail"
    assert client.delete(f"/quotes/{quote_id}", headers=other_user_headers).status_code == 404, "Quote DEL fail"
    assert client.patch(f"/quotes/{quote_id}/favorite", headers=other_user_headers, params={"is_favorite": True}).status_code == 404, "Quote FAV fail"
    
    # REFRAMES
    assert client.put(f"/reframes/{reframe_id}", headers=other_user_headers, json={"trigger": "X"}).status_code == 404, "Reframe PUT fail"
    assert client.delete(f"/reframes/{reframe_id}", headers=other_user_headers).status_code == 404, "Reframe DEL fail"
    
    # SNAPSHOTS
    assert client.get(f"/snapshots/{snap_id}", headers=other_user_headers).status_code == 404, "Snap GET fail"
    assert client.put(f"/snapshots/{snap_id}", headers=other_user_headers, json={"description": "X"}).status_code == 404, "Snap PUT fail"
    assert client.delete(f"/snapshots/{snap_id}", headers=other_user_headers).status_code == 404, "Snap DEL fail"
    
    # THOUGHTS
    assert client.delete(f"/thoughts/{thought_id}", headers=other_user_headers).status_code == 404, "Thought DEL fail"
    
    # TODOS
    assert client.put(f"/todos/{todo_id}", headers=other_user_headers, json={"title": "X"}).status_code == 404, "Todo PUT fail"
    assert client.patch(f"/todos/{todo_id}/complete", headers=other_user_headers).status_code == 404, "Todo COMP fail"
    assert client.delete(f"/todos/{todo_id}", headers=other_user_headers).status_code == 404, "Todo DEL fail"
    
    # DAILY LOGS
    assert client.delete(f"/logs/{log_date}", headers=other_user_headers).status_code == 404, "Log DEL fail"
    
    # --- 3. VERIFY AGGREGATIONS ---
    # Dashboard should NOT include User A's data for User B
    dash_b = client.get("/dashboard", headers=other_user_headers).json()
    assert dash_b["total_logs"] == 0
    assert dash_b["streak"] == 0
    
    # Timeline should be empty for User B
    timeline_b = client.get("/timeline", headers=other_user_headers).json()
    assert len(timeline_b["events"]) == 0
    
    # Activity should be empty for User B
    activity_b = client.get("/activity", headers=other_user_headers).json()
    assert len(activity_b) == 0

    print("Exhaustive Isolation Test Passed!")
