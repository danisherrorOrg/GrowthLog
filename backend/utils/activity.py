from core.database import db
from utils.cache import utcnow

def log_activity(user_id: str, action: str, entity_type: str, entity_id: str, description: str):
    """
    Logs user activity to the audit trail (Activity History).
    """
    try:
        db.activity_logs.insert_one({
            "user_id": str(user_id),
            "action": action, # 'create', 'update', 'delete', 'complete'
            "entity_type": entity_type, # 'goal', 'todo', 'reframe', 'book', 'quote'
            "entity_id": str(entity_id),
            "description": description,
            "created_at": utcnow()
        })
    except Exception:
        pass # Silently fail audit logging so it doesn't break parent requests
