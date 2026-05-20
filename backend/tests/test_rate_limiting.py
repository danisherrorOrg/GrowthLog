import pytest
from datetime import datetime, timedelta

def test_dashboard_rate_limiting(client, auth_headers):
    """Verify GET /dashboard is restricted to 30 requests per minute."""
    # We query the dashboard 30 times successfully
    for i in range(30):
        resp = client.get("/dashboard", headers=auth_headers)
        assert resp.status_code == 200, f"Request {i+1} failed: {resp.status_code}"
        
    # The 31st request should be rate-limited
    resp = client.get("/dashboard", headers=auth_headers)
    assert resp.status_code == 429
    assert "Rate limit exceeded" in resp.json().get("error", "")

def test_timeline_rate_limiting(client, auth_headers):
    """Verify GET /timeline is restricted to 30 requests per minute."""
    # We query the timeline 30 times successfully
    for i in range(30):
        resp = client.get("/timeline", headers=auth_headers)
        assert resp.status_code == 200, f"Request {i+1} failed: {resp.status_code}"
        
    # The 31st request should be rate-limited
    resp = client.get("/timeline", headers=auth_headers)
    assert resp.status_code == 429
    assert "Rate limit exceeded" in resp.json().get("error", "")

def test_logs_write_rate_limiting(client, auth_headers):
    """Verify POST /logs is restricted to 10 requests per minute."""
    # Get active categories to build a valid daily log payload
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    payload = {
        "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
        "entries": [{
            "category_id": cat_id,
            "text": "Rate limit test entry",
            "mood": 8,
            "energy": 7
        }]
    }
    
    # We send 10 write requests successfully (creating or updating logs)
    for i in range(10):
        resp = client.post("/logs", headers=auth_headers, json=payload)
        assert resp.status_code == 200, f"Request {i+1} failed: {resp.status_code}"
        
    # The 11th request should be rate-limited
    resp = client.post("/logs", headers=auth_headers, json=payload)
    assert resp.status_code == 429
    assert "Rate limit exceeded" in resp.json().get("error", "")
