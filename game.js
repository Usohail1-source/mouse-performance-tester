"use strict";

// ─── PERSIST ──────────────────────────────────────────────────
const DB = {
  d: { rb:null, ravg:null, rn:0, rt:[], tb:0, cb:0 },
  load(){ try{ Object.assign(this.d, JSON.parse(localStorage.getItem('mtracer')||'{}')); }catch(e){} },
  save(){ localStorage.setItem('mtracer', JSON.stringify(this.d)); },
};
DB.load();

// ─── ROUTING ──────────────────────────────────────────────────
function showPage(id){
  ['pgHome','pgReact','pgTrack','pgCPS'].forEach(p=>{
    const el=document.getElementById(p);
    if(p===id){ el.classList.remove('pg-hide'); el.classList.add('pg-show'); }
    else       { el.classList.remove('pg-show'); el.classList.add('pg-hide'); }
  });
}

// ─── AUDIO ────────────────────────────────────────────────────
let _ac=null;
function AC(){ if(!_ac){_ac=new(window.AudioContext||window.webkitAudioContext)(); const u=()=>{if(_ac.state==='suspended')_ac.resume();['mousedown','touchstart'].forEach(e=>removeEventListener(e,u));}; ['mousedown','touchstart'].forEach(e=>addEventListener(e,u));} if(_ac.state==='suspended')_ac.resume(); return _ac; }
let _mg=null; function MG(){ const a=AC(); if(!_mg){_mg=a.createGain();_mg.gain.value=.7;_mg.connect(a.destination);} return _mg; }
let _nb=null; function NB(){ const a=AC(); if(_nb)return _nb; const b=a.createBuffer(1,a.sampleRate*.35,a.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return(_nb=b); }
function tone(f1,f2,d,v,tp='sine'){ try{ const a=AC(),t=a.currentTime,m=MG(); const g=a.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+d); g.connect(m); const o=a.createOscillator(); o.type=tp; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+d*.85); o.connect(g); o.start(t); o.stop(t+d+.02); }catch(e){} }
function nz(fc,d,v){ try{ const a=AC(),t=a.currentTime,m=MG(); const ns=a.createBufferSource(); ns.buffer=NB(); const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=fc; const g=a.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+d); ns.connect(f); f.connect(g); g.connect(m); ns.start(t); ns.stop(t+d+.05); }catch(e){} }

const sfx={
  go()    { tone(420,880,.13,.4,'triangle'); setTimeout(()=>tone(660,1320,.1,.25,'triangle'),65); },
  hit()   { tone(640,300,.08,.35); nz(2400,.06,.4); },
  early() { tone(140,65,.22,.45,'sawtooth'); },
  click() { tone(750,300,.06,.18,'triangle'); },
  ding()  { tone(880,1100,.1,.28,'sine'); },
  beep(f) { tone(f,f,.07,.3,'sine'); },
  go3()   { tone(440,440,.12,.35,'triangle'); },  // countdown beep
  goFinal(){ tone(660,1100,.18,.5,'triangle'); },  // GO! sound
};

// ─── FLOAT TEXT ───────────────────────────────────────────────
function ft(x,y,txt,cls){
  const el=document.createElement('div');
  el.className='ft '+(cls||'');
  el.textContent=txt; el.style.left=x+'px'; el.style.top=y+'px';
  document.getElementById('fl').appendChild(el);
  setTimeout(()=>{ if(el.parentNode)el.remove(); },850);
}
function shake(){ document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); }

// ─── SYNC HOME ────────────────────────────────────────────────
function syncHome(){
  const d=DB.d;
  const re=document.getElementById('hReactBest');
  const te=document.getElementById('hTrackBest');
  const ce=document.getElementById('hCPSBest');
  if(re) re.textContent=d.rb?'BEST  '+d.rb+'ms':'';
  if(te) te.textContent=d.tb?'BEST  '+d.tb+'%':'';
  if(ce) ce.textContent=d.cb?'BEST  '+d.cb+' clicks/sec':'';
}

