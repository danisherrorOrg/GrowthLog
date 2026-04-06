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
*   **Dashboard**: Real-time Heatmaps, Goal completion stats, and "Growth Insights" cards.
*   **Growth Analytics**: Mood vs. Energy trends, Time investment (minutes) charts, and Weekly growth summaries.
*   **Manifestations**: Vision-setting cycles (30/60/90 days) with milestone progress and completion reflections.
*   **Snapshots**: "State of Being" self-portraits to compare your perspective across months.
*   **Daily Check-ins**: Granular logging of activities, emotions, mood, and energy per category.

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
```bash
cd backend
python3 -m pytest tests -v
```

---

## 📂 Project Structure

```text
growthlog/
├── backend/            ← FastAPI + MongoDB
│   ├── main.py         ← Main API Entry Point
│   ├── tests/          ← Robust 70+ test suite
│   ├── .env.example    ← Environment Template
│   └── requirements.txt
└── frontend/           ← React + Recharts
    ├── src/
    │   ├── pages/      ← 17+ Full views (Dashboard, Growth, Snapshots, etc.)
    │   ├── components/ ← UI Layouts, Sidebars, Modals
    │   └── context/    ← Auth & Global State
    └── package.json
```

---

*Growth is not a destination. It is a log of everyday honesty.*
