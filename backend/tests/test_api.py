import pytest
from datetime import datetime, timedelta
import os

# --- 1. Auth Tests ---

def test_register_and_login(client):
    user_data = {"name": "New User", "email": f"new_{os.urandom(4).hex()}@example.com", "password": "securepassword123"}
    # Register
    resp = client.post("/auth/register", json=user_data)
    assert resp.status_code == 200
    assert "token" in resp.json()
    
    # Login
    resp = client.post("/auth/login", json={"email": user_data["email"], "password": user_data["password"]})
    assert resp.status_code == 200
    assert "token" in resp.json()

def test_auth_me(client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"].endswith("@example.com")

def test_update_profile(client, auth_headers):
    resp = client.put("/auth/profile", headers=auth_headers, json={"bio": "Testing my bio", "avatar_emoji": "🚀"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True

# --- 2. Category Tests ---

def test_category_lifecycle(client, auth_headers):
    # Create
    cat_data = {"name": "Test Category", "icon": "🧪", "color": "#000000", "description": "Testing"}
    resp = client.post("/categories", headers=auth_headers, json=cat_data)
    assert resp.status_code == 200
    cat_id = resp.json()["id"]

    # List
    resp = client.get("/categories", headers=auth_headers)
    assert any(c["id"] == cat_id for c in resp.json())

    # Archive
    resp = client.delete(f"/categories/{cat_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify not in active list
    resp = client.get("/categories", headers=auth_headers)
    assert not any(c["id"] == cat_id for c in resp.json())

    # Restore
    resp = client.put(f"/categories/{cat_id}/restore", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify in active list again
    resp = client.get("/categories", headers=auth_headers)
    assert any(c["id"] == cat_id for c in resp.json())

# --- 3. Goal Tests ---

def test_goal_with_microgoals(client, auth_headers):
    # 1. Get a category ID first
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]

    # 2. Create Goal
    goal_data = {
        "category_id": cat_id,
        "title": "Master the Tests",
        "description": "Write all the tests",
        "deadline": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    }
    resp = client.post("/goals", headers=auth_headers, json=goal_data)
    assert resp.status_code == 200
    goal_id = resp.json()["id"]

    # 3. Add Micro-goal
    mg_data = {"text": "Write the first test", "time_spent": 10}
    resp = client.post(f"/goals/{goal_id}/micro-goals", headers=auth_headers, json=mg_data)
    assert resp.status_code == 200
    mg_id = resp.json()["id"]

    # 4. Update Micro-goal (Testing the fix!)
    update_mg_data = {"text": "Write the FIRST test updated", "time_spent": 20}
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers, json=update_mg_data)
    assert resp.status_code == 200

    # 5. Toggle Micro-goal
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}/toggle", headers=auth_headers)
    assert resp.status_code == 200

    # 6. Final check
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert goal["micro_goals"][0]["completed"] is True
    assert goal["micro_goals"][0]["text"] == "Write the FIRST test updated"

# --- 4. Daily Log Tests ---

def test_daily_log_and_streak(client, auth_headers):
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    today = datetime.now().strftime("%Y-%m-%d")

    log_data = {
        "date": today,
        "entries": [
            {"category_id": cat_id, "text": "Did some work", "mood": 8, "energy": 7, "time_spent": 60, "emotions": ["motivated"]}
        ],
        "highlight": "The tests passed!",
        "overall_rating": 9
    }
    
    resp = client.post("/logs", headers=auth_headers, json=log_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify streak updated in profile
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.json()["streak"] >= 1

# --- 5. Manifestation Tests ---

def test_manifestation_lifecycle(client, auth_headers):
    # Create
    m_data = {
        "vision": "I am a code testing expert",
        "target_days": 30,
        "categories": ["Mind"],
        "notes": "Starting the journey"
    }
    resp = client.post("/manifestations", headers=auth_headers, json=m_data)
    assert resp.status_code == 200
    m_id = resp.json()["id"]

    # Add Progress
    p_data = {"text": "Wrote my first automated suite", "type": "achievement"}
    resp = client.post(f"/manifestations/{m_id}/progress", headers=auth_headers, json=p_data)
    assert resp.status_code == 200

    # Complete
    c_data = {"text": "I feel much more confident now"}
    resp = client.put(f"/manifestations/{m_id}/complete", headers=auth_headers, json=c_data)
    assert resp.status_code == 200

    # Verify status
    resp = client.get(f"/manifestations/{m_id}", headers=auth_headers)
    assert resp.json()["status"] == "completed"

# --- 6. Analytics Tests ---

def test_dashboard_stats(client, auth_headers):
    resp = client.get("/dashboard?days=30", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "streak" in data
    assert "heatmap" in data
    assert "mood_trend" in data

def test_public_profile(client, auth_headers):
    # Set public
    client.put("/auth/public", headers=auth_headers, json={"is_public": True})
    
    # Get user ID
    user_id = client.get("/auth/me", headers=auth_headers).json()["id"]
    
    # Access public URL (No Auth needed)
    resp = client.get(f"/public/u/{user_id}")
    assert resp.status_code == 200
    assert "name" in resp.json()

# --- 7. Advanced Auth & Security ---

def test_auth_password_change(client, auth_headers, test_user_data):
    # Success
    resp = client.put("/auth/password", headers=auth_headers, json={
        "current_password": test_user_data["password"],
        "new_password": "NewSecretPassword123!"
    })
    assert resp.status_code == 200
    
    # Old login should now fail
    resp = client.post("/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    assert resp.status_code == 401

def test_auth_email_change(client):
    # Use a fresh user to avoid side effects from password change tests
    user_email = f"change_{os.urandom(4).hex()}@example.com"
    passw = "Password123!"
    client.post("/auth/register", json={"name": "Changer", "email": user_email, "password": passw})
    login_resp = client.post("/auth/login", json={"email": user_email, "password": passw})
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    new_email = f"new_{os.urandom(4).hex()}@example.com"
    resp = client.put("/auth/email", headers=headers, json={
        "new_email": new_email,
        "password": passw
    })
    assert resp.status_code == 200
    assert resp.json()["email"] == new_email

def test_auth_me_deletion(client, auth_headers):
    resp = client.delete("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    # Try to access me again
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 401

# --- 8. Category Templates & History ---

def test_category_templates(client, auth_headers):
    template = {"name": "Health", "icon": "🍎", "color": "#ff0000", "description": "Wellness"}
    resp = client.post("/categories/templates", headers=auth_headers, json=template)
    assert resp.status_code == 200
    t_id = resp.json()["id"]

    resp = client.get("/categories/templates", headers=auth_headers)
    assert any(t["id"] == t_id for t in resp.json())

    client.delete(f"/categories/templates/{t_id}", headers=auth_headers)
    resp = client.get("/categories/templates", headers=auth_headers)
    assert not any(t["id"] == t_id for t in resp.json())

# --- 9. Detailed Goal & Manifestation Notes ---

def test_goal_detailed_notes(client, auth_headers):
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Notes Test", "deadline": "2025-12-31"
    }).json()
    goal_id = goal["id"]

    # Add Note
    resp = client.post(f"/goals/{goal_id}/notes", headers=auth_headers, json={"text": "Step 1 complete"})
    assert resp.status_code == 200
    
    # Add Reflection
    resp = client.post(f"/goals/{goal_id}/reflections", headers=auth_headers, json={"text": "Feeling great"})
    assert resp.status_code == 200
    
    # Verify both exist
    updated_goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert len(updated_goal["notes"]) == 1
    assert len(updated_goal["reflections"]) == 1

# --- 10. Snapshots & Comparisons ---

def test_snapshots_full_cycle(client, auth_headers):
    # Create Snap 1
    s1 = client.post("/snapshots", headers=auth_headers, json={
        "description": "Baseline", "values": ["Quiet", "Focused"], "mood": 6
    }).json()
    
    # Create Snap 2
    s2 = client.post("/snapshots", headers=auth_headers, json={
        "description": "After progress", "values": ["Energetic", "Happy"], "mood": 9
    }).json()

    # Compare
    resp = client.get(f"/snapshots/compare?snap1_id={s1['id']}&snap2_id={s2['id']}", headers=auth_headers)
    assert resp.status_code == 200
    comp = resp.json()
    assert comp["snapshot1"]["description"] == "Baseline"
    assert comp["snapshot2"]["description"] == "After progress"

# --- 11. Prompts & Admin ---

def test_prompts_availability(client, auth_headers):
    resp = client.get("/prompts/quote")
    assert resp.status_code == 200
    
    resp = client.get("/prompts/daily", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) > 0

def test_admin_nudge(client):
    # This currently doesn't require auth in main.py, but it uses BackgroundTasks
    resp = client.post("/admin/nudge-silent-users")
    assert resp.status_code == 200
    assert "nudge_count" in resp.json()

# --- 12. Validation Tests ---

def test_invalid_input_rejection(client, auth_headers):
    # 1. Invalid mood (capped 1-10)
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    bad_log = {
        "entries": [{"category_id": cat_id, "text": "Too much fun", "mood": 11, "energy": 5}]
    }
    resp = client.post("/logs", headers=auth_headers, json=bad_log)
    assert resp.status_code == 422 # Pydantic validation error

    # 2. Too short password
    resp = client.post("/auth/register", json={
        "name": "Small Pass", "email": "small@ex.com", "password": "123"
    })
    assert resp.status_code == 422

# --- 13. Exhaustive Mode: Logic & Security ---

def test_streak_complex_scenarios(client, auth_headers):
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    # 1. Log for yesterday
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    client.post("/logs", headers=auth_headers, json={
        "date": yesterday, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "y"}]
    })
    
    # 2. Log for today
    today = datetime.now().strftime("%Y-%m-%d")
    client.post("/logs", headers=auth_headers, json={
        "date": today, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "t"}]
    })
    
    # Check streak is 2
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 2

    # 3. Delete yesterday's log -> streak should drop to 1
    client.delete(f"/logs/{yesterday}", headers=auth_headers)
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 1

