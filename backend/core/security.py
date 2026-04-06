import bcrypt
import jwt
from datetime import timedelta
from utils.cache import utcnow
from core.config import JWT_SECRET

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(uid: str, version: int = 1) -> str:
    return jwt.encode(
        {"user_id": uid, "v": version, "exp": utcnow() + timedelta(days=30)},
        JWT_SECRET, algorithm="HS256"
    )
