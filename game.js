"use strict";

// ─── PERSIST ──────────────────────────────────────────────────
const DB = {
  d: { rb: null, ravg: null, rn: 0, rt: [], ab: 0 },
  load() {
    try {
      Object.assign(this.d, JSON.parse(localStorage.getItem("reflex2") || "{}"));
    } catch (e) {}
  },
  save() {
    localStorage.setItem("reflex2", JSON.stringify(this.d));
  },
};
DB.load();

// ─── ROUTING ──────────────────────────────────────────────────
function showPage(id) {
  ["pgMain", "pgReact", "pgAim"].forEach((p) => {
    const el = document.getElementById(p);
    if (p === id) {
      el.classList.remove("pg-hide");
      el.classList.add("pg-show");
    } else {
      el.classList.remove("pg-show");
      el.classList.add("pg-hide");
    }
  });
}

// ─── AUDIO ────────────────────────────────────────────────────
let _ctx = null;
function ctx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    const u = () => {
      if (_ctx.state === "suspended") _ctx.resume();
      ["mousedown", "touchstart"].forEach((e) => removeEventListener(e, u));
    };
    ["mousedown", "touchstart"].forEach((e) => addEventListener(e, u));
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}
let _mg = null;
function mg() {
  const a = ctx();
  if (!_mg) {
    _mg = a.createGain();
    _mg.gain.value = 0.75;
    _mg.connect(a.destination);
  }
  return _mg;
}
let _nb = null;
function nb() {
  const a = ctx();
  if (_nb) return _nb;
  const b = a.createBuffer(1, a.sampleRate * 0.35, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (_nb = b);
}

function tone(f1, f2, dur, vol, tp = "sine") {
  try {
    const a = ctx(), t = a.currentTime, m = mg();
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    g.connect(m);
    const o = a.createOscillator();
    o.type = tp;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur * .85);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + .02);
  } catch (e) {}
}
function nz(fc, dur, vol) {
  try {
    const a = ctx(), t = a.currentTime, m = mg();
    const ns = a.createBufferSource();
    ns.buffer = nb();
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = fc;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    ns.connect(f);
    f.connect(g);
    g.connect(m);
    ns.start(t);
    ns.stop(t + dur + .05);
  } catch (e) {}
}

const sfx = {
  go()    { tone(420, 880, .13, .4, "triangle"); setTimeout(() => tone(660, 1320, .1, .25, "triangle"), 65); },
  hit()   { tone(640, 300, .08, .35); nz(2400, .06, .4); },
  miss()  { tone(180, 65, .22, .4, "sawtooth"); nz(300, .18, .28); },
  early() { tone(140, 65, .22, .45, "sawtooth"); },
  click() { tone(750, 300, .06, .18, "triangle"); },
  wave()  { tone(440, 660, .18, .3, "triangle"); setTimeout(() => tone(660, 990, .13, .2, "triangle"), 100); },
  spawn() { tone(900, 650, .05, .06); },
  pause() { tone(500, 300, .08, .18, "triangle"); },
  resume(){ tone(300, 540, .10, .18, "triangle"); }
};

// ─── FLOAT TEXT ───────────────────────────────────────────────
function ft(x, y, txt, cls) {
  const el = document.createElement("div");
  el.className = "ft " + (cls || "");
  el.textContent = txt;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.getElementById("fl").appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 900);
}
function shake() {
  document.body.classList.remove("shake");
  void document.body.offsetWidth;
  document.body.classList.add("shake");
}

// ─── SYNC MENU ────────────────────────────────────────────────
function syncMenu() {
  const d = DB.d;
  const rb = document.getElementById("mReactBest");
  const ab = document.getElementById("mAimBest");
  rb.textContent = d.rb ? "BEST  " + d.rb + "ms" : "";
  ab.textContent = d.ab ? "BEST  " + d.ab : "";
}

