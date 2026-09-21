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
    console.log("한지 테마 수묵 게임 엔진 가동");
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
    this.enemies.forEach(e => e.update(dt));
    if (this.boss) this.boss.update(dt);
  }

  render() {
    // 캔버스 전체를 따뜻한 한지 색상으로 깔끔하게 채우기
    this.ctx.fillStyle = "#f7f4eb";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 수묵 배경 및 오브젝트 렌더링
    this.skyline.render();
    this.brush.render();
    this.ink.render();
    this.player.render();
    this.enemies.forEach(e => e.render());
    if (this.boss) this.boss.render();

    // 상단 UI 텍스트 (가시성이 높은 진한 먹색 폰트)
    this.ctx.fillStyle = "#1c1917";
    this.ctx.font = "bold 20px 'Noto Serif KR', serif";
    this.ctx.fillText(`처치 점수: ${GameState.score}`, 40, 50);
    this.ctx.fillText(`장(Chapter): ${GameState.chapter} - 제 ${GameState.stage} 스테이지`, 40, 85);
    this.ctx.fillText(`체력: ${GameState.health}`, 40, 120);
  }
}
