import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request

from core.database import db
from api.deps import get_current_user
from core.rate_limit import limiter

router = APIRouter(prefix="/search", tags=["search"])

PER_TYPE_LIMIT = 5
SNIPPET_RADIUS = 60

# Each source: collection, result type, searchable fields (dotted paths reach into lists of
# sub-documents), the field the title comes from, the sort/date field, and the page to open.
SOURCES = [
    {"collection": "daily_logs", "type": "daily_log", "label": "Daily Log",
     "fields": ["highlight", "entries.text", "gratitude", "regret"],
     "title": None, "date": "date", "link": lambda d: f"/log?date={d.get('date', '')}"},
    {"collection": "goals", "type": "goal", "label": "Goal",
     "fields": ["title", "description", "reflection"],
     "title": "title", "date": "created_at", "link": lambda d: f"/goals/{d['_id']}"},
    {"collection": "todos", "type": "todo", "label": "To-Do",
     "fields": ["title", "description"],
     "title": "title", "date": "created_at", "link": lambda d: "/todos"},
    {"collection": "thoughts", "type": "thought", "label": "Thought",
     "fields": ["content", "tags"],
     "title": "content", "date": "created_at", "link": lambda d: "/thoughts"},
    {"collection": "decisions", "type": "decision", "label": "Decision",
     "fields": ["task", "good", "bad", "ifnot", "first_step", "outcome_note"],
     "title": "task", "date": "created_at", "link": lambda d: "/decisions"},
    {"collection": "reframes", "type": "reframe", "label": "Reframe",
     "fields": ["trigger", "original_thought", "reframe", "tags"],
     "title": "trigger", "date": "created_at", "link": lambda d: "/reframes"},
    {"collection": "reviews", "type": "review", "label": "Review",
     "fields": ["period_label", "wins", "challenges", "learnings", "intentions", "tags"],
     "title": "period_label", "date": "start_date", "link": lambda d: "/reviews"},
    {"collection": "manifestations", "type": "manifestation", "label": "Manifestation",
     "fields": ["vision", "notes"],
     "title": "vision", "date": "start_date", "link": lambda d: f"/manifestations/{d['_id']}"},
    {"collection": "snapshots", "type": "snapshot", "label": "Snapshot",
     "fields": ["description", "values"],
     "title": "description", "date": "date", "link": lambda d: f"/snapshots/{d['_id']}"},
    {"collection": "books", "type": "book", "label": "Book",
     "fields": ["title", "author", "notes", "description", "wisdom.content", "wisdom.thoughts"],
     "title": "title", "date": "created_at", "link": lambda d: f"/books/{d['_id']}"},
    {"collection": "quotes", "type": "quote", "label": "Quote",
     "fields": ["content", "author", "source", "tags"],
     "title": "content", "date": "created_at", "link": lambda d: "/knowledge"},
    {"collection": "lotus", "type": "lotus", "label": "Lotus Blossom",
     "fields": ["title"],
     "title": "title", "date": "updated_at", "link": lambda d: f"/lotus/{d['_id']}"},
    {"collection": "categories", "type": "category", "label": "Category",
     "fields": ["name", "description"],
     "title": "name", "date": None, "link": lambda d: f"/categories/{d['_id']}"},
]


def _values_at(doc, path):
    """All string values at a dotted path, walking through lists along the way."""
    current = [doc]
    for key in path.split("."):
        nxt = []
        for item in current:
            if isinstance(item, dict) and key in item:
                value = item[key]
                nxt.extend(value if isinstance(value, list) else [value])
        current = nxt
    return [v for v in current if isinstance(v, str)]


def _snippet(text, pattern):
    """A short window of text around the first match, with ellipses where it was cut."""
    text = " ".join(text.split())
    m = pattern.search(text)
    if not m:
        return text[:SNIPPET_RADIUS * 2]
    start = max(m.start() - SNIPPET_RADIUS, 0)
    end = min(m.end() + SNIPPET_RADIUS, len(text))
    return ("…" if start > 0 else "") + text[start:end] + ("…" if end < len(text) else "")


def _date_str(value):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, str):
        return value[:10]
    return None


@router.get("")
@limiter.limit("60/minute")
def search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100),
    current_user=Depends(get_current_user),
):
    uid = str(current_user["_id"])
    q = q.strip()
    if len(q) < 2:
        return {"query": q, "results": []}

    # Escaped so user input can't be a regex (prevents ReDoS)
    escaped = re.escape(q)
    pattern = re.compile(escaped, re.IGNORECASE)

    results = []
    for src in SOURCES:
        query = {
            "user_id": uid,
            "$or": [{f: {"$regex": escaped, "$options": "i"}} for f in src["fields"]],
        }
        projection = {f.split(".")[0]: 1 for f in src["fields"]}
        for extra in (src["title"], src["date"]):
            if extra:
                projection[extra] = 1
        cursor = db[src["collection"]].find(query, projection)
        if src["date"]:
            cursor = cursor.sort(src["date"], -1)

        for doc in cursor.limit(PER_TYPE_LIMIT):
            date = _date_str(doc.get(src["date"])) if src["date"] else None
            matched = next(
                (v for f in src["fields"] for v in _values_at(doc, f) if pattern.search(v)),
                "",
            )
            if src["title"]:
                title = " ".join(str(doc.get(src["title"]) or "").split())[:100] or src["label"]
            else:
                title = f"{src['label']} · {date}" if date else src["label"]
            snippet = _snippet(matched, pattern)
            results.append({
                "id": str(doc["_id"]),
                "type": src["type"],
                "label": src["label"],
                "title": title,
                # Skip the snippet when it would just repeat the title
                "snippet": "" if snippet == title else snippet,
                "date": date,
                "link": src["link"](doc),
            })

    return {"query": q, "results": results}