// ══════════════════════════════════════════════════════════════
//   REACTION TEST
// ══════════════════════════════════════════════════════════════
const R = { state: "idle", timer: null, goAt: null, sess: [] };

function rShow(id) {
  ["rIdle", "rWait", "rGo", "rEarly", "rResult"].forEach((s) => {
    const el = document.getElementById(s);
    if (!el) return;
    el.style.display = (s === id) ? "flex" : "none";
  });
  R.state = id;
}

function rUpdateRecords() {
  const d = DB.d;
  const lines = [];
  if (d.rb) lines.push(`ALL TIME BEST &nbsp; <b>${d.rb}ms</b>`);
  if (d.ravg) lines.push(`AVERAGE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>${d.ravg}ms</b>`);
  if (d.rn) lines.push(`ATTEMPTS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>${d.rn}</b>`);
  document.getElementById("rRecords").innerHTML = lines.join("<br>");
}

function rStart() {
  ctx();
  R.sess = [];
  rRound();
}

function rRound() {
  rShow("rWait");
  const delay = 1600 + Math.random() * 4200;
  R.timer = setTimeout(rGo, delay);
}

function rGo() {
  rShow("rGo");

  // wait for the green screen to actually paint before stamping the timer
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      R.goAt = performance.now();
      sfx.go();
    });
  });
}

document.getElementById("pgReact").addEventListener("pointerdown", e => {
  ctx();
  if (e.target.closest("button")) return;
  if (R.state === "rIdle") return;
  if (R.state === "rWait") {
    clearTimeout(R.timer);
    sfx.early();
    rShow("rEarly");
    return;
  }
  if (R.state === "rGo" && R.goAt !== null) {
    const ms = Math.round(performance.now() - R.goAt);
    rRecord(ms);
  }
});

function rRecord(ms) {
  R.sess.push(ms);
  sfx.hit();
  const d = DB.d;
  d.rn = (d.rn || 0) + 1;
  d.rt = d.rt || [];
  d.rt.push(ms);
  if (d.rt.length > 200) d.rt = d.rt.slice(-200);
  d.rb = d.rb ? Math.min(d.rb, ms) : ms;
  d.ravg = Math.round(d.rt.reduce((a, b) => a + b, 0) / d.rt.length);
  DB.save();
  syncMenu();
  rResult(ms);
}

function rResult(ms) {
  const g = rGrade(ms);
  const te = document.getElementById("rTime");
  te.textContent = ms + "ms";
  te.style.color = g.col;
  const ge = document.getElementById("rGrade");
  ge.textContent = g.txt;
  ge.style.color = g.col;

  const d = DB.d;
  const sAvg = R.sess.length > 1 ? Math.round(R.sess.reduce((a, b) => a + b, 0) / R.sess.length) : null;
  const parts = [];
  if (d.rb) parts.push(`<div><div>ALL TIME BEST</div><b>${d.rb}ms</b></div>`);
  if (d.ravg) parts.push(`<div><div>LIFETIME AVG</div><b>${d.ravg}ms</b></div>`);
  if (sAvg && R.sess.length > 1) parts.push(`<div><div>SESSION AVG</div><b>${sAvg}ms</b></div>`);
  document.getElementById("rStats").innerHTML = parts.join("");
  rShow("rResult");
}

const RGRADES = [
  { ms: 150, txt: "⚡ SUPERHUMAN",    col: "#b56bff" },
  { ms: 200, txt: "🏆 ELITE",         col: "#ffd65c" },
  { ms: 250, txt: "🔥 EXCELLENT",     col: "#38f6a7" },
  { ms: 300, txt: "💪 ABOVE AVERAGE", col: "#49d9ff" },
  { ms: 400, txt: "📈 AVERAGE",       col: "#ffb347" },
  { ms: 500, txt: "👍 BELOW AVERAGE", col: "#ff9b78" },
  { ms: 9999, txt: "🐢 SLOW CLICK",   col: "#60708b" },
];
function rGrade(ms) { return RGRADES.find(g => ms <= g.ms) || RGRADES[RGRADES.length - 1]; }

