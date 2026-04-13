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

def cache_set(key, val, ttl=CACHE_TTL):
    from core.database import db
    exp_dt = utcnow() + timedelta(seconds=ttl)
    exp = exp_dt.timestamp()
    db.server_cache.update_one(
        {"_id": key},
        {"$set": {"val": val, "exp": exp, "expire_at": exp_dt}},
        upsert=True
    )

def cache_invalidate(prefix):
    from core.database import db
    # Use generic regex to match any _id starting with prefix
    db.server_cache.delete_many({"_id": {"$regex": f"^{re.escape(prefix)}"}})

