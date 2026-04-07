import pytest
from datetime import datetime, timedelta
from core.database import db

def test_goal_full_lifecycle(client, auth_headers):
    """Thoroughly test everything related to goals."""
    # 1. Setup - Get a category
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]

    # 2. Create Goal
    goal_data = {
        "category_id": cat_id,
        "title": "Comprehensive Test Goal",
        "description": "Initial description",
        "deadline": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    }
    resp = client.post("/goals", headers=auth_headers, json=goal_data)
    assert resp.status_code == 200
    goal_id = resp.json()["id"]

    # 3. Update Goal
    update_data = {"title": "Updated Title", "description": "Updated description"}
    resp = client.put(f"/goals/{goal_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 4. Verify Update
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert goal["title"] == "Updated Title"
    assert goal["description"] == "Updated description"

    # 5. Add a Note
    resp = client.post(f"/goals/{goal_id}/notes", headers=auth_headers, json={"text": "Original Note"})
    assert resp.status_code == 200
    
    # 6. Update Note
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    note_id = goal["notes"][0]["id"]
    resp = client.put(f"/goals/{goal_id}/notes/{note_id}", headers=auth_headers, json={"text": "Updated Note"})
    assert resp.status_code == 200
    
    # 7. Delete Note
    resp = client.delete(f"/goals/{goal_id}/notes/{note_id}", headers=auth_headers)
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert len(goal["notes"]) == 0

    # 8. Add a Reflection
    resp = client.post(f"/goals/{goal_id}/reflections", headers=auth_headers, json={"text": "Initial Reflection"})
    assert resp.status_code == 200
    
    # 9. Update Reflection
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    refl_id = goal["reflections"][0]["id"]
    resp = client.put(f"/goals/{goal_id}/reflections/{refl_id}", headers=auth_headers, json={"text": "Updated Reflection"})
    assert resp.status_code == 200
    
    # 10. Delete Reflection
    resp = client.delete(f"/goals/{goal_id}/reflections/{refl_id}", headers=auth_headers)
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert len(goal["reflections"]) == 0

    # 11. Micro-goal Deletion
    resp = client.post(f"/goals/{goal_id}/micro-goals", headers=auth_headers, json={"text": "Short-lived mg", "time_spent": 5})
    mg_id = resp.json()["id"]
    resp = client.delete(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers)
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert len(goal["micro_goals"]) == 0

    # 12. Reflect to Change Status (Complete)
    resp = client.put(f"/goals/{goal_id}/reflect", headers=auth_headers, json={
        "status": "completed", "reflection": "I did it!"
    })
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert goal["status"] == "completed"

    # 13. Delete Goal
    resp = client.delete(f"/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # 14. Verify Gone
    resp = client.get(f"/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 404

def test_goal_extension(client, auth_headers):
    """Test the goal extension logic specifically."""
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    old_deadline = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    new_deadline = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    
    goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Extend Me", "deadline": old_deadline
    }).json()
    goal_id = goal["id"]

    # Extend
    resp = client.put(f"/goals/{goal_id}/reflect", headers=auth_headers, json={
        "status": "extended", "reflection": "Need more time", "new_deadline": new_deadline
    })
    assert resp.status_code == 200
    
    updated_goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert updated_goal["current_deadline"] == new_deadline
    assert len(updated_goal["extension_history"]) == 1
    assert updated_goal["extension_history"][0]["old_deadline"] == old_deadline
