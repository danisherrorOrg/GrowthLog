# GrowthLog — Non-AI Features & Daily-Use Feature Roadmap
 
> Everything buildable without LLM integration, plus high-engagement daily features designed for all user types: solo devs, students, general growth users, and professionals.
 
---
 
## Part A — Non-AI Infrastructure & Product Features
 
### Phase 1 — Foundation (Weeks 1–2)
 
#### 1. Real SMTP + email templates
Replace placeholder in `utils/email.py` with SendGrid or Resend.
 
- Transactional emails: verification, password reset, nudges
- HTML templates with Organic Mastery branding
- Unsubscribe tokens + per-user email preference centre
- Weekly digest email (non-AI version: just a structured summary of raw stats)
 
---
 
### Phase 2 — Daily habit stickiness (Weeks 3–4)
 
#### 2. Voice-to-log
Web Speech API button in Daily Check-in. No LLM — pure browser-native.
 
- Mic toggle in the check-in form
- Keyword matching: "tired" → low energy, "productive" → Career category
- Fallback to plain text if recognition fails
- Optional: store transcript alongside the log entry
 
#### 3. PWA + offline mode
Convert React frontend to a full Progressive Web App.
 
- `manifest.json` + service worker via Workbox or `vite-plugin-pwa`
- IndexedDB queue for `daily_logs` written while offline
- Background sync on reconnect
- "Install app" prompt on mobile — feels native
 
#### 4. Quick-log widget
Floating action button for a 15-second micro-log.
 
- Mood slider + energy slider + one text highlight
- Bottom sheet UI, dismisses instantly
- POSTs to existing `POST /api/daily-logs` with `quick_log: true` flag
- Streak-preservation confirmation ("Habit kept ✓")
 
#### 5. Dynamic design tokens
Move hardcoded colors/icons/prompts from code into MongoDB.
 
- `user_settings.design_tokens` field
- `GET /api/settings/design` serves tokens as CSS variables
- Settings UI panel for customization
- Per-category color and icon picker
 
---
 
### Phase 3 — Engagement & sharing (Weeks 5–6)
 
#### 6. On This Day memory feed
Pure MongoDB date query — easiest high-value feature in the list.
 
- Query `daily_logs` + `snapshots` for same calendar date in prior years
- Dashboard card: "A year ago you felt..." 
- Estimated build time: ~1 day
 
#### 7. Shareable Growth Cards
Recharts → canvas export. Zero AI involved.
 
- `html2canvas` captures the dashboard visualization
- Branded card: top categories, longest streak, biggest milestone
- Web Share API → fallback to clipboard copy
- Opt-in from the public profile page (`/u/:userId`)
 
#### 8. Accountability Hub
Partner linking with read-only goal sharing.
 
- `accountability_links` collection (already in `DifferentSchema.md`)
- `POST /api/accountability/invite` with signed invite link
- Read-only partner view of goals and manifestations
- Weekly summary email to partner via SMTP layer
 
---
 
### Phase 4 — Scale & monetization (Weeks 7–8)
 
#### 9. BYOD — Bring Your Own Database
Per-user MongoDB URI with connection isolation.
 
- `byod_mongo_uri` (encrypted at rest) in user profile
- Per-request `AsyncIOMotorClient` factory
- Connection pool cap per user
- Settings UI with connection test button
 
#### 10. PDF Growth Book export
Annual summary PDF queued as a background job.
 
- `weasyprint` or Playwright for HTML → PDF rendering
- `exports` collection to track job status
- Template: radar overlay, streak heatmap, manifestation timeline
- `GET /api/exports/{job_id}` polling + download URL
 
#### 11. Full-stack Docker Compose
Add Nginx + React build + Redis to the existing backend-only compose.
 
- Redis replaces in-memory cache in `core/cache.py` via `aioredis`
- Nginx reverse proxy for frontend + API
- Healthchecks + named volumes for persistence
 
#### 12. Freemium gating
`plan: "free" | "premium"` field on user schema + FastAPI dependency.
 
| Feature | Free | Premium |
|---|---|---|
| Core logging | ✓ | ✓ |
| Streaks + heatmaps | ✓ | ✓ |
| Radar charts | ✓ | ✓ |
| PDF Growth Book | — | ✓ |
| Unlimited manifestations | Up to 5 | Unlimited |
| Accountability Hub | — | ✓ |
| BYOD | — | ✓ |
| Custom public profile domain | — | ✓ |
 
#### 13. Other infrastructure
- `slowapi` rate limiting on all write endpoints
- JWT refresh token rotation
- Prometheus metrics endpoint + Grafana (or metrics collection)
- React-i18next — Hindi + English to start
- Playwright E2E tests for critical flows
 
---
 
## Part B — Cool Daily-Use Features (No AI Required)
 
These are the features users open the app *for*, every single day. Designed for all four user types.
 
---
 
### 🔥 Streaks & Gamification
 
#### 14. Streak shield (streak freeze)
Users earn one "shield" every 7-day streak. Using it prevents a streak from breaking on a missed day — like Duolingo's streak freeze.
 
