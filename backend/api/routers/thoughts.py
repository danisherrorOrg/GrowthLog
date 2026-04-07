from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.thoughts import ThoughtModel, ThoughtUpdateModel
from utils.sentiment import analyze_sentiment

router = APIRouter(prefix="/thoughts", tags=["thoughts"])

@router.get("")
def get_thoughts(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cursor = db.thoughts.find({"user_id": uid}).sort("created_at", -1)
    return serialize_list(cursor)

@router.post("")
def add_thought(data: ThoughtModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    t_dict = data.model_dump(exclude_unset=True)
    t_dict["user_id"] = uid
    t_dict["created_at"] = utcnow()
    t_dict["is_bookmarked"] = False
    
    sentiment = analyze_sentiment(t_dict["content"])
    t_dict["sentiment"] = sentiment["label"]
    t_dict["sentiment_score"] = sentiment["score"]

    result = db.thoughts.insert_one(t_dict)
    thought = db.thoughts.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "thought", str(result.inserted_id), "Recorded a thought")
    return serialize(thought)

@router.delete("/{thought_id}")
def delete_thought(thought_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.thoughts.delete_one({"_id": ObjectId(thought_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Thought not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "thought", thought_id, "Deleted a thought")
    return {"success": True}
