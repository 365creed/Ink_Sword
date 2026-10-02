import { CHAPTER_DATA } from './stageData.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { GameState } from '../core/state.js';
import { StorageManager } from '../core/storage.js';

export class StageSystem {
  constructor(engine) {
    this.engine = engine;
    this.introTimer = 0;
    this.barrier1Cleared = false;
    this.bossSpawned = false;
    this.platforms = [];
  }

  startStage(chapter, stage) {
    GameState.chapter = chapter;
    GameState.stage = stage;
    GameState.resetForStage();
    GameState.mode = 'STAGE_INTRO';
    this.introTimer = 2.5;

    const stData = GameState.getCurrentStageData();
    this.platforms = stData.platforms || [];

    GameState.cameraX = 0;
    GameState.minBarrierX = null;
    GameState.activeBarrierX = null;
    this.barrier1Cleared = false;
    this.bossSpawned = false;

    this.engine.enemies = [];
    this.engine.boss = null;
    this.engine.player.x = 200;
    this.engine.player.y = 524;
    this.engine.player.vx = 0;
    this.engine.player.vy = 0;

    this.engine.enemies.push(new Enemy(this.engine.ctx, 750, 528, 'grunt'));
    this.engine.enemies.push(new Enemy(this.engine.ctx, 1100, 528, 'grunt'));
  }

  update(dt) {
    if (GameState.mode === 'STAGE_INTRO') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        GameState.mode = 'PLAYING';
        this.engine.sound.playDrum();
      }
      return;
    }

    if (GameState.mode !== 'PLAYING') return;

    const px = this.engine.player.x;

    // 2구역: 결계 봉쇄전 (X = 1450)
    if (px >= 1350 && !this.barrier1Cleared) {
      GameState.activeBarrierX = 1450;
      GameState.minBarrierX = 900;

      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1050, 528, 'archer'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1180, 534, 'rusher'));
        this.barrier1Cleared = true;
      }
    }

    if (this.barrier1Cleared && GameState.activeBarrierX === 1450) {
      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        GameState.activeBarrierX = null;
        GameState.minBarrierX = null;
        this.engine.sound.playDrum();
      }
    }

    // 3구역: 먹 샘터 회복 (X = 2050 ~ 2200)
    if (px > 2050 && px < 2200) {
      GameState.hp = Math.min(GameState.maxHp, GameState.hp + 22 * dt);
      GameState.ink = Math.min(GameState.maxInk, GameState.ink + 35 * dt);
    }

    // 4구역: 최종 결전 (X = 2750)
    if (px >= 2750 && !this.bossSpawned) {
      this.bossSpawned = true;
      GameState.activeBarrierX = 3700;
      GameState.minBarrierX = 2650;
      this.engine.sound.playDrum();

      if (GameState.stage === 3) {
        this.engine.boss = new Boss(this.engine.ctx, 3350, 470);
      } else {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3100, 534, 'rusher'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3300, 528, 'archer'));
      }
    }

    if (this.bossSpawned) {
      const activeEnemies = this.engine.enemies.filter(e => !e.isDead).length;
      const bossDead = !this.engine.boss || this.engine.boss.isDead;
      if (activeEnemies === 0 && bossDead) {
        this.finishStage();
      }
    }
  }

  finishStage() {
    const sec = Math.floor((Date.now() - GameState.stageStartTime) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    GameState.clearTimeStr = `${m}:${s}`;
    GameState.mode = 'STAGE_RESULT';
    StorageManager.save();
  }

  nextStage() {
    if (GameState.stage < 3) {
      this.startStage(GameState.chapter, GameState.stage + 1);
    } else {
      const nextCh = GameState.chapter + 1;
      if (CHAPTER_DATA[nextCh]) {
        this.startStage(nextCh, 1);
      } else {
        this.startStage(1, 1);
      }
    }
  }

  calculateRank() {
    let score = GameState.parries * 320 + GameState.maxCombo * 120 - GameState.hitsTaken * 160;
    if (GameState.hitsTaken === 0) return 'SS';
    if (score > 1500) return 'S';
    if (score > 850) return 'A';
    if (score > 350) return 'B';
    return 'C';
  }
}
