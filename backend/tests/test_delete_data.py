from datetime import datetime, timezone

from core.database import db


def _seed(client, headers):
    cats = client.get("/categories", headers=headers).json()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    client.post("/logs", headers=headers, json={
        "date": today, "entries": [{"category_id": cats[0]["id"], "mood": 5, "energy": 5, "text": "t"}]
    })
    client.post("/todos", headers=headers, json={"title": "Wipe me", "priority": "high"})
    client.post("/categories", headers=headers, json={"name": "Custom", "icon": "⚡", "color": "#123456"})


def test_delete_data_keeps_account(client, auth_headers, test_user_data):
    _seed(client, auth_headers)
    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["streak"] == 1

    resp = client.delete("/auth/me/data", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["deleted"] > 0

    # Same token still works and the profile is intact, but progress is reset
    me = client.get("/auth/me", headers=auth_headers)
    assert me.status_code == 200
    me = me.json()
    assert me["email"] == test_user_data["email"]
    assert me["name"] == test_user_data["name"]
    assert me["streak"] == 0
    assert me["longest_streak"] == 0
    assert me["streak_shields"] == 0

    uid = me["id"]
    assert db.daily_logs.count_documents({"user_id": uid}) == 0
    assert db.todos.count_documents({"user_id": uid}) == 0
    assert client.get("/todos", headers=auth_headers).json() == []

    # Custom categories are gone; only the fresh defaults remain
    names = {c["name"] for c in client.get("/categories", headers=auth_headers).json()}
    assert names == {"Mind", "Body", "Career", "Finance", "Spirit"}

    # Can still log in with the same credentials
    resp = client.post("/auth/login", json={"email": test_user_data["email"], "password": test_user_data["password"]})
    assert resp.status_code == 200


def test_delete_data_only_affects_current_user(client, auth_headers, other_user_headers):
    _seed(client, auth_headers)
    _seed(client, other_user_headers)
    other_uid = client.get("/auth/me", headers=other_user_headers).json()["id"]

    client.delete("/auth/me/data", headers=auth_headers)

    assert db.todos.count_documents({"user_id": other_uid}) == 1
    assert db.daily_logs.count_documents({"user_id": other_uid}) == 1
    assert client.get("/auth/me", headers=other_user_headers).json()["streak"] == 1


def test_delete_data_requires_auth(client):
    assert client.delete("/auth/me/data").status_code in (401, 403)
