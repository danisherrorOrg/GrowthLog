from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from bson import errors as bson_errors
from datetime import datetime
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.rate_limit import limiter

from core.database import create_indexes
from core.config import ALLOWED_ORIGINS
from utils.email import send_email

# ==============================================================================
# Security Documentation: CSRF Protection
# ==============================================================================
# Authentication in this API exclusively uses JWT Bearer tokens passed in the
# Authorization header. Because tokens are sent via headers and managed
# explicitly by the client (localStorage/memory), classic Cross-Site Request
# Forgery (CSRF) attacks are mitigated by default.
#
# WARNING: If this application ever migrates to using cookies for session
# management or auth tokens, YOU MUST add CSRF protection middleware immediately
# (e.g., using `fastapi-csrf-protect`) to prevent vulnerability.
# ==============================================================================

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
from api.routers.health import router as health_router
from api.routers.spirituality import router as spirituality_router
from api.routers.timeline import router as timeline_router
from api.routers.lotus import router as lotus_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_indexes()
    yield

app = FastAPI(title="GrowthLog API", version="2.2.0", lifespan=lifespan)

import uuid
import logging
from fastapi import Request

logger = logging.getLogger("uvicorn.error")

@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as e:
        logger.error(f"Request ID: {request_id} - UNHANDLED ERROR: {str(e)}", exc_info=True)
        raise

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

from pymongo.errors import ServerSelectionTimeoutError
@app.exception_handler(ServerSelectionTimeoutError)
async def server_timeout_handler(request, exc):
    return JSONResponse(status_code=503, content={"detail": "Service unavailable: Database connection timeout. Please try again later."})

from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    messages = []
    for err in exc.errors():
        field = err.get("loc", [""])[-1]
        if err.get("type", "").startswith("string_too_long"):
            limit = err.get("ctx", {}).get("max_length", "its limit")
            field_name = field.replace('_', ' ').capitalize() if isinstance(field, str) else field
            messages.append(f"'{field_name}' must be at most {limit} characters.")
        elif err.get("msg"):
            field_name = field.replace('_', ' ').capitalize() if isinstance(field, str) else field
            messages.append(f"{field_name}: {err['msg']}")
            
    # Combine messages into a single cleanly formatted string for toast notifications
    return JSONResponse(status_code=422, content={"detail": " ".join(messages)})


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
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(spirituality_router)
app.include_router(timeline_router)
app.include_router(lotus_router)









@app.get("/")
def root():
    return {"message": "GrowthLog API v2.2.0 Modular backend running"}

# --- Automated Reminders (Nudge Feature) ---
from fastapi import Header, HTTPException, Depends
import os
import hmac

def verify_admin(x_admin_token: str = Header(...)):
    admin_token = os.getenv("ADMIN_TOKEN")
    # If ADMIN_TOKEN is not set in env, we refuse all requests securely
    if not admin_token or not hmac.compare_digest(x_admin_token, admin_token):
        raise HTTPException(status_code=403, detail="Invalid admin credentials")

@app.post("/admin/nudge-silent-users", dependencies=[Depends(verify_admin)])
def nudge_silent_users(background_tasks: BackgroundTasks):
    from core.database import db
    from bson import ObjectId
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    logged_user_ids = db.daily_logs.distinct("user_id", {"date": today_str})
    logged_user_ids = [ObjectId(_id) for _id in logged_user_ids]
    
    silent_users = list(db.users.find({
        "_id": {"$nin": logged_user_ids}, 
        "is_verified": True,
        "email_notifications": True
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
