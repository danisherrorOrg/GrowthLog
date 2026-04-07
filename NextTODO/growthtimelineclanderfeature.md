# Growth Timeline & Calendar — Feature Specification
 
> A unified visual timeline and calendar that surfaces deadlines, completed goals, milestones, streaks, snapshots, and daily logs — giving users a bird's-eye view of their entire growth journey in one place.
 
---
 
## Overview
 
Right now GrowthLog's goals, manifestations, snapshots, and daily logs all live in separate views. Users have no single place to ask:
 
> *"What's coming up? What have I achieved? How does my past connect to my future?"*
 
The Growth Timeline & Calendar solves this by combining a **monthly calendar view** (for day-to-day awareness) and a **vertical timeline view** (for the full journey arc) — all powered by data already in the existing schema. No AI required.
 
---
 
## Views
 
### 1. Calendar view (default)
 
A standard monthly calendar grid where each day is enriched with growth data.
 
```
< April 2025 >
 
Mon   Tue   Wed   Thu   Fri   Sat   Sun
       1     2     3     4     5     6
             🔥         ✅              
 7     8     9    10    11    12    13
 🔥   🔥    🔥   🔥    🔥   📸        
14    15    16    17    18    19    20
 🔥         🔥   ⚠️    🔥              
21    22    23    24    25    26    27
             🎯                   🔥   
28    29    30
 🔥   ⏳                              
```
 
**Day cell contents (layered, up to 3 indicators per cell):**
 
| Indicator | Meaning | Color |
|---|---|---|
| 🔥 Filled dot | Logged that day (streak active) | Green |
| ✅ Check badge | Goal completed on this day | Teal |
| 📸 Camera dot | Snapshot taken | Purple |
| 🎯 Target dot | Goal deadline (upcoming) | Amber |
| ⚠️ Warning dot | Deadline in ≤3 days | Red |
| ⏳ Clock dot | Goal overdue | Red (muted) |
| ★ Star | Milestone earned | Gold |
 
**Clicking a day** opens a side panel (not a new page) showing:
- That day's log entries (mood, energy, categories)
- Any goals due or completed that day
- Any snapshot taken that day
- Milestones earned that day
 
---
 
### 2. Timeline view (journey arc)
 
A vertical chronological feed of all significant events, scrollable from account creation to today (and forward to upcoming deadlines).
 
```
─────────────────────────────────────────
  UPCOMING
─────────────────────────────────────────
 
  ⏳  May 15       Read 12 books this year
                   Goal deadline · 23 days left
                   Progress: 7/12 ██████░░░░ 58%
 
  🎯  May 30       Launch side project MVP
                   Goal deadline · 38 days left
                   Progress: 40% ████░░░░░░
 
─────────────────────────────────────────
  THIS MONTH · April 2025
─────────────────────────────────────────
 
  ★   Apr 22       30-day streak milestone
                   "Consistency King" badge earned
 
  📸  Apr 13       Snapshot #4 taken
                   Radar: Health ↑ Career ↑ Social ↓
 
  ✅  Apr 09       Goal completed
                   "Meditate 21 days in a row"
                   Took 28 days · Started Mar 12
 
─────────────────────────────────────────
  MARCH 2025
─────────────────────────────────────────
 
  🎯  Mar 12       "Meditate 21 days" goal started
  📸  Mar 01       Snapshot #3 taken
  ✅  Feb 28       Goal completed: "Finish DSA course"
 
  ...
 
─────────────────────────────────────────
  ACCOUNT START · Jan 01 2025
─────────────────────────────────────────
```
 
---
 
## Feature breakdown
 
### A. Goal lifecycle tracking
 
Every goal shows its full lifecycle on the timeline:
 
```
[Created] ──────────────── [Deadline]
     |                         |
  Mar 12                    Apr 30
     |                         |
     ▼                         ▼
  Goal started            ✅ Completed on Apr 09
  "Meditate 21 days"      (21 days early)
```
 
**States displayed:**
 
| State | Display |
|---|---|
| Not started | Gray dot with start date |
| In progress | Amber dot + progress bar |
| On track | Green dot + "X days left" |
| At risk (≤3 days, <75% progress) | Red dot + warning badge |
| Overdue | Red muted dot + "X days overdue" |
| Completed (on time) | Teal check + completion date |
| Completed (early) | Teal check + "X days early" badge |
| Completed (late) | Teal check + "X days late" badge |
| Abandoned | Gray strikethrough |
 
