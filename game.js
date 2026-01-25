/* game.js — v4 FULL REPLACE
   - Player: 32x48 high-res pixel, Walk 4f / Slash 4f / Guard 2f
   - Enemies: 32x32 pixel sprites (wraith/brute/dart)
   - Heavy feel: longer hitstop, stronger shake, visible cone + pixel stroke
   - Offline-ready friendly (no external assets required)
*/
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });

  // HUD
  const hpFill = document.getElementById("hpFill");
  const spFill = document.getElementById("spFill");
  const scoreText = document.getElementById("scoreText");
  const hiText = document.getElementById("hiText");
  const killText = document.getElementById("killText");
  const waveText = document.getElementById("waveText");
  const comboText = document.getElementById("comboText");
  const rankText = document.getElementById("rankText");

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

  /* =========================
     Resize
  ========================= */
  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  /* =========================
     Helpers
  ========================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const snap = (v) => Math.round(v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const norm = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };

  function haptic(ms = 20) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  }

  /* =========================
     World / State
  ========================= */
  const WORLD = { w: 1400, h: 900 };

  const state = {
    running: false,
    t: 0,
    dt: 0,
    last: 0,
    shake: 0,
    hitStop: 0,

    score: 0,
    hi: Number(localStorage.getItem("ink_hi") || 0),
    kills: 0,
    wave: 1,

    combo: 0,
    comboTimer: 0,
    rank: "-",

    camX: 0,
    camY: 0,
  };
  hiText.textContent = String(state.hi);

  const player = {
    x: WORLD.w * 0.5,
    y: WORLD.h * 0.6,
    vx: 0, vy: 0,
    r: 22,

    hp: 100, hpMax: 100,
    ink: 100, inkMax: 100,

    faceX: 1, faceY: 0,
    facing: 1, // 1 right, -1 left

    guarding: false,
    dashCD: 0,
    slashCD: 0,
    invuln: 0,

    flash: 0,
    guardFx: 0,

    act: "idle", // idle/walk/slash/guard/dash
    animT: 0,
    walkT: 0,
  };

  const input = {
    keys: new Set(),
    slashTap: false,
    guard: false,
    dash: false,
    special: false,
  };

  const enemies = [];
  const dots = [];
  const slashes = [];

  /* =========================
     Combo / Rank
  ========================= */
  function calcRank(c) {
    if (c >= 20) return "S";
    if (c >= 12) return "A";
    if (c >= 6) return "B";
    if (c >= 3) return "C";
    return "-";
  }
  function addCombo() {
    state.combo += 1;
    state.comboTimer = 2.6;
    state.rank = calcRank(state.combo);
    comboText.textContent = String(state.combo);
    rankText.textContent = state.rank;
  }
  function breakCombo() {
    state.combo = 0;
    state.comboTimer = 0;
    state.rank = "-";
    comboText.textContent = "0";
    rankText.textContent = "-";
  }

  /* =========================
     Spawn
  ========================= */
  function spawnEnemy(n = 1) {
    for (let i = 0; i < n; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (edge === 0) { x = -40; y = rand(0, WORLD.h); }
      if (edge === 1) { x = WORLD.w + 40; y = rand(0, WORLD.h); }
      if (edge === 2) { x = rand(0, WORLD.w); y = -40; }
      if (edge === 3) { x = rand(0, WORLD.w); y = WORLD.h + 40; }

      const r0 = Math.random();
      const type = r0 < 0.60 ? "wraith" : (r0 < 0.85 ? "brute" : "dart");

      const baseHP = type === "brute" ? 70 : (type === "dart" ? 34 : 48);
      const baseSp = type === "brute" ? 78 : (type === "dart" ? 150 : 110);

      enemies.push({
        type,
        x, y,
        r: type === "brute" ? 28 : (type === "dart" ? 18 : 22),
        hp: baseHP + state.wave * (type === "brute" ? 10 : 7),
        sp: baseSp + state.wave * (type === "dart" ? 2.2 : 1.6),
        hit: 0,
        animT: rand(0, 10),
        wob: rand(0, 999),
      });
    }
  }
  function spawnWave(w) {
    waveText.textContent = String(w);
    spawnEnemy(4 + Math.floor(w * 1.9));
  }

  function resetGame() {
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.rank = "-";

    player.x = WORLD.w * 0.5;
    player.y = WORLD.h * 0.6;
    player.vx = player.vy = 0;
    player.hp = player.hpMax;
    player.ink = player.inkMax;
    player.dashCD = 0;
    player.slashCD = 0;
    player.invuln = 0;
    player.flash = 0;
    player.guardFx = 0;
    player.act = "idle";
    player.animT = 0;
    player.walkT = 0;

    enemies.length = 0;
    dots.length = 0;
    slashes.length = 0;

    spawnWave(state.wave);
    syncHUD();
  }

  /* =========================
     FX
  ========================= */
  function dot(x, y, vx, vy, life, size) {
    dots.push({ x, y, vx, vy, life, t: life, size });
  }
  function burstDots(x, y, power = 1) {
    const n = Math.floor(26 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (120 + Math.random() * 260) * power;
      dot(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.16, 0.52), rand(2, 4));
    }
  }
  function hitStop(frames) { state.hitStop = Math.max(state.hitStop, frames); }
  function shake(amount) { state.shake = Math.max(state.shake, amount); }

  /* =========================
     Attack
  ========================= */
  function inCone(px, py, fx, fy, ex, ey, reach, halfAngle) {
    const dx = ex - px, dy = ey - py;
    const d = Math.hypot(dx, dy);
    if (d > reach) return false;
    const angTo = Math.atan2(dy, dx);
    const angF = Math.atan2(fy, fx);
    let da = angTo - angF;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) <= halfAngle;
  }

  function pushSlash(px, py, dx, dy, heavy = false) {
    const [nx, ny] = norm(dx, dy);
    const life = heavy ? 0.30 : 0.22;
    slashes.push({
      x: px + nx * 18,
      y: py + ny * 18,
      nx, ny,
      heavy,
      reach: heavy ? 150 : 118,
      half: heavy ? 0.92 : 0.72,
      life, t: life,
    });
  }

  function dealDamage(e, dmg, hx, hy, heavy = false) {
    e.hp -= dmg;
    e.hit = 0.18;

    burstDots(hx, hy, heavy ? 1.45 : 1.0);
    shake(heavy ? 20 : 14);
    hitStop(heavy ? 8 : 5);
    haptic(heavy ? 34 : 18);

    player.flash = Math.max(player.flash, heavy ? 0.55 : 0.28);

    if (e.hp <= 0) {
      state.kills += 1;
      killText.textContent = String(state.kills);

      state.score += 16 + Math.floor(state.combo * 2.2);
      addCombo();

      burstDots(e.x, e.y, 1.8);
      enemies.splice(enemies.indexOf(e), 1);

      if (enemies.length === 0) {
        state.wave += 1;
        spawnWave(state.wave);
      }
    }
  }

  function slashAttack(heavy = false) {
    if (player.slashCD > 0) return;
    const cost = heavy ? 38 : 14;
    if (player.ink < cost) return;

    player.ink -= cost;
    player.slashCD = heavy ? 0.78 : 0.38;

    const fx = player.faceX || 1;
    const fy = player.faceY || 0;

    pushSlash(player.x, player.y, fx, fy, heavy);

    const reach = heavy ? 150 : 118;
    const half = heavy ? 0.92 : 0.72;
    const dmg = heavy ? 40 : 18;

    const [nx, ny] = norm(fx, fy);
    player.vx += nx * (heavy ? 170 : 90);
    player.vy += ny * (heavy ? 170 : 90);

    for (const e of [...enemies]) {
      if (!inCone(player.x, player.y, fx, fy, e.x, e.y, reach + e.r, half)) continue;
      dealDamage(e, dmg, lerp(player.x, e.x, 0.72), lerp(player.y, e.y, 0.72), heavy);
    }

    player.act = "slash";
    player.animT = 0;
  }

  function dash() {
    if (player.dashCD > 0) return;
    if (player.ink < 14) return;

    player.ink -= 14;
    player.dashCD = 0.92;
    player.invuln = 0.26;

    const [nx, ny] = norm(player.faceX || 1, player.faceY || 0);
    player.vx += nx * 620;
    player.vy += ny * 620;

    burstDots(player.x, player.y, 1.0);
    shake(14);
    hitStop(2);
    haptic(18);

    player.act = "dash";
    player.animT = 0;
  }

  function specialInkBurst() {
    if (player.ink < 60) return;
    player.ink -= 60;

    player.flash = Math.max(player.flash, 0.62);

    const radius = 185;
    burstDots(player.x, player.y, 2.4);
    pushSlash(player.x, player.y, player.faceX || 1, player.faceY || 0, true);

    for (const e of [...enemies]) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= radius + e.r) dealDamage(e, 30, e.x, e.y, true);
    }

    shake(24);
    hitStop(9);
    haptic(42);

    player.act = "slash";
    player.animT = 0;
  }

  /* =========================
     Input: Keyboard
  ========================= */
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    input.keys.add(k);
    if (k === "j") input.slashTap = true;
    if (k === "k") input.guard = true;
    if (k === "l") input.dash = true;
    if (k === "i") input.special = true;
  }, { passive: true });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    input.keys.delete(k);
    if (k === "k") input.guard = false;
  }, { passive: true });

  /* =========================
     Touch Joystick (single)
  ========================= */
  const joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0, radius: 54, dead: 0.14 };

  function setKnob(dx, dy, mag) {
    knob.style.transform = `translate(${dx * joy.radius * mag}px, ${dy * joy.radius * mag}px)`;
  }

  function joyStart(e) {
    joy.active = true;
    joy.id = e.pointerId;
    const r = stick.getBoundingClientRect();
    joy.cx = r.left + r.width / 2;
    joy.cy = r.top + r.height / 2;
    stick.setPointerCapture?.(e.pointerId);
    joyMove(e);
  }
  function joyMove(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    const dx = e.clientX - joy.cx;
    const dy = e.clientY - joy.cy;
    const d = Math.hypot(dx, dy);
    const m = clamp(d / joy.radius, 0, 1);
    const [nx, ny] = d > 0 ? [dx / d, dy / d] : [0, 0];
    joy.dx = nx; joy.dy = ny; joy.mag = m;
    setKnob(nx, ny, m);
    e.preventDefault?.();
  }
  function joyEnd(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    joy.active = false;
    joy.id = null;
    joy.dx = joy.dy = 0;
    joy.mag = 0;
    setKnob(0, 0, 0);
  }

  stick.addEventListener("pointerdown", joyStart, { passive: false });
  window.addEventListener("pointermove", joyMove, { passive: false });
  window.addEventListener("pointerup", joyEnd, { passive: true });
  window.addEventListener("pointercancel", joyEnd, { passive: true });

  /* =========================
     Touch Buttons
  ========================= */
  function bindHold(btn, onDown, onUp) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.classList.add("is-down");
      btn.setPointerCapture?.(e.pointerId);
      onDown();
    }, { passive: false });
    const up = () => {
      btn.classList.remove("is-down");
      onUp?.();
    };
    btn.addEventListener("pointerup", up, { passive: true });
    btn.addEventListener("pointercancel", up, { passive: true });
  }

  let slashHoldT = 0;
  bindHold(btnSlash,
    () => { slashHoldT = 0.0001; },
    () => {
      const heavy = slashHoldT >= 0.28;
      slashHoldT = 0;
      slashAttack(heavy);
    }
  );
  bindHold(btnGuard, () => (input.guard = true), () => (input.guard = false));
  bindHold(btnDash, () => { input.dash = true; }, () => {});
  bindHold(btnSpecial, () => { input.special = true; }, () => {});

  /* =========================
     Sprite System
  ========================= */
  function spriteFromStrings(lines) {
    return { w: lines[0].length, h: lines.length, lines };
  }

  function drawSprite(ctx2, spr, x, y, px, alpha = 1, mirrorX = false) {
    const w = spr.w, h = spr.h;
    const ox = Math.floor(w / 2);
    const oy = Math.floor(h / 2);

    ctx2.save();
    ctx2.translate(snap(x), snap(y));
    ctx2.scale(mirrorX ? -1 : 1, 1);
    ctx2.translate(-ox * px, -oy * px);
    ctx2.imageSmoothingEnabled = false;

    for (let yy = 0; yy < h; yy++) {
      const row = spr.lines[yy];
      for (let xx = 0; xx < w; xx++) {
        const c = row[xx];
        if (c === " ") continue;
        let a = alpha;
        if (c === ".") a *= 0.35;
        else if (c === "#") a *= 0.85;
        else if (c === "+") a *= 1.0;
        ctx2.globalAlpha = a;
        ctx2.fillStyle = "#000";
        ctx2.fillRect(xx * px, yy * px, px, px);
      }
    }

    ctx2.restore();
    ctx2.globalAlpha = 1;
  }

  // --- Player 32x48: Walk 4f / Slash 4f / Guard 2f ---
  // NOTE: 전부 “검정 도트”만. (.+#만 사용)
  // 원칙: 몸통/갓은 유지하고, 발/팔/칼 픽셀만 프레임별로 움직여서 부드럽게 보이게 함.

  // Base idle
  const P_IDLE = spriteFromStrings([
    "              ++++++++              ",
    "          ++++############++++      ",
    "        +++##################+++    ",
    "       ++########################++ ",
    "       +######++++########++++###+  ",
    "        ++##++      ++##++      ++  ",
    "            ++++++++++++             ",
    "          ..++####++++####++..       ",
    "        ..+++################+++..   ",
    "      ..+++######################+++.",
    "     ..++############################",
    "     .+####++++################++++##",
    "     .+###++        ####        ++###",
    "     .+###++   ++   ####   ++   ++###",
    "     .+###++   ++   ####   ++   ++###",
    "     .+####++++################++++##",
    "     .++############################+",
    "      .+############################+",
    "      .+############################+",
    "      .+####++++++++++++############+",
    "      .+####++          ++##########+",
    "      .+####++          ++##########+",
    "      .+####++          ++##########+",
    "      .+####++          ++##########+",
    "      .+####++          ++##########+",
    "       .++##++            ++####++.. ",
    "       .++##++            ++####++.. ",
    "       .++##++            ++####++.. ",
    "      ..++##++            ++####++.. ",
    "     ..+++##++            ++####+++..",
    "     ..+  ##++            ++##  +..  ",
    "       .+ ###+            +## +.     ",
    "       .+ ###             ### +.     ",
    "       .+  ##+            +##  +.    ",
    "       .+  ##+            +##  +.    ",
    "       .+  ##+            +##  +.    ",
    "        .++  ++          ++  ++.     ",
    "        .++  ++          ++  ++.     ",
    "        .++  ++          ++  ++.     ",
    "       ..++  ++          ++  ++..    ",
    "     ...+++  ++          ++  +++...   ",
    "     ..+  +  ++          ++  +  +..   ",
    "       .+      +        +      +.     ",
    "       .+      +        +      +.     ",
    "       .+      +        +      +.     ",
    "          .++    +      +    ++.      ",
    "          .++    +      +    ++.      ",
    "                ..      ..            ",
  ]);

  // Walk frames: leg alternation + robe swing
  const P_WALK1 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i === 39) return row.replace("++  ++", "++ ++ ");
    if (i === 40) return row.replace("++  ++", "++ ++ ");
    if (i === 41) return row.replace("+++...", "++....");
    return row;
  }));
  const P_WALK2 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i === 39) return row.replace("++  ++", "++  + ");
    if (i === 40) return row.replace("++  ++", "++  + ");
    if (i === 41) return row.replace("+++...", "++++..");
    return row;
  }));
  const P_WALK3 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i === 39) return row.replace("++  ++", " ++ ++");
    if (i === 40) return row.replace("++  ++", " ++ ++");
    if (i === 41) return row.replace("+++...", ".++++.");
    return row;
  }));
  const P_WALK4 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i === 39) return row.replace("++  ++", " +  ++");
    if (i === 40) return row.replace("++  ++", " +  ++");
    if (i === 41) return row.replace("+++...", "..++++");
    return row;
  }));

  // Guard frames: add a “plate” in front (right side when facing right)
  const P_GUARD1 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i >= 12 && i <= 16) return row + "  +++";
    if (i === 17) return row + "  ++ ";
    return row;
  }));
  const P_GUARD2 = spriteFromStrings(P_IDLE.lines.map((row, i) => {
    if (i >= 12 && i <= 16) return row + " ++++";
    if (i === 17) return row + "  ++ ";
    return row;
  }));

  // Slash frames: sword arc pixels on the right; timing feels heavy
  function addSwordArc(lines, phase) {
    // phase 0..3
    return lines.map((row, i) => {
      if (phase === 0 && (i === 18 || i === 19)) return row + "   ++";
      if (phase === 1 && (i === 17 || i === 18 || i === 19)) return row + "  ++++";
      if (phase === 2 && (i === 16 || i === 17 || i === 18)) return row + " ++++++";
      if (phase === 3 && (i === 17 || i === 18)) return row + "   ++";
      return row;
    });
  }
  const P_SLASH1 = spriteFromStrings(addSwordArc(P_IDLE.lines, 0));
  const P_SLASH2 = spriteFromStrings(addSwordArc(P_IDLE.lines, 1));
  const P_SLASH3 = spriteFromStrings(addSwordArc(P_IDLE.lines, 2));
  const P_SLASH4 = spriteFromStrings(addSwordArc(P_IDLE.lines, 3));

  // --- Enemies 32x32 (3 types) ---
  const E_WRAITH = spriteFromStrings([
    "             .......            ",
    "          ..++#####++..         ",
    "        ..++#########++..       ",
    "       .++#############++.      ",
    "      .+####+++++++#####+.      ",
    "     .+###++.....++###++#+.     ",
    "    ..+##+..++..++..+##+..+.    ",
    "    ..+##+..++.... ..+##+..+.   ",
    "    ..+##+..++..++..+##+..+.    ",
    "     .+###++.....++###++#+.     ",
    "      .+####+++++++#####+.      ",
    "       .++#############++.      ",
    "        ..++#########++..       ",
    "          ..++#####++..         ",
    "             .......            ",
    "         ..  ..   ..  ..        ",
    "       ..+..       ..+..        ",
    "      .++..         ..++.       ",
    "      .+..           ..+.       ",
    "     ..+.             .+..      ",
    "     ..+.             .+..      ",
    "      .+.             .+.       ",
    "      .++.           .++.       ",
    "       ..++..     ..++..        ",
    "         .............          ",
    "           ..++++..             ",
    "         ..++####++..           ",
    "         ..++####++..           ",
    "           ..++++..             ",
    "             ....               ",
    "                                ",
    "                                ",
  ]);

  const E_BRUTE = spriteFromStrings([
    "         ..++######++..         ",
    "       ..++##########++..       ",
    "      .++##############++.      ",
    "     .+##################+.     ",
    "     .+####+++++++####### +.    ",
    "    ..+###++.....++###++##+.    ",
    "    ..+##+..++..++..+##+..+.    ",
    "    ..+##+..++..++..+##+..+.    ",
    "    ..+##+..++..++..+##+..+.    ",
    "    ..+###++.....++###++##+.    ",
    "     .+####+++++++####### +.    ",
    "     .+##################+.     ",
    "      .++##############++.      ",
    "       ..++##########++..       ",
    "         ..++######++..         ",
    "          ..++....++..          ",
    "        ..++..    ..++..        ",
    "      ..++..        ..++..      ",
    "     .++..            ..++.     ",
    "     .+..              ..+.     ",
    "    ..+.                .+..    ",
    "    ..+.                .+..    ",
    "     .+.                .+.     ",
    "     .++.              .++.     ",
    "      ..++..        ..++..      ",
    "        ..++..    ..++..        ",
    "          ............          ",
    "         ..++......++..         ",
    "       ..++..      ..++..       ",
    "       ..++.        .++..       ",
    "         ..          ..         ",
    "                                ",
  ]);

  const E_DART = spriteFromStrings([
    "            ..++++..            ",
    "          ..++####++..          ",
    "         .++########++.         ",
    "        .+###########+.         ",
    "       .+###++++++### +.        ",
    "      ..+##+......+##+..        ",
    "      ..+##+..++..+##+..        ",
    "      ..+##+..++..+##+..        ",
    "      ..+##+......+##+..        ",
    "       .+###++++++### +.        ",
    "        .+##########+.          ",
    "         .++########++.         ",
    "          ..++####++..          ",
    "            ..++++..            ",
    "         ..  ..  ..  ..         ",
    "       ..+..        ..+..       ",
    "      .++..          ..++.      ",
    "      .+..            ..+.      ",
    "      .+.              .+.      ",
    "      .+.              .+.      ",
    "      .+.              .+.      ",
    "      .++.            .++.      ",
    "       ..++..      ..++..       ",
    "         ..............         ",
    "            ..  ..              ",
    "           .++. .++.             ",
    "          .++.   .++.            ",
    "          ++.     .++            ",
    "          +.       .+            ",
    "                                ",
    "                                ",
    "                                ",
  ]);

  function pickEnemySprite(type) {
    if (type === "brute") return E_BRUTE;
    if (type === "dart") return E_DART;
    return E_WRAITH;
  }

  function pickPlayerSprite() {
    // action first
    if (player.act === "slash") {
      const t = player.animT;
      // 4 frames across 0.34s (heavy feeling)
      if (t < 0.10) return P_SLASH1;
      if (t < 0.18) return P_SLASH2;
      if (t < 0.28) return P_SLASH3;
      return P_SLASH4;
    }
    if (player.guarding) {
      // pulse guard for presence
      const g = (Math.sin(state.t * 10) > 0) ? P_GUARD1 : P_GUARD2;
      return g;
    }

    const sp = Math.hypot(player.vx, player.vy);
    if (sp > 40) {
      // 4-frame walk
      player.walkT += state.dt * 9;
      const f = Math.floor(player.walkT) % 4;
      return f === 0 ? P_WALK1 : (f === 1 ? P_WALK2 : (f === 2 ? P_WALK3 : P_WALK4));
    }

    player.walkT = 0;
    return P_IDLE;
  }

  /* =========================
     HUD / Game Over
  ========================= */
  function syncHUD() {
    hpFill.style.width = `${clamp(player.hp / player.hpMax, 0, 1) * 100}%`;
    spFill.style.width = `${clamp(player.ink / player.inkMax, 0, 1) * 100}%`;
    scoreText.textContent = String(state.score);
    hiText.textContent = String(state.hi);
    killText.textContent = String(state.kills);
    waveText.textContent = String(state.wave);
    comboText.textContent = String(state.combo);
    rankText.textContent = state.rank;
  }

  function gameOver() {
    state.running = false;
    overlay.classList.remove("hide");
    document.getElementById("ovTitle").textContent = "GAME OVER";
    document.getElementById("ovBody").innerHTML =
      `SCORE <b>${state.score}</b> · BEST <b>${state.hi}</b><br/>RESET을 누르면 새로 시작합니다.`;
  }

  /* =========================
     Draw helpers (cone + pixel stroke)
  ========================= */
  function drawCone(sx, sy, fx, fy, reach, halfAngle, alpha) {
    const ang = Math.atan2(fy, fx);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, -halfAngle, halfAngle);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = Math.min(1, alpha + 0.12);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, reach, -halfAngle, halfAngle);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPixelStroke(x, y, nx, ny, heavy, a) {
    const len = heavy ? 140 : 105;
    const w = heavy ? 8 : 6;

    ctx.save();
    ctx.fillStyle = "#000";
    ctx.globalAlpha = (heavy ? 0.34 : 0.26) * a;

    for (let i = 0; i < len; i += 6) {
      const k = i / len;
      const jitter = Math.sin((k * 10 + state.t * 12)) * (heavy ? 2.6 : 1.8);
      const px = snap(x + nx * i - ny * jitter);
      const py = snap(y + ny * i + nx * jitter);
      ctx.fillRect(px - w, py - 1, w * 2, 2);
    }

    ctx.globalAlpha = (heavy ? 0.22 : 0.18) * a;
    for (let s = 0; s < (heavy ? 12 : 8); s++) {
      const i = rand(len * 0.2, len * 0.95);
      const side = (s % 2 ? 1 : -1) * rand(10, 20);
      const px = snap(x + nx * i - ny * side);
      const py = snap(y + ny * i + nx * side);
      ctx.fillRect(px, py, rand(10, 22), 1);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* =========================
     Update
  ========================= */
  function update(dt) {
    if (state.hitStop > 0) {
      state.hitStop -= 1;
      dt = 0;
    }

    state.t += dt;
    player.animT += dt;

    if (slashHoldT > 0) slashHoldT += dt;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) breakCombo();
    }

    // regen ink
    player.ink = clamp(player.ink + 18 * dt, 0, player.inkMax);

    player.dashCD = Math.max(0, player.dashCD - dt);
    player.slashCD = Math.max(0, player.slashCD - dt);
    player.invuln = Math.max(0, player.invuln - dt);

    player.flash = Math.max(0, player.flash - dt * 4.6);
    player.guardFx = player.guarding ? Math.min(1, player.guardFx + dt * 6.5) : Math.max(0, player.guardFx - dt * 9);

    // move input
    let mx = 0, my = 0;
    const k = input.keys;
    if (k.has("w") || k.has("arrowup")) my -= 1;
    if (k.has("s") || k.has("arrowdown")) my += 1;
    if (k.has("a") || k.has("arrowleft")) mx -= 1;
    if (k.has("d") || k.has("arrowright")) mx += 1;

    // joystick
    const jm = joy.mag > joy.dead ? joy.mag : 0;
    if (jm > 0) {
      mx += joy.dx * jm;
      my += joy.dy * jm;
    }

    const mlen = Math.hypot(mx, my);
    if (mlen > 0.001) {
      const nx = mx / mlen;
      const ny = my / mlen;
      player.faceX = lerp(player.faceX, nx, clamp(9 * dt, 0, 1));
      player.faceY = lerp(player.faceY, ny, clamp(9 * dt, 0, 1));
      if (nx < -0.15) player.facing = -1;
      if (nx > 0.15) player.facing = 1;
    }

    // guard state
    player.guarding = !!input.guard;

    // actions
    if (input.dash) { dash(); input.dash = false; }
    if (input.special) { specialInkBurst(); input.special = false; }
    if (input.slashTap) { slashAttack(false); input.slashTap = false; }

    // action settle
    if (player.act === "slash" && player.animT > 0.34) player.act = "idle";
    if (player.act === "dash" && player.animT > 0.22) player.act = "idle";

    // movement (weighty)
    const baseSp = player.guarding ? 175 : 245;
    const accel = player.guarding ? 5.6 : 5.2;
    player.vx += mx * baseSp * accel * dt;
    player.vy += my * baseSp * accel * dt;

    // friction
    const fr = player.guarding ? 8.8 : 7.6;
    player.vx = lerp(player.vx, 0, clamp(fr * dt, 0, 1));
    player.vy = lerp(player.vy, 0, clamp(fr * dt, 0, 1));

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = clamp(player.x, 60, WORLD.w - 60);
    player.y = clamp(player.y, 80, WORLD.h - 60);

    // enemies
    for (const e of enemies) {
      e.animT += dt;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const [nx, ny] = norm(dx, dy);

      // slight wob so they don't feel like squares
      const wob = Math.sin(state.t * 2.2 + e.wob) * (e.type === "dart" ? 0.14 : 0.10);
      e.x += (nx * e.sp + -ny * e.sp * wob) * dt;
      e.y += (ny * e.sp + nx * e.sp * wob) * dt;

      e.hit = Math.max(0, e.hit - dt);

      // collision damage
      const d = Math.hypot(dx, dy);
      if (d < e.r + player.r && player.invuln <= 0) {
        const base = 10 + Math.floor(state.wave * 1.1);
        const dmg = e.type === "brute" ? base + 4 : (e.type === "dart" ? base - 2 : base);

        if (player.guarding) {
          player.hp -= Math.max(1, Math.floor(dmg * 0.25));
          player.ink = clamp(player.ink + 14, 0, player.inkMax);
          shake(10);
          hitStop(3);
          haptic(14);
        } else {
          player.hp -= dmg;
          shake(20);
          hitStop(6);
          haptic(34);
          breakCombo();
        }

        player.invuln = 0.40;
        player.flash = Math.max(player.flash, 0.32);
        burstDots(player.x, player.y, 1.0);

        if (player.hp <= 0) {
          player.hp = 0;
          gameOver();
        }
      }
    }

    // particles
    for (let i = dots.length - 1; i >= 0; i--) {
      const p = dots[i];
      p.t -= dt;
      if (p.t <= 0) { dots.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.90;
      p.vy *= 0.90;
    }

    // slashes lifetime
    for (let i = slashes.length - 1; i >= 0; i--) {
      slashes[i].t -= dt;
      if (slashes[i].t <= 0) slashes.splice(i, 1);
    }

    // hi score
    if (state.score > state.hi) {
      state.hi = state.score;
      localStorage.setItem("ink_hi", String(state.hi));
    }

    syncHUD();
  }

  /* =========================
     Draw
  ========================= */
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    ctx.imageSmoothingEnabled = false;

    // camera
    const targetCamX = clamp(player.x - vw / 2, 0, WORLD.w - vw);
    const targetCamY = clamp(player.y - vh / 2, 0, WORLD.h - vh);
    state.camX = lerp(state.camX, targetCamX, clamp(6 * state.dt, 0, 1));
    state.camY = lerp(state.camY, targetCamY, clamp(6 * state.dt, 0, 1));

    // shake
    let sx = 0, sy = 0;
    if (state.shake > 0) {
      sx = (Math.random() * 2 - 1) * state.shake;
      sy = (Math.random() * 2 - 1) * state.shake;
      state.shake = Math.max(0, state.shake - 28 * state.dt);
    }

    // bg
    ctx.fillStyle = "#efe6cf";
    ctx.fillRect(0, 0, vw, vh);

    // pixel size
    const px = clamp(Math.round(Math.min(vw, vh) / 190), 2, 4);

    ctx.save();
    ctx.translate(sx, sy);

    // enemies
    for (const e of enemies) {
      const x = e.x - state.camX;
      const y = e.y - state.camY;
      const spr = pickEnemySprite(e.type);
      const a = e.hit > 0 ? 1 : 0.92;
      drawSprite(ctx, spr, x, y + Math.sin(e.animT * 7) * 2, px, a, false);
    }

    // slash telegraph + stroke
    if (slashes.length > 0) {
      const s = slashes[slashes.length - 1];
      const x = player.x - state.camX;
      const y = player.y - state.camY;
      const a = clamp(s.t / s.life, 0, 1);

      drawCone(x, y, s.nx, s.ny, s.reach, s.half, (s.heavy ? 0.26 : 0.18) * a);
      drawPixelStroke(x + s.nx * 18, y + s.ny * 18, s.nx, s.ny, s.heavy, a);
    }

    // player aura
    {
      const x = player.x - state.camX;
      const y = player.y - state.camY;

      if (player.flash > 0.01) {
        ctx.globalAlpha = 0.14 * player.flash;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x, y, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (player.guardFx > 0.01) {
        ctx.globalAlpha = 0.10 * player.guardFx;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x, y, 60, -1.1, 1.1);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const spr = pickPlayerSprite();
      const alpha = player.invuln > 0 ? 0.78 : 1;
      drawSprite(ctx, spr, x, y, px, alpha, player.facing < 0);
    }

    // dots
    for (const p of dots) {
      const x = p.x - state.camX;
      const y = p.y - state.camY;
      const a = clamp(p.t / p.life, 0, 1);
      ctx.globalAlpha = 0.6 * a;
      ctx.fillStyle = "#000";
      ctx.fillRect(snap(x), snap(y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // subtle top/bottom bars
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, vw, 18);
    ctx.fillRect(0, vh - 18, vw, 18);
    ctx.globalAlpha = 1;
  }

  /* =========================
     Loop
  ========================= */
  function loop(ts) {
    const t = ts / 1000;
    let dt = Math.min(0.033, t - (state.last / 1000 || t));
    state.last = ts;
    state.dt = dt;

    if (state.running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* =========================
     Overlay
  ========================= */
  document.getElementById("ovTitle").textContent = "INK SWORD";
  document.getElementById("ovBody").innerHTML =
    `<b>이동</b> WASD/방향키 · <b>베기</b> J (모바일 SLASH 홀드=헤비) · <b>가드</b> K / GUARD · <b>대시</b> L / DASH · <b>잉크 폭발</b> I / INK BURST`;

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    state.running = true;
    state.last = performance.now();
  });

  resetBtn.addEventListener("click", () => {
    resetGame();
    overlay.classList.remove("hide");
    state.running = false;
  });

  /* =========================
     Boot
  ========================= */
  function syncHUD() {
    hpFill.style.width = `${clamp(player.hp / player.hpMax, 0, 1) * 100}%`;
    spFill.style.width = `${clamp(player.ink / player.inkMax, 0, 1) * 100}%`;
    scoreText.textContent = String(state.score);
    hiText.textContent = String(state.hi);
    killText.textContent = String(state.kills);
    waveText.textContent = String(state.wave);
    comboText.textContent = String(state.combo);
    rankText.textContent = state.rank;
  }

  // initial spawn
  resetGame();
  requestAnimationFrame(loop);
  state.running = false;
})();
