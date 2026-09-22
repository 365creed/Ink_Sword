import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { GameState } from '../core/state.js';

export class StageSystem {
  constructor(engine) {
    this.engine = engine;
    this.wave = 1;
    this.waveTimer = 0;
    this.waveCleared = false;
  }

  update(dt) {
    if (GameState.isGameOver || GameState.isVictory) return;

    this.waveTimer += dt;

    // 웨이브 1: 묵객(근접) 2마리
    if (this.wave === 1 && this.engine.enemies.length === 0 && !this.engine.boss) {
      if (this.waveTimer > 1.5) {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1100, 530, 'grunt'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 150, 530, 'grunt'));
        this.wave = 2;
        this.waveTimer = 0;
      }
    }
    // 웨이브 2: 궁수 1마리 + 도깨비 1마리
    else if (this.wave === 2 && this.engine.enemies.length === 0 && !this.engine.boss) {
      if (this.waveTimer > 2.0) {
        this.engine.enemies.push(new Enemy(this.engine.ctx, 1150, 535, 'archer'));
        this.engine.enemies.push(new Enemy(this.engine.ctx, 100, 545, 'rusher'));
        this.wave = 3;
        this.waveTimer = 0;
      }
    }
    // 웨이브 3: 보스 「흑면장」 등장!
    else if (this.wave === 3 && this.engine.enemies.length === 0 && !this.engine.boss) {
      if (this.waveTimer > 2.5) {
        this.engine.sound.playDrum();
        this.engine.boss = new Boss(this.engine.ctx, 1050, 475);
        this.wave = 4;
      }
    }
    // 보스 처치 시 스테이지 승리 판정
    else if (this.engine.boss && this.engine.boss.isDead) {
      GameState.isVictory = true;
    }
  }

  // S/A/B/C 랭크 계산
  calculateRank() {
    let score = GameState.parries * 300 + GameState.maxCombo * 100 - GameState.hitsTaken * 150;
    if (GameState.hitsTaken === 0) return 'SS';
    if (score > 1500) return 'S';
    if (score > 900) return 'A';
    if (score > 400) return 'B';
    return 'C';
  }
}