---
 
### B. Deadline awareness layer
 
A dedicated **"Upcoming"** section at the top of the timeline showing all future deadlines, sorted by urgency.
 
- Goals due in ≤7 days: shown with red urgency ring
- Goals due in 8–30 days: shown in amber
- Goals due in 30+ days: shown in default color
- Overdue goals pinned to the very top with a red banner
- Each upcoming goal shows: name, deadline, days remaining, progress bar, category tag
 
**Urgency notification hooks (via PWA + email):**
 
```
30 days before deadline → "You have a goal due next month"
 7 days before deadline → "Deadline approaching: [goal name]"
 1 day before deadline  → "Due tomorrow: [goal name]"
 Day of deadline        → "Today is the deadline for [goal name]"
 1 day after (if missed)→ "You missed a deadline. Mark complete or extend?"
```
 
---
 
### C. Snapshot markers
 
Snapshots appear on both views as purple markers. Clicking one:
 
- Opens the snapshot radar chart inline in the side panel
- Shows delta vs. the previous snapshot ("Health +1.2 since last snapshot")
- "Compare with today" button triggers the snapshot diff view
 
---
 
### D. Milestone markers
 
Auto-generated milestones appear on the timeline as star events:
 
| Milestone | Trigger |
|---|---|
| First log | First `daily_log` entry created |
| 7-day streak | `current_streak == 7` |
| 30-day streak | `current_streak == 30` |
| 100-day streak | `current_streak == 100` |
| First goal completed | First goal marked done |
| 5 goals completed | `completed_goals_count == 5` |
| First snapshot | First snapshot created |
| Full week logged | All 7 days in a week have entries |
| All categories logged | All categories logged in a single day |
| Account anniversary | 1 year since `user.created_at` |
 
---
 
### E. Filters & views
 
A filter bar above both views:
 
```
[All] [Goals] [Snapshots] [Milestones] [Logs] [Deadlines]
 
[This month ▾]   [All categories ▾]   [Search events...]
```
 
- Filter by event type (goals, snapshots, milestones, log days)
- Filter by category (e.g. show only Career-related events)
- Date range picker for the timeline view
- Search by goal/event name
 
---
 
### F. Mini-calendar widget (Dashboard)
 
A compact version of the calendar embedded on the main Dashboard — not a full page, just a 7-day strip showing the current week.
 
```
Mon  Tue  Wed  Thu  Fri  Sat  Sun
 🔥   🔥   🔥   ⚠️   🎯   —    —
 7    8    9   10   11   12   13
```
 
- Clicking a day opens the same side panel as the full calendar
- "View full calendar" link → `/calendar` page
- Shows streak count for the week inline
 
---
 
## Data sources (existing schema — no new collections needed)
 
| Timeline event | Source collection | Key fields |
|---|---|---|
| Log day (streak dot) | `daily_logs` | `date`, `mood`, `energy` |
| Goal created | `goals` | `created_at`, `title`, `category` |
| Goal deadline | `goals` | `deadline`, `progress`, `status` |
| Goal completed | `goals` | `completed_at`, `status` |
| Snapshot taken | `snapshots` | `created_at`, `scores` |
| Milestone earned | `user_profile` or new `milestones` field | `type`, `earned_at` |
 
**One new field needed on `goals`:**
```json
{
  "abandoned_at": "ISODate | null"
}
```
 
**One new sub-document needed on `user_profile`:**
```json
{
  "milestones": [
    {
      "type": "streak_30",
      "earned_at": "ISODate",
      "seen": false
    }
  ]
}
```
 
---
 
## API endpoints
 
```
GET  /api/timeline                     → all events, paginated, sorted by date desc
GET  /api/timeline?type=goal,snapshot  → filtered by event type
GET  /api/timeline?category=career     → filtered by category
GET  /api/calendar?month=2025-04       → all events for a given month (for calendar grid)
GET  /api/timeline/upcoming            → future deadlines only, sorted by urgency
PATCH /api/goals/{id}/extend           → extend a deadline (from overdue prompt)
PATCH /api/goals/{id}/abandon          → mark goal as abandoned
```
 
---
 
## Frontend components
 
