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

  damageTarget(target, amount, dir = 1, isHeavy = false) {
    if (target.isDead) return;

    target.hp -= amount;
    target.hitFlashTimer = 0.12;
    this.lastKillElapsed = 0;

    Engine.triggerHitImpact(isHeavy ? 0.08 : 0.04, isHeavy ? 11 : 6, 0.15);
    InkEffects.spawnSplash(target.x, target.y, isHeavy ? 18 : 10, '#141413', 1.1);
    InkEffects.spawnSplash(target.x, target.y, 6, '#c92a2a', 0.9);

    if (target.hp <= 0) {
      target.isDead = true;
      SoundSystem.playHit(true);
      InkEffects.spawnSplash(target.x, target.y, 28, '#141413', 1.5);
      InkEffects.addStain(target.x, target.y + target.height * 0.4, 24, '#9e1b1b');

      GameState.addKarma(12);

      if (GameState.hasSeal('reaper_brush')) {
        GameState.playerStats.hp = Math.min(
          GameState.playerStats.maxHp,
          GameState.playerStats.hp + GameState.playerStats.maxHp * 0.05
        );
      }

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

    if (keys.attackJustPressed || keys.attackJustReleased) {
      this.props.forEach((pr) => {
        if (
          !pr.destroyed &&
          Math.hypot(this.player.x - pr.x, this.player.y - pr.y) < 95
        ) {
          pr.destroyed = true;
          SoundSystem.playHit(true);
          InkEffects.spawnSplash(pr.x, pr.y, 20, '#141413', 1.2);
          GameState.addKarma(8);
          GameState.playerStats.hp = Math.min(
            GameState.playerStats.maxHp,
            GameState.playerStats.hp + 10
          );
        }
      });
    }

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

    this.enemies.forEach((en) => en.update(dt, this.player, this));
    if (this.boss && !this.boss.isDead) {
      this.boss.update(dt, this.player, this);
    }

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

    InkEffects.update(dt, this.platforms);
    BrushEffects.update(dt, this.enemies, this.boss, (target, dmg, dir) => {
      this.damageTarget(target, dmg, dir, true);
    });

    this._evaluatePaintingRule(dt);

    if (this.player.y > 820 || GameState.playerStats.hp <= 0) {
      this._triggerDeathAndRepaint();
    }

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
      if (!this.player.onGround && this.player.onWall === 0) {
        this.ruleViolationTimer += dt * voidStepReduction;
      } else {
        this.ruleViolationTimer = Math.max(0, this.ruleViolationTimer - dt * 2.2);
      }
    } else if (rule.id === 'STILLNESS_CURSE') {
      if (Math.abs(this.player.vx) < 25 && Math.abs(this.player.vy) < 25) {
        this.ruleViolationTimer += dt;
      } else {
        this.ruleViolationTimer = Math.max(0, this.ruleViolationTimer - dt * 2.5);
      }
    } else if (rule.id === 'BLOOD_TAX') {
      this.lastKillElapsed += dt;
      this.ruleViolationTimer = this.lastKillElapsed;
    }

    const ratio = Math.min(1.0, this.ruleViolationTimer / rule.maxPenaltyTime);
    GameState.playerStats.rulePenaltyRatio = ratio;

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

    this.platforms.forEach((p) => {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (sx + p.w < -50 || sx > 1330) return;

      ctx.fillStyle = '#141413';
      ctx.fillRect(sx, sy, p.w, p.h);

      ctx.strokeStyle = '#3d3b38';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 2);
      ctx.lineTo(sx + p.w, sy + 2);
      ctx.stroke();
    });

    this.props.forEach((pr) => {
      if (pr.destroyed) return;
      const sx = pr.x - camera.x;
      const sy = pr.y - camera.y;

      ctx.fillStyle = '#3d3b38';
      ctx.fillRect(sx - 14, sy - 36, 28, 56);
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(sx - 8, sy - 26, 16, 14);
    });

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

    this.projectiles.forEach((p) => {
      const px = p.x - camera.x;
      const py = p.y - camera.y;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    this.enemies.forEach((en) => en.render(ctx, camera));
    if (this.boss && !this.boss.isDead) {
      this.boss.render(ctx, camera);
    }
    this.player.render(ctx, camera);

    ctx.restore();
  }
}
