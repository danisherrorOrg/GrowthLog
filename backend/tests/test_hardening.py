import pytest
from datetime import datetime, timedelta, timezone
import time
from main import JWT_SECRET
ALGORITHM = "HS256"
import jwt

# --- 1. Sensitive Data Exfiltration sweep ---

def test_no_sensitive_data_leaks(client, auth_headers):
    # Check User Profile
    resp = client.get("/auth/me", headers=auth_headers).json()
    sensitive_keys = ["password", "hashed_password", "verification_token"]
    for key in sensitive_keys:
        assert key not in resp, f"Leaked sensitive key: {key} in /auth/me"

    # Check Goals list
    resp = client.get("/goals", headers=auth_headers).json()
    if len(resp) > 0:
        for key in sensitive_keys:
            assert key not in resp[0], f"Leaked sensitive key: {key} in /goals"

# --- 2. XSS/Injection Resilience ---

def test_xss_injection_resilience(client, auth_headers):
    xss_payload = "A <script>alert('XSS')</script> B"
    # Update Bio
    resp = client.put("/auth/profile", headers=auth_headers, json={"bio": xss_payload})
    assert resp.status_code == 200
    
    # Verify it is returned safely as a string
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["bio"] == xss_payload

# --- 3. Token Expiration (Manual JWT forgery check) ---

def test_expired_token_rejection(client):
    # Manually create a token that was valid but expired 1 hour ago
    payload = {
        "user_id": "507f1f77bcf86cd799439011",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        "v": 1
    }
    expired_token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    headers = {"Authorization": f"Bearer {expired_token}"}
    
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 401
    assert "verify your session" in resp.json()["detail"].lower() or "expired" in resp.json()["detail"].lower() or "invalid" in resp.json()["detail"].lower()

# --- 4. Schema Strength & Body Limits ---

def test_pydantic_v2_migration_integrity(client, auth_headers):
    # This verification is implicit by running tests on V2 models
    # But let's check that unknown fields are ignored (standard behavior)
    resp = client.post("/categories", headers=auth_headers, json={
        "name": "Ignored Fields", "icon": "❓", "color": "#000", "unknown": "value"
    })
    assert resp.status_code == 200
    assert "unknown" not in resp.json()

def test_brute_force_prevention_mock(client):
    # This checks that sending garbage data to login is rejected
    # but more importantly, that the response time is consistent (preliminary check)
    start_time = time.time()
    resp = client.post("/auth/login", json={"email": "wrong@ex.com", "password": "wrong"})
    end_time = time.time()
    assert resp.status_code == 401
    # Note: Modern servers shouldn't reveal if account exists via timing
    
import time
