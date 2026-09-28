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
  }

  startStage(chapter, stage) {
    GameState.chapter = chapter;
    GameState.stage = stage;
    GameState.resetForStage();
    GameState.mode = 'STAGE_INTRO';
    this.introTimer = 2.5;

    // 카메라 및 결계 완전 초기화
    GameState.cameraX = 0;
    GameState.activeBarrierX = null;
    this.barrier1Cleared = false;
    this.bossSpawned = false;

    this.engine.enemies = [];
    this.engine.boss = null;
    this.engine.player.x = 200;
    this.engine.player.y = 524;

    // 1구역 탐색로 적 배치
    this.engine.enemies.push(new Enemy(this.engine.ctx, 750, 528, 'grunt'));
    this.engine.enemies.push(new Enemy(this.engine.ctx, 1150, 528, 'grunt'));
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

    // 2구역: 결계 봉쇄전 (X=1400)
    if (px >= 1350 && !this.barrier1Cleared) {
      GameState.activeBarrierX = 1450;
      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1100, 528, 'archer'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1400, 534, 'rusher'));
        this.barrier1Cleared = true;
      }
    }

    // 결계 해제
    if (this.barrier1Cleared && GameState.activeBarrierX !== null) {
      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        GameState.activeBarrierX = null;
        this.engine.sound.playDrum();
      }
    }

    // 3구역: 먹 샘터 (X=2100)
    if (px > 2050 && px < 2150) {
      GameState.hp = Math.min(GameState.maxHp, GameState.hp + 20 * dt);
      GameState.ink = Math.min(GameState.maxInk, GameState.ink + 30 * dt);
    }

    // 4구역: 최종 결전 (X=2800)
    if (px >= 2750 && !this.bossSpawned) {
      this.bossSpawned = true;
      GameState.activeBarrierX = 3700;
      this.engine.sound.playDrum();
      if (GameState.stage === 3) {
        this.engine.boss = new Boss(this.engine.ctx, 3350, 470);
      } else {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3200, 534, 'rusher'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3400, 528, 'archer'));
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
      this.startStage(GameState.chapter + 1, 1);
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
