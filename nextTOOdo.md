## Repo snapshot (what you have today)

- **Stack**: React SPA (`frontend/`) + FastAPI (`backend/`) + MongoDB
- **Breadth**: Daily Logs, Dashboard analytics, Todos, Goals/Manifestations, Snapshots/Time Capsule, Knowledge Vault, Health/Spirituality, Timeline feed, Reviews, Public Profile
- **Roadmap docs already in-repo**: `NextTODO/claude.md`, `CoreFeature.md`, `ToDo.md`, `to.md`, `Project.md`

## Highest-impact things to work on next (ranked)

### 1) Fix a real backend issue: timeline search hardening + remove debug logs (Quick win)
- **Why**: Timeline search uses raw user input as Mongo `$regex` (risk of regex DoS) and prints noisy debug output.
- **Where**: `backend/api/routers/timeline.py`

### 2) Notifications / Inbox (turn existing insights into daily retention) (Quick win)
- **Why**: You already compute “consistency alerts” and have overdue todos; surfacing them in a single inbox/bell creates a habit loop.
- **Where**: backend `backend/api/routers/dashboard.py`, `backend/api/routers/todos.py`; frontend `frontend/src/components/Layout.js` (+ new page/component)

### 3) “On this day” memories card (Quick win)
- **Why**: High engagement for journaling apps; data already exists and is mentioned in your docs.
- **Where**: backend `backend/api/routers/logs.py` or `backend/api/routers/dashboard.py`; frontend `frontend/src/pages/Dashboard.js`

### 4) Data export (“Download my data” CSV/JSON) (Quick win)
- **Why**: Trust + portability; explicitly called out in your docs.
- **Where**: new backend router under `backend/api/routers/`; frontend entry in `frontend/src/pages/Profile.js`

### 5) Rate-limit heavy endpoints beyond auth (Quick win)
- **Why**: Auth is rate-limited, but heavy endpoints (dashboard aggregates, timeline search) are more abuse-prone.
- **Where**: `backend/core/rate_limit.py`, `backend/main.py`, plus selected routers (timeline/dashboard)

### 6) Weekly review ritual (guided flow + persistence) (Bigger feature)
- **Why**: Converts your existing weekly summaries into a structured “ritual” product.
- **Where**: `backend/api/routers/dashboard.py` + `backend/api/routers/reviews.py`; frontend `frontend/src/pages/Reviews.js` (or a dedicated page)

### 7) Global search / command palette (⌘K) across everything (Bigger feature)
- **Why**: Once users have months of entries across modules, search becomes primary navigation.
- **Where**: dedicated backend search endpoint; frontend modal wired into `frontend/src/components/Layout.js`

### 8) Auth hardening: move JWT out of `localStorage` (Bigger/security)
- **Why**: `localStorage` tokens are XSS-exposed; httpOnly cookie flow (or stronger CSP strategy) is a meaningful upgrade.
- **Where**: `frontend/src/utils/api.js`, `frontend/src/context/AuthContext.js`, backend auth + cookie/CORS settings

### 9) Dashboard aggregation performance refactor (Bigger/perf)
- **Why**: Category `$lookup` patterns can get expensive as data grows.
- **Where**: `backend/api/routers/dashboard.py`

### 10) Tighten docker/dev workflow into “one command dev” (Quick → Bigger depending on polish)
- **Why**: You already have `docker-compose.yml`; improving env clarity + healthchecks + consistent API base URL boosts velocity.
- **Where**: `docker-compose.yml`, backend config, frontend env handling

## Fastest “ship something real” path

Do **(1) timeline hardening** + **(2) notifications inbox MVP**: small, user-facing, and improves safety + engagement immediately.