document.getElementById("rBtnStart").addEventListener("click", e => { e.stopPropagation(); sfx.click(); rStart(); });
document.getElementById("rBtnEarlyRetry").addEventListener("click", e => { e.stopPropagation(); sfx.click(); rRound(); });
document.getElementById("rBtnAgain").addEventListener("click", e => { e.stopPropagation(); sfx.click(); rRound(); });
document.getElementById("rBtnDone").addEventListener("click", e => { e.stopPropagation(); sfx.click(); rUpdateRecords(); rShow("rIdle"); });
document.getElementById("rBack").addEventListener("click", e => {
  e.stopPropagation();
  clearTimeout(R.timer);
  R.goAt = null;
  rShow("rIdle");
  showPage("pgMain");
});

// ══════════════════════════════════════════════════════════════
//   AIM TRAINER
// ══════════════════════════════════════════════════════════════
const cv = document.getElementById("aimCv");
const cx = cv.getContext("2d");
let W, H;
function rez() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
window.addEventListener("resize", rez);
rez();

const SHAPES = [
  {
    id: "circle", weight: 40, pts: 10, col: "#38f6a7",
    draw(c, x, y, r, ts, urgency) {
      const p = .55 + .45 * Math.sin(ts * .007 + x * .01);
      c.save(); c.translate(x, y);
      const grd = c.createRadialGradient(0, 0, r * .65, 0, 0, r * 2.2);
      grd.addColorStop(0, `rgba(56,246,167,${.22*p})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grd; c.beginPath(); c.arc(0,0,r*2.2,0,Math.PI*2); c.fill();
      c.strokeStyle = `rgba(56,246,167,${.4*p})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0,0,r*1.48,0,Math.PI*2); c.stroke();
      c.fillStyle = "#041810"; c.strokeStyle = "#38f6a7"; c.lineWidth = 2.5;
      c.shadowColor = "#38f6a7"; c.shadowBlur = 22;
      c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill(); c.stroke(); c.shadowBlur = 0;
      const sh = c.createRadialGradient(-r*.35,-r*.35,0,0,0,r);
      sh.addColorStop(0,"rgba(93,249,184,.28)"); sh.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = sh; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill();
      c.fillStyle = "#38f6a7"; c.shadowColor = "#38f6a7"; c.shadowBlur = 12;
      c.beginPath(); c.arc(0,0,r*.22,0,Math.PI*2); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = "rgba(56,246,167,.38)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-r*.62,0); c.lineTo(r*.62,0); c.stroke();
      c.beginPath(); c.moveTo(0,-r*.62); c.lineTo(0,r*.62); c.stroke();
      const arcColor = urgency > .7 ? `rgba(255,77,109,${.8*(1-urgency)})` : `rgba(56,246,167,${.7*(1-urgency)})`;
      c.strokeStyle = arcColor; c.lineWidth = 3.5; c.lineCap = "round";
      c.beginPath(); c.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-urgency)); c.stroke();
      c.restore();
    }
  },
  {
    id: "diamond", weight: 28, pts: 15, col: "#49d9ff",
    draw(c, x, y, r, ts, urgency) {
      const p = .5 + .5 * Math.sin(ts*.009 + y*.01);
      c.save(); c.translate(x, y);
      const grd = c.createRadialGradient(0,0,r*.6,0,0,r*2);
      grd.addColorStop(0,`rgba(73,217,255,${.2*p})`); grd.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = grd; c.beginPath(); c.moveTo(0,-r*1.9); c.lineTo(r*1.3,0); c.lineTo(0,r*1.9); c.lineTo(-r*1.3,0); c.closePath(); c.fill();
      c.fillStyle = "#051723"; c.strokeStyle = "#49d9ff"; c.lineWidth = 2.5;
      c.shadowColor = "#49d9ff"; c.shadowBlur = 20;
      c.beginPath(); c.moveTo(0,-r); c.lineTo(r*.76,0); c.lineTo(0,r); c.lineTo(-r*.76,0); c.closePath(); c.fill(); c.stroke(); c.shadowBlur = 0;
      const sh = c.createLinearGradient(-r*.5,-r*.5,r*.5,r*.5);
      sh.addColorStop(0,"rgba(73,217,255,.32)"); sh.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = sh; c.beginPath(); c.moveTo(0,-r); c.lineTo(r*.76,0); c.lineTo(0,r); c.lineTo(-r*.76,0); c.closePath(); c.fill();
      c.fillStyle = "#49d9ff"; c.beginPath(); c.moveTo(0,-r*.28); c.lineTo(r*.2,0); c.lineTo(0,r*.28); c.lineTo(-r*.2,0); c.closePath(); c.fill();
      const arcColor = urgency > .7 ? `rgba(255,77,109,${.75*(1-urgency)})` : `rgba(73,217,255,${.65*(1-urgency)})`;
      c.strokeStyle = arcColor; c.lineWidth = 3.5; c.lineCap = "round";
      c.beginPath(); c.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-urgency)); c.stroke();
      c.restore();
    }
  },
  {
    id: "hex", weight: 20, pts: 20, col: "#ffd65c",
    draw(c, x, y, r, ts, urgency) {
      const rot = ts*.0014; const p = .5 + .5 * Math.sin(ts*.01 + x*.008);
      c.save(); c.translate(x,y); c.rotate(rot);
      const grd = c.createRadialGradient(0,0,r*.6,0,0,r*2);
      grd.addColorStop(0,`rgba(255,214,92,${.2*p})`); grd.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = grd; c.beginPath();
      for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*r*2,Math.sin(a)*r*2);} c.closePath(); c.fill();
      c.fillStyle = "#1a1303"; c.strokeStyle = "#ffd65c"; c.lineWidth = 2.5;
      c.shadowColor = "#ffd65c"; c.shadowBlur = 20;
      c.beginPath(); for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);} c.closePath(); c.fill(); c.stroke(); c.shadowBlur = 0;
      const sh = c.createRadialGradient(-r*.3,-r*.3,0,0,0,r);
      sh.addColorStop(0,"rgba(255,214,92,.32)"); sh.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = sh; c.beginPath(); for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);} c.closePath(); c.fill();
      c.fillStyle = "#ffd65c"; c.shadowColor = "#ffd65c"; c.shadowBlur = 10;
      c.beginPath(); c.arc(0,0,r*.2,0,Math.PI*2); c.fill(); c.shadowBlur = 0;
      c.rotate(-rot);
      const arcColor = urgency > .7 ? `rgba(255,77,109,${.75*(1-urgency)})` : `rgba(255,214,92,${.65*(1-urgency)})`;
      c.strokeStyle = arcColor; c.lineWidth = 3.5; c.lineCap = "round";
      c.beginPath(); c.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-urgency)); c.stroke();
      c.restore();
    }
  },
  {
    id: "plus", weight: 10, pts: 30, col: "#b56bff",
    draw(c, x, y, r, ts, urgency) {
      const rot = ts*.001; const p = .5 + .5 * Math.sin(ts*.012);
      c.save(); c.translate(x,y); c.rotate(rot);
      const plus = (sz) => { c.beginPath(); c.moveTo(-sz*.38,-sz); c.lineTo(sz*.38,-sz); c.lineTo(sz*.38,-sz*.38); c.lineTo(sz,-sz*.38); c.lineTo(sz,sz*.38); c.lineTo(sz*.38,sz*.38); c.lineTo(sz*.38,sz); c.lineTo(-sz*.38,sz); c.lineTo(-sz*.38,sz*.38); c.lineTo(-sz,sz*.38); c.lineTo(-sz,-sz*.38); c.lineTo(-sz*.38,-sz*.38); c.closePath(); };
      c.save(); c.shadowColor = "#b56bff"; c.shadowBlur = 32*p;
      c.fillStyle = `rgba(181,107,255,${.14*p})`; plus(r*1.8); c.fill(); c.shadowBlur = 0; c.restore();
      c.fillStyle = "#170628"; c.strokeStyle = "#b56bff"; c.lineWidth = 2.5;
      c.shadowColor = "#b56bff"; c.shadowBlur = 22; plus(r); c.fill(); c.stroke(); c.shadowBlur = 0;
      const sh = c.createRadialGradient(-r*.3,-r*.3,0,0,0,r);
      sh.addColorStop(0,"rgba(181,107,255,.3)"); sh.addColorStop(1,"rgba(0,0,0,0)");
      c.fillStyle = sh; plus(r); c.fill();
      c.rotate(-rot);
      const arcColor = urgency > .7 ? `rgba(255,77,109,${.75*(1-urgency)})` : `rgba(181,107,255,${.65*(1-urgency)})`;
      c.strokeStyle = arcColor; c.lineWidth = 3.5; c.lineCap = "round";
      c.beginPath(); c.arc(0,0,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-urgency)); c.stroke();
      c.restore();
    }
  },
];

