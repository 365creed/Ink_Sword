import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { GameState } from '../core/state.js';
import { StorageManager } from '../core/storage.js';

export class StageSystem {
  constructor(engine) {
    this.engine = engine;
    this.wave = 1;
    this.waveTimer = 0;
    this.introTimer = 0;
  }

  // 1. 프롤로그 ➔ 튜토리얼 시작
  startPrologue() {
    GameState.mode = 'PROLOGUE';
  }

  // 2. 스테이지 인트로 ➔ 전투 진입
  startStage(chapter, stage) {
    GameState.chapter = chapter;
    GameState.stage = stage;
    GameState.resetForStage();
    GameState.mode = 'STAGE_INTRO';
    this.introTimer = 2.8; // 2.8초간 수묵 장(Chapter) 소개 연출
    this.wave = 1;
    this.waveTimer = 0;
    this.engine.enemies = [];
    this.engine.boss = null;
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

    this.waveTimer += dt;

    if (GameState.stage === 1) {
      // 1막: 묵객 무리
      if (this.wave === 1 && this.engine.enemies.length === 0) {
        if (this.waveTimer > 1.2) {
          this.engine.enemies.push(new Enemy(this.engine.ctx, 1100, 528, 'grunt'));
          this.wave = 2;
          this.waveTimer = 0;
        }
      } else if (this.wave === 2 && this.engine.enemies.length === 0) {
        if (this.waveTimer > 1.5) {
          this.engine.enemies.push(new Enemy(this.engine.ctx, 1120, 528, 'grunt'));
          this.engine.enemies.push(new Enemy(this.engine.ctx, 140, 528, 'grunt'));
          this.wave = 3;
        }
      } else if (this.wave === 3 && this.engine.enemies.length === 0) {
        this.finishStage();
      }
    } else if (GameState.stage === 2) {
      // 2막: 궁수 및 도깨비 습격
      if (this.wave === 1 && this.engine.enemies.length === 0) {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1150, 534, 'archer'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 120, 542, 'rusher'));
        this.wave = 2;
      } else if (this.wave === 2 && this.engine.enemies.length === 0) {
        this.finishStage();
      }
    } else if (GameState.stage === 3) {
      // 3막: 보스전 흑면장
      if (this.wave === 1 && !this.engine.boss) {
        if (this.waveTimer > 1.5) {
          this.engine.sound.playDrum();
          this.engine.boss = new Boss(this.engine.ctx, 1040, 472);
          this.wave = 2;
        }
      } else if (this.engine.boss && this.engine.boss.isDead) {
        this.finishStage();
      }
    }
  }

  finishStage() {
    const elapsedSec = Math.floor((Date.now() - GameState.stageStartTime) / 1000);
    const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const s = String(elapsedSec % 60).padStart(2, '0');
    GameState.clearTimeStr = `${m}:${s}`;
    GameState.mode = 'STAGE_RESULT';
    StorageManager.save();
  }

  // 다음 장으로 이동
  nextStage() {
    if (GameState.stage < 3) {
      this.startStage(GameState.chapter, GameState.stage + 1);
    } else {
      // 다음 챕터 (제2장 강북) 진입
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
