# AI Brain Web Research API

Bounded web-learning backend for the hosted AI Brain. It searches DuckDuckGo HTML, fetches up to five HTTPS HTML/text pages, removes scripts/markup, creates a conservative extractive summary, and stores the result with source URLs in `server/data/memories.json`.

## Run

```bash
cd server
npm install
cp .env.example .env
# edit .env: add your provider key and a random RESEARCH_API_KEY
set -a; . ./.env; set +a
npm start
```

For full AI chat and AI-generated research summaries, configure an OpenAI-compatible provider in `.env`. OpenRouter, OpenAI, Together, Groq and a self-hosted server are supported by changing `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL`. Never put this provider key in the APK or browser. The API listens on `0.0.0.0:8787` so it can be deployed behind a normal HTTPS reverse proxy.

- `GET /health`
- `GET /api/memories?q=optional-search`
- `POST /api/research` with `{ "query": "topic" }`
- `POST /api/research` with `{ "query": "topic", "urls": ["https://example.com/article"] }`

## Important safety limits

- HTTPS only; private/local IP ranges are blocked to reduce SSRF risk.
- Use `RESEARCH_ALLOWLIST=example.com,docs.example.com` in production.
- Keep the API behind HTTPS and authentication before exposing it publicly.
- This stores summaries and citations; it does **not** silently change model weights or execute code.
- The brain should treat memories as untrusted research and show the source links to the user.

## Automatic brain development

The server can run the research loop independently, so it continues when the phone or PC app is closed. It rotates through configured goals, saves cited memories, and respects a daily budget. It does not rewrite its own code, install software, trade, send messages, or take irreversible actions.

Set `AGENT_AUTOSTART=true`, `AGENT_INTERVAL_MINUTES=60`, and `AGENT_DAILY_LIMIT=12` to enable it on the server. Or control it from the app's **Automatic Brain Development** panel. The `/api/agent/status`, `/api/agent/start`, `/api/agent/stop`, and `/api/agent/goals` endpoints are available. Keep the API key enabled in production.

The Android app and PC/browser app use the same backend URL, so memories and agent status are shared across devices. Deploy this backend behind HTTPS and configure the app's API URL before using autonomous research.
