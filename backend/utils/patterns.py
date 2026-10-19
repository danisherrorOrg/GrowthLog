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


def _fmt_hour(h):
    h = h % 24
    return f"{12 if h % 12 == 0 else h % 12} {'AM' if h < 12 else 'PM'}"


def _pct(part, whole):
    return round(100 * part / whole)


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
