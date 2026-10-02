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
      if (e.key === 'p' || e.key === 'P') { this.togglePause(); return; }
      if (e.key === 'Escape') {
        if (GameState.mode === 'PLAYING') this.togglePause();
        else if (GameState.isHelpOpen) this.toggleHelp();
        else this.skipToGame();
        return;
      }
      if (e.key === 'h' || e.key === 'H') { this.toggleHelp(); return; }
      if (e.key === 'v' || e.key === 'V') { this.manualSave(); return; }
      if (e.key === 'f' || e.key === 'F') { this.toggleFullscreen(); return; }
      if (e.key === 'c' || e.key === 'C') { this.clearCacheAndReload(); return; }

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

      if (e.key === 'Enter' || e.key === ' ') {
        if (GameState.mode === 'TITLE') { this.handleTitleClick(); return; }
        else if (GameState.mode === 'PROLOGUE') { GameState.mode = 'TUTORIAL'; return; }
        else if (GameState.mode === 'STAGE_RESULT') { this.stageSystem.nextStage(); return; }
      }

      if (GameState.mode === 'GAME_OVER') {
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
          this.stageSystem.startStage(GameState.chapter, GameState.stage);
        } else if (e.key === 't' || e.key === 'T') {
          GameState.mode = 'TITLE';
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.player.jump();

      if (e.key === 'j' || e.key === 'J') this.player.attack(this.brush, this.ink, this.enemies, this.boss);
      if (e.key === 'k' || e.key === 'K') this.player.startCharge();
      if (e.key === 'l' || e.key === 'L' || e.key === 'Shift') this.player.dash();
      if (e.key === 'i' || e.key === 'I' || e.key === 'q' || e.key === 'Q') this.player.parry();
      if (e.key === 'u' || e.key === 'U' || e.key === 'e' || e.key === 'E') this.triggerSpecial();
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.player.cutJump();
      if (e.key === 'k' || e.key === 'K') this.player.releaseCharge(this.brush, this.ink, this.enemies, this.boss);
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
    bindTouch('m-jump', () => this.player.jump(), () => this.player.cutJump());
    bindTouch('m-atk', () => this.player.attack(this.brush, this.ink, this.enemies, this.boss));
    bindTouch('m-heavy', () => this.player.startCharge(), () => this.player.releaseCharge(this.brush, this.ink, this.enemies, this.boss));
    bindTouch('m-dash', () => this.player.dash());
    bindTouch('m-parry', () => this.player.parry());
    bindTouch('m-sp', () => this.triggerSpecial());
  }

  handleClick(x, y) {
    if (GameState.isPaused) {
      if (x > 490 && x < 790 && y > 320 && y < 370) this.togglePause();
      else if (x > 490 && x < 790 && y > 380 && y < 430) this.manualSave();
      else if (x > 490 && x < 790 && y > 440 && y < 490) {
        GameState.isPaused = false;
        this.stageSystem.startStage(GameState.chapter, GameState.stage);
      } else if (x > 490 && x < 790 && y > 500 && y < 550) {
        GameState.isPaused = false;
        GameState.mode = 'TITLE';
      } else if (x > 490 && x < 790 && y > 560 && y < 610) {
        this.clearCacheAndReload();
      }
      return;
    }

    if (GameState.isHelpOpen) { this.toggleHelp(); return; }

    if (GameState.mode === 'TITLE') this.handleTitleClick();
    else if (GameState.mode === 'PROLOGUE') GameState.mode = 'TUTORIAL';
    else if (GameState.mode === 'STAGE_RESULT') {
      if (x > 480 && x < 800 && y > 520 && y < 580) this.stageSystem.nextStage();
    } else if (GameState.mode === 'GAME_OVER') {
      if (x > 400 && x < 630 && y > 450 && y < 510) this.stageSystem.startStage(GameState.chapter, GameState.stage);
      else if (x > 650 && x < 880 && y > 450 && y < 510) GameState.mode = 'TITLE';
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
      if (this.hitStopTimer > 0) this.hitStopTimer -= dt;
      else this.update(dt);
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
      const plats = (this.stageSystem && this.stageSystem.platforms) ? this.stageSystem.platforms : [];
      this.player.update(dt, this.input, plats);

      const targetCamX = this.player.x - 450;
      const maxCamX = GameState.worldWidth - this.width;
      GameState.cameraX += (Math.max(0, Math.min(maxCamX, targetCamX)) - GameState.cameraX) * 0.1;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, this.player, this.ink, this, this.enemies, plats);
        if (e.isDead && e.deathTimer <= 0) {
          GameState.kills++;
          this.enemies.splice(i, 1);
        }
      }

      if (this.boss) this.boss.update(dt, this.player, this.ink, this);

      // 투사체 안전 업데이트
      const projs = GameState.projectiles || [];
      for (let i = projs.length - 1; i >= 0; i--) {
        const p = projs[i];
        if (!p) continue;
        p.x += p.vx * dt;
        p.life -= dt;

        if (p.isPlayer) {
          this.enemies.forEach(e => {
            if (!e.isDead && Math.hypot(e.x + e.w / 2 - p.x, e.y + e.h / 2 - p.y) < p.r + 30) {
              e.takeDamage(p.dmg, this.ink);
              this.sound.playInkDrop();
              p.life = 0;
            }
          });
          if (this.boss && !this.boss.isDead && Math.hypot(this.boss.x + this.boss.w / 2 - p.x, this.boss.y + this.boss.h / 2 - p.y) < p.r + 40) {
            this.boss.takeDamage(p.dmg, this.ink);
            p.life = 0;
          }
        } else {
          if (Math.hypot(this.player.x + this.player.hitW / 2 - p.x, this.player.y + this.player.hitH / 2 - p.y) < p.r + 25) {
            this.player.takeDamage(p.dmg, this.ink, this);
            p.life = 0;
          }
        }

        if (p.life <= 0) projs.splice(i, 1);
      }

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

    // 공중 수묵 발판 렌더링
    const plats = (this.stageSystem && this.stageSystem.platforms) ? this.stageSystem.platforms : [];
    ctx.fillStyle = "#3a332a";
    ctx.strokeStyle = "#1b1713";
    ctx.lineWidth = 3;
    for (const plat of plats) {
      if (plat.x + plat.w < GameState.cameraX - 50 || plat.x > GameState.cameraX + 1330) continue;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = "#6d6252";
      ctx.fillRect(plat.x + 2, plat.y + 2, plat.w - 4, 4);
    }

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

    // 투사체 (검기 파동 / 적 탄환)
    const projs = GameState.projectiles || [];
    for (const p of projs) {
      ctx.save();
      if (p.isPlayer) {
        ctx.fillStyle = "#1c1813";
        ctx.strokeStyle = "#8a2420";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.5, p.r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = "#681818";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    ctx.fillText("— 록맨식 수묵 검술 플랫포머 —", 640, 320);

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
    ctx.fillText("Enter 또는 Space를 눌러 검을 쥡니다...", 640, 480);
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
    ctx.font = "bold 20px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("록맨식 조작: W(가변점프), L/Shift(대시), K 누르고 떼기(차지 검기샷)!", 640, 125);
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

    ctx.fillText("白", 40, 78);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 65, 160, 14);
    ctx.fillStyle = "#8a2420";
    ctx.fillRect(68, 65, (GameState.hp / GameState.maxHp) * 160, 14);

    ctx.fillText("墨", 40, 108);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(68, 95, 160, 14);
    ctx.fillStyle = GameState.ink >= 100 ? "#8a2420" : "#1e1a16";
    ctx.fillRect(68, 95, (GameState.ink / GameState.maxInk) * 160, 14);

    if (GameState.combo > 1) {
      ctx.fillStyle = "#8a2420";
      ctx.font = "bold 26px 'Noto Serif KR', serif";
      ctx.fillText(`${GameState.combo} 斬!`, 40, 150);
    }

    const prog = Math.min(1.0, this.player.x / GameState.worldWidth);
    ctx.fillStyle = "#d5cebe";
    ctx.fillRect(540, 25, 200, 6);
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(540, 25, 200 * prog, 6);

    if (GameState.guideTimer > 0) {
      const alpha = Math.min(1.0, GameState.guideTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      const bx = 340;
      this.drawKeyBadge(ctx, "J 斬(베기)", bx, 695);
      this.drawKeyBadge(ctx, "K 破(차지샷)", bx + 95, 695);
      this.drawKeyBadge(ctx, "L/Shift 迅(대시)", bx + 205, 695);
      this.drawKeyBadge(ctx, "I 返(패링)", bx + 310, 695);
      this.drawKeyBadge(ctx, "U 墨(필살)", bx + 400, 695);
      this.drawKeyBadge(ctx, "H 도움말", bx + 500, 695);
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

    ctx.fillStyle = "#8a2420";
    ctx.fillRect(400, 450, 230, 55);
    ctx.strokeStyle = "#541412";
    ctx.lineWidth = 2;
    ctx.strokeRect(400, 450, 230, 55);
    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 17px 'Noto Serif KR', serif";
    ctx.fillText("다시 도전", 475, 484);
    this.drawKeyBadge(ctx, "R", 585, 484, 25);

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
    ctx.fillText("무 예 지 침 (록맨식 조작법)", 640, 100);

    const tx = 300;
    const ty = 150;
    const tw = 680;

    ctx.strokeStyle = "#8a7e6d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx, ty, tw, 420);

    ctx.fillStyle = "#2c2620";
    ctx.fillRect(tx, ty, tw, 42);
    ctx.fillStyle = "#f7f4eb";
    ctx.font = "bold 16px 'Noto Serif KR', serif";
    ctx.textAlign = "left";
    ctx.fillText("행동 (武技)", tx + 20, ty + 26);
    ctx.fillText("PC 키보드", tx + 180, ty + 26);
    ctx.fillText("모바일 터치", tx + 370, ty + 26);
    ctx.fillText("설명", tx + 510, ty + 26);

    const rows = [
      { name: "이동 (步)", pc: "A D  /  ← →", m: "◀ ▶", desc: "좌우 질주" },
      { name: "가변점프 (躍)", pc: "W  /  Space", m: "躍 (점프)", desc: "길게 누르면 고도 점프" },
      { name: "에어대시 (迅)", pc: "L  /  Shift", m: "迅 (대시)", desc: "고속 슬라이딩 (무적)" },
      { name: "벽타기/벽차기", pc: "벽 붙어 W", m: "벽 붙어 躍", desc: "벽 미끄러짐 및 반대편 점프" },
      { name: "3단 참격 (斬)", pc: "J 연타", m: "斬 (베기)", desc: "1타➔2타➔3타 회전베기" },
      { name: "차지샷 (破)", pc: "K (누르고 떼기)", m: "破 (차지)", desc: "기를 모아 거대 검기 발사" },
      { name: "반격 (返)", pc: "I  /  Q", m: "返 (패링)", desc: "백색 섬광 찰나에 쳐내기" },
      { name: "필살 (墨)", pc: "U  /  E", m: "墨 (필살)", desc: "먹 100 만충 시 화면 일도양단" }
    ];

    ctx.font = "15px 'Noto Serif KR', serif";
    rows.forEach((r, idx) => {
      const ry = ty + 42 + idx * 46;
      ctx.fillStyle = idx % 2 === 0 ? "rgba(40, 34, 28, 0.4)" : "rgba(20, 16, 12, 0.2)";
      ctx.fillRect(tx, ry, tw, 46);

      ctx.fillStyle = "#f7f4eb";
      ctx.fillText(r.name, tx + 20, ry + 28);
      ctx.fillStyle = "#dcd6c8";
      ctx.fillText(r.pc, tx + 180, ry + 28);
      ctx.fillText(r.m, tx + 370, ry + 28);
      ctx.fillStyle = "#e6a15c";
      ctx.fillText(r.desc, tx + 510, ry + 28);
    });

    ctx.fillStyle = "#a89f91";
    ctx.font = "16px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.fillText("닫기 : H  /  ESC  /  화면 터치", 640, 605);
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
