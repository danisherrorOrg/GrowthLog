from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from bson import errors as bson_errors
from datetime import datetime

from core.database import create_indexes
from core.config import ALLOWED_ORIGINS
from utils.email import send_email

# Routers
from api.routers.auth import router as auth_router, public_router
from api.routers.categories import router as categories_router
from api.routers.goals import router as goals_router
from api.routers.logs import router as logs_router
from api.routers.manifestations import router as manifestations_router
from api.routers.snapshots import router as snapshots_router
from api.routers.dashboard import router as dashboard_router, prompts_router
from api.routers.todos import router as todos_router
from api.routers.quotes import router as quotes_router
from api.routers.books import router as books_router
from api.routers.reframes import router as reframes_router
from api.routers.activity import router as activity_router
from api.routers.thoughts import router as thoughts_router
from api.routers.insights import router as insights_router
from api.routers.growth_career import router as growth_career_router
from api.routers.passions import router as passions_router
from api.routers.time_capsule import router as time_capsule_router

app = FastAPI(title="GrowthLog API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(bson_errors.InvalidId)
async def invalid_id_handler(request, exc):
    return JSONResponse(status_code=400, content={"detail": "Invalid ID format"})

@app.on_event("startup")
def startup_event():
    create_indexes()

# Mount routers
app.include_router(auth_router)
app.include_router(public_router)
app.include_router(categories_router)
app.include_router(goals_router)
app.include_router(logs_router)
app.include_router(manifestations_router)
app.include_router(snapshots_router)
app.include_router(dashboard_router)
app.include_router(prompts_router)
app.include_router(todos_router)
app.include_router(quotes_router)
app.include_router(books_router)
app.include_router(reframes_router)
app.include_router(activity_router)
app.include_router(thoughts_router)
app.include_router(insights_router)
app.include_router(growth_career_router)
app.include_router(passions_router)
app.include_router(time_capsule_router)






from api.routers.timeline import router as timeline_router
app.include_router(timeline_router)

@app.get("/")
def root():
    return {"message": "GrowthLog API v2.2.0 Modular backend running"}

# --- Automated Reminders (Nudge Feature) ---
@app.post("/admin/nudge-silent-users")
def nudge_silent_users(background_tasks: BackgroundTasks):
    from core.database import db
    from bson import ObjectId
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    logged_user_ids = db.daily_logs.distinct("user_id", {"date": today_str})
    logged_user_ids = [ObjectId(_id) for _id in logged_user_ids]
    
    silent_users = list(db.users.find({
        "_id": {"$nin": logged_user_ids}, 
        "is_verified": True,
        "email_notifications": {"$ne": False}
    }))
    
    for user in silent_users:
        subject = "✦ A small nudge for your future self"
        body = f"""
        <div style="font-family: sans-serif; max-width: 500px; padding: 40px; background: #fdfcf9; border: 1px solid #eee;">
            <h2 style="font-family: serif; color: #6b8c6b;">Keep the streak alive, {user['name']}?</h2>
            <p>Growth is built on small, daily reflections. You haven't checked in today yet!</p>
            <p>It only takes 2 minutes to record how you're feeling and what you've learned.</p>
            <a href="{ALLOWED_ORIGINS[0]}/log" style="display: inline-block; background: #c9a84c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px;">Log Today's Growth →</a>
            <p style="font-size: 12px; color: #999; margin-top: 40px;">GrowthLog — Holistic Tracking for the Intentional Life</p>
        </div>
        """
        background_tasks.add_task(send_email, user['email'], subject, body)
        
    return {"status": "success", "nudge_count": len(silent_users)}