// ══════════════════════════════════════════════════════════════
//  MODE 1 — REACTION TEST
// ══════════════════════════════════════════════════════════════
const R={state:'idle',timer:null,goAt:null,sess:[]};

function rScreen(id){
  ['rIdle','rWait','rGo','rEarly','rResult'].forEach(s=>{
    const el=document.getElementById(s);
    if(!el)return;
    el.style.display=(s===id)?'flex':'none';
  });
  R.state=id;
}

function rUpdateRecords(){
  const d=DB.d, lines=[];
  if(d.rb)   lines.push(`BEST &nbsp;&nbsp;&nbsp;&nbsp; <b>${d.rb}ms</b>`);
  if(d.ravg) lines.push(`AVERAGE &nbsp;<b>${d.ravg}ms</b>`);
  if(d.rn)   lines.push(`ATTEMPTS &nbsp;<b>${d.rn}</b>`);
  document.getElementById('rRecords').innerHTML=lines.join('<br>');
}

function rStart(){ AC(); R.sess=[]; rRound(); }

function rRound(){
  rScreen('rWait');
  const delay=1500+Math.random()*4500;
  R.timer=setTimeout(rGo, delay);
}

function rGo(){
  rScreen('rGo');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    R.goAt=performance.now(); sfx.go();
  }));
}

document.getElementById('pgReact').addEventListener('pointerdown', e=>{
  AC();
  if(e.target.closest('button')) return;
  if(R.state==='rIdle') return;
  if(R.state==='rWait'){ clearTimeout(R.timer); sfx.early(); rScreen('rEarly'); return; }
  if(R.state==='rGo'&&R.goAt!==null){
    const ms=Math.round(performance.now()-R.goAt);
    rRecord(ms);
  }
});

function rRecord(ms){
  R.sess.push(ms); sfx.hit();
  const d=DB.d;
  d.rn=(d.rn||0)+1;
  d.rt=d.rt||[]; d.rt.push(ms); if(d.rt.length>200)d.rt=d.rt.slice(-200);
  d.rb=d.rb?Math.min(d.rb,ms):ms;
  d.ravg=Math.round(d.rt.reduce((a,b)=>a+b,0)/d.rt.length);
  DB.save(); syncHome(); rResult(ms);
}

function rResult(ms){
  const g=rGrade(ms);
  const te=document.getElementById('rTime');
  te.textContent=ms+'ms'; te.style.color=g.col;
  const ge=document.getElementById('rGrade');
  ge.textContent=g.txt; ge.style.color=g.col;
  const d=DB.d;
  const sAvg=R.sess.length>1?Math.round(R.sess.reduce((a,b)=>a+b,0)/R.sess.length):null;
  const parts=[];
  if(d.rb)   parts.push(`<div><div>ALL TIME BEST</div><b>${d.rb}ms</b></div>`);
  if(d.ravg) parts.push(`<div><div>LIFETIME AVG</div><b>${d.ravg}ms</b></div>`);
  if(sAvg&&R.sess.length>1) parts.push(`<div><div>SESSION AVG</div><b>${sAvg}ms</b></div>`);
  document.getElementById('rStats').innerHTML=parts.join('');
  rScreen('rResult');
}

const RGRADES=[
  {ms:150, txt:'⚡ SUPERHUMAN',    col:'#c47fff'},
  {ms:200, txt:'🏆 ELITE',         col:'#ffd65c'},
  {ms:250, txt:'🔥 EXCELLENT',     col:'#38f6a7'},
  {ms:300, txt:'💪 ABOVE AVERAGE', col:'#49d9ff'},
  {ms:400, txt:'📈 AVERAGE',       col:'#ffb347'},
  {ms:500, txt:'👍 BELOW AVERAGE', col:'#ff8a65'},
  {ms:9999,txt:'🐢 SLOW CLICK',   col:'#4a5a72'},
];
function rGrade(ms){ return RGRADES.find(g=>ms<=g.ms)||RGRADES[RGRADES.length-1]; }

