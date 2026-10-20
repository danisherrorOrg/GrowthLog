import os

import pytest

from api import deps
from core.config import AUTH_COOKIE_NAME, CSRF_HEADER
from core.rate_limit import limiter


@pytest.fixture(autouse=True)
def http_cookies(monkeypatch):
    # TestClient talks plain http, so Secure cookies would never be sent back
    monkeypatch.setattr(deps, "AUTH_COOKIE_SECURE", False)
    limiter.reset()
    yield


def _register(client):
    data = {"name": "Cookie User", "email": f"cookie_{os.urandom(4).hex()}@example.com", "password": "Password123!"}
    resp = client.post("/auth/register", json=data)
    assert resp.status_code == 200
    return data, resp


def test_login_sets_httponly_cookie_that_authenticates(client):
    data, _ = _register(client)
    client.cookies.clear()
    resp = client.post("/auth/login", json={"email": data["email"], "password": data["password"]})
    set_cookie = resp.headers["set-cookie"]
    assert f"{AUTH_COOKIE_NAME}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == data["email"]


def test_cookie_write_without_csrf_header_rejected(client):
    _register(client)
    payload = {"name": "Csrf Cat", "icon": "🔒", "color": "#000"}
    assert client.post("/categories", json=payload).status_code == 403
    assert client.post("/categories", json=payload, headers={CSRF_HEADER: "XMLHttpRequest"}).status_code == 200


def test_logout_clears_cookie_and_revokes_session(client):
    _register(client)
    old_cookie = client.cookies.get(AUTH_COOKIE_NAME)
    resp = client.post("/auth/logout", headers={CSRF_HEADER: "XMLHttpRequest"})
    assert resp.status_code == 200
    assert client.cookies.get(AUTH_COOKIE_NAME) is None
    # Even a copy of the old cookie no longer works
    client.cookies.set(AUTH_COOKIE_NAME, old_cookie)
    assert client.get("/auth/me").status_code == 401


def test_logout_without_valid_session_still_succeeds(client):
    client.cookies.set(AUTH_COOKIE_NAME, "garbage")
    resp = client.post("/auth/logout", headers={CSRF_HEADER: "XMLHttpRequest"})
    assert resp.status_code == 200
    assert f'{AUTH_COOKIE_NAME}=""' in resp.headers["set-cookie"]
    assert "Max-Age=0" in resp.headers["set-cookie"]


def test_password_change_keeps_current_session(client):
    data, _ = _register(client)
    resp = client.put("/auth/password", json={"current_password": data["password"], "new_password": "Changed123!"},
                      headers={CSRF_HEADER: "XMLHttpRequest"})
    assert resp.status_code == 200
    assert client.get("/auth/me").status_code == 200


def test_bearer_header_still_works_without_csrf_header(client, auth_headers):
    resp = client.post("/categories", json={"name": "Bearer Cat", "icon": "🔑", "color": "#111"}, headers=auth_headers)
    assert resp.status_code == 200


def test_browser_clients_dont_get_token_in_body(client):
    data, resp = _register(client)
    # API clients (no CSRF header) still get the token for Bearer auth
    assert "token" in resp.json()
    creds = {"email": data["email"], "password": data["password"]}
    assert "token" in client.post("/auth/login", json=creds).json()

    # The browser app sends the CSRF header and relies on the httpOnly cookie only
    browser = {CSRF_HEADER: "XMLHttpRequest"}
    client.cookies.clear()
    body = client.post("/auth/login", json=creds, headers=browser).json()
    assert "token" not in body
    assert body["user"]["email"] == data["email"]
    assert client.get("/auth/me").status_code == 200

    other = {"name": "B", "email": f"cookie_{os.urandom(4).hex()}@example.com", "password": "Password123!"}
    body = client.post("/auth/register", json=other, headers=browser).json()
    assert "token" not in body
