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

## ✅ Recently Completed Features

1. ✅ **Password reset.** It was the gap that actually locked users out.
2. ✅ **Global search (⌘K).** ⌘K / Ctrl+K (or the ⌕ button by the bell) opens a palette that jumps to pages and searches logs, goals, to-dos, thoughts, decisions, reframes, reviews, manifestations, snapshots, books, quotes, lotus boards and categories through `GET /search`. The input is escaped before it's used as a regex.
3. ✅ **"On this day" card on the dashboard.** `GET /dashboard/on-this-day` returns logs written on today's date (in the user's timezone) in each of the last 10 years. The card shows the highlight, a few entries and gratitude, lets you switch between years, and opens that day's log. Leap days fall back to Feb 28.
4. ✅ **Data export covers everything.** The export now uses the same collection list as account deletion (`USER_DATA_COLLECTIONS`), so lotus boards, reviews, task check-ins and the other missing modules are included. The profile export no longer includes verification or password-reset tokens.
5. ✅ **Morning Plan on the dashboard.** A "Today's plan" card shows how many to-dos are waiting to be triaged, or, once the day is planned, how many "do now" tasks are done and the open ones. It links to `/plan`.
6. ✅ **Category colors and icons are validated.** The Profile editor for them already existed. The backend now only accepts 1–24 six-digit hex colors and 1–24 short icons, and the editor won't remove the last one or go past the limit.
7. ✅ **Old planning notes merged here.** `to.md`, `ToDo.md`, `nextTOOdo.md`, `newFeatureinLife.md` and `NextTODO/` (about 1,700 lines, mostly repeats of each other or already built) are folded into "Other ideas" below, and the stray `backend/fix_schemas.py` and `backend/test_traceback.txt` are gone.

---

## 🧭 What to Do Next (in order)

### Next features

1. **Weekly review ritual.** One end-of-week flow that pulls in the week's logs, quick checks and decisions, then asks for wins, struggles and next week's focus. It can build on the existing Reviews page and its stats endpoint.
2. **PWA / installable app.** People log daily from their phones. Start with a manifest, icons and a basic offline fallback; offline sync can come later.

### Needs some design first

3. **"Should I do this?" time insights.** The "quick fixes take 40+ minutes" and "more time on Growth tasks than last week" insights need quick checks to record how long things took first.
4. **Dashboard speed.** The backend no longer uses `$lookup`. Measure the dashboard with a lot of data, then add indexes or caching where it's actually slow.

### Maintenance

5. **Split the very large page files** before building more on them: `Profile.js` (~1,400 lines), `Todos.js` (~1,300) and `Insights.js` (~1,000).

### Other ideas (lower priority)

* **Intraday mood & energy check-ins.** Up to 4 per day, charted in the day detail view.
* **"Spotify Wrapped"-style shareable cards.** PNG images of streaks, goal completion and category balance.
* **XP & growth levels.** Seedling → Root → Branch → Canopy.
* **Interactive Life Balance Wheel.** Drag the radar chart points to set targets and see the gaps.
* **"Best days" report.** Best-performing weekdays, what high- and low-rated days have in common, and correlations such as sleep vs. mood or exercise vs. energy.
* **Life Score.** One weekly number built from days logged, mood, goal progress and emotions, with the week-over-week change.
* **Goal deadline insights.** Each goal already stores `extension_history`; sum it up across goals ("you extended 4 of 7 goals") on the Goals page.
* **Quick-log widget.** A button on every page for a 15-second mood/energy and one-line highlight entry.
* **Voice-to-log.** A mic button on the daily log using the browser's speech recognition.
* **Starter templates.** Ready-made category and goal sets ("Fitness", "Career pivot", "Mindfulness 30-day") for new users.
* **Custom emotions.** Let users add their own emotions, with a frequency breakdown per category.
* **Year in review.** An annual summary of logs, snapshots and goals (the Profile page already has a PDF export to build on).
* **Accountability partner.** Share chosen goals read-only with one other person.
* **Finance tracking.** Daily spending, income, budgets and subscriptions.
* **Data import.** Load a GrowthLog export back in (pairs with Bring Your Own Database).
* **AI features.** A weekly growth letter, a coach that answers questions about your own logs, and free-text logging that fills in categories. Needs an LLM provider chosen first.
* **Engineering.** CI that runs `./test.sh` on every PR, Playwright tests for the log → dashboard flow, and translations (English/Hindi).
* **Bring Your Own Database.** Power users save their own encrypted MongoDB URI.
