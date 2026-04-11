from pymongo import MongoClient, ASCENDING, DESCENDING
from core.config import MONGO_URL, DB_NAME

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def create_indexes():
    # Category uniqueness: try to create, but don't crash the whole app if there's legacy duplicate data
    try:
        db.categories.create_index([("user_id", ASCENDING), ("name", ASCENDING)], unique=True)
    except Exception as e:
        print(f"WARNING: Could not create unique index on categories: {e}. Please deduplicate manually.")
    db.categories.create_index([("user_id", ASCENDING), ("archived", ASCENDING)])
    db.goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.goals.create_index([("user_id", ASCENDING), ("category_id", ASCENDING)])
    db.daily_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.manifestations.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.snapshots.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

    db.sleep_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.workouts.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.exercise_goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.health_metrics.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.meal_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

