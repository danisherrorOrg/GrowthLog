from core.database import db
from utils.cache import utcnow, cache_invalidate_exact, cache_invalidate_prefix

# Every collection that stores per-user documents keyed by a string `user_id`.
USER_DATA_COLLECTIONS = [
    "categories", "category_templates", "goals", "manifestations", "snapshots", "daily_logs",
    "sleep_logs", "workouts", "meal_logs", "health_metrics", "exercise_goals", "custom_exercises",
    "thoughts", "reframes", "books", "quotes", "todos",
    "anti_goals", "habit_graveyard", "time_entries", "screen_time", "procrastination_log", "not_to_do",
    "regrets", "future_advice", "past_advice", "life_lessons",
    "project_ideas", "creative_sessions",
    "meaning_log", "travel_log", "bucket_list",
    "skills", "courses", "failure_log", "skills_gap", "feedback", "feedback_received",
    "trigger_journal", "bad_decisions", "weakness_map",
    "lotus", "reviews", "task_checkins",
    "quick_checks", "day_plans", "decisions", "activity_logs",
]

# Progress counters on the user document that are derived from logged data.
USER_PROGRESS_RESET = {
    "streak": 0,
    "longest_streak": 0,
    "last_log_date": None,
    "streak_shields": 0,
    "shield_milestones": [],
}


def default_categories(uid: str) -> list:
    now = utcnow()
    return [
        {"user_id": uid, "name": "Mind", "icon": "🧠", "color": "#c9a84c", "description": "Learning, intellect, and mental health", "archived": False, "created_at": now},
        {"user_id": uid, "name": "Body", "icon": "💪", "color": "#6b8c6b", "description": "Physical health, fitness, and nutrition", "archived": False, "created_at": now},
        {"user_id": uid, "name": "Career", "icon": "💼", "color": "#5b8ba8", "description": "Professional growth and work tasks", "archived": False, "created_at": now},
        {"user_id": uid, "name": "Finance", "icon": "💰", "color": "#8b6bc4", "description": "Wealth, savings, and investments", "archived": False, "created_at": now},
        {"user_id": uid, "name": "Spirit", "icon": "🌿", "color": "#c46b8b", "description": "Peace, philosophy, and connection", "archived": False, "created_at": now},
    ]


def wipe_user_data(uid: str) -> int:
    """Delete every document the user owns across all data collections. Returns the count removed."""
    deleted = 0
    for coll in USER_DATA_COLLECTIONS:
        deleted += db[coll].delete_many({"user_id": uid}).deleted_count
    cache_invalidate_prefix(f"dashboard:{uid}:")
    cache_invalidate_prefix(f"categories:{uid}:")
    cache_invalidate_exact(f"categories:{uid}")
    cache_invalidate_exact(f"stats:{uid}")
    return deleted
