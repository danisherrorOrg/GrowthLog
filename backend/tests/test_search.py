from datetime import datetime
from core.database import db


def _uid(test_user_data):
    return str(db.users.find_one({"email": test_user_data["email"]})["_id"])


def test_search_requires_login(client):
    assert client.get("/search", params={"q": "hello"}).status_code == 401


def test_search_rejects_short_query(client, auth_headers):
    assert client.get("/search", params={"q": "a"}, headers=auth_headers).status_code == 422


def test_search_finds_entries_across_modules(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.daily_logs.insert_one({
        "user_id": uid, "date": "2026-03-01", "highlight": "Quiet day",
        "entries": [{"category_id": "x", "text": "Went sailing on the lake with friends"}],
    })
    goal_id = db.goals.insert_one({
        "user_id": uid, "title": "Learn sailing", "description": "",
        "created_at": datetime(2026, 2, 1),
    }).inserted_id
    db.thoughts.insert_one({"user_id": uid, "content": "Nothing relevant", "created_at": datetime(2026, 2, 2)})
    db.books.insert_one({
        "user_id": uid, "title": "Sea Stories", "author": "A. Writer",
        "wisdom": [{"chapter": "1", "content": "Sailing teaches patience", "thoughts": ""}],
        "created_at": datetime(2026, 1, 5),
    })

    res = client.get("/search", params={"q": "SAILING"}, headers=auth_headers)
    assert res.status_code == 200
    by_type = {r["type"]: r for r in res.json()["results"]}

    assert set(by_type) == {"daily_log", "goal", "book"}
    log = by_type["daily_log"]
    assert log["link"] == "/log?date=2026-03-01"
    assert log["title"] == "Daily Log · 2026-03-01"
    assert "sailing" in log["snippet"]
    assert by_type["goal"]["link"] == f"/goals/{goal_id}"
    assert by_type["goal"]["snippet"] == ""  # same as the title, so not repeated
    assert by_type["goal"]["date"] == "2026-02-01"
    assert "patience" in by_type["book"]["snippet"]


def test_search_treats_query_as_plain_text(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.thoughts.insert_one({"user_id": uid, "content": "costs (a+b)* more", "created_at": datetime(2026, 1, 1)})
    db.thoughts.insert_one({"user_id": uid, "content": "aaab", "created_at": datetime(2026, 1, 2)})

    res = client.get("/search", params={"q": "(a+b)*"}, headers=auth_headers)
    assert res.status_code == 200
    assert [r["title"] for r in res.json()["results"]] == ["costs (a+b)* more"]


def test_search_limits_results_per_type_newest_first(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    for day in range(1, 9):
        db.todos.insert_one({"user_id": uid, "title": f"Errand {day}", "created_at": datetime(2026, 1, day)})

    results = client.get("/search", params={"q": "errand"}, headers=auth_headers).json()["results"]
    assert [r["title"] for r in results] == [f"Errand {d}" for d in (8, 7, 6, 5, 4)]


def test_search_long_text_is_trimmed_around_match(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    text = "x " * 200 + "needle" + " y" * 200
    db.thoughts.insert_one({"user_id": uid, "content": text, "created_at": datetime(2026, 1, 1)})

    result = client.get("/search", params={"q": "needle"}, headers=auth_headers).json()["results"][0]
    assert len(result["title"]) <= 100
    assert result["snippet"].startswith("…") and result["snippet"].endswith("…")
    assert "needle" in result["snippet"]


def test_search_does_not_leak_other_users_data(client, auth_headers, other_user_headers, test_user_data):
    uid = _uid(test_user_data)
    db.goals.insert_one({"user_id": uid, "title": "Private zebra plan", "created_at": datetime(2026, 1, 1)})

    mine = client.get("/search", params={"q": "zebra"}, headers=auth_headers).json()["results"]
    theirs = client.get("/search", params={"q": "zebra"}, headers=other_user_headers).json()["results"]
    assert len(mine) == 1
    assert theirs == []
