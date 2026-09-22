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

    // 히트스톱 & 화면 흔들림 제어 변수
    this.hitStopTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    this.sound = new SoundEngine();
    this.skyline = new SkylineEffect(this.ctx, this.width, this.height);
    this.brush = new BrushEffect(this.ctx);
    this.ink = new InkEffect(this.ctx);
    this.player = new Player(this.ctx, 220, 525, this.sound);
    this.enemies = [];
    this.boss = null;
    this.stageSystem = new StageSystem(this);

    this.input = { left: false, right: false };
    this.setupInput();
  }

  triggerHitStop(duration) {
    this.hitStopTimer = duration;
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  setupInput() {
    const unlockSound = () => this.sound.init();
    window.addEventListener('pointerdown', unlockSound, { once: true });
    window.addEventListener('keydown', unlockSound, { once: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') this.player.jump();
      
      // J: 기본공격(斬) / K: 강공격(破) / L: 대시(迅) / I: 패링(返) / U: 필살기(墨)
      if (e.key === 'j' || e.key === 'J') this.player.attack(this.brush, this.ink, this.enemies, this.boss);
      if (e.key === 'k' || e.key === 'K') this.player.heavyAttack(this.brush, this.ink, this.enemies, this.boss);
      if (e.key === 'l' || e.key === 'L' || e.key === 'Shift') this.player.dash();
      if (e.key === 'i' || e.key === 'I' || e.key === 'q' || e.key === 'Q') this.player.parry();
      if (e.key === 'u' || e.key === 'U' || e.key === 'e' || e.key === 'E') this.triggerSpecial();
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

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
    bindTouch('m-atk', () => this.player.attack(this.brush, this.ink, this.enemies, this.boss));
    bindTouch('m-dash', () => this.player.dash());
    bindTouch('m-parry', () => this.player.parry());
    bindTouch('m-sp', () => this.triggerSpecial());
  }

  triggerSpecial() {
    if (GameState.ink >= 100) {
      GameState.ink = 0;
      this.sound.playParry();
      this.sound.playSlash();
      this.triggerHitStop(0.18);
      this.triggerShake(16, 0.4);
      // 화면 전체를 가르는 대필살 수묵 붓선
      this.brush.addSlash(640, 360, 1, 'heavy');
      this.enemies.forEach((e) => e.takeDamage(120));
      if (this.boss) this.boss.takeDamage(100);
      this.ink.splash(640, 360, 40);
    }
  }

  init() {
    StorageManager.load();
    GameState.reset();
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

    // 히트스톱: 피격/패링 순간 프레임 멈춤
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
    } else {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (GameState.isGameOver || GameState.isVictory) return;

    this.skyline.update(dt, this.player.vx);
    this.brush.update(dt);
    this.ink.update(dt);
    this.player.update(dt, this.input);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.ink, this);
      if (e.isDead) {
        GameState.kills++;
        GameState.score += 150;
        this.enemies.splice(i, 1);
      }
    }

    if (this.boss) {
      this.boss.update(dt, this.player, this.ink, this);
    }

    this.stageSystem.update(dt);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 화면 흔들림(Screen Shake) 효과
    if (this.shakeTimer > 0) {
      this.shakeTimer -= 0.016;
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(ox, oy);
    }

    // 1. 전통 한지 배경
    ctx.fillStyle = "#f7f4eb";
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 수묵 산수 배경
    this.skyline.render();

    // 3. 적군, 보스, 플레이어 렌더링
    this.enemies.forEach((e) => e.render());
    if (this.boss) this.boss.render();
    this.player.render();

    // 4. 검격 및 먹물 번짐
    this.brush.render();
    this.ink.render();

    // 5. 정갈한 수묵화풍 HUD
    this.renderHUD();

    // 6. 결과 / 사망 화면
    if (GameState.isVictory) this.renderVictory();
    if (GameState.isGameOver) this.renderGameOver();

    ctx.restore();
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#221c17";
    ctx.font = "bold 20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText("第一章 — 강서 (江西)", 40, 50);

    // 생명 (HP) 바
    ctx.fillStyle = "#4a4237";
    ctx.fillText("생명 (白)", 40, 85);
    ctx.fillStyle = "#d8d0c0";
    ctx.fillRect(130, 70, 180, 16);
    ctx.fillStyle = "#8a2424";
    ctx.fillRect(130, 70, (GameState.hp / GameState.maxHp) * 180, 16);

    // 먹 (墨) 자원 게이지
    ctx.fillStyle = "#221c17";
    ctx.fillText("먹 (墨)", 40, 120);
    ctx.fillStyle = "#d8d0c0";
    ctx.fillRect(130, 105, 180, 16);
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(130, 105, (GameState.ink / GameState.maxInk) * 180, 16);

    // 콤보 표시
    if (GameState.combo > 1) {
      ctx.fillStyle = "#7a2020";
      ctx.font = "bold 26px 'Noto Serif KR', 'Batang', serif";
      ctx.fillText(`${GameState.combo} 斬!`, 40, 165);
    }
    ctx.restore();
  }

  renderVictory() {
    const ctx = this.ctx;
    const rank = this.stageSystem.calculateRank();
    ctx.fillStyle = "rgba(247, 244, 235, 0.92)";
    ctx.fillRect(340, 140, 600, 420);
    ctx.strokeStyle = "#383127";
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 140, 600, 420);

    ctx.fillStyle = "#1e1a16";
    ctx.font = "bold 32px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("강서 평정 (江西平定)", 640, 210);

    ctx.font = "20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText(`처치한 자객 : ${GameState.kills} 명`, 640, 275);
    ctx.fillText(`받아친 검격(패링) : ${GameState.parries} 회`, 640, 315);
    ctx.fillText(`허용한 피격 : ${GameState.hitsTaken} 회`, 640, 355);

    ctx.font = "bold 60px 'Noto Serif KR', 'Batang', serif";
    ctx.fillStyle = "#8a2020";
    ctx.fillText(`평가 : ${rank}`, 640, 450);
  }

  renderGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(20, 16, 12, 0.85)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#d4cec3";
    ctx.font = "bold 44px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText("검이 꺾이고 먹이 흩어지다", 640, 340);

    ctx.font = "20px 'Noto Serif KR', 'Batang', serif";
    ctx.fillText("화면을 새로고침하여 다시 도전하십시오", 640, 400);
  }
}
