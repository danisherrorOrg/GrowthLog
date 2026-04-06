from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta, timezone
from typing import Optional

from core.database import db
from utils.cache import utcnow, cache_invalidate
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.schemas import (
    ManifestationModel, ManifestationUpdateModel,
    ManifestationProgressModel, ManifestationProgressUpdateModel,
    ManifestationCompleteModel, NoteModel
)

router = APIRouter(prefix="/manifestations", tags=["manifestations"])

@router.get("")
def get_manifestations(status_filter: Optional[str] = None, current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if status_filter and status_filter != "all":
        q["status"] = status_filter
    return serialize_list(db.manifestations.find(q).sort("created_at", DESCENDING))

@router.get("/{m_id}")
def get_manifestation(m_id: str, current_user=Depends(get_current_user)):
    item = db.manifestations.find_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(item)

@router.post("")
def create_manifestation(data: ManifestationModel, current_user=Depends(get_current_user)):
    start = utcnow()
    if data.target_date:
        target_str = data.target_date
        target_date_obj = datetime.strptime(data.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        target_days = (target_date_obj - start).days
    elif data.target_days:
        target_str = (start + timedelta(days=data.target_days)).strftime("%Y-%m-%d")
        target_days = data.target_days
    else:
        raise HTTPException(status_code=400, detail="Provide target_days or target_date")

    item = {
        "user_id": str(current_user["_id"]), "vision": data.vision,
        "target_days": target_days, "categories": data.categories, "notes": data.notes,
        "start_date": start.strftime("%Y-%m-%d"), "target_date": target_str,
        "status": "active", "reflection": None, "progress_entries": [],
        "manifestation_notes": [], "created_at": utcnow(),
    }
    result = db.manifestations.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return item

@router.put("/{m_id}")
def update_manifestation(m_id: str, data: ManifestationUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])}, {"$set": fields})
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}

@router.delete("/{m_id}")
def delete_manifestation(m_id: str, current_user=Depends(get_current_user)):
    r = db.manifestations.delete_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}

@router.put("/{m_id}/archive")
def archive_manifestation(m_id: str, current_user=Depends(get_current_user)):
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$set": {"status": "archived"}})
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}

@router.post("/{m_id}/progress")
def add_manifestation_progress(m_id: str, data: ManifestationProgressModel, current_user=Depends(get_current_user)):
    entry = {"id": str(ObjectId()), "text": data.text, "type": data.type, "date": utcnow().isoformat()}
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$push": {"progress_entries": entry}})
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}

@router.put("/{m_id}/progress/{entry_id}")
def update_manifestation_progress(m_id: str, entry_id: str, data: ManifestationProgressUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data = {f"progress_entries.$.{k}": v for k, v in fields.items()}
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": uid, "progress_entries.id": entry_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manifestation or progress entry not found")
        
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.delete("/{m_id}/progress/{entry_id}")
def delete_manifestation_progress(m_id: str, entry_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": uid},
        {"$pull": {"progress_entries": {"id": entry_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manifestation not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.post("/{m_id}/notes")
def add_manifestation_note(m_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    note = {"id": str(ObjectId()), "text": data.text, "date": utcnow().isoformat()}
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$push": {"manifestation_notes": note}})
    return {"success": True}

@router.delete("/{m_id}/notes/{note_id}")
def delete_manifestation_note(m_id: str, note_id: str, current_user=Depends(get_current_user)):
    db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                 {"$pull": {"manifestation_notes": {"id": note_id}}})
    return {"success": True}

@router.put("/{m_id}/complete")
def complete_manifestation(m_id: str, data: ManifestationCompleteModel, current_user=Depends(get_current_user)):
    db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": {"status": "completed", "reflection": data.text, "completed_at": utcnow()}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}