```
/pages
  /calendar                    → full calendar + timeline page
 
/components
  /calendar
    CalendarGrid.jsx            → monthly grid with day cells
    DayCell.jsx                 → single day cell with indicator dots
    DaySidePanel.jsx            → slide-in panel for day detail
    WeekStrip.jsx               → mini 7-day Dashboard widget
 
  /timeline
    TimelineView.jsx            → vertical scrollable timeline
    TimelineSection.jsx         → month/section header ("April 2025")
    TimelineEvent.jsx           → single event card (goal, snapshot, milestone)
    UpcomingDeadlines.jsx       → top urgency section
    GoalProgressBar.jsx         → reusable progress bar with milestone markers
 
  /shared
    EventFilterBar.jsx          → [All] [Goals] [Snapshots] etc.
    DeadlineUrgencyBadge.jsx    → "3 days left" / "Overdue" badge
```
 
---
 
## UX details
 
### Side panel (day detail)
- Slides in from the right on desktop, slides up from bottom on mobile
- Does not navigate away from the calendar — preserves context
- Shows: log summary, goals due/completed, snapshot if exists, milestones earned
- "Edit log" button → opens the existing Daily Check-in form pre-filled
 
### Overdue goal prompt
When a user opens the app and has an overdue goal, show a non-intrusive banner:
 
```
⚠️  "Launch side project MVP" was due 3 days ago.
    [Mark complete]   [Extend deadline]   [Abandon]
```
 
- "Mark complete" → sets `completed_at = today`, `status = "completed_late"`
- "Extend deadline" → inline date picker, updates `deadline`
- "Abandon" → sets `abandoned_at = today`, `status = "abandoned"`, adds strikethrough on timeline
 
### Empty state (new users)
When the timeline is empty, show a warm empty state:
 
```
Your growth journey starts here.
 
You haven't set any goals or logged any days yet.
Every entry you make will appear on this timeline.
 
[Set your first goal]   [Log today]
```
 
---
 
## Page layout
 
```
/calendar
 
┌─────────────────────────────────────────────────┐
│  Growth Timeline & Calendar                      │
│                                                 │
│  [Calendar] [Timeline]          [Filters ▾]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️  UPCOMING DEADLINES (2)                      │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎯 Read 12 books · Due May 15 · 23 days  │   │
│  │    ██████░░░░  7/12                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ◀  April 2025  ▶                               │
│  ┌────────────────────────────────────────┐    │
│  │ Mon  Tue  Wed  Thu  Fri  Sat  Sun      │    │
│  │  🔥   🔥   ✅   🔥   📸   —    —       │    │
│  │  ...                                   │    │
│  └────────────────────────────────────────┘    │
│                                                 │
│  [Switch to Timeline view]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```
 
---
 
## Build priority
 
| Sub-feature | Effort | Value | Build order |
|---|---|---|---|
| Calendar grid (log dots only) | Low | High | 1st |
| Goal deadline markers on calendar | Low | Very high | 1st |
| Day side panel | Medium | High | 2nd |
| Upcoming deadlines section | Low | Very high | 2nd |
| Overdue goal prompt | Low | High | 2nd |
| Vertical timeline view | Medium | High | 3rd |
| Milestone markers | Medium | Medium | 3rd |
| Snapshot markers + diff | Medium | High | 3rd |
| Filters + search | Medium | Medium | 4th |
| Mini calendar Dashboard widget | Low | High | 4th |
| Deadline notifications (PWA) | Medium | High | 4th |
 
Start with the calendar grid + goal deadline markers + upcoming deadlines section. That alone is a shippable, high-value v1 of this feature in roughly 3–4 days of work.
 
---
 
## What this replaces / enhances
 
| Current experience | With Growth Timeline & Calendar |
|---|---|
| Goals list (flat, no dates visible) | Goals shown on calendar with deadlines + progress |
| No deadline awareness | Urgency-sorted upcoming section + notifications |
| Snapshots buried in a separate page | Snapshot markers visible on calendar, clickable inline |
| Milestones shown only at moment of earning | Full milestone history on timeline |
| No sense of journey arc | Vertical timeline from day 1 to today |
| Log history = plain list | Log days visible as streak dots on calendar grid |
 
---
 
*All data for this feature already exists in the current schema. The only additions are `goals.abandoned_at` and `user_profile.milestones[]`. No AI, no new infrastructure, no new collections required beyond those two fields.*
 