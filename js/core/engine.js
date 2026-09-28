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

  togglePause() {
    if (GameState.mode === 'PLAYING') {
      GameState.isPaused = !GameState.isPaused;
      GameState.isHelpOpen = false;
    }
  }

  toggleHelp() {
    GameState.isHelpOpen = !GameState.isHelpOpen;
    GameState.isPaused = false;
  }

  manualSave() {
    StorageManager.save();
  }

  clearCacheAndReload() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) reg.unregister();
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
    window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  setupEvents() {
    const unlock = () => this.sound.init();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    window.addEventListener('keydown', (e) => {
      // 시스템 단축키
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
        return;
      }
      if (e.key === 'Escape') {
        if (GameState.mode === 'PLAYING') {
          this.togglePause();
        } else if (GameState.isHelpOpen) {
          this.toggleHelp();
        } else {
          this.skipToGame();
        }
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        this.toggleHelp();
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        this.manualSave();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        this.clearCacheAndReload();
        return;
      }

      // 일시정지 중 메뉴 단축키
      if (GameState.isPaused) {
        if (e.key === 'r' || e.key === 'R') {
          GameState.isPaused = false;
          this.stageSystem.startStage(GameState.chapter, GameState.stage);
        } else if (e.key === 't' || e.key === 'T') {
          GameState.isPaused = false;
          GameState.mode = 'TITLE';
        }
        return;
      }

      // 다음 장 이동 (ENTER / SPACE 단일화, J 배제)
      if (e.key === 'Enter' || e.key === ' ') {
        if (GameState.mode === 'TITLE') {
          this.handleTitleClick();
          return;
        } else if (GameState.mode === 'PROLOGUE') {
          GameState.mode = 'TUTORIAL';
          return;
        } else if (GameState.mode === 'STAGE_RESULT') {
          this.stageSystem.nextStage();
          return;
        }
      }

      // 사망 화면 재도전
      if (GameState.mode === 'GAME_OVER') {
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
          this.stageSystem.startStage(GameState.chapter, GameState.stage);
        } else if (e.key === 't' || e.key === 'T') {
          GameState.mode = 'TITLE';
        }
        return;
      }

      // 플레이 조작 키
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

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.height / rect.height);
      this.handleClick(clickX, clickY);
    });

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

  handleClick(x, y) {
    if (GameState.isPaused) {
      if (x > 490 && x < 790 && y > 360 && y < 410) this.togglePause();
      else if (x > 490 && x < 790 && y > 420 && y < 470) this.manualSave();
      else if (x > 490 && x < 790 && y > 480 && y < 530) {
        GameState.isPaused = false;
        this.stageSystem.startStage(GameState.chapter, GameState.stage);
      } else if (x > 490 && x < 790 && y > 540 && y < 590) {
        GameState.isPaused = false;
        GameState.mode = 'TITLE';
      }
      return;
    }

    if (GameState.isHelpOpen) {
      this.toggleHelp();
      return;
    }

    if (GameState.mode === 'TITLE') this.handleTitleClick();
    else if (GameState.mode === 'PROLOGUE') GameState.mode = 'TUTORIAL';
    else if (GameState.mode === 'STAGE_RESULT') {
      if (x > 480 && x < 800 && y > 520 && y < 580) {
        this.stageSystem.nextStage();
      }
    } else if (GameState.mode === 'GAME_OVER') {
      if (x > 400 && x < 630 && y > 450 && y < 510) {
        this.stageSystem.startStage(GameState.chapter, GameState.stage);
      } else if (x > 650 && x < 880 && y > 450 && y < 510) {
        GameState.mode = 'TITLE';
      }
    }
  }

  handleTitleClick() {
    if (!GameState.tutorialCompleted) GameState.mode = 'PROLOGUE';
    else this.stageSystem.startStage(GameState.chapter, GameState.stage);
  }

  skipToGame() {
    if (GameState.mode === 'PROLOGUE' || GameState.mode === 'TUTORIAL' || GameState.mode === 'STAGE_INTRO') {
      GameState.tutorialCompleted = true;
      StorageManager.save();
      this.stageSystem.startStage(GameState.chapter, GameState.stage);
    }
  }

  handleAction(action) {
    if (GameState.isPaused) return;

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

    if (!GameState.isPaused) {
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
      } else {
        this.update(dt);
      }
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (GameState.saveToastTimer > 0) GameState.saveToastTimer -= dt;
    if (GameState.guideTimer > 0) GameState.guideTimer -= dt;

    this.skyline.update(dt);
    this.brush.update(dt);
    this.ink.update(dt);

    if (GameState.mode === 'PLAYING') {
      this.player.update(dt, this.input);

      const targetCamX = this.player.x - 450;
      const maxCamX = GameState.worldWidth - this.width;
      GameState.cameraX += (Math.max(0, Math.min(maxCamX, targetCamX)) - GameState.cameraX) * 0.1;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, this.player, this.ink, this, this.enemies);
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

    if (this.shakeTimer > 0) {
      this.shakeTimer -= 0.016;
      ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
    }

    ctx.fillStyle = "#f7f4eb";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-GameState.cameraX, 0);

    this.skyline.render(GameState.cameraX, GameState.chapter, GameState.worldWidth);

    // 먹물 결계(墨界) 시각화: 기둥과 상하 요동치는 수묵 장막
    if (GameState.activeBarrierX !== null) {
      ctx.fillStyle = "rgba(22, 18, 14, 0.85)";
      ctx.fillRect(GameState.activeBarrierX - 10, 0, 20, 620);
      ctx.strokeStyle = "#8a2420";
      ctx.lineWidth = 3;
      ctx.strokeRect(GameState.activeBarrierX - 10, 0, 20, 620);
    }
    if (GameState.minBarrierX !== null) {
      ctx.fillStyle = "rgba(22, 18, 14, 0.85)";
      ctx.fillRect(GameState.minBarrierX - 10, 0, 20, 620);
      ctx.strokeStyle = "#8a2420";
      ctx.lineWidth = 3;
      ctx.strokeRect(GameState.minBarrierX - 10, 0, 20, 620);
    }

    this.enemies.forEach(e => e.render(GameState.cameraX));
    if (this.boss) this.boss.render(GameState.cameraX);
    this.player.render();
    this.brush.render();
    this.ink.render(GameState.cameraX);

    ctx.restore();

    if (this.whiteFlashTimer > 0) {
      this.whiteFlashTimer -= 0.016;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 빈사 비네팅 (HP 25% 이하)
    if (GameState.hp > 0 && GameState.hp <= 25 && GameState.mode === 'PLAYING') {
      ctx.save();
      const grad = ctx.createRadialGradient(640, 360, 300, 640, 360, 640);
      grad.addColorStop(0, "rgba(130, 20, 20, 0)");
      grad.addColorStop(1, "rgba(130, 20, 20, 0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    if (GameState.mode === 'TITLE') this.renderTitle();
    else if (GameState.mode === 'PROLOGUE') this.renderPrologue();
    else if (GameState.mode === 'TUTORIAL') this.renderTutorial();
    else if (GameState.mode === 'STAGE_INTRO') this.renderStageIntro();
    else if (GameState.mode === 'PLAYING') this.renderHUD();
    else if (GameState.mode === 'STAGE_RESULT') this.renderResult();
    else if (GameState.mode === 'GAME_OVER') this.renderGameOver();

    if (GameState.isPaused) this.renderPauseOverlay();
    if (GameState.isHelpOpen) this.renderHelpOverlay();
    if (GameState.saveToastTimer > 0) this.renderToast();

    ctx.restore();
  }

  // 키보드 자판 형태의 키 배지 렌더러
  drawKeyBadge(ctx, text, x, y, minW = 28) {
    ctx.save();
    ctx.font = "bold 13px 'Noto Serif KR', serif";
    const tw = Math.max(minW, ctx.measureText(text).width + 14);
    const th = 22;

    ctx.fillStyle = "#2c2620";
    ctx.fillRect(x - tw / 2, y - th / 2, tw, th);
    ctx.strokeStyle = "#8a7e6d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - tw / 2, y - th / 2, tw, th);

    ctx.fillStyle = "#f7f4eb";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1);
    ctx.restore();
    return tw;
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
    ctx.fillRect(500, 460, 280, 60);
    ctx.strokeStyle = "#4d1412";
    ctx.lineWidth = 3;
    ctx.strokeRect(500, 460, 280, 60);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 20px 'Noto Serif KR', serif";
    ctx.fillText("여 정 시 작", 590, 497);
    this.drawKeyBadge(ctx, "ENTER", 710, 496, 55);
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

    ctx.font = "18px 'Noto Serif KR', serif";
    ctx.fillStyle = "#a89f91";
    ctx.fillText("화면을 누르거나 키를 눌러 검을 쥡니다...", 640, 480);
    this.drawKeyBadge(ctx, "ENTER", 570, 520, 60);
    this.drawKeyBadge(ctx, "SPACE", 710, 520, 60);
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
    ctx.font = "bold 22px 'Noto Serif KR', serif";
    ctx.textAlign = "center";

    const steps = [
      "검을 들어보십시오: 참격(斬)을 시전하십시오. [ J / 斬 ]",
      "먹을 실어 바위를 쪼개십시오: 강공격(破)을 펼치십시오. [ K / 破 ]",
      "위험할 때 몸을 먹물로 흘리십시오: 대시(迅)하십시오. [ L / Shift / 迅 ]",
      "백색 섬광이 번뜩일 때 검을 세우십시오: 패링(返)하십시오. [ I / Q / 返 ]",
      "먹이 가득 찼습니다. 모든 것을 베어내십시오: 필살(墨)! [ U / E / 墨 ]"
    ];

    ctx.fillText(steps[GameState.tutorialStep], 640, 125);
    ctx.restore();
  }

  renderStageIntro() {
    const ctx = this.ctx;
    const ch = GameState.getCurrentChapterData();
    const st = GameState.getCurrentStageData();

    ctx.fillStyle = "rgba(247, 244, 235, 0.92)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 48px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText(`${ch.hanja} (${ch.name})`, 640, 310);

    ctx.font = "24px 'Noto Serif KR', serif";
    ctx.fillStyle = "#4a4237";
    ctx.fillText(st.title, 640, 370);

    ctx.font = "18px 'Noto Serif KR', serif";
    ctx.fillStyle = "#7a7062";
    ctx.fillText(st.desc, 640, 415);
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();

    const ch = GameState.getCurrentChapterData();
    ctx.fillStyle = "#221c17";
    ctx.font = "bold 18px 'Noto Serif KR', serif";
    ctx.textAlign = "left";
    ctx.fillText(`${ch.hanja} · 제 ${GameState.stage} 막`, 40, 45);

    // HP (白)
    ctx.fillText("白", 40, 78);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 65, 160, 14);
    ctx.fillStyle = "#8a2420";
    ctx.fillRect(68, 65, (GameState.hp / GameState.maxHp) * 160, 14);

    // 墨
    ctx.fillText("墨", 40, 108);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 95, 160, 14);
    ctx.fillStyle = GameState.ink >= 100 ? "#8a2420" : "#1e1a16";
    ctx.fillRect(68, 95, (GameState.ink / GameState.maxInk) * 160, 14);

    // 콤보
    if (GameState.combo > 1) {
      ctx.fillStyle = "#8a2420";
      ctx.font = "bold 26px 'Noto Serif KR', serif";
      ctx.fillText(`${GameState.combo} 斬!`, 40, 150);
    }

    // 미니 진행도
    const prog = Math.min(1.0, this.player.x / GameState.worldWidth);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(540, 25, 200, 6);
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(540, 25, 200 * prog, 6);

    // 하단 5초 자동 감추기 키 가이드 (키 배지 스타일)
    if (GameState.guideTimer > 0) {
      const alpha = Math.min(1.0, GameState.guideTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      const bx = 380;
      this.drawKeyBadge(ctx, "J 斬", bx, 695);
      this.drawKeyBadge(ctx, "K 破", bx + 80, 695);
      this.drawKeyBadge(ctx, "L 迅", bx + 160, 695);
      this.drawKeyBadge(ctx, "I 返", bx + 240, 695);
      this.drawKeyBadge(ctx, "U 墨", bx + 320, 695);
      this.drawKeyBadge(ctx, "H 도움말", bx + 420, 695);
      ctx.restore();
    }

    ctx.restore();
  }

  renderResult() {
    const ctx = this.ctx;
    const ch = GameState.getCurrentChapterData();
    const rank = this.stageSystem.calculateRank();

    ctx.fillStyle = "rgba(247, 244, 235, 0.95)";
    ctx.fillRect(340, 100, 600, 520);
    ctx.strokeStyle = "#383127";
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 100, 600, 520);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 32px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText(ch.title, 640, 165);

    ctx.font = "18px 'Noto Serif KR', serif";
    ctx.fillText(`처치한 자객 : ${GameState.kills} 명`, 640, 235);
    ctx.fillText(`받아친 검격(패링) : ${GameState.parries} 회`, 640, 275);
    ctx.fillText(`허용한 피격 : ${GameState.hitsTaken} 회`, 640, 315);
    ctx.fillText(`최대 콤보 : ${GameState.maxCombo} 斬`, 640, 355);
    ctx.fillText(`돌파 시간 : ${GameState.clearTimeStr}`, 640, 395);

    ctx.font = "bold 46px 'Noto Serif KR', serif";
    ctx.fillStyle = "#8a2420";
    ctx.fillText(rank, 640, 465);

    // 다음 장 이동 버튼 (키 배지 적용, J 배제)
    ctx.fillStyle = "#8a2420";
    ctx.fillRect(480, 520, 320, 60);
    ctx.strokeStyle = "#4d1412";
    ctx.lineWidth = 2;
    ctx.strokeRect(480, 520, 320, 60);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 18px 'Noto Serif KR', serif";
    ctx.fillText("다 음 장 으 로  ➔", 570, 556);
    this.drawKeyBadge(ctx, "ENTER", 740, 555, 55);
  }

  renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 15, 12, 0.94)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#ded6c8";
    ctx.font = "bold 44px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("검이 꺾이고 먹이 흩어지다", 640, 300);

    ctx.font = "20px 'Noto Serif KR', serif";
    ctx.fillText("다시 호흡을 가다듬고 검을 잡으시겠습니까?", 640, 360);

    // 다시 도전 버튼
    ctx.fillStyle = "#8a2420";
    ctx.fillRect(400, 450, 230, 55);
    ctx.strokeStyle = "#541412";
    ctx.lineWidth = 2;
    ctx.strokeRect(400, 450, 230, 55);
    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 17px 'Noto Serif KR', serif";
    ctx.fillText("다시 도전", 475, 484);
    this.drawKeyBadge(ctx, "R", 585, 484, 25);

    // 처음으로 버튼
    ctx.fillStyle = "#2c2722";
    ctx.fillRect(650, 450, 230, 55);
    ctx.strokeStyle = "#15120f";
    ctx.lineWidth = 2;
    ctx.strokeRect(650, 450, 230, 55);
    ctx.fillStyle = "#f7f4eb";
    ctx.fillText("처음으로", 735, 484);
    this.drawKeyBadge(ctx, "T", 825, 484, 25);
  }

  renderPauseOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 15, 12, 0.92)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 36px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("잠 식 (暫 息) — 일시정지", 640, 160);

    ctx.font = "18px 'Noto Serif KR', serif";
    ctx.fillStyle = "#a89f91";
    ctx.fillText("호흡을 가다듬고 전열을 정비하십시오.", 640, 210);

    // 순수 메뉴 버튼 인터페이스
    const btns = [
      { t: "계속하기", key: "P", y: 360, col: "#8a2420" },
      { t: "수묵 기록 저장", key: "V", y: 420, col: "#2c2722" },
      { t: "다시 도전", key: "R", y: 480, col: "#2c2722" },
      { t: "처음으로", key: "T", y: 540, col: "#2c2722" }
    ];
    btns.forEach(b => {
      ctx.fillStyle = b.col;
      ctx.fillRect(490, b.y, 300, 48);
      ctx.strokeStyle = "#5a5144";
      ctx.lineWidth = 2;
      ctx.strokeRect(490, b.y, 300, 48);
      ctx.fillStyle = "#f7f4eb";
      ctx.font = "bold 17px 'Noto Serif KR', serif";
      ctx.fillText(b.t, 600, b.y + 30);
      this.drawKeyBadge(ctx, b.key, 740, b.y + 24, 25);
    });
  }

  renderHelpOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 15, 12, 0.94)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 34px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("무 예 지 침 (조작법)", 640, 100);

    // 정돈된 수묵 표(Table) UI
    const tx = 320;
    const ty = 150;
    const tw = 640;

    ctx.strokeStyle = "#8a7e6d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx, ty, tw, 420);

    // 표 헤더
    ctx.fillStyle = "#2c2620";
    ctx.fillRect(tx, ty, tw, 42);
    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 16px 'Noto Serif KR', serif";
    ctx.textAlign = "left";
    ctx.fillText("행동 (武技)", tx + 20, ty + 26);
    ctx.fillText("PC 키보드", tx + 180, ty + 26);
    ctx.fillText("모바일 터치", tx + 360, ty + 26);
    ctx.fillText("자원 (墨)", tx + 510, ty + 26);

    const rows = [
      { name: "이동 (步)", pc: "A D  /  ← →", m: "◀ ▶", cost: "-" },
      { name: "도약 (躍)", pc: "W  /  Space", m: "躍 (도약)", cost: "-" },
      { name: "참격 (斬)", pc: "J", m: "斬 (기본)", cost: "+8 충전" },
      { name: "파극 (破)", pc: "K", m: "破 (강공)", cost: "먹 20 소모" },
      { name: "신속 (迅)", pc: "L  /  Shift", m: "迅 (대시)", cost: "먹 15 소모" },
      { name: "반격 (返)", pc: "I  /  Q", m: "返 (패링)", cost: "성공시 +35" },
      { name: "필살 (墨)", pc: "U  /  E", m: "墨 (필살)", cost: "먹 100 만충" }
    ];

    ctx.font = "15px 'Noto Serif KR', serif";
    rows.forEach((r, idx) => {
      const ry = ty + 42 + idx * 52;
      ctx.fillStyle = idx % 2 === 0 ? "rgba(40, 34, 28, 0.4)" : "rgba(20, 16, 12, 0.2)";
      ctx.fillRect(tx, ry, tw, 52);

      ctx.fillStyle = "#f7f4eb";
      ctx.fillText(r.name, tx + 20, ry + 32);
      ctx.fillStyle = "#dcd6c8";
      ctx.fillText(r.pc, tx + 180, ry + 32);
      ctx.fillText(r.m, tx + 360, ry + 32);
      ctx.fillStyle = r.cost.includes("-") ? "#a89f91" : (r.cost.includes("+") ? "#559955" : "#e6a15c");
      ctx.fillText(r.cost, tx + 510, ry + 32);
    });

    ctx.fillStyle = "#a89f91";
    ctx.font = "16px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("닫기 : H  /  ESC  /  화면 터치", 640, 610);
  }

  renderToast() {
    const ctx = this.ctx;
    ctx.save();
    const a = Math.min(1.0, GameState.saveToastTimer);
    ctx.fillStyle = `rgba(20, 16, 12, ${a * 0.92})`;
    ctx.fillRect(490, 80, 300, 45);
    ctx.strokeStyle = `rgba(138, 36, 32, ${a})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(490, 80, 300, 45);

    ctx.fillStyle = `rgba(247, 244, 235, ${a})`;
    ctx.font = "bold 16px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText(GameState.saveToastText, 640, 108);
    ctx.restore();
  }
}