document.getElementById('rBtnStart').addEventListener('click',      e=>{ e.stopPropagation(); sfx.click(); rStart(); });
document.getElementById('rBtnEarlyRetry').addEventListener('click', e=>{ e.stopPropagation(); sfx.click(); rRound(); });
document.getElementById('rBtnAgain').addEventListener('click',      e=>{ e.stopPropagation(); sfx.click(); rRound(); });
document.getElementById('rBtnDone').addEventListener('click',       e=>{ e.stopPropagation(); sfx.click(); rUpdateRecords(); rScreen('rIdle'); });
document.getElementById('rBack').addEventListener('click',          e=>{ e.stopPropagation(); clearTimeout(R.timer); R.goAt=null; rScreen('rIdle'); showPage('pgHome'); });

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  MODE 2 — MOUSE TRACKING (aim trainer style)
// ══════════════════════════════════════════════════════════════
const tcv=document.getElementById('trackCv');
const tcx=tcv.getContext('2d');
let TW,TH;
function tRez(){ TW=tcv.width=innerWidth; TH=tcv.height=innerHeight; }
window.addEventListener('resize',tRez); tRez();

const T={
  on:false, mx:0, my:0,
  targets:[], sparks:[],
  score:0, hits:0, misses:0,
  level:1, hitsThisLevel:0,
  combo:0, bestCombo:0,
  startTime:0, lf:0,
};

const TRACK_DUR=45000;
const LEVEL_HIT=8;
let tSpawnTimer=0;

function tLvlCfg(l){
  const k=Math.min(l-1,14);
  return{
    targetLife: Math.max(800,2200-k*100),
    spawnDelay: Math.max(180,900-k*50),
    radius:     Math.max(16,34-k*1.2),
    multi:      k<3?1:k<7?2:3,
  };
}

function tMkTarget(){
  const cfg=tLvlCfg(T.level);
  const r=cfg.radius, pad=r+60;
  return{
    x:pad+Math.random()*(TW-pad*2),
    y:pad+80+Math.random()*(TH-pad*2-80),
    r, life:cfg.targetLife, spawnT:Date.now(), hit:false,
  };
}

function tSpawn(){
  const cfg=tLvlCfg(T.level);
  if(T.targets.filter(t=>!t.hit).length>=cfg.multi) return;
  T.targets.push(tMkTarget()); sfx.spawn();
}

function tCheckHit(mx,my){
  for(const t of T.targets){
    if(t.hit) continue;
    const dx=mx-t.x, dy=my-t.y;
    if(Math.sqrt(dx*dx+dy*dy)<=t.r*1.05) tHitTarget(t);
  }
}

function tHitTarget(t){
  t.hit=true; sfx.hit();
  T.hits++; T.combo++; if(T.combo>T.bestCombo)T.bestCombo=T.combo;
  T.score+=10*T.level; T.hitsThisLevel++;
  for(let i=0;i<12;i++){
    const a=Math.PI*2*i/12+Math.random()*.5, sp=120+Math.random()*220;
    T.sparks.push({x:t.x,y:t.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:.032+Math.random()*.028,sz:2.5+Math.random()*4.5,col:'#38f6a7'});
  }
  if(T.combo===5) { T.score+=50;  sfx.ding(); tToast('🔥 5 STREAK +50'); }
  if(T.combo===10){ T.score+=150; sfx.ding(); tToast('⚡ 10 STREAK +150'); }
  if(T.hitsThisLevel>=LEVEL_HIT){ T.level++; T.hitsThisLevel=0; sfx.ding(); tToast('LEVEL '+T.level); }
  tHudUpdate();
}

// Hover to hit
tcv.addEventListener('mousemove', e=>{
  if(!T.on) return;
  T.mx=e.clientX;
  T.my=e.clientY;
  tCheckHit(T.mx, T.my);
});

tcv.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(!T.on) return;
  T.mx=e.touches[0].clientX;
  T.my=e.touches[0].clientY;
  tCheckHit(T.mx, T.my);
},{ passive:false });

function tMissTarget(t){
  t.hit=true; T.misses++; T.combo=0; tHudUpdate();
}

