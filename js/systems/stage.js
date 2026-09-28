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
  }

  startStage(chapter, stage) {
    GameState.chapter = chapter;
    GameState.stage = stage;
    GameState.resetForStage();
    GameState.mode = 'STAGE_INTRO';
    this.introTimer = 2.5;

    // 카메라 및 결계 완전 0점 리셋 (화면 갇힘 방지)
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

    // 1구역: 탐색로 적 배치
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

    // 2구역: 결계 봉쇄전 (X=1450 도달 시 전방/후방 차단 닫힌 아레나)
    if (px >= 1350 && !this.barrier1Cleared) {
      GameState.activeBarrierX = 1450;
      GameState.minBarrierX = 900; // 후방 퇴로 차단

      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        // 안전거리(SAFE_MARGIN=160)를 확보하여 결계로부터 멀리 떨어진 위치에 적 스폰
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1050, 528, 'archer'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1180, 534, 'rusher'));
        this.barrier1Cleared = true;
      }
    }

    // 2구역 결계 해제
    if (this.barrier1Cleared && GameState.activeBarrierX === 1450) {
      if (this.engine.enemies.filter(e => !e.isDead).length === 0) {
        GameState.activeBarrierX = null;
        GameState.minBarrierX = null;
        this.engine.sound.playDrum();
      }
    }

    // 3구역: 여백과 회복의 먹 샘터 (X=2050 ~ 2200)
    if (px > 2050 && px < 2200) {
      GameState.hp = Math.min(GameState.maxHp, GameState.hp + 22 * dt);
      GameState.ink = Math.min(GameState.maxInk, GameState.ink + 35 * dt);
    }

    // 4구역: 최종 결전 (X=2750 도달 시 아레나 봉쇄)
    if (px >= 2750 && !this.bossSpawned) {
      this.bossSpawned = true;
      GameState.activeBarrierX = 3700;
      GameState.minBarrierX = 2650; // 후방 퇴로 봉쇄
      this.engine.sound.playDrum();

      if (GameState.stage === 3) {
        this.engine.boss = new Boss(this.engine.ctx, 3350, 470);
      } else {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3100, 534, 'rusher'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 3300, 528, 'archer'));
      }
    }

    // 결전 승리 판정
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
        // 전 챕터 완결 시 1챕터로 순환
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
