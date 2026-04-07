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

def test_book_wisdom_and_metadata(client, auth_headers):
    """Verify advanced fields like wisdom, bookmarks, and progress."""
    # 1. Create with advanced metadata
    book_data = {
        "title": "Pragmatic Programmer",
        "author": "Andrew Hunt",
        "description": "A journey from journeyman to master",
        "location": "https://pragprog.com/",
        "progress_percentage": 25,
        "wisdom": [
            {"chapter": "Chapter 1", "content": "Care about your craft", "thoughts": "Very important"}
        ],
        "bookmarks": [
            {"page": "42", "note": "Don't panic"}
        ]
    }
    resp = client.post("/books", headers=auth_headers, json=book_data)
    assert resp.status_code == 200
    book = resp.json()
    assert book["progress_percentage"] == 25
    assert len(book["wisdom"]) == 1
    assert book["wisdom"][0]["chapter"] == "Chapter 1"
    assert book["location"] == "https://pragprog.com/"

    book_id = book["id"]

    # 2. Update wisdom and bookmarks
    update_data = {
        "progress_percentage": 50,
        "wisdom": [
            {"chapter": "Chapter 1", "content": "Care about your craft", "thoughts": "Still true"},
            {"chapter": "Chapter 2", "content": "Pragmatic Starter", "thoughts": "Actionable"}
        ],
        "bookmarks": [] # Clearing bookmarks
    }
    resp = client.put(f"/books/{book_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["progress_percentage"] == 50
    assert len(updated["wisdom"]) == 2
    assert len(updated["bookmarks"]) == 0
    assert updated["wisdom"][1]["chapter"] == "Chapter 2"

def test_book_unauthorized_access(client, auth_headers, other_user_headers):
    """Verify that users cannot access or modify each other's books."""
    # 1. User A creates a book
    resp = client.post("/books", headers=auth_headers, json={"title": "Secret Book", "author": "User A"})
    book_id = resp.json()["id"]

    # 2. User B tries to fetch it
    resp = client.get("/books", headers=other_user_headers)
    assert not any(b["id"] == book_id for b in resp.json())

    # 3. User B tries to update it
    resp = client.put(f"/books/{book_id}", headers=other_user_headers, json={"title": "Hacked"})
    assert resp.status_code == 404 # Should be 404 to avoid leaking existence

    # 4. User B tries to delete it
    resp = client.delete(f"/books/{book_id}", headers=other_user_headers)
    assert resp.status_code == 404

def test_book_validation_errors(client, auth_headers):
    """Verify that invalid data is rejected with 422."""
    # Missing title
    resp = client.post("/books", headers=auth_headers, json={"author": "No Title"})
    assert resp.status_code == 422

    # Invalid wisdom structure
    resp = client.post("/books", headers=auth_headers, json={
        "title": "Invalid", "author": "Tester", 
        "wisdom": [{"not_chapter": "Wrong"}]
    })
    assert resp.status_code == 422

def test_book_partial_update_integrity(client, auth_headers):
    """Verify that updating one field doesn't wipe others."""
    # 1. Create with specific data
    init_data = {
        "title": "Init", "author": "Author", 
        "wisdom": [{"chapter": "C1", "content": "L1"}]
    }
    resp = client.post("/books", headers=auth_headers, json=init_data)
    book_id = resp.json()["id"]

    # 2. Update ONLY status
    resp = client.put(f"/books/{book_id}", headers=auth_headers, json={"status": "finished"})
    assert resp.status_code == 200
    
    # 3. Verify wisdom is still there
    assert resp.json()["status"] == "finished"
    assert len(resp.json()["wisdom"]) == 1
    assert resp.json()["wisdom"][0]["chapter"] == "C1"
