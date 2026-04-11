from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timedelta
from bson import ObjectId

from core.database import db
from api.deps import get_current_user
from models.schemas import (
    SleepLogModel,
    WorkoutSessionModel,
    ExerciseGoalModel,
    HealthMetricsModel,
    MealLogModel
)

router = APIRouter()

def serialize(doc):
    if not doc: return None
    doc['id'] = str(doc['_id'])
    del doc['_id']
    return doc

# ----------------- SLEEP LOGS -----------------
@router.post("/sleep", response_model=dict)
def log_sleep(payload: SleepLogModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = str(current_user['_id'])
    doc['created_at'] = datetime.utcnow().isoformat()
    res = db.sleep_logs.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/sleep", response_model=List[dict])
def get_sleep_logs(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.sleep_logs.find({"user_id": str(current_user["_id"])}).sort("date", -1)]

@router.put("/sleep/{log_id}", response_model=dict)
def update_sleep_log(log_id: str, payload: SleepLogModel, current_user=Depends(get_current_user)):
    res = db.sleep_logs.update_one(
        {"_id": ObjectId(log_id), "user_id": str(current_user["_id"])},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return serialize(db.sleep_logs.find_one({"_id": ObjectId(log_id)}))

@router.delete("/sleep/{log_id}")
def delete_sleep_log(log_id: str, current_user=Depends(get_current_user)):
    res = db.sleep_logs.delete_one({"_id": ObjectId(log_id), "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return {"message": "Deleted successfully"}


# ----------------- WORKOUTS -----------------
@router.post("/workouts", response_model=dict)
def create_workout(payload: WorkoutSessionModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = str(current_user['_id'])
    doc['created_at'] = datetime.utcnow().isoformat()
    res = db.workouts.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/workouts", response_model=List[dict])
def get_workouts(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.workouts.find({"user_id": str(current_user["_id"])}).sort("date", -1)]

@router.put("/workouts/{workout_id}", response_model=dict)
def update_workout(workout_id: str, payload: WorkoutSessionModel, current_user=Depends(get_current_user)):
    res = db.workouts.update_one(
        {"_id": ObjectId(workout_id), "user_id": str(current_user["_id"])},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")
    return serialize(db.workouts.find_one({"_id": ObjectId(workout_id)}))

@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: str, current_user=Depends(get_current_user)):
    res = db.workouts.delete_one({"_id": ObjectId(workout_id), "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"message": "Deleted successfully"}


# ----------------- EXERCISE GOALS -----------------
@router.post("/exercise-goals", response_model=dict)
def create_exercise_goal(payload: ExerciseGoalModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = str(current_user['_id'])
    doc['created_at'] = datetime.utcnow().isoformat()
    res = db.exercise_goals.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/exercise-goals", response_model=List[dict])
def get_exercise_goals(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.exercise_goals.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)]

@router.put("/exercise-goals/{goal_id}", response_model=dict)
def update_exercise_goal(goal_id: str, payload: ExerciseGoalModel, current_user=Depends(get_current_user)):
    res = db.exercise_goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return serialize(db.exercise_goals.find_one({"_id": ObjectId(goal_id)}))

@router.delete("/exercise-goals/{goal_id}")
def delete_exercise_goal(goal_id: str, current_user=Depends(get_current_user)):
    res = db.exercise_goals.delete_one({"_id": ObjectId(goal_id), "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Deleted successfully"}


# ----------------- HEALTH METRICS (WATER, OVERALL) -----------------
@router.post("/metrics", response_model=dict)
def log_metrics(payload: HealthMetricsModel, current_user=Depends(get_current_user)):
    # Upsert pattern for same date
    doc = payload.model_dump()
    res = db.health_metrics.replace_one(
        {"user_id": str(current_user["_id"]), "date": doc["date"]},
        {**doc, "user_id": str(current_user["_id"]), "updated_at": datetime.utcnow().isoformat()},
        upsert=True
    )
    return serialize(db.health_metrics.find_one({"user_id": str(current_user["_id"]), "date": doc["date"]}))

@router.get("/metrics", response_model=List[dict])
def get_metrics(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.health_metrics.find({"user_id": str(current_user["_id"])}).sort("date", -1)]


# ----------------- MEAL LOGS (CALORIES & MACROS) -----------------
@router.post("/meals", response_model=dict)
def create_meal(payload: MealLogModel, current_user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc['user_id'] = str(current_user['_id'])
    doc['created_at'] = datetime.utcnow().isoformat()
    res = db.meal_logs.insert_one(doc)
    doc['_id'] = res.inserted_id
    return serialize(doc)

@router.get("/meals", response_model=List[dict])
def get_meals(current_user=Depends(get_current_user)):
    return [serialize(d) for d in db.meal_logs.find({"user_id": str(current_user["_id"])}).sort("date", -1)]

@router.put("/meals/{meal_id}", response_model=dict)
def update_meal(meal_id: str, payload: MealLogModel, current_user=Depends(get_current_user)):
    res = db.meal_logs.update_one(
        {"_id": ObjectId(meal_id), "user_id": str(current_user["_id"])},
        {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return serialize(db.meal_logs.find_one({"_id": ObjectId(meal_id)}))

@router.delete("/meals/{meal_id}")
def delete_meal(meal_id: str, current_user=Depends(get_current_user)):
    res = db.meal_logs.delete_one({"_id": ObjectId(meal_id), "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"message": "Deleted successfully"}


# ----------------- BODY MAPPING AGGREGATION -----------------
@router.get("/body-mapping", response_model=dict)
def get_body_mapping(current_user=Depends(get_current_user)):
    # Calculate muscle group "status" using the detailed Composite Rank formulation
    forty_days_ago = (datetime.utcnow() - timedelta(days=40)).strftime("%Y-%m-%d")
    workouts = list(db.workouts.find({"user_id": str(current_user["_id"]), "date": {"$gte": forty_days_ago}}))
    
    # Initialize data structures
    stats = {}
    for g in ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Cardio"]:
        stats[g] = {"volume": 0, "max_weight": 0, "sets": 0, "max_intensity": 0, "days_ago": 999}

    # Aggregate metrics per muscle group
    for w in workouts:
        # Calculate days since this workout
        w_date_str = w.get("date", forty_days_ago)[:10]
        try:
            w_date = datetime.strptime(w_date_str, "%Y-%m-%d")
            d_ago = max(0, (datetime.utcnow() - w_date).days)
        except Exception:
            d_ago = 999

        for ex in w.get("exercises", []):
            group = ex.get("muscle_group", "").capitalize()
            if group in stats:
                stats[group]["days_ago"] = min(stats[group]["days_ago"], d_ago)
                for s in ex.get("sets", []):
                    reps = s.get("reps", 0)
                    weight = s.get("weight", 0)
                    
                    vol = reps * weight
                    stats[group]["volume"] += vol
                    stats[group]["sets"] += 1
                    
                    if weight > stats[group]["max_weight"]:
                        stats[group]["max_weight"] = weight
                        
                    # Calculate intensity via Brzycki (fallback for bodyweight)
                    safe_reps = min(reps, 36)
                    intensity = 0
                    if weight > 0 and safe_reps > 0:
                        orm = weight * (36 / (37 - safe_reps))
                        intensity = min(100, (weight / orm) * 100)
                    elif weight == 0 and safe_reps > 0: # Proxy effort for bodyweight
                        intensity = min(100, ((37 - safe_reps) / 36) * 100)
                        
                    stats[group]["max_intensity"] = max(stats[group]["max_intensity"], intensity)

    # Compute Composite Score (0-100)
    ranks = {}
    for group, data in stats.items():
        vol = data["volume"]
        sets = data["sets"]
        intensity = data["max_intensity"]
        d_ago = data["days_ago"]
        
        # recency factor (decays to 0 at 10 days)
        recency = 0 if d_ago >= 10 else max(0, 1 - (d_ago / 10))
        
        score = min(vol / 50, 40) + min(sets * 5, 20) + (intensity * 0.25) + (recency * 15)
        score = round(min(100, score))
        
        if score >= 80:
            rank = "Peak"
        elif score >= 60:
            rank = "Heavy"
        elif score >= 35:
            rank = "Moderate"
        elif score >= 15:
            rank = "Light"
        else:
            rank = "Untrained"
        
        ranks[group] = {
            "volume": vol,
            "sets": sets,
            "max_weight": data["max_weight"],
            "score": score,
            "rank": rank,
            "recency_factor": round(recency, 2),
            "days_ago": d_ago if d_ago != 999 else "—"
        }
    
    return ranks


# ── Custom Exercises (per-user exercise library) ──────────────────────────────

@router.get("/custom-exercises")
def get_custom_exercises(current_user=Depends(get_current_user)):
    """Return all custom exercises saved by this user, grouped-friendly."""
    docs = list(db.custom_exercises.find({"user_id": str(current_user["_id"])}).sort("muscle_group", 1))
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result


@router.post("/custom-exercises")
def add_custom_exercise(payload: dict, current_user=Depends(get_current_user)):
    """Save a new exercise name under a muscle group for the current user."""
    name  = (payload.get("exercise_name") or "").strip()
    group = (payload.get("muscle_group")  or "").strip()
    if not name or not group:
        raise HTTPException(status_code=400, detail="exercise_name and muscle_group are required")
    # Idempotent — don't create duplicates
    existing = db.custom_exercises.find_one({
        "user_id": str(current_user["_id"]),
        "muscle_group": group,
        "exercise_name": name,
    })
    if existing:
        existing["id"] = str(existing.pop("_id"))
        return existing
    doc = {
        "user_id": str(current_user["_id"]),
        "muscle_group": group,
        "exercise_name": name,
        "created_at": datetime.utcnow().isoformat(),
    }
    res = db.custom_exercises.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@router.delete("/custom-exercises/{ex_id}")
def delete_custom_exercise(ex_id: str, current_user=Depends(get_current_user)):
    """Remove a custom exercise from the user's personal library."""
    res = db.custom_exercises.delete_one({
        "_id": ObjectId(ex_id),
        "user_id": str(current_user["_id"]),
    })
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}
