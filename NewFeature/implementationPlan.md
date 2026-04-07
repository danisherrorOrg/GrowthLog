# Implementation Plan — Growth Timeline & Calendar

This plan outlines the steps to build a unified Growth Timeline and Calendar feature. This will give users a single, birds-eye view of their daily logs, goal deadlines, completions, snapshots, and manifestations.

## User Review Required

> [!IMPORTANT]
> - **Unified API Integration**: I propose a single backend endpoint `GET /api/timeline` that aggregates and sorts all events (logs, goals, manifestations, snapshots). This avoids multiple requests on the frontend and ensures data consistency.
> - **Indicators**: We'll use the icons (🔥, ✅, 📸, 🎯) defined in the specification. Should these be customizable by the user later via the Design Tokens we discussed?
> - **Navigation**: I will add a new "Timeline" section to the App sidebar or dashboard for quick access.

---

## Proposed Changes

### Backend (FastAPI)

#### [NEW] [timeline.py](file:///Users/danishmahajan/Desktop/projects/growthlog/backend/api/routers/timeline.py)
- Create a new router for timeline-specific logic.
- **Endpoint**: `GET /api/timeline`
  - Parameters: `month` (e.g., "2025-04") or `range` (start/end).
  - Logic: 
    1. Fetch `daily_logs` where `date` is in the period.
    2. Fetch `goals` where `current_deadline`, `completed_at`, or `created_at` falls in the period.
    3. Fetch `manifestations` where `target_date`, `completed_at`, or `created_at` falls in the period.
    4. Fetch `snapshots` where `date` falls in the period.
    5. Aggregate all items into a unified `Event` schema: `{ id, type, date, title, status, category_id, description }`.
    6. Sort and return as a combined list.

#### [MODIFY] [main.py](file:///Users/danishmahajan/Desktop/projects/growthlog/backend/api/main.py)
- Register the new `timeline` router.

---

### Frontend (React + Recharts)

#### [NEW] [CalendarTimeline.js](file:///Users/danishmahajan/Desktop/projects/growthlog/frontend/src/pages/CalendarTimeline.js)
- Main page hosting the dual-view interface.
- View Toggler: **Monthly Calendar** | **Vertical Timeline**.
- Shared state for the currently selected month/date range.

#### [NEW] [CalendarView.js](file:///Users/danishmahajan/Desktop/projects/growthlog/frontend/src/components/calendar/CalendarView.js)
- Renders a 7-column grid for the selected month.
- Displays indicator dots (🔥, ✅, 📸, 🎯) in the day cells.
- Highlights "Today" and handles day clicks.

#### [NEW] [JourneyFeed.js](file:///Users/danishmahajan/Desktop/projects/growthlog/frontend/src/components/timeline/JourneyFeed.js)
- A vertical list of events (cards) with a connecting line.
- Grouped by weeks or months for better scannability.
- Shows progress bars for "active" goals directly in the feed.

#### [NEW] [DayDetailSidePanel.js](file:///Users/danishmahajan/Desktop/projects/growthlog/frontend/src/components/shared/DayDetailSidePanel.js)
- A slide-in drawer to show full details of everything logged on a specific day without leaving the page context.

---

## Open Questions

- **Date Range Limit**: Should we load the entire history by default, or paginate it? (Recommended: Load the current month and the previous month together).
- **Navigation Location**: Should the "Timeline" be its own top-level menu item, or replace parts of the existing "Growth" page?

---

## Verification Plan

### Automated Tests
- Test the `GET /api/timeline` endpoint with mocked Mongo documents (logs, goals, snapshots) to ensure they are correctly unified and sorted.
- Validate that types (`active`, `completed`) map and filter correctly.

### Manual Verification
1. Create a Goal with a deadline.
2. Log a daily entry.
3. Verify that both markers appear on the Calendar View.
4. Switch to Timeline View and confirm both "events" appear in chronological order.
5. Click a day on the calendar and verify the Side Panel shows the correct detail.
