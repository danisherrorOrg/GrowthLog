from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.quotes import QuoteModel, QuoteUpdateModel
import random

router = APIRouter(prefix="/quotes", tags=["quotes"])

@router.get("")
def get_quotes(tag: str = None, favorite: bool = None, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if tag:
        query["tags"] = tag
    if favorite is not None:
        query["is_favorite"] = favorite

    cursor = db.quotes.find(query).sort("created_at", -1)
    return serialize_list(cursor)

@router.get("/random")
def get_random_quote(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    count = db.quotes.count_documents({"user_id": uid})
    if count == 0:
        return None
    
    # We efficiently retrieve one random quote using aggregation
    pipeline = [{"$match": {"user_id": uid}}, {"$sample": {"size": 1}}]
    result = list(db.quotes.aggregate(pipeline))
    if not result:
        return None
    return serialize(result[0])

@router.post("")
def add_quote(data: QuoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    quote_dict = data.model_dump(exclude_unset=True)
    quote_dict["user_id"] = uid
    quote_dict["created_at"] = utcnow()

    result = db.quotes.insert_one(quote_dict)
    quote = db.quotes.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "quote", result.inserted_id, f"Vaulted a quote by: {data.author}")
    return serialize(quote)

@router.put("/{quote_id}")
def update_quote(quote_id: str, data: QuoteUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = db.quotes.update_one(
        {"_id": ObjectId(quote_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")

    updated_quote = db.quotes.find_one({"_id": ObjectId(quote_id)})
    from utils.activity import log_activity
    log_activity(uid, "update", "quote", quote_id, "Updated a quote")
    return serialize(updated_quote)

@router.delete("/{quote_id}")
def delete_quote(quote_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.quotes.delete_one({"_id": ObjectId(quote_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "quote", quote_id, "Deleted a quote")
    return {"success": True}

@router.patch("/{quote_id}/favorite")
def toggle_favorite(quote_id: str, is_favorite: bool, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.quotes.update_one(
        {"_id": ObjectId(quote_id), "user_id": uid},
        {"$set": {"is_favorite": is_favorite}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")

    updated_quote = db.quotes.find_one({"_id": ObjectId(quote_id)})
    from utils.activity import log_activity
    log_activity(uid, "update", "quote", quote_id, "Toggled quote favorite status")
    return serialize(updated_quote)
