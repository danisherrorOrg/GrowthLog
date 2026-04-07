from fastapi import APIRouter, Depends
from core.database import db
from utils.helpers import serialize_list
from api.deps import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("")
def get_activity_logs(limit: int = 50, current_user=Depends(get_current_user)):
    uid = str(current_user["_id"])
    cursor = db.activity_logs.find({"user_id": uid}).sort("created_at", -1).limit(limit)
    return serialize_list(cursor)
