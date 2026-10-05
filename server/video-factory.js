import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const root = path.resolve(process.env.VIDEO_DIR || "server/data/videos");
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
async function modelScript(topic) {
  if (!process.env.AI_API_URL || !process.env.AI_API_KEY) throw Error("AI provider is required for video scripts");
  const r = await fetch(process.env.AI_API_URL, { method:"POST", headers:{"content-type":"application/json", authorization:`Bearer ${process.env.AI_API_KEY}`}, body:JSON.stringify({model:process.env.AI_MODEL||"gpt-4o-mini",messages:[{role:"system",content:"Write an original 60-90 second YouTube entertainment script. Return only narration, no copyrighted quotes, no false claims, and use the user's language."},{role:"user",content:`Topic: ${topic}`}]}), signal:AbortSignal.timeout(30000)});
  if(!r.ok) throw Error(`AI provider returned ${r.status}`); const d=await r.json(); return d.choices?.[0]?.message?.content||"";
}
async function voice(script, out) {
  if(!process.env.TTS_API_URL||!process.env.TTS_API_KEY) throw Error("TTS_API_URL and TTS_API_KEY are required");
  const r=await fetch(process.env.TTS_API_URL,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${process.env.TTS_API_KEY}`},body:JSON.stringify({model:process.env.TTS_MODEL||"tts-1",input:script,voice:process.env.TTS_VOICE||"alloy",response_format:"mp3"}),signal:AbortSignal.timeout(60000)});
  if(!r.ok) throw Error(`TTS provider returned ${r.status}`); await fs.writeFile(out,Buffer.from(await r.arrayBuffer()));
}
export async function createOriginalVideo(topic) {
  await fs.mkdir(root,{recursive:true}); const id=crypto.randomUUID(); const dir=path.join(root,id); await fs.mkdir(dir); const script=await modelScript(topic); const audio=path.join(dir,"voice.mp3"); const card=path.join(dir,"card.svg"); const output=path.join(dir,"video.mp4");
  await voice(script,audio); const lines=script.match(/.{1,42}(?:\s|$)/g)?.slice(0,10)||[script];
  const text=lines.map((line,i)=>`<text x="80" y="${260+i*58}" fill="white" font-size="30" font-family="sans-serif">${esc(line.trim())}</text>`).join("");
  await fs.writeFile(card,`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#101a35"/><text x="80" y="130" fill="#7ee7ff" font-size="44" font-family="sans-serif">${esc(topic)}</text>${text}</svg>`);
  await exec(process.env.FFMPEG_BIN||"ffmpeg",["-y","-loop","1","-i",card,"-i",audio,"-c:v","libx264","-tune","stillimage","-c:a","aac","-pix_fmt","yuv420p","-shortest","-movflags","+faststart",output],{timeout:180000});
  return { id, script, filePath:output };
}
