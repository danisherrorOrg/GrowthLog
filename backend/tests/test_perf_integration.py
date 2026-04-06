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
    """Integration Test: A complete E2E lifecycle of a user on the platform hitting all CRUD operations."""
    
    # 1. Registration
    email = f"e2e_{os.urandom(4).hex()}@example.com"
    reg_resp = client.post("/auth/register", json={"name": "E2E User", "email": email, "password": "SecurePassword123!"})
    assert reg_resp.status_code == 200
    
    # 2. Login
    login_resp = client.post("/auth/login", json={"email": email, "password": "SecurePassword123!"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    
    # 3. Edit Profile (Update Profile)
    profile_resp = client.put("/auth/profile", headers=h, json={"bio": "On a growth journey", "avatar_emoji": "🌟"})
    assert profile_resp.status_code == 200
    
    # 3b. Edit Auth Setup (Update Email & Password)
    client.put("/auth/email", headers=h, json={"new_email": f"new_{email}", "password": "SecurePassword123!"})
    client.put("/auth/password", headers=h, json={"current_password": "SecurePassword123!", "new_password": "RealSecret456!"})
    # Remember to use the new password if needing another login, but our token is still valid for this session
    # Actually, token versioning might invalidate it on password change! Let's get a new token.
    login_resp2 = client.post("/auth/login", json={"email": f"new_{email}", "password": "RealSecret456!"})
    h = {"Authorization": f"Bearer {login_resp2.json()['token']}"}

    # 4. Create Custom Category
    cat_name = f"Career_{os.urandom(2).hex()}"
    cat_resp = client.post("/categories", headers=h, json={"name": cat_name, "icon": "💼", "color": "#0000ff"})
    cat_id = cat_resp.json()["id"]
    
    # 4b. Edit Category
    client.put(f"/categories/{cat_id}", headers=h, json={"name": cat_name + " Updated"})

    # 5. Create a Goal inside Category
    goal_resp = client.post("/goals", headers=h, json={
        "category_id": cat_id, "title": "Get Promoted", "deadline": "2030-01-01"
    })
    goal_id = goal_resp.json()["id"]
    
    # 6. Edit the Goal (Update Goal) & Read Goal
    client.put(f"/goals/{goal_id}", headers=h, json={"title": "Get Promoted to Lead"})
    single_goal = client.get(f"/goals/{goal_id}", headers=h).json()
    assert single_goal["title"] == "Get Promoted to Lead"

    # 7. Add MicroGoal, Edit it, & Toggle It (Tasks)
    mg_resp = client.post(f"/goals/{goal_id}/micro-goals", headers=h, json={"text": "Review Resume"})
    mg_id = mg_resp.json()["id"]
    client.put(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=h, json={"text": "Review Resume & Portolio", "time_spent": 30})
    client.put(f"/goals/{goal_id}/micro-goals/{mg_id}/toggle", headers=h)
    
    # 7b. Add Note & Reflection to Goal
    client.post(f"/goals/{goal_id}/notes", headers=h, json={"text": "A quick note"})
    client.post(f"/goals/{goal_id}/reflections", headers=h, json={"text": "A quick reflection"})
    
    # 8. Log a Streak (3 Days)
    today_str = datetime.now().strftime("%Y-%m-%d")
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
    
    # 9. Take a Baseline Snapshot, Complete an outcome
    snap_id = client.post("/snapshots", headers=h, json={"description": "Baseline", "mood": 5, "values": ["Anxious"]}).json()["id"]
    man_resp = client.post("/manifestations", headers=h, json={"vision": "I am a Lead Dev", "target_days": 30, "categories": ["Career"]})
    man_id = man_resp.json()["id"]
    client.put(f"/manifestations/{man_id}/complete", headers=h, json={"text": "I got it!"})
    
    # 10. Dashboard Validation (Read Aggregations)
    dash_resp = client.get("/dashboard?days=7", headers=h)
    assert dash_resp.status_code == 200
    
    # 11. Teardown Data Journey -> DELETE EVERYTHING created
    # Delete Latest Log
    client.delete(f"/logs/{today_str}", headers=h)
    # Delete / Archive / Restore Category
    client.delete(f"/categories/{cat_id}", headers=h) # Soft delete
    client.put(f"/categories/{cat_id}/restore", headers=h) # Restore
    client.delete(f"/categories/{cat_id}?permanent=true", headers=h) # Permanent Delete Category
    # Delete Goal & Microgoal
    client.delete(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=h) # Delete Task
    delete_goal_resp = client.delete(f"/goals/{goal_id}", headers=h) # Delete Goal
    # Delete Manifestation (Progress & Main)
    client.post(f"/manifestations/{man_id}/progress", headers=h, json={"text": "Almost done", "type": "action"})
    client.delete(f"/manifestations/{man_id}", headers=h)
    # Delete Snapshot
    client.delete(f"/snapshots/{snap_id}", headers=h)

    # 12. Self-Decline / Delete Account (Final Delete User)
    delete_user_resp = client.delete("/auth/me", headers=h)
    assert delete_user_resp.status_code == 200
    
    # Ensure token is now invalid globally
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
