(() => {
  "use strict";

  /* =========================
     Grab
  ========================= */
  const $ = (s, p = document) => p.querySelector(s);

  const app = $("#app");
  const stage = $("#stage");
  const canvas = $("#c");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hpFill = $("#hpFill");
  const spFill = $("#spFill");
  const scoreText = $("#scoreText");
  const hiText = $("#hiText");
  const killText = $("#killText");
  const waveText = $("#waveText");

  const overlay = $("#overlay");
  const startBtn = $("#startBtn");
  const resetBtn = $("#resetBtn");

  const stick = $("#stick");
  const knob = $("#knob");
  const btnSlash = $("#btnSlash");
  const btnGuard = $("#btnGuard");
  const btnDash = $("#btnDash");
  const btnSpecial = $("#btnSpecial");

  /* =========================
     Utils
  ========================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => (a + (Math.random() * (b - a + 1) | 0));
  const hypot = Math.hypot;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* =========================
     Canvas resize (CSS px coords)
  ========================= */
  const view = { w: 0, h: 0, dpr: 1 };
  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    view.w = Math.max(1, r.width);
    view.h = Math.max(1, r.height);
    view.dpr = dpr;

    canvas.width = Math.floor(view.w * dpr);
    canvas.height = Math.floor(view.h * dpr);

    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  /* =========================
     Tiny audio (no files)
  ========================= */
  const Beep = {
    ctx: null,
    unlocked: false,
    init() {
      if (this.unlocked) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.unlocked = true;
    },
    ping(freq = 220, dur = 0.05, type = "triangle", gain = 0.08) {
      if (!this.unlocked) return;
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }
  };

  /* =========================
     Input
  ========================= */
  const input = {
    up: false, down: false, left: false, right: false,
    slash: false, guard: false, dash: false, special: false,
    slashPressed: false, dashPressed: false, specialPressed: false,

    pointerStick: false,
    stickId: null,
    stickCenter: { x: 0, y: 0 },
    stickVec: { x: 0, y: 0 }
  };

  window.addEventListener("keydown", (e) => {
    const k = e.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL", "KeyI", "Space"].includes(k)) {
      e.preventDefault();
    }
    if (k === "ArrowUp" || k === "KeyW") input.up = true;
    if (k === "ArrowDown" || k === "KeyS") input.down = true;
    if (k === "ArrowLeft" || k === "KeyA") input.left = true;
    if (k === "ArrowRight" || k === "KeyD") input.right = true;

    if (k === "KeyJ") { input.slash = true; input.slashPressed = true; }
    if (k === "KeyK") { input.guard = true; }
    if (k === "KeyL") { input.dash = true; input.dashPressed = true; }
    if (k === "KeyI") { input.special = true; input.specialPressed = true; }

    if (k === "Enter" || k === "Space") start();
    if (k === "KeyR") reset();
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    const k = e.code;
    if (k === "ArrowUp" || k === "KeyW") input.up = false;
    if (k === "ArrowDown" || k === "KeyS") input.down = false;
    if (k === "ArrowLeft" || k === "KeyA") input.left = false;
    if (k === "ArrowRight" || k === "KeyD") input.right = false;

    if (k === "KeyJ") input.slash = false;
    if (k === "KeyK") input.guard = false;
    if (k === "KeyL") input.dash = false;
    if (k === "KeyI") input.special = false;
  });

  // Touch buttons
  startBtn.addEventListener("click", () => { Beep.init(); start(); });
  resetBtn.addEventListener("click", () => { Beep.init(); reset(); });

  btnSlash.addEventListener("pointerdown", () => { Beep.init(); input.slashPressed = true; });
  btnDash.addEventListener("pointerdown", () => { Beep.init(); input.dashPressed = true; });
  btnSpecial.addEventListener("pointerdown", () => { Beep.init(); input.specialPressed = true; });
  btnGuard.addEventListener("pointerdown", () => { Beep.init(); input.guard = true; });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => {
    btnGuard.addEventListener(ev, () => { input.guard = false; });
  });

  // Stick
  stick.addEventListener("pointerdown", (e) => {
    Beep.init();
    input.pointerStick = true;
    input.stickId = e.pointerId;
    const r = stick.getBoundingClientRect();
    input.stickCenter.x = r.left + r.width / 2;
    input.stickCenter.y = r.top + r.height / 2;
    stick.setPointerCapture(e.pointerId);
  });

  stick.addEventListener("pointermove", (e) => {
    if (!input.pointerStick || e.pointerId !== input.stickId) return;
    const dx = e.clientX - input.stickCenter.x;
    const dy = e.clientY - input.stickCenter.y;
    const max = 52;

    const mag = Math.hypot(dx, dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;
    const amt = clamp(mag / max, 0, 1);

    input.stickVec.x = nx * amt;
    input.stickVec.y = ny * amt;
    knob.style.transform = `translate(${(-50 + input.stickVec.x * 42)}%, ${(-50 + input.stickVec.y * 42)}%)`;
  });

  function endStick() {
    input.pointerStick = false;
    input.stickId = null;
    input.stickVec.x = 0; input.stickVec.y = 0;
    knob.style.transform = "translate(-50%,-50%)";
  }
  stick.addEventListener("pointerup", endStick);
  stick.addEventListener("pointercancel", endStick);

  /* =========================
     Storage
  ========================= */
  const HI_KEY = "ink_sword_hi_v1";
  const loadHi = () => Number(localStorage.getItem(HI_KEY) || "0");
  const saveHi = (v) => localStorage.setItem(HI_KEY, String(v));

  /* =========================
     World / Camera
  ========================= */
  const WORLD = { w: 2600, h: 5200 };

  const cam = {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.85,
    shake: 0,
    sx: 0, sy: 0
  };

  /* =========================
     Ink visual system (splatter + brush trail)
  ========================= */
  const PAPER = "#efe6cf";
  const INK = (a) => `rgba(18, 18, 20, ${a})`;
  const GOLD = (a) => `rgba(170, 125, 45, ${a})`;
  const CRIM = (a) => `rgba(120, 15, 25, ${a})`;

  const fx = [];  // particles
  const strokes = []; // long trails

  function spawnSplatter(x, y, power = 1, hue = "ink") {
    const n = randi(18, 34) * power;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(90, 520) * power;
      fx.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: rand(0.8, 3.6) * power,
        life: rand(0.2, 0.7) * (0.7 + power * 0.4),
        t: 0,
        hue
      });
    }
  }

  function spawnBrushTrail(x, y, dx, dy, weight = 1) {
    const len = Math.max(1, Math.floor(6 * weight));
    for (let i = 0; i < len; i++) {
      const off = rand(-10, 10) * weight;
      strokes.push({
        x: x + dy * off,
        y: y - dx * off,
        dx: dx * rand(18, 38) * weight,
        dy: dy * rand(18, 38) * weight,
        w0: rand(6, 20) * weight,
        w1: rand(1.5, 6) * weight,
        life: rand(0.25, 0.55) * (0.7 + weight * 0.25),
        t: 0
      });
    }
  }

  /* =========================
     Entities
  ========================= */
  const player = {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.85,
    vx: 0, vy: 0,
    face: { x: 0, y: -1 },

    hp: 100, hpMax: 100,
    sp: 0, spMax: 100,

    speed: 520,
    dashSpeed: 1040,

    dashing: false,
    dashT: 0, dashDur: 0.14,
    dashCD: 0,

    slashing: false,
    slashT: 0, slashDur: 0.13,
    slashCD: 0,

    guarding: false,
    parryWindow: 0,
    parryCool: 0,
    parryPerfect: false,

    invuln: 0,
    stun: 0
  };

  const ENEMY_TYPES = {
    bandit:  { name: "BANDIT",  hp: 55, spd: 270, atkRange: 78, atkCD: 0.85, dmg: 16, weight: 0.38, hue: "ink" },
    wraith:  { name: "WRAITH",  hp: 40, spd: 320, atkRange: 90, atkCD: 0.95, dmg: 14, weight: 0.30, hue: "crim" },
    knight:  { name: "KNIGHT",  hp: 120, spd: 210, atkRange: 98, atkCD: 1.25, dmg: 26, weight: 0.20, hue: "gold" },
    reaper:  { name: "REAPER",  hp: 85, spd: 290, atkRange: 92, atkCD: 0.95, dmg: 22, weight: 0.12, hue: "crim" }
  };

  const enemies = [];

  function pickEnemyType() {
    const r = Math.random();
    let acc = 0;
    for (const k of Object.keys(ENEMY_TYPES)) {
      acc += ENEMY_TYPES[k].weight;
      if (r <= acc) return ENEMY_TYPES[k];
    }
    return ENEMY_TYPES.bandit;
  }

  function spawnEnemy() {
    const t = pickEnemyType();
    const elite = Math.random() < 0.09;

    const ring = rand(560, 980);
    const ang = rand(0, Math.PI * 2);
    const x = clamp(player.x + Math.cos(ang) * ring, 90, WORLD.w - 90);
    const y = clamp(player.y + Math.sin(ang) * ring, 130, WORLD.h - 130);

    enemies.push({
      type: t,
      elite,
      x, y,
      vx: 0, vy: 0,
      hp: elite ? t.hp * 2.1 : t.hp,

      atkCD: rand(0.15, t.atkCD),
      wind: 0,
      attacking: false,
      hurt: 0,
      stun: 0
    });

    spawnSplatter(x, y, elite ? 1.2 : 0.8, t.hue);
  }

  /* =========================
     Game state
  ========================= */
  const state = {
    started: false,
    running: false,
    over: false,
    last: 0,
    t: 0,
    score: 0,
    hi: loadHi(),
    kills: 0,
    wave: 1,
    spawnT: 0,
    spawnEvery: 1.1,
    flash: 0,
    hitStop: 0,
    timeScale: 1,
    slowT: 0,
    slowTarget: 1
  };

  function showOverlay(on) { overlay.style.display = on ? "flex" : "none"; }

  function reset() {
    Beep.init();

    state.started = false;
    state.running = false;
    state.over = false;
    state.last = 0;
    state.t = 0;
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.spawnT = 0;
    state.spawnEvery = 1.1;
    state.flash = 0;
    state.hitStop = 0;
    state.timeScale = 1;
    state.slowT = 0;
    state.slowTarget = 1;

    enemies.length = 0;
    fx.length = 0;
    strokes.length = 0;

    Object.assign(player, {
      x: WORLD.w * 0.5, y: WORLD.h * 0.85,
      vx: 0, vy: 0, face: { x: 0, y: -1 },
      hp: player.hpMax, sp: 0,
      dashing: false, dashT: 0, dashCD: 0,
      slashing: false, slashT: 0, slashCD: 0,
      guarding: false, parryWindow: 0, parryCool: 0, parryPerfect: false,
      invuln: 0, stun: 0
    });

    cam.x = player.x; cam.y = player.y;
    cam.shake = 0;

    showOverlay(true);
    updateHUD();
  }

  function start() {
    if (state.running) return;
    Beep.init();

    state.started = true;
    state.running = true;
    state.over = false;
    showOverlay(false);

    for (let i = 0; i < 4; i++) spawnEnemy();
    spawnSplatter(player.x, player.y, 1.2, "gold");
    Beep.ping(260, 0.07, "sine", 0.09);
    Beep.ping(520, 0.06, "triangle", 0.07);
  }

  function gameOver() {
    state.running = false;
    state.over = true;
    showOverlay(true);
    Beep.ping(140, 0.12, "sawtooth", 0.08);
  }

  /* =========================
     Combat helpers
  ========================= */
  function addHitStop(sec) {
    state.hitStop = Math.max(state.hitStop, sec);
  }
  function addSlowmo(scale, sec) {
    state.slowTarget = Math.min(state.slowTarget, scale);
    state.slowT = Math.max(state.slowT, sec);
  }
  function shake(power) {
    cam.shake = Math.max(cam.shake, power);
  }

  function startParryWindow() {
    if (player.parryCool > 0) return;
    player.parryWindow = 0.12;
    player.parryCool = 0.22;
    player.parryPerfect = true;
  }

  function takeDamage(dmg, dirx, diry) {
    if (player.invuln > 0) return;

    if (player.guarding) {
      if (player.parryPerfect && player.parryWindow > 0) {
        // perfect parry
        app.classList.remove("parry-glow");
        void app.offsetWidth;
        app.classList.add("parry-glow");

        Beep.ping(780, 0.05, "triangle", 0.10);
        Beep.ping(520, 0.06, "sine", 0.08);

        player.sp = clamp(player.sp + 34, 0, player.spMax);
        addHitStop(0.08);
        addSlowmo(0.62, 0.20);
        shake(10);

        spawnSplatter(player.x + dirx * 22, player.y + diry * 22, 1.4, "gold");
        return "parry";
      }

      // normal guard
      Beep.ping(260, 0.05, "square", 0.06);
      player.hp -= dmg * 0.28;
      player.sp = clamp(player.sp + 7, 0, player.spMax);
      spawnSplatter(player.x, player.y, 0.65, "ink");
      return "guard";
    }

    // hit
    Beep.ping(180, 0.07, "sawtooth", 0.08);
    player.hp -= dmg;
    player.invuln = 0.36;
    player.stun = Math.max(player.stun, 0.16);
    shake(14);
    state.flash = 1;
    addHitStop(0.07);
    addSlowmo(0.78, 0.16);

    spawnSplatter(player.x, player.y, 1.15, "crim");

    if (player.hp <= 0) {
      player.hp = 0;
      const s = Math.floor(state.score);
      if (s > state.hi) { state.hi = s; saveHi(state.hi); }
      gameOver();
    }
    return "hit";
  }

  function doDash(dir) {
    if (player.dashCD > 0 || player.dashing || player.stun > 0) return;
    const mag = Math.hypot(dir.x, dir.y) || 1;

    player.dashing = true;
    player.dashT = 0;
    player.dashCD = 0.28;
    player.invuln = Math.max(player.invuln, 0.16);

    player.vx = (dir.x / mag) * player.dashSpeed;
    player.vy = (dir.y / mag) * player.dashSpeed;

    shake(8);
    Beep.ping(620, 0.04, "triangle", 0.08);
    spawnBrushTrail(player.x, player.y, -dir.x, -dir.y, 1.2);
  }

  function doSlash() {
    if (player.slashCD > 0 || player.slashing || player.stun > 0) return;

    player.slashing = true;
    player.slashT = 0;
    player.slashCD = 0.18;

    player.sp = clamp(player.sp + 2.8, 0, player.spMax);

    shake(6);
    addHitStop(0.03);

    // brush arc
    const fxdir = player.face;
    spawnBrushTrail(player.x + fxdir.x * 18, player.y + fxdir.y * 18, fxdir.x, fxdir.y, 1.7);
    spawnSplatter(player.x + fxdir.x * 34, player.y + fxdir.y * 34, 0.85, "ink");

    Beep.ping(420, 0.05, "triangle", 0.07);

    // hit enemies in cone
    const R = 112;
    const cone = 0.78; // radians ~45deg
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = hypot(dx, dy);
      if (d > R) continue;

      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      const dot = nx * fxdir.x + ny * fxdir.y;
      if (Math.acos(clamp(dot, -1, 1)) > cone) continue;

      const dmg = e.elite ? 20 : 26;
      e.hp -= dmg;
      e.hurt = 1;
      e.stun = Math.max(e.stun, 0.18);

      spawnSplatter(e.x, e.y, e.elite ? 1.2 : 1.0, e.type.hue);
      addSlowmo(0.72, 0.10);
      shake(10);

      if (e.hp <= 0) {
        state.kills++;
        state.score += 120 + state.wave * 12;
        player.sp = clamp(player.sp + 8, 0, player.spMax);
        spawnSplatter(e.x, e.y, 1.6, "gold");
        Beep.ping(720, 0.06, "sine", 0.09);
      }
    }
  }

  function doSpecial() {
    if (player.sp < player.spMax || player.stun > 0) return;
    player.sp = 0;

    const R = 270;
    shake(18);
    addHitStop(0.09);
    addSlowmo(0.62, 0.22);
    state.flash = 1;

    // big ink burst ring
    spawnSplatter(player.x, player.y, 2.1, "gold");
    spawnBrushTrail(player.x, player.y, 1, 0, 2.3);
    spawnBrushTrail(player.x, player.y, -1, 0, 2.3);
    spawnBrushTrail(player.x, player.y, 0, 1, 2.3);
    spawnBrushTrail(player.x, player.y, 0, -1, 2.3);

    Beep.ping(240, 0.08, "sawtooth", 0.10);
    Beep.ping(480, 0.07, "triangle", 0.09);

    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const d = hypot(e.x - player.x, e.y - player.y);
      if (d <= R) {
        e.hp -= 55;
        e.hurt = 1;
        e.stun = Math.max(e.stun, 0.7);
        spawnSplatter(e.x, e.y, 1.5, e.type.hue);
        if (e.hp <= 0) {
          state.kills++;
          state.score += 200 + state.wave * 20;
          spawnSplatter(e.x, e.y, 1.9, "gold");
        }
      }
    }
  }

  /* =========================
     HUD
  ========================= */
  function updateHUD() {
    const hpPct = clamp(player.hp / player.hpMax, 0, 1);
    const spPct = clamp(player.sp / player.spMax, 0, 1);
    hpFill.style.width = `${hpPct * 100}%`;
    spFill.style.width = `${spPct * 100}%`;
    scoreText.textContent = Math.floor(state.score);
    hiText.textContent = state.hi;
    killText.textContent = state.kills;
    waveText.textContent = state.wave;

    // low hp pulse
    const hud = $(".hud");
    if (player.hp < 28) hud.classList.add("hp-low");
    else hud.classList.remove("hp-low");
  }

  /* =========================
     Update
  ========================= */
  function update(dt) {
    state.t += dt;
    if (!state.running) return;

    // wave scaling
    state.score += dt * (92 + state.wave * 7);
    const targetWave = 1 + Math.floor(state.score / 800);
    state.wave = Math.max(state.wave, targetWave);

    state.spawnEvery = clamp(1.25 - (state.wave - 1) * 0.06, 0.42, 1.25);
    state.spawnT += dt;
    if (state.spawnT >= state.spawnEvery) {
      state.spawnT = 0;
      spawnEnemy();
    }

    // timers
    player.dashCD = Math.max(0, player.dashCD - dt);
    player.slashCD = Math.max(0, player.slashCD - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.stun = Math.max(0, player.stun - dt);
    player.parryWindow = Math.max(0, player.parryWindow - dt);
    player.parryCool = Math.max(0, player.parryCool - dt);

    if (player.parryWindow <= 0) player.parryPerfect = false;

    // guard / parry window
    if (input.guard && player.stun <= 0) {
      if (!player.guarding) startParryWindow();
      player.guarding = true;
    } else {
      player.guarding = false;
    }

    // move vector
    let mx = 0, my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    mx += input.stickVec.x;
    my += input.stickVec.y;

    const mm = Math.hypot(mx, my);
    if (mm > 1e-6) {
      mx /= mm; my /= mm;
      player.face.x = lerp(player.face.x, mx, 1 - Math.pow(0.001, dt));
      player.face.y = lerp(player.face.y, my, 1 - Math.pow(0.001, dt));
    }

    // actions
    if (input.dashPressed) {
      input.dashPressed = false;
      doDash(mm > 1e-6 ? { x: mx, y: my } : player.face);
    }
    if (input.slashPressed) { input.slashPressed = false; doSlash(); }
    if (input.specialPressed) { input.specialPressed = false; doSpecial(); }

    // dash motion
    if (player.dashing) {
      player.dashT += dt;
      if (player.dashT >= player.dashDur) {
        player.dashing = false;
        player.vx *= 0.22; player.vy *= 0.22;
      }
    }

    // velocity
    if (player.stun > 0) {
      player.vx *= Math.pow(0.001, dt);
      player.vy *= Math.pow(0.001, dt);
    } else if (!player.dashing) {
      const spd = player.speed * (player.guarding ? 0.62 : 1.0);
      player.vx = lerp(player.vx, mx * spd, 1 - Math.pow(0.001, dt));
      player.vy = lerp(player.vy, my * spd, 1 - Math.pow(0.001, dt));
    }

    const px0 = player.x, py0 = player.y;
    player.x = clamp(player.x + player.vx * dt, 70, WORLD.w - 70);
    player.y = clamp(player.y + player.vy * dt, 90, WORLD.h - 90);

    // trail when moving
    const mv = hypot(player.x - px0, player.y - py0);
    if (mv > 0.4) {
      spawnBrushTrail(player.x, player.y, player.vx * 0.003, player.vy * 0.003, player.guarding ? 0.55 : 0.85);
      if (Math.random() < 0.08) spawnSplatter(player.x, player.y, 0.35, "ink");
    }

    // enemies update
    for (const e of enemies) {
      if (e.hp <= 0) continue;

      e.hurt = Math.max(0, e.hurt - dt * 3);
      e.stun = Math.max(0, e.stun - dt);

      const t = e.type;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;

      // approach / circle
      const desire = (d > t.atkRange * 0.92) ? 1 : 0.35;
      const spd = (e.stun > 0) ? 0 : t.spd * (e.elite ? 1.08 : 1.0);

      // small orbit for style
      const ox = -ny * 0.35;
      const oy = nx * 0.35;

      e.vx = lerp(e.vx, (nx * desire + ox) * spd, 1 - Math.pow(0.001, dt));
      e.vy = lerp(e.vy, (ny * desire + oy) * spd, 1 - Math.pow(0.001, dt));

      e.x = clamp(e.x + e.vx * dt, 70, WORLD.w - 70);
      e.y = clamp(e.y + e.vy * dt, 90, WORLD.h - 90);

      // windup / attack
      e.atkCD -= dt;
      if (e.atkCD <= 0 && d < t.atkRange + 10 && e.stun <= 0) {
        e.atkCD = t.atkCD * rand(0.85, 1.08);
        e.wind = 0.28;
        e.attacking = true;

        stage.classList.remove("danger-flash");
        void stage.offsetWidth;
        stage.classList.add("danger-flash");
      }

      if (e.attacking) {
        e.wind -= dt;
        if (e.wind <= 0) {
          e.attacking = false;

          // hit check
          const dd = hypot(player.x - e.x, player.y - e.y);
          if (dd < t.atkRange + 18) {
            const res = takeDamage(t.dmg * (e.elite ? 1.1 : 1.0), nx, ny);
            spawnSplatter(player.x - nx * 12, player.y - ny * 12, 0.95, res === "parry" ? "gold" : "crim");
          }

          // attack trail
          spawnBrushTrail(e.x, e.y, nx, ny, e.elite ? 1.5 : 1.15);
          spawnSplatter(e.x + nx * 22, e.y + ny * 22, e.elite ? 1.15 : 0.85, t.hue);
          shake(7);
        }
      }
    }

    // cleanup dead enemies slowly (keep splatters looking juicy)
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        enemies.splice(i, 1);
      }
    }

    // keep some pressure
    if (enemies.length < 3 && state.wave >= 2 && Math.random() < 0.015) spawnEnemy();

    // update fx
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.0015, dt);
      p.vy *= Math.pow(0.0015, dt);
      if (p.t >= p.life) fx.splice(i, 1);
    }

    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      s.t += dt;
      s.x += s.dx * dt;
      s.y += s.dy * dt;
      s.dx *= Math.pow(0.0018, dt);
      s.dy *= Math.pow(0.0018, dt);
      if (s.t >= s.life) strokes.splice(i, 1);
    }

    // camera follow + shake
    cam.x = lerp(cam.x, player.x, 1 - Math.pow(0.00005, dt));
    cam.y = lerp(cam.y, player.y, 1 - Math.pow(0.00005, dt));
    cam.shake = Math.max(0, cam.shake - dt * 40);

    const sh = cam.shake;
    cam.sx = (Math.random() * 2 - 1) * sh;
    cam.sy = (Math.random() * 2 - 1) * sh;

    state.flash = Math.max(0, state.flash - dt * 3.5);

    updateHUD();
  }

  /* =========================
     Render helpers
  ========================= */
  function worldToScreen(wx, wy) {
    // camera center on screen
    const sx = (wx - cam.x) + view.w * 0.5 + cam.sx;
    const sy = (wy - cam.y) + view.h * 0.5 + cam.sy;
    return { x: sx, y: sy };
  }

  function drawPaper() {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, view.w, view.h);

    // subtle fibers
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 70; i++) {
      const x = (Math.random() * view.w) | 0;
      const y = (Math.random() * view.h) | 0;
      const w = rand(30, 140);
      const h = rand(1, 3);
      ctx.fillStyle = "rgba(40,35,30,0.35)";
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalAlpha = 1;

    // vignette
    const g = ctx.createRadialGradient(view.w * 0.5, view.h * 0.45, 60, view.w * 0.5, view.h * 0.5, Math.max(view.w, view.h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function inkColor(hue, a) {
    if (hue === "gold") return GOLD(a);
    if (hue === "crim") return CRIM(a);
    return INK(a);
  }

  function drawStrokes() {
    // painterly trails
    for (const s of strokes) {
      const t = s.t / s.life;
      const k = easeOutCubic(1 - t);

      const p0 = worldToScreen(s.x, s.y);
      const p1 = worldToScreen(s.x + s.dx * 0.06, s.y + s.dy * 0.06);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const w = lerp(s.w0, s.w1, t) * (0.7 + k * 0.6);
      ctx.strokeStyle = INK(0.12 + 0.36 * k);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // edge feather
      ctx.strokeStyle = INK(0.06 + 0.12 * k);
      ctx.lineWidth = w * 1.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  function drawSplatter() {
    for (const p of fx) {
      const t = p.t / p.life;
      const k = 1 - t;
      const s = worldToScreen(p.x, p.y);
      ctx.fillStyle = inkColor(p.hue, 0.10 + 0.42 * k);
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.r * (0.7 + k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawArena() {
    // ink “arena marks”
    const step = 220;
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(18,18,20,0.45)";
    ctx.lineWidth = 2;

    const minX = cam.x - view.w * 0.65;
    const maxX = cam.x + view.w * 0.65;
    const minY = cam.y - view.h * 0.65;
    const maxY = cam.y + view.h * 0.65;

    for (let y = Math.floor(minY / step) * step; y <= maxY; y += step) {
      const a = 0.12 + 0.08 * Math.sin(y * 0.01);
      ctx.globalAlpha = a;
      const p0 = worldToScreen(minX, y);
      const p1 = worldToScreen(maxX, y);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    for (let x = Math.floor(minX / step) * step; x <= maxX; x += step) {
      const a = 0.10 + 0.08 * Math.cos(x * 0.01);
      ctx.globalAlpha = a;
      const p0 = worldToScreen(x, minY);
      const p1 = worldToScreen(x, maxY);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // border hint near world edges
    const pad = 60;
    const left = WORLD.w * 0.0 + pad;
    const top = WORLD.h * 0.0 + pad;
    const right = WORLD.w * 1.0 - pad;
    const bot = WORLD.h * 1.0 - pad;

    const A = worldToScreen(left, top);
    const B = worldToScreen(right, top);
    const C = worldToScreen(right, bot);
    const D = worldToScreen(left, bot);

    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(D.x, D.y);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 16;
    ctx.stroke();
  }

  function drawPlayer() {
    const p = worldToScreen(player.x, player.y);
    const fxdir = player.face;
    const ang = Math.atan2(fxdir.y, fxdir.x);

    // shadow ink pool
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 18, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // body (brush silhouette)
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + Math.PI * 0.5);

    const hurt = (player.invuln > 0) ? 0.55 : 0;
    const a = 0.85 - hurt * 0.25;

    ctx.fillStyle = `rgba(15,15,18,${a})`;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(16, -10, 10, 18);
    ctx.quadraticCurveTo(0, 36, -10, 18);
    ctx.quadraticCurveTo(-16, -10, 0, -26);
    ctx.fill();

    // highlight edge (wet ink)
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // blade
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -42);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -36);
    ctx.stroke();

    ctx.restore();
  }

  function drawEnemy(e) {
    const p = worldToScreen(e.x, e.y);

    const t = e.type;
    const k = e.elite ? 1.25 : 1.0;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 16, 22 * k, 12 * k, 0, 0, Math.PI * 2);
    ctx.fill();

    // silhouette
    const hurt = e.hurt > 0 ? 0.55 : 0;
    const a = 0.80 - hurt * 0.25;
    ctx.fillStyle = inkColor(t.hue, a);

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 24 * k);
    ctx.quadraticCurveTo(p.x + 18 * k, p.y - 6 * k, p.x + 10 * k, p.y + 18 * k);
    ctx.quadraticCurveTo(p.x, p.y + 34 * k, p.x - 10 * k, p.y + 18 * k);
    ctx.quadraticCurveTo(p.x - 18 * k, p.y - 6 * k, p.x, p.y - 24 * k);
    ctx.fill();

    // elite rim
    if (e.elite) {
      ctx.strokeStyle = GOLD(0.32);
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // windup mark
    if (e.attacking) {
      ctx.strokeStyle = CRIM(0.35);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 32 * k, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFlash() {
    if (state.flash <= 0) return;
    ctx.globalAlpha = clamp(state.flash, 0, 1) * 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.globalAlpha = 1;
  }

  /* =========================
     Render
  ========================= */
  function draw() {
    drawPaper();
    drawArena();

    drawStrokes();
    drawSplatter();

    // entities
    for (const e of enemies) if (e.hp > 0) drawEnemy(e);
    drawPlayer();

    drawFlash();

    // subtle film grain
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() * view.w) | 0;
      const y = (Math.random() * view.h) | 0;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* =========================
     Main loop
  ========================= */
  function loop(ts) {
    if (!state.last) state.last = ts;
    const rawDt = clamp((ts - state.last) / 1000, 0, 0.033);
    state.last = ts;

    if (state.hitStop > 0) {
      state.hitStop = Math.max(0, state.hitStop - rawDt);
      update(0);
    } else {
      if (state.slowT > 0) state.slowT = Math.max(0, state.slowT - rawDt);
      else state.slowTarget = 1;

      state.timeScale = lerp(state.timeScale, state.slowTarget, 1 - Math.pow(0.001, rawDt));
      update(rawDt * state.timeScale);
    }

    draw();
    requestAnimationFrame(loop);
  }

  /* =========================
     Boot
  ========================= */
  reset();
  hiText.textContent = state.hi;
  requestAnimationFrame(loop);

  // Allow tap anywhere to unlock + start
  overlay.addEventListener("pointerdown", () => {
    Beep.init();
    if (!state.started) start();
    else if (state.over) reset();
  }, { passive: true });

})();
