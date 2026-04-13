from pymongo import MongoClient, ASCENDING, DESCENDING
from core.config import MONGO_URL, DB_NAME

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def create_indexes():
    # ── Categories ────────────────────────────────────────────────────────────
    try:
        db.categories.create_index(
            [("user_id", ASCENDING), ("name", ASCENDING)],
            unique=True
        )
    except Exception as e:
        print(f"WARNING: Could not create unique index on categories: {e}. Please deduplicate manually.")
    db.categories.create_index([("user_id", ASCENDING), ("archived", ASCENDING)])

    # ── Goals ─────────────────────────────────────────────────────────────────
    db.goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.goals.create_index([("user_id", ASCENDING), ("category_id", ASCENDING)])

    # ── Daily logs / snapshots / manifestations ───────────────────────────────
    db.daily_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.manifestations.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.snapshots.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

    # ── Health: sleep / workouts ──────────────────────────────────────────────
    db.sleep_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.workouts.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.meal_logs.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

    # ── Health metrics — unique per (user, date) to match upsert contract ─────
    try:
        db.health_metrics.create_index(
            [("user_id", ASCENDING), ("date", DESCENDING)],
            unique=True
        )
    except Exception as e:
        print(f"WARNING: Could not create unique index on health_metrics: {e}. Please deduplicate manually.")

    # ── Exercise goals ────────────────────────────────────────────────────────
    db.exercise_goals.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.exercise_goals.create_index([("user_id", ASCENDING), ("status", ASCENDING)])

    # ── Custom exercises — unique per (user, group, name) ─────────────────────
    try:
        db.custom_exercises.create_index(
            [("user_id", ASCENDING), ("muscle_group", ASCENDING), ("exercise_name", ASCENDING)],
            unique=True
        )
    except Exception as e:
        print(f"WARNING: Could not create unique index on custom_exercises: {e}. Please deduplicate manually.")

    # ── Mind Garden & Cognitive Reframing ─────────────────────────────────────
    db.thoughts.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.reframes.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    # ── Library & Media ───────────────────────────────────────────────────────
    db.books.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.quotes.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    # ── Insights & Analytics ──────────────────────────────────────────────────
    db.anti_goals.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.habit_graveyard.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.time_entries.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.screen_time.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.procrastination_log.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.not_to_do.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    # ── Aging & Long-term Life (Time Capsule) ─────────────────────────────────
    db.regrets.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.future_advice.create_index([("user_id", ASCENDING), ("target_read_date", DESCENDING)])
    db.past_advice.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.life_lessons.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    # ── Creativity & Passions ─────────────────────────────────────────────────
    db.project_ideas.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.creative_sessions.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

    # ── Spirituality & Play ───────────────────────────────────────────────────
    db.meaning_log.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.travel_log.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.bucket_list.create_index([("user_id", ASCENDING), ("status", ASCENDING)])

    # ── Career & Growth ───────────────────────────────────────────────────────
    db.skills.create_index([("user_id", ASCENDING), ("proficiency", ASCENDING)])
    db.courses.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.failure_log.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.skills_gap.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.feedback.create_index([("user_id", ASCENDING), ("date", DESCENDING)])

    # ── User & Auth ───────────────────────────────────────────────────────────
    try:
        db.users.create_index("email", unique=True)
    except Exception as e:
        print(f"WARNING: Could not create unique index on users.email: {e}")
    db.activity_logs.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])

    # ── Cache ─────────────────────────────────────────────────────────────────
    db.server_cache.create_index([("expire_at", ASCENDING)], expireAfterSeconds=0)