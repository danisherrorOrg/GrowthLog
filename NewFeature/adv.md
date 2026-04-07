# Advanced Growth Timeline Implementation Plan

This plan details the implementation of a full suite of enhancements for the GrowthLog timeline, turning it from a simple list into a professional growth insights engine.

## User Review Required

> [!IMPORTANT]
> - **Pagination Strategy**: Since the timeline aggregates from 5 separate collections, I'll implement pagination by fetching a larger window of events and slicing the sorted result on the server. This ensures perfect chronological order while keeping responses lean.
> - **Search Methodology**: Keyword search will leverage MongoDB's `$regex` operator on the backend for titles, highlights, and descriptions.

---

## Proposed Changes

### Backend (FastAPI)

#### [MODIFY] [timeline.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/timeline.py)
- **New Query Parameters**: 
  - `q`: For keyword searching across all events.
  - `category_ids`: Comma-separated list for filtering.
  - `limit`: Number of events per page (Default: 20).
  - `skip`: Offset for pagination (Default: 0).
- **Enrichment Logic**: 
  - Ensure category IDs are used to filter documents in the initial DB queries where possible (Daily Logs, Goals).
  - Implement a manual filter for search keywords if they don't match the DB query context easily.
- **Pagination**: Return a subset of the aggregated and sorted `events` list.

---

### Frontend (React)

#### [MODIFY] [CalendarTimeline.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/CalendarTimeline.js)
- **State Management**: Add `searchQuery`, `activeFilters`, and `infiniteScroll` state.
- **Filter Bar**: Implement a beautiful, floating search and filter interface atop the timeline.
- **Scroll Management**: Add an `IntersectionObserver` or scroll listener to trigger "load more" when the user reaches the bottom.

#### [MODIFY] [JourneyFeed.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/components/timeline/JourneyFeed.js)
- **Growth Insights**: Add a daily highlight card at the top of each date group (e.g., "3 Areas of Focus", "Mood Average").
- **Animations**: Implement CSS Keyframe animations for a "Staggered Entry" effect when cards appear.
- **Quick Action**: Add a subtle `+` button on cards to quickly add a reflection log to that specific category.

#### [MODIFY] [DayDetailSidePanel.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/components/shared/DayDetailSidePanel.js)
- Update to support a "Quick Add Reflection" mode when triggered from the timeline cards.

---

## Verification Plan

### Automated Tests
- Extend `tests/test_timeline.py` to cover:
  - `q` parameter (keyword search).
  - `category_ids` parameter (multiple filters).
  - `limit`/`skip` (pagination boundary checks).

### Manual Verification
1.  **Search**: Enter a specific goal name and verify only that goal appears.
2.  **Filter**: Toggle "Mind" category and verify only mind-related logs and goals show.
3.  **Shortcuts**: Click "Last 7 Days" and verify dates are correct.
4.  **Infinite Scroll**: Scroll to the bottom and verify more events are appended.
5.  **Quick Action**: Click the `+` on a card and save a new reflection.