function pickShape() {
  const tot = SHAPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * tot;
  for (const s of SHAPES) { r -= s.weight; if (r <= 0) return s; }
  return SHAPES[0];
}

// smoother progression: more pressure before level 10, harsher time cuts after
function lvl(n) {
  const k = Math.max(1, n);

  if (k <= 3) {
    return {
      life: 2600 - (k - 1) * 80,
      spawn: 1450 - (k - 1) * 70,
      multi: 1,
      rMin: 26,
      rMax: 40,
    };
  }

  if (k <= 6) {
    return {
      life: 2440 - (k - 4) * 90,
      spawn: 1310 - (k - 4) * 75,
      multi: 2,
      rMin: 25,
      rMax: 38,
    };
  }

  if (k <= 9) {
    return {
      life: 2260 - (k - 7) * 85,
      spawn: 1160 - (k - 7) * 70,
      multi: 2,
      rMin: 24,
      rMax: 37,
    };
  }

  if (k <= 12) {
    return {
      life: 1980 - (k - 10) * 110,
      spawn: 980 - (k - 10) * 75,
      multi: 3,
      rMin: 23,
      rMax: 35,
    };
  }

  const late = Math.min(k - 13, 8);
  return {
    life: Math.max(1050, 1650 - late * 95),
    spawn: Math.max(560, 830 - late * 45),
    multi: 3 + (k >= 16 ? 1 : 0),
    rMin: Math.max(21, 23 - Math.floor(late / 3)),
    rMax: Math.max(31, 35 - Math.floor(late / 2)),
  };
}

