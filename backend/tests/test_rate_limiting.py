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


def _fake_request(peer, headers):
    from starlette.requests import Request
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (peer, 12345),
    }
    return Request(scope)


def test_forwarding_headers_ignored_from_untrusted_peer(monkeypatch):
    """A client can't pick its own rate-limit key by faking IP headers."""
    from core import rate_limit
    monkeypatch.setattr(rate_limit, "TRUSTED_PROXIES", [])
    req = _fake_request("203.0.113.5", {
        "CF-Connecting-IP": "1.1.1.1",
        "X-Forwarded-For": "2.2.2.2",
        "X-Real-IP": "3.3.3.3",
    })
    assert rate_limit.get_real_ip(req) == "203.0.113.5"


def test_forwarding_headers_used_from_trusted_proxy(monkeypatch):
    from core import rate_limit
    monkeypatch.setattr(rate_limit, "TRUSTED_PROXIES", rate_limit._parse_trusted_proxies("10.0.0.0/8"))
    # Client-supplied "6.6.6.6" is skipped; the proxy-appended hop is the real client
    req = _fake_request("10.0.0.2", {"X-Forwarded-For": "6.6.6.6, 198.51.100.7, 10.0.0.9"})
    assert rate_limit.get_real_ip(req) == "198.51.100.7"
    req = _fake_request("10.0.0.2", {"X-Real-IP": "198.51.100.8"})
    assert rate_limit.get_real_ip(req) == "198.51.100.8"
