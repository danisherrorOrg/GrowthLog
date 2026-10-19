from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from utils.activity import log_activity
from utils.decision_matrix import evaluate
from api.deps import get_current_user
from models.decisions import DecisionModel, DecisionUpdateModel, DecisionValuesModel

router = APIRouter(prefix="/decisions", tags=["Decisions"])

LIST_LIMIT = 100


def _get_owned(decision_id: str, uid: str):
    decision = db.decisions.find_one({"_id": ObjectId(decision_id), "user_id": uid})
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.post("/evaluate")
def evaluate_decision(data: DecisionValuesModel, current_user=Depends(get_current_user)):
    """Live score while the user moves sliders; nothing is saved."""
    return evaluate(data.values)


@router.get("")
def list_decisions(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cursor = db.decisions.find({"user_id": uid}).sort("created_at", -1).limit(LIST_LIMIT)
    return serialize_list(cursor)


@router.get("/{decision_id}")
def get_decision(decision_id: str, current_user=Depends(get_current_user)):
    return serialize(_get_owned(decision_id, str(current_user["_id"])))


@router.post("")
def create_decision(data: DecisionModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = data.model_dump()
    doc.update(evaluate(data.values))
    doc.update({"user_id": uid, "worth_it": None, "outcome_note": "", "todo_id": None, "created_at": utcnow()})
    result = db.decisions.insert_one(doc)
    log_activity(uid, "create", "decision", result.inserted_id, f"Decision matrix: {data.task} → {doc['verdict_title']}")
    return serialize(db.decisions.find_one({"_id": result.inserted_id}))


@router.put("/{decision_id}")
def update_decision(decision_id: str, data: DecisionUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update = clean_update(data.model_dump(exclude_unset=True))
    if not update:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    decision = _get_owned(decision_id, uid)

    if "values" in update:
        update.update(evaluate(update["values"]))
    if "worth_it" in update:
        update["reviewed_at"] = utcnow()
    update["updated_at"] = utcnow()

    db.decisions.update_one({"_id": decision["_id"]}, {"$set": update})
    log_activity(uid, "update", "decision", decision_id, f"Updated decision: {update.get('task', decision['task'])}")
    return serialize(db.decisions.find_one({"_id": decision["_id"]}))


@router.post("/{decision_id}/todo")
def create_first_step_todo(decision_id: str, current_user=Depends(get_current_user)):
    """Turn the decision's smallest first step into a To-Do (once)."""
    uid = str(current_user["_id"])
    decision = _get_owned(decision_id, uid)
    if decision.get("todo_id"):
        return serialize(decision)
    step = (decision.get("first_step") or "").strip()
    if not step:
        raise HTTPException(status_code=400, detail="Write the smallest first step first")

    todo = db.todos.insert_one({
        "user_id": uid,
        "title": step,
        "description": f"First step for: {decision['task']}",
        "priority": "high" if decision["verdict"] == "do_now" else "medium",
        "status": "pending",
        "created_at": utcnow(),
        "completed_at": None,
    })
    db.decisions.update_one({"_id": decision["_id"]}, {"$set": {"todo_id": str(todo.inserted_id)}})
    log_activity(uid, "create", "todo", todo.inserted_id, f"Added to-do: {step}")
    return serialize(db.decisions.find_one({"_id": decision["_id"]}))


@router.delete("/{decision_id}")
def delete_decision(decision_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.decisions.delete_one({"_id": ObjectId(decision_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Decision not found")
    log_activity(uid, "delete", "decision", decision_id, "Deleted a decision")
    return {"success": True}
