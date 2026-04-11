from fastapi import APIRouter, Depends, HTTPException, Path
from typing import List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from bson.errors import InvalidId

from core.database import db
from api.deps import get_current_user
from models.schemas import (
    SleepLogModel,
    WorkoutSessionModel,
    ExerciseGoalModel,
    HealthMetricsModel,
    MealLogModel,
    CustomExerciseIn,        # new — see below
    ExerciseGoalStatusPatch, # new — see below
)

router = APIRouter()

# ── Helpers ──────────────────────────────────────────────────────────────────

def utcnow() -> str:
    # FIX: datetime.utcnow() is deprecated in 3.12+; use timezone-aware form
    return datetime.now(timezone.utc).isoformat()

def serialize(doc: dict) -> dict:
    # FIX: never mutate the original dict; return a copy
    doc = dict(doc)
    doc['id'] = str(doc.pop('_id'))
    return doc

def valid_object_id(raw_id: str) -> ObjectId:
    # FIX: convert InvalidId into a clean 400 instead of an unhandled 500
    try:
        return ObjectId(raw_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid id: {raw_id}")

def user_id(current_user) -> str:
    return str(current_user['_id'])


# ── Sleep Logs ───────────────────────────────────────────────────────────────

@router.post("/sleep", response_model=dict)
def log_sleep(payload: SleepLogModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = user_id(current_user)
    doc['created_at'] = utcnow()
    res = db.sleep_logs.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/sleep", response_model=List[dict])
def get_sleep_logs(current_user=Depends(get_current_user)):
    docs = db.sleep_logs.find({"user_id": user_id(current_user)}).sort("date", -1)
    return [serialize(d) for d in docs]

@router.put("/sleep/{log_id}", response_model=dict)
def update_sleep_log(log_id: str, payload: SleepLogModel, current_user=Depends(get_current_user)):
    oid = valid_object_id(log_id)
    uid = user_id(current_user)
    res = db.sleep_logs.update_one(
        {"_id": oid, "user_id": uid},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    # FIX: re-apply user_id filter on the fetch to prevent cross-user data leak
    return serialize(db.sleep_logs.find_one({"_id": oid, "user_id": uid}))

@router.delete("/sleep/{log_id}")
def delete_sleep_log(log_id: str, current_user=Depends(get_current_user)):
    res = db.sleep_logs.delete_one({"_id": valid_object_id(log_id), "user_id": user_id(current_user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return {"detail": "Deleted successfully"}


# ── Workouts ─────────────────────────────────────────────────────────────────

@router.post("/workouts", response_model=dict)
def create_workout(payload: WorkoutSessionModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = user_id(current_user)
    doc['created_at'] = utcnow()
    res = db.workouts.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/workouts", response_model=List[dict])
def get_workouts(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.workouts.find({"user_id": user_id(current_user)}).sort("date", -1)]

@router.put("/workouts/{workout_id}", response_model=dict)
def update_workout(workout_id: str, payload: WorkoutSessionModel, current_user=Depends(get_current_user)):
    oid = valid_object_id(workout_id)
    uid = user_id(current_user)
    res = db.workouts.update_one(
        {"_id": oid, "user_id": uid},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")
    # FIX: user_id guard on the return fetch
    return serialize(db.workouts.find_one({"_id": oid, "user_id": uid}))

@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: str, current_user=Depends(get_current_user)):
    res = db.workouts.delete_one({"_id": valid_object_id(workout_id), "user_id": user_id(current_user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"detail": "Deleted successfully"}


# ── Exercise Goals ────────────────────────────────────────────────────────────

@router.post("/exercise-goals", response_model=dict)
def create_exercise_goal(payload: ExerciseGoalModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = user_id(current_user)
    doc['created_at'] = utcnow()
    res = db.exercise_goals.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/exercise-goals", response_model=List[dict])
def get_exercise_goals(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.exercise_goals.find({"user_id": user_id(current_user)}).sort("created_at", -1)]

@router.put("/exercise-goals/{goal_id}", response_model=dict)
def update_exercise_goal(goal_id: str, payload: ExerciseGoalModel, current_user=Depends(get_current_user)):
    oid = valid_object_id(goal_id)
    uid = user_id(current_user)
    res = db.exercise_goals.update_one(
        {"_id": oid, "user_id": uid},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    # FIX: user_id guard on the return fetch
    return serialize(db.exercise_goals.find_one({"_id": oid, "user_id": uid}))

# FIX: new PATCH route — frontend sends only { status } from achieved/failed buttons
@router.patch("/exercise-goals/{goal_id}", response_model=dict)
def patch_exercise_goal_status(
    goal_id: str,
    payload: ExerciseGoalStatusPatch,
    current_user=Depends(get_current_user),
):
    oid = valid_object_id(goal_id)
    uid = user_id(current_user)
    res = db.exercise_goals.update_one(
        {"_id": oid, "user_id": uid},
        {"$set": {"status": payload.status}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return serialize(db.exercise_goals.find_one({"_id": oid, "user_id": uid}))

@router.delete("/exercise-goals/{goal_id}")
def delete_exercise_goal(goal_id: str, current_user=Depends(get_current_user)):
    res = db.exercise_goals.delete_one({"_id": valid_object_id(goal_id), "user_id": user_id(current_user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"detail": "Deleted successfully"}


# ── Health Metrics ────────────────────────────────────────────────────────────

@router.post("/metrics", response_model=dict)
def log_metrics(payload: HealthMetricsModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    uid = user_id(current_user)
    db.health_metrics.replace_one(
        {"user_id": uid, "date": doc["date"]},
        {**doc, "user_id": uid, "updated_at": utcnow()},
        upsert=True
    )
    return serialize(db.health_metrics.find_one({"user_id": uid, "date": doc["date"]}))

@router.get("/metrics", response_model=List[dict])
def get_metrics(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.health_metrics.find({"user_id": user_id(current_user)}).sort("date", -1)]

# FIX: dedicated today shortcut so the frontend doesn't load full history just for today's water
@router.get("/metrics/today", response_model=dict)
def get_metrics_today(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = db.health_metrics.find_one({"user_id": user_id(current_user), "date": today})
    return serialize(doc) if doc else {}


# ── Meal Logs ─────────────────────────────────────────────────────────────────

@router.post("/meals", response_model=dict)
def create_meal(payload: MealLogModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = user_id(current_user)
    doc['created_at'] = utcnow()
    res = db.meal_logs.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/meals", response_model=List[dict])
def get_meals(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.meal_logs.find({"user_id": user_id(current_user)}).sort("date", -1)]

@router.put("/meals/{meal_id}", response_model=dict)
def update_meal(meal_id: str, payload: MealLogModel, current_user=Depends(get_current_user)):
    oid = valid_object_id(meal_id)
    uid = user_id(current_user)
    res = db.meal_logs.update_one(
        {"_id": oid, "user_id": uid},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    # FIX: user_id guard on the return fetch
    return serialize(db.meal_logs.find_one({"_id": oid, "user_id": uid}))

@router.delete("/meals/{meal_id}")
def delete_meal(meal_id: str, current_user=Depends(get_current_user)):
    res = db.meal_logs.delete_one({"_id": valid_object_id(meal_id), "user_id": user_id(current_user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"detail": "Deleted successfully"}


# ── Body Mapping ──────────────────────────────────────────────────────────────

@router.get("/body-mapping", response_model=dict)
def get_body_mapping(current_user=Depends(get_current_user)):
    forty_days_ago = (datetime.now(timezone.utc) - timedelta(days=40)).strftime("%Y-%m-%d")
    workouts = list(db.workouts.find({
        "user_id": user_id(current_user),
        "date": {"$gte": forty_days_ago}
    }))

    GROUPS = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Cardio"]
    stats = {g: {"volume": 0, "max_weight": 0, "sets": 0, "max_intensity": 0, "days_ago": 999} for g in GROUPS}

    for w in workouts:
        w_date_str = w.get("date", forty_days_ago)[:10]
        try:
            w_date = datetime.strptime(w_date_str, "%Y-%m-%d")
            d_ago = max(0, (datetime.now(timezone.utc).replace(tzinfo=None) - w_date).days)
        except Exception:
            d_ago = 999

        for ex in w.get("exercises", []):
            group = ex.get("muscle_group", "").capitalize()
            if group not in stats:
                continue
            stats[group]["days_ago"] = min(stats[group]["days_ago"], d_ago)

            for s in ex.get("sets", []):
                # FIX: Cardio sets use distance_km/duration_min, not reps/weight
                if group == "Cardio":
                    dist = s.get("distance_km", 0) or 0
                    dur  = s.get("duration_min", 0) or 0
                    vol  = dist * dur if dist > 0 else dur
                    stats[group]["volume"] += vol
                    stats[group]["sets"]   += 1
                    # intensity proxy: duration normalised to 60 min
                    intensity = min(100, (dur / 60) * 100) if dur > 0 else 0
                    stats[group]["max_intensity"] = max(stats[group]["max_intensity"], intensity)
                else:
                    reps   = s.get("reps", 0) or 0
                    weight = s.get("weight", 0) or 0
                    stats[group]["volume"] += reps * weight
                    stats[group]["sets"]   += 1
                    if weight > stats[group]["max_weight"]:
                        stats[group]["max_weight"] = weight
                    safe_reps = min(reps, 36)
                    if weight > 0 and safe_reps > 0:
                        orm       = weight * (36 / (37 - safe_reps))
                        intensity = min(100, (weight / orm) * 100)
                    elif weight == 0 and safe_reps > 0:
                        intensity = min(100, ((37 - safe_reps) / 36) * 100)
                    else:
                        intensity = 0
                    stats[group]["max_intensity"] = max(stats[group]["max_intensity"], intensity)

    ranks = {}
    for group, data in stats.items():
        recency = 0 if data["days_ago"] >= 10 else max(0, 1 - (data["days_ago"] / 10))
        score   = min(100, round(
            min(data["volume"] / 50, 40) +
            min(data["sets"] * 5, 20)    +
            (data["max_intensity"] * 0.25) +
            (recency * 15)
        ))
        if score >= 80:   rank = "Peak"
        elif score >= 60: rank = "Heavy"
        elif score >= 35: rank = "Moderate"
        elif score >= 15: rank = "Light"
        else:             rank = "Untrained"

        ranks[group] = {
            "volume":         data["volume"],
            "sets":           data["sets"],
            "max_weight":     data["max_weight"],
            "score":          score,
            "rank":           rank,
            "recency_factor": round(recency, 2),
            "days_ago":       data["days_ago"] if data["days_ago"] != 999 else "—",
        }
    return ranks


# ── Custom Exercises ──────────────────────────────────────────────────────────

@router.get("/custom-exercises")
def get_custom_exercises(current_user=Depends(get_current_user)):
    docs = list(db.custom_exercises.find({"user_id": user_id(current_user)}).sort("muscle_group", 1))
    return [serialize(d) for d in docs]

@router.post("/custom-exercises")
def add_custom_exercise(
    # FIX: typed Pydantic model replaces raw dict — validates and documents the contract
    payload: CustomExerciseIn,
    current_user=Depends(get_current_user),
):
    uid = user_id(current_user)
    # FIX: normalise to lowercase before storing to match frontend normaliseExName()
    name  = payload.exercise_name.strip().lower()
    group = payload.muscle_group.strip()
    existing = db.custom_exercises.find_one({"user_id": uid, "muscle_group": group, "exercise_name": name})
    if existing:
        return serialize(existing)
    doc = {
        "user_id":       uid,
        "muscle_group":  group,
        "exercise_name": name,
        "created_at":    utcnow(),
    }
    res = db.custom_exercises.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)

@router.delete("/custom-exercises/{ex_id}")
def delete_custom_exercise(ex_id: str, current_user=Depends(get_current_user)):
    res = db.custom_exercises.delete_one({"_id": valid_object_id(ex_id), "user_id": user_id(current_user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"detail": "Deleted"}