function tToast(txt){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);font-family:Syne,sans-serif;font-size:clamp(1.2rem,4vw,1.8rem);font-weight:800;letter-spacing:.14em;color:#38f6a7;text-shadow:0 0 24px #38f6a7;pointer-events:none;z-index:300;white-space:nowrap;animation:lvlIn 1.1s ease forwards;';
  el.textContent=txt;
  if(!document.getElementById('_lkf')){const s=document.createElement('style');s.id='_lkf';s.textContent='@keyframes lvlIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.75)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-58%)}}';document.head.appendChild(s);}
  document.body.appendChild(el);
  setTimeout(()=>{if(el.parentNode)el.remove();},1100);
}

function tOvShow(id){
  ['tOvStart','tOvEnd'].forEach(s=>{ document.getElementById(s).style.display=(s===id)?'flex':'none'; });
}
function tHudShow(v){
  document.getElementById('tHud').style.display=v?'flex':'none';
  tcv.style.display=v?'block':'none';
}

function tStart(){
  AC();
  Object.assign(T,{on:true,targets:[],sparks:[],score:0,hits:0,misses:0,level:1,hitsThisLevel:0,combo:0,bestCombo:0});
  T.startTime=performance.now(); tSpawnTimer=0;
  tOvShow('__none__'); tHudShow(true); tHudUpdate();
  T.lf=performance.now();
  requestAnimationFrame(tLoop);
}

function tOver(){
  T.on=false; tHudShow(false);
  const acc=T.hits+T.misses>0?Math.round(T.hits/(T.hits+T.misses)*100):0;
  if(acc>DB.d.tb){ DB.d.tb=acc; DB.save(); syncHome(); }
  document.getElementById('tRTracking').textContent=acc+'%';
  document.getElementById('tRTime').textContent=T.hits+' hits';
  document.getElementById('tRScore').textContent=T.score;
  document.getElementById('tRLevel').textContent=T.level;
  document.getElementById('tRBest').textContent=DB.d.tb?DB.d.tb+'%':'—';
  tOvShow('tOvEnd');
}

function tHudUpdate(){
  const acc=T.hits+T.misses>0?Math.round(T.hits/(T.hits+T.misses)*100):0;
  document.getElementById('tHudScore').textContent=T.score;
  document.getElementById('tHudFill').style.width=acc+'%';
  const elapsed=((performance.now()-T.startTime)/1000).toFixed(1);
  document.getElementById('tHudTime').textContent=elapsed+'s';
}


function tDrawBg(){
  tcx.fillStyle='#07090d'; tcx.fillRect(0,0,TW,TH);
  tcx.strokeStyle='rgba(255,255,255,.018)'; tcx.lineWidth=1;
  const g=56;
  for(let x=0;x<TW;x+=g){tcx.beginPath();tcx.moveTo(x,0);tcx.lineTo(x,TH);tcx.stroke();}
  for(let y=0;y<TH;y+=g){tcx.beginPath();tcx.moveTo(0,y);tcx.lineTo(TW,y);tcx.stroke();}
  const vg=tcx.createRadialGradient(TW/2,TH/2,TH*.1,TW/2,TH/2,TH*.85);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.5)');
  tcx.fillStyle=vg; tcx.fillRect(0,0,TW,TH);
  const hg=tcx.createLinearGradient(0,0,0,80);
  hg.addColorStop(0,'rgba(7,9,13,.92)'); hg.addColorStop(1,'rgba(7,9,13,0)');
  tcx.fillStyle=hg; tcx.fillRect(0,0,TW,80);
}

