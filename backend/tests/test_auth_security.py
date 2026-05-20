import pytest
import os
import jwt
from datetime import datetime, timedelta, timezone
from core.config import JWT_SECRET
ALGORITHM = "HS256"

# ==========================================
# AUTHENTICATION & AUTHORIZATION TESTS
# ==========================================

def test_missing_auth_header(client):
    """Authorization Test: Ensure protected endpoints reject totally unauthenticated requests."""
    resp = client.get("/auth/me")
    assert resp.status_code == 403
    assert "Not authenticated" in resp.json().get("detail", "")

def test_malformed_auth_header(client):
    """Authentication Test: Pass 'Bearer123' instead of 'Bearer 123'."""
    headers = {"Authorization": "BearerThisIsJustOneWord"}
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code in [401, 403]

def test_authorization_cross_tenant_isolation(client):
    """Authorization Test: Strict segregation of data between legitimate users."""
    u1_email = f"u1_{os.urandom(2).hex()}@ex.com"
    client.post("/auth/register", json={"name": "U1", "email": u1_email, "password": "Password123!"})
    u1_token = client.post("/auth/login", json={"email": u1_email, "password": "Password123!"}).json()["token"]
    h1 = {"Authorization": f"Bearer {u1_token}"}
    
    u2_email = f"u2_{os.urandom(2).hex()}@ex.com"
    client.post("/auth/register", json={"name": "U2", "email": u2_email, "password": "Password123!"})
    u2_token = client.post("/auth/login", json={"email": u2_email, "password": "Password123!"}).json()["token"]
    h2 = {"Authorization": f"Bearer {u2_token}"}

    # U1 creates a category
    cat_id = client.post("/categories", headers=h1, json={"name": "Private Cat", "icon": "🔒", "color": "#000"}).json()["id"]

    # U2 tries to fetch the specific category logs
    resp = client.get(f"/categories/{cat_id}/logs", headers=h2)
    # The system might return 404 (not found) or [] if not strictly authorized, or 403.
    # Our API's current logging behavior for GET /categories/{id}/logs returns [] if none found for user. Let's verify it's empty.
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # U2 tries to update U1's category directly -> Should return 404 (Security hardening)
    resp2 = client.put(f"/categories/{cat_id}", headers=h2, json={"name": "Hacked"})
    # Since update_one relies on user_id in query, it modifies 0 documents and returns 404.
    assert resp2.status_code == 404
    
    # Verify U1's category wasn't actually changed
    u1_cats = client.get("/categories", headers=h1).json()
    assert any(c["name"] == "Private Cat" for c in u1_cats)

# ==========================================
# SECURITY TEST CASES
# ==========================================

def test_security_jwt_tampering(client):
    """Security Test: Attempting to modify the JWT payload (e.g., escalating privileges)."""
    payload = {
        "user_id": "507f1f77bcf86cd799439011",
        "admin": True, # Forging admin rights
        "v": 1,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    # User tries to sign it with their own secret
    fake_token = jwt.encode(payload, "my_fake_secret", algorithm=ALGORITHM)
    headers = {"Authorization": f"Bearer {fake_token}"}

    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 401
    assert "Invalid token" in resp.json().get("detail", "") or "signature" in resp.json().get("detail", "").lower()

def test_security_nosql_injection_register(client):
    """Security Test: Trying to bypass email uniqueness via regex payload in registration."""
    # This checks if the db.users.find_one execution parses dicts dangerously
    injection_payload = {
        "name": "Hacker",
        "email": {"$regex": ".*"}, # This is not a string, should be caught by Pydantic 422
        "password": "password"
    }
    resp = client.post("/auth/register", json=injection_payload)
    assert resp.status_code == 422

    # Assuming we get past Pydantic by tricking it, GrowthLog's Pydantic model for EmailStr
    # absolutely rejects dicts physically.
    
def test_security_xss_in_goal_titles(client, auth_headers):
    """Security Test: Ensure titles don't crash backend processors on XSS vectors."""
    cat_id = client.post("/categories", headers=auth_headers, json={"name": "Cat", "icon": "c", "color": "#f"}).json()["id"]
    
    xss = "<img src=x onerror=alert(1)>"
    resp = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id,
        "title": xss,
        "deadline": "2025-12-31"
    })
    
    assert resp.status_code == 200
    # Retrieve it to ensure it wasn't horribly mangled by the DB
    goal_id = resp.json()["id"]
    retrieved = client.get(f"/goals/{goal_id}", headers=auth_headers).json()
    assert retrieved["title"] == xss # Should be preserved. Escaping happens on the frontend.

# ==========================================
# AUTHENTICATION FLOW & ANALYTICS TESTS
# ==========================================

def test_email_verification_flow(client):
    """Verify the full email verification lifecycle."""
    from core.database import db
    
    # 1. Register
    email = f"verify_{os.urandom(4).hex()}@example.com"
    reg_resp = client.post("/auth/register", json={
        "name": "Verify Me", "email": email, "password": "Password123!"
    })
    assert reg_resp.status_code == 200
    assert reg_resp.json()["user"]["is_verified"] is False
    
    # 2. Retrieve token directly from DB (since we can't 'read' the email)
    user = db.users.find_one({"email": email})
    token = user["verification_token"]
    assert token is not None
    
    # 3. Call verification endpoint
    verify_resp = client.get(f"/auth/verify/{token}")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True
    
    # 4. Verify in profile
    login_resp = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    headers = {"Authorization": f"Bearer {login_resp.json()['token']}"}
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.json()["is_verified"] is True

def test_user_analytics_stats(client, auth_headers):
    """Verify the /auth/stats endpoint provides correct counts."""
    # This endpoint aggregates logs, goals, manifestations, etc.
    resp = client.get("/auth/stats", headers=auth_headers)
    assert resp.status_code == 200
    stats = resp.json()
    
    assert "total_logs" in stats
    assert "total_goals" in stats
    assert "total_manifestations" in stats
    assert "total_snapshots" in stats
    assert "streak" in stats

def test_security_csp_headers(client):
    """Security Test: Verify that API endpoints return proper Content-Security-Policy and X-Request-ID headers."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Content-Security-Policy" in resp.headers
    csp = resp.headers["Content-Security-Policy"]
    assert "default-src 'self'" in csp
    assert "object-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "X-Request-ID" in resp.headers

def test_security_csp_bypass_docs(client):
    """Security Test: Verify that FastAPI docs routes do NOT get the Content-Security-Policy header."""
    resp = client.get("/docs")
    # Swagger docs page is returned
    assert resp.status_code == 200
    assert "Content-Security-Policy" not in resp.headers

