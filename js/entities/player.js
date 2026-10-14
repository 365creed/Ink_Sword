import { GameState } from '../core/state.js';
import { SoundSystem } from '../core/sound.js';
import { InkEffects } from '../effects/ink.js';
import { BrushEffects } from '../effects/brush.js';
import { Engine } from '../core/engine.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.width = 34;
    this.height = 56;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: 우측, -1: 좌측

    // 지형 및 점프 상태
    this.onGround = false;
    this.onWall = 0;
    this.jumpCount = 0;
    this.maxJumps = 1;

    // 묵영보(대시) 상태
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.afterimageTimer = 0;

    // 묵검술(공격 & 차지 발도) 상태
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.attackCooldown = 0;
    this.slashAnimTimer = 0; // 검 휘두르기 모션 타이머
    this.parryWindowTimer = 0;
    this.invincibleTimer = 0;

    // 산나비 스타일 묵사슬(Ink Chain) 상태
    this.chain = {
      state: 'IDLE',
      targetX: 0,
      targetY: 0,
      targetEntity: null,
      length: 0,
      cooldown: 0,
      maxRange: 460
    };

    // 물리 기반 휘날리는 붉은 목도리 & 장발 노드 (록맨 제로 + 산나비 감성)
    this.scarfNodes = Array.from({ length: 10 }, () => ({ x: this.x, y: this.y }));
    this.hairNodes = Array.from({ length: 7 }, () => ({ x: this.x, y: this.y }));
    this.eyeTrail = []; // 붉은 안광 잔상

    this.animTime = 0;
  }

  resetToSpawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.chain.state = 'IDLE';
    this.invincibleTimer = 1.2;
    this.scarfNodes.forEach((n) => { n.x = this.x; n.y = this.y; });
    this.hairNodes.forEach((n) => { n.x = this.x; n.y = this.y; });
    this.eyeTrail = [];
  }

  update(dt, keys, stage) {
    this.animTime += dt;
    const ink = GameState.getActiveInk();

    this.maxJumps = GameState.hasSeal('void_step') ? 2 : 1;
    const frenzyBonus =
      GameState.hasSeal('blood_frenzy') && GameState.playerStats.karma >= 50 ? 1.3 : 1.0;
    const moveSpeed = 330 * ink.speedMul * frenzyBonus;

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.slashAnimTimer > 0) this.slashAnimTimer -= dt;
    if (this.comboResetTimer > 0) this.comboResetTimer -= dt;
    else this.comboStep = 0;
    if (this.parryWindowTimer > 0) this.parryWindowTimer -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.chain.cooldown > 0) this.chain.cooldown -= dt;

    const chainHud = document.getElementById('chain-status');
    if (chainHud) {
      chainHud.textContent =
        this.chain.cooldown > 0 ? `${this.chain.cooldown.toFixed(1)}초` : '준비됨';
    }

    // 1. 묵사슬 기동
    this._handleChainAction(dt, keys, stage, ink, frenzyBonus);

    // 2. 대시(묵영보)
    if (keys.dashJustPressed && this.dashCooldown <= 0 && this.chain.state === 'IDLE') {
      this.isDashing = true;
      this.dashTimer = 0.19;
      this.dashCooldown = 0.42 * ink.chainCooldownMul;
      this.vx = this.facing * 780 * ink.speedMul;
      this.vy = 0;
      SoundSystem.playDash();
      InkEffects.spawnSplash(this.x, this.y, 12, ink.color, 0.9);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 0.03;
        InkEffects.spawnAfterimage({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          facing: this.facing,
          color: ink.trailColor
        });
      }
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // 3. 일반 이동 및 벽 슬라이딩
    if (!this.isDashing && this.chain.state === 'IDLE') {
      if (keys.left) {
        this.vx = -moveSpeed;
        this.facing = -1;
      } else if (keys.right) {
        this.vx = moveSpeed;
        this.facing = 1;
      } else {
        this.vx *= Math.pow(0.001, dt);
      }

      let gravity = 1350;
      if (this.onWall !== 0 && this.vy > 0) {
        gravity = 300;
        if (Math.random() < 0.35) {
          InkEffects.spawnSplash(
            this.x + this.onWall * (this.width * 0.5),
            this.y,
            1,
            '#3d3b38',
            0.3
          );
        }
      }
      this.vy = Math.min(900, this.vy + gravity * dt);
    }

    // 4. 점프 및 벽 차기
    if (keys.jumpJustPressed) {
      if (this.chain.state !== 'IDLE') {
        this.chain.state = 'IDLE';
        this.vy = -590;
        this.vx *= 1.25;
        SoundSystem.playDash();
        InkEffects.spawnSplash(this.x, this.y, 14, ink.color, 1.1);
      } else if (this.onGround) {
        this.vy = -565;
        this.onGround = false;
        this.jumpCount = 1;
        InkEffects.spawnSplash(this.x, this.y + this.height * 0.5, 8, '#141413', 0.6);
      } else if (this.onWall !== 0) {
        this.vy = -545;
        this.vx = -this.onWall * 470;
        this.facing = -this.onWall;
        this.isDashing = false;
        SoundSystem.playDash();
        InkEffects.spawnSplash(
          this.x + this.onWall * (this.width * 0.5),
          this.y,
          10,
          ink.color,
          0.9
        );
      } else if (this.jumpCount < this.maxJumps) {
        this.vy = -515;
        this.jumpCount++;
        InkEffects.spawnSplash(this.x, this.y + this.height * 0.5, 14, ink.color, 0.9);
      }
    }

    // 5. 검격 및 발도술
    this._handleSwordAttack(keys, stage, ink, frenzyBonus);

    // 6. 지형 물리 이동
    this._moveAndCollide(dt, stage.platforms);

    // 7. 목도리, 장발, 안광 잔상 물리 업데이트
    this._updateClothAndHairPhysics(dt);
  }

  _updateClothAndHairPhysics(dt) {
    // 목도리 시작점 (어깨 뒤쪽)
    const anchorX = this.x - this.facing * 6;
    const anchorY = this.y - 12;

    this.scarfNodes[0].x = anchorX;
    this.scarfNodes[0].y = anchorY;

    for (let i = 1; i < this.scarfNodes.length; i++) {
      const prev = this.scarfNodes[i - 1];
      const cur = this.scarfNodes[i];

      // 바람 및 이동 반대 방향 관성 적용
      const windX = -this.facing * 45 + Math.sin(this.animTime * 16 - i * 0.7) * 25;
      const windY = Math.cos(this.animTime * 12 - i * 0.5) * 18 - 10;

      cur.x += (prev.x - cur.x) * Math.min(1, dt * 26) + windX * dt;
      cur.y += (prev.y - cur.y) * Math.min(1, dt * 26) + windY * dt;

      // 마디 간 최대 거리 유지
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxDist = 5.5;
      if (dist > maxDist) {
        cur.x = prev.x + (dx / dist) * maxDist;
        cur.y = prev.y + (dy / dist) * maxDist;
      }
    }

    // 은발/흑발 장발 물리 업데이트
    this.hairNodes[0].x = this.x - this.facing * 4;
    this.hairNodes[0].y = this.y - 18;
    for (let i = 1; i < this.hairNodes.length; i++) {
      const prev = this.hairNodes[i - 1];
      const cur = this.hairNodes[i];
      const windX = -this.facing * 35 + Math.sin(this.animTime * 18 - i) * 15;
      cur.x += (prev.x - cur.x) * Math.min(1, dt * 28) + windX * dt;
      cur.y += (prev.y - cur.y + 3) * Math.min(1, dt * 28);
    }

    // 붉은 안광 궤적 기록
    this.eyeTrail.unshift({
      x: this.x + this.facing * 7,
      y: this.y - 16 + (Math.abs(this.vx) > 150 ? 3 : 0),
      life: 0.16
    });
    for (let i = this.eyeTrail.length - 1; i >= 0; i--) {
      this.eyeTrail[i].life -= dt;
      if (this.eyeTrail[i].life <= 0) this.eyeTrail.splice(i, 1);
    }
  }

  _handleChainAction(dt, keys, stage, ink, frenzyBonus) {
    const maxRange = this.chain.maxRange * frenzyBonus;

    if (keys.chainJustPressed && this.chain.cooldown <= 0) {
      SoundSystem.playChainThrow();

      const aimX = keys.worldMouseX || this.x + this.facing * 220;
      const aimY = keys.worldMouseY || this.y - 140;

      let bestPoint = null;
      let bestDist = maxRange;

      stage.grapplePoints.forEach((pt) => {
        const dPlayer = Math.hypot(pt.x - this.x, pt.y - this.y);
        const dAim = Math.hypot(pt.x - aimX, pt.y - aimY);
        if (dPlayer <= maxRange && dAim < bestDist) {
          bestDist = dAim;
          bestPoint = { type: 'POINT', x: pt.x, y: pt.y };
        }
      });

      const allEnemies = [...stage.enemies];
      if (stage.boss && !stage.boss.isDead) allEnemies.push(stage.boss);

      allEnemies.forEach((en) => {
        if (en.isDead) return;
        const dPlayer = Math.hypot(en.x - this.x, en.y - this.y);
        const dAim = Math.hypot(en.x - aimX, en.y - aimY);
        if (dPlayer <= maxRange && dAim < bestDist) {
          bestDist = dAim;
          bestPoint = { type: 'ENEMY', entity: en };
        }
      });

      if (bestPoint) {
        SoundSystem.playChainLatch();
        if (bestPoint.type === 'POINT') {
          this.chain.state = 'HOOKED_POINT';
          this.chain.targetX = bestPoint.x;
          this.chain.targetY = bestPoint.y;
          this.chain.length = Math.max(
            70,
            Math.hypot(bestPoint.x - this.x, bestPoint.y - this.y) * 0.8
          );
          InkEffects.spawnSplash(bestPoint.x, bestPoint.y, 10, ink.color, 0.8);
        } else {
          this.chain.state = 'PULL_ENEMY';
          this.chain.targetEntity = bestPoint.entity;
          InkEffects.spawnSplash(bestPoint.entity.x, bestPoint.entity.y, 12, '#c92a2a', 1.0);
        }
      } else {
        this.chain.cooldown = 0.25;
      }
    }

    if (this.chain.state === 'HOOKED_POINT') {
      if (!keys.chain) {
        this.chain.state = 'IDLE';
        this.chain.cooldown = 0.35 * ink.chainCooldownMul;
        return;
      }

      const dx = this.chain.targetX - this.x;
      const dy = this.chain.targetY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      this.vx += nx * 1650 * dt;
      this.vy += (ny * 1850 + 600) * dt;

      if (keys.left) this.vx -= 650 * dt;
      if (keys.right) this.vx += 650 * dt;

      if (GameState.hasSeal('chain_blade')) {
        this._checkChainDashSlash(stage, ink);
      }

      if (dist < 48) {
        this.chain.state = 'IDLE';
        this.vy = -420;
        this.chain.cooldown = 0.4 * ink.chainCooldownMul;
      }
    } else if (this.chain.state === 'PULL_ENEMY') {
      const en = this.chain.targetEntity;
      if (!en || en.isDead) {
        this.chain.state = 'IDLE';
        return;
      }

      const dx = en.x - this.x;
      const dy = en.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;

      this.facing = dx >= 0 ? 1 : -1;
      this.vx = (dx / dist) * 1150;
      this.vy = (dy / dist) * 1150;

      InkEffects.spawnAfterimage({
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        facing: this.facing,
        color: ink.trailColor
      });

      if (dist < 52) {
        this.chain.state = 'IDLE';
        this.chain.cooldown = 0.5 * ink.chainCooldownMul;
        this.vx = this.facing * 260;
        this.vy = -480;
        this.executeSlash(stage, ink, true);
      }
    }
  }

  _checkChainDashSlash(stage, ink) {
    const targets = [...stage.enemies];
    if (stage.boss && !stage.boss.isDead) targets.push(stage.boss);

    targets.forEach((t) => {
      if (
        !t.isDead &&
        Math.abs(this.x - t.x) < (this.width + t.width) * 0.65 &&
        Math.abs(this.y - t.y) < (this.height + t.height) * 0.65
      ) {
        stage.damageTarget(t, 22 * ink.atkMul, this.facing);
      }
    });
  }

  _handleSwordAttack(keys, stage, ink, frenzyBonus) {
    if (keys.attackJustPressed && this.attackCooldown <= 0) {
      this.executeSlash(stage, ink, false, frenzyBonus);
    }

    if (keys.attackJustReleased) {
      if (keys.attackHoldTime >= 0.45) {
        this.executeSlash(stage, ink, true, frenzyBonus);
      }
      keys.attackHoldTime = 0;
    }
  }

  executeSlash(stage, ink, isCharge = false, frenzyBonus = 1.0) {
    this.comboStep = isCharge ? 4 : (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.75;
    this.attackCooldown = (isCharge ? 0.3 : 0.15) / frenzyBonus;
    this.slashAnimTimer = 0.22;

    if (ink.id === 'gold') {
      this.parryWindowTimer = 0.24;
    }

    if (isCharge) {
      SoundSystem.playChargeSlash();
    } else {
      SoundSystem.playSlash(this.comboStep);
    }

    const slashRadius = isCharge ? 96 : 70;
    const startAng = this.facing > 0 ? -Math.PI * 0.5 : Math.PI * 1.5;
    const endAng = this.facing > 0 ? Math.PI * 0.5 : Math.PI * 0.5;

    BrushEffects.spawnSlashArc({
      x: this.x + this.facing * 20,
      y: this.y - 4,
      radius: slashRadius,
      startAngle: startAng,
      endAngle: endAng,
      dir: this.facing,
      color: isCharge ? '#c92a2a' : ink.color,
      isCharge
    });

    if (isCharge && GameState.hasSeal('slash_wave')) {
      BrushEffects.spawnSlashWave({
        x: this.x + this.facing * 42,
        y: this.y - 4,
        vx: this.facing * 760,
        color: ink.color === '#141413' ? '#c92a2a' : ink.color,
        damage: 40 * ink.atkMul * (GameState.playerStats.isBerserk ? 2 : 1)
      });
    }

    if (GameState.currentRule.id === 'BLOOD_TAX') {
      GameState.addKarma(2.5);
    }

    const reachX = isCharge ? 120 : 90;
    const reachY = isCharge ? 84 : 64;
    const hitCenterX = this.x + this.facing * (reachX * 0.5);
    const baseDmg = isCharge ? 45 : 18 + this.comboStep * 4;
    const finalDmg =
      baseDmg * ink.atkMul * (GameState.playerStats.isBerserk ? 2.0 : 1.0);

    const targets = [...stage.enemies];
    if (stage.boss && !stage.boss.isDead) targets.push(stage.boss);

    targets.forEach((t) => {
      if (t.isDead) return;
      if (
        Math.abs(hitCenterX - t.x) <= (reachX + t.width) * 0.5 &&
        Math.abs(this.y - t.y) <= (reachY + t.height) * 0.5
      ) {
        stage.damageTarget(t, finalDmg, this.facing, isCharge);
      }
    });

    stage.projectiles.forEach((proj) => {
      if (
        proj.fromEnemy &&
        Math.hypot(proj.x - hitCenterX, proj.y - this.y) < slashRadius + 24
      ) {
        if (ink.id === 'gold' || isCharge) {
          proj.fromEnemy = false;
          proj.vx = -proj.vx * 1.5;
          proj.vy = -proj.vy * 1.5;
          proj.color = '#c59b27';
          SoundSystem.playParry();
          Engine.triggerHitImpact(0.08, 10, 0.2);
        } else {
          proj.dead = true;
          InkEffects.spawnSplash(proj.x, proj.y, 6, '#141413', 0.6);
        }
      }
    });
  }

  takeDamage(amount, knockbackDir = -1) {
    if (this.invincibleTimer > 0) return;

    if (this.parryWindowTimer > 0) {
      SoundSystem.playParry();
      Engine.triggerHitImpact(0.1, 12, 0.25);
      InkEffects.spawnSplash(this.x, this.y, 20, '#c59b27', 1.3);
      this.invincibleTimer = 0.6;
      return;
    }

    if (GameState.playerStats.isBerserk) {
      if (GameState.hasSeal('ink_shield')) {
        GameState.playerStats.karma = 0;
        GameState.playerStats.isBerserk = false;
        this.invincibleTimer = 1.2;
        SoundSystem.playParry();
        InkEffects.spawnSplash(this.x, this.y, 24, '#141413', 1.4);
        return;
      } else {
        GameState.playerStats.hp = 0;
      }
    } else {
      GameState.playerStats.hp = Math.max(0, GameState.playerStats.hp - amount);
    }

    this.invincibleTimer = 0.85;
    this.vx = knockbackDir * 320;
    this.vy = -280;
    this.chain.state = 'IDLE';

    SoundSystem.playHit(false);
    Engine.triggerHitImpact(0.06, 9, 0.18);
    InkEffects.spawnSplash(this.x, this.y, 16, '#c92a2a', 1.1);
  }

  _moveAndCollide(dt, platforms) {
    this.x += this.vx * dt;
    this.onWall = 0;

    const halfW = this.width * 0.5;
    const halfH = this.height * 0.5;

    for (const p of platforms) {
      if (
        this.x + halfW > p.x &&
        this.x - halfW < p.x + p.w &&
        this.y + halfH > p.y + 4 &&
        this.y - halfH < p.y + p.h - 4
      ) {
        if (this.vx > 0) {
          this.x = p.x - halfW;
          this.vx = 0;
          this.onWall = 1;
        } else if (this.vx < 0) {
          this.x = p.x + p.w + halfW;
          this.vx = 0;
          this.onWall = -1;
        }
      }
    }

    this.y += this.vy * dt;
    this.onGround = false;

    for (const p of platforms) {
      if (
        this.x + halfW > p.x + 2 &&
        this.x - halfW < p.x + p.w - 2 &&
        this.y + halfH >= p.y &&
        this.y - halfH <= p.y + p.h
      ) {
        if (this.vy >= 0 && this.y - this.vy * dt + halfH <= p.y + 16) {
          this.y = p.y - halfH;
          this.vy = 0;
          this.onGround = true;
          this.jumpCount = 0;
        } else if (this.vy < 0 && !p.oneWay) {
          this.y = p.y + p.h + halfH;
          this.vy = 0;
        }
      }
    }
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const ink = GameState.getActiveInk();
    const deaths = GameState.saveData.deathCount;
    const isBerserk = GameState.playerStats.isBerserk;
    const bladeColor = ink.id === 'black' ? '#c92a2a' : ink.color;

    ctx.save();

    // 1. 산나비풍 묵사슬 & 회전 수리검 갈고리 렌더링 (월드 좌표 기반)
    if (this.chain.state !== 'IDLE') {
      const tx =
        (this.chain.state === 'HOOKED_POINT'
          ? this.chain.targetX
          : this.chain.targetEntity?.x || this.x) - camera.x;
      const ty =
        (this.chain.state === 'HOOKED_POINT'
          ? this.chain.targetY
          : this.chain.targetEntity?.y || this.y) - camera.y;

      // 사슬 본체 (이중 강철 묵선)
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx + this.facing * 8, sy - 4);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(sx + this.facing * 8, sy - 4);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // 끝부분 십자 클로(Claw) 작살 연출
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(this.animTime * 20);
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
      ctx.moveTo(0, -10); ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();
    }

    // 2. 물리 기반 휘날리는 붉은 비단 목도리 (월드 좌표로 자연스럽게 끌려옴)
    if (this.scarfNodes.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.scarfNodes[0].x - camera.x, this.scarfNodes[0].y - camera.y);
      for (let i = 1; i < this.scarfNodes.length; i++) {
        ctx.lineTo(this.scarfNodes[i].x - camera.x, this.scarfNodes[i].y - camera.y);
      }
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 목도리 끝단 먹물 그라데이션 선
      ctx.strokeStyle = '#5c0f0f';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 3. 흩날리는 은빛/백발 장발 (록맨 제로 감성)
    if (this.hairNodes.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.hairNodes[0].x - camera.x, this.hairNodes[0].y - camera.y);
      for (let i = 1; i < this.hairNodes.length; i++) {
        ctx.lineTo(this.hairNodes[i].x - camera.x, this.hairNodes[i].y - camera.y);
      }
      ctx.strokeStyle = '#dfd9cc';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // 4. 붉은 안광 잔상 궤적 (Eye Trail)
    if (this.eyeTrail.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.eyeTrail[0].x - camera.x, this.eyeTrail[0].y - camera.y);
      for (let i = 1; i < this.eyeTrail.length; i++) {
        ctx.lineTo(this.eyeTrail[i].x - camera.x, this.eyeTrail[i].y - camera.y);
      }
      ctx.strokeStyle = '#ff2a2a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 무적 시간 깜빡임
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // --- 여기서부터 캐릭터 본체 로컬 좌표계 렌더링 ---
    ctx.translate(sx, sy);
    ctx.scale(this.facing, 1);

    const isRunning = Math.abs(this.vx) > 90;
    const isAir = !this.onGround;
    const leanAngle = isRunning ? 0.24 : isAir ? -0.1 : 0;
    const breathe = Math.sin(this.animTime * 6) * 1.5;

    ctx.rotate(leanAngle);

    // 5. 덧칠(부활) 및 광폭화 시 피어오르는 야차의 흑염 아우라
    const corruptionLevel = Math.min(8, deaths) + (isBerserk ? 6 : 0);
    if (corruptionLevel > 0) {
      for (let i = 0; i < corruptionLevel; i++) {
        const ang = this.animTime * 6 + i * 1.1;
        const ox = Math.cos(ang) * (10 + i * 1.6);
        const oy = Math.sin(ang * 1.5) * (15 + i * 1.5) - 4;
        ctx.fillStyle = isBerserk ? 'rgba(201, 42, 42, 0.45)' : 'rgba(20, 20, 19, 0.4)';
        ctx.beginPath();
        ctx.arc(ox, oy, 5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. 다리 & 각반(정강이 갑주) 역동적 러닝 애니메이션
    const legSwing = isRunning ? Math.sin(this.animTime * 22) * 12 : isAir ? -6 : 0;

    // 뒷다리
    ctx.strokeStyle = '#262523';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(-6 - legSwing * 0.5, 18);
    ctx.lineTo(-8 - legSwing, 27);
    ctx.stroke();

    // 앞다리 + 붉은 매듭 각반
    ctx.strokeStyle = '#141413';
    ctx.beginPath();
    ctx.moveTo(3, 8);
    ctx.lineTo(6 + legSwing * 0.6, 18);
    ctx.lineTo(4 + legSwing, 27);
    ctx.stroke();

    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4 + legSwing * 0.8, 21);
    ctx.lineTo(7 + legSwing * 0.8, 23);
    ctx.stroke();

    // 7. 찢어진 흑묵 도포 하단 자락 (전투복 코트)
    ctx.fillStyle = '#141413';
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.lineTo(10, 2);
    ctx.lineTo(13 - legSwing * 0.3, 20);
    ctx.lineTo(4, 15);
    ctx.lineTo(-4, 22);
    ctx.lineTo(-16 - Math.abs(this.vx) * 0.02, 18);
    ctx.closePath();
    ctx.fill();

    // 8. 상체 흑철 흉갑 & 수묵 도포 (V자 깃과 붉은 허리띠)
    ctx.fillStyle = '#1e1d1b';
    ctx.beginPath();
    ctx.moveTo(-11, -13 + breathe);
    ctx.lineTo(11, -13 + breathe);
    ctx.lineTo(8, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();

    // 도포 붉은 안감 V라인
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -12 + breathe);
    ctx.lineTo(2, -1 + breathe);
    ctx.lineTo(7, -12 + breathe);
    ctx.stroke();

    // 금장/적색 요대(허리띠)
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(-9, 3, 18, 4);
    ctx.fillStyle = '#c59b27';
    ctx.fillRect(1, 2, 5, 6);

    // 왼쪽 어깨 비대칭 무사 견갑(Pauldron)
    ctx.fillStyle = '#141413';
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, -15 + breathe);
    ctx.lineTo(-2, -16 + breathe);
    ctx.lineTo(-5, -6 + breathe);
    ctx.lineTo(-16, -8 + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 9. 산나비 스타일 왼팔 '기계식 사슬 건틀릿(Chain Gauntlet)'
    ctx.fillStyle = '#3d3b38';
    ctx.fillRect(4, -5 + breathe, 11, 6);
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(11, -6 + breathe, 5, 8); // 사슬 사출구 붉은 코어

    // 10. 머리 & 날카로운 무사 삿갓(전립)
    ctx.fillStyle = '#2b2927';
    ctx.fillRect(-5, -22 + breathe, 11, 10); // 안면부 흑색 복면

    // 타오르는 붉은 안광
    ctx.fillStyle = '#ff1e1e';
    ctx.shadowColor = '#ff1e1e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(1, -18 + breathe);
    ctx.lineTo(9, -19 + breathe);
    ctx.lineTo(5, -15 + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 록맨 제로풍 날렵한 삿갓 (챙이 넓고 날카로운 형태 + 붉은 테두리)
    ctx.fillStyle = '#141413';
    ctx.beginPath();
    ctx.moveTo(-26, -19 + breathe);
    ctx.lineTo(26, -17 + breathe);
    ctx.lineTo(3, -31 + breathe);
    ctx.lineTo(-8, -29 + breathe);
    ctx.closePath();
    ctx.fill();

    // 삿갓 이마의 황금/인주 문양
    ctx.fillStyle = '#c59b27';
    ctx.beginPath();
    ctx.moveTo(4, -27 + breathe);
    ctx.lineTo(9, -20 + breathe);
    ctx.lineTo(1, -20 + breathe);
    ctx.closePath();
    ctx.fill();

    // 11. 록맨 제로 + 수묵풍 '묵광검(墨光劍 - 빛나는 대태도)'
    ctx.save();
    // 공격 중일 때는 전방으로 크게 휘두른 각도, 평소에는 등 뒤 아래로 비스듬히 역수 파지
    const isSlashing = this.slashAnimTimer > 0;
    const swordAngle = isSlashing
      ? (this.comboStep % 2 === 1 ? 0.45 : -0.55)
      : isRunning
      ? -0.25
      : 0;
    ctx.translate(0, -4 + breathe);
    ctx.rotate(swordAngle);

    // 검 코어 광선 네온 효과
    ctx.shadowColor = bladeColor;
    ctx.shadowBlur = 12;

    if (isSlashing) {
      // 전방 공격 포즈 검신
      ctx.fillStyle = '#c59b27';
      ctx.fillRect(6, -3, 6, 6); // 코등이(Tsuba)

      // 외곽 먹물 오라 검신
      ctx.beginPath();
      ctx.moveTo(12, -5);
      ctx.lineTo(54, -2);
      ctx.lineTo(64, 0);
      ctx.lineTo(54, 4);
      ctx.lineTo(12, 3);
      ctx.closePath();
      ctx.fillStyle = bladeColor;
      ctx.fill();

      // 내부 백색/묵색 하이라이트 코어
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(56, 0);
      ctx.lineTo(12, 1.5);
      ctx.closePath();
      ctx.fillStyle = '#fff5f5';
      ctx.fill();
    } else {
      // 평상시/질주 시 뒤쪽으로 길게 뻗은 발도 대기 포즈
      ctx.fillStyle = '#c59b27';
      ctx.fillRect(-8, 2, 5, 7); // 코등이

      ctx.beginPath();
      ctx.moveTo(-8, 3);
      ctx.lineTo(-50, 14);
      ctx.lineTo(-58, 18);
      ctx.lineTo(-48, 20);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fillStyle = '#141413';
      ctx.fill();

      // 검날을 따라 흐르는 명묵 에너지 날(Edge)
      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(-56, 18);
      ctx.stroke();
    }
    ctx.restore();

    // 12. 발도 차지(기모으기) 완료 시 캐릭터 주변에 휘몰아치는 검붉은 스파크
    if (Engine.keys.attackHoldTime >= 0.45) {
      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) {
        const r = 24 + ((this.animTime * 40 + k * 10) % 18);
        ctx.beginPath();
        ctx.arc(0, -4, r, k * 2, k * 2 + 1.8);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
