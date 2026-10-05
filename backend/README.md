# AI Brain Research Backend

A small Node 18 backend that lets the AI Brain learn from public HTTPS pages. It searches DuckDuckGo HTML when given a query, fetches up to five pages, extracts readable text and stores source-linked memories in `backend/data/brain-memory.json`.

## Run

```bash
cd backend
npm run check
npm start
```

The server listens on `0.0.0.0:8787`. Set `PORT`, `HOST`, `ALLOWED_ORIGIN`, and `BRAIN_DATA_DIR` as needed.

## API

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/api/research \
  -H 'content-type: application/json' \
  -d '{"query":"Sinhala language history"}'

curl -X POST http://localhost:8787/api/learn-url \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'

curl http://localhost:8787/api/memory?limit=20
```

This is intentionally bounded: HTTPS only, no credentials, redirects disabled, private/local IPs blocked, 1.5 MB page limit, five sources per run, 20 requests/minute per client, and no arbitrary code execution. Do not expose it publicly without HTTPS, authentication, and a persistent database. The memory file is runtime data and is ignored by git.
