# 🌱 GrowthLog (v2.2.0)

> **Record who you are today. Manifest who you want to become. Watch yourself grow.**

GrowthLog is a premium, full-stack personal development platform built for intentional living. It combines deep biological tracking (Mood, Energy) with philosophical growth frameworks (Manifestations, Snapshots) to provide a 360-degree view of your evolution.

---

## 🎨 The "Organic Mastery" Design System

GrowthLog features a custom-crafted UI designed for focus and calm:
*   **Palette**: `Sage` (#6b8c6b), `Gold` (#c9a84c), `Rust` (#c4623a), and `Ink` (#0d0d0d) on a `Paper` (#f5f0e8) background.
*   **Typography**: `Fraunces` (Serif) for headlines and `DM Sans` (Sans-serif) for specialized data layouts.
*   **Visuals**: Custom **Recharts** implementations including Life Balance Radars, Heatmaps, and Area Trends.

---

## 🚀 Exhaustive Feature Set

### 🧩 Core Modules
*   **Daily Logs & Activity Tracking**: A journal to log mood, energy, specific activities, and time spent.
*   **Goals & Manifestations**: A structured system to set grand quarterly visions and break them down into actionable milestones with deadlines.
*   **Action Board (Todos)**: A task manager that tracks priority, due dates, and time estimations versus actual time spent.
*   **Cognitive Reframing Studio (Reframes)**: A psychological tool for emotional regulation to log triggers, identify cognitive distortions, and reframe negative thoughts.
*   **Mind Garden (Thoughts)**: A distraction-free capture area for raw thoughts, ideas, and sentiments.
*   **Snapshots**: Periodic check-ins to log current mood and life values.
*   **Library (Books) & Motivation Vault (Quotes)**: Areas to store reading material, insights, and impactful quotes.
*   **Dashboard & Analytics**: Real-time Heatmaps, Goal completion stats, Mood vs. Energy trends, and Life Balance Radar Charts.

### 🧭 The Operating System Workflow
For a complete strategic guide, read our [Ultimate Guide (Guide.md)](./Guide.md).
1. **Quarterly Setup**: Define life categories and set grand Manifestations and concrete Goals.
2. **Daily Operations**: Execute daily from the Action Board, capture ideas in the Mind Garden, regulate emotions through Cognitive Reframes, and end the day with a Daily Log.
3. **Periodic Review**: Take weekly Snapshots and review activity trends to ensure alignment with your changing core values.

### 🔐 Safety & Security
*   **70+ Test Suite**: Exhaustive coverage across 14 categories (Auth, Security, Boundary, etc.).
*   **Auth & Privacy**: JWT serialization, token versioning, and email verification workflows.
*   **Data Integrity**: Strict Pydantic v2 validation layers and NoSQL injection resilience.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Recharts, `date-fns`, `react-hot-toast` |
| **Backend** | FastAPI (Python 3.9+), Pydantic v2, PyMongo |
| **Database** | MongoDB (Atlas or Local) |
| **Styling** | Pure CSS (Design Token Driven) |
| **Testing** | Pytest, Starlette TestClient, Asyncio |

---

## ⚙️ Getting Started

### 1. Prerequisites
*   Python 3.9+ | Node.js 18+ | MongoDB

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Update your MongoDB URL and JWT_SECRET
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Running Tests
You can run the full suite using standard `pytest`, or use our specialized stress-tester:
```bash
cd backend
./run_tests.sh 1 # Run once with full logs (-v -s)
./run_tests.sh 5 # Repeat 5 times to check for flakiness
```

---

## 📂 Project Structure

```text
growthlog/
├── backend/            ← FastAPI + MongoDB (Modular)
│   ├── main.py         ← Lightweight API Entry
│   ├── api/            ← Domain Routers (Auth, Goals, etc.)
│   ├── core/           ← Db, Config, Security
│   ├── models/         ← Pydantic Schemas
│   ├── utils/          ← Cache, Helpers, Email
│   ├── tests/          ← Robust 70+ test suite
│   └── run_tests.sh    ← Backend stress-test utility
└── frontend/           ← React + Recharts
    ├── src/
    │   ├── pages/      ← 17+ Full views (Dashboard, Growth, Snapshots, etc.)
    │   ├── components/ ← UI Layouts, Sidebars, Modals
    │   └── context/    ← Auth & Global State
    └── package.json
```

---

*Growth is not a destination. It is a log of everyday honesty.*
