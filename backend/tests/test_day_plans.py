import pytest
from api.routers.day_plans import evaluate
from models.day_plans import TriageAnswers

TODAY = "2026-10-20"
HIGH = {"goals": 5, "year": 5, "skip": 5, "cost": 1, "want": 5}      # score 100
MID = {"goals": 4, "year": 4, "skip": 3, "cost": 3, "want": 3}       # score 64
LOW = {"goals": 1, "year": 1, "skip": 1, "cost": 5, "want": 1}       # score 0
MEH = {"goals": 3, "year": 2, "skip": 3, "cost": 3, "want": 3}       # score 44


def todo(client, headers, **fields):
    return client.post("/todos", headers=headers, json={"title": "Task", **fields}).json()


def triage(client, headers, todo_id, answers, **extra):
    return client.post("/day-plan/items", headers=headers,
                       json={"date": TODAY, "todo_id": todo_id, "answers": answers, **extra})


@pytest.mark.parametrize("answers,delegable,urgent,verdict", [
    (HIGH, False, False, "do_now"),
    (MID, False, True, "do_now"),
    (MID, False, False, "schedule"),
    (LOW, True, True, "hand_off"),
    (LOW, False, True, "minimum"),
    (MEH, True, False, "hand_off"),
    (LOW, False, False, "drop"),
    (MEH, False, False, "schedule"),
])
def test_evaluate_rules(answers, delegable, urgent, verdict):
    assert evaluate(TriageAnswers(**answers), delegable, urgent)[1] == verdict


def test_candidates_put_urgent_and_high_priority_first(client, auth_headers):
    later = todo(client, auth_headers, title="Later", priority="low", due_date="2026-12-01")
    due = todo(client, auth_headers, title="Due today", priority="low", due_date=TODAY)
    high = todo(client, auth_headers, title="High", priority="high")

    resp = client.get(f"/day-plan?date={TODAY}", headers=auth_headers).json()
    order = [c["id"] for c in resp["candidates"]]
    assert order.index(due["id"]) < order.index(high["id"]) < order.index(later["id"])
    assert next(c for c in resp["candidates"] if c["id"] == due["id"])["urgent"] is True
    assert resp["items"] == []


def test_verdicts_update_the_todo(client, auth_headers):
    do_now = todo(client, auth_headers, title="Ship it")
    sched = todo(client, auth_headers, title="Course")
    hand = todo(client, auth_headers, title="Invoice")
    drop = todo(client, auth_headers, title="Reorganize folders")

    assert triage(client, auth_headers, do_now["id"], HIGH).json()["verdict"] == "do_now"
    assert triage(client, auth_headers, sched["id"], MID, schedule_date="2026-10-25").json()["schedule_date"] == "2026-10-25"
    assert triage(client, auth_headers, hand["id"], MEH, delegable=True).json()["verdict"] == "hand_off"
    assert triage(client, auth_headers, drop["id"], LOW).json()["verdict"] == "drop"

    todos = {t["id"]: t for t in client.get("/todos", headers=auth_headers).json()}
    assert todos[do_now["id"]]["plan_date"] == TODAY and todos[do_now["id"]]["plan_verdict"] == "do_now"
    assert todos[sched["id"]]["due_date"] == "2026-10-25"
    assert todos[hand["id"]]["delegated"] is True
    assert todos[drop["id"]]["status"] == "dropped"

    plan = client.get(f"/day-plan?date={TODAY}", headers=auth_headers).json()
    assert {i["todo_id"] for i in plan["items"]} == {do_now["id"], sched["id"], hand["id"], drop["id"]}
    assert all(c["id"] not in {do_now["id"], drop["id"]} for c in plan["candidates"])
    assert next(i for i in plan["items"] if i["todo_id"] == drop["id"])["todo_status"] == "dropped"


def test_schedule_defaults_to_tomorrow_and_rejects_past(client, auth_headers):
    t = todo(client, auth_headers)
    assert triage(client, auth_headers, t["id"], MID).json()["schedule_date"] == "2026-10-21"
    t2 = todo(client, auth_headers)
    assert triage(client, auth_headers, t2["id"], MID, schedule_date=TODAY).status_code == 422


def test_override_and_retriage_then_undo_restores(client, auth_headers):
    t = todo(client, auth_headers, title="Gym", due_date="2026-10-22", priority="medium")

    # Suggested do_now, but the user chooses drop
    resp = triage(client, auth_headers, t["id"], HIGH, verdict="drop").json()
    assert resp["suggested"] == "do_now" and resp["verdict"] == "drop"
    # Re-triage the same (now dropped) task as schedule; only one plan item remains
    triage(client, auth_headers, t["id"], MID, verdict="schedule", schedule_date="2026-10-30")
    plan = client.get(f"/day-plan?date={TODAY}", headers=auth_headers).json()
    assert [i["todo_id"] for i in plan["items"]].count(t["id"]) == 1

    # Undo restores the original state from before the first verdict
    assert client.delete(f"/day-plan/items/{t['id']}?date={TODAY}", headers=auth_headers).status_code == 200
    restored = next(x for x in client.get("/todos", headers=auth_headers).json() if x["id"] == t["id"])
    assert restored["status"] == "pending"
    assert restored["due_date"] == "2026-10-22"
    assert restored.get("plan_verdict") is None
    plan = client.get(f"/day-plan?date={TODAY}", headers=auth_headers).json()
    assert plan["items"] == [] and any(c["id"] == t["id"] for c in plan["candidates"])


def test_undo_keeps_completed_work_completed(client, auth_headers):
    t = todo(client, auth_headers)
    triage(client, auth_headers, t["id"], HIGH)
    client.patch(f"/todos/{t['id']}/complete", headers=auth_headers, json={})
    client.delete(f"/day-plan/items/{t['id']}?date={TODAY}", headers=auth_headers)
    after = next(x for x in client.get("/todos", headers=auth_headers).json() if x["id"] == t["id"])
    assert after["status"] == "done"


def test_only_pending_todos_can_be_planned(client, auth_headers):
    t = todo(client, auth_headers)
    client.patch(f"/todos/{t['id']}/complete", headers=auth_headers, json={})
    assert triage(client, auth_headers, t["id"], HIGH).status_code == 400


def test_evaluate_endpoint(client, auth_headers):
    resp = client.post("/day-plan/evaluate", headers=auth_headers, json={"answers": LOW, "urgent": True})
    assert resp.status_code == 200
    assert resp.json()["suggested"] == "minimum"
    bad = {**LOW, "goals": 9}
    assert client.post("/day-plan/evaluate", headers=auth_headers, json={"answers": bad}).status_code == 422


def test_day_plans_are_isolated(client, auth_headers, other_user_headers):
    t = todo(client, auth_headers)
    triage(client, auth_headers, t["id"], HIGH)

    assert triage(client, other_user_headers, t["id"], LOW).status_code == 404
    assert client.delete(f"/day-plan/items/{t['id']}?date={TODAY}", headers=other_user_headers).status_code == 404
    other = client.get(f"/day-plan?date={TODAY}", headers=other_user_headers).json()
    assert other["items"] == [] and other["candidates"] == []
    mine = next(x for x in client.get("/todos", headers=auth_headers).json() if x["id"] == t["id"])
    assert mine["plan_verdict"] == "do_now"
