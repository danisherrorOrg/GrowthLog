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

    # Prioritize manual sentiment if provided
    if not t_dict.get("sentiment"):
        sentiment = analyze_sentiment(t_dict["content"])
        t_dict["sentiment"] = sentiment["label"]
        t_dict["sentiment_score"] = sentiment["score"]
    else:
        t_dict["sentiment_score"] = 1.0

    result = db.thoughts.insert_one(t_dict)
    thought = db.thoughts.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "thought", str(result.inserted_id), "Recorded a thought")
    return serialize(thought)

@router.put("/{thought_id}")
def update_thought(thought_id: str, data: ThoughtUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))

    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # If content changed and no manual sentiment provided, re-analyze sentiment
    if "content" in update_dict and not update_dict.get("sentiment"):
        sentiment = analyze_sentiment(update_dict["content"])
        update_dict["sentiment"] = sentiment["label"]
        update_dict["sentiment_score"] = sentiment["score"]
    elif "sentiment" in update_dict:
        update_dict["sentiment_score"] = 1.0

    result = db.thoughts.update_one(
        {"_id": ObjectId(thought_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Thought not found")

    updated_thought = db.thoughts.find_one({"_id": ObjectId(thought_id), "user_id": uid})
    from utils.activity import log_activity
    log_activity(uid, "update", "thought", thought_id, "Updated a thought")
    return serialize(updated_thought)

@router.patch("/{thought_id}/pin")
def toggle_pin(thought_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    thought = db.thoughts.find_one({"_id": ObjectId(thought_id), "user_id": uid})
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    new_val = not thought.get("is_bookmarked", False)
    db.thoughts.update_one(
        {"_id": ObjectId(thought_id), "user_id": uid},
        {"$set": {"is_bookmarked": new_val}}
    )
    updated = db.thoughts.find_one({"_id": ObjectId(thought_id), "user_id": uid})
    return serialize(updated)

@router.delete("/{thought_id}")
def delete_thought(thought_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.thoughts.delete_one({"_id": ObjectId(thought_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Thought not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "thought", thought_id, "Deleted a thought")
    return {"success": True}
