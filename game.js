/* game.js — LINEAR SANNABI STYLE : Seoul Ink March */
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });

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
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* =========================
     Helpers
  ========================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* =========================
     World / Chapters
  ========================= */
  const WORLD = {
    length: 24000,
    height: 850,
  };

  const CHAPTERS = [
    { name: "강서", start: 0, end: 5000, boss: "fog" },
    { name: "강북", start: 5000, end: 10000, boss: "mountain" },
    { name: "강동", start: 10000, end: 15000, boss: "river" },
    { name: "강남", start: 15000, end: 20000, boss: "steel" },
    { name: "중앙정부", start: 20000, end: 24000, boss: "governor" },
  ];

  const state = {
    running: false,
    t: 0,
    last: 0,
    dt: 0,

    scrollX: 0,      // 카메라 스크롤
    stageX: 0,       // 실제 진행 거리
    chapterIndex: 0,

    shake: 0,
    hitStop: 0,

    enemies: [],
    bosses: [],
  };

  /* =========================
     Player (선형 고정 위치)
  ========================= */
  const player = {
    worldX: 0,
    y: WORLD.height * 0.62,

    vx: 0,
    vy: 0,

    r: 18,

    faceX: 1,
    faceY: 0,

    hp: 100,
    hpMax: 100,
    ink: 100,
    inkMax: 100,

    guarding: false,
    dashCD: 0,
    slashCD: 0,
    invuln: 0,

    flash: 0,
    swingFx: 0,
    guardFx: 0,
  };

  const AUTO_FORWARD = 160; // 기본 전진 속도

  /* =========================
     Input (기존 UI 그대로)
  ========================= */
  const input = {
    mx: 0, my: 0,
    slash: false,
    guard: false,
    dash: false,
    special: false,
  };

  const stick = document.getElementById("stick");
  const knob = document.getElementById("knob");
  const btnSlash = document.getElementById("btnSlash");
  const btnGuard = document.getElementById("btnGuard");
  const btnDash = document.getElementById("btnDash");
  const btnSpecial = document.getElementById("btnSpecial");

  // 간단 조이스틱 (좌우 무시, 위아래만)
  let joyActive = false;
  let joyDY = 0;

  stick.addEventListener("pointerdown", e => {
    joyActive = true;
  });
  window.addEventListener("pointermove", e => {
    if (!joyActive) return;
    joyDY = clamp((e.movementY) / 40, -1, 1);
  });
  window.addEventListener("pointerup", () => {
    joyActive = false;
    joyDY = 0;
  });

  btnSlash.onclick = () => input.slash = true;
  btnGuard.onpointerdown = () => input.guard = true;
  btnGuard.onpointerup = () => input.guard = false;
  btnDash.onclick = () => input.dash = true;
  btnSpecial.onclick = () => input.special = true;

  /* =========================
     Enemy / Boss
  ========================= */
  function spawnEnemy() {
    const y = rand(WORLD.height * 0.45, WORLD.height * 0.75);
    state.enemies.push({
      kind: "enemy",
      worldX: state.stageX + canvas.width + rand(200, 600),
      y,
      r: rand(14, 22),
      hp: 30,
      speed: rand(80, 140),
    });
  }

  function spawnBoss(type) {
    const y = WORLD.height * 0.6;
    state.bosses.push({
      kind: "boss",
      type,
      worldX: state.stageX + canvas.width + 400,
      y,
      r: 60,
      hp: 600,
    });
  }

  /* =========================
     Combat
  ========================= */
  function slashAttack() {
    if (player.slashCD > 0) return;
    if (player.ink < 10) return;

    player.slashCD = 0.3;
    player.ink -= 10;
    player.swingFx = 0.4;
    player.flash = 0.2;

    const reach = 120;

    for (const e of state.enemies) {
      const dx = e.worldX - player.worldX;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy);
      if (dx > 0 && d < reach + e.r) {
        e.hp -= 20;
      }
    }

    for (const b of state.bosses) {
      const dx = b.worldX - player.worldX;
      const dy = b.y - player.y;
      const d = Math.hypot(dx, dy);
      if (dx > 0 && d < reach + b.r) {
        b.hp -= 18;
      }
    }
  }

  function dash() {
    if (player.dashCD > 0) return;
    player.dashCD = 0.7;
    player.worldX += 180;
  }

  /* =========================
     Update
  ========================= */
  function update(dt) {
    // hit stop
    if (state.hitStop > 0) {
      state.hitStop--;
      return;
    }

    state.t += dt;

    // cooldowns
    player.dashCD = Math.max(0, player.dashCD - dt);
    player.slashCD = Math.max(0, player.slashCD - dt);

    // 자동 전진
    player.worldX += AUTO_FORWARD * dt;
    state.stageX = player.worldX;

    // 위아래 이동만 허용
    player.y += joyDY * 240 * dt;
    player.y = clamp(player.y, WORLD.height * 0.45, WORLD.height * 0.75);

    // 카메라 스크롤
    const targetScroll = player.worldX - canvas.width * 0.28;
    state.scrollX = lerp(state.scrollX, targetScroll, 4 * dt);

    // 챕터 전환
    const chap = CHAPTERS[state.chapterIndex];
    if (state.stageX > chap.end && !chap.bossSpawned) {
      spawnBoss(chap.boss);
      chap.bossSpawned = true;
    }

    // 적 스폰
    if (state.enemies.length < 6 && Math.random() < 0.02) {
      spawnEnemy();
    }

    // 적 이동
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.worldX -= e.speed * dt;

      if (e.hp <= 0 || e.worldX < state.scrollX - 200) {
        state.enemies.splice(i, 1);
      }
    }

    // 보스 이동
    for (let i = state.bosses.length - 1; i >= 0; i--) {
      const b = state.bosses[i];
      b.worldX -= 40 * dt;

      if (b.hp <= 0) {
        state.bosses.splice(i, 1);
        state.chapterIndex++;
      }
    }

    // 액션
    if (input.slash) {
      slashAttack();
      input.slash = false;
    }
    if (input.dash) {
      dash();
      input.dash = false;
    }

    // 잉크 회복
    player.ink = clamp(player.ink + 20 * dt, 0, player.inkMax);
  }

  /* =========================
     Draw
  ========================= */
  function worldToScreenX(wx) {
    return wx - state.scrollX;
  }

  function drawBackground() {
    ctx.fillStyle = "#efe6cf";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 바닥선
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, WORLD.height * 0.75);
    ctx.lineTo(canvas.width, WORLD.height * 0.75);
    ctx.stroke();

    // 랜드마크 실루엣
    const parallax = state.scrollX * 0.3;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 20; i++) {
      const x = (i * 600 - parallax) % (canvas.width + 600);
      ctx.fillRect(x, WORLD.height * 0.3, 60, 260);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const sx = canvas.width * 0.28;
    const sy = player.y;

    ctx.save();
    ctx.translate(sx, sy);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;

    // 도포
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(0, -70);
    ctx.lineTo(16, 0);
    ctx.stroke();

    // 삿갓
    ctx.beginPath();
    ctx.moveTo(-26, -70);
    ctx.quadraticCurveTo(0, -90, 26, -70);
    ctx.stroke();

    // 검
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(48, -20);
    ctx.stroke();

    // 참격 이펙트
    if (player.swingFx > 0.01) {
      ctx.globalAlpha = player.swingFx;
      ctx.beginPath();
      ctx.arc(0, -20, 90, -0.5, 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawEnemy(e) {
    const x = worldToScreenX(e.worldX);
    const y = e.y;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x, y - 50);
    ctx.lineTo(x + 14, y);
    ctx.stroke();
  }

  function drawBoss(b) {
    const x = worldToScreenX(b.worldX);
    const y = b.y;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y - 40, 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  function draw() {
    drawBackground();

    // 적
    for (const e of state.enemies) drawEnemy(e);

    // 보스
    for (const b of state.bosses) drawBoss(b);

    // 플레이어
    drawPlayer();
  }

  /* =========================
     Loop
  ========================= */
  function loop(ts) {
    const t = ts / 1000;
    let dt = Math.min(0.033, t - (state.last || t));
    state.last = t;

    if (state.running) update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  /* =========================
     Overlay
  ========================= */
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");

  startBtn.onclick = () => {
    overlay.classList.add("hide");
    state.running = true;
    state.last = performance.now() / 1000;
  };

  /* =========================
     Boot
  ========================= */
  requestAnimationFrame(loop);

})();