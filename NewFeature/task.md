# Growth Timeline & Calendar Implementation

- `[/]` **Backend (FastAPI)**
  - `[x]` Create `backend/api/routers/timeline.py` with `GET /api/timeline`
  - `[x]` Implement aggregation logic for logs, goals, manifestations, and snapshots
  - `[x]` Map to unified `Event` schema and sort by date
  - `[x]` Register `timeline` router in `backend/api/main.py`
- `[/]` **Frontend (React)**
  - `[x]` Create `CalendarTimeline.js` page component
  - `[x]` Build `CalendarView.js` grid component
  - `[x]` Build `JourneyFeed.js` timeline component
  - `[x]` Build `DayDetailSidePanel.js` drawer component
  - `[x]` Integrate `timeline` page into App navigation
- `[/]` **Verification**
  - `[x]` Test unified API with sample user data
  - `[x]` Verify day-click side panel functionality
  - `[x]` Ensure toggle between Calendar and Timeline works smoothly
