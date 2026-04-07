import pytest
from core.database import db

def test_snapshot_full_lifecycle(client, auth_headers):
    """Verify all operations for snapshots."""
    # 1. Create Snapshot 1
    s1_data = {
        "description": "Initial Baseline",
        "values": ["Calm", "Focused"],
        "mood": 7,
        "date": "2024-01-01"
    }
    resp = client.post("/snapshots", headers=auth_headers, json=s1_data)
    assert resp.status_code == 200
    s1_id = resp.json()["id"]

    # 2. List
    resp = client.get("/snapshots", headers=auth_headers)
    assert resp.status_code == 200
    assert any(s["id"] == s1_id for s in resp.json())

    # 3. Create Snapshot 2
    s2_data = {
        "description": "Progress Check",
        "values": ["Energetic", "Driven"],
        "mood": 9,
        "date": "2024-01-15"
    }
    resp = client.post("/snapshots", headers=auth_headers, json=s2_data)
    assert resp.status_code == 200
    s2_id = resp.json()["id"]

    # 4. Compare
    resp = client.get(f"/snapshots/compare?snap1_id={s1_id}&snap2_id={s2_id}", headers=auth_headers)
    assert resp.status_code == 200
    comp = resp.json()
    assert comp["snapshot1"]["description"] == "Initial Baseline"
    assert comp["snapshot2"]["description"] == "Progress Check"

    # 5. Update Snapshot
    update_data = {"description": "Updated Baseline", "mood": 8}
    resp = client.put(f"/snapshots/{s1_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 6. Verify Update
    s = client.get(f"/snapshots/{s1_id}", headers=auth_headers).json()
    assert s["description"] == "Updated Baseline"
    assert s["mood"] == 8

    # 7. Delete Snapshot
    resp = client.delete(f"/snapshots/{s1_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # 8. Verify Gone
    resp = client.get(f"/snapshots/{s1_id}", headers=auth_headers)
    assert resp.status_code == 404

    # Cleanup check for s2
    client.delete(f"/snapshots/{s2_id}", headers=auth_headers)
