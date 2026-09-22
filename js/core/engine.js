import { GameState } from './state.js';
import { StorageManager } from './storage.js';
import { SkylineEffect } from '../effects/skyline.js';
import { BrushEffect } from '../effects/brush.js';
import { InkEffect } from '../effects/ink.js';
import { Player } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { StageSystem } from '../systems/stage.js';
import { ChapterSystem } from '../systems/chapter.js';
import { StorySystem } from '../systems/story.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.lastTime = 0;
    this.isRunning = false;
    this.EnemyClass = Enemy;

    this.input = { left: false, right: false };

    // 컴포넌트 생성
    this.skyline = new SkylineEffect(this.ctx, this.width, this.height);
    this.brush = new BrushEffect(this.ctx);
    this.ink = new InkEffect(this.ctx);
    this.player = new Player(this.ctx, 200, 524);
    this.enemies = [new Enemy(this.ctx, 950, 535)];
    this.boss = null;

    this.stageSystem = new StageSystem(this);
    this.chapterSystem = new ChapterSystem(this);
    this.storySystem = new StorySystem(this);

    this.setupInput();
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.player.jump();
      if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
        this.player.attack(this.brush, this.ink, this.enemies);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.player.attack(this.brush, this.ink, this.enemies);
    });

    // 모바일 터치 패드 바인딩
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); if (onUp) onUp(); });
    };

    bindBtn('btn-left', () => { this.input.left = true; }, () => { this.input.left = false; });
    bindBtn('btn-right', () => { this.input.right = true; }, () => { this.input.right = false; });
    bindBtn('btn-jump', () => { this.player.jump(); });
    bindBtn('btn-attack', () => { this.player.attack(this.brush, this.ink, this.enemies); });
  }

  init() {
    StorageManager.load();
    console.log("Ink Sword 통합 엔진 안전 가동 완료");
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

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.skyline.update(dt);
    this.brush.update(dt);
    this.ink.update(dt);
    this.player.update(dt, this.input);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player.x);
      if (e.isDead) {
        GameState.score += 100;
        this.enemies.splice(i, 1);
      }
    }

    this.stageSystem.update(dt);
  }

  render() {
    // 1. 전통 한지 배경 클리어
    this.ctx.fillStyle = "#f7f4eb";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. 수묵 산수 배경
    this.skyline.render();

    // 3. 적 및 플레이어 드로잉
    this.enemies.forEach(e => e.render());
    this.player.render();

    // 4. 검격 및 먹물 번짐 파티클
    this.brush.render();
    this.ink.render();

    // 5. 정갈한 수묵화풍 HUD
    this.ctx.fillStyle = "#221e1a";
    this.ctx.font = "bold 22px 'Noto Serif KR', serif";
    this.ctx.fillText(`처치 점수 : ${GameState.score}`, 40, 55);
    this.ctx.fillText(`제 ${GameState.stage} 장 (Stage ${GameState.stage})`, 40, 90);
    this.ctx.fillText(`검객 체력 : ${GameState.health}`, 40, 125);
  }
}
