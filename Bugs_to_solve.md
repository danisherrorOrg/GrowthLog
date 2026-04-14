# GrowthLog — Full Codebase Audit Report
 
> **28 issues** across Backend (FastAPI/MongoDB) + Frontend (React)  
> Severity: 🔴 Critical (6) · 🟡 High (8) · 🔵 Medium (8) · 🟢 Enhancement (6)
 
---
 
## 🔴 CRITICAL
 
---
 
 
**Fix:** Rotate ALL credentials immediately. Add `.env` to `.gitignore` (it is already listed but was committed anyway — run `git rm --cached backend/.env`). Use `.env.example` with placeholder values for onboarding.
 
---
 
### 2. JWT token never expires server-side on logout
**File:** `backend/core/security.py`  
**Category:** Security
 
Tokens have a 30-day `exp` claim, but there is no server-side token blocklist. Calling `GET /auth/me` with a logged-out token still succeeds if the user did not change their password. The token version mechanism only invalidates on password change, not on explicit logout.
 
```python
# create_token: exp = utcnow() + timedelta(days=30)
# logout() in AuthContext only does: localStorage.removeItem('token')
# No server call is made — token remains valid on the backend
```
 
**Fix:** Add a `POST /auth/logout` endpoint that increments `token_version`, then update the frontend `logout()` to call it before clearing localStorage.
 
---
 
### 3. Streak calculation has a logic bug that can freeze the streak count
**File:** `backend/api/routers/logs.py`  
**Category:** Bug
 
When the 30-log window is exhausted (`current_streak == len(dates)`), the code tries to recover the old streak value from the user document. The condition checks `user.get("last_log_date") != today` at the same time — if the user logs once, this branch fires and sets `current_streak = user.get("streak", 0) + 1`, but the very next update sets `last_log_date = today`. A second save on the same day therefore takes the `else` branch and freezes the streak at the stale value.
 
```python
if current_streak == len(dates) and user.get("streak", 0) > current_streak:
    if last_log == today and user.get("last_log_date") != today:
        current_streak = user.get("streak", 0) + 1
    else:
        current_streak = user.get("streak", 0)  # stale value reused
```
 
**Fix:** Simplify — query all log dates (not just the last 30) and compute streak from scratch every time, or paginate from the most recent date backwards until a gap is found. Remove the fallback-to-old-value logic entirely.
 
---
 
### 4. Email change takes effect before new address is verified
**File:** `backend/api/routers/auth.py`  
**Category:** Security
 
`PUT /auth/email` immediately overwrites the `email` field in the database, then sends a verification link to the new address. If someone gets brief access to an account, they can silently redirect the account to an attacker-controlled address before the owner notices.
 
```python
db.users.update_one({…}, {"$set": {
    "email": data.new_email,   # ← applied immediately
    "is_verified": False,
    "verification_token": verify_token, …
}})
```
 
**Fix:** Store the pending email in a `pending_email` field and only move it to `email` once the verification token is consumed. Keep the old email fully functional until then.
 
---
 
### 5. Rate limiting only covers IP — easily bypassed behind proxies/CDNs
**File:** `backend/core/rate_limit.py`  
**Category:** Security
 
`limiter` uses `get_remote_address` which reads the raw socket IP. Behind a reverse proxy (nginx, Cloudflare, Render) all requests appear to come from the proxy IP, so the limiter hits the proxy before any single user. Credential-stuffing attacks on `/auth/login` and `/auth/register` are unrestricted for real clients.
 
```python
limiter = Limiter(key_func=get_remote_address)  # reads socket IP only
```
 
**Fix:** Use a key function that reads `X-Forwarded-For` / `CF-Connecting-IP` when behind a trusted proxy, or combine IP + email on login. Also add rate limiting to `/auth/verify/send` (currently unlimited).
 
---
 
### 6. ADMIN_TOKEN guard uses string equality with no constant-time compare
**File:** `backend/main.py`  
**Category:** Security
 
`verify_admin` compares `x_admin_token != admin_token` with Python's built-in string comparison, which is timing-attack-vulnerable. A sophisticated attacker can enumerate the token character-by-character through response latency differences.
 
```python
if not admin_token or x_admin_token != admin_token:
    raise HTTPException(status_code=403, …)
```
 
**Fix:** Use `hmac.compare_digest(x_admin_token, admin_token)` which runs in constant time regardless of where the strings differ.
 
---
 
## 🟡 HIGH
 
---
 
### 7. `helpers.serialize()` mutates the original MongoDB document
**File:** `backend/utils/helpers.py`  
**Category:** Security / Bug
 
