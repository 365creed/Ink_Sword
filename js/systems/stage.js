import { GameState } from '../core/state.js';
import { StorageSystem } from '../core/storage.js';
import { SoundSystem } from '../core/sound.js';
import { Engine } from '../core/engine.js';
import { InkEffects } from '../effects/ink.js';
import { BrushEffects } from '../effects/brush.js';
import { Player } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { AuthSystem } from './auth.js';
import { StorySystem } from './story.js';

export class StageManager {
  constructor(stageConfig, onStageClearCallback) {
    this.config = stageConfig;
    this.onStageClear = onStageClearCallback;

    this.platforms = stageConfig.platforms.map((p) => ({ ...p }));
    this.grapplePoints = stageConfig.grapplePoints.map((g) => ({ ...g }));
    this.props = (stageConfig.props || []).map((pr) => ({ ...pr, destroyed: false, hp: 30 }));
    this.memoryItem = stageConfig.memoryItem ? { ...stageConfig.memoryItem, collected: false } : null;

    if (
      this.memoryItem &&
      GameState.saveData.collectedMemories.includes(this.memoryItem.id)
    ) {
      this.memoryItem.collected = true;
    }

    this.player = new Player(stageConfig.playerSpawn.x, stageConfig.playerSpawn.y);
    this.enemies = (stageConfig.enemies || []).map((e) => new Enemy(e.x, e.y, e.type));
    this.boss = stageConfig.boss
      ? new Boss(stageConfig.boss.x, stageConfig.boss.y, stageConfig.boss)
      : null;

    this.projectiles = [];
    this.ruleViolationTimer = 0;
    this.lastKillElapsed = 0;
    this.isReviving = false;
    this.cleared = false;

    // HUD에 현재 화폭의 금기 정보 반영
    GameState.currentRule = stageConfig.rule;
    const ruleTitleEl = document.getElementById('active-rule-title');
    const ruleDescEl = document.getElementById('active-rule-desc');
    if (ruleTitleEl) ruleTitleEl.textContent = stageConfig.rule.title;
    if (ruleDescEl) ruleDescEl.textContent = stageConfig.rule.desc;

    if (!this.boss) {
      document.getElementById('boss-hud')?.classList.add('hidden');
    }
  }

  spawnProjectile(proj) {
    this.projectiles.push({
      x: proj.x,
      y: proj.y,
      vx: proj.vx,
      vy: proj.vy,
      damage: proj.damage || 15,
      color: proj.color || '#141413',
      fromEnemy: proj.fromEnemy ?? true,
      dead: false
    });
  }

  // 적, 보스, 또는 화폭 기물 타격 처리
  damageTarget(target, amount, dir = 1, isHeavy = false) {
    if (target.isDead) return;

    target.hp -= amount;
    target.hitFlashTimer = 0.12;
    this.lastKillElapsed = 0; // 살생의 금기 타이머 초기화

    Engine.triggerHitImpact(isHeavy ? 0.08 : 0.04, isHeavy ? 11 : 6, 0.15);
    InkEffects.spawnSplash(target.x, target.y, isHeavy ? 18 : 10, '#141413', 1.1);
    InkEffects.spawnSplash(target.x, target.y, 6, '#c92a2a', 0.9);

    if (target.hp <= 0) {
      target.isDead = true;
      SoundSystem.playHit(true);
      InkEffects.spawnSplash(target.x, target.y, 28, '#141413', 1.5);
      InkEffects.addStain(target.x, target.y + target.height * 0.4, 24, '#9e1b1b');

      // 적 처치 시 혈묵(업보) 누적
      GameState.addKarma(12);

      // 탈혼필의 낙관 장착 시 체력 5% 즉시 회복
      if (GameState.hasSeal('reaper_brush')) {
        GameState.playerStats.hp = Math.min(
          GameState.playerStats.maxHp,
          GameState.playerStats.hp + GameState.playerStats.maxHp * 0.05
        );
      }

      // 보스 처치 시 엔딩 분기 실행
      if (target === this.boss && !this.cleared) {
        this.cleared = true;
        document.getElementById('boss-hud')?.classList.add('hidden');
        this._triggerEndingSequence();
      }
    } else {
      SoundSystem.playHit(false);
      if (target !== this.boss) {
        target.vx = dir * 220;
        target.vy = -160;
      }
    }
  }

  _triggerEndingSequence() {
    StorageSystem.saveCurrentSlot();
    const hasAllMemories = GameState.saveData.collectedMemories.length >= 4;
    const lowDeaths = GameState.saveData.deathCount <= 5;
    const endingScript = hasAllMemories && lowDeaths ? 'ENDING_TRUE' : 'ENDING_MADNESS';

    setTimeout(() => {
      StorySystem.playScript(endingScript, () => {
        if (this.onStageClear) this.onStageClear(true);
      });
    }, 900);
  }

