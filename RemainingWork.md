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

### Found in a browser walkthrough on 2026-10-20

7. ✅ **Completed — Timeline search showed other users' private data**
   * `backend/api/routers/timeline.py`. When `q` was set, the code replaced the `$or` that held the user filter with the search conditions, so the search ran across every user's daily logs, goals and manifestations.
   * **Done:** the owner check is now a separate `user_id: {$in: [...]}` filter shared by every timeline query, so the search `$or` can't replace it. It also no longer matches documents with no `user_id`. `test_timeline_search_never_returns_other_users_data` covers logs, goals, manifestations and snapshots.

8. ✅ **Completed — One-command Docker setup failed**
   * `docker compose up --build` stopped at `npm ci` in the frontend image: `package-lock.json` was out of sync with `package.json` (`Missing: yaml@2.9.1 from lock file`).
   * **Done:** regenerated the lock file with the image's Node 20 / npm 10 (adds Tailwind's optional `yaml@2` peer). Also fixed the frontend healthcheck, which always failed because `localhost` resolved to IPv6 while nginx listens on IPv4 only. All three containers now come up healthy.

9. ✅ **Completed — Dates were wrong for anyone outside UTC**
   * Every user was stored with `timezone: "UTC"`, and the API returned naive timestamps (`"2026-10-19T21:18:55.272000"`) that the browser read as local time.
   * **Done:** the Mongo client is now `tz_aware`, so every stored timestamp goes out as UTC with `+00:00`. Sign-up stores the browser timezone. Login fills it in for accounts still on the default UTC, unless the user picked UTC in Profile. Profile has a timezone picker and rejects unknown zones. A banner offers to switch when the device's timezone differs from the account's ("Keep" is remembered per pair of zones). Timeline goal dates, search result dates and manifestation start dates now use the user's day. Tests in `backend/tests/test_timezones.py`, `TimezoneBanner.test.js` and `utils/dates.test.js`.

10. ✅ **Completed — Timeline "Mood" was really the overall day rating**
    * `backend/api/routers/timeline.py` sent `overall_rating` as `mood`. Logging mood 8 showed "Mood: 5/10" and "Avg Mood: 5.0" in `JourneyFeed.js`.
    * **Done:** a log's `mood` is now the average of its entries' moods (empty when no entry has one), and `overall_rating` goes out as `day_rating`. The feed and the day side panel show both, labelled. The side panel's "add reflection" also failed with a 422 (entries were sent without mood/energy) and would have wiped gratitude, regret, emotions and time spent; it now sends back every field and gives the new entry a neutral 5/5. Test: `test_timeline_log_mood_is_entry_average_not_day_rating`.

11. ✅ **Completed — Signing out showed "Session Expired"**
    * The sign-out button navigated to `/login` before `logout()` had cleared the user, so the login route sent them back to `/dashboard`, whose requests then got 401s from the cleared cookie and the interceptor redirected to `/login?expired=true`. In-flight polling could do the same.
    * **Done:** `logout()` sets a "signing out" flag in `utils/api.js` that stops the 401 redirect (cleared on the next login or sign-up), and the sidebar and account-deletion flows wait for `logout()` before going to plain `/login`. Test in `utils/api.test.js`.

12. ✅ **Completed — Goals accepted a deadline in the past**
    * A goal with a 2020 deadline was saved and immediately shown as "2484d overdue". The deadline is required but not marked as required, and leaving it empty only gives "Fill all required fields".
    * **Done:** goal deadlines must be a real `YYYY-MM-DD` date, and creating, editing or extending a goal rejects a day before today in the user's timezone (422). Editing an overdue goal still works as long as its deadline isn't moved to another past day. The forms mark required fields, set `min` on the date pickers, and name the missing field instead of "Fill all required fields". Tests in `test_goals.py` and `Goals.test.js`; older tests that used 2025 deadlines now use 2099.

13. ✅ **Completed — No 404 page**
    * `frontend/src/App.js` had no catch-all route, so an unknown URL rendered a blank page.
    * **Done:** a `*` route inside the signed-in layout shows `pages/NotFound.js` ("Page not found", the URL that was asked for, and a link to the dashboard), with the sidebar still there. Signed-out visitors are sent to login as before. Vercel and nginx already serve the app for every path, so no server change was needed. Test in `NotFound.test.js`.

