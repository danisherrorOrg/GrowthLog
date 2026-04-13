from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize_list
from api.deps import get_current_user
from models.schemas import (
    MeaningLogModel, TravelLogModel, BucketListModel
)

router = APIRouter(prefix="/spirituality", tags=["spirituality"])


def _uid(current_user):
    return str(current_user["_id"])


def _log(uid, action, module, doc_id, msg):
    try:
        from utils.activity import log_activity
        log_activity(uid, action, module, doc_id, msg)
    except Exception:
        pass


# ──────────────────────────────────────────────
#  Meaning Log
# ──────────────────────────────────────────────

@router.get("/meaning")
def get_meaning_logs(current_user=Depends(get_current_user)):
    return serialize_list(db.meaning_log.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/meaning")
def create_meaning_log(data: MeaningLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {
        "user_id": uid,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "experience": data.experience,
        "why_meaningful": data.why_meaningful or "",
        "created_at": utcnow()
    }
    result = db.meaning_log.insert_one(doc)
    _log(uid, "create", "meaning_log", str(result.inserted_id), f"Logged a meaningful experience")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/meaning/{item_id}")
def update_meaning_log(item_id: str, data: MeaningLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.meaning_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {
            "date": data.date or "",
            "experience": data.experience,
            "why_meaningful": data.why_meaningful or ""
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/meaning/{item_id}")
def delete_meaning_log(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.meaning_log.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


# ──────────────────────────────────────────────
#  Travel Log
# ──────────────────────────────────────────────

@router.get("/travel")
def get_travel_logs(current_user=Depends(get_current_user)):
    return serialize_list(db.travel_log.find({"user_id": _uid(current_user)}).sort("date", DESCENDING))

@router.post("/travel")
def create_travel_log(data: TravelLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {
        "user_id": uid,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "destination": data.destination,
        "memories": data.memories or "",
        "photos_link": data.photos_link or "",
        "created_at": utcnow()
    }
    result = db.travel_log.insert_one(doc)
    _log(uid, "create", "travel_log", str(result.inserted_id), f"Logged travel to {data.destination}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/travel/{item_id}")
def update_travel_log(item_id: str, data: TravelLogModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.travel_log.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": {
            "date": data.date or "",
            "destination": data.destination,
            "memories": data.memories or "",
            "photos_link": data.photos_link or ""
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/travel/{item_id}")
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
def create_bucket_list_item(data: BucketListModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    doc = {
        "user_id": uid,
        "title": data.title,
        "description": data.description or "",
        "status": data.status or "not_started",
        "target_date": data.target_date or "",
        "completed_date": data.completed_date or "",
        "created_at": utcnow()
    }
    result = db.bucket_list.insert_one(doc)
    _log(uid, "create", "bucket_list", str(result.inserted_id), f"Added to bucket list: {data.title}")
    return {"id": str(result.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@router.put("/bucket-list/{item_id}")
def update_bucket_list_item(item_id: str, data: BucketListModel, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    update_data = {
        "title": data.title,
        "description": data.description or "",
        "status": data.status or "not_started",
        "target_date": data.target_date or ""
    }
    if data.status == "done" and data.completed_date:
        update_data["completed_date"] = data.completed_date
    elif data.status == "done" and not data.completed_date:
        update_data["completed_date"] = utcnow().strftime("%Y-%m-%d")
    else:
        update_data["completed_date"] = ""

    result = db.bucket_list.update_one(
        {"_id": ObjectId(item_id), "user_id": uid},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}

@router.delete("/bucket-list/{item_id}")
def delete_bucket_list_item(item_id: str, current_user=Depends(get_current_user)):
    uid = _uid(current_user)
    result = db.bucket_list.delete_one({"_id": ObjectId(item_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}
