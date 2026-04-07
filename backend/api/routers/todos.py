from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from core.database import db
from utils.cache import utcnow
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.todos import TodoModel, TodoUpdateModel

router = APIRouter(prefix="/todos", tags=["Todos"])

@router.get("")
def get_todos(status: str = None, priority: str = None, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    query = {"user_id": uid}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority

    cursor = db.todos.find(query).sort("created_at", -1)
    return serialize_list(cursor)

@router.post("")
def create_todo(data: TodoModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    todo_dict = data.model_dump(exclude_unset=True)
    todo_dict["user_id"] = uid
    todo_dict["status"] = "pending"
    todo_dict["created_at"] = utcnow()
    todo_dict["completed_at"] = None

    result = db.todos.insert_one(todo_dict)
    todo = db.todos.find_one({"_id": result.inserted_id})
    from utils.activity import log_activity
    log_activity(uid, "create", "todo", result.inserted_id, f"Added to-do: {data.title}")
    return serialize(todo)

@router.put("/{todo_id}")
def update_todo(todo_id: str, data: TodoUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update_dict = clean_update(data.model_dump(exclude_unset=True))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = db.todos.update_one(
        {"_id": ObjectId(todo_id), "user_id": uid},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")

    updated_todo = db.todos.find_one({"_id": ObjectId(todo_id)})
    from utils.activity import log_activity
    log_activity(uid, "update", "todo", todo_id, "Updated to-do details")
    return serialize(updated_todo)

@router.delete("/{todo_id}")
def delete_todo(todo_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.todos.delete_one({"_id": ObjectId(todo_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    from utils.activity import log_activity
    log_activity(uid, "delete", "todo", todo_id, "Deleted a to-do")
    return {"success": True}

@router.patch("/{todo_id}/complete")
def complete_todo(todo_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.todos.update_one(
        {"_id": ObjectId(todo_id), "user_id": uid},
        {"$set": {"status": "done", "completed_at": utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")

    updated_todo = db.todos.find_one({"_id": ObjectId(todo_id)})
    from utils.activity import log_activity
    log_activity(uid, "complete", "todo", todo_id, "Completed a to-do")
    return serialize(updated_todo)