14. ✅ **Completed — History page overflowed on phones**
    * At 380px wide, `/history` was 646px wide: the filter sidebar and the calendar sat side by side instead of stacking.
    * **Done:** below 768px the filter panel stacks above the calendar at full width (no longer a fixed-height sticky column; the category list scrolls inside 180px), and the calendar cells shrink (`minmax(0, 1fr)` columns, smaller padding and height) so all 7 days fit. Checked at 380px in both Calendar and Timeline views: the page is 370px wide with nothing overflowing. Desktop is unchanged.

15. ✅ **Completed — Floating search and bell buttons covered page content**
    * They overlapped the "Resend Link" button on the email banner, the "Close" button on To-Dos, and success toasts.
    * **Done:** on desktop the buttons now sit in a 64px top bar with a solid background (like the phone layout already had), and the content area reserves room for it, so nothing sits or scrolls under them. The bar starts at the sidebar's edge and spans the full width when the sidebar is hidden; the "show sidebar" button stays clickable above it. Toasts start 72px from the top, below the bar. Checked at 1414px, 1000px and 380px.

16. ✅ **Completed — Sign-up showed a raw error for emails the API rejects**
    * The form shows "✓ Looks good" for an address like `name@example.test`, and the toast read "Email: value is not a valid email address: The part after the @-sign is a special-use or reserved name…".
    * **Done:** the API's validation handler (`backend/main.py`) now words email errors for people: reserved domains get "Please use a real email address. That domain is reserved and can't receive email.", and other bad addresses get "Please enter a valid email address." plus the validator's reason. This covers every endpoint that takes an email (sign-up, login, forgot password). Test: `test_invalid_email_gives_a_readable_message`.

### Found in a second browser pass on 2026-10-20