def test_token_versioning_security(client, test_user_data):
    # 1. Register & Login to get a token
    client.post("/auth/register", json=test_user_data)
    login_resp = client.post("/auth/login", json={"email": test_user_data["email"], "password": test_user_data["password"]})
    old_token = login_resp.json()["token"]
    old_headers = {"Authorization": f"Bearer {old_token}"}
    
    # 2. Change password (increments version)
    client.put("/auth/password", headers=old_headers, json={
        "current_password": test_user_data["password"],
        "new_password": "CompletelyNewPassword123!"
    })
    
    # 3. Try to use OLD token -> should be 401
    resp = client.get("/auth/me", headers=old_headers)
    assert resp.status_code == 401
    assert "Session expired" in resp.json()["detail"]

def test_cascading_category_deletion(client, auth_headers):
    # 1. Create category and associated goal
    cat = client.post("/categories", headers=auth_headers, json={"name": "Delete Me", "icon": "🗑️", "color": "#ff0000"}).json()
    cat_id = cat["id"]
    goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Cascader", "deadline": "2025-12-31"
    }).json()
    
    # 2. Log an entry for this category
    today = datetime.now().strftime("%Y-%m-%d")
    client.post("/logs", headers=auth_headers, json={
        "date": today, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "log"}]
    })

    # 3. Permanent Delete Category
    client.delete(f"/categories/{cat_id}?permanent=true", headers=auth_headers)
    
    # 4. Verify goal is gone
    goals = client.get("/goals", headers=auth_headers).json()
    assert not any(g["id"] == goal["id"] for g in goals)
    
    # 5. Verify log entry is pulled
    log = client.get(f"/logs/{today}", headers=auth_headers).json()
    assert not any(e["category_id"] == cat_id for e in log["entries"])

