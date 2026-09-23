/* CryptoAI PRO regression harness — run: node tools/regression.js
   Loads ta.js + patterns.js + brain.js + app.js into a vm and asserts
   pattern detection, brain decisions, ensemble, AI sell rate, never-loss. */
const fs = require("fs"), vm = require("vm"), path = require("path");
const A = path.join(__dirname, "..", "crypto-app", "app", "src", "main", "assets");
const code = {};
for (const f of ["ta.js","patterns.js","brain.js","app.js"]) code[f] = fs.readFileSync(path.join(A,f),"utf8");
const sandbox = {
  console, Math, JSON, Date, isNaN, parseInt, parseFloat, setTimeout, clearTimeout, setInterval, clearInterval,
  Number, String, Boolean, Array, Object, RegExp, Error, Promise, Symbol, Map, Set,
  fetch: () => Promise.resolve({ ok:false, json: async()=>({}) }),
  performance: { now: () => Date.now() },
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
sandbox.navigator = { language: "en" };
sandbox.localStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
const canvasEl = () => ({ getContext: () => ({
  setTransform(){}, translate(){}, rotate(){}, scale(){}, save(){}, restore(){},
  measureText: (t)=>({width:(t||"").length*7}), fillText(){}, strokeText(){}, clearRect(){}, fillRect(){}, strokeRect(){},
  beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, arc(){}, fill(){}, stroke(){}, rect(){},
  quadraticCurveTo(){}, bezierCurveTo(){}, arcTo(){}, ellipse(){}, clip(){}, createLinearGradient: ()=>({addColorStop(){}}),
  createRadialGradient: ()=>({addColorStop(){}}), drawImage(){},
  font:"", textAlign:"", textBaseline:"", globalAlpha:1, lineWidth:1, strokeStyle:"", fillStyle:"", shadowBlur:0, shadowColor:"", lineCap:"", lineJoin:"", setLineDash(){},
}), width: 800, height: 400, style: {}, addEventListener(){}, getBoundingClientRect: ()=>({left:0,top:0,width:800,height:400}) });
sandbox.document = {
  getElementById: (id) => (sandbox.document._els[id] ||= (() => { const e = canvasEl(); e.id = id; e.innerHTML=""; e.value=""; e.textContent=""; e.checked=false; e.disabled=false; e.dataset={}; e.classList={add(){},remove(){},toggle(){},contains:()=>false}; e.addEventListener=()=>{}; e.style={}; e.appendChild=()=>{}; e.removeChild=()=>{}; e.querySelector=()=>canvasEl(); e.querySelectorAll=()=>[]; e.childNodes=[]; e.firstChild=null; return e; })()),
  _els:{}, addEventListener(){}, createElement: (t)=> t==="canvas" ? canvasEl() : { style:{}, classList:{add(){},remove(){}}, addEventListener(){}, appendChild(){}, setAttribute(){}, innerHTML:"", textContent:"" },
  body:{appendChild(){},classList:{add(){},remove(){},toggle(){},contains:()=>false}}, documentElement:{lang:"en"}, hidden:false,
  visibilityState:"visible", querySelectorAll:()=>[], querySelector:()=>null,
};
vm.createContext(sandbox);
for (const f of ["ta.js","patterns.js"]) { try { vm.runInContext(code[f], sandbox, {filename:f}); } catch(e) { console.log(f+" load:", e.message); } }
try { vm.runInContext(code["brain.js"], sandbox, {filename:"brain.js"}); } catch(e) { console.log("brain.js load:", e.message); }
try { vm.runInContext(code["app.js"], sandbox, {filename:"app.js"}); } catch(e) { /* DOM stub limit */ }
const Brain = sandbox.window.Brain, SBA = sandbox.window;
let fails = 0;
function t(name, cond){ console.log((cond?"✅":"❌")+" "+name); if(!cond) fails++; }

t("Brain exported", !!Brain);
t("Patterns catalog 32", Brain && Brain.patterns() && Brain.patterns().CATALOG.length === 32);
t("16 features", Brain && Brain.FEATURES.length === 16);
t("allDecide exported", typeof SBA.allDecide === "function");
t("bot exports", typeof SBA.botTick === "function" && typeof SBA.botStart === "function");

function mk(o,h,l,c){ return {t:0,o,h,l,c,v:1000}; }
function buildTrend(n, per){ const k=[]; let p=100; for(let i=0;i<n;i++){const o=p,c=p*per;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));p=c;} return k; }
function buildTop(){ const k=[]; let p=100;
  for(let i=0;i<50;i++){const o=p,c=p*1.006;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));p=c;}
  for(let i=0;i<6;i++){const o=k[k.length-1].c,c=o*0.99;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  for(let i=0;i<9;i++){const o=k[k.length-1].c,c=o*1.007;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  for(let i=0;i<14;i++){const o=k[k.length-1].c,c=o*0.988;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  return k; }
function buildBot(){ const k=[]; let p=100;
  for(let i=0;i<50;i++){const o=p,c=p*0.994;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));p=c;}
  for(let i=0;i<6;i++){const o=k[k.length-1].c,c=o*1.01;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  for(let i=0;i<9;i++){const o=k[k.length-1].c,c=o*0.993;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  for(let i=0;i<14;i++){const o=k[k.length-1].c,c=o*1.012;k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));}
  return k; }
