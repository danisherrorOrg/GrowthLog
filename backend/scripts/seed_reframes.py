import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import db
from utils.cache import utcnow

def seed_reframes(user_id):
    docs = [
        {
            "user_id": user_id,
            "trigger": "Making a mistake at work",
            "original_thought": "I'm a failure and everyone knows it.",
            "distortion": "All-or-Nothing Thinking",
            "reframe": "I made a specific mistake, which is a normal part of learning. I can fix it.",
            "feeling_before": 8,
            "feeling_after": 3,
            "created_at": utcnow()
        }
    ]
    db.reframes.insert_many(docs)
    print(f"Reframes seeded for {user_id}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        seed_reframes(sys.argv[1])
    else:
        print("Provide user_id as arg")
