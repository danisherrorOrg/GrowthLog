from datetime import datetime, timezone

_cache = {}
CACHE_TTL = 60

def utcnow():
    return datetime.now(timezone.utc)

def cache_get(key):
    if key in _cache:
        val, exp = _cache[key]
        if utcnow().timestamp() < exp:
            return val
        del _cache[key]
    return None

def cache_set(key, val, ttl=CACHE_TTL):
    _cache[key] = (val, utcnow().timestamp() + ttl)

def cache_invalidate(prefix):
    for k in [k for k in list(_cache.keys()) if k.startswith(prefix)]:
        del _cache[k]
