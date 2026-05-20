Based on a comprehensive review of the active codebase (including the API routers, database schemas, and existing roadmaps like `nextTOOdo.md`, `to.md`, and `WithoutAiPlan.md`), here is a prioritized list of previous issues to resolve first, followed by the most valuable new features to add. All AI-powered features have been removed to focus entirely on robust, core product value.

---

### 🧹 Previous Issues & Security Vulnerabilities to Solve First
Before adding major new features, resolving these technical debt and security items will stabilize the core platform:

1. **Timeline Search Regular Expression Denial of Service (ReDoS) Vulnerability**
   * **The Issue:** The timeline router (`backend/api/routers/timeline.py`) takes raw user-input search queries (`q`) and passes them directly to the MongoDB `$regex` operator. Special regex characters entered by a user could crash or hang the database engine.
   * **The Solution:** Escape the search query beforehand to treat it strictly as a literal substring search.
2. **Verbose and Noisy Backend Debug Logs**
   * **The Issue:** The backend terminal is cluttered with print statements (e.g., printing all category IDs and user types on every timeline feed request).
   * **The Solution:** Strip out verbose print calls or replace them with structured loggers using appropriate logging levels (`debug`, `info`).
3. **Authentication Token Hardening**
   * **The Issue:** The JWT is currently stored in `localStorage` on the frontend, leaving it vulnerable to Cross-Site Scripting (XSS) attacks.
   * **The Solution:** Migrate to an `httpOnly` secure cookie flow or tighten the app's Content Security Policy (CSP).
4. **Removing Hardcoded Colors, Palettes, and Icons**
   * **The Issue:** Although some areas have been refactored, color schemes and category icons are still largely hardcoded lists rather than user-managed fields.
   * **The Solution:** Fully migrate design tokens into MongoDB settings, so users have complete control over customizing categories.
5. **Database Aggregation & Performance Optimization**
   * **The Issue:** Category aggregates and radar charts rely heavily on `$lookup` queries, which will degrade performance as historical logs grow.
   * **The Solution:** Refactor dashboard queries to utilize indexing and efficient caching strategies.
6. **Rate Limiting on Heavy & Sensitive Endpoints**
   * **The Issue:** Heavy endpoints (such as dashboard aggregations, timeline searches, and daily logging writes) are currently unrestricted and vulnerable to abuse or script execution.
   * **The Solution:** Introduce middleware-level rate limiting using a package like `slowapi` to protect key routes.
7. **Production SMTP Integration & Transactional Emails**
   * **The Issue:** System triggers for user verification, password resets, and consistency nudges use mock/placeholder flows or log outputs instead of actual email delivery.
   * **The Solution:** Integrate a dedicated mailing service (SendGrid, Mailgun, or Resend) with brand-aligned HTML templates and a preferences toggle panel.
8. **Docker-Compose Environment & Workflow Refactoring**
   * **The Issue:** The local container system lacks environment variable standardization, unified API endpoint configurations, and health checks.
   * **The Solution:** Clean up and standardize the multi-container environment configurations in `docker-compose.yml` to support a frictionless "one-command dev" setup.

---

### 🚀 High-ROI New Features to Add (No AI Required)
These features build upon existing data models and frontend pages to boost daily engagement and trust:

#### 1. Immediate Quick-Wins (High Impact, Low Effort)
* **Data Export ("Download My Data" CSV/JSON)**
  * Unlocks user trust by offering a button on the Profile page to export all daily logs, goals, moods, time logs, and todos in standard CSV/JSON formats or a zipped bundle.
* **In-App Notification Center & Activity Tray**
  * Places a persistent bell icon in the navbar with an unread badge, consolidating consistency alerts, streak warnings, overdue todos, and upcoming deadlines.
* **"On This Day" Memory Feed**
  * Displays a nostalgic card on the dashboard when a user has a log from exactly 1 or 2 years ago on today's calendar date to drive daily logging habits.
* **Streak Freeze (Streak Shield)**
  * Users can earn a "shield" for consistency milestones (e.g., every 7 days), which automatically saves their streak if they miss a single day.
* **Pomodoro Focus Timer**
  * Integrates a built-in focus countdown on the Action Board (Todos) that pre-fills actual time spent into the task completion modal once finished.
* **Intraday Mood & Energy Check-ins**
  * Supports up to 4 check-ins per day to capture intraday shifts (e.g., morning vs. evening) and charts them within the daily detailed view.

#### 2. Visual & Personalization Extensions
* **"Spotify Wrapped"-Style Shareable Cards**
  * Allows users to generate beautifully designed PNG images of their streaks, goal completion percentages, and category balance from their profile for social sharing.
* **XP & Growth-Level Gamification System**
  * Awards experience points (XP) for logging and streak achievements to progress through thematic tiers (e.g., Seedling → Root → Branch → Canopy).
* **Weekly Review Ritual Page**
  * Guides users through a structured end-of-week reflection using dashboard insights and a standardized form for wins, struggles, and future focus.
* **Global Search (⌘K)**
  * A command palette allowing users to search across daily logs, thoughts, reframes, manifestations, and books from a single interface.
* **Interactive Life Balance Wheel**
  * Transforms the static radar chart into an interactive wheel where users can drag endpoints to define personal targets and view progress gaps.

#### 3. Advanced & Trust Options
* **"Best Days" Pattern Report & Analytics**
  * Aggregates daily log values mathematically to isolate best-performing weekdays and highlight positive emotional correlations.
* **"Bring Your Own Database" (BYOD)**
  * Allows power-users to save their own encrypted MongoDB Connection URI in their profile settings, enabling private storage.
* **PWA & Offline-First Support**
  * Enhances the React SPA with service workers and IndexedDB to cache actions offline and sync them to the backend when a network connection is restored.