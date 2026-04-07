# GrowthLog v3.0 Feature Implementation

Implement the 7 major features laid out in the v3.0 blueprint to transform GrowthLog into a comprehensive Personal Growth OS. This includes global markdown support, an activity timeline, thought-logging and sentiment analysis, task tracking, motivational quote management, book knowledge retention, and cognitive reframing.

## User Review Required

> [!WARNING]
> This plan introduces multiple database collections and new FastAPI routers. Please review the proposed architecture, especially the plan to install markdown dependencies for the frontend.

## Proposed Changes

### 1. Cross-Cutting Markdown Support

Implementation of rich text capabilities across app inputs.

#### [NEW] [MarkdownRenderer.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/components/ui/MarkdownRenderer.js)
- Reusable `ReactMarkdown` wrapper component supporting GFM plugins.

#### [NEW] [markdown.css](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/styles/markdown.css)
- Tailwind/Organic Mastery style configurations for the markdown output.

---

### 2. Built-in To-Do / Next Actions List

Simple Kanban-style task tracking linked to goals.

#### [NEW] [todos.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/todos.py)
- FastAPI router handling `todos` CRUD operations.

#### [NEW] [todos.py models](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/models/todos.py)
- Pydantic models for Todo creation and responses.

#### [NEW] [Todos.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Todos.js)
- React Kanban board interface for managing user action items.

#### [MODIFY] [Dashboard.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Dashboard.js)
- Add a widget displaying active/pending todos.

---

### 3. Personal Quote Vault

A personalized collection of inspirational or guiding quotes.

#### [NEW] [quotes.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/quotes.py)
- FastAPI endpoints for CRUD and fetching a daily quote.

#### [NEW] [quotes.py models](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/models/quotes.py)
- Pydantic schemas validating quote data.

#### [NEW] [Quotes.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Quotes.js)
- React grid layout for displaying curated quotes and managing tags.

#### [MODIFY] [Dashboard.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Dashboard.js)
- Update the quote widget to pull from the user's personal vault endpoint (`/api/quotes/random`).

---

### 4. Activity & Change History

A user timeline logging every structural modification within the platform.

#### [NEW] [activity.py utils](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/utils/activity.py)
- Centralized `log_activity` helper mapping entity edits to the `activity_logs` collection.

#### [NEW] [activity_logs.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/activity_logs.py)
- Read-only router that fetches paginated user actions.

#### [NEW] [ActivityLog.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/ActivityLog.js)
- Timeline style UI displaying the metadata and before/after diffs of logged activities.

#### [MODIFY] Multiple Routers in backend/api/routers/
- Hook `log_activity()` calls into standard update/create endpoints across `goals.py`, `logs.py`, `snapshots.py`, etc.

---

### 5. Daily Thoughts & Mind Garden

Daily capture mechanisms for internal dialogue and instant sentiment analysis classification.

#### [NEW] [sentiment.py utils](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/utils/sentiment.py)
- Isolated keyword-based sentiment classification engine.

#### [NEW] [thoughts.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/thoughts.py)
- Core endpoints storing thoughts and classifying them via the sentiment utility.

#### [NEW] [thoughts.py models](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/models/thoughts.py)
- Pydantic validators for thought data payloads.

#### [NEW] [Thoughts.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Thoughts.js)
- Central page featuring input controls and a "Mind Garden" sentiment statistics chart.

---

### 6. Cognitive Reframing Studio

Systemized negative → positive psychological rewrites. User overrides and public presentation.

#### [NEW] [seed_reframes.py utils](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/utils/seed_reframes.py)
- Initial database seeding logic inserting built-in cognitive reframes to the `reframes` collection.

#### [NEW] [reframes.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/reframes.py)
- Router exposing public system reframes and personalized user overrides.

#### [NEW] [ReframeStudio.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/ReframeStudio.js)
- Dedicated logged-in workspace for users to craft custom reframes.

#### [NEW] [ReframeWidget.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/components/ReframeWidget.js)
- Guest viewer widget displayed to unauthenticated users.

#### [MODIFY] [Login.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Login.js)
- Embed `ReframeWidget.js` as an SEO/landing hook.

---

### 7. Book Tracker ("Second Brain")

Dedicated reading lifecycle and deep note manager.

#### [NEW] [books.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/api/routers/books.py)
- Extensive router managing books and sub-documents like bookmarks, notes, and quotes.

#### [NEW] [books.py models](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/models/books.py)
- Base and sub-schemas for representing reading trackers and notes.

#### [NEW] [Books.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/Books.js)
- UI presenting shelves (`Want to Read`, `Read`).

#### [NEW] [BookDetail.js](file:///Users/danishmahajan/Desktop/projects/GrowthLog/frontend/src/pages/BookDetail.js)
- Expansive summary and note-aggregation view per individual book entry.

---

### Global API Registration

#### [MODIFY] [main.py](file:///Users/danishmahajan/Desktop/projects/GrowthLog/backend/main.py)
- Include all new sub-routers under the application instance.

## Open Questions

- Will we execute this all at once, or focus iteratively on a module-by-module basis (e.g. `Todos` and `Quotes` first, per the 4-week pipeline)?
- For the `reframes` database, should I incorporate the seed script dynamically upon FastAPI boot, or serve it manually via backend script execution before runtime?

## Verification Plan

### Automated Tests
- Run newly added `utils` modules such as the sentiment classifier through independent unittests.

### Manual Verification
- Testing backend validation directly against the Swagger (`/docs`) page locally.
- Auditing MongoDB collections to ensure indexes were successfully generated alongside data.
- Testing responsive navigation workflows via the React frontend.
