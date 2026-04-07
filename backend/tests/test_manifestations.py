import pytest
from datetime import datetime, timedelta
from core.database import db

def test_manifestation_full_lifecycle(client, auth_headers):
    """Verify all operations for manifestations."""
    # 1. Create
    m_data = {
        "vision": "Full coverage expert",
        "target_days": 30,
        "categories": ["Mind"],
        "notes": "Starting notes"
    }
    resp = client.post("/manifestations", headers=auth_headers, json=m_data)
    assert resp.status_code == 200
    m_id = resp.json()["id"]

    # 2. List
    resp = client.get("/manifestations", headers=auth_headers)
    assert resp.status_code == 200
    assert any(m["id"] == m_id for m in resp.json())

    # 3. Update
    update_data = {"vision": "Updated vision", "target_days": 60}
    resp = client.put(f"/manifestations/{m_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 4. Verify Update
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    assert m["vision"] == "Updated vision"
    assert m["target_days"] == 60

    # 5. Add Progress Entry
    p_data = {"text": "Big achievement", "type": "achievement"}
    resp = client.post(f"/manifestations/{m_id}/progress", headers=auth_headers, json=p_data)
    assert resp.status_code == 200

    # 6. Update Progress Entry
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    entry_id = m["progress_entries"][0]["id"]
    resp = client.put(f"/manifestations/{m_id}/progress/{entry_id}", headers=auth_headers, json={"text": "Updated achievement"})
    assert resp.status_code == 200
    
    # 7. Delete Progress Entry
    resp = client.delete(f"/manifestations/{m_id}/progress/{entry_id}", headers=auth_headers)
    assert resp.status_code == 200
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    assert len(m["progress_entries"]) == 0

    # 8. Add Note
    resp = client.post(f"/manifestations/{m_id}/notes", headers=auth_headers, json={"text": "A manifestation note"})
    assert resp.status_code == 200
    
    # 9. Update Note
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    note_id = m["manifestation_notes"][0]["id"]
    resp = client.put(f"/manifestations/{m_id}/notes/{note_id}", headers=auth_headers, json={"text": "Updated manifestation note"})
    assert resp.status_code == 200
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    assert m["manifestation_notes"][0]["text"] == "Updated manifestation note"
    
    # 10. Delete Note
    resp = client.delete(f"/manifestations/{m_id}/notes/{note_id}", headers=auth_headers)
    assert resp.status_code == 200
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    assert len(m["manifestation_notes"]) == 0

    # 10. Archive
    resp = client.put(f"/manifestations/{m_id}/archive", headers=auth_headers)
    assert resp.status_code == 200
    m = client.get(f"/manifestations/{m_id}", headers=auth_headers).json()
    assert m["status"] == "archived"

    # 11. Delete
    resp = client.delete(f"/manifestations/{m_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # 12. Verify Gone
    resp = client.get(f"/manifestations/{m_id}", headers=auth_headers)
    assert resp.status_code == 404

def test_manifestation_filters(client, auth_headers):
    """Test status filtering for manifestations."""
    # Create an active one
    client.post("/manifestations", headers=auth_headers, json={"vision": "v1", "target_days": 10})
    # Create another and archive it
    m2 = client.post("/manifestations", headers=auth_headers, json={"vision": "v2", "target_days": 20}).json()
    client.put(f"/manifestations/{m2['id']}/archive", headers=auth_headers)
    
    # Filter active
    resp = client.get("/manifestations?status_filter=active", headers=auth_headers)
    assert all(m["status"] == "active" for m in resp.json())
    
    # Filter archived
    resp = client.get("/manifestations?status_filter=archived", headers=auth_headers)
    assert all(m["status"] == "archived" for m in resp.json())
