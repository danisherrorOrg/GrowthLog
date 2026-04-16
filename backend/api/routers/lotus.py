from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.schemas import LotusBlossomModel, LotusBlossomUpdateModel

router = APIRouter(prefix="/lotus", tags=["lotus"])

@router.get("")
def get_all_lotus(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cursor = db.lotus.find({"user_id": uid}).sort("updated_at", -1)
    return serialize_list(cursor)

@router.post("")
def create_lotus(data: LotusBlossomModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    doc = data.model_dump(exclude_unset=True)
    doc["user_id"] = uid
    doc["created_at"] = utcnow()
    doc["updated_at"] = utcnow()

    result = db.lotus.insert_one(doc)
    created = db.lotus.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "lotus", str(result.inserted_id), "Created a Lotus Blossom session")
    return serialize(created)

@router.get("/{lotus_id}")
def get_lotus(lotus_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    if not ObjectId.is_valid(lotus_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    item = db.lotus.find_one({"_id": ObjectId(lotus_id), "user_id": uid})
    if not item:
        raise HTTPException(status_code=404, detail="Lotus Blossom not found")
    return serialize(item)

@router.put("/{lotus_id}")
def update_lotus(lotus_id: str, data: LotusBlossomUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_dict["updated_at"] = utcnow()

    result = db.lotus.update_one(
        {"_id": ObjectId(lotus_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lotus Blossom not found")
    
    updated = db.lotus.find_one({"_id": ObjectId(lotus_id), "user_id": uid})
    return serialize(updated)

@router.delete("/{lotus_id}")
def delete_lotus(lotus_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.lotus.delete_one({"_id": ObjectId(lotus_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lotus Blossom not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "lotus", lotus_id, "Deleted a Lotus Blossom session")
    return {"success": True}
