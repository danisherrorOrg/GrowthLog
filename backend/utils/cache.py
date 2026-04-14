from datetime import datetime, timezone, timedelta
import re

CACHE_TTL = 60

def utcnow():
    return datetime.now(timezone.utc)

def cache_get(key):
    from core.database import db
    doc = db.server_cache.find_one({"_id": key})
    if doc:
        if utcnow().timestamp() < doc["exp"]:
            return doc["val"]
        db.server_cache.delete_one({"_id": key})
    return None

def cache_set(key, val, ttl=CACHE_TTL, prefix=None):
    from core.database import db
    exp_dt = utcnow() + timedelta(seconds=ttl)
    exp = exp_dt.timestamp()
    
    if not prefix:
        parts = key.split(':')
        if len(parts) >= 3:
            prefix = f"{parts[0]}:{parts[1]}:"
            
    doc = {"val": val, "exp": exp, "expire_at": exp_dt}
    if prefix:
        doc["prefix"] = prefix
        
    db.server_cache.update_one(
        {"_id": key},
        {"$set": doc},
        upsert=True
    )

def cache_invalidate_exact(key):
    from core.database import db
    db.server_cache.delete_one({"_id": key})

def cache_invalidate_prefix(prefix):
    """
    Invalidates all cache keys matching the given prefix field.
    WARNING: Ensure you use a trailing colon in prefixes (e.g. `dashboard:{uid}:`) 
    to prevent unintended partial matches of other ObjectIDs!
    """
    from core.database import db
    db.server_cache.delete_many({"prefix": prefix})
