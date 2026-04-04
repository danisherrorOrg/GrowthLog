Here's a comprehensive MongoDB schema design covering all current and future features:

---

**COLLECTION 1: Users**

Stores everything about the person using the app. This includes basic identity (name, email, password), their preferences (reminder time, timezone, theme), their current streak and longest streak, their account type (free or premium), and metadata like when they joined and last logged in. Also stores notification settings and whether they have an accountability partner linked.

---

**COLLECTION 2: Categories**

Each user creates categories like Career, Emotional, Relationships etc. This collection stores the category name, icon, color chosen by the user, the user it belongs to, whether it's active or archived, the order in which it appears on dashboard, and which prompt template is linked to it. It also stores the date created and whether it's a system default or user-created.

---

**COLLECTION 3: Goals**

Each goal lives inside a category. A goal document stores which user and category it belongs to, the goal title and description, the original deadline, current deadline (which changes if extended), status (active, completed, extended, abandoned), and a completion note — what was achieved or learned. It also stores an array of deadline extension history — each extension has the old deadline, new deadline, and the reason given. For decomposed goals, it stores an array of micro-goals, each with their own title, deadline, and completion status.

---

**COLLECTION 4: Daily Logs**

This is the heartbeat of the app — one document per user per day. It stores the date, the user ID, and an array of category entries. Each category entry has the category ID, the written reflection text, mood score (1–10), energy score (1–10), an array of specific emotions felt (anxious, proud, motivated etc.), and whether this category was skipped that day with a reason. The document also stores an overall day rating, a highlight of the day, and any voice log file reference if the user spoke instead of typed.

---

**COLLECTION 5: Manifestations**

Stores the user's vision of who they want to become. Each document has the user ID, the written vision statement, the start date, the target date (N days), the categories it covers, and status (active or completed). On completion, it stores the reflection — what actually happened vs. what was envisioned. A user can have multiple manifestation cycles running or completed over time.

---

**COLLECTION 6: Snapshots**

Stores "who I am today" moment-in-time captures. Each snapshot has the user ID, date taken, a written self-description, an optional photo or voice note reference, the mood and energy at that moment, and key values or beliefs the user holds at that point. These are meant to be compared against future snapshots to see transformation.

---

**COLLECTION 7: Prompts**

A library of daily prompts used across the app. Each prompt has a text, the category type it belongs to (emotional, career, general etc.), the source (system-generated or AI-generated), difficulty level (light reflection vs. deep dive), and a usage count so popular prompts can be tracked. Users can also save favorite prompts.

---

**COLLECTION 8: Streaks & Milestones**

Tracks the user's consistency and achievements. Stores current streak count, longest streak ever, last log date (used to calculate if streak is broken), and an array of milestone achievements — each milestone has a name (e.g. "First 30 Days"), the date it was earned, and whether the user has seen/acknowledged it. Also stores comeback events — when a user returned after a gap.

---

**COLLECTION 9: Insights**

Stores generated insights for the user — both system-detected and AI-generated. Each insight document has the user ID, the time period it covers (weekly, monthly, custom), the type (pattern detected, emotional trend, category imbalance, goal behavior), the insight text, which categories or goals it references, and whether the user found it helpful (thumbs up/down). This allows the insight engine to get smarter over time.

---

**COLLECTION 10: Accountability Partners**

Manages the relationship between a user and their trusted partner. Stores the user ID, the partner's user ID or email (if not yet on the app), the permission level (summary only vs. milestone notifications), status (pending, active, removed), and a log of encouragements or nudges sent between them with timestamps.

---

**COLLECTION 11: Exports & Reports**

Tracks every time a user exports their data. Stores the user ID, export type (PDF journey book, year in review, custom range), the date range covered, the file reference, and status (generating, ready, expired). This allows re-downloading past exports without regenerating them.

---

**COLLECTION 12: Notifications**

Logs all notifications sent to the user. Stores the user ID, notification type (daily reminder, streak alert, milestone, accountability nudge, insight ready), message content, delivery channel (push, email, in-app), sent timestamp, and whether it was opened or acted upon. Useful for optimizing reminder timing.

---

**COLLECTION 13: AI Interactions**

If the AI layer is active, this collection stores each AI interaction. The user ID, the prompt sent to AI, the response received, which feature triggered it (weekly report, letter from future self, pattern detection), the date, and a user rating of the response. This builds a feedback loop for AI quality over time.

---

**KEY RELATIONSHIPS SUMMARY**

- A **User** has many **Categories**
- A **Category** has many **Goals**
- A **User** has many **Daily Logs**, one per day
- Each **Daily Log** has entries for multiple **Categories**
- A **User** has many **Manifestations** over time
- A **User** has many **Snapshots** over time
- **Insights** are generated from **Daily Logs + Goals + Streaks**
- **AI Interactions** pull from **Logs + Manifestations + Snapshots**

---

This schema is designed so you can start with just the first 5 collections and add the rest progressively as features are built. Want me to now build the actual website?