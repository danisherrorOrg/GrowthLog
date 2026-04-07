import pytest
from bson import ObjectId

def test_goal_subitem_isolation(client, auth_headers, other_user_headers):
    """Verify that User A cannot modify or delete User B's goal sub-items."""
    # 1. Setup - User B creates a goal and some sub-items
    cat_resp = client.post("/categories", headers=other_user_headers, json={"name": "B Cat", "icon": "B", "color": "#000000"})
    cat_id = cat_resp.json()["id"]
    
    goal_resp = client.post("/goals", headers=other_user_headers, json={
        "category_id": cat_id, "title": "B Goal", "deadline": "2025-01-01"
    })
    goal_id = goal_resp.json()["id"]
    
    # Add a note
    client.post(f"/goals/{goal_id}/notes", headers=other_user_headers, json={"text": "B Note"})
    # Add a reflection
    client.post(f"/goals/{goal_id}/reflections", headers=other_user_headers, json={"text": "B Reflection"})
    # Add a micro-goal
    mg_resp = client.post(f"/goals/{goal_id}/micro-goals", headers=other_user_headers, json={"text": "B Micro"})
    mg_id = mg_resp.json()["id"]
    
    # Get IDs for sub-items
    goal_b = client.get(f"/goals/{goal_id}", headers=other_user_headers).json()
    note_id = goal_b["notes"][0]["id"]
    refl_id = goal_b["reflections"][0]["id"]
    
    # 2. User A attempts to modify User B's sub-items
    # Update Note
    resp = client.put(f"/goals/{goal_id}/notes/{note_id}", headers=auth_headers, json={"text": "Hacked"})
    assert resp.status_code == 404
    
    # Delete Note
    resp = client.delete(f"/goals/{goal_id}/notes/{note_id}", headers=auth_headers)
    assert resp.status_code == 404
    
    # Update Reflection
    resp = client.put(f"/goals/{goal_id}/reflections/{refl_id}", headers=auth_headers, json={"text": "Hacked"})
    assert resp.status_code == 404
    
    # Delete Reflection
    resp = client.delete(f"/goals/{goal_id}/reflections/{refl_id}", headers=auth_headers)
    assert resp.status_code == 404
    
    # Update Micro-goal
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers, json={"text": "Hacked", "time_spent": 100})
    assert resp.status_code == 404
    
    # Toggle Micro-goal
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}/toggle", headers=auth_headers)
    assert resp.status_code == 404
    
    # Delete Micro-goal
    resp = client.delete(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers)
    assert resp.status_code == 404

def test_manifestation_subitem_isolation(client, auth_headers, other_user_headers):
    """Verify that User A cannot modify or delete User B's manifestation sub-items."""
    # 1. Setup - User B creates a manifestation and some sub-items
    m_resp = client.post("/manifestations", headers=other_user_headers, json={
        "vision": "B Vision", "target_days": 30
    })
    m_id = m_resp.json()["id"]
    
    # Add a progress entry
    client.post(f"/manifestations/{m_id}/progress", headers=other_user_headers, json={"text": "B Progress", "type": "checkpoint"})
    # Add a note
    client.post(f"/manifestations/{m_id}/notes", headers=other_user_headers, json={"text": "B Note"})
    
    # Get IDs
    m_b = client.get(f"/manifestations/{m_id}", headers=other_user_headers).json()
    entry_id = m_b["progress_entries"][0]["id"]
    note_id = m_b["manifestation_notes"][0]["id"]
    
    # 2. User A attempts to modify User B's sub-items
    # Update Progress
    resp = client.put(f"/manifestations/{m_id}/progress/{entry_id}", headers=auth_headers, json={"text": "Hacked"})
    assert resp.status_code == 404
    
    # Delete Progress
    resp = client.delete(f"/manifestations/{m_id}/progress/{entry_id}", headers=auth_headers)
    assert resp.status_code == 404
    
    # Update Note
    resp = client.put(f"/manifestations/{m_id}/notes/{note_id}", headers=auth_headers, json={"text": "Hacked"})
    assert resp.status_code == 404
    
    # Delete Note
    resp = client.delete(f"/manifestations/{m_id}/notes/{note_id}", headers=auth_headers)
    assert resp.status_code == 404