const LEVEL_UP = 10;

const A = {
  on: false,
  paused: false,
  score: 0,
  hits: 0,
  miss: 0,
  streak: 0,
  bStreak: 0,
  level: 1,
  lives: 3,
  captimes: [],
  avgCap: 0,
  recentCaps: [],
  recentAvg: 0,
  targets: [],
  sparks: [],
  spawnT: 0,
  lf: 0,
  mx: 0,
  my: 0,
};

function mkTarget() {
  const cfg = lvl(A.level), sh = pickShape();
  const r = cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin);
  const pad = r + 20;
  const x = pad + Math.random() * (W - pad * 2);
  const y = pad + Math.random() * (H - pad * 2 - 80) + 40;
  return { sh, x, y, r, alive: true, spawnT: Date.now(), life: cfg.life, urgency: 0 };
}

function spawnTargets() {
  const cfg = lvl(A.level);
  const room = Math.max(0, cfg.multi - A.targets.filter(t => t.alive).length);
  if (room <= 0) return;

  const n = 1 + Math.floor(Math.random() * room);
  for (let i = 0; i < n; i++) {
    A.targets.push(mkTarget());
    sfx.spawn();
  }
}

function checkCatch() {
  if (!A.on || A.paused) return;
  for (const t of A.targets) {
    if (!t.alive) continue;
    const dx = A.mx - t.x, dy = A.my - t.y;
    const hr = t.r * (t.sh.id === "diamond" ? 1.1 : t.sh.id === "hex" ? 1.05 : 1.25);
    if (Math.sqrt(dx * dx + dy * dy) <= hr) catchTarget(t);
  }
}