function tDrawTarget(t,now){
  const age=now-t.spawnT;
  const urgency=Math.min(age/t.life,1);
  const sc=Math.min(age/120,1); // pop-in over 120ms
  const x=t.x,y=t.y,r=t.r;
  // Color: green→red as urgency rises
  const rv=Math.round(56+199*urgency), gv=Math.round(246-220*urgency), bv=Math.round(167-167*urgency);
  const col=`rgb(${rv},${gv},${bv})`;

  tcx.save();
  if(sc<1){ tcx.translate(x,y); tcx.scale(sc,sc); tcx.translate(-x,-y); }

  // Drain arc
  tcx.strokeStyle=`rgba(${rv},${gv},${bv},.5)`; tcx.lineWidth=3; tcx.lineCap='round';
  tcx.beginPath(); tcx.arc(x,y,r+10,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-urgency)); tcx.stroke();

  // Glow
  const grd=tcx.createRadialGradient(x,y,r*.4,x,y,r*2.4);
  grd.addColorStop(0,`rgba(${rv},${gv},${bv},.22)`); grd.addColorStop(1,'rgba(0,0,0,0)');
  tcx.fillStyle=grd; tcx.beginPath(); tcx.arc(x,y,r*2.4,0,Math.PI*2); tcx.fill();

  // Body — fully filled, much more visible
const fillGrad = tcx.createRadialGradient(x, y, r*0.2, x, y, r);
fillGrad.addColorStop(0, 'rgba(255,255,255,.35)');
fillGrad.addColorStop(0.18, col);
fillGrad.addColorStop(1, `rgba(${rv},${gv},${bv},.96)`);

tcx.fillStyle = fillGrad;
tcx.strokeStyle = 'rgba(255,255,255,.22)';
tcx.lineWidth = 2.2;
tcx.shadowColor = col;
tcx.shadowBlur = urgency>.6 ? 34 : 22;
tcx.beginPath();
tcx.arc(x,y,r,0,Math.PI*2);
tcx.fill();
tcx.stroke();
tcx.shadowBlur = 0;

// Center glow
tcx.fillStyle = 'rgba(255,255,255,.9)';
tcx.shadowColor = col;
tcx.shadowBlur = 16;
tcx.beginPath();
tcx.arc(x,y,r*.16,0,Math.PI*2);
tcx.fill();
tcx.shadowBlur = 0;

  // Crosshair
  tcx.strokeStyle=`rgba(${rv},${gv},${bv},.36)`; tcx.lineWidth=1;
  tcx.beginPath(); tcx.moveTo(x-r*.7,y); tcx.lineTo(x+r*.7,y); tcx.stroke();
  tcx.beginPath(); tcx.moveTo(x,y-r*.7); tcx.lineTo(x,y+r*.7); tcx.stroke();

  tcx.restore();
}

function tDrawSparks(dt){
  for(const p of T.sparks){
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=160*dt; p.life-=p.decay*dt;
    if(p.life<=0) continue;
    tcx.save(); tcx.globalAlpha=p.life; tcx.shadowColor=p.col; tcx.shadowBlur=8;
    tcx.fillStyle=p.col; tcx.beginPath(); tcx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2); tcx.fill();
    tcx.restore();
  }
  T.sparks=T.sparks.filter(p=>p.life>0);
}

function tDrawCursor(){
  const x=T.mx,y=T.my;
  const hov=T.targets.some(t=>!t.hit&&Math.sqrt((T.mx-t.x)**2+(T.my-t.y)**2)<=t.r*1.25);
  tcx.save();
  tcx.strokeStyle=hov?'rgba(56,246,167,.85)':'rgba(255,255,255,.55)'; tcx.lineWidth=1.5;
  if(hov){ tcx.shadowColor='#38f6a7'; tcx.shadowBlur=16; }
  tcx.beginPath(); tcx.arc(x,y,12,0,Math.PI*2); tcx.stroke();
  tcx.beginPath(); tcx.moveTo(x-7,y); tcx.lineTo(x+7,y); tcx.stroke();
  tcx.beginPath(); tcx.moveTo(x,y-7); tcx.lineTo(x,y+7); tcx.stroke();
  if(hov){
    tcx.globalAlpha=.35; tcx.lineWidth=1;
    tcx.beginPath(); tcx.arc(x,y,22,0,Math.PI*2); tcx.stroke();
  }
  tcx.restore();
}