- `streak_shields: int` field on user profile
- Shields earned automatically at 7 / 14 / 30-day milestones
- UI: shield icon glows when one is available, burns on use
- Push notification (PWA): "Your shield saved your streak!"
 
#### 15. XP + level system
Every logged entry earns XP. Levels unlock cosmetic rewards (profile badges, card themes).
 
- XP formula: `base_xp × category_multiplier × streak_bonus`
- 10 levels with names tied to the Organic Mastery theme (e.g. Seedling → Root → Branch → Canopy)
- Level badge displayed on public profile
- XP history stored in `daily_logs` (no new collection needed)
 
#### 16. Milestone cards
Auto-generated celebration cards at key moments.
 
- Triggers: 7-day streak, first goal completed, first snapshot, 100 log entries, 30-day all-category consistency
- Full-screen modal with confetti animation (canvas-confetti, 3kb)
- One-tap share via Web Share API
- Milestone history page
 
#### 17. Habit intensity heatmap (GitHub-style, per category)
Extend the existing heatmap to show per-category intensity, not just presence.
 
- Color depth = average score that day (not just logged/not logged)
- Toggle between categories from a pill selector
- Year / 90-day / 30-day view switcher
- Click a day to open that day's log in a side panel
 
---
 
### 📓 Logging & Journaling
 
#### 18. Daily intention setter (morning mode)
A separate "morning check-in" flow that runs before the evening log.
 
- Prompted at a user-set time via PWA notification
- Three fields: today's focus, one thing to protect, energy forecast
- Stored in `daily_logs.morning_intention`
- Evening log shows morning intention as a reference ("Did you protect your focus time?")
 
#### 19. Evening reflection prompts (rotating, non-AI)
A curated bank of 100+ prompts that rotate daily — no LLM needed.
 
- Prompt categories: gratitude, challenge, learning, relationships, creativity
- User can pin a prompt they love or skip one they dislike
- "Random" button for variety
- Prompts stored in MongoDB `prompts` collection (already partially exists in `prompts.py`)
 
#### 20. Rich entry editor
Upgrade the log text fields from plain textarea to a lightweight rich editor.
 
- Bold, italic, bullet lists, inline code (for devs logging technical work)
- Use `tiptap` (headless, fully customizable, 50kb)
- Entries render as formatted text in the log history view
- Searchable by content (MongoDB text index)
 
#### 21. Log search & full-text recall
"When was I last really energized about work?"
 
- MongoDB `$text` index on `daily_logs.entries.content`
- Search bar in the Log History page with date + category filters
- Highlighted keyword matches in results
- Saved searches (stored in `user_settings`)
 
#### 22. Mood & energy timeline (intraday)
Allow multiple check-ins per day to track how mood/energy shifts.
 
- "Add another check-in" button (up to 4 per day)
- Intraday line chart on the day detail view
- Aggregate to daily average for existing streak/heatmap logic
- Shows patterns like "always low energy after lunch"
 
---
 
### 📊 Visualizations & Stats
 
#### 23. Weekly scorecard
A clean summary card generated every Monday for the prior week.
 
- Scores per category (average of all logs that week)
- Delta vs. prior week (↑ +0.4 in Health)
- Best day, worst day, longest focus block
- Delivered as a Dashboard card + optional email (via SMTP layer)
 
#### 24. Life balance wheel (interactive)
A tap-to-explore version of the existing radar chart.
 
- Click a radar segment to expand: shows that category's 30-day trend inline
- Drag the segment endpoint to set a personal target — shows gap vs. current
- "Balance score" metric: how evenly distributed are your scores? (standard deviation of category averages)
- Targets stored in `categories.target_score`
 
#### 25. Streak leaderboard (friends only)
A private leaderboard among accountability partners.
 
- Only shows users you're linked with via Accountability Hub
- Ranks by: current streak, total log days, XP, balance score
- Refreshes daily
- Not public — privacy-first
 
#### 26. Category deep-dive page
One page per category with its full history.
 
- 1-year heatmap for that category only
- Month-over-month bar chart
- Personal records: highest score, longest streak, most logged month
- All journal entries for that category, searchable
 
#### 27. Goal progress tracker (visual)
Transform the existing goals into a visual progress bar system.
 
- Progress bar with milestone markers (25%, 50%, 75%, 100%)
- "Pace" indicator: on track / behind / ahead (based on created date vs. deadline)
- Log entries that mention the goal auto-linked (keyword match)
- Goal completion rate metric on the profile
 
#### 28. Snapshot diff view
Side-by-side radar comparison of any two snapshots (already partially built).
 
- Extend to support selecting any two dates from a dropdown
- Highlight which categories improved / declined / stayed flat
- "Days between snapshots" and "net change per category" stats
- Export as image (canvas → PNG)
 
---
 
### 🤝 Social & Accountability
 
#### 29. Public profile 2.0
Enhance the existing `/u/:userId` page.
 
- Customizable sections: show/hide streak, radar, goal count, bio
- "Currently working on" widget (pinned goal or manifestation)
- Follow button (stores in `follows` collection) — feed-less, just a count
- Profile completion score with nudge ("Add a bio to complete your profile")
 
