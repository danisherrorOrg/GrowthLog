# 🌱 GrowthLog

> Record who you are today. Manifest who you want to become. Watch yourself grow.

A full-stack personal growth tracking app built with **React** (frontend) and **FastAPI** (backend), with **MongoDB** as the database.

---

## Project Structure

```
growthlog/
├── backend/           ← FastAPI + MongoDB
│   ├── main.py        ← All API routes
│   └── requirements.txt
└── frontend/          ← React app
    ├── src/
    │   ├── pages/     ← Dashboard, DailyLog, Goals, etc.
    │   ├── components/← Layout, Sidebar
    │   ├── context/   ← AuthContext
    │   └── utils/     ← API helper
    └── package.json
```

---

## Quick Start

### 1. Start MongoDB
Make sure MongoDB is running locally on port 27017.
```bash
mongod
```

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# python3 -m uvicorn main:app --reload --port 8000
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

---

## Features (Version 1)

- ✅ Auth — Register / Login / JWT
- ✅ Categories — Create custom life areas
- ✅ Daily Log — Mood, energy, emotions, reflection per category
- ✅ Streak tracking — Auto-calculated, displayed in sidebar
- ✅ Goals — Set deadlines, reflect on completion/extension/abandonment
- ✅ Manifestations — Write vision for N days, reflect on completion
- ✅ Snapshots — Before & after self portraits
- ✅ Growth page — Mood trend chart, radar chart, emotion bar chart
- ✅ Dashboard — Heatmap, category consistency, goal stats

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login |
| GET | /auth/me | Current user |
| GET/POST | /categories | List / Create categories |
| DELETE | /categories/:id | Archive category |
| GET/POST | /goals | List / Create goals |
| PUT | /goals/:id/reflect | Reflect on a goal |
| GET | /logs | Get logs for N days |
| GET | /logs/today | Today's log |
| POST | /logs | Save daily log |
| GET/POST | /manifestations | List / Create manifestations |
| PUT | /manifestations/:id/complete | Complete a cycle |
| GET/POST | /snapshots | List / Take snapshots |
| GET | /dashboard | Dashboard data |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Styling | Pure CSS with CSS variables |
| Charts | Recharts |
| Backend | FastAPI (Python) |
| Database | MongoDB via PyMongo |
| Auth | JWT tokens |
| Toasts | react-hot-toast |
| Date utils | date-fns |
