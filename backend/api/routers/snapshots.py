from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import DESCENDING

from core.database import db
from utils.cache import utcnow, cache_invalidate
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.schemas import SnapshotModel, SnapshotUpdateModel

router = APIRouter(prefix="/snapshots", tags=["snapshots"])

@router.get("/compare")
def compare_snapshots(snap1_id: str, snap2_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    s1 = db.snapshots.find_one({"_id": ObjectId(snap1_id), "user_id": uid})
    s2 = db.snapshots.find_one({"_id": ObjectId(snap2_id), "user_id": uid})
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {"snapshot1": serialize(s1), "snapshot2": serialize(s2)}

@router.get("")
def get_snapshots(current_user=Depends(get_current_user)):
    return serialize_list(db.snapshots.find({"user_id": str(current_user["_id"])}).sort("date", DESCENDING))

@router.get("/{snap_id}")
def get_snapshot(snap_id: str, current_user=Depends(get_current_user)):
    snap = db.snapshots.find_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])})
    if not snap:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize(snap)

@router.post("")
def create_snapshot(data: SnapshotModel, current_user=Depends(get_current_user)):
    item = {
        "user_id": str(current_user["_id"]), "description": data.description,
        "values": data.values, "mood": data.mood,
        "date": data.date or utcnow().strftime("%Y-%m-%d"),
        "created_at": utcnow(),
    }
    result = db.snapshots.insert_one(item)
    item["id"] = str(result.inserted_id)
    del item["_id"]
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return item

@router.put("/{snap_id}")
def update_snapshot(snap_id: str, data: SnapshotUpdateModel, current_user=Depends(get_current_user)):
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.snapshots.update_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])}, {"$set": fields})
    uid = str(current_user["_id"])
    cache_invalidate(f"stats:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.delete("/{snap_id}")
def delete_snapshot(snap_id: str, current_user=Depends(get_current_user)):
    r = db.snapshots.delete_one({"_id": ObjectId(snap_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    cache_invalidate(f"stats:{str(current_user['_id'])}")
    return {"success": True}
