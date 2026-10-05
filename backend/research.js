import dns from "node:dns/promises";
import net from "node:net";

const MAX_PAGE_BYTES = 1_500_000;
const USER_AGENT = "AIBrainResearch/1.0 (+user-controlled learning agent)";

function privateIp(ip) {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd");
}

export async function assertSafeUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only HTTPS URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
    throw new Error("Private or local network targets are not allowed");
  }
  return url;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}

function titleOf(html, fallback) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || fallback)
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function extractFacts(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 60 && s.length <= 360)
    .slice(0, 8);
}

export async function fetchPage(rawUrl) {
  const url = await assertSafeUrl(rawUrl);
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" } });
  if (response.status >= 300 && response.status < 400) throw new Error("Redirects are disabled for safe research; submit the final HTTPS URL");
  if (!response.ok) throw new Error(`Page returned HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/plain")) throw new Error("Only HTML and text pages are supported");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_PAGE_BYTES) throw new Error("Page is larger than the 1.5 MB research limit");
  const body = await response.text();
  if (Buffer.byteLength(body) > MAX_PAGE_BYTES) throw new Error("Page is larger than the 1.5 MB research limit");
  const text = htmlToText(body).slice(0, 12000);
  return { url: url.toString(), title: titleOf(body, url.hostname), text, facts: extractFacts(text) };
}

export async function searchWeb(query, limit = 5) {
  const q = String(query || "").trim();
  if (!q || q.length > 240) throw new Error("A query between 1 and 240 characters is required");
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const searchTarget = await assertSafeUrl(searchUrl);
  const response = await fetch(searchTarget, { headers: { "user-agent": USER_AGENT, accept: "text/html" } });
  if (!response.ok) throw new Error(`Search returned HTTP ${response.status}`);
  const html = await response.text();
  const results = [];
  const pattern = /result__a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(page.text)) && results.length < Math.min(10, limit)) {
    const href = match[1].replace(/&amp;/g, "&");
    if (href.startsWith("https://")) results.push({ url: href, title: match[2].replace(/<[^>]+>/g, "").trim() });
  }
  return results;
}
