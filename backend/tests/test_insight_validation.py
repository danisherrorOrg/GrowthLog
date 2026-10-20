"""Server-side checks for Insight Lab hours and date fields (dates are YYYY-MM-DD)."""
import pytest

HOURS_ENDPOINTS = [
    ("/insights/time-entries", "category"),
    ("/insights/screen-time", "app_category"),
]


@pytest.mark.parametrize("endpoint,key", HOURS_ENDPOINTS)
@pytest.mark.parametrize("hours", [500, 24.5, -8, 0])
def test_hours_out_of_range_rejected(client, auth_headers, endpoint, key, hours):
    resp = client.post(endpoint, headers=auth_headers, json={"date": "2026-10-20", key: "Work", "hours": hours})
    assert resp.status_code == 422


@pytest.mark.parametrize("endpoint,key", HOURS_ENDPOINTS)
@pytest.mark.parametrize("bad_date", ["not-a-date", "2026-13-01", "2026-02-30", "20/10/2026", "2026-10-20T10:00:00"])
def test_bad_dates_rejected(client, auth_headers, endpoint, key, bad_date):
    resp = client.post(endpoint, headers=auth_headers, json={"date": bad_date, key: "Work", "hours": 2})
    assert resp.status_code == 422
    assert client.get(endpoint, headers=auth_headers).json() == []


@pytest.mark.parametrize("endpoint,key", HOURS_ENDPOINTS)
def test_day_total_capped_at_24_hours(client, auth_headers, endpoint, key):
    day = "2026-10-20"
    first = client.post(endpoint, headers=auth_headers, json={"date": day, key: "Work", "hours": 20})
    assert first.status_code == 200
    second = client.post(endpoint, headers=auth_headers, json={"date": day, key: "Rest", "hours": 4})
    assert second.status_code == 200

    over = client.post(endpoint, headers=auth_headers, json={"date": day, key: "Extra", "hours": 0.5})
    assert over.status_code == 422
    assert "0h are left" in over.json()["detail"]

    # Another day is counted separately
    assert client.post(endpoint, headers=auth_headers, json={"date": "2026-10-21", key: "Work", "hours": 10}).status_code == 200

    # Editing an entry doesn't count its own old hours
    entry_id = first.json()["id"]
    assert client.put(f"{endpoint}/{entry_id}", headers=auth_headers, json={"date": day, key: "Work", "hours": 19}).status_code == 200
    assert client.put(f"{endpoint}/{entry_id}", headers=auth_headers, json={"date": day, key: "Work", "hours": 21}).status_code == 422


def test_day_total_ignores_other_users(client, auth_headers, other_user_headers):
    day = "2026-10-20"
    assert client.post("/insights/time-entries", headers=other_user_headers, json={"date": day, "category": "Work", "hours": 24}).status_code == 200
    assert client.post("/insights/time-entries", headers=auth_headers, json={"date": day, "category": "Work", "hours": 24}).status_code == 200


def test_quarter_hours_add_up_to_exactly_24(client, auth_headers):
    for _ in range(96):
        resp = client.post("/insights/time-entries", headers=auth_headers, json={"date": "2026-10-20", "category": "Work", "hours": 0.25})
        assert resp.status_code == 200


@pytest.mark.parametrize("path,body", [
    ("/insights/procrastination", {"what": "Taxes", "date": "not-a-date"}),
    ("/insights/habit-graveyard", {"habit": "Running", "started_at": "yesterday"}),
    ("/insights/triggers", {"trigger": "Phone", "behavior": "Scrolled", "date": "2026-99-01"}),
    ("/insights/bad-decisions", {"decision": "Bought it", "date": "soon"}),
])
def test_other_insight_dates_rejected(client, auth_headers, path, body):
    assert client.post(path, headers=auth_headers, json=body).status_code == 422


def test_empty_optional_dates_still_allowed(client, auth_headers):
    resp = client.post("/insights/habit-graveyard", headers=auth_headers,
                       json={"habit": "Running", "started_at": "", "abandoned_at": ""})
    assert resp.status_code == 200
    resp = client.post("/insights/time-entries", headers=auth_headers, json={"category": "Work", "hours": 1})
    assert resp.status_code == 200


def test_todo_due_date_and_health_numbers_checked(client, auth_headers):
    assert client.post("/todos", headers=auth_headers, json={"title": "x", "due_date": "tomorrow"}).status_code == 422
    assert client.post("/todos", headers=auth_headers, json={"title": "x", "due_date": ""}).status_code == 200
    assert client.post("/todos", headers=auth_headers, json={"title": "x", "estimated_minutes": -5}).status_code == 422
    meal = {"date": "2026-10-20", "meal_type": "Lunch", "calories": -100}
    assert client.post("/health/meals", headers=auth_headers, json=meal).status_code == 422
