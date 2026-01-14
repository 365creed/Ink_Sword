(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha:false });

  // HUD elements
  const hpFill = document.getElementById("hpFill");
  const spFill = document.getElementById("spFill");
  const scoreText = document.getElementById("scoreText");
  const hiText = document.getElementById("hiText");
  const killText = document.getElementById("killText");

  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Touch UI
  const stick = document.getElementById("stick");
  const knob = document.getElementById("knob");
  const btnSlash = document.getElementById("btnSlash");
  const btnGuard = document.getElementById("btnGuard");
  const btnDash = document.getElementById("btnDash");
  const btnSpecial = document.getElementById("btnSpecial");

  // ---------- Helpers ----------
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const rand = (a,b)=>a+Math.random()*(b-a);
  const randi = (a,b)=>Math.floor(rand(a,b+1));
  const hypot = Math.hypot;

  // ---------- Storage ----------
  const HI_KEY = "ink_blade_hi_v2";
  const loadHi = () => Number(localStorage.getItem(HI_KEY) || "0");
  const saveHi = (v) => localStorage.setItem(HI_KEY, String(v));

  // ---------- Visual theme ----------
  const PAPER = "#f1e6c8";
  const PAPER2 = "#eadbb4";
  const INK = (a)=>`rgba(15,23,42,${a})`;

  // ---------- Paper texture (cached) ----------
  const paper = document.createElement("canvas");
  paper.width = 512; paper.height = 512;
  const pctx = paper.getContext("2d");
  (function makePaper(){
    pctx.fillStyle = PAPER;
    pctx.fillRect(0,0,paper.width,paper.height);
    for(let i=0;i<14000;i++){
      const x = Math.random()*paper.width;
      const y = Math.random()*paper.height;
      const a = Math.random()*0.06;
      pctx.fillStyle = `rgba(15,23,42,${a})`;
      pctx.fillRect(x,y,1,1);
    }
    // warm wash
    const g = pctx.createRadialGradient(160,160,40, 280,280,460);
    g.addColorStop(0,"rgba(15,23,42,0.06)");
    g.addColorStop(1,"rgba(15,23,42,0)");
    pctx.fillStyle = g;
    pctx.fillRect(0,0,paper.width,paper.height);
  })();

  // ---------- Brush primitives (STRONG INK FEEL) ----------
  function brushStroke(points, w, a){
    ctx.save();
    ctx.lineCap="round"; ctx.lineJoin="round";
    for(let pass=0; pass<3; pass++){
      const jw = pass===0 ? 1.0 : (pass===1 ? 0.7 : 0.45);
      const jj = pass===0 ? 0.6 : (pass===1 ? 1.2 : 2.0);
      ctx.strokeStyle = INK(a * jw);
      ctx.lineWidth = w * jw;
      ctx.beginPath();
      for(let i=0;i<points.length;i++){
        const p = points[i];
        const x = p.x + (Math.random()*2-1)*jj;
        const y = p.y + (Math.random()*2-1)*jj;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function washCircle(x,y,r,a){
    ctx.save();
    ctx.fillStyle = INK(a);
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function splatter(x,y, power=1){
    for(let i=0;i<22;i++){
      const ang = Math.random()*Math.PI*2;
      const d = rand(2, 52) * power;
      const rx = x + Math.cos(ang)*d;
      const ry = y + Math.sin(ang)*d;
      const rr = rand(1.2, 7.0) * power;
      const aa = rand(0.05, 0.22);
      washCircle(rx, ry, rr, aa);
    }
  }

  // ---------- World / Camera (BIG MAP, portrait scroll) ----------
  const WORLD = { w: 2600, h: 5200 }; // “아주 넓게”
  const cam = { x: 0, y: 0, shake: 0 };

  // ---------- Input ----------
  const input = {
    up:false, down:false, left:false, right:false,
    slash:false, guard:false, dash:false, special:false,
    slashPressed:false, dashPressed:false, specialPressed:false,
    pointerStick:false,
    stickId:null,
    stickCenter:{x:0,y:0},
    stickVec:{x:0,y:0},
  };

  // ---------- Player ----------
  const player = {
    x: WORLD.w*0.5,
    y: WORLD.h*0.85,
    vx: 0, vy: 0,
    face: {x:0,y:-1},
    hp: 100,
    hpMax: 100,

    sp: 0,     // 기(氣) 0..100
    spMax: 100,

    // movement
    speed: 520,
    dashSpeed: 980,
    dashT: 0,
    dashDur: 0.16,
    dashing: false,
    dashCD: 0,

    // combat
    slashing:false,
    slashT:0,
    slashDur:0.14,
    slashCD:0,

    guarding:false,
    parryWindow:0,   // 0.. seconds
    parryCool:0,

    invuln:0,
    stun:0,
  };

  // ---------- Enemies ----------
  const ENEMY_TYPES = {
    dokkaebi: { name:"도깨비", hp: 55, spd: 260, atkRange: 70, atkCD: 0.85, dmg: 18, weight: 0.38, kind:"dokkaebi" },
    ghost:    { name:"귀신",   hp: 35, spd: 300, atkRange: 85, atkCD: 0.95, dmg: 14, weight: 0.28, kind:"ghost" },
    gate:     { name:"수문장", hp: 120,spd: 200, atkRange: 95, atkCD: 1.25, dmg: 28, weight: 0.18, kind:"gate" },
    wraith:   { name:"무사 망령", hp: 80, spd: 280, atkRange: 85, atkCD: 0.95, dmg: 22, weight: 0.16, kind:"wraith" },
  };

  const state = {
    started:false,
    running:false,
    over:false,
    last:0,
    t:0,
    score:0,
    hi: loadHi(),
    kills:0,
    wave:1,
    spawnT:0,
    spawnEvery: 1.1,
    enemies: [],
    fx: [],
    flash:0,
  };

  function pickEnemyType(){
    const r = Math.random();
    let acc = 0;
    for(const k of Object.keys(ENEMY_TYPES)){
      acc += ENEMY_TYPES[k].weight;
      if(r <= acc) return ENEMY_TYPES[k];
    }
    return ENEMY_TYPES.dokkaebi;
  }

  function spawnEnemy(){
    const t = pickEnemyType();
    // spawn around camera/player but off-screen-ish
    const ring = rand(520, 860);
    const ang = rand(0, Math.PI*2);
    const x = clamp(player.x + Math.cos(ang)*ring, 80, WORLD.w-80);
    const y = clamp(player.y + Math.sin(ang)*ring, 120, WORLD.h-120);

    state.enemies.push({
      type: t,
      x,y, vx:0, vy:0,
      hp: t.hp,
      atkCD: rand(0.2, t.atkCD),
      teleT: 0, // for ghost fade
      hurt:0,
      stun:0,
      windup:0, // attack windup timer
      attacking:false,
    });
  }

  // ---------- Overlay ----------
  function showOverlay(on){
    overlay.style.display = on ? "flex" : "none";
  }

  function reset(){
    state.started=false; state.running=false; state.over=false;
    state.last=0; state.t=0;
    state.score=0; state.kills=0; state.wave=1;
    state.spawnT=0; state.spawnEvery=1.1;
    state.enemies.length=0; state.fx.length=0;
    state.flash=0;

    player.x= WORLD.w*0.5;
    player.y= WORLD.h*0.85;
    player.vx=0; player.vy=0;
    player.face={x:0,y:-1};
    player.hp=player.hpMax;
    player.sp=0;
    player.dashing=false; player.dashT=0; player.dashCD=0;
    player.slashing=false; player.slashT=0; player.slashCD=0;
    player.guarding=false; player.parryWindow=0; player.parryCool=0;
    player.invuln=0; player.stun=0;

    cam.shake=0;
    showOverlay(true);

    updateHUD();
  }

  function start(){
    if(state.running) return;
    state.started=true;
    state.running=true;
    state.over=false;
    showOverlay(false);

    // spawn initial
    for(let i=0;i<4;i++) spawnEnemy();
  }

  function gameOver(){
    state.running=false;
    state.over=true;
    showOverlay(true);
  }

  // ---------- HUD ----------
  function updateHUD(){
    const hpPct = clamp(player.hp/player.hpMax, 0, 1);
    const spPct = clamp(player.sp/player.spMax, 0, 1);
    hpFill.style.width = `${hpPct*100}%`;
    spFill.style.width = `${spPct*100}%`;

    scoreText.textContent = Math.floor(state.score);
    hiText.textContent = state.hi;
    killText.textContent = state.kills;
  }

  // ---------- Keyboard ----------
  window.addEventListener("keydown", (e)=>{
    const k = e.code;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyJ","KeyK","KeyL","KeyI"].includes(k)) e.preventDefault();

    if(k==="ArrowUp"||k==="KeyW") input.up=true;
    if(k==="ArrowDown"||k==="KeyS") input.down=true;
    if(k==="ArrowLeft"||k==="KeyA") input.left=true;
    if(k==="ArrowRight"||k==="KeyD") input.right=true;

    if(k==="KeyJ"){ input.slash=true; input.slashPressed=true; }
    if(k==="KeyK"){ input.guard=true; }
    if(k==="KeyL"){ input.dash=true; input.dashPressed=true; }
    if(k==="KeyI"){ input.special=true; input.specialPressed=true; }

    if(k==="Enter"){ start(); }
    if(k==="KeyR"){ reset(); }
  }, {passive:false});

  window.addEventListener("keyup", (e)=>{
    const k = e.code;
    if(k==="ArrowUp"||k==="KeyW") input.up=false;
    if(k==="ArrowDown"||k==="KeyS") input.down=false;
    if(k==="ArrowLeft"||k==="KeyA") input.left=false;
    if(k==="ArrowRight"||k==="KeyD") input.right=false;

    if(k==="KeyJ") input.slash=false;
    if(k==="KeyK") input.guard=false;
    if(k==="KeyL") input.dash=false;
    if(k==="KeyI") input.special=false;
  });

  // ---------- Touch controls ----------
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);

  btnSlash.addEventListener("pointerdown", ()=>{ input.slashPressed=true; });
  btnDash.addEventListener("pointerdown", ()=>{ input.dashPressed=true; });
  btnSpecial.addEventListener("pointerdown", ()=>{ input.specialPressed=true; });
  btnGuard.addEventListener("pointerdown", ()=>{ input.guard=true; });
  btnGuard.addEventListener("pointerup", ()=>{ input.guard=false; });
  btnGuard.addEventListener("pointercancel", ()=>{ input.guard=false; });

  // joystick
  stick.addEventListener("pointerdown", (e)=>{
    input.pointerStick=true;
    input.stickId = e.pointerId;
    const r = stick.getBoundingClientRect();
    input.stickCenter.x = r.left + r.width/2;
    input.stickCenter.y = r.top + r.height/2;
    stick.setPointerCapture(e.pointerId);
  });

  stick.addEventListener("pointermove", (e)=>{
    if(!input.pointerStick || e.pointerId !== input.stickId) return;
    const dx = e.clientX - input.stickCenter.x;
    const dy = e.clientY - input.stickCenter.y;
    const max = 52;
    const mag = Math.hypot(dx,dy) || 1;
    const nx = clamp(dx/mag, -1, 1);
    const ny = clamp(dy/mag, -1, 1);
    const amt = clamp(mag/max, 0, 1);
    input.stickVec.x = nx * amt;
    input.stickVec.y = ny * amt;

    knob.style.transform = `translate(${(-50 + input.stickVec.x*42)}%, ${(-50 + input.stickVec.y*42)}%)`;
  });

  function endStick(){
    input.pointerStick=false;
    input.stickId=null;
    input.stickVec.x=0; input.stickVec.y=0;
    knob.style.transform = "translate(-50%,-50%)";
  }
  stick.addEventListener("pointerup", endStick);
  stick.addEventListener("pointercancel", endStick);

  // ---------- Combat mechanics ----------
  function doDash(dir){
    if(player.dashCD>0 || player.dashing || player.stun>0) return;
    player.dashing=true;
    player.dashT=0;
    player.dashCD=0.28;
    player.invuln = Math.max(player.invuln, 0.18);

    const mag = Math.hypot(dir.x, dir.y) || 1;
    player.vx = (dir.x/mag) * player.dashSpeed;
    player.vy = (dir.y/mag) * player.dashSpeed;

    splatter(player.x, player.y, 0.9);
    cam.shake = Math.max(cam.shake, 7);
  }

  function doSlash(){
    if(player.slashCD>0 || player.slashing || player.stun>0) return;
    player.slashing=true;
    player.slashT=0;
    player.slashCD=0.18;
    cam.shake = Math.max(cam.shake, 5);

    // small SP gain on swing (hit gives more)
    player.sp = clamp(player.sp + 2.5, 0, player.spMax);
  }

  function doSpecial(){
    if(player.sp < player.spMax || player.stun>0) return;
    player.sp = 0;

    // “필살기: 묵풍일섬(墨風一閃)” — 큰 원형 베기 + 화면 먹번짐
    cam.shake = Math.max(cam.shake, 16);
    state.flash = 1;

    // hit all enemies in radius
    const R = 260;
    for(const e of state.enemies){
      const d = hypot(e.x-player.x, e.y-player.y);
      if(d < R){
        e.hp -= 55;
        e.hurt = 1;
        e.stun = Math.max(e.stun, 0.7);
        splatter(e.x, e.y, 1.4);
      }
    }

    // FX ring
    state.fx.push({ kind:"ring", x:player.x, y:player.y, t:0, life:0.35, r:30, R:290 });
    splatter(player.x, player.y, 1.6);
  }

  function startParryWindow(){
    if(player.parryCool>0) return;
    player.parryWindow = 0.14; // 타이밍 창
    player.parryCool = 0.18;
  }

  function takeDamage(dmg){
    if(player.invuln>0) return;
    if(player.guarding){
      // guard reduces damage; if in parry window and timing => no dmg
      if(player.parryWindow>0){
        // perfect parry
        player.sp = clamp(player.sp + 24, 0, player.spMax);
        cam.shake = Math.max(cam.shake, 12);
        splatter(player.x, player.y, 1.2);
        state.fx.push({ kind:"kanji", x:player.x, y:player.y-60, t:0, life:0.35, text:"破" });
        return "parry";
      }
      player.hp -= dmg * 0.18;
      player.sp = clamp(player.sp + 8, 0, player.spMax);
      player.invuln = 0.12;
      cam.shake = Math.max(cam.shake, 8);
      splatter(player.x, player.y, 0.8);
      return "guard";
    }

    // normal hit
    player.hp -= dmg;
    player.invuln = 0.38;
    player.stun = Math.max(player.stun, 0.18);
    cam.shake = Math.max(cam.shake, 14);
    splatter(player.x, player.y, 1.2);
    state.flash = 1;

    if(player.hp <= 0){
      player.hp = 0;
      // save hi
      const s = Math.floor(state.score);
      if(s > state.hi){ state.hi = s; saveHi(state.hi); }
      gameOver();
    }
    return "hit";
  }

  // ---------- Attack resolution ----------
  function slashHits(e){
    // slash cone in front
    const range = 120;
    const angle = 0.85; // radians cone half-angle
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx,dy);
    if(d > range) return false;

    const fx = player.face.x, fy = player.face.y;
    const dot = (dx/d)*fx + (dy/d)*fy;
    const ang = Math.acos(clamp(dot, -1, 1));
    return ang < angle;
  }

  // ---------- Drawing: world ----------
  function draw(){
    // camera follow
    const targetCamX = clamp(player.x - canvas.width/2, 0, WORLD.w - canvas.width);
    const targetCamY = clamp(player.y - canvas.height*0.62, 0, WORLD.h - canvas.height);
    cam.x = lerp(cam.x, targetCamX, 1 - Math.pow(0.001, state.dt));
    cam.y = lerp(cam.y, targetCamY, 1 - Math.pow(0.001, state.dt));

    const shake = cam.shake;
    const sx = (Math.random()*2-1)*shake;
    const sy = (Math.random()*2-1)*shake;
    cam.shake = Math.max(0, cam.shake - state.dt*30);

    ctx.save();
    ctx.translate(-cam.x + sx, -cam.y + sy);

    // paper tile
    for(let yy = Math.floor(cam.y/512)*512; yy < cam.y + canvas.height + 512; yy+=512){
      for(let xx = Math.floor(cam.x/512)*512; xx < cam.x + canvas.width + 512; xx+=512){
        ctx.drawImage(paper, xx, yy);
      }
    }

    // subtle washes/“먹 번짐” terrain
    drawTerrainWashes();

    // landmarks (ink-only): gates, pagoda, bridges-ish in black brush
    drawLandmarks();

    // enemies
    for(const e of state.enemies) drawEnemy(e);

    // player
    drawPlayer();

    // FX
    drawFX();

    ctx.restore();

    // screen veil on special/hit
    if(state.flash>0){
      ctx.save();
      ctx.fillStyle = INK(0.18*state.flash);
      ctx.fillRect(0,0,canvas.width,canvas.height)
