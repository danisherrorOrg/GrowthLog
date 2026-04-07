# Growth Timeline & Calendar — Feature Specification
 
> A unified visual timeline and calendar that surfaces deadlines, completed goals, achievements, streaks, snapshots, and daily logs — giving users a bird's-eye view of their entire growth journey in one place.
 
---
 
## Overview
 
GrowthLog's goals, manifestations, snapshots, and daily logs currently live in separate views. The **Growth Timeline & Calendar** integrates these into a **monthly calendar grid** (for tactical awareness) and a **vertical timeline feed** (for the strategic journey arc), using existing MongoDB data.
 
---
 
## Views
 
### 1. Calendar View (Tactical)
 
A standard monthly calendar grid where each day surfaces growth activity.
 
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
 
**Day Cell Indicators (Layered):**
 
| Indicator | Meaning | Source |
|---|---|---|
| 🔥 Green Dot | Daily Log entry present | `daily_logs` |
| ✅ Teal Badge | Goal or Manifestation completed | `goals.status == "completed"` |
| 📸 Purple Dot | Snapshot captured | `snapshots` |
| 🎯 Amber Dot | Goal deadline (`current_deadline`) | `goals` |
| ⚠️ Red Dot | Deadline in ≤ 3 days | `goals` |
| ⏳ Red (Muted) | Overdue Goal | `goals` |
| ★ Gold Star | Significant Milestone earned | `user_profile.milestones` |
 
**Day Detail (Side Panel):**
- **Daily Logs**: Summary of mood, energy, and highlights.
- **Goals/Manifestations**: Any items due or completed.
- **Micro-Goals**: Summary of any micro-goals achieved.
- **Snapshots**: Description and mood if recorded.
 
---
 
### 2. Timeline View (Journey Arc)
 
A vertical chronological feed of all significant growth events.
 
```
─────────────────────────────────────────
  UPCOMING & ACTIVE
─────────────────────────────────────────
 
  ⏳  May 15       Read 12 books this year
                   Goal: "active" · 23 days left
                   Progress: [██████░░░░] 60%
 
  🎯  May 30       Launch side project MVP
                   Manifestation · 38 days left
                   Last progress: "Framework setup"
 
─────────────────────────────────────────
  THIS MONTH · April 2025
─────────────────────────────────────────
 
  ★   Apr 22       30-day streak milestone
                   "Consistency King" badge earned
 
  📸  Apr 13       Snapshot captured
                   Radar: Health ↑ Career ↑ Social ↓
 
  ✅  Apr 09       Goal completed
                   "Meditate 21 days in a row"
                   Status: "completed" · Reflection added
 
─────────────────────────────────────────
  MARCH 2025
─────────────────────────────────────────
 
  🎯  Mar 12       "Meditate 21 days" goal started
  📸  Mar 01       Snapshot captured
  ✅  Feb 28       Goal completed: "Finish DSA course"
 
─────────────────────────────────────────
  ACCOUNT START · Jan 01 2025
─────────────────────────────────────────
```
 
---
 
## Feature Breakdown
 
### A. Lifecycle Tracking
- **Goals**: Tracks `original_deadline` vs `current_deadline`. Surfaces `extension_history` and `reflections`.
- **Manifestations**: Tracks progress via `progress_entries`. Surfaces `vision` and `target_date`.
- **Status Mapping**: Uses backend statuses: `active`, `completed`, `extended`, `abandoned`, `archived`.
 
### B. Strategic Awareness
- **Upcoming Section**: Chronological list of future deadlines.
- **Deadline Urgency**: Visual cues (colors/icons) for items due soon or overdue.
- **Accountability**: Integrated with `accountability_links` for shared goal visibility.
 
### C. Memory & Reflection 
- **Snapshot Markers**: Direct access to snapshot radar charts and descriptions.
- **On This Day**: Contextual highlights from past periods displayed recursively.
- **Milestones**: Automated tracking for streaks, goal counts, and account age.
 
---
 
## Data Integration (Existing Schema)
 
| Event | Backend Collection | Key Fields |
|---|---|---|
| Daily Activity | `daily_logs` | `date`, `overall_rating`, `entries` |
| Goal Events | `goals` | `created_at`, `current_deadline`, `status`, `title` |
| Manifestation | `manifestations` | `created_at`, `target_date`, `status`, `vision` |
| Snapshot | `snapshots` | `date`, `mood`, `description`, `values` |
| Milestones | `user_profile` | `milestones` (new field list) |
 
---
 
## API & Integration
 
Existing endpoints in `goals.py`, `logs.py`, `dashboard.py`, and `snapshots.py` already provide much of this data. A new `GET /api/timeline` or enhanced `/api/dashboard/summary` will aggregate events for the frontend Timeline/Calendar views.
 
---
 
## Technical Notes
- **Frontend**: Use Recharts components (existing) for any embedded trend charts. Use `html2canvas` for shareable growth cards.
- **Caching**: Leverage the existing `utils/cache.py` (Redis) to ensure high-performance timeline rendering.
- **PWA**: Integrated with `vite-plugin-pwa` for offline visibility of the journey timeline.
 
---
 
## Build Priority (Non-AI)
 
1. **Calendar Grid**: Base grid with log streaks (`daily_logs`).
2. **Deadline Indicators**: Overlaying `goals` and `manifestations` on the grid.
3. **Day Side-Panel**: Detailed view of specific days.
4. **Vertical Timeline**: The full chronological Journey Feed.
5. **Milestone Engine**: Logic for awarding and displaying badges.
 
---
 
*This document aligns with the GrowthLog v2.2 backend architecture and Organic Mastery design principles. No AI modules are required for core implementation.*