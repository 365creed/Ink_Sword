// main.js
let canvas, ctx;
let player, stageManager, skyline;
let inputState = { left: false, right: false, up: false, down: false };

// 낙관 3회 클릭 감지용 변수
let sealClicks = 0;
let sealTimer = null;

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  GameState.init();
  stageManager = new StageManager();
  skyline = new Skyline();
  player = new Player(120, 280);

  setupInputListeners();
  setupUIEventListeners();

  requestAnimationFrame(gameLoop);
});

// 키보드 입력 매핑
function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    // 1. 챕터/인트로 화면 스킵
    if (GameState.state === 'STAGE_INTRO') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        stageManager.skipIntro();
        return;
      }
    }
    if (GameState.state === 'CHAPTER_TRANSITION') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        ChapterSystem.skip();
        return;
      }
    }

    // 2. 인게임 조작
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputState.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputState.right = true;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') inputState.up = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') inputState.down = true;

    if (e.code === 'Space') player.jump();
    if (e.key === 'j' || e.key === 'J') player.triggerAttack(false, inputState);
    if (e.key === 'k' || e.key === 'K') player.triggerAttack(true, inputState);
    if (e.key === 'l' || e.key === 'L') player.startDash();
    if (e.key === 'i' || e.key === 'I') player.startParry();

    if (e.code === 'Escape') togglePause();
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') inputState.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputState.right = false;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') inputState.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') inputState.down = false;
  });
}

// UI 이벤트 및 비밀 낙관 도장 바인딩
function setupUIEventListeners() {
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (GameState.state === 'TITLE') {
      handleTitleClick(mouseX, mouseY);
    } else if (GameState.state === 'STAGE_INTRO') {
      stageManager.skipIntro();
    } else if (GameState.state === 'CHAPTER_TRANSITION') {
      ChapterSystem.skip();
    }
  });

  // 조작법 모달 내 '숨김 낙관 도장' 3회 연속 클릭 시 데이터 초기화
  const devSeal = document.getElementById('secret-dev-seal');
  if (devSeal) {
    devSeal.addEventListener('click', () => {
      sealClicks++;
      clearTimeout(sealTimer);

      if (sealClicks >= 3) {
        sealClicks = 0;
        if (confirm('【개발자 초기화】 모든 클리어 기록과 캐시를 삭제하고 재시작하시겠습니까?')) {
          StorageManager.clearDevData();
          alert('모든 먹의 기록이 지워졌습니다.');
          window.location.reload();
        }
      } else {
        sealTimer = setTimeout(() => { sealClicks = 0; }, 800);
      }
    });
  }

  // 모달 버튼 핸들러
  document.getElementById('pause-btn').addEventListener('click', togglePause);
  document.getElementById('resume-btn').addEventListener('click', togglePause);
  document.getElementById('restart-btn').addEventListener('click', () => {
    togglePause();
    stageManager.initStage(GameState.currentChapter, GameState.currentStage);
  });
  document.getElementById('pause-controls-btn').addEventListener('click', () => {
    document.getElementById('controls-modal').classList.remove('hidden');
  });
  document.getElementById('close-controls-btn').addEventListener('click', () => {
    document.getElementById('controls-modal').classList.add('hidden');
  });
  document.getElementById('to-title-btn').addEventListener('click', () => {
    togglePause();
    GameState.state = 'TITLE';
    document.getElementById('hud-overlay').classList.add('hidden');
  });
}

function togglePause() {
  if (GameState.state === 'PLAYING') {
    GameState.state = 'PAUSED';
    document.getElementById('pause-modal').classList.remove('hidden');
  } else if (GameState.state === 'PAUSED') {
    GameState.state = 'PLAYING';
    document.getElementById('pause-modal').classList.add('hidden');
  }
}

