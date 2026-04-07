import pytest
from core.database import db

def test_category_full_lifecycle(client, auth_headers):
    """Verify all operations for categories including updates and templates."""
    # 1. Create Category
    cat_data = {
        "name": "New Research",
        "icon": "🔬",
        "color": "#4b0082",
        "description": "Scientific exploration"
    }
    resp = client.post("/categories", headers=auth_headers, json=cat_data)
    assert resp.status_code == 200
    cat_id = resp.json()["id"]

    # 2. List
    resp = client.get("/categories", headers=auth_headers)
    assert resp.status_code == 200
    assert any(c["id"] == cat_id for c in resp.json())

    # 3. Update Category
    update_data = {"name": "Advanced Research", "color": "#ff00ff"}
    resp = client.put(f"/categories/{cat_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 4. Verify Update
    resp = client.get("/categories", headers=auth_headers)
    cat = next(c for c in resp.json() if c["id"] == cat_id)
    assert cat["name"] == "Advanced Research"
    assert cat["color"] == "#ff00ff"

    # 5. Archive (Soft Delete)
    resp = client.delete(f"/categories/{cat_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # 6. Verify Archived
    resp = client.get("/categories", headers=auth_headers)
    assert not any(c["id"] == cat_id for c in resp.json())
    
    resp = client.get("/categories?include_archived=true", headers=auth_headers)
    assert any(c["id"] == cat_id and c.get("archived") is True for c in resp.json())

    # 7. Restore
    resp = client.put(f"/categories/{cat_id}/restore", headers=auth_headers)
    assert resp.status_code == 200
    resp = client.get("/categories", headers=auth_headers)
    assert any(c["id"] == cat_id for c in resp.json())

    # 8. Permanent Delete
    resp = client.delete(f"/categories/{cat_id}?permanent=true", headers=auth_headers)
    assert resp.status_code == 200
    resp = client.get("/categories?include_archived=true", headers=auth_headers)
    assert not any(c["id"] == cat_id for c in resp.json())

def test_category_duplicate_rejection(client, auth_headers):
    """Verify that duplicate category names are rejected."""
    cat_data = {"name": "Unique Cat", "icon": "🐱", "color": "#000"}
    client.post("/categories", headers=auth_headers, json=cat_data)
    
    # Try to create another with same name
    resp = client.post("/categories", headers=auth_headers, json=cat_data)
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]

def test_category_templates(client, auth_headers):
    """Verify category template CRUD."""
    temp_data = {"name": "Template 1", "icon": "📋", "color": "#ccc", "description": "Desc"}
    resp = client.post("/categories/templates", headers=auth_headers, json=temp_data)
    assert resp.status_code == 200
    t_id = resp.json()["id"]

    resp = client.get("/categories/templates", headers=auth_headers)
    assert any(t["id"] == t_id for t in resp.json())

    resp = client.delete(f"/categories/templates/{t_id}", headers=auth_headers)
    assert resp.status_code == 200
    resp = client.get("/categories/templates", headers=auth_headers)
    assert not any(t["id"] == t_id for t in resp.json())
