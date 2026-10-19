"""
"Your patterns": what weeks of quick checks, morning plans and decisions say
about how the user spends time. Every insight needs a minimum sample so a
couple of data points never turn into a confident-sounding claim.
"""
from collections import Counter
from datetime import date as date_cls, timedelta

from bson import ObjectId

from core.database import db

MIN_CHECKS = 10
MIN_DAYS = 5
MIN_SAMPLE = 3
QUICK_MINUTES = 15  # "I'll just quickly…"
MIN_CATEGORY_SHIFT = 30  # minutes a week before a category's change is worth mentioning


def _fmt_hour(h):
    h = h % 24
    return f"{12 if h % 12 == 0 else h % 12} {'AM' if h < 12 else 'PM'}"


def _pct(part, whole):
    return round(100 * part / whole)


def _fmt_minutes(m):
    m = round(m)
    if m < 60:
        return f"{m} min"
    h, rest = divmod(m, 60)
    return f"{h}h {rest}m" if rest else f"{h}h"


def _week_split(today: str):
    """(start of this 7-day window, start of the 7 days before it) as YYYY-MM-DD."""
    t = date_cls.fromisoformat(today)
    return (t - timedelta(days=6)).isoformat(), (t - timedelta(days=13)).isoformat()


def _time_insights(checks: list, today: str):
    insights = []
    timed = [c for c in checks if c.get("action") == "doing" and c.get("actual_minutes")]

    quick = [c for c in timed if c.get("expected_minutes") and c["expected_minutes"] <= QUICK_MINUTES]
    if len(quick) >= MIN_SAMPLE:
        expected = sum(c["expected_minutes"] for c in quick) / len(quick)
        actual = sum(c["actual_minutes"] for c in quick) / len(quick)
        verdict = " — budget more time for them" if actual >= 2 * expected else ""
        insights.append({
            "id": "quick_fixes", "icon": "⏳",
            "text": f"'Quick' things you expected to take {QUICK_MINUTES} min or less took {_fmt_minutes(actual)} on average "
                    f"(you expected {_fmt_minutes(expected)}){verdict}.",
        })

    this_week, last_week = _week_split(today)
    now = sum(c["actual_minutes"] for c in timed if c["date"] >= this_week)
    before = sum(c["actual_minutes"] for c in timed if last_week <= c["date"] < this_week)
    if len(timed) >= MIN_SAMPLE and now and before:
        trend = "up from" if now > before else "down from" if now < before else "the same as"
        insights.append({
            "id": "unplanned_time", "icon": "🧮",
            "text": f"You spent {_fmt_minutes(now)} on unplanned things in the last 7 days, {trend} {_fmt_minutes(before)} the week before.",
        })
    return insights


def _category_shift(uid: str, today: str):
    """The category whose logged time changed most between the last 7 days and the 7 before."""
    this_week, last_week = _week_split(today)
    rows = db.daily_logs.aggregate([
        {"$match": {"user_id": uid, "date": {"$gte": last_week, "$lte": today}}},
        {"$unwind": "$entries"},
        {"$group": {
            "_id": {"cat": "$entries.category_id", "this": {"$gte": ["$date", this_week]}},
            "minutes": {"$sum": {"$ifNull": ["$entries.time_spent", 0]}},
        }},
    ])
    totals = {}
    for r in rows:
        cat = r["_id"].get("cat")
        if cat:
            totals.setdefault(cat, [0, 0])[0 if r["_id"]["this"] else 1] += r["minutes"]
    if not totals:
        return None
    cat, (now, before) = max(totals.items(), key=lambda kv: abs(kv[1][0] - kv[1][1]))
    if abs(now - before) < MIN_CATEGORY_SHIFT or not ObjectId.is_valid(cat):
        return None
    doc = db.categories.find_one({"_id": ObjectId(cat), "user_id": uid}, {"name": 1, "icon": 1})
    if not doc:
        return None
    return {
        "id": "category_shift", "icon": doc.get("icon") or "📊",
        "text": f"You spent {'more' if now > before else 'less'} time on {doc['name']} in the last 7 days than the week before "
                f"({_fmt_minutes(now)} vs {_fmt_minutes(before)}).",
    }


