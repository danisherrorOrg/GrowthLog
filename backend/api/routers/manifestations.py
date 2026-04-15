from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING
from datetime import datetime, timedelta, timezone
from typing import Optional

from core.database import db
from utils.cache import utcnow, cache_invalidate_exact, cache_invalidate_prefix
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
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "create", "manifestation", item["id"], "Started a manifestation")
    del item["_id"]
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return item

@router.put("/{m_id}")
def update_manifestation(m_id: str, data: ManifestationUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    manifestation = db.manifestations.find_one({"_id": ObjectId(m_id), "user_id": uid})
    if not manifestation:
        raise HTTPException(status_code=404, detail="Not found")

    fields = clean_update(data.model_dump())
    
    # Handle logic for target_days vs target_date updates
    if "target_days" in fields and "target_date" not in fields:
        start_date_obj = datetime.strptime(manifestation["start_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        fields["target_date"] = (start_date_obj + timedelta(days=fields["target_days"])).strftime("%Y-%m-%d")
    elif "target_date" in fields and "target_days" not in fields:
        start_date_obj = datetime.strptime(manifestation["start_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        target_date_obj = datetime.strptime(fields["target_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        fields["target_days"] = (target_date_obj - start_date_obj).days

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": uid}, {"$set": fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    from utils.activity import log_activity
    log_activity(uid, "update", "manifestation", m_id, "Updated manifestation details")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return {"success": True}

@router.delete("/{m_id}")
def delete_manifestation(m_id: str, current_user=Depends(get_current_user)):
    r = db.manifestations.delete_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "delete", "manifestation", m_id, "Deleted a manifestation")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return {"success": True}

@router.put("/{m_id}/archive")
def archive_manifestation(m_id: str, current_user=Depends(get_current_user)):
    result = db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                         {"$set": {"status": "archived"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "update", "manifestation", m_id, "Archived a manifestation")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return {"success": True}

@router.post("/{m_id}/progress")
def add_manifestation_progress(m_id: str, data: ManifestationProgressModel, current_user=Depends(get_current_user)):
    entry = {"id": str(ObjectId()), "text": data.text, "type": data.type, "date": utcnow().isoformat()}
    result = db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                         {"$push": {"progress_entries": entry}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "create", "manifestation_progress", m_id, "Added progress to manifestation")
    cache_invalidate_prefix(f"dashboard:{uid}:")
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
        
    from utils.activity import log_activity
    log_activity(uid, "update", "manifestation_progress", m_id, "Updated a progress entry")
    cache_invalidate_prefix(f"dashboard:{uid}:")
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
    from utils.activity import log_activity
    log_activity(uid, "delete", "manifestation_progress", m_id, "Deleted a progress entry")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    return {"success": True}

@router.post("/{m_id}/notes")
def add_manifestation_note(m_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    note = {"id": str(ObjectId()), "text": data.text, "date": utcnow().isoformat()}
    result = db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                         {"$push": {"manifestation_notes": note}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "create", "manifestation_note", m_id, "Added a note to manifestation")
    return {"success": True}

@router.delete("/{m_id}/notes/{note_id}")
def delete_manifestation_note(m_id: str, note_id: str, current_user=Depends(get_current_user)):
    result = db.manifestations.update_one({"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
                                         {"$pull": {"manifestation_notes": {"id": note_id}}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "delete", "manifestation_note", m_id, "Deleted a note from manifestation")
    return {"success": True}

@router.put("/{m_id}/notes/{note_id}")
def update_manifestation_note(m_id: str, note_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": uid, "manifestation_notes.id": note_id},
        {"$set": {"manifestation_notes.$.text": data.text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Manifestation or note not found")
    from utils.activity import log_activity
    log_activity(uid, "update", "manifestation_note", m_id, "Updated a note in manifestation")
    return {"success": True}

@router.put("/{m_id}/complete")
def complete_manifestation(m_id: str, data: ManifestationCompleteModel, current_user=Depends(get_current_user)):
    result = db.manifestations.update_one(
        {"_id": ObjectId(m_id), "user_id": str(current_user["_id"])},
        {"$set": {"status": "completed", "reflection": data.text, "completed_at": utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    uid = str(current_user["_id"])
    from utils.activity import log_activity
    log_activity(uid, "complete", "manifestation", m_id, "Completed a manifestation")
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_exact(f"stats:{uid}")
    return {"success": True}
