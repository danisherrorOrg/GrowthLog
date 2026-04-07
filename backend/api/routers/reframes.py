from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.reframes import ReframeModel, ReframeUpdateModel

router = APIRouter(prefix="/reframes", tags=["reframes"])

@router.get("")
def get_reframes(distortion: str = None, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if distortion:
        query["distortion"] = distortion

    cursor = db.reframes.find(query).sort("created_at", -1)
    return serialize_list(cursor)

@router.post("")
def add_reframe(data: ReframeModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    ref_dict = data.model_dump(exclude_unset=True)
    ref_dict["user_id"] = uid
    ref_dict["created_at"] = utcnow()

    result = db.reframes.insert_one(ref_dict)
    reframe = db.reframes.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "reframe", result.inserted_id, "Completed a cognitive reframe exercise.")
    return serialize(reframe)

@router.put("/{reframe_id}")
def update_reframe(reframe_id: str, data: ReframeUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = db.reframes.update_one(
        {"_id": ObjectId(reframe_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reframe not found")

    updated_reframe = db.reframes.find_one({"_id": ObjectId(reframe_id)})
    from utils.activity import log_activity
    log_activity(uid, "update", "reframe", reframe_id, "Updated a cognitive reframe")
    return serialize(updated_reframe)

@router.delete("/{reframe_id}")
def delete_reframe(reframe_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.reframes.delete_one({"_id": ObjectId(reframe_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reframe not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "reframe", reframe_id, "Deleted a cognitive reframe")
    return {"success": True}
