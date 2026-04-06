import pytest
import asyncio
import time
from datetime import datetime

# --- 1. Idempotency Tests ---

def test_idempotent_deletions(client, auth_headers):
    # Create a goal
    cat = client.post("/categories", headers=auth_headers, json={"name": "Temp", "icon": "🗑️", "color": "#000"}).json()
    goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat["id"], "title": "Delete Me", "deadline": "2025-12-31"
    }).json()
    goal_id = goal["id"]

    # First delete -> 200 OK
    resp = client.delete(f"/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 200

    # Second delete -> 404 Not Found (Idempotent success)
    resp = client.delete(f"/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 404

def test_idempotent_profile_updates(client, auth_headers):
    # Update with same data twice
    update_data = {"name": "Identical", "bio": "No Change"}
    resp1 = client.put("/auth/profile", headers=auth_headers, json=update_data)
    assert resp1.status_code == 200
    
    resp2 = client.put("/auth/profile", headers=auth_headers, json=update_data)
    assert resp2.status_code == 200
    
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["name"] == "Identical"

# --- 2. Concurrency & Race Conditions ---

@pytest.mark.asyncio
async def test_concurrent_microgoal_updates(async_client, auth_headers):
    # Setup: Create a goal
    cat_resp = await async_client.post("/categories", headers=auth_headers, json={"name": "Race", "icon": "🏁", "color": "#ff0"})
    cat = cat_resp.json()
    goal_resp = await async_client.post("/goals", headers=auth_headers, json={
        "category_id": cat["id"], "title": "Concurrency Test", "deadline": "2025-12-31"
    })
    goal_id = goal_resp.json()["id"]

    # Action: Send 10 concurrent requests to add micro-goals
    async def add_mg(i):
        return await async_client.post(f"/goals/{goal_id}/micro-goals", headers=auth_headers, json={
            "text": f"Micro {i}", "time_spent": 10
        })

    tasks = [add_mg(i) for i in range(10)]
    responses = await asyncio.gather(*tasks)

    # Verification: Ensure all succeeded and list has 10 items
    for r in responses:
        assert r.status_code == 200
    
    final_goal = await async_client.get(f"/goals/{goal_id}", headers=auth_headers)
    assert len(final_goal.json()["micro_goals"]) == 10

# --- 3. Performance Benchmarking ---

def test_dashboard_performance_threshold(client, auth_headers):
    # Setup some data
    cat = client.post("/categories", headers=auth_headers, json={"name": "Perf", "icon": "⚡", "color": "#000"}).json()
    cat_id = cat["id"]
    
    for i in range(5):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        client.post("/logs", headers=auth_headers, json={
            "date": date, "entries": [{"category_id": cat_id, "mood": 5, "energy": i+1, "text": "log"}]
        })

    # Benchmark the dashboard call
    start_time = time.time()
    resp = client.get("/dashboard?days=365", headers=auth_headers)
    end_time = time.time()
    
    duration_ms = (end_time - start_time) * 1000
    assert resp.status_code == 200
    # Enforce a 500ms threshold for aggregation
    assert duration_ms < 500, f"Dashboard aggregation too slow: {duration_ms}ms"

# --- 4. Advanced Pagination & Schema Integrity ---

def test_schema_integrity_with_minimal_data(client, auth_headers):
    # Verify the JSON contract is stable even with empty states
    resp = client.get("/goals", headers=auth_headers)
    goals = resp.json()
    assert isinstance(goals, list)
    if len(goals) > 0:
        g = goals[0]
        # Core keys must always exist based on Pydantic models
        expected_keys = ["id", "title", "category_id", "deadline", "status", "micro_goals"]
        for key in expected_keys:
            assert key in g

def test_category_log_sorting_integrity(client, auth_headers):
    cat = client.post("/categories", headers=auth_headers, json={"name": "Sorting", "icon": "🔽", "color": "#000"}).json()
    cat_id = cat["id"]
    
    # Create logs out of order using relative dates
    base_date = datetime.now()
    dates = [
        (base_date - timedelta(days=5)).strftime("%Y-%m-%d"),
        (base_date - timedelta(days=1)).strftime("%Y-%m-%d"),
        (base_date - timedelta(days=3)).strftime("%Y-%m-%d")
    ]
    for d in dates:
        client.post("/logs", headers=auth_headers, json={
            "date": d, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": d}]
        })
    
    # Check if history is sorted by date descending
    resp = client.get(f"/categories/{cat_id}/logs?days=100", headers=auth_headers)
    logs = resp.json()
    log_dates = [l["date"] for l in logs]
    assert log_dates == sorted(dates, reverse=True)

# Helper for time delta in tests
from datetime import timedelta
