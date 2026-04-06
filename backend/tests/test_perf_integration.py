import pytest
import os
import asyncio
import httpx
from datetime import datetime, timedelta
import time

# ==========================================
# END-TO-END INTEGRATION TEST
# ==========================================

def test_full_user_journey_integration(client):
    """Integration Test: A complete E2E lifecycle of a user on the platform."""
    
    # 1. Registration
    email = f"e2e_{os.urandom(4).hex()}@example.com"
    reg_resp = client.post("/auth/register", json={"name": "E2E User", "email": email, "password": "SecurePassword123!"})
    assert reg_resp.status_code == 200
    
    # 2. Login
    login_resp = client.post("/auth/login", json={"email": email, "password": "SecurePassword123!"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Custom Category
    cat_name = f"Career_{os.urandom(2).hex()}"
    cat_resp = client.post("/categories", headers=h, json={"name": cat_name, "icon": "💼", "color": "#0000ff"})
    assert cat_resp.status_code == 200
    cat_id = cat_resp.json()["id"]
    
    # 4. Create a Goal inside Category
    goal_resp = client.post("/goals", headers=h, json={
        "category_id": cat_id, "title": "Get Promoted", "deadline": "2030-01-01"
    })
    assert goal_resp.status_code == 200
    goal_id = goal_resp.json()["id"]
    
    # 5. Add MicroGoal & Toggle It
    mg_resp = client.post(f"/goals/{goal_id}/micro-goals", headers=h, json={"text": "Review Resume"})
    mg_id = mg_resp.json()["id"]
    client.put(f"/goals/{goal_id}/micro-goals/{mg_id}/toggle", headers=h)
    
    # 6. Log a Streak (3 Days)
    for i in range(3):
        date_str = (datetime.now() - timedelta(days=2-i)).strftime("%Y-%m-%d")
        client.post("/logs", headers=h, json={
            "date": date_str,
            "entries": [{"category_id": cat_id, "text": f"Day {i} work", "mood": 8, "energy": 7}],
            "highlight": "Great day"
        })
    
    # Verify streak is 3
    me_resp = client.get("/auth/me", headers=h).json()
    assert me_resp["streak"] == 3
    
    # 7. Take a Baseline Snapshot
    client.post("/snapshots", headers=h, json={"description": "Baseline", "mood": 5, "values": ["Anxious"]})
    
    # 8. Complete a Manifestation
    man_resp = client.post("/manifestations", headers=h, json={
        "vision": "I am a Lead Dev", "target_days": 30, "categories": ["Career"]
    })
    man_id = man_resp.json()["id"]
    client.put(f"/manifestations/{man_id}/complete", headers=h, json={"text": "I got it!"})
    
    # 9. Verify Dashboard Performance/Integrity
    dash_resp = client.get("/dashboard?days=7", headers=h)
    assert dash_resp.status_code == 200
    assert "heatmap" in dash_resp.json()
    
    # 10. Self-Decline / Delete Account
    delete_resp = client.delete("/auth/me", headers=h)
    assert delete_resp.status_code == 200
    
    # Ensure token is now invalid
    assert client.get("/auth/me", headers=h).status_code == 401


# ==========================================
# PERFORMANCE & LOAD TESTS
# ==========================================

@pytest.mark.asyncio
async def test_dashboard_load_performance(async_client, auth_headers):
    """Performance Test: Simulating moderate concurrent load on the heaviest endpoint (/dashboard)."""
    
    # We will dispatch 20 simultaneous requests to the dashboard.
    # In a fully-loaded DB, the dashboard performs heavy aggregation. 
    # Our goal is to ensure it can handle this burst without throwing 500s.
    
    start_time = time.time()
    
    tasks = [
        async_client.get("/dashboard?days=30", headers=auth_headers)
        for _ in range(20)
    ]
    
    responses = await asyncio.gather(*tasks)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Assert all succeeded
    for resp in responses:
        assert resp.status_code == 200
        
    # Assert reasonable performance (20 aggregations should take less than 1.5 seconds locally)
    # This prevents major N+1 query regression.
    assert total_time < 1.5 
