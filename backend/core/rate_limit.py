from slowapi import Limiter
from starlette.requests import Request

def get_real_ip(request: Request) -> str:
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip
        
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
        
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
        
    host = request.client.host if request.client else "127.0.0.1"
    return host

limiter = Limiter(key_func=get_real_ip)
