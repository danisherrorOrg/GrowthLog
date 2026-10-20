"""The browser timezone is stored on sign-up/login, and timestamps go out as UTC with an offset."""
import os
from datetime import datetime, timezone

from core.database import db


def _new_user(client, **extra):
    data = {"name": "TZ User", "email": f"tz_{os.urandom(4).hex()}@example.com", "password": "Password123!", **extra}
    res = client.post("/auth/register", json=data)
    assert res.status_code == 200, res.text
    client.cookies.clear()
    return data, res.json()


def _login(client, data, **extra):
    res = client.post("/auth/login", json={"email": data["email"], "password": data["password"], **extra})
    assert res.status_code == 200, res.text
    client.cookies.clear()
    return res.json()


def test_register_stores_browser_timezone(client):
    data, body = _new_user(client, timezone="Asia/Kolkata")
    assert body["user"]["timezone"] == "Asia/Kolkata"
    assert db.users.find_one({"email": data["email"]})["timezone"] == "Asia/Kolkata"


def test_register_ignores_unknown_timezone(client):
    data, body = _new_user(client, timezone="Mars/Olympus_Mons")
    assert body["user"]["timezone"] == "UTC"


def test_login_fills_in_timezone_for_accounts_left_on_utc(client):
    data, _ = _new_user(client)  # an older client that sent no timezone
    body = _login(client, data, timezone="America/New_York")
    assert body["user"]["timezone"] == "America/New_York"
    assert db.users.find_one({"email": data["email"]})["timezone"] == "America/New_York"

    # Once set, a login from another zone doesn't silently move it (the app offers to instead)
    body = _login(client, data, timezone="Europe/Paris")
    assert body["user"]["timezone"] == "America/New_York"


def test_login_keeps_utc_the_user_chose(client):
    data, _ = _new_user(client, timezone="Asia/Kolkata")
    token = _login(client, data)["token"]
    res = client.put("/auth/profile", json={"timezone": "UTC"}, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    body = _login(client, data, timezone="Asia/Kolkata")
    assert body["user"]["timezone"] == "UTC"


def test_login_with_unknown_timezone_still_signs_in(client):
    data, _ = _new_user(client)
    body = _login(client, data, timezone="Not/A_Zone")
    assert body["user"]["timezone"] == "UTC"


def test_profile_rejects_unknown_timezone(client, auth_headers):
    res = client.put("/auth/profile", json={"timezone": "Not/A_Zone"}, headers=auth_headers)
    assert res.status_code == 422


def test_timestamps_are_sent_with_utc_offset(client, auth_headers):
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["created_at"].endswith("+00:00"), me["created_at"]

    todo = client.post("/todos", json={"title": "Offset check"}, headers=auth_headers).json()
    client.patch(f"/todos/{todo['id']}/complete", headers=auth_headers)
    listed = client.get("/todos", headers=auth_headers).json()
    done = next(t for t in (listed if isinstance(listed, list) else listed["todos"]) if t["id"] == todo["id"])
    assert done["completed_at"].endswith("+00:00"), done["completed_at"]


def test_timeline_goal_dates_use_the_users_day(client, auth_headers, test_user_data):
    user = db.users.find_one({"email": test_user_data["email"]})
    db.users.update_one({"_id": user["_id"]}, {"$set": {"timezone": "Asia/Kolkata"}})
    # 21:00 UTC on Oct 19 is 02:30 on Oct 20 in India
    db.goals.insert_one({
        "user_id": str(user["_id"]), "title": "Late night goal", "description": "",
        "created_at": datetime(2026, 10, 19, 21, 0, tzinfo=timezone.utc),
        "current_deadline": "2026-12-01", "status": "active",
    })
    events = client.get("/timeline", headers=auth_headers).json()["events"]
    created = next(e for e in events if e["type"] == "goal_created")
    assert created["date"] == "2026-10-20"


def test_saving_profile_without_changing_timezone_keeps_login_fill_in(client):
    # The profile form resends the current timezone on every save; that isn't a choice
    data, _ = _new_user(client)
    token = _login(client, data)["token"]
    res = client.put("/auth/profile", json={"name": "Renamed", "timezone": "UTC"}, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    body = _login(client, data, timezone="Asia/Kolkata")
    assert body["user"]["timezone"] == "Asia/Kolkata"
