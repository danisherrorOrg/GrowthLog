from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize_list
from api.deps import get_current_user
from models.schemas import (
    ProjectIdeaModel, CreativeSessionModel,
    MeaningLogModel, TravelLogModel, BucketListModel
)

router = APIRouter(prefix="/passions", tags=["passions"])


def _uid(current_user):
    return str(current_user["_id"])


def _log(uid, action, module, doc_id, msg):
    try:
        from utils.activity import log_activity
        log_activity(uid, action, module, doc_id, msg)
    except Exception:
        pass


# ──────────────────────────────────────────────
#  Project Ideas
# ──────────────────────────────────────────────

@router.get("/project-ideas")
def get_project_ideas(current_user=Depends(get_current_user)):
    return serialize_list(db.project_ideas.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/project-ideas")
def create_project_idea(data: ProjectIdeaModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "title": data.title, "description": data.description or "",
           "status": data.status or "backlog", "link": data.link or "",
           "created_at": utcnow()}
    result = db.project_ideas.insert_one(doc)
    _log(uid, "create", "project_idea", str(result.inserted_id), f"Added project idea: {data.title}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/project-ideas/{item_id}")
def update_project_idea(item_id: str, data: ProjectIdeaModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.project_ideas.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"title": data.title, "description": data.description or "",
                  "status": data.status or "backlog", "link": data.link or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found")
    return {"success": True}

@router.delete("/project-ideas/{item_id}")
def delete_project_idea(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.project_ideas.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Creative Sessions
# ──────────────────────────────────────────────

@router.get("/creative-sessions")
def get_creative_sessions(current_user=Depends(get_current_user)):
    return serialize_list(db.creative_sessions.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/creative-sessions")
def create_creative_session(data: CreativeSessionModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "date": data.date or utcnow().strftime("%Y-%m-%d"),
           "project_name": data.project_name, "hours": data.hours,
           "output_notes": data.output_notes or "", "created_at": utcnow()}
    result = db.creative_sessions.insert_one(doc)
    _log(uid, "create", "creative_session", str(result.inserted_id), f"Logged creative session for: {data.project_name}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/creative-sessions/{item_id}")
def update_creative_session(item_id: str, data: CreativeSessionModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.creative_sessions.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "project_name": data.project_name,
                  "hours": data.hours, "output_notes": data.output_notes or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}

@router.delete("/creative-sessions/{item_id}")
def delete_creative_session(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.creative_sessions.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Meaning Log
# ──────────────────────────────────────────────

@router.get("/meaning-log")
def get_meaning_logs(current_user=Depends(get_current_user)):
    return serialize_list(db.meaning_log.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/meaning-log")
def create_meaning_log(data: MeaningLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "date": data.date or utcnow().strftime("%Y-%m-%d"),
           "experience": data.experience, "why_meaningful": data.why_meaningful or "",
           "created_at": utcnow()}
    result = db.meaning_log.insert_one(doc)
    _log(uid, "create", "meaning_log", str(result.inserted_id), f"Logged meaningful moment")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/meaning-log/{item_id}")
def update_meaning_log(item_id: str, data: MeaningLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.meaning_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "experience": data.experience,
                  "why_meaningful": data.why_meaningful or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/meaning-log/{item_id}")
def delete_meaning_log(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.meaning_log.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Travel Log
# ──────────────────────────────────────────────

@router.get("/travel-log")
def get_travel_logs(current_user=Depends(get_current_user)):
    return serialize_list(db.travel_log.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/travel-log")
def create_travel_log(data: TravelLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "date": data.date or utcnow().strftime("%Y-%m-%d"),
           "destination": data.destination, "memories": data.memories or "",
           "photos_link": data.photos_link or "", "created_at": utcnow()}
    result = db.travel_log.insert_one(doc)
    _log(uid, "create", "travel_log", str(result.inserted_id), f"Logged travel to {data.destination}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/travel-log/{item_id}")
def update_travel_log(item_id: str, data: TravelLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.travel_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"date": data.date or "", "destination": data.destination,
                  "memories": data.memories or "", "photos_link": data.photos_link or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/travel-log/{item_id}")
def delete_travel_log(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.travel_log.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Bucket List
# ──────────────────────────────────────────────

@router.get("/bucket-list")
def get_bucket_list(current_user=Depends(get_current_user)):
    return serialize_list(db.bucket_list.find({"user_id": _uid(current_user)}).sort("created_at", DESCENDING))

@router.post("/bucket-list")
def create_bucket_list(data: BucketListModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {"user_id": uid, "title": data.title, "description": data.description or "",
           "status": data.status or "not_started", "target_date": data.target_date or "",
           "completed_date": data.completed_date or "", "created_at": utcnow()}
    result = db.bucket_list.insert_one(doc)
    _log(uid, "create", "bucket_list", str(result.inserted_id), f"Added to bucket list: {data.title}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/bucket-list/{item_id}")
def update_bucket_list(item_id: str, data: BucketListModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.bucket_list.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {"title": data.title, "description": data.description or "",
                  "status": data.status or "not_started", "target_date": data.target_date or "",
                  "completed_date": data.completed_date or ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/bucket-list/{item_id}")
def delete_bucket_list(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.bucket_list.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}
