import pytest
from api.routers.quick_checks import evaluate

TODAY = "2026-10-20"


def make_check(client, headers, **overrides):
    payload = {"text": "Redesign the app logo", "helps_today": 1, "matters_week": 3, "giving_up": 4, "date": TODAY}
    payload.update(overrides)
    return client.post("/quick-checks", headers=headers, json=payload)


@pytest.mark.parametrize("helps,matters,giving,verdict", [
    (5, 1, 5, "go"),        # it's a top task — always go
    (1, 5, 4, "not_now"),   # gives up something important
    (1, 4, 2, "go"),        # matters next week, cheap
    (3, 2, 1, "not_now"),   # won't matter in a week
    (3, 3, 3, "go"),        # middling, score 50
    (1, 3, 3, "not_now"),   # middling, score 30
])
def test_evaluate_verdicts(helps, matters, giving, verdict):
    score, v, reason = evaluate(helps, matters, giving)
    assert v == verdict
    assert 0 <= score <= 100
    assert reason


def test_quick_check_lifecycle(client, auth_headers):
    resp = make_check(client, auth_headers)
    assert resp.status_code == 200
    check = resp.json()
    assert check["verdict"] == "not_now"
    assert check["action"] is None and check["worth_it"] is None
    check_id = check["id"]

    # Listed under its date only
    resp = client.get(f"/quick-checks?date={TODAY}", headers=auth_headers)
    assert [c["id"] for c in resp.json()] == [check_id]
    resp = client.get("/quick-checks?date=2026-10-21", headers=auth_headers)
    assert resp.json() == []

    # Evening review
    resp = client.put(f"/quick-checks/{check_id}", headers=auth_headers, json={"action": "skipped", "worth_it": False})
    assert resp.status_code == 200
    assert resp.json()["action"] == "skipped"
    assert resp.json()["worth_it"] is False
    assert resp.json()["reviewed_at"]

    resp = client.delete(f"/quick-checks/{check_id}", headers=auth_headers)
    assert resp.status_code == 200
    resp = client.get(f"/quick-checks?date={TODAY}", headers=auth_headers)
    assert resp.json() == []


def test_parking_creates_one_todo(client, auth_headers):
    check_id = make_check(client, auth_headers, text="Organise desktop folders").json()["id"]

    first = client.put(f"/quick-checks/{check_id}", headers=auth_headers, json={"action": "parked"}).json()
    assert first["todo_id"]
    second = client.put(f"/quick-checks/{check_id}", headers=auth_headers, json={"action": "parked"}).json()
    assert second["todo_id"] == first["todo_id"]

    todos = client.get("/todos", headers=auth_headers).json()
    parked = [t for t in todos if t["title"] == "Organise desktop folders"]
    assert len(parked) == 1
    assert parked[0]["id"] == first["todo_id"]
    assert parked[0]["status"] == "pending"


@pytest.mark.parametrize("overrides", [
    {"helps_today": 0},
    {"matters_week": 6},
    {"text": "   "},
    {"text": "x" * 301},
    {"date": "20-10-2026"},
])
def test_create_validation(client, auth_headers, overrides):
    assert make_check(client, auth_headers, **overrides).status_code == 422


def test_update_validation(client, auth_headers):
    check_id = make_check(client, auth_headers).json()["id"]
    assert client.put(f"/quick-checks/{check_id}", headers=auth_headers, json={}).status_code == 400
    assert client.put(f"/quick-checks/{check_id}", headers=auth_headers, json={"action": "maybe"}).status_code == 422


def test_list_requires_valid_date(client, auth_headers):
    assert client.get("/quick-checks", headers=auth_headers).status_code == 422
    assert client.get("/quick-checks?date=today", headers=auth_headers).status_code == 422


def test_quick_checks_are_isolated(client, auth_headers, other_user_headers):
    check_id = make_check(client, auth_headers).json()["id"]

    assert client.get(f"/quick-checks?date={TODAY}", headers=other_user_headers).json() == []
    assert client.put(f"/quick-checks/{check_id}", headers=other_user_headers, json={"worth_it": True}).status_code == 404
    assert client.delete(f"/quick-checks/{check_id}", headers=other_user_headers).status_code == 404
    # Parking as another user must not create a To-Do for them
    assert client.put(f"/quick-checks/{check_id}", headers=other_user_headers, json={"action": "parked"}).status_code == 404
    assert client.get("/todos", headers=other_user_headers).json() == []


def test_invalid_id_format(client, auth_headers):
    assert client.delete("/quick-checks/not-an-id", headers=auth_headers).status_code == 400
