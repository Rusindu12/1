import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns/promises";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { youtubeAuthUrl, saveYoutubeCode, youtubeStatus, uploadYoutubeVideo } from "./youtube.js";
import { createOriginalVideo } from "./video-factory.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 180_000;
const MAX_PAGE = 1_200_000;
const MAX_SOURCES = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = process.env.MEMORY_FILE || path.join(__dirname, "data", "memories.json");
const AGENT_FILE = process.env.AGENT_FILE || path.join(__dirname, "data", "agent.json");
const allowedHosts = (process.env.RESEARCH_ALLOWLIST || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "256kb" }));

// Set this in production. Leaving it unset is convenient for local development only.
const apiKey = process.env.RESEARCH_API_KEY;
app.use((req, res, next) => {
  if (!apiKey || req.path === "/health" || req.method === "GET") return next();
  if (req.get("authorization") === `Bearer ${apiKey}`) return next();
  return res.status(401).json({ error: "Research API key required" });
});

function isPrivateIp(ip) {
  return /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd");
}

async function safeUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only HTTPS pages are allowed");
  if (allowedHosts.length && !allowedHosts.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
    throw new Error("This domain is not in the research allowlist");
  }
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.some(a => isPrivateIp(a.address))) throw new Error("Private network addresses are blocked");
  return url;
}

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim().slice(0, MAX_BODY);
}

function simpleSummary(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 45);
  return sentences.slice(0, 8).join(" ").slice(0, 3000) || text.slice(0, 3000);
}

async function readMemories() {
  try { return JSON.parse(await fs.readFile(MEMORY_FILE, "utf8")); }
  catch { return []; }
}
async function writeMemories(items) {
  await fs.mkdir(path.dirname(MEMORY_FILE), { recursive: true });
  await fs.writeFile(MEMORY_FILE, JSON.stringify(items.slice(-1000), null, 2));
}

