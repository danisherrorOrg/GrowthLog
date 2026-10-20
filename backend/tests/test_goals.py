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

    # 11. Micro-goal Lifecycle
    resp = client.post(f"/goals/{goal_id}/micro-goals", headers=auth_headers, json={"text": "Short-lived mg", "time_spent": 5})
    assert resp.status_code == 200
    mg_id = resp.json()["id"]

    # Update Micro-goal
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers, json={"text": "Updated mg", "time_spent": 10})
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert goal["micro_goals"][0]["text"] == "Updated mg"
    assert goal["micro_goals"][0]["time_spent"] == 10

    # Toggle Micro-goal
    resp = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}/toggle", headers=auth_headers)
    assert resp.status_code == 200
    goal = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert goal["micro_goals"][0]["completed"] is True

    # Delete Micro-goal
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


def _day(tz: str, offset: int = 0) -> str:
    from zoneinfo import ZoneInfo
    from datetime import timezone as dt_timezone
    now = datetime.now(dt_timezone.utc).astimezone(ZoneInfo(tz))
    return (now + timedelta(days=offset)).strftime("%Y-%m-%d")


def test_goal_deadline_cannot_be_in_the_past(client, auth_headers):
    cat_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    client.put("/auth/profile", json={"timezone": "UTC"}, headers=auth_headers)

    past = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Old", "deadline": "2020-01-01"})
    assert past.status_code == 422
    assert "past" in past.json()["detail"]

    for bad in ["", "not-a-date", "2026-13-01", "2099-1-1"]:
        res = client.post("/goals", headers=auth_headers, json={
            "category_id": cat_id, "title": "Bad", "deadline": bad})
        assert res.status_code == 422, bad

    today = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Due today", "deadline": _day("UTC")})
    assert today.status_code == 200


def test_goal_deadline_uses_the_users_today(client, auth_headers):
    """Kiritimati (UTC+14) is always a day ahead of Pago Pago (UTC-11)."""
    cat_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    ahead_today = _day("Pacific/Kiritimati")

    client.put("/auth/profile", json={"timezone": "Pacific/Pago_Pago"}, headers=auth_headers)
    behind_today = _day("Pacific/Pago_Pago")
    assert client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Behind", "deadline": behind_today}).status_code == 200

    client.put("/auth/profile", json={"timezone": "Pacific/Kiritimati"}, headers=auth_headers)
    assert behind_today < ahead_today
    assert client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Behind", "deadline": behind_today}).status_code == 422


def test_overdue_goal_can_be_edited_but_not_moved_into_the_past(client, auth_headers, test_user_data):
    cat_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    client.put("/auth/profile", json={"timezone": "UTC"}, headers=auth_headers)
    goal_id = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id, "title": "Overdue", "deadline": _day("UTC", 5)}).json()["id"]
    from bson import ObjectId
    db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"current_deadline": "2021-06-01"}})

    # The edit form sends the existing (past) deadline back with the new title
    res = client.put(f"/goals/{goal_id}", headers=auth_headers, json={
        "title": "Renamed", "deadline": "2021-06-01", "category_id": cat_id})
    assert res.status_code == 200

    res = client.put(f"/goals/{goal_id}", headers=auth_headers, json={"deadline": "2021-07-01"})
    assert res.status_code == 422

    res = client.put(f"/goals/{goal_id}/reflect", headers=auth_headers, json={
        "status": "extended", "reflection": "More time", "new_deadline": "2021-08-01"})
    assert res.status_code == 422
    assert db.goals.find_one({"_id": ObjectId(goal_id)})["extension_history"] == []

    res = client.put(f"/goals/{goal_id}/reflect", headers=auth_headers, json={
        "status": "completed", "reflection": "Done", "new_deadline": ""})
    assert res.status_code == 200
