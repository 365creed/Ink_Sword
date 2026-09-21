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

    // 컴포넌트 초기화
    this.skyline = new SkylineEffect(this.ctx, this.width, this.height);
    this.brush = new BrushEffect(this.ctx);
    this.ink = new InkEffect(this.ctx);
    this.player = new Player(this.ctx, 150, this.height - 250);
    this.enemies = [];
    this.boss = null;

    this.stageSystem = new StageSystem(this);
    this.chapterSystem = new ChapterSystem(this);
    this.storySystem = new StorySystem(this);
  }

  init() {
    StorageManager.load();
    console.log("Ink Sword 엔진 및 시스템 정상 부팅 완료");
    
    // 초기 적 스폰 테스트
    this.enemies.push(new Enemy(this.ctx, this.width - 300, this.height - 250));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!GameState.isPaused && !GameState.isGameOver) {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    this.skyline.update(dt);
    this.brush.update(dt);
    this.ink.update(dt);
    this.player.update(dt);

    this.enemies.forEach(enemy => enemy.update(dt));
    if (this.boss) this.boss.update(dt);

    this.stageSystem.update(dt);
    this.chapterSystem.update(dt);
  }

  render() {
    // 수묵화풍 배경 클리어
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 배경 및 이펙트 렌더링
    this.skyline.render();
    this.brush.render();
    this.ink.render();

    // 게임 엔티티 렌더링
    this.player.render();
    this.enemies.forEach(enemy => enemy.render());
    if (this.boss) this.boss.render();

    // 상단 UI HUD 렌더링
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "18px 'Noto Serif KR', serif";
    this.ctx.fillText(`점수: ${GameState.score}`, 40, 50);
    this.ctx.fillText(`장(Chapter): ${GameState.chapter} - 스테이지 ${GameState.stage}`, 40, 80);
    this.ctx.fillText(`체력: ${GameState.health}`, 40, 110);
  }
}