`serialize()` does `doc["id"] = str(doc["_id"])` then `del doc["_id"]` directly on the dict returned by PyMongo. PyMongo's cursor returns the same dict object it holds internally; mutating it can corrupt the cursor or any other code sharing that reference.
 
```python
def serialize(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]   # ← mutates in-place
    return doc
```
 
**Fix:** Copy first: `doc = dict(doc)` before any mutations. Note: `health.py`'s local `serialize` already does this correctly — standardise on that pattern in `helpers.py`.
 
---
 
### 8. Nudge email uses `ALLOWED_ORIGINS[0]` as the app URL (fragile)
**File:** `backend/main.py`  
**Category:** Bug
 
The email link `href` is built from `ALLOWED_ORIGINS[0]`. In development this is `http://localhost:3000`, so production nudge emails would have broken links if the origins list is sorted or formatted differently. The same issue exists in `auth.py` for registration and email-change emails.
 
```python
base_url = ALLOWED_ORIGINS[0]
verification_link = f"{base_url}/verify/{verify_token}"
```
 
**Fix:** Add a dedicated `APP_URL` env variable (e.g. `https://app.growthlog.com`) and use that for all outbound links, keeping `ALLOWED_ORIGINS` purely for CORS policy.
 
---
 
### 9. `delete_account` does not invalidate the current JWT session
**File:** `backend/api/routers/auth.py`  
**Category:** Bug
 
`DELETE /auth/me` deletes all user data and the user document, but the caller still holds a valid JWT. Any subsequent request returns 401 implicitly, but this is not explicit. Worse: if a new user re-registers with the same email and gets the same ObjectId (unlikely but possible), the old token could authenticate them.
 
```python
db.users.delete_one({"_id": current_user["_id"]})
# No session invalidation or token blocklist entry
```
 
**Fix:** Return a clear logged-out instruction to the client and call `logout()` explicitly. On the backend, optionally write the deleted user's `_id` to a blocklist TTL'd for 30 days (the token lifetime).
 
---
 
### 10. No realistic input length validation — allows very large payloads
**File:** `backend/models/schemas.py`  
**Category:** Security
 
`RegisterModel` and `ProfileUpdateModel` have `max_length=10000` and `20000` on `name`, `bio`, `avatar_emoji` fields. These are arbitrarily large and can cause database bloat and denial-of-service via memory pressure. `avatar_emoji` in particular should be ≤ 10 characters.
 
```python
name: str = Field(..., max_length=10000)
avatar_emoji: Optional[str] = Field(None, max_length=20000)
```
 
**Fix:** Set realistic limits: `name ≤ 100`, `bio ≤ 500`, `avatar_emoji ≤ 10`, `timezone ≤ 60`. Apply similarly tight limits to all free-text fields across `schemas.py`.
 
---
 
### 11. Dashboard cache key includes `:days` suffix but invalidation does not
**File:** `backend/api/routers/dashboard.py`  
**Category:** Bug
 
Cache is stored under `dashboard:{uid}:{days}` but `cache_invalidate("dashboard:{uid}")` uses a prefix regex match. This works today but is a maintenance hazard — any change to key format or invalidation calls will silently serve stale data.
 
```python
cache_key = f"dashboard:{uid}:{days}"   # stored with :days
cache_invalidate(f"dashboard:{uid}")    # prefix match in other routers
```
 
**Fix:** Standardise — either always store without the suffix and invalidate exactly, or document the prefix-match contract explicitly and verify all invalidation calls use the correct prefix.
 
---
 
### 12. Frontend shows no loading state while `refreshUser` runs on every navigation
**File:** `frontend/src/components/Layout.js`  
**Category:** UI
 
`Layout.js` calls `refreshUser()` on every `location.pathname` change with `.catch(() => {})`. If the request is slow, users see stale streak/profile data in the sidebar. The silent catch means auth failures are completely swallowed.
 
```javascript
useEffect(() => {
  refreshUser().catch(() => {});   // silent failure
}, [location.pathname]);
```
 
**Fix:** Debounce/throttle the refresh, or only re-fetch when entering specific routes. At minimum, do not silently swallow errors — log them or show a non-blocking toast.
 
---
 
### 13. Verification email is sent passively with no UI prompt to verify
**File:** `backend/api/routers/auth.py`  
**Category:** Bug
 
`register()` returns a JWT and user object before the background email task runs. The user can immediately use the app but there is no banner, prompt, or flow nudging unverified users to verify. The `is_verified: False` state is invisible to the user.
 
**Fix:** Add a non-dismissable banner on Dashboard/Layout for unverified users with a "Resend verification" button. Check `user.is_verified` in `AuthContext` and surface it clearly.
 
