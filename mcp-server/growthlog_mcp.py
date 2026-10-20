"""GrowthLog MCP server.

Lets an AI agent create an account, log in and use every GrowthLog feature by calling
the backend API. It talks to the API over HTTP, so it works with a local backend or a
deployed one.

Tools:
  register / login / logout / whoami  - account and session
  list_endpoints / describe_endpoint  - discover the API from its OpenAPI schema
  call_api                            - call any endpoint as the logged-in user

Settings (environment variables):
  GROWTHLOG_API_URL   API base URL (default http://localhost:8000)
  GROWTHLOG_EMAIL     optional: log in automatically with these credentials
  GROWTHLOG_PASSWORD
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

API_URL = os.environ.get("GROWTHLOG_API_URL", "http://localhost:8000").rstrip("/")
SESSION_FILE = Path(os.environ.get(
    "GROWTHLOG_SESSION_FILE", Path.home() / ".config" / "growthlog-mcp" / "session.json"
))
METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}
# Calls that wipe data for good; call_api makes the agent pass confirm=True for these
DESTRUCTIVE = {("DELETE", "/auth/me"), ("DELETE", "/auth/me/data")}

mcp = MCPServer(
    "growthlog",
    instructions=(
        "Tools for using the GrowthLog personal growth app (daily logs, todos, goals, "
        "manifestations, thoughts, reframes, snapshots, books, quotes, dashboard and more). "
        "Log in first (or register a new account). To do something without a dedicated tool, "
        "use list_endpoints to find the route, describe_endpoint to see its fields, then call_api. "
        "Dates are YYYY-MM-DD in the user's timezone."
    ),
)

logging.getLogger("httpx").setLevel(logging.WARNING)  # don't log every request

_token: str | None = None
_openapi: dict | None = None


# ---------- session ----------

def _load_session() -> None:
    global _token
    try:
        data = json.loads(SESSION_FILE.read_text())
        if data.get("api_url") == API_URL:
            _token = data.get("token")
    except (OSError, ValueError):
        pass


def _save_session(token: str | None) -> None:
    global _token
    _token = token
    try:
        if token is None:
            SESSION_FILE.unlink(missing_ok=True)
            return
        SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
        SESSION_FILE.write_text(json.dumps({"api_url": API_URL, "token": token}))
        SESSION_FILE.chmod(0o600)  # the token is a login credential
    except OSError:
        pass  # session still works in memory


def _local_timezone() -> str | None:
    # IANA name like "Asia/Kolkata", so new accounts don't default to UTC
    tz = os.environ.get("TZ")
    if tz:
        return tz
    try:
        link = os.readlink("/etc/localtime")
        return link.split("zoneinfo/", 1)[1]
    except (OSError, IndexError):
        return None


# ---------- HTTP ----------

def _request(method: str, path: str, *, params: dict | None = None, body: Any = None,
             auth: bool = True) -> tuple[int, Any]:
    headers = {"Accept": "application/json"}
    if auth and _token:
        headers["Authorization"] = f"Bearer {_token}"
    try:
        r = httpx.request(method, f"{API_URL}{path}", params=params, json=body,
                          headers=headers, timeout=90)  # a sleeping free-tier host can take ~1 min to wake
    except httpx.HTTPError as e:
        raise ToolError(f"Can't reach the GrowthLog API at {API_URL}: {e}") from e
    try:
        data = r.json()
    except ValueError:
        data = r.text
    return r.status_code, data


def _auto_login() -> None:
    email, password = os.environ.get("GROWTHLOG_EMAIL"), os.environ.get("GROWTHLOG_PASSWORD")
    if email and password:
        login(email, password)


def _authed(method: str, path: str, **kw) -> Any:
    if not _token:
        _auto_login()
    if not _token:
        raise ToolError("Not logged in. Use the login or register tool first.")
    status, data = _request(method, path, **kw)
    if status == 401 and os.environ.get("GROWTHLOG_EMAIL"):
        _save_session(None)  # expired token: log in again once and retry
        _auto_login()
        status, data = _request(method, path, **kw)
    if status == 401:
        _save_session(None)
        raise ToolError(f"Session expired or invalid ({_detail(data)}). Log in again.")
    if status >= 400:
        raise ToolError(f"API error {status}: {_detail(data)}")
    return data


def _detail(data: Any) -> str:
    if isinstance(data, dict) and "detail" in data:
        d = data["detail"]
        return d if isinstance(d, str) else json.dumps(d)
    return data if isinstance(data, str) else json.dumps(data)


def _schema() -> dict:
    global _openapi
    if _openapi is None:
        status, data = _request("GET", "/openapi.json", auth=False)
        if status != 200 or not isinstance(data, dict):
            raise ToolError(f"Couldn't load the API schema (HTTP {status}).")
        _openapi = data
    return _openapi


def _resolve(node: Any, spec: dict, depth: int = 0) -> Any:
    # Inline $ref links so the agent sees the actual fields
    if depth > 8:
        return node
    if isinstance(node, dict):
        if "$ref" in node:
            name = node["$ref"].rsplit("/", 1)[-1]
            return _resolve(spec["components"]["schemas"].get(name, {}), spec, depth + 1)
        return {k: _resolve(v, spec, depth + 1) for k, v in node.items() if k != "title"}
    if isinstance(node, list):
        return [_resolve(v, spec, depth + 1) for v in node]
    return node


# ---------- account tools ----------

@mcp.tool()
def register(name: str, email: str, password: str, timezone: str | None = None) -> dict:
    """Create a new GrowthLog account and log in as it.

    timezone is an IANA name like "Asia/Kolkata"; defaults to this computer's timezone.
    Password must be at least 8 characters.
    """
    status, data = _request("POST", "/auth/register", auth=False, body={
        "name": name, "email": email, "password": password,
        "timezone": timezone or _local_timezone(),
    })
    if status >= 400:
        raise ToolError(f"Registration failed ({status}): {_detail(data)}")
    _save_session(data.get("token"))
    return {"message": "Account created and logged in.", "user": data.get("user")}


@mcp.tool()
def login(email: str, password: str) -> dict:
    """Log in to GrowthLog. The session is remembered until logout or expiry."""
    status, data = _request("POST", "/auth/login", auth=False, body={
        "email": email, "password": password, "timezone": _local_timezone(),
    })
    if status >= 400:
        raise ToolError(f"Login failed ({status}): {_detail(data)}")
    _save_session(data.get("token"))
    return {"message": "Logged in.", "user": data.get("user")}


@mcp.tool()
def logout() -> str:
    """Log out and forget the saved session."""
    if _token:
        _request("POST", "/auth/logout")
    _save_session(None)
    return "Logged out."


@mcp.tool()
def whoami() -> dict:
    """Show the logged-in user's profile (name, email, streak, timezone...)."""
    return _authed("GET", "/auth/me")


