import pytest
from core.database import db

def test_reframe_lifecycle(client, auth_headers):
    """Verify CRUD operations for cognitive reframes."""
    # 1. Create
    reframe_data = {
        "trigger": "A difficult coding task.",
        "original_thought": "I always mess up these tasks.",
        "distortion": "all-or-nothing",
        "reframe": "I am learning and growing."
    }
    resp = client.post("/reframes", headers=auth_headers, json=reframe_data)
    assert resp.status_code == 200
    ref_id = resp.json()["id"]
    assert resp.json()["distortion"] == reframe_data["distortion"]

    # 2. List & Filter by Distortion
    resp = client.get(f"/reframes?distortion={reframe_data['distortion']}", headers=auth_headers)
    assert resp.status_code == 200
    assert any(r["id"] == ref_id for r in resp.json())
    
    resp = client.get("/reframes?distortion=mind-reading", headers=auth_headers)
    assert not any(r["id"] == ref_id for r in resp.json())

    # 3. Update
    resp = client.put(f"/reframes/{ref_id}", headers=auth_headers, json={"reframe": "I am growing with each challenge."})
    assert resp.status_code == 200
    assert resp.json()["reframe"] == "I am growing with each challenge."

    # 4. Delete
    resp = client.delete(f"/reframes/{ref_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify gone
    resp = client.get("/reframes", headers=auth_headers)
    assert not any(r["id"] == ref_id for r in resp.json())