---
 
### 14. `/auth/verify/send` has no rate limiting
**File:** `backend/api/routers/auth.py`  
**Category:** Security
 
The endpoint to resend verification emails applies a 60-second cooldown per user but has no `@limiter.limit()` decorator. An unauthenticated attacker cannot call it (requires auth), but a logged-in user could spam it in rapid succession from multiple threads.
 
**Fix:** Add `@limiter.limit("3/minute")` to `POST /auth/verify/send`.
 
---
 
## 🔵 MEDIUM
 
---
 
### 15. Timezone-aware streak uses "local today" but logs store UTC date strings
**File:** `backend/api/routers/logs.py`  
**Category:** Bug
 
`_get_local_now(user)` converts to the user's timezone for the streak check, but `daily_logs.date` is stored as a plain UTC `YYYY-MM-DD` string. A user in UTC+5:30 logging at 11 PM UTC (00:30 next day locally) would write a log for the next day's date, potentially breaking streak continuity.
 
**Fix:** On log creation, also use `_get_local_now()` to derive the date string. Document clearly that `date` is always in the user's local timezone. Consider storing both `utc_date` and `local_date` fields.
 
---
 
### 16. Health endpoints have no pagination
**File:** `backend/api/routers/health.py`  
**Category:** Performance
 
Every health GET endpoint returns all documents for the user with no limit or pagination. Users who log daily for a year will return 365+ documents in a single request, creating large payloads and slow queries.
 
```python
docs = db.sleep_logs.find({"user_id": uid}).sort("date", -1)
return [serialize(d) for d in docs]  # no .limit()
```
 
**Fix:** Add `limit` and `skip` (or cursor-based pagination) to all list endpoints. Default to 30–50 days and expose a `?days=` or `?limit=&skip=` parameter consistent with `/logs`.
 
---
 
### 17. `MongoClient` created at module import time with no connection pool config
**File:** `backend/core/database.py`  
**Category:** Performance
 
`MongoClient` is instantiated as a module-level global without configuring `maxPoolSize`, `connectTimeoutMS`, or `serverSelectionTimeoutMS`. Under load, the default pool (100) may be exhausted, and generous timeout defaults mean stuck connections block for a long time.
 
**Fix:** Add explicit config:
```python
MongoClient(MONGO_URL, maxPoolSize=20, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
```
Wrap db access in `try/except ServerSelectionTimeoutError` to return graceful 503s.
 
---
 
### 18. Auth errors show raw backend `detail` string — not using `getErrorMessage()`
**File:** `frontend/src/pages/Login.js`  
**Category:** UI
 
On login failure the toast shows `err.response?.data?.detail` directly. For Pydantic validation errors this can render as `[object Object]` or a confusing JSON string. `getErrorMessage()` exists in `utils/errors.js` but is not used in `Login.js` or `Register.js`.
 
```javascript
toast.error(err.response?.data?.detail || 'Login failed');
// should be:
toast.error(getErrorMessage(err, 'Login failed'));
```
 
**Fix:** Replace all direct `detail` accesses with `getErrorMessage(err, fallback)` across `Login.js`, `Register.js`, and any other page making auth calls.
 
---
 
### 19. Public profile endpoint leaks user existence through different error codes
**File:** `backend/api/routers/auth.py`  
**Category:** Security
 
`GET /public/u/{user_id}` returns `404` when the user is not found and `403` when the user is private. This allows enumeration of valid user IDs — an attacker can determine whether an ObjectId belongs to a real user.
 
**Fix:** Return `404` for both not-found and private profiles with the same message ("User not found"). Only return `200` for genuinely public profiles.
 
---
 
### 20. `cache_invalidate` uses regex on `_id` field — not index-friendly
**File:** `backend/utils/cache.py`  
**Category:** Performance / Bug
 
`cache_invalidate` does `delete_many({"_id": {"$regex": …}})` on the `server_cache` collection. Since `_id` is a string key (not ObjectId), regex on `_id` cannot use the index and triggers a full collection scan on every cache invalidation call — which happens on nearly every write operation.
 
```python
db.server_cache.delete_many({"_id": {"$regex": f"^{re.escape(prefix)}"}})
```
 
**Fix:** Use a dedicated `cache_prefix` field with an index, or restructure keys so invalidation by exact match suffices.
 
---
 
### 21. Keyboard shortcuts fire even when a modal is open
**File:** `frontend/src/components/Layout.js`  
**Category:** UI
 
The keydown handler checks for `input/textarea/select` but not for open modals or dropdowns. If a `ConfirmModal` or `PromptModal` is visible and the user presses a shortcut key (e.g. `G` for Goals), the modal closes via normal flow but navigation also fires, causing an unexpected page transition.
 