function buildChop(){ const k=[]; let p=100; for(let i=0;i<80;i++){const o=p,c=p*(i%2?1.004:0.996);k.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));p=c;} return k; }

const kh=[]; let p=100;
for(let i=0;i<60;i++){const o=p,c=p*(1-0.004);kh.push(mk(o,Math.max(o,c)*1.002,Math.min(o,c)*0.998,c));p=c;}
kh.push(mk(p,p*1.0025,p*0.968,p*1.002));
const fh = Brain.features(kh, null);
t("hammer cndlBull", fh.cndlBull > 0 && fh.cndlBear === 0);
const ft = Brain.features(buildTop(), null);
t("double top → brain SHORT", Brain.decide(ft,0.15).bias === -1);
const fb = Brain.features(buildBot(), null);
t("double bottom → brain LONG", Brain.decide(fb,0.15).bias === 1);
t("uptrend → brain LONG", Brain.decide(Brain.features(buildTrend(70,1.005),null),0.15).bias === 1);

function ens(k, allowShort){
  const rep = SBA.TA.analyze(k);
  const bd = Brain.decide(Brain.features(k,null), 0.15);
  return SBA.allDecide(rep, k, allowShort, 0.15, bd);
}
t("ensemble uptrend LONG", ens(buildTrend(70,1.005), true).bias === 1);
t("ensemble downtrend SHORT", ens(buildTrend(70,0.995), true).bias === -1);
t("ensemble choppy flat", ens(buildChop(), true).bias === 0);
t("ensemble double top SHORT", ens(buildTop(), true).bias === -1);
t("ensemble long-only gate", ens(buildTrend(70,0.995), false).bias === 0);

t("2s tick interval", code["app.js"].includes("setInterval(botTick, 2000)"));
t("5s klines cache", code["app.js"].includes("now() - cache.at < 5000"));
t("busy guard", code["app.js"].includes("b._busy"));
t("verdict throttle", code["app.js"].includes("b._vLog"));

Brain.learn("test-lesson", 1);
t("brain stats n", Brain.stats() && typeof Brain.stats().n === "number");

