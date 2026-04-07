import pytest
from core.database import db

def test_book_lifecycle(client, auth_headers):
    """Verify CRUD operations for books."""
    # 1. Create
    book_data = {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "description": "A Handbook of Agile Software Craftsmanship",
        "status": "reading",
        "rating": 9
    }
    resp = client.post("/books", headers=auth_headers, json=book_data)
    assert resp.status_code == 200
    book_id = resp.json()["id"]
    assert resp.json()["title"] == "Clean Code"

    # 2. List & Filter
    resp = client.get("/books?status=reading", headers=auth_headers)
    assert resp.status_code == 200
    assert any(b["id"] == book_id for b in resp.json())
    
    resp = client.get("/books?status=completed", headers=auth_headers)
    assert not any(b["id"] == book_id for b in resp.json())

    # 3. Update
    resp = client.put(f"/books/{book_id}", headers=auth_headers, json={"status": "completed", "rating": 10})
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    assert resp.json()["rating"] == 10

    # 4. Delete
    resp = client.delete(f"/books/{book_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify gone
    resp = client.get("/books", headers=auth_headers)
    assert not any(b["id"] == book_id for b in resp.json())

def test_delete_nonexistent_book(client, auth_headers):
    """Verify that deleting a non-existent book returns 404."""
    fake_id = "507f1f77bcf86cd799439011"
    resp = client.delete(f"/books/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404
