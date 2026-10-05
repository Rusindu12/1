# AI Brain Web Research API

Bounded web-learning backend for the hosted AI Brain. It searches DuckDuckGo HTML, fetches up to five HTTPS HTML/text pages, removes scripts/markup, creates a conservative extractive summary, and stores the result with source URLs in `server/data/memories.json`.

## Run

```bash
cd server
npm install
CORS_ORIGIN=https://your-ai-brain-site.example npm start
```

The API listens on `0.0.0.0:8787` so it can be deployed behind a normal HTTPS reverse proxy.

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

The hosted website must call this API from its chat/research action. The Android APK currently wraps the hosted website; deploy this backend and configure the website's API URL before the APK can use autonomous research.