function catchTarget(t) {
  t.alive = false;
  sfx.hit();

  A.hits++;
  A.streak++;
  if (A.streak > A.bStreak) A.bStreak = A.streak;

  const ms = Date.now() - t.spawnT;
  A.captimes.push(ms);
  A.avgCap = Math.round(A.captimes.reduce((a, b) => a + b, 0) / A.captimes.length);

  A.recentCaps.push(ms);
  if (A.recentCaps.length > 6) A.recentCaps.shift();
  A.recentAvg = Math.round(A.recentCaps.reduce((a, b) => a + b, 0) / A.recentCaps.length);

  let pts = t.sh.pts;
  if (A.streak >= 10) pts = Math.round(pts * 2.5);
  else if (A.streak >= 5) pts = Math.round(pts * 1.6);

  A.score += pts;
  burst(t.x, t.y, t.sh.col, 10);
  ft(t.x, t.y - t.r - 10, "+" + pts, "hit");

  if (A.streak === 5)  { sfx.wave(); ft(t.x, t.y - 55, "🔥 5 STREAK!", "bonus"); }
  if (A.streak === 10) { sfx.wave(); ft(t.x, t.y - 55, "⚡ 10 STREAK!", "bonus"); }

  if (A.hits % LEVEL_UP === 0) {
    A.level++;
    sfx.wave();
    levelToast();
  }

  aHud();
}

function expireTarget(t) {
  t.alive = false;
  sfx.miss();
  shake();
  A.miss++;
  A.streak = 0;
  A.lives--;
  ft(t.x, t.y, "MISS", "miss");
  aHud();
  if (A.lives <= 0) setTimeout(aOver, 500);
}

function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + Math.random() * .7, sp = 65 + Math.random() * 220;
    A.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: .028 + Math.random() * .04, sz: 2.5 + Math.random() * 5.5, col, spark: Math.random() < .4 });
  }
}

function drawSparks() {
  for (const p of A.sparks) {
    cx.save(); cx.globalAlpha = p.life; cx.shadowColor = p.col; cx.shadowBlur = 9;
    if (p.spark) {
      cx.fillStyle = p.col; cx.translate(p.x, p.y);
      const a = Math.atan2(p.vy, p.vx); cx.rotate(a);
      cx.fillRect(-p.sz*2*p.life,-p.sz*.3*p.life,p.sz*4*p.life,p.sz*.6*p.life);
    } else {
      cx.fillStyle = p.col; cx.beginPath(); cx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2); cx.fill();
    }
    cx.restore();
  }
}

function levelToast() {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font-family:Syne,sans-serif;font-size:clamp(1.6rem,6vw,2.6rem);font-weight:800;letter-spacing:.18em;color:#49d9ff;text-shadow:0 0 30px #49d9ff;pointer-events:none;z-index:300;white-space:nowrap;animation:lvl-in 1.3s ease forwards;";
  el.textContent = "LEVEL " + A.level;
  if (!document.getElementById("_lkf")) {
    const s = document.createElement("style"); s.id = "_lkf";
    s.textContent = "@keyframes lvl-in{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}";
    document.head.appendChild(s);
  }
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 1300);
}