Checked and working: Mind Garden (plant, pin, search with highlighting, edit, delete with in-app confirmations), the Reframing studio including the distortion filter chip, "Should I do this?" (the Q shortcut, verdict, parking an activity as a to-do, and the 👍/👎 rating), Morning Plan (quick-add, triage, skip, "Done planning" into To-Dos), the Decision Matrix (example, save, first step to To-Dos, worth-it rating), Task Check-ins with custom questions, and all 9 Insight Lab tabs (the browser form's 24-hour limit and empty-input checks work).

Ownership checks hold everywhere except the timeline (#7): signed in as a second user, every `/{id}` route was tried with all 56 of the first user's object ids (GET, PUT, PATCH, DELETE), and none reached that user's data. Daily logs and goals also reject another user's category id.

Not yet tested: Snapshots and Time Capsule, Lotus Blossom, the weekly review ritual, Knowledge Vault (books, courses, quotes), Health (5 tabs), Growth Hub, Life Canvas, category edit/delete, goal detail (milestones, extend) and Manifestations, Profile (edit, export, change password, public profile), the notifications panel, keyboard shortcuts, and History's Daily Logs and Audit Trail tabs.

17. ✅ **Completed — Insight Lab time entries weren't checked on the server**
    * `POST /insights/time-entries` saved 500 hours, −8 hours and the date `"not-a-date"`. The 24-hour limit existed only in the browser form.
    * **Done:** Time Tracking, Screen Time and creative-session hours must be more than 0 and at most 24, and the API rejects a Time Tracking or Screen Time entry that would push a day past 24 hours (an edit doesn't count its own old hours). The form now counts hours already saved that day too ("Only 4h left on this day"). Every date-only field in `models/schemas.py`, plus to-do due dates and check-in dates, must be a real `YYYY-MM-DD` date; empty optional dates are still allowed and kept as sent. Health numbers (calories, macros, water, workout minutes, sets, reps, weights) can't be negative, and nutrition quality is 1–10. Entries saved before this (like the `"not-a-date"` one) are left as they are. Tests in `test_insight_validation.py` and `Insights.test.js`.

18. ✅ **Completed — No range or order checks on several forms**
    * Habit Graveyard saved a habit that ended a month before it started, Procrastination saved an entry dated Jan 1, 2030, and Task Check-ins saved check-in number −3.
    * **Done:** the API rejects an end date before its start date (Habit Graveyard, courses, reviews) and a future date on things that already happened: procrastination, triggers, bad decisions, regrets, life lessons, failures, meaning logs, abandoned habits, and completion dates on courses and bucket-list items. "Future" means after today in the user's timezone (`reject_future_dates` in `api/deps.py`). Planned dates (bucket-list targets, course start dates, goal deadlines) can still be in the future. Check-in numbers must be 1–99, which matches the form. The forms cap those date pickers at today, the end-date pickers can't go before the start date, and Habit Graveyard, Courses and Task Check-ins check before saving. Errors that involve two fields now read as a plain sentence ("The abandoned date can't be before the start date.") instead of "Body: Value error, …". Tests in `test_range_checks.py` and `Insights.test.js`.

19. ✅ **Completed — More of the UTC-date bug (see #9)**
    * Mind Garden times were 6 hours too old, and several date pickers defaulted to the UTC day.
    * **Done:** fixed by the timestamp offsets in #9. Every "today" default (Insight Lab, Health, Snapshots, Time Capsule, Growth Hub, Life Canvas, To-Dos, Manifestations, PDF export file name) now uses `localDate()` from `utils/dates.js`. Each one is computed when the form opens, so it doesn't go stale if the tab stays open overnight.

20. **Leaving the To-Dos page ends a running focus session without warning**
    * The elapsed time lives only in page memory (`Todos.js:28`), so it's lost on navigation or refresh and never recorded.
    * Switching the timer preset while paused also resets the elapsed time with no warning.
    * **Fix:** persist the running session (start time + task) so it survives navigation, and confirm before a preset change discards time.

21. **Task Check-ins: "Quick (5 questions)" shows only 4 questions.**

22. **Mind Garden filter and input issues**
    * "All" looks selected while the Pinned filter is still on, so searching "stuck" showed no results.
    * Submitting an empty thought gives no feedback.
    * Cmd+Enter doesn't submit.

23. **Morning Plan puts ratings on the wrong task**
    * Adding an item while rating another moves the new item to the front, so ratings already started went onto the wrong task.
    * **Fix:** add new items to the end (or key the in-progress ratings by item id, not position).

24. **Check-in verdict cards (Continue / Pause / Drop) aren't buttons**
    * Keyboard and screen-reader users can't select them.
    * **Fix:** render them as buttons (or radio inputs) with a visible focus state.

25. **"Log a Trigger" and "Log a Bad Decision" forms are taller than the window**
    * Their buttons are cut off.
    * **Fix:** make the modal body scroll and keep the buttons in a fixed footer.

26. **Smaller UI issues in Insight Lab**
    * In the Bad Decision form, the Domain dropdown crowds the next label.
    * The Weakness Map sliders use plain browser-blue styling, unlike the rest of the app.

### Smaller issues and gaps

* **"AI-generated patterns" label is wrong.** The dashboard's Behavioral Insights are rule-based checks in `backend/api/routers/dashboard.py`; no AI is involved. Rename the label.
* **Life Balance chart shows made-up data.** A new user with no logs sees "Mood: 5" for every category, and categories with no entries still show 5 after logging.
* **Email verification needs a login.** `/verify/:token` sits inside `PrivateRoute`, so opening the link on another device lands on the login page.
* **The login token is still returned in the response body.** `backend/api/routers/auth.py:81` and `:140` return `token` even though the browser now uses the httpOnly cookie; page scripts can read it. Drop it for browser clients.
* **Default categories don't match the copy.** The login page lists Mind/Body/Career/Social/Soul; new accounts get Mind/Body/Career/Finance/Spirit.
* **Category Consistency shows "0 / 0 days"** for the 30-day range on the dashboard.
* **Opening a log from search collapses everything.** All categories start collapsed, with no sign of which ones have entries.
* **After saving a log, the dashboard opens scrolled halfway down.**
* **Empty gratitude fields are saved** as `['', '', '']`.
* **Duplicate "Goal not found" toasts** when opening a missing goal (an effect that runs twice).
* **Deleting a category template always reports success.** `DELETE /categories/templates/{id}` (`backend/api/routers/categories.py:67`) returns `{"success": true}` and logs a "Deleted a category template" activity even when no template matched. Return 404 when nothing was deleted.

---

## ✅ Recently Completed Features

1. ✅ **Password reset.** It was the gap that actually locked users out.
2. ✅ **Global search (⌘K).** ⌘K / Ctrl+K (or the ⌕ button by the bell) opens a palette that jumps to pages and searches logs, goals, to-dos, thoughts, decisions, reframes, reviews, manifestations, snapshots, books, quotes, lotus boards and categories through `GET /search`. The input is escaped before it's used as a regex.
3. ✅ **"On this day" card on the dashboard.** `GET /dashboard/on-this-day` returns logs written on today's date (in the user's timezone) in each of the last 10 years. The card shows the highlight, a few entries and gratitude, lets you switch between years, and opens that day's log. Leap days fall back to Feb 28.
4. ✅ **Data export covers everything.** The export now uses the same collection list as account deletion (`USER_DATA_COLLECTIONS`), so lotus boards, reviews, task check-ins and the other missing modules are included. The profile export no longer includes verification or password-reset tokens.
5. ✅ **Morning Plan on the dashboard.** A "Today's plan" card shows how many to-dos are waiting to be triaged, or, once the day is planned, how many "do now" tasks are done and the open ones. It links to `/plan`.
6. ✅ **Category colors and icons are validated.** The Profile editor for them already existed. The backend now only accepts 1–24 six-digit hex colors and 1–24 short icons, and the editor won't remove the last one or go past the limit.
7. ✅ **Old planning notes merged here.** `to.md`, `ToDo.md`, `nextTOOdo.md`, `newFeatureinLife.md` and `NextTODO/` (about 1,700 lines, mostly repeats of each other or already built) are folded into "Other ideas" below, and the stray `backend/fix_schemas.py` and `backend/test_traceback.txt` are gone.
8. ✅ **Weekly review ritual.** On the Reviews page's Weekly tab, "Start weekly review" opens a 5-step flow: a look back (last week's focus, days logged, mood, highlights, quick checks and decisions), then wins, struggles, learnings and next week's focus. A week's existing review opens for editing, and the API rejects a second review for the same period. A notification nudges for it from Saturday, and on Monday for the week just ended. "Goals completed" in review stats now counts only goals finished in that period.
9. ✅ **"Should I do this?" time insights.** Quick checks can now record an expected time when you start something and the real time in the evening review (both optional, one tap). "Your patterns" on `/focus` adds: how long "quick" things (≤15 min expected) really take, unplanned time in the last 7 days vs. the week before, and the category whose logged time changed most week over week.
10. ✅ **Dashboard speed measured.** With a 3-year heavy user (about 1,100 logs, 6 entries each) among 300 other users (61k logs total), `/dashboard` takes 14 ms for 30 days and 29 ms for 365 days uncached, and the other dashboard endpoints take 3–10 ms. No caching changes were needed. The one problem was that `todos` had no index, so every to-do query scanned all users' to-dos; it now has `(user_id, status, due_date)` and `(user_id, created_at)` indexes.
11. ✅ **Large page files split.** `Profile.js` (1,424 → 333 lines), `Todos.js` (1,313 → 410) and `Insights.js` (1,043 → 62) now live mostly in `components/profile/`, `components/todos/` and `components/insights/`. Each Insight Lab tab is its own file sharing a `useInsightList` hook, and Time Tracking and Screen Time share one `HoursLogTab`. Each tab now loads its data when opened instead of all nine at once. Along the way: the theme editor's inline `<style>` tags, which made every hovered element on the page grow or shift, became scoped CSS classes, and failed Insight Lab deletes now show an error. Added tests for all three pages and the Markdown export.

---

## 🧭 What to Do Next (in order)

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

### Not needed

* **PWA / installable app.** Decided against on 2026-10-20; not planned.
