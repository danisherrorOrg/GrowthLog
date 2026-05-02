import io
import csv
import json
import zipfile
from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from api.deps import get_current_user
from core.database import db

router = APIRouter(prefix="/export", tags=["Export"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

COLLECTIONS = [
    "categories", "goals", "daily_logs", "manifestations", "snapshots",
    "sleep_logs", "workouts", "meal_logs", "health_metrics", "exercise_goals",
    "custom_exercises", "thoughts", "reframes", "books", "quotes",
    "anti_goals", "habit_graveyard", "time_entries", "screen_time",
    "procrastination_log", "not_to_do", "regrets", "future_advice",
    "past_advice", "life_lessons", "project_ideas", "creative_sessions",
    "meaning_log", "travel_log", "bucket_list", "skills", "courses",
    "failure_log", "skills_gap", "feedback", "todos", "lotus_boards",
]


class _Encoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def _serialize(doc: dict) -> dict:
    """Recursively convert ObjectIds / datetimes to strings."""
    return json.loads(json.dumps(doc, cls=_Encoder))


def _fetch_user_data(user_id: str) -> dict:
    """Fetch all data for *user_id* and return as a plain dict."""
    existing = set(db.list_collection_names())
    data: dict[str, list] = {}

    for col in COLLECTIONS:
        if col in existing:
            docs = list(db[col].find({"user_id": user_id}))
            data[col] = [_serialize(d) for d in docs]

    profile = db.users.find_one({"_id": ObjectId(user_id)})
    if profile:
        profile.pop("password", None)
        data["profile"] = _serialize(profile)

    return data


def _dict_to_csv(records: list[dict]) -> str:
    """Convert a list of flat-ish dicts to a CSV string."""
    if not records:
        return ""
    # Gather all keys (preserve insertion order, union across rows)
    keys: list[str] = []
    seen: set[str] = set()
    for r in records:
        for k in r:
            if k not in seen:
                keys.append(k)
                seen.add(k)

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=keys, extrasaction="ignore")
    writer.writeheader()
    for r in records:
        # Flatten nested values to JSON strings so CSV stays readable
        flat = {
            k: (json.dumps(v, cls=_Encoder) if isinstance(v, (dict, list)) else v)
            for k, v in r.items()
        }
        writer.writerow(flat)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/all")
async def export_all_json(current_user: dict = Depends(get_current_user)):
    """Download all user data as a single JSON file."""
    user_id = str(current_user["_id"])
    data = _fetch_user_data(user_id)

    json_bytes = json.dumps(data, indent=2, cls=_Encoder).encode("utf-8")

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=growthlog_export.json",
            "Content-Length": str(len(json_bytes)),
        },
    )


@router.get("/all/zip")
async def export_all_zip(current_user: dict = Depends(get_current_user)):
    """Download all user data as a ZIP containing one JSON + one CSV per collection."""
    user_id = str(current_user["_id"])
    data = _fetch_user_data(user_id)

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Master JSON
        master_json = json.dumps(data, indent=2, cls=_Encoder)
        zf.writestr("growthlog_export.json", master_json)

        # Per-collection CSVs
        for col_name, records in data.items():
            if col_name == "profile":
                # Profile is a single dict – wrap it in a list for CSV
                csv_str = _dict_to_csv([records] if isinstance(records, dict) else records)
            else:
                csv_str = _dict_to_csv(records if isinstance(records, list) else [])

            if csv_str:
                zf.writestr(f"csv/{col_name}.csv", csv_str)

    zip_bytes = zip_buf.getvalue()

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=growthlog_export.zip",
            "Content-Length": str(len(zip_bytes)),
        },
    )


@router.get("/collection/{collection_name}")
async def export_collection(
    collection_name: str,
    current_user: dict = Depends(get_current_user),
):
    """Download a single collection as JSON."""
    user_id = str(current_user["_id"])
    existing = set(db.list_collection_names())

    if collection_name not in COLLECTIONS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found or not exportable.")

    records: list = []
    if collection_name in existing:
        docs = list(db[collection_name].find({"user_id": user_id}))
        records = [_serialize(d) for d in docs]

    json_bytes = json.dumps(records, indent=2, cls=_Encoder).encode("utf-8")

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=growthlog_{collection_name}.json",
            "Content-Length": str(len(json_bytes)),
        },
    )
