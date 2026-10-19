import importlib.util
import logging
from unittest.mock import patch

from core.database import db
import utils.email as email_module
from utils.email import render_email


def _fresh_email_module():
    # conftest replaces utils.email.send_email with a mock; load an unpatched copy
    spec = importlib.util.spec_from_file_location("_email_under_test", email_module.__file__)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_render_email_escapes_user_values():
    body = render_email("Welcome, <script>alert(1)</script>!", ['Hi "<b>Bob</b>"'], "Go", 'https://x.test/?a=1&b="2"')
    assert "<script>" not in body
    assert "&lt;script&gt;" in body
    assert "<b>Bob</b>" not in body
    assert 'href="https://x.test/?a=1&amp;b=&quot;2&quot;"' in body


def test_unconfigured_smtp_does_not_log_body(caplog):
    module = _fresh_email_module()
    with patch.object(module, "SMTP_HOST", None), caplog.at_level(logging.WARNING):
        assert module.send_email("a@example.com", "Verify", "<a href='https://app/verify/SECRET-TOKEN'>x</a>") is False
    assert "SECRET-TOKEN" not in caplog.text
    assert "a@example.com" in caplog.text


def test_resend_verification_sends_an_email(client, auth_headers):
    me = client.get("/auth/me", headers=auth_headers).json()
    # Registration just stamped verification_sent_at; clear it so the 60s cooldown doesn't block us
    db.users.update_one({"email": me["email"]}, {"$unset": {"verification_sent_at": ""}})

    with patch("api.routers.auth.send_email") as send:
        resp = client.post("/auth/verify/send", headers=auth_headers)
    assert resp.status_code == 200
    send.assert_called_once()
    to_email, subject, body = send.call_args.args
    assert to_email == me["email"]
    token = db.users.find_one({"email": me["email"]})["verification_token"]
    assert f"/verify/{token}" in body


def test_registration_link_expires(client, test_user_data):
    client.post("/auth/register", json=test_user_data)
    user = db.users.find_one({"email": test_user_data["email"]})
    assert user["verification_token_expires"] is not None


def test_nudge_uses_branded_template(client, monkeypatch):
    import os
    monkeypatch.setenv("ADMIN_TOKEN", "test-admin")
    email = f"nudge_{os.urandom(4).hex()}@example.com"
    client.post("/auth/register", json={"name": "<i>Nudge</i>", "email": email, "password": "Password123!"})
    db.users.update_one({"email": email}, {"$set": {"is_verified": True, "email_notifications": True}})

    with patch("main.send_email") as send:
        resp = client.post("/admin/nudge-silent-users", headers={"x-admin-token": "test-admin"})
    assert resp.status_code == 200
    bodies = {c.args[0]: c.args[2] for c in send.call_args_list}
    assert email in bodies
    assert "&lt;i&gt;Nudge&lt;/i&gt;" in bodies[email]
    assert "/log" in bodies[email]
