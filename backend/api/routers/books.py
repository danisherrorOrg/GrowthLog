from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.books import BookModel, BookUpdateModel

router = APIRouter(prefix="/books", tags=["books"])

@router.get("")
def get_books(status: str = None, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if status:
        query["status"] = status

    cursor = db.books.find(query).sort("created_at", -1)
    return serialize_list(cursor)

@router.post("")
def add_book(data: BookModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    book_dict = data.model_dump(exclude_unset=True)
    book_dict["user_id"] = uid
    book_dict["created_at"] = utcnow()

    result = db.books.insert_one(book_dict)
    book = db.books.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "book", result.inserted_id, f"Began tracking book: {data.title}")
    return serialize(book)

@router.put("/{book_id}")
def update_book(book_id: str, data: BookUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = db.books.update_one(
        {"_id": ObjectId(book_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")

    updated_book = db.books.find_one({"_id": ObjectId(book_id)})
    from utils.activity import log_activity
    log_activity(uid, "update", "book", book_id, "Updated book details")
    return serialize(updated_book)

@router.delete("/{book_id}")
def delete_book(book_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.books.delete_one({"_id": ObjectId(book_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "book", book_id, "Deleted a book")
    return {"success": True}
