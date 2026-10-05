import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns/promises";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 180_000;
const MAX_PAGE = 1_200_000;
const MAX_SOURCES = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = process.env.MEMORY_FILE || path.join(__dirname, "data", "memories.json");
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

app.get("/health", (_req, res) => res.json({ ok: true, service: "ai-brain-web-research" }));
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
    const memory = { id: crypto.randomUUID(), topic: query, summary: usable.map(s => s.summary).join("\n\n").slice(0, 9000), sources: usable.map(s => s.url), createdAt: new Date().toISOString(), method: "bounded-web-research" };
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
  if (process.env.AI_API_URL && process.env.AI_API_KEY) {
    const response = await fetch(process.env.AI_API_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "You are AI Brain. Answer in the user's language. Use the research memory below when relevant, cite URLs, and say when you are unsure. Do not invent facts.\n\n" + context }, { role: "user", content: message }] }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) return res.status(502).json({ error: `AI provider returned ${response.status}` });
    const data = await response.json();
    return res.json({ reply: data.choices?.[0]?.message?.content || "No reply", memoriesUsed: memories.length });
  }
  const related = memories.filter(m => `${m.topic} ${m.summary}`.toLowerCase().includes(message.toLowerCase().split(/\\s+/)[0])).slice(-3);
  res.json({ reply: related.length ? `I found ${related.length} related research memory.\\n\\n${related.map(m => m.summary).join("\\n\\n")}` : "I am ready. Add an AI_API_URL and AI_API_KEY on the server for full conversational answers, or use Learn from Web to give me a topic.", memoriesUsed: related.length, setupRequired: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`AI Brain research API listening on 0.0.0.0:${PORT}`));
