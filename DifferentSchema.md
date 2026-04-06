# GrowthLog Documentation: MongoDB Schema Architecture

This document tracks the comprehensive NoSQL schema design. It reflects the live data models powering GrowthLog (Collections 1-7) and the planned architecture for our upcoming Phase 3 & 4 roadmap (Collections 8-12).

---

## 🟢 LIVE COLLECTIONS (Currently Built & Active)

### **COLLECTION 1: `users`**
Stores everything about the person using the app. This includes basic identity, aesthetic preferences, and calculated streaks.
*   **Properties**: `_id`, `name`, `email`, `password` (hashed), `bio`, `avatar_emoji`, `timezone`, `email_notifications`, `is_public`, `is_verified`, `verification_token`, `token_version`.
*   **Gamification**: `streak`, `longest_streak`, `last_log_date`, `created_at`.

### **COLLECTION 2: `categories`**
Custom life dimensions (e.g., Mind, Body, Career, Emotional).
*   **Properties**: `_id`, `user_id`, `name`, `icon`, `color` (hex - powers the Dynamic Design System), `description`, `archived`, `created_at`.
*   *Note: Category uniqueness is enforced by a compound index on `[user_id, name]`.*

### **COLLECTION 3: `category_templates`**
System-provided or user-saved blueprints for quick category creation.
*   **Properties**: `_id`, `user_id` (or system), `name`, `icon`, `color`, `description`.

### **COLLECTION 4: `goals`**
Actionable objectives tied to specific categories.
*   **Properties**: `_id`, `user_id`, `category_id`, `title`, `description`, `original_deadline`, `current_deadline`, `status` (active, completed, extended, abandoned), `created_at`.
*   **Nested Tracking**:
    *   `micro_goals`: `[{id, text, completed, time_spent}]` (Sub-tasks)
    *   `reflections`: `[{id, text, status_change, date}]`
    *   `extension_history`: `[{old_deadline, new_deadline, reason, extended_at}]`
    *   `notes`: `[{id, text, date}]`

### **COLLECTION 5: `daily_logs`**
The heartbeat of the app. A single document per user, per day.
*   **Properties**: `_id`, `user_id`, `date` (YYYY-MM-DD), `highlight`, `overall_rating` (1-10), `created_at`.
*   **Nested Entries**:
    *   `entries`: `[{category_id, text, mood, energy, time_spent, emotions: [str]}]`

### **COLLECTION 6: `manifestations`**
Long-term vision setting (30/60/90 day cycles).
*   **Properties**: `_id`, `user_id`, `vision`, `start_date`, `target_date`, `target_days`, `categories` (array of category IDs), `status`, `reflection`, `created_at`.
*   **Nested Tracking**:
    *   `progress_entries`: `[{id, text, type, date}]` (Logs of wins/losses)
    *   `manifestation_notes`: `[{id, text, date}]`

### **COLLECTION 7: `snapshots`**
"State of Being" self-portraits to compare historical growth side-by-side.
*   **Properties**: `_id`, `user_id`, `date`, `description`, `values` (Array of core values), `mood` (1-10), `created_at`.

---

## 🟡 UPCOMING COLLECTIONS (Roadmap / Phase 3 & 4)

### **COLLECTION 8: `insights` (High Priority - Soon)**
Stores system-detected patterns and AI-generated Weekly Growth Letters.
*   **Proposed Schema**: `user_id`, `type` (pattern, growth_letter, balance_nudge), `content` (Markdown/HTML), `date_range` (start, end), `categories_referenced`, `user_feedback` (thumbs up/down).

### **COLLECTION 9: `ai_interactions` (High Priority - Soon)**
Audit log of prompts sent to the LLM to govern costs and improve context.
*   **Proposed Schema**: `user_id`, `feature_triggered` (e.g., Weekly Summary), `prompt_tokens`, `completion_tokens`, `timestamp`.

### **COLLECTION 10: `accountability_links` (Low Priority)**
Manages the relationship between a user and their trusted partner.
*   **Proposed Schema**: `user_id_1`, `user_id_2`, `status` (pending, active), `permissions` (summary_only, full_view), `established_at`.

### **COLLECTION 11: `exports` (Low Priority)**
Tracks generation of heavy PDF "Growth Books" to prevent server stalling.
*   **Proposed Schema**: `user_id`, `type` (annual, snapshot_comparison), `status` (processing, ready, failed), `file_url`, `expires_at`.

---

### 🔑 KEY RELATIONSHIPS & INDEXING
*   **User -> Categories**: `1-to-Many`
*   **Category -> Goals**: `1-to-Many`
*   **User -> Daily Logs**: `1-to-Many` (Strictly 1 per date, enforced by backend logic)

**Performance Indexes Currently Active:**
*   `db.daily_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])`
*   `db.goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])`
*   `db.categories.create_index([("user_id", ASCENDING), ("name", ASCENDING)], unique=True)`