// ===== v41-43: AI sell rate =====
t("aiTarget + aiAdjustPos exported", typeof SBA.aiTarget === "function" && typeof SBA.aiAdjustPos === "function");
const kU1 = buildTrend(70,1.005);
const t1 = SBA.aiTarget(SBA.TA.analyze(kU1), kU1, 0.3, 0.15);
t("aiTarget bounds", t1.tpP >= 0.5 && t1.tpP <= 8 && t1.slP >= 0.35 && t1.slP <= 4);
const hv = []; { let p2 = 100; for (let i=0;i<70;i++){ const o=p2, c=p2*1.003; hv.push(mk(o, o*1.06, o*0.94, c)); p2 = c; } }
const t2 = SBA.aiTarget(SBA.TA.analyze(hv), hv, 0.3, 0.15);
t("aiTarget vol-responsive (high vol → wider)", t2.tpP > t1.tpP);
const o1 = SBA.openPaper("TESTUSDT", 100, 50, 1.5, 0.8, "bot", 1);
t("openPaper works", o1 && o1.pos && !o1.error);
if (o1 && o1.pos) {
  o1.pos.aiTpPct = 1.5; o1.pos.aiTp0 = 1.5;
  const kT = buildTop();
  SBA.aiAdjustPos("TESTUSDT", SBA.botCfg(), kT, SBA.TA.analyze(kT), {}, 0.15);
  t("reversal → tighten to profit floor", o1.pos.aiTpPct <= 0.5 && o1.pos.tp < 101);
  const kU2 = buildTrend(70, 1.002);
  const repRide = { ok: true, metrics: { atr: 1.2, ema20: 130, ema50: 120, macdHist: 0.5, rsi: 60 } };
  o1.pos.aiTpPct = 1.5; o1.pos.aiTp0 = 1.5;
  SBA.aiAdjustPos("TESTUSDT", SBA.botCfg(), kU2, repRide, {}, 0.15);
  t("ride: profit + trend alive → keep/raise target", o1.pos.aiTpPct >= 1.5);
  const repOb = { ok: true, metrics: { atr: 1.2, ema20: 130, ema50: 120, macdHist: 0.5, rsi: 80 } };
  o1.pos.aiTpPct = 1.5; o1.pos.aiTp0 = 1.5;
  SBA.aiAdjustPos("TESTUSDT", SBA.botCfg(), kU2, repOb, {}, 0.15);
  t("RSI>75 overbought → tighten to profit floor", o1.pos.aiTpPct <= 0.5);
  const repHold = { ok: true, metrics: { atr: 1.2, ema20: 130, ema50: 120, macdHist: 0.5, rsi: 55 } };
  const o8 = SBA.openPaper("HOLDUSDT", 1000, 50, 1.5, 0.8, "bot", 1);
  o8.pos.aiTpPct = 1.5; o8.pos.aiTp0 = 1.5; o8.pos.peakMove = 0;    /* never peaked */
  const repHold2 = { ok: true, metrics: { atr: 1.2, ema20: 130, ema50: 120, macdHist: 0.5, rsi: 55 } };
  SBA.aiAdjustPos("HOLDUSDT", SBA.botCfg(), kU2, repHold2, {}, 0.15); /* px ~114 vs entry 1000 = deep loss */
  t("losing, never peaked → hold target unchanged", Math.abs(o8.pos.aiTpPct - 1.5) < 0.05);
}
t("paper exit uses AI rate", code["app.js"].includes("wantSell"));
t("live exit uses AI rate", code["app.js"].includes("moveP >= p.aiTpPct"));
t("cfg aiTp default true", SBA.botCfg().aiTp === true);
// v42: adopt old trades
SBA.botCfg().strategy = "trend";
const o2 = SBA.openPaper("OLDUSDT", 100, 50, 1.5, 0.8, "bot", 1);
t("v42: old trade starts without AI rate", o2 && o2.pos && o2.pos.aiTpPct == null);
const stubRide = { ok: true, metrics: { atr: 1.0, ema20: 104, ema50: 100, macdHist: 0.4, rsi: 58 } };
SBA.aiAdjustPos("OLDUSDT", SBA.botCfg(), buildTrend(70,1.002), stubRide, {}, 0.15);
t("v42: old trade adopted → AI rate set + tp mirrored", o2.pos.aiTpPct != null && o2.pos.tp > 100);
const t3 = SBA.aiTarget(stubRide, buildTrend(70,1.002), undefined, 0.15);
t("v42: adopted rate matches fresh target", Math.abs(o2.pos.aiTpPct - t3.tpP) < 0.01);
t("v42: manages any strategy (aiTp gate)", code["app.js"].includes("if (cfg.aiTp !== false) {"));
// v43: manual trades adopted + badge
const o3 = SBA.openPaper("MANUSDT", 100, 50, 1.5, 0.8, "manual", 1);
t("v43: manual position created", o3 && o3.pos && o3.pos.src === "manual");
SBA.aiAdjustPos("MANUSDT", SBA.botCfg(), buildTrend(70,1.002), stubRide, {}, 0.15);
t("v43: manual trade adopted → AI rate set", o3.pos.aiTpPct != null && o3.pos.tp > 100);
t("v43: 🎯 badge in UI", code["app.js"].includes("🎯 AI "));
SBA.botCfg().strategy = "brain";
// ===== v44: never-loss guarantee + profit lock =====
const o4 = SBA.openPaper("NLUSDT", 100, 50, 1.5, 0.8, "bot", 1);
o4.pos.aiTpPct = 1.5; o4.pos.aiTp0 = 1.5; o4.pos.peakMove = 0.9;
const repNL = { ok: true, metrics: { atr: 1.0, ema20: 103, ema50: 100, macdHist: 0.3, rsi: 55 } };
const kFade = []; { let q=100; for (let i=0;i<60;i++) kFade.push(mk(q, q*1.002, q*0.998, q)); }
kFade.push(mk(100, 100.5, 100.1, 100.35));                            /* profit faded to +0.35% */
SBA.aiAdjustPos("NLUSDT", SBA.botCfg(), kFade, repNL, {}, 0.15);
t("v44: profit lock arms when profit fades (1.5 → 0.30)", Math.abs(o4.pos.aiTpPct - 0.3) < 0.02);
t("v44: peakMove tracked", o4.pos.peakMove >= 0.9);
const o5 = SBA.openPaper("NL2USDT", 100, 50, 1.5, 0.8, "bot", 1);
o5.pos.aiTpPct = 1.5; o5.pos.aiTp0 = 1.5; o5.pos.peakMove = 0.9;
const repNL2 = { ok: true, metrics: { atr: 1.0, ema20: 110, ema50: 100, macdHist: 0.3, rsi: 55 } };
const kNL2 = buildTrend(70, 1.003);
SBA.aiAdjustPos("NL2USDT", SBA.botCfg(), kNL2, repNL2, {}, 0.15);
t("v44: no lock while profit still big (ride on)", o5.pos.aiTpPct >= 1.5);
SBA.botCfg().exitMode = "classic";
const o6 = SBA.openPaper("CLSUSDT", 100, 50, 1.5, 0.8, "bot", 1);
const cntBefore = SBA.paper().positions.length;
SBA.checkPaperPositions("CLSUSDT", 95);
t("v44: classic SL does NOT sell bot trade at loss", SBA.paper().positions.length === cntBefore && SBA.paper().positions.includes(o6.pos));
const o7 = SBA.openPaper("MAN2USDT", 100, 50, 1.5, 0.8, "manual", 1);
SBA.checkPaperPositions("MAN2USDT", 95);
t("v44: manual trade SL still closes", !SBA.paper().positions.includes(o7.pos));
SBA.botCfg().exitMode = "minprofit";
t("v44: flip exits never-loss (no exitMode gate)", !code["app.js"].includes('cfg.exitMode === "minprofit" && posNetPnl'));
t("v44: 🔒 badge in UI", code["app.js"].includes("🔒"));

console.log(fails ? "\n"+fails+" FAILURES" : "\n🎉 ALL REGRESSION TESTS PASS");
process.exit(fails?1:0);
