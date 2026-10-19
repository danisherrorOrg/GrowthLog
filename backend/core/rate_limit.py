import ipaddress
import os

from slowapi import Limiter
from starlette.requests import Request


def _parse_trusted_proxies(raw: str):
    networks = []
    for item in raw.split(","):
        item = item.strip()
        if item:
            networks.append(ipaddress.ip_network(item, strict=False))
    return networks


# Comma-separated IPs/CIDRs of proxies in front of the API (e.g. "10.0.0.0/8,127.0.0.1").
# Forwarding headers are only honored when the direct peer is one of these; anyone else
# could set them to a fresh fake IP on every request and dodge the limits.
TRUSTED_PROXIES = _parse_trusted_proxies(os.getenv("TRUSTED_PROXIES", ""))


def _is_trusted(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr in net for net in TRUSTED_PROXIES)


def get_real_ip(request: Request) -> str:
    peer = request.client.host if request.client else "127.0.0.1"
    if not _is_trusted(peer):
        return peer

    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # Walk right to left: each trusted proxy appends the address it saw, so the
        # first untrusted hop is the real client. Entries left of it are client-supplied.
        hops = [h.strip() for h in forwarded_for.split(",") if h.strip()]
        for hop in reversed(hops):
            if not _is_trusted(hop):
                return hop
        if hops:
            return hops[0]

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return peer


limiter = Limiter(key_func=get_real_ip)