function tLoop(ts){
  if(!T.on) return;
  requestAnimationFrame(tLoop);
  const raw=Math.min(ts-(T.lf||ts),50); T.lf=ts;
  const dt=raw/1000;
  if(performance.now()-T.startTime>=TRACK_DUR){ tOver(); return; }
  // Spawn
  tSpawnTimer+=raw;
  const cfg=tLvlCfg(T.level);
  if(tSpawnTimer>=cfg.spawnDelay){ tSpawnTimer=0; tSpawn(); }
  // Expire
  const now=Date.now();
  for(const t of T.targets){ if(!t.hit&&now-t.spawnT>=t.life) tMissTarget(t); }
  T.targets=T.targets.filter(t=>!t.hit);
  tDrawBg();
  for(const t of T.targets) tDrawTarget(t,now);
  tDrawSparks(dt);
  tDrawCursor();
  tHudUpdate();
}

document.getElementById('tBtnStart').addEventListener('click', ()=>{ sfx.click(); tStart(); });
document.getElementById('tBtnRetry').addEventListener('click', ()=>{ sfx.click(); tStart(); });
document.getElementById('tBtnMenu').addEventListener('click',  ()=>{ sfx.click(); T.on=false; tHudShow(false); tOvShow('tOvStart'); showPage('pgHome'); });
document.getElementById('tBack').addEventListener('click',     ()=>{ sfx.click(); T.on=false; tHudShow(false); document.getElementById('tOvStart').style.display='none'; document.getElementById('tOvEnd').style.display='none'; showPage('pgHome'); });


// ══════════════════════════════════════════════════════════════
//  MODE 3 — CLICK SPEED TEST
// ══════════════════════════════════════════════════════════════
const C={ on:false, clicks:0, dur:5, timeLeft:0, startTime:0, lf:0, peakCPS:0, lastSec:0, lastSecTime:0 };
const CPS_CIRC=326.7;

function cOvHide(){ ['cOvStart','cOvEnd'].forEach(id=>{ document.getElementById(id).style.display='none'; }); }
function cGameShow(v){ document.getElementById('cGame').style.display=v?'flex':'none'; }

function cStart(){
  AC(); cOvHide(); cGameShow(true);
  // Disable clicks during countdown
  C.on=false;
  const badge=document.getElementById('cCountBadge');
  const numEl=document.getElementById('cCountNum');
  // Reset display
  document.getElementById('cCPS').textContent='0.0';
  document.getElementById('cClicks').textContent='0';
  document.getElementById('cTimeVal').textContent=C.dur;
  document.getElementById('cRingFill').style.strokeDashoffset='0';
  document.getElementById('cRingFill').style.stroke='#38f6a7';

  let count=3;
  badge.style.display='flex';

  const tick=()=>{
    numEl.textContent=count;
    numEl.style.animation='none'; void numEl.offsetWidth;
    numEl.style.animation='cntPop .4s cubic-bezier(.34,1.56,.64,1) both';
    sfx.go3(); count--;
    if(count>0){ setTimeout(tick,900); }
    else {
      setTimeout(()=>{
        badge.style.display='none';
        sfx.goFinal(); cBegin();
      },900);
    }
  };
  tick();
}

function cBegin(){
  Object.assign(C,{on:true,clicks:0,timeLeft:C.dur*1000,startTime:performance.now(),peakCPS:0,lastSec:0,lastSecTime:performance.now()});
  cGameShow(true);
  cUpdateDisplay();
  C.lf=performance.now();
  requestAnimationFrame(cLoop);
}

function cOver(){
  C.on=false; cGameShow(false);
  const cps=(C.clicks/C.dur).toFixed(2);
  const peak=C.peakCPS.toFixed(2);
  if(parseFloat(cps)>DB.d.cb){ DB.d.cb=parseFloat(cps); DB.save(); syncHome(); }
  document.getElementById('cRCPS').textContent=cps;
  document.getElementById('cRClicks').textContent=C.clicks;
  document.getElementById('cRPeak').textContent=peak+' /sec';
  document.getElementById('cRBest').textContent=(DB.d.cb||0)+' /sec';
  const ge=document.getElementById('cGrade');
  const g=cGrade(parseFloat(cps));
  ge.textContent=g.txt; ge.style.color=g.col;
  document.getElementById('cOvEnd').style.display='flex';
}

