# 🧭 "Should I Do This?" — Feature Plan

> **Goal:** Make every day productive by spending time only on things that are worth it — and catching the useless stuff *before* it eats your hours.

---

## 1. The Problem This Solves

Most wasted time doesn't come from the To-Do list. It comes from moments like:

- "Let me just check this quickly…" → 45 minutes gone
- "I'll quickly fix that small thing…" → 2 hours gone
- Doing an easy, comfortable task instead of the important one
- Saying yes to something because of pressure, not because it matters

GrowthLog already has 20+ features, but none of them step in **at the moment you decide what to do next**. This feature does exactly that.

---

## 2. The Core Idea

Turn the "Should I Do This?" decision matrix into a **daily loop** with three moments:

| When | What you do | Time it takes |
|---|---|---|
| 🌅 **Morning** | Filter today's tasks → pick your 2–3 "Do now" tasks | ~2 min |
| ⚡ **During the day** | Before starting anything unplanned, tap **"?"** and answer 3 questions | ~10 sec |
| 🌙 **Evening** | Mark what you did and whether it was worth it | ~1 min |

Then, after a few weeks, GrowthLog shows you **your own patterns** — where your time really goes and when you usually get distracted.

---

## 3. How You'll Use It (Step by Step)

### 🌅 Morning — "What is worth doing today?"

1. Open GrowthLog. The morning screen shows today's To-Dos (and lets you add anything else on your mind).
2. For each task, tap 1–5 on **5 quick questions**:
   - Does it move one of my goals?
   - Will it matter in a year?
   - What happens if I skip it?
   - What does it cost me (time + energy)?
   - Do I actually want to do it (my own choice, not pressure)?
3. Each task gets a verdict:

| Verdict | What happens |
|---|---|
| ✅ **Do now** | Goes to the top of today's list |
| 📅 **Schedule** | Due date moves to a better day |
| 🤝 **Hand off** | Marked to delegate / ask someone |
| ⚡ **Do the minimum** | Do it fast, don't polish |
| ❌ **Drop** | Removed — guilt-free |

**Result:** You start the day with a short, honest list instead of a long, stressful one.

---

### ⚡ During the Day — "Should I do this *right now*?"

This is the most important part for avoiding useless work.

A small floating **"?"** button is on every page (and a keyboard shortcut). Whenever you feel pulled toward something unplanned:

1. Type what it is — e.g. *"Reorganize my desktop folders"*
2. Answer 3 quick questions:
   - Is this one of my "Do now" tasks today, or does it help one?
   - Will this matter in a week?
   - What am I giving up right now to do this?
3. You get an instant answer:
   - 🟢 **"Go ahead"** — it's worth it
   - 🔴 **"Not now — back to: *[your top task]*"** — with an option to park it for later

Every check is saved, so the evening review knows what happened.

---

### 🌙 Evening — "Did my time go where I wanted?"

1. Your planned tasks: ✔ done / ✖ not done
2. Each "Should I do this?" check from the day: 👍 worth it / 👎 not worth it
3. You see a one-line summary, for example:

> *"Today: 4 of 5 checks went to valuable work. You caught 2 time-wasters before starting them."*

---

### 🧠 Big Decisions — The Full Matrix

For bigger choices (a course, a job change, a trip, a commitment), you can open the **full 18-question matrix** — the same one from the artifact:

- **Need** — Is it required? Does it fit my goals? How urgent? Can someone else do it?
- **Impact** — Effect now, in 1 year, if I skip it, and risk of harm
- **Growth** — Learning, health, relationships
- **Cost** — Time, energy, money, what I give up
- **Heart** — How I feel, why I'm doing it, would I regret skipping it

Plus written notes: *what's good, what's harmful, what happens if I don't, and the smallest first step.*

You get a **score (0–100)**, a verdict, and "What the matrix notices" insights. It's saved to your account so you can look back later.

---

## 4. How It Helps You Over Time

After 2–3 weeks, GrowthLog can tell you things like:

- *"You get distracted most often between 3–5 PM."*
- *"Tasks you dreaded usually turned out to be worth it."*
- *"'Quick fixes' take you 40+ minutes on average."*
- *"Tasks done because of pressure are rated 'not worth it' 70% of the time."*
- *"This week you spent more time on Growth tasks than last week."*

This is the real value: **you stop guessing and start seeing your own habits clearly.**

---

## 5. A Sample Day

| Time | What happens |
|---|---|
| **8:30 AM** | Morning filter: 7 tasks → 3 "Do now", 2 scheduled, 1 handed off, 1 dropped |
| **11:00 AM** | Urge to redesign the app logo → tap "?" → 🔴 *"Not now — back to: Finish API tests"* → parked for the weekend |
| **2:00 PM** | Friend asks to help with a quick thing → tap "?" → 🟢 *"Go ahead"* (relationships + 20 min) |
| **4:30 PM** | Want to watch "just one" video → tap "?" → 🔴 *"Not now"* → went back to work |
| **9:30 PM** | Evening review: 3/3 planned tasks done, 2 time-wasters caught 🎉 |

---

## 6. How It Fits Into GrowthLog

- **No new clutter:** The existing **Task Check-In** (`/checkins`) already asks similar questions, but with slow typed answers. It will be **upgraded** into this feature (tap 1–5 instead of typing) instead of adding a competing page.
- **Connects to To-Dos:** Morning verdicts directly update your To-Dos (reorder, reschedule, drop).
- **Saved to your account:** Not just in the browser — works across devices, part of your history.
- **Shows in Activity / History:** Your checks and reviews appear in your timeline like other features.

---

## 7. Build Plan (Phased)

We'll build it in small phases so you can start using it quickly and we only keep what you actually use.

> **Status:** all three phases are built.
> - Phase 1: 🧭 button / `Q` key, `/focus` page
> - Phase 2: `/plan` (Morning Plan, shortcut `A`)
> - Phase 3: `/decisions` (Decision Matrix, shortcut `N`) and "Your patterns" on `/focus`
>
> Not built yet: the *"quick fixes take 40+ minutes"* and *"more time on Growth tasks than last week"* insights. They need actual time spent per task, which quick checks don't record.

### Phase 1 — Catch time-wasters (start here)
- Floating **"?"** button + keyboard shortcut on every page
- 3-question quick check → "Go ahead" / "Not now"
- "Park for later" option
- **Evening review** (done? worth it?)
- Saved to backend with tests

### Phase 2 — Plan the day
- **Morning filter** on today's To-Dos (5 quick questions)
- Verdicts update To-Dos automatically (reorder / reschedule / drop)
- Morning screen becomes the first thing you see when opening the app

### Phase 3 — Big decisions + patterns
- **Full 18-question matrix** with score, verdict, notes, and insights
- Replaces the old text-based Task Check-In
- **Pattern insights** after a few weeks of data

---

## 8. In One Sentence

> **GrowthLog will ask you "Is this worth it?" at the exact moment it matters — in the morning, before every distraction, and at night — so your time goes to what actually moves your life forward.**
