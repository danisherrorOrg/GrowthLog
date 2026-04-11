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
    # Calculate muscle group "status" based on volume (Weight * Reps) over last 30 days
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    workouts = list(db.workouts.find({"user_id": str(current_user["_id"]), "date": {"$gte": thirty_days_ago}}))
    
    # Initialize data structures
    stats = {
        "Chest": {"volume": 0, "max_weight": 0, "sets": 0},
        "Back": {"volume": 0, "max_weight": 0, "sets": 0},
        "Legs": {"volume": 0, "max_weight": 0, "sets": 0},
        "Arms": {"volume": 0, "max_weight": 0, "sets": 0},
        "Shoulders": {"volume": 0, "max_weight": 0, "sets": 0},
        "Core": {"volume": 0, "max_weight": 0, "sets": 0},
        "Cardio": {"volume": 0, "max_weight": 0, "sets": 0}
    }

    # Aggregate total volume per muscle group
    for w in workouts:
        for ex in w.get("exercises", []):
            group = ex.get("muscle_group", "").capitalize()
            if group in stats:
                for s in ex.get("sets", []):
                    reps = s.get("reps", 0)
                    weight = s.get("weight", 0)
                    vol = reps * weight
                    stats[group]["volume"] += vol
                    stats[group]["sets"] += 1
                    if weight > stats[group]["max_weight"]:
                        stats[group]["max_weight"] = weight

    # Map volume to ranking classifications (Thresholds based on monthly volume in KG)
    ranks = {}
    for group, data in stats.items():
        vol = data["volume"]
        
        if vol == 0:
            rank = "Untrained"
        elif vol < 1500:
            rank = "Weak"
        elif vol < 6000:
            rank = "Average"
        elif vol < 18000:
            rank = "Good"
        elif vol < 40000:
            rank = "Elite"
        else:
            rank = "Diamond"
        
        ranks[group] = {
            "volume": vol,
            "sets": data["sets"],
            "max_weight": data["max_weight"],
            "rank": rank,
            "thresholds": {
                "Weak": 0,
                "Average": 1500,
                "Good": 6000,
                "Elite": 18000,
                "Diamond": 40000
            }
        }
    
    return ranks

