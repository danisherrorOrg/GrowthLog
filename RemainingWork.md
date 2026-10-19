# Remaining Work

What is still open in GrowthLog, checked against the code on 2026-10-20.

Already done and no longer tracked here: timeline search escapes regex input, backend debug prints removed, rate limiting on auth/dashboard/timeline/logs, real SMTP email delivery, one-command docker compose, data export, notification center, streak shields, Pomodoro timer on To-Dos, and the "Should I do this?" quick check, Morning Plan and Decision Matrix.

---

## 🐞 Bugs & Security (fix first)

1. ✅ **Completed — Rate limiter can be bypassed by faking the client IP**
   * `backend/core/rate_limit.py` (`get_real_ip`) trusts the `CF-Connecting-IP`, `X-Forwarded-For` and `X-Real-IP` headers, which any client can set. Sending a new fake IP on every request gets around the login/register limits.
   * **Fix:** only trust those headers when the request comes from our own proxy (nginx); otherwise use the real connection address.

2. ✅ **Completed — No "forgot password" flow**
   * There is no reset endpoint or page. A user who forgets their password is locked out for good.
   * **Fix:** add a reset-token email (email sending already works) plus a reset page.

3. ✅ **Completed — Login token stored in `localStorage` and valid for 30 days**
   * `frontend/src/context/AuthContext.js`, `frontend/src/utils/api.js`, `backend/core/security.py` (`create_token`).
   * If any script injection gets through, the token can be stolen and used for a month.
   * **Fix:** move to an httpOnly cookie, or use short-lived tokens with refresh.

4. ✅ **Completed — Every authenticated request does 2–3 extra database lookups**
   * `get_current_user` in `backend/api/deps.py` checks the JWT blocklist and runs `check_and_apply_streak_shields` on every API call.
   * **Done:** removed the JWT blocklist; a deleted account's tokens already fail the user lookup. The shield check was kept, since it makes no DB calls unless a missed day needs a shield.

5. ✅ **Completed — Daily quote/prompt uses server time, not the user's timezone**
   * `backend/api/routers/dashboard.py` uses `datetime.now()` to pick the day.
   * Users in other timezones get the next day's content early or late.
   * **Done:** `/prompts/quote` and `/prompts/daily` now require login and pick the day from the user's timezone.

6. ✅ **Completed — Tests can't run with one command**
   * `pytest` fails at import if `MONGO_URL` isn't set, and it needs a live MongoDB.
   * There are no frontend tests at all.
   * **Done:** `./test.sh` starts a throwaway `mongo-test` compose service and runs the backend and frontend suites; no `.env` needed. Added frontend smoke tests (API client, auth session, login page) and fixed tests that had fallen behind the app.

---

## 🚧 Unfinished Parts of Existing Features

* **"Should I do this?" time insights.** The "quick fixes take 40+ minutes" and "more time on Growth tasks than last week" insights aren't built, because quick checks don't record how long things took.
* **Morning Plan isn't the first screen.** The plan was for it to open first, but `/` still goes to `/dashboard`, and the dashboard has no link to `/plan`. Idea: redirect to `/plan` once a day before noon if today's plan isn't done.
* **Users can't pick their own category colors and icons.** These are still hardcoded lists.
* **Dashboard queries will slow down as data grows.** Category aggregates and radar charts rely on `$lookup`; add indexes and cache them.

---

## 🚀 Features to Build Next (in order)

1. ✅ **Completed — Password reset.** It's the gap that actually locks users out.
2. ✅ **Completed — Global search (⌘K).** With 20+ modules, finding an old entry is hard.
   * **Done:** ⌘K / Ctrl+K (or the ⌕ button by the bell) opens a palette that jumps to pages and searches logs, goals, to-dos, thoughts, decisions, reframes, reviews, manifestations, snapshots, books, quotes, lotus boards and categories through `GET /search`. The input is escaped before it's used as a regex.
3. **"On this day" card on the dashboard.** Shows a log from 1 or 2 years ago on today's date. Cheap to build, the data is already there, and it's a strong habit hook.
4. **Weekly review ritual.** One end-of-week flow that ties together reviews, quick checks and decisions (wins, struggles, next week's focus).
5. **PWA / installable app.** People log daily from their phones; make it installable, later with offline sync.

### Other ideas (lower priority)

* **Intraday mood & energy check-ins.** Up to 4 per day, charted in the day detail view.
* **"Spotify Wrapped"-style shareable cards.** PNG images of streaks, goal completion and category balance.
* **XP & growth levels.** Seedling → Root → Branch → Canopy.
* **Interactive Life Balance Wheel.** Drag the radar chart points to set targets and see the gaps.
* **"Best days" report.** Best-performing weekdays and mood/energy correlations.
* **Bring Your Own Database.** Power users save their own encrypted MongoDB URI.

---

## 🧹 Maintenance

* **Too many roadmap files.** `to.md`, `ToDo.md`, `nextTOOdo.md` and `NextTODO/*` overlap and list work that's already done. Merge them into this file.
* **Leftover files.** `backend/fix_schemas.py` and `backend/test_traceback.txt` look like debugging leftovers.
* **Very large page files.** `Profile.js` (~1,400 lines), `Todos.js` (~1,300) and `Insights.js` (~1,000) are getting hard to change safely. Split them into components.
