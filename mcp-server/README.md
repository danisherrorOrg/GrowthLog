# GrowthLog MCP server

Lets an AI agent (Claude Code, Claude Desktop, or any MCP client) use GrowthLog for you:
create an account, log in, and add logs, todos, goals, thoughts and so on just by asking.

It calls the GrowthLog backend API over HTTP, so the backend must be running
(locally or deployed).

## Tools

| Tool | What it does |
|---|---|
| `register` | Create a new account and log in as it |
| `login` / `logout` | Start or end a session (remembered between restarts) |
| `whoami` | Show the logged-in user's profile |
| `today` | Today's daily log and pending todos |
| `dashboard` | Streak, stats and trends |
| `list_endpoints` | Find API routes, e.g. `search="goal"` |
| `describe_endpoint` | Show the fields a route expects |
| `call_api` | Call any route as the logged-in user |

The last three give the agent the whole API (about 260 routes), read from the backend's
`/openapi.json`, so new backend features show up without changing this server.
Deleting the account or all of its data requires `confirm=True`, and the agent is told to
check with you first.

## Setup

Needs [uv](https://docs.astral.sh/uv/). It installs Python and the dependencies on first run.

1. Pick a backend. The repo's `.mcp.json` uses the hosted one at
   `https://growthlog-1.onrender.com`. To use a local backend instead, start it
   (`docker compose up`) and set `GROWTHLOG_API_URL` to `http://localhost:8000`.
2. Connect your client:

**Claude Code**: the repo's `.mcp.json` already registers the server. Open Claude Code in the
repo root, approve the `growthlog` server, and run `/mcp` to check it is connected.

**Claude Desktop**: add this to `claude_desktop_config.json`, using the absolute path:

```json
{
  "mcpServers": {
    "growthlog": {
      "command": "uv",
      "args": ["run", "--directory", "/absolute/path/to/GrowthLog/mcp-server", "growthlog_mcp.py"],
      "env": { "GROWTHLOG_API_URL": "https://growthlog-1.onrender.com" }
    }
  }
}
```

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `GROWTHLOG_API_URL` | `http://localhost:8000` | Backend to talk to (point it at your deployed API to use production) |
| `GROWTHLOG_EMAIL`, `GROWTHLOG_PASSWORD` | unset | Log in automatically, so you never type your password in chat |
| `GROWTHLOG_SESSION_FILE` | `~/.config/growthlog-mcp/session.json` | Where the login token is saved (file mode 600) |

## Example prompts

- "Create a GrowthLog account for Asha, asha@example.com, password …"
- "Log today: mood 8, energy 6, 45 minutes of reading in the Mind category."
- "Add a high-priority todo to finish the report by Friday, then show my pending todos."
- "Create a goal to run a 10k by December with three milestones."
- "What does my dashboard say about this week?"

Notes:
- Login and register are rate limited by the backend to 5 per minute.
- A free Render backend sleeps when idle, so the first request can take up to a minute.
