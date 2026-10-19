from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from utils.activity import log_activity
from utils.patterns import compute_patterns
from api.deps import get_current_user
from models.quick_checks import QuickCheckModel, QuickCheckUpdateModel, DATE_PATTERN

router = APIRouter(prefix="/quick-checks", tags=["Quick Checks"])


def _pct(v):
    return (v - 1) / 4 * 100


def evaluate(helps_today: int, matters_week: int, giving_up: int):
    """
    "Should I do this right now?" — returns (score 0-100, verdict, reason).
    The rules run before the score so the reason the user sees is concrete.
    """
    score = round(0.4 * _pct(helps_today) + 0.4 * _pct(matters_week) + 0.2 * (100 - _pct(giving_up)))

    if helps_today >= 4:
        return score, "go", "It moves today's priorities."
    if giving_up >= 4:
        return score, "not_now", "You'd give up something important for it."
    if matters_week >= 4 and giving_up <= 2:
        return score, "go", "It still matters next week and costs you little."
    if matters_week <= 2:
        return score, "not_now", "It won't matter in a week."
    if score >= 50:
        return score, "go", "Worth it, but keep it short."
    return score, "not_now", "Low value right now."


def _get_owned(check_id: str, uid: str):
    check = db.quick_checks.find_one({"_id": ObjectId(check_id), "user_id": uid})
    if not check:
        raise HTTPException(status_code=404, detail="Quick check not found")
    return check


@router.get("")
def get_quick_checks(
    date: str = Query(..., pattern=DATE_PATTERN),
    current_user=Depends(get_current_user),
):
    uid = str(current_user["_id"])
    cursor = db.quick_checks.find({"user_id": uid, "date": date}).sort("created_at", -1)
    return serialize_list(cursor)


@router.get("/patterns")
def get_patterns(
    today: str = Query(..., pattern=DATE_PATTERN),
    days: int = Query(30, ge=7, le=365),
    current_user=Depends(get_current_user),
):
    return compute_patterns(str(current_user["_id"]), today, days)


@router.post("")
def create_quick_check(data: QuickCheckModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    score, verdict, reason = evaluate(data.helps_today, data.matters_week, data.giving_up)

    check = data.model_dump()
    check.update({
        "user_id": uid,
        "score": score,
        "verdict": verdict,
        "reason": reason,
        "action": None,
        "worth_it": None,
        "todo_id": None,
        "created_at": utcnow(),
    })
    result = db.quick_checks.insert_one(check)
    log_activity(uid, "create", "quick_check", result.inserted_id, f"Quick check: {data.text}")
    return serialize(db.quick_checks.find_one({"_id": result.inserted_id}))


@router.put("/{check_id}")
def update_quick_check(check_id: str, data: QuickCheckUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    check = _get_owned(check_id, uid)

    # Parking turns the impulse into a To-Do so it isn't lost (only once per check)
    if update_dict.get("action") == "parked" and not check.get("todo_id"):
        todo = db.todos.insert_one({
            "user_id": uid,
            "title": check["text"],
            "description": "Parked from a quick check — do it when it fits your plan.",
            "priority": "low",
            "status": "pending",
            "created_at": utcnow(),
            "completed_at": None,
        })
        update_dict["todo_id"] = str(todo.inserted_id)
        log_activity(uid, "create", "todo", todo.inserted_id, f"Parked for later: {check['text']}")

    if "worth_it" in update_dict:
        update_dict["reviewed_at"] = utcnow()

    db.quick_checks.update_one({"_id": check["_id"]}, {"$set": update_dict})
    return serialize(db.quick_checks.find_one({"_id": check["_id"]}))


@router.delete("/{check_id}")
def delete_quick_check(check_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.quick_checks.delete_one({"_id": ObjectId(check_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quick check not found")
    log_activity(uid, "delete", "quick_check", check_id, "Deleted a quick check")
    return {"success": True}
