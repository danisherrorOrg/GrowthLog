# 📓 GrowthLog — Technical Specification & Progress (v2.2.0)

> *You cannot improve what you do not measure. You cannot become who you cannot see.*

---

## 🏛️ System Architecture

GrowthLog is a decoupled **FastAPI + React** application using **MongoDB** for flexible, schema-driven growth data.

### 🧩 Core Methodology
*   **Version**: 2.2.0 (Modular)
*   **Database**: NoSQL (MongoDB) for unstructured daily reflections.
*   **Security**: Stateless JWT with token versioning (invalidates on password change).
*   **Caching**: In-memory LRU cache for heavy dashboard aggregations.
*   **Frontend**: Multi-view SPA with sophisticated Recharts visualizations.

### 🏛️ Backend Architecture (Modular)

GrowthLog utilizes a decoupled **FastAPI + React** application structure. The backend has been refactored into specialized modules for better maintainability:

*   **`api/routers/`**: Domain-specific logic (Auth, Goals, Logs, etc.) using FastAPI `APIRouter`.
*   **`core/`**: Foundational settings (Config, Database connection, Security primitives).
*   **`models/`**: Centralized Pydantic v2 validation schemas.
*   **`utils/`**: Shared utilities (Caching, Email templates, Serialization).
*   **`main.py`**: Lightweight entry point for middleware and router mounting.

---

## 📂 Entity Lifecycle & Schemas

### 👤 User Profile
The user is the heart of the evolution.
```python
{
    "name": str,
    "email": EmailStr,
    "password": str (Hashed),
    "bio": Optional[str],
    "avatar_emoji": str,
    "streak": int,
    "total_logs": int,
    "v": int (Token Version)
}
```

### 🌱 Life Categories
Growth happens in distinct areas.
```python
{
    "user_id": ObjectId,
    "name": str (Unique per user),
    "icon": str (Emoji),
    "color": str (Hex),
    "description": str,
    "archived": bool
}
```

### 🎯 Goals & Micro-goals (Tasks)
Objectives with measurable endpoints.
```python
{
    "user_id": ObjectId,
    "category_id": ObjectId,
    "title": str,
    "description": str,
    "deadline": datetime,
    "status": "active" | "completed" | "extended" | "abandoned",
    "micro_goals": List[{"id": str, "text": str, "completed": bool, "time_spent": int}]
}
```

### 🗒️ Daily Logs (Heatmap Data)
Record each category's heartbeat.
```python
{
    "user_id": ObjectId,
    "date": str (YYYY-MM-DD),
    "overall_rating": int (1-10),
    "highlight": str,
    "entries": List[{
        "category_id": ObjectId,
        "text": str,
        "mood": int,
        "energy": int,
        "emotions": List[str]
    }]
}
```

---

## 🧪 Testing Maturity Breakdown

We maintain a rigorous **70+ test suite** across 14 specialized categories:

1.  **Authentication**: Register, Login, Me, Logout flows.
2.  **Authorization**: Cross-tenant isolation (User A vs User B).
3.  **Security**: JWT forgery, NoSQL/XSS injection resilience.
4.  **True Positive**: Verifying perfect payloads (200 OK).
5.  **True Negative**: Verifying strictly invalid inputs (422/400 Error).
6.  **False Positive Prevention**: Rejecting "sneaky" valid-looking hacks (Null bytes).
7.  **False Negative Prevention**: Accepting unusual valid data (RTL, Emojis, Far-future dates).
8.  **Happy Path**: A single "perfect journey" user test.
9.  **Negative**: Intentional breakage paths.
10. **Edge Cases**: Extreme string lengths (10k chars), empty arrays.
11. **Boundary Value**: Linux Epoch (1970) and 2099+ date ranges.
12. **Validation & Schema**: Deep Pydantic model violations.
13. **Integration (E2E)**: Full CRUD on Tasks/Goals/Profile + User deletion.
14. **Performance & Load**: Async load bursts for Dashboards.

---

## 🚀 The Roadmap

### ✅ Phase 1: Core Foundation & Micro-Modules (COMPLETED)
*   [x] JWT Auth & Category CRUD
*   [x] Goal, Manifestation tracking & Deadline reflections
*   [x] Action Board (Todos) with Time Tracking
*   [x] Mind Garden for raw thoughts and Cognitive Reframing Studio
*   [x] Library (Books) & Motivation Vault (Quotes)

### ✅ Phase 2: Visualization & Review Mastery (COMPLETED)
*   [x] Dashboards & Consistency Heatmaps (GitHub style)
*   [x] Mood/Energy Area Charts & Life Balance Radar Charts
*   [x] Periodic Snapshots & Daily Check-ins

### 🚧 Phase 3: AI & Insights (IN PROGRESS)
*   [ ] Weekly Growth Letter (AI analysis of last 7 logs)
*   [ ] Pattern Detection (e.g. "Mood dips on Wednesdays")
*   [ ] Public Profile Branding (Shareable growth pages)

### 🔮 Phase 4: Expansion
*   [ ] Voice-to-Log transcription
*   [ ] PDF "Growth Book" exports
*   [ ] Accountability Partner Linking

---

*This document was last updated to reflect the state of GrowthLog v2.2.0.*