  update(dt, keys) {
    if (this.isReviving || this.cleared) return;

    this.player.update(dt, keys, this);

    // 1. 화폭 기물(석등, 정자 기둥) 파괴 판정 (공격 중 근처 기물 분쇄)
    if (keys.attackJustPressed || keys.attackJustReleased) {
      this.props.forEach((pr) => {
        if (
          !pr.destroyed &&
          Math.hypot(this.player.x - pr.x, this.player.y - pr.y) < 95
        ) {
          pr.destroyed = true;
          SoundSystem.playHit(true);
          InkEffects.spawnSplash(pr.x, pr.y, 20, '#141413', 1.2);
          GameState.addKarma(8); // 화폭을 부술수록 혈묵 증가
          GameState.playerStats.hp = Math.min(
            GameState.playerStats.maxHp,
            GameState.playerStats.hp + 10
          );
        }
      });
    }

    // 2. 고서화 잔편(아이의 기억 조각) 획득 판정
    if (
      this.memoryItem &&
      !this.memoryItem.collected &&
      Math.hypot(this.player.x - this.memoryItem.x, this.player.y - this.memoryItem.y) < 48
    ) {
      this.memoryItem.collected = true;
      SoundSystem.playParry();
      InkEffects.spawnSplash(this.memoryItem.x, this.memoryItem.y, 24, '#c59b27', 1.3);
      if (!GameState.saveData.collectedMemories.includes(this.memoryItem.id)) {
        GameState.saveData.collectedMemories.push(this.memoryItem.id);
        StorageSystem.saveCurrentSlot();
        AuthSystem.refreshAllUI();
      }
    }

    // 3. 적 & 보스 업데이트
    this.enemies.forEach((en) => en.update(dt, this.player, this));
    if (this.boss && !this.boss.isDead) {
      this.boss.update(dt, this.player, this);
    }

    // 4. 투사체 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.fromEnemy) {
        if (
          Math.abs(p.x - this.player.x) < 22 &&
          Math.abs(p.y - this.player.y) < 28
        ) {
          this.player.takeDamage(p.damage, Math.sign(p.vx) || -1);
          p.dead = true;
        }
      } else {
        // 금묵으로 패링된 투사체가 적/보스를 타격
        const targets = [...this.enemies];
        if (this.boss && !this.boss.isDead) targets.push(this.boss);
        for (const t of targets) {
          if (!t.isDead && Math.abs(p.x - t.x) < 30 && Math.abs(p.y - t.y) < 35) {
            this.damageTarget(t, p.damage * 2.2, Math.sign(p.vx), true);
            p.dead = true;
            break;
          }
        }
      }

