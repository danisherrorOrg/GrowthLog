from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from core.database import db
from api.routers.notifications import weekly_review_notification

WEEK = {"period_type": "weekly", "period_label": "Week of Oct 12, 2026", "start_date": "2026-10-12", "end_date": "2026-10-18"}


def _uid(test_user_data):
    return str(db.users.find_one({"email": test_user_data["email"]})["_id"])


def _stats(client, headers, **params):
    params = {"start_date": WEEK["start_date"], "end_date": WEEK["end_date"], **params}
    res = client.get("/reviews/stats", headers=headers, params=params)
    assert res.status_code == 200
    return res.json()


def test_stats_include_quick_checks_and_decisions_from_the_week(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.quick_checks.insert_many([
        {"user_id": uid, "date": "2026-10-13", "verdict": "go", "action": "doing", "worth_it": True},
        {"user_id": uid, "date": "2026-10-14", "verdict": "not_now", "action": "skipped"},
        {"user_id": uid, "date": "2026-10-15", "verdict": "not_now", "action": "doing", "worth_it": False},
        {"user_id": uid, "date": "2026-10-19", "verdict": "go"},  # next week
    ])
    db.decisions.insert_many([
        {"user_id": uid, "task": "Take the course", "verdict": "schedule", "verdict_title": "Schedule it",
         "worth_it": None, "created_at": datetime(2026, 10, 16, 9, tzinfo=timezone.utc)},
        {"user_id": uid, "task": "Old one", "verdict": "drop", "verdict_title": "Drop it",
         "created_at": datetime(2026, 10, 5, 9, tzinfo=timezone.utc)},
    ])

    stats = _stats(client, auth_headers)
    assert stats["quick_checks"] == {
        "total": 3, "go": 1, "not_now": 2, "caught": 1, "done_anyway": 1, "worth_it": 1, "not_worth_it": 1,
    }
    assert [d["task"] for d in stats["decisions"]] == ["Take the course"]
    assert stats["decisions"][0]["verdict_title"] == "Schedule it"


def test_decision_range_follows_the_users_timezone(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.users.update_one({"email": test_user_data["email"]}, {"$set": {"timezone": "Asia/Kolkata"}})
    # Monday 01:00 in India is still Sunday evening in UTC
    monday_morning = datetime(2026, 10, 12, 1, tzinfo=ZoneInfo("Asia/Kolkata")).astimezone(timezone.utc)
    db.decisions.insert_one({"user_id": uid, "task": "Early start", "verdict_title": "Do it now", "created_at": monday_morning})
    assert [d["task"] for d in _stats(client, auth_headers)["decisions"]] == ["Early start"]


def test_goals_completed_counts_only_the_period(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.goals.insert_many([
        {"user_id": uid, "title": "In week", "status": "completed", "reflected_at": datetime(2026, 10, 14, tzinfo=timezone.utc)},
        {"user_id": uid, "title": "Earlier", "status": "completed", "reflected_at": datetime(2026, 9, 1, tzinfo=timezone.utc)},
    ])
    db.daily_logs.insert_one({"user_id": uid, "date": "2026-10-14", "entries": []})
    assert _stats(client, auth_headers)["goals_completed"] == 1


def test_previous_intentions_come_from_the_last_review_before_the_period(client, auth_headers):
    for start, end, intentions in (("2026-09-28", "2026-10-04", "Old focus"), ("2026-10-05", "2026-10-11", "Ship the ritual"),
                                   ("2026-10-19", "2026-10-25", "Later")):
        res = client.post("/reviews", headers=auth_headers,
                          json={**WEEK, "start_date": start, "end_date": end, "intentions": intentions})
        assert res.status_code == 200

    stats = _stats(client, auth_headers, period_type="weekly")
    assert stats["previous_intentions"]["intentions"] == "Ship the ritual"
    assert _stats(client, auth_headers)["previous_intentions"] is None
    assert _stats(client, auth_headers, period_type="monthly")["previous_intentions"] is None


def test_second_review_for_the_same_period_is_rejected(client, auth_headers, other_user_headers):
    assert client.post("/reviews", headers=auth_headers, json={**WEEK, "wins": "First"}).status_code == 200
    res = client.post("/reviews", headers=auth_headers, json={**WEEK, "wins": "Again"})
    assert res.status_code == 409
    # Another user, or another period type with the same start, is fine
    assert client.post("/reviews", headers=other_user_headers, json=WEEK).status_code == 200
    assert client.post("/reviews", headers=auth_headers, json={**WEEK, "period_type": "monthly"}).status_code == 200


def test_review_dates_must_be_dates(client, auth_headers):
    res = client.post("/reviews", headers=auth_headers, json={**WEEK, "start_date": "last week"})
    assert res.status_code == 422
    assert client.get("/reviews/stats", headers=auth_headers, params={"start_date": "x", "end_date": "y"}).status_code == 422


def test_weekly_review_nudge(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    tz = ZoneInfo("UTC")
    wednesday, saturday, monday = (datetime(2026, 10, d, 18, tzinfo=tz) for d in (14, 17, 19))

    assert weekly_review_notification(uid, wednesday) is None

    nudge = weekly_review_notification(uid, saturday)
    assert nudge["id"] == "weekly-review-2026-10-12"
    assert nudge["link"] == "/reviews?ritual=this"

    # On Monday it points at the week that just ended
    assert weekly_review_notification(uid, monday)["link"] == "/reviews?ritual=last"

    client.post("/reviews", headers=auth_headers, json=WEEK)
    assert weekly_review_notification(uid, saturday) is None
    assert weekly_review_notification(uid, monday) is None
