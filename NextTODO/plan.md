# GrowthLog v2.3 Implementation Roadmap

This roadmap synthesizes the proposals from all the detailed analyses (`chatgpt.md`, `claude.md`, `grok.md`) into a single, actionable execution path. The overarching goal is to evolve GrowthLog from a static logging tool into an **intelligent, proactive growth system** that users feel is actively coaching them.

## User Review Required

> [!IMPORTANT]
> Please review this chronological implementation plan. 
> - Do you agree with putting **Real SMTP & AI Insights** as Phase 1?
> - Are there any features (e.g. BYOD, Offline Mode) that you want moved up in priority?
> Let me know, and once approved, we can begin executing Phase 1 together!

---

## The Master Execution Plan

### Phase 1: Retention Foundation (Weeks 1–2)
**Goal:** Hook the user with intelligent, automated value delivery. *This phase unblocks all email and AI features.*

- **1. Real SMTP & Email Templates**
  - **Backend:** Replace placeholder in `utils/email.py` with SendGrid or Resend. Add unsubscribe tokens + a preference center.
  - **Purpose:** Unblocks the Weekly Letter, email verifications, and smart nudges.
- **2. Weekly AI Growth Letter**
  - **Backend:** Add `openai` or `groq` to dependencies. Create a background task/cron job (via APScheduler) to run every Sunday.
  - **Logic:** Fetch last 7-30 days of `daily_logs` + `snapshots`. Pass to LLM, generate a personalized Markdown summary (wins, patterns, failed goals), and email it. Store in a new `insights` collection.
- **3. Pattern Detection Engine**
  - **Backend:** Add a `GET /api/insights/patterns` endpoint utilizing MongoDB aggregation pipelines to correlate `day_of_week`, `category`, and `mood/energy`.
  - **Frontend:** Surface these as interactive "Insight Cards" on the Dashboard.

### Phase 2: Frictionless Daily Habits (Weeks 3–4)
**Goal:** Make logging take less than 15 seconds, anytime, anywhere.

- **1. Voice-to-Log**
  - **Frontend:** Implement Web Speech API in the Daily Check-in component. Transcribe voice to text, then parse intent (keywords) to auto-fill categories, mood, and energy.
- **2. Quick-Log Floating Widget**
  - **Frontend:** Add a globally accessible Floating Action Button (`+`). Opens a quick bottom sheet for a 15-second entry (mood slider, energy slider, 1 text highlight).
  - **Backend:** Support a `quick_log: true` flag in the `POST /api/daily-logs` endpoint.
- **3. PWA + Offline-First Mode**
  - **Frontend:** Add `manifest.json` and a Service Worker (`vite-plugin-pwa`). Use IndexedDB to queue log writes when offline, syncing automatically in the background on reconnect.
- **4. Dynamic Design Tokens**
  - **Full-stack:** Move hardcoded Organic Mastery colors, prompts, and icons into the DB (`user_settings`). Serve via context to allow full user customization.

### Phase 3: AI Depth & Engagement (Weeks 5–6)
**Goal:** Create an emotional connection with the user through context-aware conversations and nostalgia.

- **1. AI Future-Self Coach**
  - **Backend:** Build a `POST /api/ai/chat` endpoint with streaming. Provide the last 30 days of logs, goals, and manifestations as the system prompt context. 
  - **Frontend:** Chat interface where users can ask "Why am I stuck?" and get highly contextualized advice.
- **2. "On This Day" Memory Feed**
  - **Backend/Frontend:** Query `{ date: { $regex: "-MM-DD$" } }` on past years to show a nostalgia card on the Dashboard.
- **3. Natural Language Logging**
  - **Backend:** Pass quick text blocks ("Gym + deep work 2h, felt great!") to an LLM to auto-categorize and quantify.

### Phase 4: Social Virality & Data Ownership (Weeks 7–8)
**Goal:** Enable users to share their wins and own their data heavily.

- **1. Shareable Growth Cards**
  - **Frontend:** Generate "Spotify Wrapped"-style images from the user's public profile data using `html2canvas`. Add Web Share API hooks.
- **2. Accountability Hub**
  - **Backend/Frontend:** Launch the `accountability_links` collection. Allow partner linking with read-only goal visibility and weekly co-reflection emails.
- **3. PDF "Growth Book" Export**
  - **Backend:** Queue jobs using WeasyPrint (or similar) to generate an annual summary PDF. Include radar overlays, manifestations, and charts.
- **4. BYOD (Bring Your Own Database)**
  - **Backend:** Allow users to save their own encrypted MongoDB URI in settings. Instantiate dynamic async MongoDB clients per user. A massive privacy differentiator.

### Phase 5: Technical Scaling & Monetization
**Goal:** Prepare the app for mass usage and revenue.

- **1. Full-Stack Docker Compose**
  - Add Nginx, a React production build, and Redis (replacing in-memory cache) to `docker-compose.yml`.
- **2. Freemium Model**
  - Gate advanced features (AI Coaching, BYOD, PDF Exports) behind a `premium: boolean` user attribute constraint in FastAPI routers.
- **3. Advanced Observability & Tests**
  - Add Playwright E2E testing for the dashboard and logging flows. Rate-limiting middleware (`slowapi`) for AI endpoints.

---

## Open Questions
- Do you have a preferred LLM provider for the AI features (e.g., OpenAI, Anthropic, Groq for speed)?
- For Real SMTP, do you want to configure SendGrid, Resend, or standard Google SMTP?

## Verification Plan
1. **Automated Tests:** We will extend the existing 70+ Pytest suite to cover the new `insights` routers and AI endpoint schema validations. We will add baseline E2E checks with Cypress or Playwright.
2. **Manual Verification:** Before closing any task, we will run the stack locally, verify the UI feels premium ("Organic Mastery" standards), and confirm the backend processes requests efficiently.