function cUpdateDisplay(){
  const secs=Math.max(0,C.timeLeft/1000);
  document.getElementById('cTimeVal').textContent=secs.toFixed(1);
  const elapsed=C.dur*1000-C.timeLeft;
  const cps=elapsed>0?(C.clicks/(elapsed/1000)).toFixed(1):'0.0';
  document.getElementById('cCPS').textContent=cps;
  document.getElementById('cClicks').textContent=C.clicks;
  const pct=Math.max(0,C.timeLeft/(C.dur*1000));
  document.getElementById('cRingFill').style.strokeDashoffset=(CPS_CIRC*(1-pct)).toFixed(2);
  document.getElementById('cRingFill').style.stroke=C.timeLeft<2000?'#ff4d6d':C.timeLeft<3000?'#ffd65c':'#38f6a7';
}

function cLoop(ts){
  if(!C.on)return;
  requestAnimationFrame(cLoop);
  const raw=Math.min(ts-(C.lf||ts),50); C.lf=ts;
  C.timeLeft=Math.max(0,C.dur*1000-(performance.now()-C.startTime));
  // Rolling peak
  const now=performance.now();
  if(now-C.lastSecTime>=1000){
    const secCPS=C.clicks-C.lastSec;
    if(secCPS>C.peakCPS)C.peakCPS=secCPS;
    C.lastSec=C.clicks; C.lastSecTime=now;
  }
  cUpdateDisplay();
  if(C.timeLeft<=0){ cOver(); return; }
}

document.getElementById('cClickZone').addEventListener('pointerdown', e=>{
  e.preventDefault(); if(!C.on)return;
  C.clicks++;
  sfx.click();
  const btn=e.currentTarget;
  btn.style.transform='scale(.97)'; setTimeout(()=>btn.style.transform='',80);
});

document.getElementById('cBtnStart').addEventListener('click', ()=>{ sfx.click(); cStart(); });
document.getElementById('cBtnRetry').addEventListener('click', ()=>{ sfx.click(); cStart(); });
document.getElementById('cBtnMenu').addEventListener('click',  ()=>{ sfx.click(); C.on=false; cGameShow(false); cOvHide(); showPage('pgHome'); });
document.getElementById('cBack').addEventListener('click',     ()=>{ sfx.click(); C.on=false; cGameShow(false); cOvHide(); showPage('pgHome'); });

const CGRADES=[
  {cps:12,txt:'⚡ INHUMAN',        col:'#c47fff'},
  {cps:9, txt:'🏆 ELITE CLICKER',  col:'#ffd65c'},
  {cps:7, txt:'🔥 VERY FAST',      col:'#38f6a7'},
  {cps:5, txt:'💪 ABOVE AVERAGE',  col:'#49d9ff'},
  {cps:3, txt:'📈 AVERAGE',        col:'#ffb347'},
  {cps:0, txt:'🐢 SLOW FINGERS',   col:'#4a5a72'},
];
function cGrade(cps){ return CGRADES.find(g=>cps>=g.cps)||CGRADES[CGRADES.length-1]; }

// ─── HOME ROUTING ─────────────────────────────────────────────
document.getElementById('btnReact').addEventListener('click',()=>{ AC(); sfx.click(); rUpdateRecords(); rScreen('rIdle'); showPage('pgReact'); });
document.getElementById('btnTrack').addEventListener('click',()=>{ AC(); sfx.click(); showPage('pgTrack'); document.getElementById('tOvStart').style.display='flex'; document.getElementById('tOvEnd').style.display='none'; tHudShow(false); });
document.getElementById('btnCPS').addEventListener('click',  ()=>{ AC(); sfx.click(); showPage('pgCPS'); document.getElementById('cOvStart').style.display='flex'; document.getElementById('cOvEnd').style.display='none'; cGameShow(false); });

// ─── BOOT ─────────────────────────────────────────────────────
syncHome();
