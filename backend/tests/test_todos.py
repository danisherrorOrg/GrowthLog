import pytest
from core.database import db

def test_todo_lifecycle(client, auth_headers):
    """Verify CRUD operations for todos."""
    # 1. Create
    todo_data = {
        "title": "Complete tests",
        "priority": "high",
        "description": "Ensure all modules are covered."
    }
    resp = client.post("/todos", headers=auth_headers, json=todo_data)
    assert resp.status_code == 200
    todo_id = resp.json()["id"]
    assert resp.json()["title"] == "Complete tests"

    # 2. List & Filter by Priority
    resp = client.get("/todos?priority=high", headers=auth_headers)
    assert resp.status_code == 200
    assert any(t["id"] == todo_id for t in resp.json())
    
    resp = client.get("/todos?priority=low", headers=auth_headers)
    assert not any(t["id"] == todo_id for t in resp.json())

    # 3. Update
    resp = client.put(f"/todos/{todo_id}", headers=auth_headers, json={"priority": "medium"})
    assert resp.status_code == 200
    assert resp.json()["priority"] == "medium"

    # 4. Complete
    resp = client.patch(f"/todos/{todo_id}/complete", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["completed_at"] is not None
    
    # 5. List by Status Done
    resp = client.get("/todos?status=done", headers=auth_headers)
    assert any(t["id"] == todo_id for t in resp.json())

    # 6. Delete
    resp = client.delete(f"/todos/{todo_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify gone
    resp = client.get("/todos", headers=auth_headers)
    assert not any(t["id"] == todo_id for t in resp.json())
