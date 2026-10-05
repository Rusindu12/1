import http from "node:http";
import { fetchPage, searchWeb } from "./research.js";
import { listMemories, remember } from "./memory.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const clients = new Map();

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": ALLOWED_ORIGIN, "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}
function allowed(req) {
  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const state = clients.get(ip) || { at: now, count: 0 };
  if (now - state.at > WINDOW_MS) { state.at = now; state.count = 0; }
  state.count += 1; clients.set(ip, state);
  return state.count <= MAX_REQUESTS;
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 20_000) throw new Error("Request too large"); }
  return JSON.parse(raw || "{}");
}
async function research(input) {
  const urls = Array.isArray(input.urls) ? input.urls.slice(0, 5) : [];
  const targets = urls.length ? urls : (await searchWeb(input.query, 5)).map((result) => result.url);
  if (!targets.length) throw new Error("No safe HTTPS sources were found");
  const learned = [];
  for (const url of targets) {
    try {
      const page = await fetchPage(url);
      const record = await remember({ title: page.title, url: page.url, summary: page.text.slice(0, 1000), facts: page.facts, confidence: 0.55 });
      learned.push(record);
    } catch (error) { learned.push({ url, error: error.message }); }
  }
  return { query: input.query || null, learned, count: learned.filter((x) => !x.error).length };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (!allowed(req)) return json(res, 429, { error: "Rate limit exceeded; try again in a minute" });
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, service: "ai-brain-research", time: new Date().toISOString() });
    if (req.method === "GET" && url.pathname === "/api/memory") return json(res, 200, { entries: await listMemories(Number(url.searchParams.get("limit") || 50)) });
    if (req.method === "POST" && url.pathname === "/api/research") return json(res, 200, await research(await body(req)));
    if (req.method === "POST" && url.pathname === "/api/learn-url") {
      const input = await body(req);
      if (!input.url) throw new Error("url is required");
      return json(res, 200, await research({ urls: [input.url] }));
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) { return json(res, 400, { error: error.message || "Request failed" }); }
});
server.listen(PORT, HOST, () => console.log(`AI Brain research backend listening on http://${HOST}:${PORT}`));