#### 30. Accountability check-ins
Structured weekly check-in between accountability partners.
 
- Both partners answer 3 fixed questions: win, struggle, focus for next week
- Answers visible to each other only
- Streak for completing check-ins together
- Missed check-in sends a gentle nudge email
 
#### 31. Community templates gallery (opt-in)
Users publish anonymized category + goal templates to a public gallery.
 
- "Use this template" clones it into the user's account
- Templates tagged by: goal type, time horizon, user type (student / professional / etc.)
- Simple upvote system (no comments — keeps it clean)
- Moderated via a `status: "pending" | "approved" | "rejected"` field
 
#### 32. Anonymous aggregate stats ("People like you")
Show anonymized aggregate data to motivate users.
 
- "Users with a 30-day streak log Health 40% more than those without"
- "Most logged category on Sundays: Relationships"
- Computed as a daily background job, cached
- Shown as "Growth Insights" cards on the Dashboard
 
---
 
### ⚡ Everyday Delight & Polish
 
#### 33. Daily quote / micro-prompt (contextual)
Surface a rotating quote or micro-prompt on the Dashboard, contextual to today's data.
 
- If streak is at risk: motivational prompt
- If a category hasn't been logged in 5 days: gentle nudge for that category
- If it's Monday: weekly intention prompt
- All rule-based, no AI. Prompts stored in `prompts` collection
 
#### 34. Focus timer (Pomodoro-style)
A built-in 25-minute focus timer that logs to a category when done.
 
- Start timer → select category → work → timer ends → auto-creates a log entry
- Session count tracked per day
- "Focus sessions today: 3" shown on Dashboard
- Stores as `entry_type: "focus_session"` in `daily_logs`
 
#### 35. Keyboard shortcuts
Power-user feature, especially for devs and students.
 
- `N` → new log entry
- `Q` → quick-log widget
- `/` → search
- `S` → snapshot
- `?` → shortcut help modal
- Shortcut map stored in `user_settings.shortcuts` (customizable)
 
#### 36. Dark / light / custom themes
Beyond the dynamic design tokens — three pre-built themes.
 
- Light (default Organic Mastery)
- Dark (deep green/charcoal)
- Minimal (monochrome, no color fills)
- System preference auto-detect
- Theme stored in `user_settings.theme`
 
#### 37. Notification preference centre
Full control over every notification type.
 
- Daily check-in reminder (time picker)
- Streak at-risk alert (toggle)
- Weekly scorecard email (toggle)
- Accountability check-in reminder (toggle)
- Stored in `user_settings.notifications`
- Delivered via PWA push + email (SMTP layer)
 
#### 38. "What should I log today?" prompt
A zero-friction entry point for days when the user doesn't know where to start.
 
- Shows the category with the lowest recent average ("Your Health score has dropped this week")
- Or the category not logged in the longest ("You haven't logged Learning in 4 days")
- One tap → opens that category's log field pre-selected
- Pure rule-based, no AI
 
#### 39. Log streak calendar (full year view)
A GitHub contribution graph-style full-year calendar on the profile page.
 
- Each cell = one day, colored by log completeness (all categories vs. partial vs. none)
- Click a cell to open that day's log
- "Most consistent month" computed and displayed below
- Exportable as PNG for sharing
 
#### 40. Onboarding flow with starter templates
Replace the blank-slate first experience with guided setup.
 
- Step 1: pick user type (Student / Developer / Professional / General)
- Step 2: choose a starter template (pre-built categories + goals)
- Step 3: set daily reminder time
- Step 4: first quick-log to feel the habit immediately
- Templates stored in `category_templates` (already in schema)
 
---
 
## Feature priority matrix (non-AI only)
 
| Feature | Effort | Daily-use value | Build first? |
|---|---|---|---|
| Real SMTP | Low | High (unblocks everything) | ✅ Yes |
| On This Day feed | Very low | High | ✅ Yes |
| Quick-log widget | Low | Very high | ✅ Yes |
| Streak shield | Low | Very high | ✅ Yes |
| Daily intention setter | Low | Very high | ✅ Yes |
| Evening prompts rotation | Low | High | ✅ Yes |
| Weekly scorecard card | Medium | High | ✅ Yes |
| PWA + offline mode | Medium | Very high | ✅ Yes |
| XP + level system | Medium | High | Soon |
| Focus timer | Medium | High | Soon |
| Voice-to-log | Medium | High | Soon |
| Log search | Medium | High | Soon |
| Life balance wheel | Medium | High | Soon |
| Shareable Growth Cards | Medium | Medium | Soon |
| Accountability Hub | High | High | Later |
| PDF Growth Book | High | Medium | Later |
| Community templates | High | Medium | Later |
| BYOD | High | Low (niche) | Later |
 
---
 
*None of the features in Part B require an LLM, external AI API, or any library beyond what's already in the stack. They're all buildable on the existing FastAPI + MongoDB + React + Recharts foundation.*
 