async function askModel(messages) {
  if (!process.env.AI_API_URL || !process.env.AI_API_KEY) return null;
  const response = await fetch(process.env.AI_API_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", messages }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

async function searchWeb(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "user-agent": "AIBrainResearch/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const html = await response.text();
  const results = [];
  const re = /result__a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && results.length < MAX_SOURCES) {
    const title = cleanHtml(match[2]);
    const href = match[1].replace(/&amp;/g, "&");
    if (href.startsWith("http")) results.push({ title, url: href });
  }
  return results;
}

async function fetchPage(rawUrl) {
  const url = await safeUrl(rawUrl);
  const response = await fetch(url, { headers: { "user-agent": "AIBrainResearch/1.0" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Page returned ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/plain")) throw new Error("Only HTML/text pages are supported");
  const text = cleanHtml((await response.text()).slice(0, MAX_PAGE));
  return { url: url.toString(), text };
}

async function readAgent() {
  try { return JSON.parse(await fs.readFile(AGENT_FILE, "utf8")); }
  catch { return { enabled: process.env.AGENT_AUTOSTART === "true", goals: (process.env.AGENT_GOALS || "AI technology,Sri Lanka news,science").split(",").map(s => s.trim()).filter(Boolean), cursor: 0, runs: 0, lastRun: null, lastError: null, dailyRuns: 0, day: new Date().toISOString().slice(0, 10) }; }
}
async function writeAgent(state) { await fs.mkdir(path.dirname(AGENT_FILE), { recursive: true }); await fs.writeFile(AGENT_FILE, JSON.stringify(state, null, 2)); }
async function agentTick() {
  const state = await readAgent();
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) { state.day = today; state.dailyRuns = 0; }
  const limit = Number(process.env.AGENT_DAILY_LIMIT || 12);
  if (!state.enabled || !state.goals.length || state.dailyRuns >= limit) return;
  const goal = state.goals[state.cursor % state.goals.length]; state.cursor++;
  try {
    const headers = { "content-type": "application/json" };
    if (process.env.RESEARCH_API_KEY) headers.authorization = `Bearer ${process.env.RESEARCH_API_KEY}`;
    const response = await fetch(`http://127.0.0.1:${PORT}/api/research`, { method: "POST", headers, body: JSON.stringify({ query: goal }) });
    if (!response.ok) throw new Error(`research returned ${response.status}`);
    state.runs++; state.dailyRuns++; state.lastRun = { goal, at: new Date().toISOString() }; state.lastError = null;
    if (process.env.AGENT_AUTO_VIDEO === "true") {
      const video = await createOriginalVideo(goal);
      const uploaded = await uploadYoutubeVideo({ filePath: video.filePath, title: `AI Brain: ${goal}`.slice(0, 100), description: `Original AI-generated video about ${goal}.`, privacyStatus: process.env.YOUTUBE_DEFAULT_PRIVACY || "private" });
      state.lastVideo = { goal, ...uploaded, at: new Date().toISOString() };
    }
  } catch (error) { state.lastError = error.message; }
  await writeAgent(state);
}
const upload = multer({ dest: path.join(__dirname, "data", "uploads"), limits: { fileSize: 500 * 1024 * 1024 } });
app.post("/api/video/create", async (req, res) => { try { const topic = String(req.body?.topic || "").trim(); if (topic.length < 3 || topic.length > 300) return res.status(400).json({ error: "topic must be 3-300 characters" }); const video = await createOriginalVideo(topic); res.json({ id: video.id, script: video.script, file: video.filePath, note: "Original generated video; review before public upload." }); } catch (e) { res.status(502).json({ error: e.message }); } });
app.get("/api/youtube/auth", (_req, res) => { try { res.json({ url: youtubeAuthUrl() }); } catch (e) { res.status(503).json({ error: e.message }); } });
app.get("/api/youtube/callback", async (req, res) => { try { await saveYoutubeCode(String(req.query.code || "")); res.send("YouTube connected. You can close this page."); } catch (e) { res.status(400).send(e.message); } });
app.get("/api/youtube/status", async (_req, res) => res.json(await youtubeStatus()));
app.post("/api/youtube/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "video file is required" });
  const privacyStatus = process.env.YOUTUBE_DEFAULT_PRIVACY || "private";
  if (privacyStatus === "public" && process.env.YOUTUBE_ALLOW_PUBLIC !== "true") return res.status(403).json({ error: "Public upload is disabled until YOUTUBE_ALLOW_PUBLIC=true" });
  try { const result = await uploadYoutubeVideo({ filePath: req.file.path, title: String(req.body.title || "AI Brain video").slice(0, 100), description: String(req.body.description || "").slice(0, 5000), privacyStatus }); res.json(result); }
  catch (e) { res.status(502).json({ error: e.message }); }
  finally { await fs.rm(req.file.path, { force: true }); }
});

const agentTimer = setInterval(agentTick, Math.max(5, Number(process.env.AGENT_INTERVAL_MINUTES || 60)) * 60 * 1000);
agentTimer.unref();
if (process.env.AGENT_AUTOSTART === "true") setTimeout(agentTick, 3000);

app.get("/health", (_req, res) => res.json({ ok: true, service: "ai-brain-web-research" }));
app.get("/api/agent/status", async (_req, res) => res.json(await readAgent()));
app.post("/api/agent/start", async (_req, res) => { const s = await readAgent(); s.enabled = true; await writeAgent(s); res.json(s); });
app.post("/api/agent/stop", async (_req, res) => { const s = await readAgent(); s.enabled = false; await writeAgent(s); res.json(s); });
app.post("/api/agent/goals", async (req, res) => { const goals = Array.isArray(req.body?.goals) ? req.body.goals.map(String).map(s => s.trim()).filter(Boolean).slice(0, 30) : []; if (!goals.length) return res.status(400).json({ error: "at least one goal is required" }); const s = await readAgent(); s.goals = goals; s.cursor = 0; await writeAgent(s); res.json(s); });
app.get("/api/memories", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const memories = await readMemories();
  res.json({ memories: q ? memories.filter(m => `${m.topic} ${m.summary}`.toLowerCase().includes(q)).slice(-50) : memories.slice(-50) });
});

app.post("/api/research", async (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (query.length < 3 || query.length > 300) return res.status(400).json({ error: "query must be 3-300 characters" });
  try {
    const links = Array.isArray(req.body.urls) && req.body.urls.length ? req.body.urls.slice(0, MAX_SOURCES).map(String) : await searchWeb(query);
    const sources = [];
    for (const link of links) {
      try {
        const page = await fetchPage(link);
        sources.push({ url: page.url, title: link, summary: simpleSummary(page.text) });
      } catch (error) { sources.push({ url: link, error: error.message }); }
    }
    const usable = sources.filter(s => s.summary);
    const rawResearch = usable.map(s => `Source: ${s.url}\n${s.summary}`).join("\n\n").slice(0, 12000);
    const aiSummary = await askModel([{ role: "system", content: "You are a careful research librarian. Summarize the supplied web research in the user's language. Keep important facts, clearly mark uncertainty, and retain source URLs. Do not invent facts." }, { role: "user", content: `Topic: ${query}\n\n${rawResearch}` }]);
    const memory = { id: crypto.randomUUID(), topic: query, summary: (aiSummary || rawResearch).slice(0, 9000), sources: usable.map(s => s.url), createdAt: new Date().toISOString(), method: aiSummary ? "bounded-web-research+ai-summary" : "bounded-web-research" };
    const memories = await readMemories();
    memories.push(memory);
    await writeMemories(memories);
    res.json({ memory, sources, note: "Stored as research memory. The AI must cite these sources and should not treat them as verified truth." });
  } catch (error) { res.status(502).json({ error: error.message }); }
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message || message.length > 4000) return res.status(400).json({ error: "message must be 1-4000 characters" });
  const memories = await readMemories();
  const context = memories.slice(-8).map(m => `Topic: ${m.topic}\n${m.summary}\nSources: ${m.sources.join(", ")}`).join("\n\n");
  try {
    const reply = await askModel([{ role: "system", content: "You are AI Brain. Answer in the user's language. Use the research memory below when relevant, cite URLs, and say when you are unsure. Do not invent facts.\n\n" + context }, { role: "user", content: message }]);
    if (reply) return res.json({ reply, memoriesUsed: memories.length });
  } catch (error) { return res.status(502).json({ error: error.message }); }
  const firstWord = message.toLowerCase().split(/\s+/)[0];
  const related = memories.filter(m => `${m.topic} ${m.summary}`.toLowerCase().includes(firstWord)).slice(-3);
  res.json({ reply: related.length ? `I found ${related.length} related research memory.\n\n${related.map(m => m.summary).join("\n\n")}` : "I am ready. Configure an AI_API_URL and AI_API_KEY on the server for full conversational answers, or use Learn from Web to give me a topic.", memoriesUsed: related.length, setupRequired: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`AI Brain research API listening on 0.0.0.0:${PORT}`));
