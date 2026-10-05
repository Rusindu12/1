import fs from "node:fs/promises";
import path from "node:path";
import { google } from "googleapis";

const tokenFile = process.env.YOUTUBE_TOKEN_FILE || path.resolve("server/data/youtube-token.json");
const scopes = ["https://www.googleapis.com/auth/youtube.upload"];
function oauth() { return new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, process.env.YOUTUBE_REDIRECT_URI); }
export function youtubeConfigured() { return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REDIRECT_URI); }
export function youtubeAuthUrl() { const client = oauth(); return client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: scopes }); }
async function clientWithToken() { const client = oauth(); client.setCredentials(JSON.parse(await fs.readFile(tokenFile, "utf8"))); return client; }
export async function saveYoutubeCode(code) { const { tokens } = await oauth().getToken(code); await fs.mkdir(path.dirname(tokenFile), { recursive: true }); await fs.writeFile(tokenFile, JSON.stringify(tokens)); }
export async function youtubeStatus() { try { await fs.access(tokenFile); return { configured: youtubeConfigured(), connected: true }; } catch { return { configured: youtubeConfigured(), connected: false }; } }
export async function uploadYoutubeVideo({ filePath, title, description, privacyStatus = "private" }) {
  if (!youtubeConfigured()) throw new Error("YouTube OAuth is not configured");
  const auth = await clientWithToken();
  const youtube = google.youtube({ version: "v3", auth });
  const result = await youtube.videos.insert({ part: ["snippet", "status"], requestBody: { snippet: { title, description, categoryId: "24" }, status: { privacyStatus, selfDeclaredMadeForKids: false } }, media: { body: (await import("node:fs")).createReadStream(filePath) } });
  return { id: result.data.id, url: `https://www.youtube.com/watch?v=${result.data.id}` };
}
