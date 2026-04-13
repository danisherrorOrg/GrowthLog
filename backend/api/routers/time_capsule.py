from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize_list
from api.deps import get_current_user
from models.schemas import (
    RegretModel, FutureAdviceModel,
    PastAdviceModel, LifeLessonModel
)

router = APIRouter(prefix="/time-capsule", tags=["time-capsule"])


def _uid(current_user):
    return str(current_user["_id"])


def _log(uid, action, module, doc_id, msg):
    try:
        from utils.activity import log_activity
        log_activity(uid, action, module, doc_id, msg)
    except Exception:
        pass


# ──────────────────────────────────────────────
#  Regrets Tracker
# ──────────────────────────────────────────────

@router.get("/regrets")
def get_regrets(current_user=Depends(get_current_user)):
    return serialize_list(db.regrets.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/regrets")
def create_regret(data: RegretModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "text": data.text, "action_to_avoid": data.action_to_avoid or "",
           "date": data.date or utcnow().strftime("%Y-%m-%d"), "created_at": utcnow()}
    result = db.regrets.insert_one(doc)
    _log(uid, "create", "regret", str(result.inserted_id), f"Logged a regret")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/regrets/{item_id}")
def update_regret(item_id: str, data: RegretModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.regrets.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"text": data.text, "action_to_avoid": data.action_to_avoid or "",
                  "date": data.date or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/regrets/{item_id}")
def delete_regret(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.regrets.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Advice to Future Self
# ──────────────────────────────────────────────

@router.get("/future-advice")
def get_future_advice(current_user=Depends(get_current_user)):
    return serialize_list(db.future_advice.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/future-advice")
def create_future_advice(data: FutureAdviceModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "content": data.content, "target_read_date": data.target_read_date or "",
           "target_age": data.target_age, "created_at": utcnow()}
    result = db.future_advice.insert_one(doc)
    _log(uid, "create", "future_advice", str(result.inserted_id), f"Wrote advice to future self")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/future-advice/{item_id}")
def update_future_advice(item_id: str, data: FutureAdviceModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.future_advice.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"content": data.content, "target_read_date": data.target_read_date or "",
                  "target_age": data.target_age}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/future-advice/{item_id}")
def delete_future_advice(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.future_advice.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Advice from Past Self
# ──────────────────────────────────────────────

@router.get("/past-advice")
def get_past_advice(current_user=Depends(get_current_user)):
    return serialize_list(db.past_advice.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/past-advice")
def create_past_advice(data: PastAdviceModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "from_age": data.from_age, "content": data.content,
           "applied": data.applied or "", "created_at": utcnow()}
    result = db.past_advice.insert_one(doc)
    _log(uid, "create", "past_advice", str(result.inserted_id), f"Logged advice from past self")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/past-advice/{item_id}")
def update_past_advice(item_id: str, data: PastAdviceModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.past_advice.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"from_age": data.from_age, "content": data.content,
                  "applied": data.applied or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/past-advice/{item_id}")
def delete_past_advice(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.past_advice.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Life Lessons List
# ──────────────────────────────────────────────

@router.get("/life-lessons")
def get_life_lessons(current_user=Depends(get_current_user)):
    return serialize_list(db.life_lessons.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/life-lessons")
def create_life_lesson(data: LifeLessonModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "principle": data.principle, "context": data.context or "",
           "date_learned": data.date_learned or utcnow().strftime("%Y-%m-%d"),
           "category": data.category or "", "created_at": utcnow()}
    result = db.life_lessons.insert_one(doc)
    _log(uid, "create", "life_lesson", str(result.inserted_id), f"Extracted a life lesson")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/life-lessons/{item_id}")
def update_life_lesson(item_id: str, data: LifeLessonModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.life_lessons.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"principle": data.principle, "context": data.context or "",
                  "date_learned": data.date_learned or "", "category": data.category or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/life-lessons/{item_id}")
def delete_life_lesson(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.life_lessons.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}