# ---------- API discovery and generic access ----------

@mcp.tool()
def list_endpoints(search: str | None = None) -> str:
    """List GrowthLog API endpoints as "METHOD /path - summary".

    search filters by path or summary text, e.g. "todos", "goal", "reframe", "dashboard".
    """
    spec = _schema()
    rows = []
    needle = (search or "").lower()
    for path, ops in spec.get("paths", {}).items():
        for method, op in ops.items():
            if method.upper() not in METHODS:
                continue
            line = f"{method.upper()} {path} - {op.get('summary', '')}"
            if needle in line.lower():
                rows.append(line)
    return "\n".join(rows) or f"No endpoints match '{search}'."


@mcp.tool()
def describe_endpoint(method: str, path: str) -> dict:
    """Show an endpoint's path/query parameters and request body fields.

    Use the path exactly as list_endpoints prints it, e.g. ("POST", "/todos").
    """
    spec = _schema()
    op = spec.get("paths", {}).get(path, {}).get(method.lower())
    if not op:
        raise ToolError(f"No endpoint {method.upper()} {path}. Use list_endpoints to find it.")
    out: dict[str, Any] = {"endpoint": f"{method.upper()} {path}", "summary": op.get("summary")}
    if op.get("parameters"):
        out["parameters"] = [
            {"name": p["name"], "in": p["in"], "required": p.get("required", False),
             "schema": _resolve(p.get("schema", {}), spec)}
            for p in op["parameters"]
        ]
    body = op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema")
    if body:
        out["body"] = _resolve(body, spec)
    return out


@mcp.tool()
def call_api(method: str, path: str, query: dict | None = None, body: dict | list | None = None,
             confirm: bool = False) -> Any:
    """Call any GrowthLog API endpoint as the logged-in user.

    path is the real path with ids filled in, e.g. "/todos/6650.../complete" or "/logs/2026-10-20".
    query holds query-string parameters; body is the JSON body for POST/PUT/PATCH.
    Deleting the account or all its data requires confirm=True; ask the user first.
    """
    method = method.upper()
    if method not in METHODS:
        raise ToolError(f"Method must be one of {sorted(METHODS)}.")
    if not path.startswith("/"):
        path = "/" + path
    if (method, path.rstrip("/")) in DESTRUCTIVE and not confirm:
        raise ToolError("This permanently deletes data. Confirm with the user, then retry with confirm=True.")
    data = _authed(method, path, params=query, body=body)
    if (method, path.rstrip("/")) == ("DELETE", "/auth/me"):
        _save_session(None)
    # A bare list would reach the agent as one message per item; keep it as one result
    if isinstance(data, list):
        return {"count": len(data), "items": data}
    return data


# ---------- shortcuts for everyday actions ----------

@mcp.tool()
def dashboard() -> Any:
    """Get the dashboard: streak, stats, recent activity and trends."""
    return _authed("GET", "/dashboard")


@mcp.tool()
def today() -> dict:
    """Get the current local time, today's daily log (if any) and pending todos."""
    return {
        "now_on_this_computer": datetime.now().astimezone().isoformat(timespec="minutes"),
        "today_log": _authed("GET", "/logs/today"),
        "open_todos": _authed("GET", "/todos", params={"status": "pending"}),
    }


_load_session()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
