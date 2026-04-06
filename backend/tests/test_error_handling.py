import pytest
import os

# ==========================================
# ERROR HANDLING TESTS
# ==========================================

def test_method_not_allowed(client):
    """Error Handling: Verifying that calling the wrong HTTP method safely returns 405 Method Not Allowed."""
    # /auth/register requires POST. Let's send a GET.
    resp = client.get("/auth/register")
    assert resp.status_code == 405
    
    # /auth/me requires GET. Let's send a POST.
    resp2 = client.post("/auth/me")
    assert resp2.status_code == 405


def test_deep_unprocessable_entity_mapping(client, auth_headers):
    """Validation & Schema Test: Navigating deep into Pydantic models to trigger 422 mapping."""
    cats = client.get("/categories", headers=auth_headers).json()
    if not cats:
        # Create one to use
        cat_id = client.post("/categories", headers=auth_headers, json={"name": "Temp", "icon": "x", "color": "#f"}).json()["id"]
    else:
        cat_id = cats[0]["id"]
        
    goal_resp = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id,
        "title": "Deep Validation",
        "deadline": "2025-12-31"
    })
    goal_id = goal_resp.json()["id"]

    # We send a deeply nested wrong type in micro-goals update
    # The endpoint is PUT /goals/{id}/micro-goals/{mg_id}
    # Wait, let's create a microgoal first
    mg_resp = client.post(f"/goals/{goal_id}/micro-goals", headers=auth_headers, json={"text": "Hello"})
    mg_id = mg_resp.json()["id"]

    # Now intentionally pass an array where a dict/string is expected
    bad_put = client.put(f"/goals/{goal_id}/micro-goals/{mg_id}", headers=auth_headers, json={
        "text": [{"deep": "wrong"}] # Should be string
    })
    
    assert bad_put.status_code == 422
    assert "body" in str(bad_put.json()) # Pydantic path usually includes 'body'


def test_invalid_object_id_global_handler(client, auth_headers):
    """Error Handling: Triggering the bson.errors.InvalidId global handler explicitly."""
    # Our DB handler converts InvalidId cleanly to 400 Bad Request
    resp = client.get("/goals/this-is-not-a-valid-hex-24", headers=auth_headers)
    assert resp.status_code == 400
    assert "Invalid ID format" in resp.json().get("detail", "")


def test_unsupported_media_type(client):
    """Error Handling: Forcing a 415 or 422 by sending raw text to a JSON endpoint."""
    resp = client.post(
        "/auth/register",
        content="This is just raw text, not JSON at all.",
        headers={"Content-Type": "text/plain"}
    )
    # FastAPI usually returns 422 Unprocessable Entity when Content-Type doesn't match JSON expectations.
    assert resp.status_code == 422