function aHud() {
  document.getElementById("aHScore").textContent = A.score;
  document.getElementById("aHLevel").textContent = "LEVEL " + A.level;

  const speedText = A.recentAvg > 0 ? A.recentAvg + "ms" : "—";
  document.getElementById("aHAcc").textContent = speedText;

  document.getElementById("aHStreak").textContent = A.streak >= 3 ? A.streak + "× STREAK" : "";
  const lw = document.getElementById("aHLives"); lw.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("div");
    d.className = "lp" + (i >= A.lives ? " gone" : "");
    lw.appendChild(d);
  }
}

function aHudShow(v) {
  document.getElementById("aHud").style.display = v ? "flex" : "none";
  cv.style.display = v ? "block" : "none";
  document.getElementById("aPauseBtn").style.display = v ? "flex" : "none";
}

function aOver() {
  A.on = false;
  A.paused = false;
  aHudShow(false);

  if (A.score > DB.d.ab) {
    DB.d.ab = A.score;
    DB.save();
    syncMenu();
  }

  document.getElementById("aoScore").textContent = A.score;
  document.getElementById("aoAcc").textContent = A.avgCap > 0 ? A.avgCap + "ms" : "—";
  document.getElementById("aoLevel").textContent = A.level;
  document.getElementById("aoHits").textContent = A.hits;
  document.getElementById("aoMiss").textContent = A.miss;
  document.getElementById("aoCapt").textContent = A.avgCap > 0 ? A.avgCap + "ms" : "—";
  document.getElementById("aoStreak").textContent = A.bStreak + "×";
  document.getElementById("aoPB").textContent = DB.d.ab || "—";

  document.getElementById("aOvPause").style.display = "none";
  document.getElementById("aOvEnd").style.display = "flex";
}

function aStart() {
  ctx();
  Object.assign(A, {
    on: true,
    paused: false,
    score: 0,
    hits: 0,
    miss: 0,
    streak: 0,
    bStreak: 0,
    level: 1,
    lives: 3,
    captimes: [],
    avgCap: 0,
    recentCaps: [],
    recentAvg: 0,
    targets: [],
    sparks: [],
    spawnT: 0
  });
  document.getElementById("aOvStart").style.display = "none";
  document.getElementById("aOvPause").style.display = "none";
  document.getElementById("aOvEnd").style.display = "none";
  aHudShow(true);
  aHud();
  A.lf = performance.now();
  requestAnimationFrame(aLoop);
}

function aPause() {
  if (!A.on || A.paused) return;
  A.paused = true;
  sfx.pause();
  document.getElementById("aOvPause").style.display = "flex";
}

function aResume() {
  if (!A.on || !A.paused) return;
  A.paused = false;
  sfx.resume();
  document.getElementById("aOvPause").style.display = "none";
  A.lf = performance.now();
  requestAnimationFrame(aLoop);
}

function aToMenu() {
  A.on = false;
  A.paused = false;
  aHudShow(false);
  document.getElementById("aOvStart").style.display = "none";
  document.getElementById("aOvPause").style.display = "none";
  document.getElementById("aOvEnd").style.display = "none";
  showPage("pgMain");
}

// Background
let _bt = 0;
function drawBg(dt) {
  _bt += dt;
  cx.fillStyle = "#07090d"; cx.fillRect(0,0,W,H);
  cx.strokeStyle = "rgba(255,255,255,.02)"; cx.lineWidth = 1;
  const g = 52;
  for(let x=0;x<W;x+=g){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();}
  for(let y=0;y<H;y+=g){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke();}
  const vg = cx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,H*.88);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,.54)");
  cx.fillStyle = vg; cx.fillRect(0,0,W,H);
  const tg = cx.createLinearGradient(0,0,0,82);
  tg.addColorStop(0,"rgba(7,9,13,.92)"); tg.addColorStop(1,"rgba(7,9,13,0)");
  cx.fillStyle = tg; cx.fillRect(0,0,W,82);
  const tint = Math.min((A.level - 1) / 18, .05);
  if (tint > 0) {
    const wg = cx.createRadialGradient(W/2,H/2,0,W/2,H/2,H*.55);
    wg.addColorStop(0,`rgba(73,217,255,${tint})`); wg.addColorStop(1,"rgba(0,0,0,0)");
    cx.fillStyle = wg; cx.fillRect(0,0,W,H);
  }
}

