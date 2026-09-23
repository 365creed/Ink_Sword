import { GameState } from './state.js';
import { StorageManager } from './storage.js';
import { SoundEngine } from './sound.js';
import { SkylineEffect } from '../effects/skyline.js';
import { BrushEffect } from '../effects/brush.js';
import { InkEffect } from '../effects/ink.js';
import { Player } from '../entities/player.js';
import { StageSystem } from '../systems/stage.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.lastTime = 0;
    this.isRunning = false;

    this.hitStopTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.whiteFlashTimer = 0;

    this.sound = new SoundEngine();
    this.skyline = new SkylineEffect(this.ctx, this.width, this.height);
    this.brush = new BrushEffect(this.ctx);
    this.ink = new InkEffect(this.ctx);
    this.player = new Player(this.ctx, 220, 524, this.sound);
    this.enemies = [];
    this.boss = null;
    this.stageSystem = new StageSystem(this);

    this.input = { left: false, right: false };
    this.setupEvents();
  }

  triggerHitStop(d) { this.hitStopTimer = d; }
  triggerShake(i, d) { this.shakeIntensity = i; this.shakeTimer = d; }
  triggerWhiteFlash(d) { this.whiteFlashTimer = d; }

  setupEvents() {
    const unlock = () => this.sound.init();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    window.addEventListener('keydown', (e) => {
      // 건너뛰기(ESC)
      if (e.key === 'Escape') this.skipToGame();

      // 대화/스토리 통합 넘김 (Enter, Space)
      if (e.key === 'Enter' || e.key === ' ') {
        if (GameState.mode === 'TITLE') this.handleTitleClick();
        else if (GameState.mode === 'PROLOGUE') GameState.mode = 'TUTORIAL';
        else if (GameState.mode === 'STAGE_RESULT') this.stageSystem.nextStage();
        else if (GameState.mode === 'GAME_OVER') this.stageSystem.startStage(GameState.chapter, GameState.stage);
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.player.jump();

      if (e.key === 'j' || e.key === 'J') this.handleAction('atk');
      if (e.key === 'k' || e.key === 'K') this.handleAction('heavy');
      if (e.key === 'l' || e.key === 'L' || e.key === 'Shift') this.handleAction('dash');
      if (e.key === 'i' || e.key === 'I' || e.key === 'q' || e.key === 'Q') this.handleAction('parry');
      if (e.key === 'u' || e.key === 'U' || e.key === 'e' || e.key === 'E') this.handleAction('sp');
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

    // 화면 클릭/터치
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.height / rect.height);

      if (GameState.mode === 'TITLE') this.handleTitleClick();
      else if (GameState.mode === 'PROLOGUE') GameState.mode = 'TUTORIAL';
      else if (GameState.mode === 'STAGE_RESULT') {
        if (clickX > 510 && clickX < 770 && clickY > 520 && clickY < 575) {
          this.stageSystem.nextStage();
        }
      } else if (GameState.mode === 'GAME_OVER') {
        this.stageSystem.startStage(GameState.chapter, GameState.stage);
      }
    });

    document.getElementById('skip-btn').addEventListener('click', () => this.skipToGame());

    // 모바일 터치 패드 바인딩
    const bindTouch = (id, down, up) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); if (up) up(); });
    };

    bindTouch('m-left', () => { this.input.left = true; }, () => { this.input.left = false; });
    bindTouch('m-right', () => { this.input.right = true; }, () => { this.input.right = false; });
    bindTouch('m-jump', () => this.player.jump());
    bindTouch('m-atk', () => this.handleAction('atk'));
    bindTouch('m-heavy', () => this.handleAction('heavy'));
    bindTouch('m-dash', () => this.handleAction('dash'));
    bindTouch('m-parry', () => this.handleAction('parry'));
    bindTouch('m-sp', () => this.handleAction('sp'));
  }

  handleTitleClick() {
    if (!GameState.tutorialCompleted) GameState.mode = 'PROLOGUE';
    else this.stageSystem.startStage(GameState.chapter, GameState.stage);
  }

  skipToGame() {
    GameState.tutorialCompleted = true;
    StorageManager.save();
    this.stageSystem.startStage(GameState.chapter, GameState.stage);
  }

  handleAction(action) {
    if (GameState.mode === 'TUTORIAL') {
      if (GameState.tutorialStep === 0 && action === 'atk') {
        this.player.attack(this.brush, this.ink, this.enemies, this.boss);
        GameState.tutorialStep = 1;
      } else if (GameState.tutorialStep === 1 && action === 'heavy') {
        GameState.ink = 100;
        this.player.heavyAttack(this.brush, this.ink, this.enemies, this.boss);
        GameState.tutorialStep = 2;
      } else if (GameState.tutorialStep === 2 && action === 'dash') {
        GameState.ink = 100;
        this.player.dash();
        GameState.tutorialStep = 3;
      } else if (GameState.tutorialStep === 3 && action === 'parry') {
        this.player.parry();
        this.sound.playParry();
        this.triggerWhiteFlash(0.08);
        this.ink.parryBurst(this.player.x + 30, this.player.y + 40);
        GameState.tutorialStep = 4;
      } else if (GameState.tutorialStep === 4 && action === 'sp') {
        GameState.ink = 100;
        this.triggerSpecial();
        GameState.tutorialCompleted = true;
        StorageManager.save();
        setTimeout(() => this.stageSystem.startStage(1, 1), 1000);
      }
      return;
    }

    if (GameState.mode === 'PLAYING') {
      if (action === 'atk') this.player.attack(this.brush, this.ink, this.enemies, this.boss);
      if (action === 'heavy') this.player.heavyAttack(this.brush, this.ink, this.enemies, this.boss);
      if (action === 'dash') this.player.dash();
      if (action === 'parry') this.player.parry();
      if (action === 'sp') this.triggerSpecial();
    }
  }

  triggerSpecial() {
    if (GameState.ink >= 100) {
      GameState.ink = 0;
      this.sound.playParry();
      this.sound.playHeavySlash();
      this.triggerHitStop(0.2);
      this.triggerShake(16, 0.4);
      this.triggerWhiteFlash(0.12);
      this.brush.addSlash(this.player.x + 200, 360, 1, 'special');
      this.enemies.forEach(e => e.takeDamage(150, this.ink));
      if (this.boss) this.boss.takeDamage(120, this.ink);
      this.ink.splash(this.player.x + 200, 360, 45);
    }
  }

  init() {
    StorageManager.load();
    GameState.mode = 'TITLE';
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
    } else {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.skyline.update(dt);
    this.brush.update(dt);
    this.ink.update(dt);

    if (GameState.mode === 'PLAYING') {
      this.player.update(dt, this.input);

      // 부드러운 카메라 추적 (Lerp)
      const targetCamX = this.player.x - 450;
      const maxCamX = GameState.worldWidth - this.width;
      GameState.cameraX += (Math.max(0, Math.min(maxCamX, targetCamX)) - GameState.cameraX) * 0.1;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, this.player, this.ink, this);
        if (e.isDead && e.deathTimer <= 0) {
          GameState.kills++;
          this.enemies.splice(i, 1);
        }
      }

      if (this.boss) this.boss.update(dt, this.player, this.ink, this);
      this.stageSystem.update(dt);
    } else if (GameState.mode === 'STAGE_INTRO') {
      this.stageSystem.update(dt);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 화면 흔들림
    if (this.shakeTimer > 0) {
      this.shakeTimer -= 0.016;
      ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
    }

    // 2. 한지 배경 클리어
    ctx.fillStyle = "#f7f4eb";
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. 월드 카메라 좌표계 적용 (월드 객체 렌더링)
    ctx.save();
    ctx.translate(-GameState.cameraX, 0);

    // 패럴랙스 수묵 배경
    this.skyline.render(GameState.cameraX, GameState.chapter, GameState.worldWidth);

    // 결계 묵선 렌더링 (활성 시)
    if (GameState.activeBarrierX !== null) {
      ctx.fillStyle = "rgba(20, 16, 12, 0.75)";
      ctx.fillRect(GameState.activeBarrierX, 0, 14, 620);
      ctx.strokeStyle = "#8a2420";
      ctx.lineWidth = 2;
      ctx.strokeRect(GameState.activeBarrierX, 0, 14, 620);
    }

    // 엔티티 및 이펙트 (뷰포트 컬링 내장)
    this.enemies.forEach(e => e.render(GameState.cameraX));
    if (this.boss) this.boss.render(GameState.cameraX);
    this.player.render();
    this.brush.render();
    this.ink.render(GameState.cameraX);

    ctx.restore(); // 월드 좌표계 복원 ➔ 스크린 UI 모드로 전환

    // 백색 여백 섬광
    if (this.whiteFlashTimer > 0) {
      this.whiteFlashTimer -= 0.016;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 4. 고정 화면 UI 오버레이
    if (GameState.mode === 'TITLE') this.renderTitle();
    else if (GameState.mode === 'PROLOGUE') this.renderPrologue();
    else if (GameState.mode === 'TUTORIAL') this.renderTutorial();
    else if (GameState.mode === 'STAGE_INTRO') this.renderStageIntro();
    else if (GameState.mode === 'PLAYING') this.renderHUD();
    else if (GameState.mode === 'STAGE_RESULT') this.renderResult();
    else if (GameState.mode === 'GAME_OVER') this.renderGameOver();

    ctx.restore();
  }

  renderTitle() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(247, 244, 235, 0.88)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 64px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("묵 검 (墨 劍)", 640, 260);

    ctx.font = "20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillStyle = "#5c5245";
    ctx.fillText("— 색을 잃은 한양, 붓끝으로 베어내다 —", 640, 320);

    ctx.fillStyle = "#8a2420";
    ctx.fillRect(520, 460, 240, 60);
    ctx.strokeStyle = "#4d1412";
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 460, 240, 60);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 22px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText("여 정 시 작", 640, 498);
  }

  renderPrologue() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 15, 12, 0.95)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "24px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("서울의 모든 색이 사라진 날이었다.", 640, 260);
    ctx.fillText("사람들은 이 재앙을 '묵재(墨災)'라 불렀고,", 640, 310);
    ctx.fillText("거리와 산천은 끝없는 먹빛 어둠에 잠겼다.", 640, 360);

    ctx.font = "18px 'Noto Serif KR', 'Batang', serif";
    ctx.fillStyle = "#a89f91";
    ctx.fillText("Enter, Space, 또는 화면을 누르면 검을 쥡니다...", 640, 480);
  }

  renderTutorial() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(30, 26, 22, 0.85)";
    ctx.fillRect(240, 60, 800, 110);
    ctx.strokeStyle = "#8a7e6d";
    ctx.lineWidth = 2;
    ctx.strokeRect(240, 60, 800, 110);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 22px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";

    const steps = [
      "검을 들어보십시오: [ J ] 키를 눌러 참격(斬)을 시전하십시오.",
      "먹을 실어 바위를 쪼개십시오: [ K ] 키로 강공격(破)을 펼치십시오.",
      "위험할 때 몸을 먹물로 흘리십시오: [ L / Shift ] 키로 대시(迅)하십시오.",
      "백색 섬광이 번뜩일 때 검을 세우십시오: [ I / Q ] 키로 패링(返)하십시오.",
      "먹이 가득 찼습니다. 모든 것을 베어내십시오: [ U / E ] 필살(墨)!"
    ];

    ctx.fillText(steps[GameState.tutorialStep], 640, 125);
    ctx.restore();
  }

  renderStageIntro() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(247, 244, 235, 0.92)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 48px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    const chNames = ["", "第一章 江西 (강서)", "第二章 江北 (강북)", "第三章 江東 (강동)", "第四章 江南 (강남)"];
    ctx.fillText(chNames[GameState.chapter] || "종장 (終章)", 640, 320);

    ctx.font = "24px 'Noto Serif KR', 'Batang', serif";
    ctx.fillStyle = "#5c5245";
    ctx.fillText(`제 ${GameState.stage} 막 — 나루터 갈대밭과 서쪽 관문`, 640, 380);
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = "#221c17";
    ctx.font = "bold 18px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "left";
    ctx.fillText(`第一章 江西 — 제 ${GameState.stage} 막`, 40, 45);

    // HP (白)
    ctx.fillText("白", 40, 78);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 65, 160, 14);
    ctx.fillStyle = "#8a2420";
    ctx.fillRect(68, 65, (GameState.hp / GameState.maxHp) * 160, 14);

    // 墨
    ctx.fillStyle = "#221c17";
    ctx.fillText("墨", 40, 108);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 95, 160, 14);
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(68, 95, (GameState.ink / GameState.maxInk) * 160, 14);

    // 콤보
    if (GameState.combo > 1) {
      ctx.fillStyle = "#8a2420";
      ctx.font = "bold 26px 'Noto Serif KR', 'Batang', serif";
      ctx.fillText(`${GameState.combo} 斬!`, 40, 150);
    }

    // 미니 진행도 바 (월드 3800px 진행률)
    const prog = Math.min(1.0, this.player.x / GameState.worldWidth);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(540, 25, 200, 6);
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(540, 25, 200 * prog, 6);

    ctx.fillStyle = "rgba(40, 34, 28, 0.75)";
    ctx.font = "14px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "right";
    ctx.fillText("J 斬  |  K 破(-20)  |  L 迅(-15)  |  I 返  |  U 墨(100)", 1240, 695);

    ctx.restore();
  }

  renderResult() {
    const ctx = this.ctx;
    const rank = this.stageSystem.calculateRank();

    ctx.fillStyle = "rgba(247, 244, 235, 0.95)";
    ctx.fillRect(340, 110, 600, 500);
    ctx.strokeStyle = "#383127";
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 110, 600, 500);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 32px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("강 서 평 정 (江西平定)", 640, 175);

    ctx.font = "18px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText(`처치한 자객 : ${GameState.kills} 명`, 640, 250);
    ctx.fillText(`받아친 검격(패링) : ${GameState.parries} 회`, 640, 290);
    ctx.fillText(`허용한 피격 : ${GameState.hitsTaken} 회`, 640, 330);
    ctx.fillText(`최대 콤보 : ${GameState.maxCombo} 斬`, 640, 370);
    ctx.fillText(`돌파 시간 : ${GameState.clearTimeStr}`, 640, 410);

    ctx.font = "bold 44px 'Noto Serif KR', 'Batang', serif";
    ctx.fillStyle = "#8a2420";
    ctx.fillText(rank, 640, 480);

    ctx.fillStyle = "#8a2420";
    ctx.fillRect(510, 520, 260, 55);
    ctx.strokeStyle = "#4d1412";
    ctx.lineWidth = 2;
    ctx.strokeRect(510, 520, 260, 55);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText("다 음 장 으 로  ➔", 640, 555);
  }

  renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 15, 12, 0.92)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#ded6c8";
    ctx.font = "bold 42px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("검이 꺾이고 먹이 흩어지다", 640, 330);

    ctx.font = "20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText("Space 또는 화면을 눌러 다시 검을 잡으십시오", 640, 395);
  }
}
