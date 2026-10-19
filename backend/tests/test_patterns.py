from tests.test_decisions import values

TODAY = "2026-10-20"
DAYS = ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"]
NOT_NOW = {"helps_today": 1, "matters_week": 1, "giving_up": 5}
GO = {"helps_today": 5, "matters_week": 5, "giving_up": 1}


def check(client, headers, day, hour, answers, **update):
    c = client.post("/quick-checks", headers=headers, json={"text": "x", "date": day, "hour": hour, **answers}).json()
    if update:
        client.put(f"/quick-checks/{c['id']}", headers=headers, json=update)
    return c


def patterns(client, headers):
    return client.get(f"/quick-checks/patterns?today={TODAY}", headers=headers).json()


def test_not_ready_until_enough_data(client, auth_headers):
    for day in DAYS[:3]:
        check(client, auth_headers, day, 10, GO)
    p = patterns(client, auth_headers)
    assert p["ready"] is False and p["insights"] == []
    assert p["progress"] == {"checks": 3, "days": 3, "need_checks": 10, "need_days": 5}


def test_patterns_from_checks_plans_and_decisions(client, auth_headers):
    # Afternoon slump: 6 "not now" checks between 3 and 5 PM, skipped
    for day in DAYS[:6]:
        check(client, auth_headers, day, 15, NOT_NOW, action="skipped")
    # 3 overrides that weren't worth it
    for day in DAYS[:3]:
        check(client, auth_headers, day, 9, NOT_NOW, action="doing", worth_it=False)
    # 3 go-aheads that were worth it
    for day in DAYS[4:7]:
        check(client, auth_headers, day, 11, GO, action="doing", worth_it=True)

    # Morning plan: 3 do-now picks, 2 finished
    hi = {"goals": 5, "year": 5, "skip": 5, "cost": 1, "want": 5}
    ids = [client.post("/todos", headers=auth_headers, json={"title": f"T{i}"}).json()["id"] for i in range(3)]
    for tid in ids:
        client.post("/day-plan/items", headers=auth_headers, json={"date": TODAY, "todo_id": tid, "answers": hi})
    for tid in ids[:2]:
        client.patch(f"/todos/{tid}/complete", headers=auth_headers, json={})

    # 3 dreaded decisions that were worth it
    for _ in range(3):
        d = client.post("/decisions", headers=auth_headers, json={"task": "Hard talk", "values": values(emotion=1)}).json()
        client.put(f"/decisions/{d['id']}", headers=auth_headers, json={"worth_it": True})

    p = patterns(client, auth_headers)
    assert p["ready"] is True
    by_id = {i["id"]: i["text"] for i in p["insights"]}
    assert "3 PM and 5 PM" in by_id["distraction_window"]
    assert "6 time-wasters" in by_id["caught"]
    assert "100% of the time (3 of 3)" in by_id["overrides"]
    assert "100%" in by_id["go_accuracy"]
    assert "2 of 3" in by_id["plan_follow_through"]
    assert "100%" in by_id["dread"]
    assert "pressure" not in by_id  # no pressured decisions reviewed


def test_patterns_validate_params(client, auth_headers):
    assert client.get("/quick-checks/patterns", headers=auth_headers).status_code == 422
    assert client.get(f"/quick-checks/patterns?today={TODAY}&days=3", headers=auth_headers).status_code == 422


def test_hour_is_validated(client, auth_headers):
    resp = client.post("/quick-checks", headers=auth_headers, json={"text": "x", "date": TODAY, "hour": 24, **GO})
    assert resp.status_code == 422


def test_time_insights(client, auth_headers, test_user_data):
    from core.database import db
    # Enough checks on enough days to unlock patterns: 3 "quick" things that ran long this week
    for day in DAYS[4:7]:
        check(client, auth_headers, day, 10, GO, action="doing", expected_minutes=10, actual_minutes=45)
    for day in DAYS[:4]:
        check(client, auth_headers, day, 10, GO)
    for day in ("2026-10-08", "2026-10-09", "2026-10-10"):
        check(client, auth_headers, day, 10, GO, action="doing", actual_minutes=20)

    # Logged time: Reading grew by an hour, Work barely moved
    uid = str(db.users.find_one({"email": test_user_data["email"]})["_id"])
    reading = client.post("/categories", headers=auth_headers, json={"name": "Reading", "icon": "📚", "color": "#6b8c6b"}).json()["id"]
    work = client.post("/categories", headers=auth_headers, json={"name": "Work", "icon": "💼", "color": "#c9a84c"}).json()["id"]
    db.daily_logs.insert_many([
        {"user_id": uid, "date": "2026-10-18", "entries": [
            {"category_id": reading, "time_spent": 90}, {"category_id": work, "time_spent": 100}]},
        {"user_id": uid, "date": "2026-10-10", "entries": [
            {"category_id": reading, "time_spent": 30}, {"category_id": work, "time_spent": 110}]},
        {"user_id": uid, "date": "2026-10-01", "entries": [{"category_id": work, "time_spent": 999}]},  # too old
    ])

    by_id = {i["id"]: i["text"] for i in patterns(client, auth_headers)["insights"]}
    assert "took 45 min on average (you expected 10 min) — budget more time" in by_id["quick_fixes"]
    assert "2h 15m on unplanned things in the last 7 days, up from 1h" in by_id["unplanned_time"]
    assert by_id["category_shift"] == "You spent more time on Reading in the last 7 days than the week before (1h 30m vs 30 min)."


def test_time_insights_need_enough_data(client, auth_headers):
    for day in DAYS:
        check(client, auth_headers, day, 10, GO)
    for day in DAYS[:2]:
        check(client, auth_headers, day, 10, GO, action="doing", expected_minutes=5, actual_minutes=60)
    ids = {i["id"] for i in patterns(client, auth_headers)["insights"]}
    assert not ids & {"quick_fixes", "unplanned_time", "category_shift"}


def test_minutes_are_validated(client, auth_headers):
    c = check(client, auth_headers, TODAY, 10, GO)
    for bad in ({"actual_minutes": 0}, {"expected_minutes": 2000}, {"actual_minutes": "lots"}):
        assert client.put(f"/quick-checks/{c['id']}", headers=auth_headers, json=bad).status_code == 422
    res = client.put(f"/quick-checks/{c['id']}", headers=auth_headers, json={"actual_minutes": 25})
    assert res.json()["actual_minutes"] == 25
