from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId, errors as bson_errors
from datetime import timedelta
from pymongo.errors import DuplicateKeyError

from core.database import db
from utils.cache import utcnow, cache_get, cache_set, cache_invalidate
from utils.helpers import serialize, serialize_list, clean_update
from api.deps import get_current_user
from models.schemas import CategoryModel, CategoryTemplateModel, CategoryUpdateModel

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("")
def get_categories(include_archived: bool = False, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cache_key = f"categories:{uid}:{include_archived}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    q = {"user_id": uid}
    if not include_archived:
        q["archived"] = {"$ne": True}
    result = serialize_list(db.categories.find(q))
    cache_set(cache_key, result)
    return result

@router.post("")
def create_category(data: CategoryModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cat = {
        "user_id": uid, "name": data.name, "icon": data.icon,
        "color": data.color, "description": data.description,
        "archived": False, "created_at": utcnow(),
    }
    try:
        result = db.categories.insert_one(cat)
        cat["id"] = str(result.inserted_id)
        from utils.activity import log_activity
        log_activity(uid, "create", "category", cat["id"], f"Created category: {data.name}")
        del cat["_id"]
        cache_invalidate(f"categories:{uid}")
        return cat
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail=f"A category named '{data.name}' already exists.")

@router.get("/templates")
def get_category_templates(current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    return serialize_list(db.category_templates.find({"user_id": uid}))

@router.post("/templates")
def create_category_template(data: CategoryTemplateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    template = {
        "user_id": uid, "name": data.name, "icon": data.icon,
        "color": data.color, "description": data.description,
        "created_at": utcnow(),
    }
    result = db.category_templates.insert_one(template)
    template["id"] = str(result.inserted_id)
    from utils.activity import log_activity
    log_activity(uid, "create", "category_template", template["id"], "Created a category template")
    del template["_id"]
    return template

@router.delete("/templates/{template_id}")
def delete_category_template(template_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.category_templates.delete_one({"_id": ObjectId(template_id), "user_id": uid})
    from utils.activity import log_activity
    log_activity(uid, "delete", "category_template", template_id, "Deleted a category template")
    return {"success": True}


@router.put("/{category_id}")
def update_category(category_id: str, data: CategoryUpdateModel, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    fields = clean_update(data.model_dump())
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": fields})
        from utils.activity import log_activity
        log_activity(uid, "update", "category", category_id, "Updated category details")
        cache_invalidate(f"categories:{uid}")
        cache_invalidate(f"dashboard:{uid}")
        return {"success": True}
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail=f"A category named '{fields.get('name', 'unknown')}' already exists.")


@router.put("/{category_id}/restore")
def restore_category(category_id: str, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": {"archived": False}})
    from utils.activity import log_activity
    log_activity(uid, "update", "category", category_id, "Restored a category")
    cache_invalidate(f"categories:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@router.delete("/{category_id}")
def delete_category(category_id: str, permanent: bool = False, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    if permanent:
        r = db.categories.delete_one({"_id": ObjectId(category_id), "user_id": uid})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        db.daily_logs.update_many({"user_id": uid}, {"$pull": {"entries": {"category_id": category_id}}})
        db.goals.delete_many({"user_id": uid, "category_id": category_id})
    else:
        db.categories.update_one({"_id": ObjectId(category_id), "user_id": uid}, {"$set": {"archived": True}})
    from utils.activity import log_activity
    log_activity(uid, "delete", "category", category_id, "Deleted a category")
    cache_invalidate(f"categories:{uid}")
    cache_invalidate(f"dashboard:{uid}")
    return {"success": True}


@router.get("/{category_id}/logs")
def get_category_logs(category_id: str, days: int = 90, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    since = (utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    logs = db.daily_logs.find({"user_id": uid, "date": {"$gte": since}, "entries.category_id": category_id})
    result = []
    for log in logs:
        log["entries"] = [e for e in log.get("entries", []) if e.get("category_id") == category_id]
        result.append(serialize(log))
    return result