function drawCursor() {
  cx.save();
  cx.strokeStyle = "rgba(255,255,255,.42)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.arc(A.mx,A.my,10,0,Math.PI*2); cx.stroke();
  cx.strokeStyle = "rgba(255,255,255,.65)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(A.mx-5,A.my); cx.lineTo(A.mx+5,A.my); cx.stroke();
  cx.beginPath(); cx.moveTo(A.mx,A.my-5); cx.lineTo(A.mx,A.my+5); cx.stroke();
  cx.restore();
}

function aLoop(ts) {
  if (!A.on || A.paused) return;
  requestAnimationFrame(aLoop);

  const raw = Math.min(ts - (A.lf || ts), 50);
  A.lf = ts;
  const dt = raw / 1000;

  const cfg = lvl(A.level);
  A.spawnT += raw;
  if (A.spawnT >= cfg.spawn) {
    A.spawnT = 0;
    spawnTargets();
  }

  const now = Date.now();
  for (const t of A.targets) {
    if (!t.alive) continue;
    const age = now - t.spawnT;
    t.urgency = Math.min(age / t.life, 1);
    if (age >= t.life) expireTarget(t);
  }

  A.targets = A.targets.filter(t => t.alive || now - t.spawnT < t.life + 200);

  for (const p of A.sparks) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 190 * dt;
    p.life -= p.decay * dt;
  }
  A.sparks = A.sparks.filter(p => p.life > 0);

  checkCatch();
  drawBg(dt);
  A.targets.forEach(t => { if (t.alive) t.sh.draw(cx,t.x,t.y,t.r,ts,t.urgency); });
  drawSparks();
  drawCursor();
}

// Mouse events
cv.addEventListener("mousemove", e => { A.mx = e.clientX; A.my = e.clientY; if (A.on && !A.paused) checkCatch(); });
cv.addEventListener("mousedown", e => { A.mx = e.clientX; A.my = e.clientY; if (A.on && !A.paused) checkCatch(); });
cv.addEventListener("touchmove", e => { e.preventDefault(); A.mx = e.touches[0].clientX; A.my = e.touches[0].clientY; if (A.on && !A.paused) checkCatch(); }, { passive: false });
cv.addEventListener("touchstart", e => { e.preventDefault(); A.mx = e.touches[0].clientX; A.my = e.touches[0].clientY; if (A.on && !A.paused) checkCatch(); }, { passive: false });

// Aim buttons
document.getElementById("aBtnStart").addEventListener("click", () => { sfx.click(); aStart(); });
document.getElementById("aBtnRetry").addEventListener("click", () => { sfx.click(); aStart(); });
document.getElementById("aBtnMenu").addEventListener("click", () => { sfx.click(); aToMenu(); });
document.getElementById("aPauseBtn").addEventListener("click", () => { aPause(); });
document.getElementById("aBtnResume").addEventListener("click", () => { aResume(); });
document.getElementById("aBtnPauseMenu").addEventListener("click", () => { sfx.click(); aToMenu(); });

// Main menu routing
document.getElementById("btnReact").addEventListener("click", () => {
  ctx();
  sfx.click();
  rUpdateRecords();
  rShow("rIdle");
  showPage("pgReact");
});

document.getElementById("btnAim").addEventListener("click", () => {
  ctx();
  sfx.click();
  showPage("pgAim");
  document.getElementById("aOvStart").style.display = "flex";
  document.getElementById("aOvPause").style.display = "none";
  document.getElementById("aOvEnd").style.display = "none";
  aHudShow(false);
});

// Boot
syncMenu();
document.getElementById("aPauseBtn").style.display = "none";