**Fix:** Add a global modal-open context (or check `document.querySelector("[role=dialog]")`) in the shortcut handler and bail early if any modal is open.
 
---
 
### 22. `recalculate_user_streak` only looks at last 30 logs — incorrect for power users
**File:** `backend/api/routers/logs.py`  
**Category:** Bug
 
The streak recalculation queries only the last 30 logs (`.limit(30)`). A user with a 45-day streak who logs consistently will have their streak incorrectly calculated because the algorithm can't see all the dates it needs.
 
```python
logs = list(db.daily_logs.find(…).sort("date", DESCENDING).limit(30))
```
 
**Fix:** Remove the `.limit(30)` cap, or implement a smarter query that stops fetching once a gap is detected (fetch in pages of 30 until a missing date is found).
 
---
 
## 🟢 ENHANCEMENTS
 
---
 
### 23. No CSRF protection documentation/middleware stub
**File:** `backend/main.py`  
**Category:** Security / Enhancement
 
The API uses JWT Bearer tokens (not cookies) so classic CSRF is largely mitigated. However if any endpoint ever migrates to cookie-based auth, CSRF protection will be silently absent with no existing pattern to follow.
 
**Fix:** Document that authentication must remain header-based. If cookies are ever introduced, add `fastapi-csrf-protect` middleware immediately.
 
---
 
### 24. Sentiment analysis word list is too small — many entries return "Neutral" incorrectly
**File:** `backend/utils/sentiment.py`  
**Category:** Enhancement
 
The positive/negative dictionaries have ~30 words each. Common growth-journal words like "productive", "accomplished", "drained", "burnt out", "grateful", "motivated", "demotivated" are missing, causing many journal entries to return Neutral incorrectly.
 
**Fix:** Expand the dictionaries or integrate a lightweight library like VADER (`vaderSentiment`) which is specifically tuned for short informal text and handles negation, punctuation, and emphasis out of the box.
 
---
 
### 25. No request ID / correlation ID for tracing errors
**File:** `backend/main.py`  
**Category:** Enhancement
 
When an error occurs, there is no way to correlate a frontend error toast with a specific backend request. This makes debugging production issues extremely slow.
 
**Fix:** Add a middleware that generates a `uuid4` per request, stores it in `request.state.request_id`, and appends it to all responses as `X-Request-ID`. Log it alongside every error.
 
---
 
### 26. Session-expired banner on Login page should be a persistent inline alert
**File:** `frontend/src/pages/Login.js`  
**Category:** UI / Enhancement
 
When redirected with `?expired=true`, if the app only shows a toast, the message disappears before users on slow connections can read it.
 
**Fix:** Render a static inline alert banner (not just a toast) below the form header: *"Your session has expired. Please log in again."* — visible until the user successfully logs in.
 
---
 
### 27. Docker Compose has no healthcheck for the backend service
**File:** `docker-compose.yml`  
**Category:** Enhancement
 
The compose file starts the backend container with no healthcheck. If the FastAPI process crashes silently at startup (e.g. missing env var), Docker reports the container as "Up" and the frontend container starts normally, producing confusing API errors.
 
**Fix:** Add to the backend service:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/"]
  interval: 10s
  retries: 3
```
 
---
 
### 28. `@app.on_event("startup")` is deprecated in FastAPI 0.93+
**File:** `backend/main.py`  
**Category:** Enhancement / Code Quality
 
`@app.on_event("startup")` is deprecated since FastAPI 0.93 in favour of lifespan context managers. While still functional, it will produce deprecation warnings in future versions.
 
```python
@app.on_event("startup")
def startup_event():
    create_indexes()
```
 
**Fix:** Replace with:
```python
from contextlib import asynccontextmanager
 
@asynccontextmanager
async def lifespan(app):
    create_indexes()
    yield
 
app = FastAPI(lifespan=lifespan)
```
 
---
 
### 29. Timeline router import is orphaned at the bottom of `main.py`
**File:** `backend/main.py`  
**Category:** Code Quality
 
The timeline router import and its `include_router` call appear after the root `GET /` endpoint and the admin nudge endpoint, separated from all other routers. This is a likely accidental commit artifact.
 
```python
# ... all other routers included at top ...
@app.get("/")
def root(): ...
 
from api.routers.timeline import router as timeline_router   # ← orphaned
app.include_router(timeline_router)
```
 
**Fix:** Move the timeline import and `include_router` call to the block with all other routers at the top of the file.
 
---
 
*End of audit — 29 issues total (28 + 1 found on closer review of streak logic).*
 