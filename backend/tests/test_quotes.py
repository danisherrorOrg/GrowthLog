import pytest
from core.database import db

def test_quote_lifecycle(client, auth_headers):
    """Verify CRUD operations for quotes."""
    # 1. Create
    quote_data = {
        "content": "The only way to do great work is to love what you do.",
        "author": "Steve Jobs",
        "tags": ["inspiration", "work"]
    }
    resp = client.post("/quotes", headers=auth_headers, json=quote_data)
    assert resp.status_code == 200
    quote_id = resp.json()["id"]
    assert resp.json()["content"] == quote_data["content"]

    # 2. List & Filter by Tag
    resp = client.get("/quotes?tag=inspiration", headers=auth_headers)
    assert resp.status_code == 200
    assert any(q["id"] == quote_id for q in resp.json())
    
    resp = client.get("/quotes?tag=nonexistent", headers=auth_headers)
    assert not any(q["id"] == quote_id for q in resp.json())

    # 3. Random Quote
    resp = client.get("/quotes/random", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is not None
    assert "content" in resp.json()

    # 4. Update Quote
    update_data = {"content": "Updated content"}
    resp = client.put(f"/quotes/{quote_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["content"] == "Updated content"

    # 5. Favorite Toggle
    resp = client.patch(f"/quotes/{quote_id}/favorite?is_favorite=true", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_favorite"] is True
    
    # 6. Filter by Favorite
    resp = client.get("/quotes?favorite=true", headers=auth_headers)
    assert any(q["id"] == quote_id for q in resp.json())
    
    # 7. Delete
    resp = client.delete(f"/quotes/{quote_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify gone
    resp = client.get("/quotes", headers=auth_headers)
    assert not any(q["id"] == quote_id for q in resp.json())
