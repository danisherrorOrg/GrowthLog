from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from typing import Optional

from core.database import db
from utils.cache import utcnow, cache_invalidate
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user, validate_user_owns_category
from models.schemas import (
    GoalModel, GoalUpdateModel, GoalReflectModel,
    MicroGoalModel, GoalReflectionAddModel, NoteModel
)

router = APIRouter(prefix="/goals", tags=["goals"])

@router.get("")
def get_goals(sort_by: str = "created_at", sort_order: str = "desc",
              category_id: Optional[str] = None, status: Optional[str] = None,
              current_user=Depends(get_current_user)):
    q = {"user_id": str(current_user["_id"])}
    if category_id:
        q["category_id"] = category_id
    if status:
        q["status"] = status
    direction = DESCENDING if sort_order == "desc" else ASCENDING
    sf = sort_by if sort_by in {"created_at", "current_deadline", "title", "status"} else "created_at"
    return serialize_list(db.goals.find(q).sort(sf, direction))

@router.get("/category/{category_id}")
def get_goals_by_category(category_id: str, current_user=Depends(get_current_user)):
    return serialize_list(db.goals.find({"user_id": str(current_user["_id"]), "category_id": category_id}))

@router.get("/{goal_id}")
def get_goal(goal_id: str, current_user=Depends(get_current_user)):
    goal = db.goals.find_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return serialize(goal)

@router.post("")
def create_goal(data: GoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    validate_user_owns_category(data.category_id, uid)
    goal = {
        "user_id": uid, "category_id": data.category_id,
        "title": data.title, "description": data.description,
        "original_deadline": data.deadline, "current_deadline": data.deadline,
        "status": "active", "reflection": None, "reflections": [],
        "notes": [], "micro_goals": [], "extension_history": [], "created_at": utcnow(),
    }
    result = db.goals.insert_one(goal)
    goal["id"] = str(result.inserted_id)
    del goal["_id"]
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return goal


@router.put("/{goal_id}")
def update_goal(goal_id: str, data: GoalUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if "deadline" in fields:
        fields["current_deadline"] = fields.pop("deadline")
    if "category_id" in fields:
        validate_user_owns_category(fields["category_id"], uid)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": uid}, {"$set": fields})
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}

@router.delete("/{goal_id}")
def delete_goal(goal_id: str, current_user=Depends(get_current_user)):
    r = db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    uid = str(current_user["_id"])
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}


@router.put("/{goal_id}/reflect")
def reflect_goal(goal_id: str, data: GoalReflectModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    update = {"status": data.status, "reflection": data.reflection, "reflected_at": utcnow()}
    ref_entry = {"text": data.reflection, "status_change": data.status, "date": utcnow().isoformat()}
    if data.status == "extended" and data.new_deadline:
        goal = db.goals.find_one({"_id": ObjectId(goal_id), "user_id": uid})
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        db.goals.update_one({"_id": ObjectId(goal_id)}, {"$push": {"extension_history": {
            "old_deadline": goal["current_deadline"], "new_deadline": data.new_deadline,
            "reason": data.reflection, "extended_at": utcnow().isoformat(),
        }}})
        update["current_deadline"] = data.new_deadline
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": uid},
                        {"$set": update, "$push": {"reflections": ref_entry}})
    cache_invalidate(f"dashboard:{uid}")
    cache_invalidate(f"stats:{uid}")
    return {"success": True}


@router.post("/{goal_id}/reflections")
def add_goal_reflection(goal_id: str, data: GoalReflectionAddModel, current_user=Depends(get_current_user)):
    entry = {"id": str(ObjectId()), "text": data.text, "status_change": None,
             "date": data.date or utcnow().isoformat()}
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$push": {"reflections": entry}})
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}

@router.delete("/{goal_id}/reflections/{reflection_id}")
def delete_goal_reflection(goal_id: str, reflection_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid},
        {"$pull": {"reflections": {"id": reflection_id}}}
    )
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.put("/{goal_id}/reflections/{reflection_id}")
def update_goal_reflection(goal_id: str, reflection_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "reflections.id": reflection_id},
        {"$set": {"reflections.$.text": data.text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or reflection not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@router.post("/{goal_id}/notes")
def add_goal_note(goal_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    note = {"id": str(ObjectId()), "text": data.text, "date": utcnow().isoformat()}
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$push": {"notes": note}})
    return {"success": True}

@router.delete("/{goal_id}/notes/{note_id}")
def delete_goal_note(goal_id: str, note_id: str, current_user=Depends(get_current_user)):
    db.goals.update_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
                        {"$pull": {"notes": {"id": note_id}}})
    return {"success": True}

@router.put("/{goal_id}/notes/{note_id}")
def update_goal_note(goal_id: str, note_id: str, data: NoteModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "notes.id": note_id},
        {"$set": {"notes.$.text": data.text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or note not found")
    return {"success": True}

@router.post("/{goal_id}/micro-goals")
def add_micro_goal(goal_id: str, data: MicroGoalModel, current_user=Depends(get_current_user)):
    mg_id = str(ObjectId())
    mg = {"id": mg_id, "text": data.text, "completed": False, "time_spent": data.time_spent or 0}
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$push": {"micro_goals": mg}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True, "id": mg_id}

@router.put("/{goal_id}/micro-goals/{mg_id}")
def update_micro_goal(goal_id: str, mg_id: str, data: MicroGoalModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid, "micro_goals.id": mg_id},
        {"$set": {"micro_goals.$.text": data.text, "micro_goals.$.time_spent": data.time_spent}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or micro-goal not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.put("/{goal_id}/micro-goals/{mg_id}/toggle")
def toggle_micro_goal(goal_id: str, mg_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    result = db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": uid},
        [{"$set": {
            "micro_goals": {
                "$map": {
                    "input": "$micro_goals",
                    "as": "mg",
                    "in": {
                        "$cond": [
                            {"$eq": ["$$mg.id", mg_id]},
                            {"$mergeObjects": ["$$mg", {"completed": {"$not": "$$mg.completed"}}]},
                            "$$mg"
                        ]
                    }
                }
            }
        }}]
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal or micro-goal not found")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}

@router.delete("/{goal_id}/micro-goals/{mg_id}")
def delete_micro_goal(goal_id: str, mg_id: str, current_user=Depends(get_current_user)):
    db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$pull": {"micro_goals": {"id": mg_id}}}
    )
    cache_invalidate(f"dashboard:{str(current_user['_id'])}")
    return {"success": True}
