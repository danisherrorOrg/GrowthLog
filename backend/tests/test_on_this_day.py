from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from core.database import db
from api.routers.dashboard import on_this_day_dates


def _uid(test_user_data):
    return str(db.users.find_one({"email": test_user_data["email"]})["_id"])


def _years_back(day: date, years: int) -> str:
    return next(d for d, ago in on_this_day_dates(day).items() if ago == years)


def test_dates_are_same_day_in_earlier_years():
    dates = on_this_day_dates(date(2026, 10, 20))
    assert dates["2025-10-20"] == 1
    assert dates["2024-10-20"] == 2
    assert dates["2016-10-20"] == 10
    assert len(dates) == 10


def test_leap_day_falls_back_to_feb_28():
    dates = on_this_day_dates(date(2028, 2, 29))
    assert dates["2027-02-28"] == 1
    assert dates["2024-02-29"] == 4


def test_feb_28_in_common_year_also_shows_leap_days():
    dates = on_this_day_dates(date(2027, 2, 28))
    assert dates["2024-02-28"] == 3
    assert dates["2024-02-29"] == 3
    assert "2026-02-29" not in dates  # not a real date


def test_on_this_day_requires_login(client):
    assert client.get("/dashboard/on-this-day").status_code == 401


def test_on_this_day_empty(client, auth_headers):
    res = client.get("/dashboard/on-this-day", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_on_this_day_returns_past_logs_newest_first(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    today = datetime.now(timezone.utc).date()
    cat_id = db.categories.find_one({"user_id": uid})["_id"]
    one_year, two_years = _years_back(today, 1), _years_back(today, 2)

    db.daily_logs.insert_many([
        {"user_id": uid, "date": two_years, "highlight": "Two years back", "entries": []},
        {"user_id": uid, "date": one_year, "highlight": "A year ago", "overall_rating": 8,
         "gratitude": ["Coffee", ""],
         "entries": [
             {"category_id": str(cat_id), "text": "Ran 5k"},
             {"category_id": "missing", "text": "Read"},
             {"category_id": str(cat_id), "text": "  "},
             {"category_id": str(cat_id), "text": "Cooked"},
             {"category_id": str(cat_id), "text": "Called mom"},
         ]},
        # Not on today's date, and today itself isn't a memory
        {"user_id": uid, "date": (today - timedelta(days=366)).isoformat(), "highlight": "Wrong day", "entries": []},
        {"user_id": uid, "date": today.isoformat(), "highlight": "Today", "entries": []},
    ])

    memories = client.get("/dashboard/on-this-day", headers=auth_headers).json()
    assert [(m["years_ago"], m["highlight"]) for m in memories] == [(1, "A year ago"), (2, "Two years back")]

    first = memories[0]
    assert first["date"] == one_year
    assert first["overall_rating"] == 8
    assert first["gratitude"] == ["Coffee"]
    assert first["entry_count"] == 5
    assert [e["text"] for e in first["entries"]] == ["Ran 5k", "Read", "Cooked"]
    assert first["entries"][0]["category"]["name"]
    assert first["entries"][1]["category"] is None


def test_on_this_day_uses_users_timezone(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    # Kiribati is UTC+14, so its date is often a day ahead of UTC
    db.users.update_one({"email": test_user_data["email"]}, {"$set": {"timezone": "Pacific/Kiritimati"}})
    local_today = datetime.now(ZoneInfo("Pacific/Kiritimati")).date()
    db.daily_logs.insert_one({"user_id": uid, "date": _years_back(local_today, 1), "highlight": "Local", "entries": []})

    memories = client.get("/dashboard/on-this-day", headers=auth_headers).json()
    assert [m["highlight"] for m in memories] == ["Local"]


def test_on_this_day_is_private(client, auth_headers, other_user_headers, test_user_data):
    today = datetime.now(timezone.utc).date()
    db.daily_logs.insert_one({"user_id": _uid(test_user_data), "date": _years_back(today, 1), "highlight": "Mine", "entries": []})

    assert client.get("/dashboard/on-this-day", headers=other_user_headers).json() == []
