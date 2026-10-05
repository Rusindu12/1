import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.BRAIN_DATA_DIR || path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(DATA_DIR, "brain-memory.json");

async function loadMemory() {
  try { return JSON.parse(await readFile(MEMORY_FILE, "utf8")); }
  catch { return { version: 1, updatedAt: null, entries: [] }; }
}

export async function listMemories(limit = 50) {
  const db = await loadMemory();
  return db.entries.slice(0, Math.max(1, Math.min(200, limit)));
}

export async function remember(entry) {
  const db = await loadMemory();
  const key = `${entry.title}|${entry.url}`.toLowerCase();
  const existing = db.entries.findIndex((item) => `${item.title}|${item.url}`.toLowerCase() === key);
  const record = {
    id: existing >= 0 ? db.entries[existing].id : crypto.randomUUID(),
    title: String(entry.title || "Untitled").slice(0, 240),
    url: entry.url,
    summary: String(entry.summary || "").slice(0, 3000),
    facts: Array.isArray(entry.facts) ? entry.facts.slice(0, 20) : [],
    learnedAt: new Date().toISOString(),
    confidence: Math.max(0, Math.min(1, Number(entry.confidence ?? 0.5)))
  };
  if (existing >= 0) db.entries.splice(existing, 1);
  db.entries.unshift(record);
  db.entries = db.entries.slice(0, 1000);
  db.updatedAt = record.learnedAt;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MEMORY_FILE, JSON.stringify(db, null, 2), "utf8");
  return record;
}
