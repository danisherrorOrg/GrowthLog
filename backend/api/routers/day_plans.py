from datetime import date as date_cls, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize
from utils.activity import log_activity
from api.deps import get_current_user
from models.quick_checks import DATE_PATTERN
from models.day_plans import TriageEvaluateModel, TriageApplyModel

router = APIRouter(prefix="/day-plan", tags=["Day Plan"])

VERDICT_LABELS = {
    "do_now": "Do now",
    "schedule": "Schedule",
    "hand_off": "Hand off",
    "minimum": "Do the minimum",
    "drop": "Drop",
}
PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}

# Todo fields a verdict may change, saved so the verdict can be undone exactly
RESTORABLE_FIELDS = ("status", "due_date", "delegated", "plan_date", "plan_verdict", "dropped_at")


def _pct(v):
    return (v - 1) / 4 * 100


def evaluate(answers, delegable: bool, urgent: bool):
    """Morning triage: returns (score 0-100, suggested verdict, reason)."""
    a = answers
    score = round(
        0.30 * _pct(a.goals) + 0.25 * _pct(a.year) + 0.25 * _pct(a.skip)
        + 0.10 * (100 - _pct(a.cost)) + 0.10 * _pct(a.want)
    )
    if score >= 60:
        if urgent or score >= 70:
            return score, "do_now", "It matters and belongs in today."
        return score, "schedule", "Worth doing — give it a specific day."
    if urgent:
        if delegable:
            return score, "hand_off", "Urgent but low value for you. Ask someone else."
        return score, "minimum", "Urgent but low value. Get it done quickly, don't polish."
    if delegable and score >= 35:
        return score, "hand_off", "Someone else can do this. Free your time."
    if score < 35:
        return score, "drop", "Low value. Letting it go is a valid choice."
    return score, "schedule", "Not for today — pick a better day."


def _is_urgent(todo, day: str):
    due = todo.get("due_date")
    return bool(due) and due <= day


def _candidate_sort_key(todo, day):
    return (
        0 if _is_urgent(todo, day) else 1,
        PRIORITY_RANK.get(todo.get("priority"), 1),
        todo.get("due_date") or "9999-12-31",  # sooner deadlines first; none last
        str(todo.get("created_at", "")),
    )


def _get_plan(uid: str, day: str):
    return db.day_plans.find_one({"user_id": uid, "date": day})


@router.get("")
def get_day_plan(date: str = Query(..., pattern=DATE_PATTERN), current_user=Depends(get_current_user)):
    """The day's triaged items (with each To-Do's live status) and the To-Dos still to triage."""
    uid = str(current_user["_id"])
    plan = _get_plan(uid, date)
    items = plan["items"] if plan else []
    triaged_ids = {i["todo_id"] for i in items}

    todo_ids = [ObjectId(i) for i in triaged_ids if ObjectId.is_valid(i)]
    statuses = {str(t["_id"]): t.get("status") for t in db.todos.find({"_id": {"$in": todo_ids}, "user_id": uid}, {"status": 1})}
    for item in items:
        item["todo_status"] = statuses.get(item["todo_id"], "deleted")

    pending = [t for t in db.todos.find({"user_id": uid, "status": "pending"}) if str(t["_id"]) not in triaged_ids]
    pending.sort(key=lambda t: _candidate_sort_key(t, date))
    candidates = []
    for t in pending:
        c = serialize(t)
        c["urgent"] = _is_urgent(t, date)
        candidates.append(c)

    return {"date": date, "items": items, "candidates": candidates}


@router.post("/evaluate")
def evaluate_triage(data: TriageEvaluateModel, current_user=Depends(get_current_user)):
    score, verdict, reason = evaluate(data.answers, data.delegable, data.urgent)
    return {"score": score, "suggested": verdict, "reason": reason}


@router.post("/items")
def apply_triage(data: TriageApplyModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    todo = db.todos.find_one({"_id": ObjectId(data.todo_id), "user_id": uid})
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    plan = _get_plan(uid, data.date)
    previous_item = next((i for i in (plan or {}).get("items", []) if i["todo_id"] == data.todo_id), None)
    # Re-triaging the same task keeps the state from before the *first* verdict
    previous = previous_item["previous"] if previous_item else {f: todo.get(f) for f in RESTORABLE_FIELDS}
    if not previous_item and todo.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending To-Dos can be planned")

    urgent = _is_urgent({"due_date": previous.get("due_date")}, data.date)
    score, suggested, reason = evaluate(data.answers, data.delegable, urgent)
    verdict = data.verdict or suggested

    todo_update = {"plan_date": data.date, "plan_verdict": verdict, "status": "pending",
                   "delegated": previous.get("delegated"), "due_date": previous.get("due_date"), "dropped_at": None}
    schedule_date = None
    if verdict == "schedule":
        schedule_date = data.schedule_date or (date_cls.fromisoformat(data.date) + timedelta(days=1)).isoformat()
        todo_update["due_date"] = schedule_date
    elif verdict == "hand_off":
        todo_update["delegated"] = True
    elif verdict == "drop":
        todo_update["status"] = "dropped"
        todo_update["dropped_at"] = utcnow()
    db.todos.update_one({"_id": todo["_id"]}, {"$set": todo_update})

    item = {
        "todo_id": data.todo_id,
        "title": todo["title"],
        "answers": data.answers.model_dump(),
        "delegable": data.delegable,
        "urgent": urgent,
        "score": score,
        "suggested": suggested,
        "reason": reason,
        "verdict": verdict,
        "schedule_date": schedule_date,
        "previous": previous,
        "planned_at": utcnow(),
    }
    db.day_plans.update_one(
        {"user_id": uid, "date": data.date},
        {"$pull": {"items": {"todo_id": data.todo_id}}},
    )
    db.day_plans.update_one(
        {"user_id": uid, "date": data.date},
        {"$push": {"items": item}, "$setOnInsert": {"created_at": utcnow()}},
        upsert=True,
    )
    log_activity(uid, "update", "todo", data.todo_id, f"Morning plan: {VERDICT_LABELS[verdict]} — {todo['title']}")
    return item


@router.delete("/items/{todo_id}")
def undo_triage(todo_id: str, date: str = Query(..., pattern=DATE_PATTERN), current_user=Depends(get_current_user)):
    """Undo a verdict: restore the To-Do to how it was before the morning plan touched it."""
    uid = str(current_user["_id"])
    plan = _get_plan(uid, date)
    item = next((i for i in (plan or {}).get("items", []) if i["todo_id"] == todo_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Plan item not found")

    restore = dict(item["previous"])
    todo = db.todos.find_one({"_id": ObjectId(todo_id), "user_id": uid}, {"status": 1})
    if todo and todo.get("status") == "done":
        restore.pop("status", None)  # never un-complete work that was finished after planning
    if todo:
        db.todos.update_one({"_id": todo["_id"]}, {"$set": restore})
    db.day_plans.update_one({"_id": plan["_id"]}, {"$pull": {"items": {"todo_id": todo_id}}})
    return {"success": True}
