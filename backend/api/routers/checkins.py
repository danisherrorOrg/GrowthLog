from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Optional, List
from pydantic import BaseModel, Field

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user

router = APIRouter(prefix="/checkins", tags=["Task Check-Ins"])


# ── Pydantic models (inline for self-containment) ─────────────────────────────

class CheckInAnswers(BaseModel):
    # Category 1 — Priority
    q1: Optional[str] = Field("", max_length=2000)
    q2: Optional[str] = Field("", max_length=2000)
    q3: Optional[str] = Field("", max_length=2000)
    q4: Optional[str] = Field("", max_length=2000)
    # Category 2 — Value & Learning
    q5: Optional[str] = Field("", max_length=2000)
    q6: Optional[str] = Field("", max_length=2000)
    q7: Optional[str] = Field("", max_length=2000)
    q8: Optional[str] = Field("", max_length=2000)
    # Category 3 — Energy & Focus
    q9: Optional[str] = Field("", max_length=2000)
    q10: Optional[str] = Field("", max_length=2000)
    q11: Optional[str] = Field("", max_length=2000)
    q12: Optional[str] = Field("", max_length=2000)
    # Category 4 — Career & Goals
    q13: Optional[str] = Field("", max_length=2000)
    q14: Optional[str] = Field("", max_length=2000)
    q15: Optional[str] = Field("", max_length=2000)
    # Category 5 — Delegation
    q16: Optional[str] = Field("", max_length=2000)
    q17: Optional[str] = Field("", max_length=2000)
    q18: Optional[str] = Field("", max_length=2000)


class TaskCheckInModel(BaseModel):
    task_name: str = Field(..., max_length=300)
    check_in_number: Optional[int] = Field(1)
    mode: Optional[str] = Field("full", max_length=20)   # "full" | "quick"
    answers: Optional[CheckInAnswers] = None
    # Quick-mode fields
    quick_most_important: Optional[str] = Field("", max_length=2000)
    quick_real_progress: Optional[str] = Field("", max_length=2000)
    quick_show_for_30: Optional[str] = Field("", max_length=2000)
    quick_energy_suited: Optional[str] = Field("", max_length=2000)
    # Verdict
    verdict: Optional[str] = Field("continue", max_length=50)   # continue | pause | drop
    verdict_reason: Optional[str] = Field("", max_length=2000)
    next_action: Optional[str] = Field("", max_length=2000)
    date: Optional[str] = Field(None, max_length=30)
    custom_questions: Optional[List[dict]] = []  # [{"text": str, "answer": str}]


class TaskCheckInUpdateModel(BaseModel):
    task_name: Optional[str] = Field(None, max_length=300)
    check_in_number: Optional[int] = None
    mode: Optional[str] = Field(None, max_length=20)
    answers: Optional[CheckInAnswers] = None
    quick_most_important: Optional[str] = Field(None, max_length=2000)
    quick_real_progress: Optional[str] = Field(None, max_length=2000)
    quick_show_for_30: Optional[str] = Field(None, max_length=2000)
    quick_energy_suited: Optional[str] = Field(None, max_length=2000)
    verdict: Optional[str] = Field(None, max_length=50)
    verdict_reason: Optional[str] = Field(None, max_length=2000)
    next_action: Optional[str] = Field(None, max_length=2000)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats/summary")
def checkin_stats(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {
            "_id": "$verdict",
            "count": {"$sum": 1}
        }}
    ]
    verdict_counts = {doc["_id"]: doc["count"] for doc in db.task_checkins.aggregate(pipeline)}
    total = sum(verdict_counts.values())
    return {
        "total": total,
        "continue_count": verdict_counts.get("continue", 0),
        "pause_count": verdict_counts.get("pause", 0),
        "drop_count": verdict_counts.get("drop", 0),
    }


@router.get("")
def list_checkins(
    limit: int = 50,
    verdict: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if verdict:
        query["verdict"] = verdict
    cursor = db.task_checkins.find(query).sort("created_at", -1).limit(limit)
    return serialize_list(cursor)


@router.post("")
def create_checkin(data: TaskCheckInModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = data.model_dump(exclude_unset=True)
    doc["user_id"] = uid
    doc["created_at"] = utcnow()

    # Flatten answers dict for MongoDB storage
    if "answers" in doc and doc["answers"] is not None:
        answers_dict = doc["answers"]
        # pydantic may already dump it as dict
        if hasattr(answers_dict, "model_dump"):
            answers_dict = answers_dict.model_dump()
        doc["answers"] = answers_dict

    result = db.task_checkins.insert_one(doc)
    created = db.task_checkins.find_one({"_id": result.inserted_id})

    from utils.activity import log_activity
    log_activity(uid, "create", "task_checkin", result.inserted_id,
                 f"Check-in #{doc.get('check_in_number', 1)} for: {data.task_name}")

    return serialize(created)


@router.get("/{checkin_id}")
def get_checkin(checkin_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = db.task_checkins.find_one({"_id": ObjectId(checkin_id), "user_id": uid})
    if not doc:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return serialize(doc)


@router.put("/{checkin_id}")
def update_checkin(checkin_id: str, data: TaskCheckInUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))

    if "answers" in update_dict and update_dict["answers"] is not None:
        answers_dict = update_dict["answers"]
        if hasattr(answers_dict, "model_dump"):
            answers_dict = answers_dict.model_dump()
        update_dict["answers"] = answers_dict

    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = db.task_checkins.update_one(
        {"_id": ObjectId(checkin_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Check-in not found")

    updated = db.task_checkins.find_one({"_id": ObjectId(checkin_id), "user_id": uid})
    return serialize(updated)


@router.delete("/{checkin_id}")
def delete_checkin(checkin_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.task_checkins.delete_one({"_id": ObjectId(checkin_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check-in not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "task_checkin", checkin_id, "Deleted a task check-in")
    return {"success": True}