def compute_patterns(uid: str, today: str, days: int = 30):
    since = (date_cls.fromisoformat(today) - timedelta(days=days - 1)).isoformat()
    checks = list(db.quick_checks.find({"user_id": uid, "date": {"$gte": since, "$lte": today}}))
    active_days = len({c["date"] for c in checks})

    progress = {"checks": len(checks), "days": active_days, "need_checks": MIN_CHECKS, "need_days": MIN_DAYS}
    if len(checks) < MIN_CHECKS or active_days < MIN_DAYS:
        return {"ready": False, "progress": progress, "insights": []}

    insights = []

    # When do impulses that shouldn't happen show up? Busiest sliding 2-hour window,
    # ties going to the window that starts at the busier hour
    not_now = [c for c in checks if c["verdict"] == "not_now" and c.get("hour") is not None]
    if len(not_now) >= MIN_SAMPLE:
        hours = Counter(c["hour"] for c in not_now)
        start = max(range(24), key=lambda h: (hours[h] + hours[(h + 1) % 24], hours[h]))
        count = hours[start] + hours[(start + 1) % 24]
        if count >= MIN_SAMPLE and count / len(not_now) >= 0.3:
            insights.append({
                "id": "distraction_window", "icon": "⏰",
                "text": f"You get pulled off-plan most often between {_fmt_hour(start)} and {_fmt_hour(start + 2)} "
                        f"({count} of {len(not_now)} 'Not now' checks). Plan your hardest task before then.",
            })

    caught = [c for c in checks if c["verdict"] == "not_now" and c.get("action") in ("skipped", "parked")]
    if caught:
        weeks = max(days / 7, 1)
        insights.append({
            "id": "caught", "icon": "🛡️",
            "text": f"You caught {len(caught)} time-waster{'s' if len(caught) != 1 else ''} before starting them "
                    f"in the last {days} days — about {round(len(caught) / weeks, 1)} a week.",
        })

    overrides = [c for c in checks if c["verdict"] == "not_now" and c.get("action") == "doing" and c.get("worth_it") is not None]
    if len(overrides) >= MIN_SAMPLE:
        bad = sum(1 for c in overrides if not c["worth_it"])
        insights.append({
            "id": "overrides", "icon": "🎲",
            "text": f"When you overrode 'Not now' and did it anyway, it wasn't worth it {_pct(bad, len(overrides))}% of the time "
                    f"({bad} of {len(overrides)}).",
        })

    went = [c for c in checks if c["verdict"] == "go" and c.get("action") == "doing" and c.get("worth_it") is not None]
    if len(went) >= MIN_SAMPLE:
        good = sum(1 for c in went if c["worth_it"])
        insights.append({
            "id": "go_accuracy", "icon": "🎯",
            "text": f"Things the check said 'Go ahead' to were worth it {_pct(good, len(went))}% of the time — "
                    f"{'trust it' if good / len(went) >= 0.7 else 'be a little stricter with your answers'}.",
        })

    # Where the time went
    insights.extend(_time_insights(checks, today))
    shift = _category_shift(uid, today)
    if shift:
        insights.append(shift)

    # Morning plan follow-through
    plans = list(db.day_plans.find({"user_id": uid, "date": {"$gte": since, "$lte": today}}))
    picks = [i for p in plans for i in p.get("items", []) if i["verdict"] in ("do_now", "minimum")]
    if len(picks) >= MIN_SAMPLE:
        ids = [ObjectId(i["todo_id"]) for i in picks if ObjectId.is_valid(i["todo_id"])]
        done = {str(t["_id"]) for t in db.todos.find({"_id": {"$in": ids}, "user_id": uid, "status": "done"}, {"_id": 1})}
        n_done = sum(1 for i in picks if i["todo_id"] in done)
        insights.append({
            "id": "plan_follow_through", "icon": "☀️",
            "text": f"You finished {n_done} of {len(picks)} 'Do now' tasks from your morning plans ({_pct(n_done, len(picks))}%)"
                    f" over {len(plans)} planned day{'s' if len(plans) != 1 else ''}.",
        })
    drops = sum(1 for p in plans for i in p.get("items", []) if i["verdict"] == "drop")
    if drops >= MIN_SAMPLE:
        insights.append({
            "id": "drops", "icon": "🧹",
            "text": f"You dropped {drops} low-value tasks in your morning plans instead of carrying them around.",
        })

    # Decisions looked back on: pressure and dread
    reviewed = list(db.decisions.find({"user_id": uid, "worth_it": {"$ne": None}}))
    pressured = [d for d in reviewed if d["values"].get("motive", 3) <= 2]
    if len(pressured) >= MIN_SAMPLE:
        bad = sum(1 for d in pressured if not d["worth_it"])
        insights.append({
            "id": "pressure", "icon": "🪨",
            "text": f"Decisions you made mainly from pressure turned out not worth it {_pct(bad, len(pressured))}% of the time.",
        })
    dreaded = [d for d in reviewed if d["values"].get("emotion", 3) <= 2]
    if len(dreaded) >= MIN_SAMPLE:
        good = sum(1 for d in dreaded if d["worth_it"])
        insights.append({
            "id": "dread", "icon": "🌧️",
            "text": f"Things you dreaded turned out worth it {_pct(good, len(dreaded))}% of the time"
                    f"{' — dread is a bad predictor for you' if good / len(dreaded) >= 0.6 else ''}.",
        })

    return {"ready": True, "progress": progress, "insights": insights}