// 타이틀 화면 클릭 처리
function handleTitleClick(x, y) {
  const cx = canvas.width / 2;

  // 1. [ 여정 시작 ] (Y: 220 ~ 250)
  if (x >= cx - 90 && x <= cx + 90 && y >= 220 && y <= 250) {
    startGame('STORY');
    return;
  }

  // 2. [ 스피드레이서 ] (Y: 265 ~ 295) - 1회 클리어 시 해금
  if (GameState.speedRunnerUnlocked) {
    if (x >= cx - 90 && x <= cx + 90 && y >= 265 && y <= 295) {
      startGame('SPEEDRUN');
      return;
    }
  }

  // 3. [ 조 작 법 ] (Y: 310 ~ 340)
  if (x >= cx - 90 && x <= cx + 90 && y >= 310 && y <= 340) {
    document.getElementById('controls-modal').classList.remove('hidden');
    return;
  }
}

function startGame(mode) {
  GameState.resetRun(mode);
  document.getElementById('hud-overlay').classList.remove('hidden');

  if (mode === 'SPEEDRUN') {
    document.getElementById('speedrun-timer').classList.remove('hidden');
  } else {
    document.getElementById('speedrun-timer').classList.add('hidden');
  }

  stageManager.initStage(1, 1);
}

// 메인 루프
let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (GameState.state === 'PLAYING' || GameState.state === 'STAGE_INTRO') {
    skyline.update(dt);
    stageManager.update(dt, player);
    player.update(dt, inputState);

    // 적 업데이트 및 피격 검사
    for (const enemy of stageManager.enemies) {
      enemy.update(dt, player, stageManager);

      if (player.attackBox && !enemy.isDead) {
        if (checkOverlap(player.attackBox, enemy)) {
          enemy.takeDamage(
            player.attackBox.damage,
            player.attackBox.type,
            player.facing,
            player.attackBox.type === 'plunge'
          );
        }
      }
    }

    // 카메라 추적 (아레나 고정 시 제한)
    if (GameState.isCameraLocked) {
      GameState.cameraX = GameState.cameraLockX;
    } else {
      GameState.cameraX = Math.max(0, player.x - 220);
    }

    updateHUD();
  } else if (GameState.state === 'CHAPTER_TRANSITION') {
    ChapterSystem.update(dt);
  }
}

function checkOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function updateHUD() {
  document.getElementById('hp-bar').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('ink-bar').style.width = `${(player.ink / player.maxInk) * 100}%`;

  if (GameState.gameMode === 'SPEEDRUN') {
    const mins = Math.floor(GameState.speedRunTime / 60).toString().padStart(2, '0');
    const secs = (GameState.speedRunTime % 60).toFixed(2).padStart(5, '0');
    document.getElementById('speedrun-time-text').innerText = `${mins}:${secs}`;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (GameState.state === 'TITLE') {
    renderTitle();
    return;
  }

  // 인게임 렌더링
  ctx.save();
  ctx.translate(-GameState.cameraX, 0);

  skyline.render(ctx, GameState.cameraX, GameState.currentChapter);
  stageManager.render(ctx);

  for (const enemy of stageManager.enemies) {
    enemy.render(ctx);
  }
  player.render(ctx);

  ctx.restore();

  if (GameState.state === 'CHAPTER_TRANSITION') {
    ChapterSystem.render(ctx);
  }
}

// 확장된 타이틀 화면 렌더링
function renderTitle() {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);

  // 타이틀 한자 및 문구
  ctx.fillStyle = '#141416';
  ctx.font = 'bold 52px "Batang", serif';
  ctx.textAlign = 'center';
  ctx.fillText('墨  劍', cx, 110);

  ctx.font = '14px "Batang", serif';
  ctx.fillStyle = '#555';
  ctx.fillText('색을 잃은 한양, 붓끝으로 베어내다', cx, 145);

  // 1. [ 여 정 시 작 ]
  drawButton(cx, 235, 180, 32, '여 정 시 작', '#1a1a1a', '#fff');

  // 2. [ 스피드레이서 ]
  if (GameState.speedRunnerUnlocked) {
    drawButton(cx, 280, 180, 32, '스피드레이서', '#8b1e1e', '#fff');
  } else {
    drawButton(cx, 280, 180, 32, '스피드레이서 (1회 클리어 후 해금)', '#999', '#eee');
  }

  // 3. [ 조 작 법 ]
  drawButton(cx, 325, 180, 32, '조  작  법', '#333', '#fff');
}

function drawButton(x, y, w, h, text, bgColor, textColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = textColor;
  ctx.font = '13px "Batang", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}
