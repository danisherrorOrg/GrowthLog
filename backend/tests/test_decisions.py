import pytest
from utils.decision_matrix import evaluate, FACTORS

# The artifact's worked example: "Weekend online course on data analysis"
EXAMPLE = {"required": 2, "goals": 5, "urgency": 2, "handoff": 1, "impact": 4, "longterm": 5, "skip": 3, "harm": 1,
           "learning": 5, "health": 3, "people": 2, "time": 4, "energy": 3, "money": 2, "opp": 3,
           "emotion": 3, "motive": 4, "regret": 4}


def values(**overrides):
    return {**{k: 3 for k in FACTORS}, **overrides}


def make(client, headers, **fields):
    payload = {"task": "Weekend online course", "values": EXAMPLE, "first_step": "Watch lesson 1"}
    payload.update(fields)
    return client.post("/decisions", headers=headers, json=payload)


def test_example_matches_the_artifact():
    r = evaluate(EXAMPLE)
    # need 62.5, impact 81.25, growth 58.3, lightness 50, heart 66.7 -> 65.8
    assert r["score"] == 66
    assert r["verdict"] == "schedule"
    assert r["dimensions"] == {"need": 63, "impact": 81, "growth": 58, "lightness": 50, "heart": 67}
    assert any("investment in your future self" in i for i in r["insights"])


@pytest.mark.parametrize("overrides,verdict", [
    ({"harm": 5, "impact": 1}, "dont"),
    ({"goals": 5, "required": 5, "impact": 5, "longterm": 5, "skip": 5, "urgency": 5}, "do_now"),
    ({"urgency": 5, "handoff": 4}, "hand_off"),
    ({"urgency": 5, "handoff": 1}, "minimum"),
    ({"required": 1, "goals": 1, "impact": 1, "longterm": 1, "skip": 1, "learning": 1}, "drop"),
    ({}, "optional"),
])
def test_verdict_rules(overrides, verdict):
    assert evaluate(values(**overrides))["verdict"] == verdict


def test_no_insight_fallback():
    assert evaluate(values(harm=1))["insights"] == ["Nothing stands out. Trust the verdict above."]


def test_decision_lifecycle(client, auth_headers):
    resp = make(client, auth_headers)
    assert resp.status_code == 200
    d = resp.json()
    assert d["score"] == 66 and d["verdict_title"] == "Schedule it"

    # Live evaluation saves nothing
    live = client.post("/decisions/evaluate", headers=auth_headers, json={"values": values(urgency=5, handoff=1)})
    assert live.json()["verdict"] == "minimum"
    assert len(client.get("/decisions", headers=auth_headers).json()) == 1

    # Changing values re-scores on the server
    upd = client.put(f"/decisions/{d['id']}", headers=auth_headers, json={"values": values(harm=5, impact=1)}).json()
    assert upd["verdict"] == "dont" and upd["task"] == "Weekend online course"

    # Looking back
    rev = client.put(f"/decisions/{d['id']}", headers=auth_headers, json={"worth_it": False, "outcome_note": "Too tired"}).json()
    assert rev["worth_it"] is False and rev["reviewed_at"]

    assert client.get(f"/decisions/{d['id']}", headers=auth_headers).json()["outcome_note"] == "Too tired"
    assert client.delete(f"/decisions/{d['id']}", headers=auth_headers).status_code == 200
    assert client.get(f"/decisions/{d['id']}", headers=auth_headers).status_code == 404


def test_first_step_becomes_one_todo(client, auth_headers):
    d = make(client, auth_headers, first_step="Watch the first 20-minute lesson").json()
    first = client.post(f"/decisions/{d['id']}/todo", headers=auth_headers).json()
    again = client.post(f"/decisions/{d['id']}/todo", headers=auth_headers).json()
    assert first["todo_id"] and again["todo_id"] == first["todo_id"]
    todos = [t for t in client.get("/todos", headers=auth_headers).json() if t["title"] == "Watch the first 20-minute lesson"]
    assert len(todos) == 1 and todos[0]["description"] == "First step for: Weekend online course"

    blank = make(client, auth_headers, first_step="").json()
    assert client.post(f"/decisions/{blank['id']}/todo", headers=auth_headers).status_code == 400


@pytest.mark.parametrize("bad", [
    {"values": {**EXAMPLE, "goals": 6}},
    {"values": {**EXAMPLE, "goals": True}},
    {"values": {k: v for k, v in EXAMPLE.items() if k != "goals"}},
    {"values": {**EXAMPLE, "extra": 3}},
    {"task": "  "},
    {"good": "x" * 2001},
])
def test_validation(client, auth_headers, bad):
    assert make(client, auth_headers, **bad).status_code == 422


def test_decisions_are_isolated(client, auth_headers, other_user_headers):
    d = make(client, auth_headers).json()
    assert client.get("/decisions", headers=other_user_headers).json() == []
    assert client.get(f"/decisions/{d['id']}", headers=other_user_headers).status_code == 404
    assert client.put(f"/decisions/{d['id']}", headers=other_user_headers, json={"worth_it": True}).status_code == 404
    assert client.post(f"/decisions/{d['id']}/todo", headers=other_user_headers).status_code == 404
    assert client.delete(f"/decisions/{d['id']}", headers=other_user_headers).status_code == 404
