/* game.js — FULL REPLACE
   High-res Pixel (JS-only) Sprites (Monochrome)
   - Player: Hong-gildong vibe (hat + robe + sword) in pixel-map
   - Enemies: 3 types in pixel-map (wraith / brute / dart)
   - Heavy feel: longer hitstop, stronger shake, slower swing, visible cone + pixel stroke
*/
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });

  // UI
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

  const rankPop = document.getElementById("rankPop");
  const rankPopRank = document.getElementById("rankPopRank");
  const rankPopCombo = document.getElementById("rankPopCombo");
  const rankPopSub = document.getElementById("rankPopSub");

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
  const norm = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  const snap = (v) => Math.round(v);
  const rand = (a, b) => a + Math.random() * (b - a);

  function haptic(ms = 20) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  }

  // tiny synth
  let audioCtx = null;
  function beep(freq = 160, dur = 0.06, type = "square", gain = 0.04) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch {}
  }

  /* =========================
     World / State
  ========================= */
  const WORLD = { w: 1300, h: 850 };

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
    y: WORLD.h * 0.58,
    vx: 0,
    vy: 0,
    r: 18,
    hp: 100,
    hpMax: 100,
    ink: 100,
    inkMax: 100,
    faceX: 1,
    faceY: 0,
    guarding: false,
    dashCD: 0,
    slashCD: 0,
    invuln: 0,

    flash: 0,
    guardFx: 0,
    swingFx: 0,

    animT: 0,
    facing: 1, // 1 right, -1 left (for mirroring)
    act: "idle", // idle / walk / slash / guard / dash
  };

  const input = {
    mx: 0, my: 0,
    keys: new Set(),
    slash: false,
    guard: false,
    dash: false,
    special: false,
  };

  const enemies = [];
  const dots = [];
  const slashes = [];

  const skyline = [];
  const wires = [];

  /* =========================
     Background
  ========================= */
  function seedBackground() {
    skyline.length = 0;
    wires.length = 0;

    const baseY = WORLD.h * 0.30;
    let x = -80;
    while (x < WORLD.w + 200) {
      const w = rand(50, 140);
      const h = rand(50, 280);
      skyline.push({
        x, w, h,
        y: baseY + rand(-12, 18),
        dents: Math.floor(rand(2, 6)),
      });
      x += w * rand(0.55, 0.9);
    }

    const wireCount = 4;
    for (let i = 0; i < wireCount; i++) {
      const y0 = baseY + rand(-110, 40) + i * rand(16, 30);
      wires.push({ y0, a: rand(0.8, 1.4), ph: rand(0, Math.PI * 2) });
    }
  }
  seedBackground();

  /* =========================
     Rank / Combo
  ========================= */
  function calcRank(c) {
    if (c >= 18) return "S";
    if (c >= 10) return "A";
    if (c >= 5) return "B";
    if (c >= 2) return "C";
    return "-";
  }
  function showRankPop(rank, combo) {
    rankPopRank.textContent = rank;
    rankPopCombo.textContent = `x${combo}`;
    rankPopSub.textContent = rank === "S" ? "검은 묵기 폭주!" : "묵기 연계!";
    rankPop.classList.remove("show");
    void rankPop.offsetHeight;
    rankPop.classList.add("show");
    rankPop.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      rankPop.classList.remove("show");
      rankPop.setAttribute("aria-hidden", "true");
    }, 650);
  }
  function addCombo() {
    state.combo += 1;
    state.comboTimer = 2.4;
    const r = calcRank(state.combo);
    if (r !== state.rank) {
      state.rank = r;
      rankText.textContent = r;
      if (r !== "-") showRankPop(r, state.combo);
    }
    comboText.textContent = String(state.combo);
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
      if (edge === 0) { x = -50; y = rand(0, WORLD.h); }
      if (edge === 1) { x = WORLD.w + 50; y = rand(0, WORLD.h); }
      if (edge === 2) { x = rand(0, WORLD.w); y = -50; }
      if (edge === 3) { x = rand(0, WORLD.w); y = WORLD.h + 50; }

      const typeRoll = Math.random();
      const type = typeRoll < 0.65 ? "wraith" : (typeRoll < 0.9 ? "brute" : "dart");

      const speed = 52 + Math.random() * (25 + state.wave * 3.8);
      const baseR = type === "brute" ? rand(22, 30) : (type === "dart" ? rand(14, 18) : rand(16, 24));
      const baseHP = type === "brute" ? 38 : (type === "dart" ? 22 : 28);

      enemies.push({
        kind: "enemy",
        type,
        x, y,
        r: baseR,
        hp: baseHP + state.wave * (type === "brute" ? 9 : 6),
        sp: speed * (type === "dart" ? 1.35 : (type === "brute" ? 0.85 : 1)),
        hit: 0,
        wob: rand(0, 999),
        animT: rand(0, 10),
      });
    }
  }

  function spawnWave(w) {
    waveText.textContent = String(w);
    const count = 4 + Math.floor(w * 1.7);
    spawnEnemy(count);
  }

  function resetGame(full = true) {
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.rank = "-";

    player.x = WORLD.w * 0.5;
    player.y = WORLD.h * 0.58;
    player.vx = player.vy = 0;
    player.hp = player.hpMax;
    player.ink = player.inkMax;
    player.guarding = false;
    player.dashCD = 0;
    player.slashCD = 0;
    player.invuln = 0;
    player.flash = 0;
    player.guardFx = 0;
    player.swingFx = 0;
    player.animT = 0;
    player.act = "idle";

    enemies.length = 0;
    dots.length = 0;
    slashes.length = 0;

    if (full) seedBackground();
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
    const n = Math.floor(18 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (80 + Math.random() * 260) * power;
      dot(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.16, 0.45), rand(1, 4));
    }
  }
  function hitStop(frames = 4) {
    state.hitStop = Math.max(state.hitStop, frames);
  }
  function shake(amount = 12) {
    state.shake = Math.max(state.shake, amount);
  }

  /* =========================
     Attack visuals
  ========================= */
  function pushSlash(px, py, dx, dy, heavy = false) {
    const [nx, ny] = norm(dx, dy);
    const life = heavy ? 0.22 : 0.16;
    const reach = heavy ? 128 : 98;
    const half = heavy ? 0.84 : 0.62;
    slashes.push({
      x: px + nx * 16,
      y: py + ny * 16,
      nx, ny,
      life, t: life,
      heavy,
      reach,
      half,
      r: heavy ? 92 : 72,
      w: heavy ? 34 : 24,
    });
  }

  function inCone(px, py, fx, fy, ex, ey, reach, halfAngle) {
    const dx = ex - px;
    const dy = ey - py;
    const d = Math.hypot(dx, dy);
    if (d > reach) return false;
    const angTo = Math.atan2(dy, dx);
    const angF = Math.atan2(fy, fx);
    let da = angTo - angF;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) <= halfAngle;
  }

  function dealDamage(e, dmg, hx, hy, isHeavy = false) {
    e.hp -= dmg;
    e.hit = 0.16;

    player.flash = Math.max(player.flash, isHeavy ? 0.36 : 0.22);
    player.swingFx = Math.max(player.swingFx, isHeavy ? 0.42 : 0.26);

    burstDots(hx, hy, isHeavy ? 1.35 : 1.0);
    shake(isHeavy ? 16 : 11);
    hitStop(isHeavy ? 5 : 3);

    beep(isHeavy ? 120 : 150, isHeavy ? 0.08 : 0.06, "square", isHeavy ? 0.055 : 0.045);
    haptic(isHeavy ? 34 : 22);

    if (e.hp <= 0) {
      state.kills += 1;
      killText.textContent = String(state.kills);

      state.score += 12 + Math.floor(state.combo * 1.7);
      addCombo();

      burstDots(e.x, e.y, 1.8);
      beep(85, 0.09, "sawtooth", 0.05);

      enemies.splice(enemies.indexOf(e), 1);

      if (enemies.length === 0) {
        state.wave += 1;
        waveText.textContent = String(state.wave);
        state.score += 60 + state.wave * 6;
        spawnWave(state.wave);
      }
    }
  }

  function slashAttack(heavy = false) {
    if (player.slashCD > 0) return;

    const cost = heavy ? 32 : 12;
    if (player.ink < cost) return;

    player.ink -= cost;
    player.slashCD = heavy ? 0.62 : 0.30;

    const fx = player.faceX || 1;
    const fy = player.faceY || 0;

    pushSlash(player.x, player.y, fx, fy, heavy);

    player.flash = Math.max(player.flash, heavy ? 0.30 : 0.16);
    player.swingFx = Math.max(player.swingFx, heavy ? 0.40 : 0.22);

    const reach = heavy ? 128 : 98;
    const half = heavy ? 0.84 : 0.62;
    const dmg = heavy ? 30 : 16;

    // heavy shove forward
    const [nx, ny] = norm(fx, fy);
    player.vx += nx * (heavy ? 140 : 60);
    player.vy += ny * (heavy ? 140 : 60);

    for (const e of [...enemies]) {
      if (!inCone(player.x, player.y, fx, fy, e.x, e.y, reach + e.r, half)) continue;
      const hx = lerp(player.x, e.x, 0.65);
      const hy = lerp(player.y, e.y, 0.65);
      dealDamage(e, dmg, hx, hy, heavy);
    }

    // act/anim
    player.act = "slash";
    player.animT = 0;

    shake(heavy ? 11 : 7);
    hitStop(heavy ? 2 : 1);
    beep(heavy ? 135 : 210, heavy ? 0.09 : 0.06, "triangle", heavy ? 0.05 : 0.035);
    haptic(heavy ? 18 : 10);
  }

  function dash() {
    if (player.dashCD > 0) return;
    if (player.ink < 12) return;

    player.ink -= 12;
    player.dashCD = 0.75;
    player.invuln = 0.22;
    player.flash = Math.max(player.flash, 0.18);

    const [nx, ny] = norm(player.faceX || 1, player.faceY || 0);
    player.vx += nx * 520;
    player.vy += ny * 520;

    burstDots(player.x, player.y, 0.85);
    shake(10);
    hitStop(1);
    beep(260, 0.05, "sine", 0.05);
    haptic(16);

    player.act = "dash";
    player.animT = 0;
  }

  function specialInkBurst() {
    if (player.ink < 56) return;
    player.ink -= 56;

    player.flash = Math.max(player.flash, 0.44);
    player.swingFx = Math.max(player.swingFx, 0.55);

    const radius = 165;
    burstDots(player.x, player.y, 2.2);
    pushSlash(player.x, player.y, player.faceX || 1, player.faceY || 0, true);

    for (const e of [...enemies]) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= radius + e.r) dealDamage(e, 22, e.x, e.y, true);
    }

    shake(18);
    hitStop(6);
    beep(95, 0.13, "sawtooth", 0.06);
    haptic(38);

    player.act = "slash";
    player.animT = 0;
  }

  /* =========================
     Input: Keyboard
  ========================= */
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    input.keys.add(e.key.toLowerCase());

    if (e.key.toLowerCase() === "j") input.slash = true;
    if (e.key.toLowerCase() === "k") input.guard = true;
    if (e.key.toLowerCase() === "l") input.dash = true;
    if (e.key.toLowerCase() === "i") input.special = true;
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    input.keys.delete(e.key.toLowerCase());
    if (e.key.toLowerCase() === "k") input.guard = false;
  }, { passive: true });

  /* =========================
     Touch joystick (single)
  ========================= */
  const joy = {
    active: false,
    id: null,
    cx: 0,
    cy: 0,
    dx: 0,
    dy: 0,
    mag: 0,
    radius: 54,
    dead: 0.14,
  };

  function setKnob(dx, dy, mag) {
    const r = joy.radius;
    knob.style.transform = `translate(${dx * r * mag}px, ${dy * r * mag}px)`;
  }

  function joyStart(e) {
    joy.active = true;
    joy.id = e.pointerId;
    const rect = stick.getBoundingClientRect();
    joy.cx = rect.left + rect.width / 2;
    joy.cy = rect.top + rect.height / 2;
    stick.classList.add("stick--on");
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
    e.preventDefault();
  }

  function joyEnd(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    joy.active = false;
    joy.id = null;
    joy.dx = joy.dy = 0;
    joy.mag = 0;
    setKnob(0, 0, 0);
    stick.classList.remove("stick--on");
  }

  stick.addEventListener("pointerdown", joyStart, { passive: false });
  window.addEventListener("pointermove", joyMove, { passive: false });
  window.addEventListener("pointerup", joyEnd, { passive: true });
  window.addEventListener("pointercancel", joyEnd, { passive: true });

  /* =========================
     Touch buttons
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
    btn.addEventListener("lostpointercapture", () => btn.classList.remove("is-down"), { passive: true });
  }

  // SLASH: short=light, hold>=0.22=heavy
  let slashHoldT = 0;
  bindHold(btnSlash,
    () => { slashHoldT = 0.0001; },
    () => {
      const heavy = slashHoldT >= 0.22;
      slashHoldT = 0;
      slashAttack(heavy);
    }
  );
  bindHold(btnGuard, () => (input.guard = true), () => (input.guard = false));
  bindHold(btnDash, () => { input.dash = true; }, () => {});
  bindHold(btnSpecial, () => { input.special = true; }, () => {});

  /* =========================
     Overlay
  ========================= */
  startBtn.addEventListener("click", () => {
    overlay.classList.add("hide");
    state.running = true;
    state.last = performance.now();
    beep(1, 0.001, "sine", 0.0001);
  });
  resetBtn.addEventListener("click", () => {
    resetGame(true);
    overlay.classList.remove("hide");
    state.running = false;
  });

  /* =========================
     Pixel Sprite System (JS-only)
  ========================= */
  // Characters used:
  //  ' ' empty
  //  '#' solid pixel
  //  '.' soft pixel (lighter via alpha)
  //  '+' highlight pixel (still black, but more opaque)
  function spriteFromStrings(lines) {
    const h = lines.length;
    const w = lines[0].length;
    return { w, h, lines };
  }

  function drawSprite(ctx2, spr, x, y, px, alpha = 1, mirrorX = false, rot = 0) {
    // x,y = center position in screen pixels
    const w = spr.w, h = spr.h;
    const ox = Math.floor(w / 2);
    const oy = Math.floor(h / 2);

    ctx2.save();
    ctx2.translate(snap(x), snap(y));
    if (rot) ctx2.rotate(rot);
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

  // ===== Player sprites (24x32) =====
  // NOTE: 고해상 “픽셀룩”을 위해 px(픽셀 크기)를 화면 비율에 따라 자동 조절
  const P_IDLE_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "       ..++    ++..     ",
    "      ..+++    +++..    ",
    "      ..+ +    + +..    ",
    "        .+      +.      ",
    "        .+      +.      ",
  ]);

  const P_WALK1_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "        .++   +++.      ",
    "        .++  +++..      ",
    "        .++ ++....      ",
    "       ..++++.....      ",
    "      ..+++..           ",
    "      ..+ +.            ",
    "        .+              ",
    "        .+              ",
  ]);

  const P_WALK2_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "      ..+++   ++..      ",
    "      ..+++  ++..       ",
    "      ....++ ++.        ",
    "      .....++++..       ",
    "           ..+++..      ",
    "            .+ +..      ",
    "              +.        ",
    "              +.        ",
  ]);

  // Slash frames (more aggressive sword pixels)
  const P_SLASH1_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.  +  ",
    "       .+##+  +##+.  +  ",
    "       .+##+  +##+.  +  ",
    "       .+##+  +##+.  +  ",
    "        .++    ++.  ++  ",
    "        .++    ++. +++  ",
    "        .++    ++. +++  ",
    "       ..++    ++..+++  ",
    "      ..+++    +++..++  ",
    "      ..+ +    + +..+   ",
    "        .+      +.  +   ",
    "        .+      +.      ",
  ]);

  const P_SLASH2_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.   ++",
    "       .+##+  +##+.  +++",
    "       .+##+  +##+. ++++",
    "       .+##+  +##+. ++++",
    "       .+##+  +##+. ++++",
    "       .+##+  +##+.  +++",
    "        .++    ++.   ++ ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "       ..++    ++..     ",
    "      ..+++    +++..    ",
    "      ..+ +    + +..    ",
    "        .+      +.      ",
    "        .+      +.      ",
  ]);

  const P_SLASH3_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+##+ ++ +##+.    ",
    "      .+###++++###.     ",
    "      .++########+.     ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "       ..++    ++..     ",
    "      ..+++    +++..    ",
    "      ..+ +    + +..    ",
    "        .+      +.      ",
    "        .+      +.      ",
  ]);

  // Guard frame (add chunky front shield pixels)
  const P_GUARD_R = spriteFromStrings([
    "          ++++++        ",
    "        ++######++      ",
    "       +##########+     ",
    "       +###++++### +    ",
    "        ++  ++  ++      ",
    "          ++++++        ",
    "        ..++##++..      ",
    "      ..+++####+++..    ",
    "     ..++########++..   ",
    "     ..+##########+..   ",
    "      .+###++++###++.   ",
    "      .+##+    +##+.  + ",
    "      .+##+ ++ +##+. +++",
    "      .+##+ ++ +##+. +++",
    "      .+###++++###. +++ ",
    "      .++########+.  +  ",
    "       .+########+.     ",
    "       .+########+.     ",
    "       .+##++++##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "       .+##+  +##+.     ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "        .++    ++.      ",
    "       ..++    ++..     ",
    "      ..+++    +++..    ",
    "      ..+ +    + +..    ",
    "        .+      +.      ",
    "        .+      +.      ",
  ]);

  // ===== Enemy sprites (28x28) =====
  const E_WRAITH = spriteFromStrings([
    "            ....            ",
    "          ..++++..          ",
    "        ..++####++..        ",
    "       .++########++..      ",
    "      .+###########+..      ",
    "     .+####++++####+..      ",
    "     .+###++++++### +.      ",
    "    ..+##++....++##+..      ",
    "    ..+##+..++..+##+..      ",
    "    ..+##+..++..+##+..      ",
    "    ..+##++....++##+..      ",
    "     .+###++++++### +.      ",
    "     .+####++++####+..      ",
    "      .+###########+..      ",
    "       .++########++..      ",
    "        ..++####++..        ",
    "          ..++++..          ",
    "            ....            ",
    "         ..  ..  ..         ",
    "       ..+..    ..+..       ",
    "      .++..      ..++.      ",
    "      .+..        ..+.      ",
    "     ..+.          .+..     ",
    "     ..+.          .+..     ",
    "      .+.          .+.      ",
    "      .++.        .++.      ",
    "       ..++..  ..++..       ",
    "         ..........         ",
  ]);

  const E_BRUTE = spriteFromStrings([
    "          ..++++++..        ",
    "        ..++######++..      ",
    "       .++##########++.     ",
    "      .+#############+.     ",
    "     .+####++++++####+.     ",
    "     .+###++....++### +.    ",
    "    ..+##+..++..+##+..+.    ",
    "    ..+##+..++..+##+..+.    ",
    "    ..+##+..++..+##+..+.    ",
    "     .+###++....++### +.    ",
    "     .+####++++++####+.     ",
    "      .+#############+.     ",
    "       .++##########++.     ",
    "        ..++######++..      ",
    "          ..++++++..        ",
    "        ..++..  ..++..      ",
    "      ..++..      ..++..    ",
    "     .++..          ..++.   ",
    "     .+..            ..+.   ",
    "    ..+.              .+..  ",
    "    ..+.              .+..  ",
    "     .+.              .+.   ",
    "     .++.            .++.   ",
    "      ..++..      ..++..    ",
    "        ..++..  ..++..      ",
    "          ..........        ",
    "         ..++....++..       ",
    "        ..++..  ..++..      ",
  ]);

  const E_DART = spriteFromStrings([
    "            ..++..          ",
    "          ..++##++..        ",
    "         .++######++.       ",
    "        .+##########+.      ",
    "        .+###++++### +.     ",
    "       ..+##+....+##+..     ",
    "       ..+##+..+++##+..     ",
    "       ..+##+..+++##+..     ",
    "       ..+##+....+##+..     ",
    "        .+###++++### +.     ",
    "        .+##########+.      ",
    "         .++######++.       ",
    "          ..++##++..        ",
    "            ..++..          ",
    "         ..  ..  ..         ",
    "       ..+..    ..+..       ",
    "      .++..      ..++.      ",
    "      .+..        ..+.      ",
    "      .+.          .+.      ",
    "      .+.          .+.      ",
    "      .+.          .+.      ",
    "      .++.        .++.      ",
    "       ..++..  ..++..       ",
    "         ..........         ",
    "            ..              ",
    "           .++.             ",
    "          .++.              ",
    "          ++.               ",
  ]);

  function pickPlayerSprite() {
    // action priority
    if (player.act === "slash") {
      // 3 frames over 0.24s
      const f = Math.min(2, Math.floor((player.animT / 0.24) * 3));
      return f === 0 ? P_SLASH1_R : (f === 1 ? P_SLASH2_R : P_SLASH3_R);
    }
    if (player.act === "dash") {
      // reuse walk2 for dash feel
      return P_WALK2_R;
    }
    if (player.guarding) return P_GUARD_R;

    // walk/idle
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 40) {
      const f = Math.floor((player.animT * 10) % 2);
      return f === 0 ? P_WALK1_R : P_WALK2_R;
    }
    return P_IDLE_R;
  }

  function pickEnemySprite(type) {
    if (type === "brute") return E_BRUTE;
    if (type === "dart") return E_DART;
    return E_WRAITH;
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

    player.ink = clamp(player.ink + 16 * dt, 0, player.inkMax);

    player.dashCD = Math.max(0, player.dashCD - dt);
    player.slashCD = Math.max(0, player.slashCD - dt);
    player.invuln = Math.max(0, player.invuln - dt);

    player.flash = Math.max(0, player.flash - dt * 4.2);
    player.swingFx = Math.max(0, player.swingFx - dt * 3.4);

    // movement input
    let mx = 0, my = 0;
    const k = input.keys;
    if (k.has("w") || k.has("arrowup")) my -= 1;
    if (k.has("s") || k.has("arrowdown")) my += 1;
    if (k.has("a") || k.has("arrowleft")) mx -= 1;
    if (k.has("d") || k.has("arrowright")) mx += 1;

    const jm = joy.mag > joy.dead ? joy.mag : 0;
    if (jm > 0) {
      mx += joy.dx * jm;
      my += joy.dy * jm;
    }

    const mlen = Math.hypot(mx, my);
    if (mlen > 0.001) {
      const nx = mx / mlen;
      const ny = my / mlen;
      input.mx = nx; input.my = ny;

      player.faceX = lerp(player.faceX, nx, clamp(9 * dt, 0, 1));
      player.faceY = lerp(player.faceY, ny, clamp(9 * dt, 0, 1));

      if (nx < -0.15) player.facing = -1;
      if (nx > 0.15) player.facing = 1;
    } else {
      input.mx = input.my = 0;
    }

    // guard
    player.guarding = !!input.guard;
    if (player.guarding) player.guardFx = Math.min(1, player.guardFx + dt * 5.5);
    else player.guardFx = Math.max(0, player.guardFx - dt * 7.5);

    // actions
    if (input.dash) { dash(); input.dash = false; }
    if (input.special) { specialInkBurst(); input.special = false; }

    if (input.slash) {
      const heavy = input.keys.has("shift");
      slashAttack(heavy);
      input.slash = false;
    }

    // act state auto reset
    if (player.act === "slash" && player.animT > 0.26) player.act = "idle";
    if (player.act === "dash" && player.animT > 0.18) player.act = "idle";

    // physics (heavy)
    const baseSp = player.guarding ? 170 : 225;
    const accel = player.guarding ? 5.5 : 5.0;
    const ax = input.mx * baseSp * accel;
    const ay = input.my * baseSp * accel;

    player.vx = player.vx + ax * dt;
    player.vy = player.vy + ay * dt;

    const fr = player.guarding ? 9.5 : 7.2;
    player.vx = lerp(player.vx, 0, clamp(fr * dt, 0, 1));
    player.vy = lerp(player.vy, 0, clamp(fr * dt, 0, 1));

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = clamp(player.x, 50, WORLD.w - 50);
    player.y = clamp(player.y, 70, WORLD.h - 50);

    // enemy update + collision
    for (const e of enemies) {
      e.animT += dt;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const [nx, ny] = norm(dx, dy);

      const drift = (e.type === "dart") ? 0.12 : 0.08;
      const wob = Math.sin(state.t * 2.2 + e.wob) * drift;

      e.x += (nx * e.sp + -ny * e.sp * wob) * dt;
      e.y += (ny * e.sp + nx * e.sp * wob) * dt;

      e.hit = Math.max(0, e.hit - dt);

      const d = Math.hypot(dx, dy);
      if (d < e.r + player.r) {
        if (player.invuln <= 0) {
          const base = 9 + Math.floor(state.wave * 0.7);
          const dmg = e.type === "brute" ? base + 4 : (e.type === "dart" ? base - 2 : base);

          if (player.guarding) {
            player.hp -= Math.max(1, Math.floor(dmg * 0.22));
            player.ink = clamp(player.ink + 12, 0, player.inkMax);

            player.flash = Math.max(player.flash, 0.14);
            shake(8);
            hitStop(2);
            beep(420, 0.04, "square", 0.045);
            haptic(14);
          } else {
            player.hp -= dmg;
            player.flash = Math.max(player.flash, 0.32);
            shake(16);
            hitStop(4);
            beep(70, 0.09, "sawtooth", 0.055);
            haptic(34);
            breakCombo();
          }

          player.invuln = 0.38;
          burstDots(player.x, player.y, 0.9);

          if (player.hp <= 0) {
            player.hp = 0;
            gameOver();
          }
        }
      }
    }

    // dots
    for (let i = dots.length - 1; i >= 0; i--) {
      const p = dots[i];
      p.t -= dt;
      if (p.t <= 0) { dots.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.90;
      p.vy *= 0.90;
    }

    // slashes
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i];
      s.t -= dt;
      if (s.t <= 0) slashes.splice(i, 1);
    }

    if (state.score > state.hi) {
      state.hi = state.score;
      localStorage.setItem("ink_hi", String(state.hi));
    }

    syncHUD();
  }

  /* =========================
     Draw helpers (cone + pixel stroke)
  ========================= */
  function drawCone(ctx2, sx, sy, fx, fy, reach, halfAngle, alpha) {
    const ang = Math.atan2(fy, fx);
    ctx2.save();
    ctx2.translate(sx, sy);
    ctx2.rotate(ang);

    ctx2.globalAlpha = alpha;
    ctx2.fillStyle = "#000";
    ctx2.beginPath();
    ctx2.moveTo(0, 0);
    ctx2.arc(0, 0, reach, -halfAngle, halfAngle);
    ctx2.closePath();
    ctx2.fill();

    ctx2.globalAlpha = Math.min(1, alpha + 0.18);
    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(0, 0, reach, -halfAngle, halfAngle);
    ctx2.stroke();

    ctx2.globalAlpha = alpha * 0.55;
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.arc(0, 0, reach * 0.72, 0, Math.PI * 2);
    ctx2.stroke();

    ctx2.restore();
    ctx2.globalAlpha = 1;
  }

  function drawPixelStroke(ctx2, x, y, nx, ny, heavy, t, px) {
    // “획”을 픽셀 블록으로 찍어서 더 도트 느낌
    // 중심에서 방향으로 여러 점 찍기
    const len = heavy ? 120 : 90;
    const w = heavy ? 7 : 5;

    ctx2.save();
    ctx2.globalAlpha = (heavy ? 0.36 : 0.28) * t;
    ctx2.fillStyle = "#000";

    // main line
    for (let i = 0; i < len; i += 6) {
      const k = i / len;
      const ox = x + nx * i;
      const oy = y + ny * i;
      const jitter = (Math.sin((k * 9 + state.t * 12)) * (heavy ? 2.2 : 1.6));
      const pxX = snap(ox + -ny * jitter);
      const pxY = snap(oy + nx * jitter);
      ctx2.fillRect(pxX - w, pxY - 1, w * 2, 2);
    }

    // side scratches
    ctx2.globalAlpha = (heavy ? 0.26 : 0.20) * t;
    for (let s = 0; s < (heavy ? 10 : 7); s++) {
      const i = rand(len * 0.2, len * 0.95);
      const ox = x + nx * i;
      const oy = y + ny * i;
      const side = (s % 2 ? 1 : -1) * rand(8, 18);
      const sx = snap(ox + -ny * side);
      const sy = snap(oy + nx * side);
      ctx2.fillRect(sx, sy, rand(8, 18), 1);
    }

    ctx2.restore();
    ctx2.globalAlpha = 1;
  }

  /* =========================
     Draw
  ========================= */
  function worldToScreen(x, y, camX, camY) {
    return [x - camX, y - camY];
  }

  function drawBackground(vw, vh, camX, camY, sx, sy) {
    ctx.fillStyle = "#efe6cf";
    ctx.fillRect(0, 0, vw, vh);

    // skyline
    ctx.save();
    ctx.translate(-camX * 0.35 + sx * 0.2, -camY * 0.18 + sy * 0.2);
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.72;

    for (const b of skyline) {
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.globalAlpha = 0.10;
      for (let i = 0; i < b.dents; i++) {
        const wx = b.x + rand(6, b.w - 10);
        const wy = b.y + rand(10, b.h - 16);
        ctx.fillRect(wx, wy, 2, rand(6, 14));
      }
      ctx.globalAlpha = 0.72;
    }

    // wires
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    for (const w of wires) {
      ctx.beginPath();
      for (let x = -40; x <= WORLD.w + 40; x += 24) {
        const y = w.y0 + Math.sin((x * 0.012) * w.a + state.t * 0.35 + w.ph) * 10;
        if (x === -40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();

    // floor strokes
    ctx.save();
    ctx.translate(sx * 0.25, sy * 0.25);
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 10; i++) {
      const x = ((i * 197 + state.t * 38) % WORLD.w);
      const y = ((i * 131 + state.t * 24) % WORLD.h);
      const [px, py] = worldToScreen(x, y, camX, camY);
      ctx.fillRect(px, py, 260, 2);
      ctx.fillRect(px + 34, py + 16, 190, 2);
      if (i % 2 === 0) ctx.fillRect(px + 18, py + 34, 140, 2);
    }
    ctx.restore();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    ctx.imageSmoothingEnabled = false;

    const targetCamX = clamp(player.x - vw / 2, 0, WORLD.w - vw);
    const targetCamY = clamp(player.y - vh / 2, 0, WORLD.h - vh);
    state.camX = lerp(state.camX, targetCamX, clamp(6 * state.dt, 0, 1));
    state.camY = lerp(state.camY, targetCamY, clamp(6 * state.dt, 0, 1));

    let sx = 0, sy = 0;
    if (state.shake > 0) {
      const m = state.shake;
      sx = (Math.random() * 2 - 1) * m;
      sy = (Math.random() * 2 - 1) * m;
      state.shake = Math.max(0, state.shake - 26 * state.dt);
    }

    const camX = state.camX;
    const camY = state.camY;

    drawBackground(vw, vh, camX, camY, sx, sy);

    // pixel size by viewport (high-res pixel look)
    // - mobile: px ~ 2~3, desktop: px ~ 3~4
    const px = clamp(Math.round(Math.min(vw, vh) / 220), 2, 4);

    ctx.save();
    ctx.translate(sx, sy);

    // enemies sprites
    for (const e of enemies) {
      const [x, y] = worldToScreen(e.x, e.y, camX, camY);
      const spr = pickEnemySprite(e.type);

      // small wob + hit flash
      const wob = Math.sin(e.animT * 8) * 2;
      const a = e.hit > 0 ? 1 : 0.9;
      drawSprite(ctx, spr, x, y + wob, px, a, false, 0);
    }

    // cone telegraph + pixel stroke
    if (slashes.length > 0) {
      const s0 = slashes[slashes.length - 1];
      const [px2, py2] = worldToScreen(player.x, player.y, camX, camY);
      const a = clamp(s0.t / s0.life, 0, 1);
      drawCone(ctx, px2, py2, s0.nx, s0.ny, s0.reach, s0.half, (s0.heavy ? 0.22 : 0.16) * a);

      // heavy brush “획” pixel stroke overlay
      drawPixelStroke(ctx, px2 + s0.nx * 18, py2 + s0.ny * 18, s0.nx, s0.ny, s0.heavy, a, px);
    }

    // player sprite
    {
      const [x, y] = worldToScreen(player.x, player.y, camX, camY);

      // flash aura (black-only)
      if (player.flash > 0.01) {
        ctx.save();
        ctx.globalAlpha = 0.12 * player.flash;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x, y, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // guard aura
      if (player.guardFx > 0.01) {
        ctx.save();
        ctx.globalAlpha = 0.10 * player.guardFx;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x, y, 52, -1.0, 1.0);
        ctx.fill();
        ctx.restore();
      }

      const spr = pickPlayerSprite();
      const alpha = player.invuln > 0 ? 0.75 : 1;
      drawSprite(ctx, spr, x, y, px, alpha, player.facing < 0, 0);
    }

    // dots particles
    for (const p of dots) {
      const [x, y] = worldToScreen(p.x, p.y, camX, camY);
      const a = clamp(p.t / p.life, 0, 1);
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = "#000";
      ctx.fillRect(snap(x), snap(y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // vignette bars
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
     HUD / Overlay text
  ========================= */
  document.getElementById("ovTitle").textContent = "INK SWORD";
  document.getElementById("ovBody").innerHTML =
    `<b>이동</b> WASD/방향키 · <b>베기</b> J (Shift+J = 헤비) · <b>가드</b> K(누름) · <b>대시</b> L · <b>잉크 폭발</b> I<br/>
     모바일: SLASH 짧게=라이트 / 길게(눌러서)=헤비 · 왼쪽 조이스틱 이동`;

  /* =========================
     Boot
  ========================= */
  resetGame(true);
  requestAnimationFrame(loop);

  // initial overlay state: stop until START
  state.running = false;

  // keep overlay visible on load
})();
