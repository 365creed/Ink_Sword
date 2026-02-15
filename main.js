/* =====================================
   CANVAS SETUP
===================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* =====================================
   GLOBAL STATE
===================================== */

let chapter = 0; 
// 0=근대 프롤로그
// 1=고려
// 2=조선
// 3=근대 최종

let stageLength = 3000; // 선형 맵 길이
let cameraX = 0;
let gameRunning = false;

/* =====================================
   PLAYER
===================================== */

const player = {
  x: 100,
  y: canvas.height / 2,
  w: 40,
  h: 60,
  speed: 4,
  vx: 0,
  hp: 100,
  attacking: false,
  guarding: false
};

/* =====================================
   ENEMIES
===================================== */

let enemies = [];
let boss = null;

function spawnEnemy(x) {
  enemies.push({
    x: x,
    y: canvas.height / 2,
    w: 40,
    h: 60,
    hp: 30,
    speed: 1.2
  });
}

function spawnBoss() {
  boss = {
    x: stageLength - 200,
    y: canvas.height / 2,
    w: 80,
    h: 100,
    hp: 200,
    speed: 0.8
  };
}

/* =====================================
   STORY SYSTEM
===================================== */

const storyLayer = document.getElementById("storyLayer");
const storyText = document.getElementById("storyText");
const storyNext = document.getElementById("storyNext");

let storyQueue = [];
let storyIndex = 0;

function startStory(lines) {
  storyQueue = lines;
  storyIndex = 0;
  storyLayer.classList.remove("hidden");
  showNextLine();
  gameRunning = false;
}

function showNextLine() {
  if (storyIndex >= storyQueue.length) {
    storyLayer.classList.add("hidden");
    gameRunning = true;
    return;
  }
  storyText.innerText = storyQueue[storyIndex++];
}

storyNext.addEventListener("click", showNextLine);

/* =====================================
   JOYSTICK (X축만 사용)
===================================== */

const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");

let joyActive = false;
let joyStartX = 0;

joystick.addEventListener("pointerdown", e => {
  joyActive = true;
  joyStartX = e.clientX;
});

window.addEventListener("pointermove", e => {
  if (!joyActive) return;

  let dx = e.clientX - joyStartX;
  const max = 40;

  if (dx > max) dx = max;
  if (dx < -max) dx = -max;

  stick.style.transform = `translateX(${dx}px)`;
  player.vx = dx / max;
});

window.addEventListener("pointerup", () => {
  joyActive = false;
  stick.style.transform = `translateX(0px)`;
  player.vx = 0;
});

/* =====================================
   BUTTONS
===================================== */

document.getElementById("attackBtn").addEventListener("pointerdown", () => {
  player.attacking = true;
  setTimeout(() => player.attacking = false, 200);
});

document.getElementById("guardBtn").addEventListener("pointerdown", () => {
  player.guarding = true;
});

document.getElementById("guardBtn").addEventListener("pointerup", () => {
  player.guarding = false;
});

/* =====================================
   COLLISION
===================================== */

function rectCollision(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* =====================================
   UPDATE
===================================== */

function update() {
  if (!gameRunning) return;

  // 이동
  player.x += player.vx * player.speed;

  // 카메라 이동
  cameraX = player.x - 200;
  if (cameraX < 0) cameraX = 0;

  // 적 AI
  enemies.forEach(e => {
    if (e.hp <= 0) return;

    if (e.x > player.x) e.x -= e.speed;
    else e.x += e.speed;

    if (rectCollision(player, e)) {
      if (player.attacking) {
        e.hp -= 20;
      } else if (!player.guarding) {
        player.hp -= 0.3;
      }
    }
  });

  // 보스 AI
  if (boss && boss.hp > 0) {
    if (boss.x > player.x) boss.x -= boss.speed;
    else boss.x += boss.speed;

    if (rectCollision(player, boss)) {
      if (player.attacking) {
        boss.hp -= 10;
      } else if (!player.guarding) {
        player.hp -= 0.6;
      }
    }
  }

  // 적 제거
  enemies = enemies.filter(e => e.hp > 0);

  // HUD 업데이트
  document.getElementById("hpFill").style.width = player.hp + "%";

  // 스테이지 끝
  if (player.x > stageLength - 300 && !boss) {
    spawnBoss();
  }

  // 챕터 종료
  if (boss && boss.hp <= 0) {
    nextChapter();
  }
}

/* =====================================
   DRAW
===================================== */

function drawRect(obj, color = "#111") {
  ctx.fillStyle = color;
  ctx.fillRect(obj.x - cameraX, obj.y - obj.h / 2, obj.w, obj.h);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 바닥선
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2 + 30);
  ctx.lineTo(canvas.width, canvas.height / 2 + 30);
  ctx.stroke();

  // 플레이어
  drawRect(player, "#111");

  // 적
  enemies.forEach(e => drawRect(e, "#444"));

  // 보스
  if (boss && boss.hp > 0) drawRect(boss, "#000");
}

/* =====================================
   LOOP
===================================== */

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

/* =====================================
   CHAPTER SYSTEM
===================================== */

function nextChapter() {
  chapter++;
  player.x = 100;
  enemies = [];
  boss = null;
  stageLength += 1500;

  if (chapter === 1) {
    startStory([
      "고려, 말발굽이 땅을 울리던 시절.",
      "가문은 그날 처음 무너졌다."
    ]);
  }

  if (chapter === 2) {
    startStory([
      "조선, 전쟁은 반복되었다.",
      "지키지 못한 것은 늘 남는다."
    ]);
  }

  if (chapter === 3) {
    startStory([
      "다시 현재.",
      "이번에는 끝낸다."
    ]);
  }
}

/* =====================================
   INITIAL START
===================================== */

startStory([
  "1910년, 비가 내렸다.",
  "집은 사라졌다.",
  "남은 것은 오래된 검 하나."
]);

// 초반 적 배치
for (let i = 600; i < 2000; i += 400) {
  spawnEnemy(i);
}
