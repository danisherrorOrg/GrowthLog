"""Order and range checks: end dates after start dates, no future dates for past events, positive check-in numbers."""
from datetime import date, timedelta

import pytest

TOMORROW = (date.today() + timedelta(days=2)).isoformat()  # 2 days so it's the future in every timezone
PAST = "2026-01-15"


def test_habit_cannot_end_before_it_starts(client, auth_headers):
    resp = client.post("/insights/habit-graveyard", headers=auth_headers,
                       json={"habit": "Running", "started_at": "2026-05-01", "abandoned_at": "2026-04-01"})
    assert resp.status_code == 422
    assert resp.json()["detail"] == "The abandoned date can't be before the start date."

    ok = client.post("/insights/habit-graveyard", headers=auth_headers,
                     json={"habit": "Running", "started_at": "2026-04-01", "abandoned_at": "2026-04-01"})
    assert ok.status_code == 200

    bad_edit = client.put(f"/insights/habit-graveyard/{ok.json()['id']}", headers=auth_headers,
                          json={"habit": "Running", "started_at": "2026-04-02", "abandoned_at": "2026-04-01"})
    assert bad_edit.status_code == 422


def test_course_and_review_order(client, auth_headers):
    resp = client.post("/growth-hub/courses", headers=auth_headers,
                       json={"title": "SQL", "started_at": "2026-05-01", "completed_at": "2026-04-01"})
    assert resp.status_code == 422
    resp = client.post("/reviews", headers=auth_headers, json={
        "period_type": "weekly", "period_label": "Week", "start_date": "2026-05-07", "end_date": "2026-05-01"})
    assert resp.status_code == 422


@pytest.mark.parametrize("path,body", [
    ("/insights/procrastination", {"what": "Taxes", "date": TOMORROW}),
    ("/insights/habit-graveyard", {"habit": "Running", "started_at": TOMORROW}),
    ("/insights/habit-graveyard", {"habit": "Running", "abandoned_at": TOMORROW}),
    ("/insights/triggers", {"trigger": "Phone", "behavior": "Scrolled", "date": TOMORROW}),
    ("/insights/bad-decisions", {"decision": "Bought it", "date": TOMORROW}),
    ("/time-capsule/regrets", {"text": "Skipped it", "date": TOMORROW}),
    ("/time-capsule/life-lessons", {"principle": "Rest", "date_learned": TOMORROW}),
    ("/growth-hub/failures", {"what_happened": "Missed", "date": TOMORROW}),
    ("/growth-hub/courses", {"title": "SQL", "completed_at": TOMORROW}),
    ("/passions/meaning-log", {"experience": "Hike", "date": TOMORROW}),
    ("/passions/bucket-list", {"title": "Japan", "status": "done", "completed_date": TOMORROW}),
    ("/spirituality/meaning", {"experience": "Hike", "date": TOMORROW}),
    ("/spirituality/bucket-list", {"title": "Japan", "status": "done", "completed_date": TOMORROW}),
])
def test_past_events_cannot_be_in_the_future(client, auth_headers, path, body):
    resp = client.post(path, headers=auth_headers, json=body)
    assert resp.status_code == 422, resp.text
    assert "can't be in the future" in resp.json()["detail"]

    past = {k: (PAST if v == TOMORROW else v) for k, v in body.items()}
    assert client.post(path, headers=auth_headers, json=past).status_code == 200


def test_planned_dates_can_still_be_in_the_future(client, auth_headers):
    assert client.post("/passions/bucket-list", headers=auth_headers,
                       json={"title": "Japan", "target_date": TOMORROW}).status_code == 200
    assert client.post("/growth-hub/courses", headers=auth_headers,
                       json={"title": "SQL", "started_at": TOMORROW}).status_code == 200


def test_future_check_uses_the_users_day(client, auth_headers):
    # Today in the furthest-ahead zone is never "the future" for that user
    client.put("/auth/profile", headers=auth_headers, json={"timezone": "Pacific/Kiritimati"})
    from datetime import datetime
    from zoneinfo import ZoneInfo
    their_today = datetime.now(ZoneInfo("Pacific/Kiritimati")).date().isoformat()
    assert client.post("/insights/procrastination", headers=auth_headers,
                       json={"what": "Taxes", "date": their_today}).status_code == 200


@pytest.mark.parametrize("number", [-3, 0, 100])
def test_check_in_number_must_be_1_to_99(client, auth_headers, number):
    resp = client.post("/checkins", headers=auth_headers, json={"task_name": "Book", "check_in_number": number})
    assert resp.status_code == 422


def test_check_in_number_checked_on_edit(client, auth_headers):
    created = client.post("/checkins", headers=auth_headers, json={"task_name": "Book", "check_in_number": 2})
    assert created.status_code == 200
    item_id = created.json()["id"]
    assert client.put(f"/checkins/{item_id}", headers=auth_headers, json={"check_in_number": -3}).status_code == 422
