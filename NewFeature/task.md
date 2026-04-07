# Growth Timeline & Calendar Implementation

- `[/]` **Backend (FastAPI)**
  - `[ ]` Create `backend/api/routers/timeline.py` with `GET /api/timeline`
  - `[ ]` Implement aggregation logic for logs, goals, manifestations, and snapshots
  - `[ ]` Map to unified `Event` schema and sort by date
  - `[ ]` Register `timeline` router in `backend/api/main.py`
- `[ ]` **Frontend (React)**
  - `[ ]` Create `CalendarTimeline.js` page component
  - `[ ]` Build `CalendarView.js` grid component
  - `[ ]` Build `JourneyFeed.js` timeline component
  - `[ ]` Build `DayDetailSidePanel.js` drawer component
  - `[ ]` Integrate `timeline` page into App navigation
- `[ ]` **Verification**
  - `[ ]` Test unified API with sample user data
  - `[ ]` Verify day-click side panel functionality
  - `[ ]` Ensure toggle between Calendar and Timeline works smoothly
