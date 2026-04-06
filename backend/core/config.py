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
