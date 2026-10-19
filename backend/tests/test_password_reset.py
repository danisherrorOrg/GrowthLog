import re
from datetime import timedelta
from unittest.mock import MagicMock

import pytest

from api.routers import auth
from core.database import db
from core.rate_limit import limiter
from utils.cache import utcnow

mock_send_email = MagicMock()


@pytest.fixture(autouse=True)
def reset_limits(monkeypatch):
    limiter.reset()
    mock_send_email.reset_mock()
    monkeypatch.setattr(auth, "send_email", mock_send_email)
    yield


def _request_reset(client, email):
    resp = client.post("/auth/password/forgot", json={"email": email})
    assert resp.status_code == 200
    assert resp.json() == {"success": True}


def _emailed_token():
    to_email, subject, body = mock_send_email.call_args.args
    match = re.search(r"/reset-password/([A-Za-z0-9_-]+)", body)
    assert match, "reset link missing from email"
    return to_email, match.group(1)


def test_reset_flow_changes_password_and_signs_out(client, auth_headers, test_user_data):
    _request_reset(client, test_user_data["email"])
    to_email, token = _emailed_token()
    assert to_email == test_user_data["email"]

    # The raw token is never stored, only its hash
    user = db.users.find_one({"email": test_user_data["email"]})
    assert token not in str(user)

    resp = client.post("/auth/password/reset", json={"token": token, "new_password": "BrandNew123!"})
    assert resp.status_code == 200

    # Old sessions are revoked, old password no longer works, new one does
    assert client.get("/auth/me", headers=auth_headers).status_code == 401
    assert client.post("/auth/login", json={"email": test_user_data["email"], "password": test_user_data["password"]}).status_code == 401
    assert client.post("/auth/login", json={"email": test_user_data["email"], "password": "BrandNew123!"}).status_code == 200


def test_reset_token_is_single_use(client, auth_headers, test_user_data):
    _request_reset(client, test_user_data["email"])
    _, token = _emailed_token()
    assert client.post("/auth/password/reset", json={"token": token, "new_password": "BrandNew123!"}).status_code == 200
    resp = client.post("/auth/password/reset", json={"token": token, "new_password": "Another123!"})
    assert resp.status_code == 400


def test_expired_token_rejected(client, auth_headers, test_user_data):
    _request_reset(client, test_user_data["email"])
    _, token = _emailed_token()
    db.users.update_one({"email": test_user_data["email"]}, {"$set": {"password_reset_expires": utcnow() - timedelta(minutes=1)}})
    resp = client.post("/auth/password/reset", json={"token": token, "new_password": "BrandNew123!"})
    assert resp.status_code == 400


def test_unknown_email_gives_same_response_and_sends_nothing(client):
    _request_reset(client, "nobody_here@example.com")
    mock_send_email.assert_not_called()


def test_resend_cooldown(client, auth_headers, test_user_data):
    mock_send_email.reset_mock()  # ignore the signup verification email
    _request_reset(client, test_user_data["email"])
    _request_reset(client, test_user_data["email"])
    assert mock_send_email.call_count == 1


def test_invalid_token_and_short_password_rejected(client):
    assert client.post("/auth/password/reset", json={"token": "bogus", "new_password": "BrandNew123!"}).status_code == 400
    assert client.post("/auth/password/reset", json={"token": "bogus", "new_password": "short"}).status_code == 422
