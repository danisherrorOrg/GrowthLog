from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize_list
from api.deps import get_current_user
from models.schemas import (
    SkillModel, CourseModel, FailureLogEntryModel,
    SkillsGapModel, FeedbackModel,
)

router = APIRouter(prefix="/growth-hub", tags=["growth-hub"])


def _uid(current_user):
    return str(current_user["_id"])


def _log(uid, action, module, doc_id, msg):
    try:
        from utils.activity import log_activity
        log_activity(uid, action, module, doc_id, msg)
    except Exception:
        pass


# ──────────────────────────────────────────────
#  Skills Tracker
# ──────────────────────────────────────────────

@router.get("/skills")
def get_skills(current_user=Depends(get_current_user)):
    return serialize_list(db.skills.find({"user_id": _uid(current_user)}).sort("name", 1))

@router.post("/skills")
def create_skill(data: SkillModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "name": data.name, "category": data.category or "",
           "level": data.level or 1, "notes": data.notes or "",
           "started_at": data.started_at or "", "created_at": utcnow()}
    result = db.skills.insert_one(doc)
    _log(uid, "create", "skill", str(result.inserted_id), f"Added skill: {data.name}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/skills/{item_id}")
def update_skill(item_id: str, data: SkillModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.skills.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"name": data.name, "category": data.category or "",
                  "level": data.level or 1, "notes": data.notes or "",
                  "started_at": data.started_at or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    _log(uid, "update", "skill", item_id, f"Updated skill: {data.name}")
    return {"success": True}

@router.delete("/skills/{item_id}")
def delete_skill(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.skills.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Courses & Learning
# ──────────────────────────────────────────────

@router.get("/courses")
def get_courses(current_user=Depends(get_current_user)):
    return serialize_list(db.courses.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/courses")
def create_course(data: CourseModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "title": data.title, "provider": data.provider or "",
           "hours_spent": data.hours_spent or 0.0, "status": data.status or "in_progress",
           "what_learned": data.what_learned or "", "started_at": data.started_at or "",
           "completed_at": data.completed_at or "", "created_at": utcnow()}
    result = db.courses.insert_one(doc)
    _log(uid, "create", "course", str(result.inserted_id), f"Added course: {data.title}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/courses/{item_id}")
def update_course(item_id: str, data: CourseModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.courses.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"title": data.title, "provider": data.provider or "",
                  "hours_spent": data.hours_spent or 0.0, "status": data.status or "in_progress",
                  "what_learned": data.what_learned or "", "started_at": data.started_at or "",
                  "completed_at": data.completed_at or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"success": True}

@router.delete("/courses/{item_id}")
def delete_course(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.courses.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Failure Log
# ──────────────────────────────────────────────

@router.get("/failures")
def get_failures(current_user=Depends(get_current_user)):
    return serialize_list(db.failure_log.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/failures")
def create_failure(data: FailureLogEntryModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "date": data.date or utcnow().strftime("%Y-%m-%d"),
           "what_happened": data.what_happened, "lesson": data.lesson or "",
           "domain": data.domain or "", "created_at": utcnow()}
    result = db.failure_log.insert_one(doc)
    _log(uid, "create", "failure_log", str(result.inserted_id), f"Logged failure: {data.what_happened[:60]}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/failures/{item_id}")
def update_failure(item_id: str, data: FailureLogEntryModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.failure_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "what_happened": data.what_happened,
                  "lesson": data.lesson or "", "domain": data.domain or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/failures/{item_id}")
def delete_failure(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.failure_log.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Skills Gap Tracker
# ──────────────────────────────────────────────

@router.get("/skills-gap")
def get_skills_gap(current_user=Depends(get_current_user)):
    return serialize_list(db.skills_gap.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/skills-gap")
def create_skills_gap(data: SkillsGapModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "skill": data.skill, "current_level": data.current_level or "",
           "target_level": data.target_level or "", "why_needed": data.why_needed or "",
           "resources": data.resources or "", "created_at": utcnow()}
    result = db.skills_gap.insert_one(doc)
    _log(uid, "create", "skills_gap", str(result.inserted_id), f"Added skills gap: {data.skill}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/skills-gap/{item_id}")
def update_skills_gap(item_id: str, data: SkillsGapModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.skills_gap.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"skill": data.skill, "current_level": data.current_level or "",
                  "target_level": data.target_level or "", "why_needed": data.why_needed or "",
                  "resources": data.resources or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/skills-gap/{item_id}")
def delete_skills_gap(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.skills_gap.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Feedback Received
# ──────────────────────────────────────────────

@router.get("/feedback")
def get_feedback(current_user=Depends(get_current_user)):
    return serialize_list(db.feedback_received.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/feedback")
def create_feedback(data: FeedbackModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "date": data.date or utcnow().strftime("%Y-%m-%d"),
           "from_person": data.from_person or "", "feedback_type": data.feedback_type or "positive",
           "content": data.content, "action_taken": data.action_taken or "", "created_at": utcnow()}
    result = db.feedback_received.insert_one(doc)
    _log(uid, "create", "feedback", str(result.inserted_id), "Logged feedback")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/feedback/{item_id}")
def update_feedback(item_id: str, data: FeedbackModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.feedback_received.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "from_person": data.from_person or "",
                  "feedback_type": data.feedback_type or "positive",
                  "content": data.content, "action_taken": data.action_taken or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True}

@router.delete("/feedback/{item_id}")
def delete_feedback(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.feedback_received.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True}