      if (p.dead || Math.abs(p.x - this.player.x) > 1400) {
        this.projectiles.splice(i, 1);
      }
    }

    // 5. 이펙트 업데이트
    InkEffects.update(dt, this.platforms);
    BrushEffects.update(dt, this.enemies, this.boss, (target, dmg, dir) => {
      this.damageTarget(target, dmg, dir, true);
    });

    // 6. 화폭의 금기(수묵화 세계 규칙) 실시간 판정 및 패널티 적용
    this._evaluatePaintingRule(dt);

    // 7. 낙사(화폭 아래 여백 추락) 또는 체력 0 도달 시 '탈묵 및 덧칠 부활' 실행
    if (this.player.y > 820 || GameState.playerStats.hp <= 0) {
      this._triggerDeathAndRepaint();
    }

    // 8. 다음 화폭 이동 포털(족자 문) 도달 판정
    if (
      this.config.goalPortal &&
      Math.hypot(
        this.player.x - this.config.goalPortal.x,
        this.player.y - this.config.goalPortal.y
      ) < 56
    ) {
      this.cleared = true;
      SoundSystem.playParry();
      if (this.onStageClear) this.onStageClear(false);
    }
  }

  _evaluatePaintingRule(dt) {
    const rule = GameState.currentRule;
    const voidStepReduction = GameState.hasSeal('void_step') ? 0.5 : 1.0;

    if (rule.id === 'VOID_EROSION') {
      // 여백의 금기: 먹물 발판에서 떨어져 백지(공중)에 머물면 게이지 상승
      if (!this.player.onGround && this.player.onWall === 0) {
        this.ruleViolationTimer += dt * voidStepReduction;
      } else {
        this.ruleViolationTimer = Math.max(0, this.ruleViolationTimer - dt * 2.2);
      }
    } else if (rule.id === 'STILLNESS_CURSE') {
      // 정중동의 금기: 멈춰 있으면 몸이 배경 수묵화로 굳어짐
      if (Math.abs(this.player.vx) < 25 && Math.abs(this.player.vy) < 25) {
        this.ruleViolationTimer += dt;
      } else {
        this.ruleViolationTimer = Math.max(0, this.ruleViolationTimer - dt * 2.5);
      }
    } else if (rule.id === 'BLOOD_TAX') {
      // 살생의 금기: 적을 베지 않고 시간이 흐르면 자신의 피가 마름
      this.lastKillElapsed += dt;
      this.ruleViolationTimer = this.lastKillElapsed;
    }

    const ratio = Math.min(1.0, this.ruleViolationTimer / rule.maxPenaltyTime);
    GameState.playerStats.rulePenaltyRatio = ratio;

    // 금기 한계치 도달 시 지속 탈묵 데미지!
    if (ratio >= 1.0) {
      GameState.playerStats.hp = Math.max(0, GameState.playerStats.hp - 18 * dt);
      if (Math.random() < 0.25) {
        InkEffects.spawnSplash(this.player.x, this.player.y, 2, '#c92a2a', 0.5);
      }
    }
  }

  _triggerDeathAndRepaint() {
    this.isReviving = true;
    SoundSystem.playRepaintRevive();

    BrushEffects.triggerRepaintRevive(() => {
      GameState.recordDeathAndRepaint();
      StorageSystem.saveCurrentSlot();
      AuthSystem.refreshAllUI();

      this.player.resetToSpawn();
      this.ruleViolationTimer = 0;
      this.lastKillElapsed = 0;
      this.isReviving = false;
    });
  }

  render(ctx, camera) {
    ctx.save();

    // 1. 수묵 발판(플랫폼) 렌더링 (거친 먹물 붓터치 질감)
    this.platforms.forEach((p) => {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (sx + p.w < -50 || sx > 1330) return;

      ctx.fillStyle = '#141413';
      ctx.fillRect(sx, sy, p.w, p.h);

      // 상단 갈필 테두리 및 인주 포인트
      ctx.strokeStyle = '#3d3b38';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 2);
      ctx.lineTo(sx + p.w, sy + 2);
      ctx.stroke();
    });

    // 2. 파괴 가능한 화폭 기물(석등, 정자 기둥) 렌더링
    this.props.forEach((pr) => {
      if (pr.destroyed) return;
      const sx = pr.x - camera.x;
      const sy = pr.y - camera.y;

      ctx.fillStyle = '#3d3b38';
      ctx.fillRect(sx - 14, sy - 36, 28, 56);
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(sx - 8, sy - 26, 16, 14);
    });

    // 3. 산나비식 묵사슬 고리(허공의 묵점) 렌더링
    this.grapplePoints.forEach((g) => {
      const sx = g.x - camera.x;
      const sy = g.y - camera.y;

      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#c92a2a';
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. 고서화 잔편(기억 조각 아이템) 렌더링
    if (this.memoryItem && !this.memoryItem.collected) {
      const mx = this.memoryItem.x - camera.x;
      const my = this.memoryItem.y - camera.y + Math.sin(performance.now() * 0.005) * 6;

      ctx.fillStyle = '#c59b27';
      ctx.fillRect(mx - 14, my - 18, 28, 36);
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 14, my - 18, 28, 36);

      ctx.fillStyle = '#141413';
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('憶', mx, my + 5);
    }

    // 5. 다음 화폭 이동 포털 (붉은 낙관 족자 문)
    if (this.config.goalPortal) {
      const gx = this.config.goalPortal.x - camera.x;
      const gy = this.config.goalPortal.y - camera.y;

      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 5;
      ctx.strokeRect(gx - 28, gy - 48, 56, 96);
      ctx.fillStyle = 'rgba(201, 42, 42, 0.22)';
      ctx.fillRect(gx - 28, gy - 48, 56, 96);

      ctx.fillStyle = '#c92a2a';
      ctx.font = 'bold 28px "East Sea Dokdo", serif';
      ctx.textAlign = 'center';
      ctx.fillText('次幅', gx, gy + 8);
    }

    // 6. 투사체 렌더링
    this.projectiles.forEach((p) => {
      const px = p.x - camera.x;
      const py = p.y - camera.y;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. 적, 보스, 플레이어 렌더링
    this.enemies.forEach((en) => en.render(ctx, camera));
    if (this.boss && !this.boss.isDead) {
      this.boss.render(ctx, camera);
    }
    this.player.render(ctx, camera);

    ctx.restore();
  }
}import { CHAPTER_DATA } from './stageData.js';
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
    this.platforms = (stData && stData.platforms) ? stData.platforms : [];

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

    // 2구역: 묵계 결계 봉쇄전 (X = 1450)
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
    if (StorageManager && typeof StorageManager.save === 'function') {
      StorageManager.save();
    }
  }

  nextStage() {
    if (GameState.stage < 3) {
      this.startStage(GameState.chapter, GameState.stage + 1);
    } else {
      const nextCh = GameState.chapter + 1;
      if (CHAPTER_DATA && CHAPTER_DATA[nextCh]) {
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