def test_email_verification_cooldown(client, auth_headers):
    # Registration (in auth_headers) already sent one email.
    # So the very first call here should already be a 429.
    resp = client.post("/auth/verify/send", headers=auth_headers)
    assert resp.status_code == 429
    assert "Please wait 60 seconds" in resp.json()["detail"]

def test_malformed_id_error_handling(client, auth_headers):
    # Test invalid hex string for ObjectId
    resp = client.get("/goals/invalid-id-format", headers=auth_headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Invalid ID format"
    
    # Test non-existent valid-looking ID
    fake_id = "507f1f77bcf86cd799439011"
    resp = client.get(f"/goals/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404

def test_manifestation_date_options(client, auth_headers):
    # Test target_days calculation
    m = client.post("/manifestations", headers=auth_headers, json={
        "vision": "Check dates", "target_days": 10, "categories": []
    }).json()
    
    expected_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    assert m["target_date"] == expected_date

# --- 14. High Volume & Integrity ---

def test_high_volume_categories(client, auth_headers):
    # Create 30 categories rapidly
    for i in range(30):
        client.post("/categories", headers=auth_headers, json={
            "name": f"Bulk Cat {i}", "icon": "📦", "color": "#123456"
        })
    
    resp = client.get("/categories", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 30

def test_category_log_filtering(client, auth_headers):
    cat = client.post("/categories", headers=auth_headers, json={"name": "History", "icon": "📜", "color": "#000"}).json()
    cat_id = cat["id"]
    
    # Create a log from 10 days ago
    past_date = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
    client.post("/logs", headers=auth_headers, json={
        "date": past_date, "entries": [{"category_id": cat_id, "mood": 5, "energy": 5, "text": "past"}]
    })
    
    # Verify filter retrieves it
    resp = client.get(f"/categories/{cat_id}/logs?days=20", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    
    # Verify filter misses it if days is too small
    resp = client.get(f"/categories/{cat_id}/logs?days=5", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
