import os
from dotenv import load_dotenv

load_dotenv()

def get_env_variable(name):
    value = os.getenv(name)
    if value is None:
        raise RuntimeError(f"Missing required env variable: {name}")
    return value

MONGO_URL = get_env_variable("MONGO_URL")
JWT_SECRET = get_env_variable("JWT_SECRET")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# SMTP Config (Optional in dev, required for prod)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_SENDER = os.getenv("SMTP_SENDER", "noreply@growthlog.app")

DB_NAME = os.getenv("DB_NAME", "growthlog")

# Auth cookie. Secure needs HTTPS (browsers make an exception for http://localhost).
# Serve the API through the frontend's domain (see frontend/vercel.json) so the cookie is
# first-party. A cross-site API needs AUTH_COOKIE_SAMESITE=none, which browsers that block
# third-party cookies still refuse.
AUTH_COOKIE_NAME = "growthlog_session"
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "true").lower() != "false"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").lower()
if AUTH_COOKIE_SAMESITE not in ("lax", "strict", "none"):
    raise RuntimeError("AUTH_COOKIE_SAMESITE must be lax, strict or none")
if AUTH_COOKIE_SAMESITE == "none" and not AUTH_COOKIE_SECURE:
    raise RuntimeError("AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true")
# Unsafe requests authenticated by cookie must carry this header (CSRF defense)
CSRF_HEADER = "X-Requested-With"
