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
    this.height = 54;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: 우측, -1: 좌측

    // 지형 및 점프 상태
    this.onGround = false;
    this.onWall = 0; // -1: 좌측 벽, 1: 우측 벽, 0: 없음
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
    this.parryWindowTimer = 0; // 금묵 패링 판정 시간
    this.invincibleTimer = 0;

    // 산나비 스타일 묵사슬(Ink Chain) 상태
    this.chain = {
      state: 'IDLE', // 'IDLE', 'HOOKED_POINT', 'PULL_ENEMY'
      targetX: 0,
      targetY: 0,
      targetEntity: null,
      length: 0,
      cooldown: 0,
      maxRange: 440
    };

    // 도포 자락 및 먹물 번짐 애니메이션 시드
    this.animTime = 0;
  }

  resetToSpawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.chain.state = 'IDLE';
    this.invincibleTimer = 1.2;
  }

  update(dt, keys, stage) {
    this.animTime += dt;
    const ink = GameState.getActiveInk();

    // 낙관 패시브 반영 (허공답보: 2단 점프, 혈귀: 광폭화 가속)
    this.maxJumps = GameState.hasSeal('void_step') ? 2 : 1;
    const frenzyBonus =
      GameState.hasSeal('blood_frenzy') && GameState.playerStats.karma >= 50 ? 1.3 : 1.0;
    const moveSpeed = 320 * ink.speedMul * frenzyBonus;

    // 타이머 감소
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.comboResetTimer > 0) this.comboResetTimer -= dt;
    else this.comboStep = 0;
    if (this.parryWindowTimer > 0) this.parryWindowTimer -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.chain.cooldown > 0) this.chain.cooldown -= dt;

    // HUD 사슬 상태 갱신
    const chainHud = document.getElementById('chain-status');
    if (chainHud) {
      chainHud.textContent =
        this.chain.cooldown > 0 ? `${this.chain.cooldown.toFixed(1)}초` : '준비됨';
    }

    // 1. 묵사슬(산나비 와이어) 발사 및 기동 처리
    this._handleChainAction(dt, keys, stage, ink, frenzyBonus);

    // 2. 대시(묵영보) 처리
    if (keys.dashJustPressed && this.dashCooldown <= 0 && this.chain.state === 'IDLE') {
      this.isDashing = true;
      this.dashTimer = 0.18;
      this.dashCooldown = 0.45 * ink.chainCooldownMul;
      this.vx = this.facing * 760 * ink.speedMul;
      this.vy = 0;
      SoundSystem.playDash();
      InkEffects.spawnSplash(this.x, this.y, 10, ink.color, 0.8);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 0.035;
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

    // 3. 일반 좌우 이동 및 중력 처리 (사슬 돌진/대시 중이 아닐 때)
    if (!this.isDashing && this.chain.state === 'IDLE') {
      if (keys.left) {
        this.vx = -moveSpeed;
        this.facing = -1;
      } else if (keys.right) {
        this.vx = moveSpeed;
        this.facing = 1;
      } else {
        this.vx *= Math.pow(0.001, dt); // 빠른 감속으로 메가맨식 칼같은 정지감 구현
      }

      // 중력 및 벽 슬라이딩 감속
      let gravity = 1350;
      if (this.onWall !== 0 && this.vy > 0) {
        gravity = 320; // 벽을 타고 천천히 미끄러짐
        if (Math.random() < 0.3) {
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

    // 4. 도약(점프) 및 메가맨 스타일 벽 차기(Wall Jump)
    if (keys.jumpJustPressed) {
      if (this.chain.state !== 'IDLE') {
        // 사슬 매달리기 중 점프 시 반동을 받아 슈퍼 도약!
        this.chain.state = 'IDLE';
        this.vy = -580;
        this.vx *= 1.25;
        SoundSystem.playDash();
        InkEffects.spawnSplash(this.x, this.y, 14, ink.color, 1.1);
      } else if (this.onGround) {
        this.vy = -560;
        this.onGround = false;
        this.jumpCount = 1;
        InkEffects.spawnSplash(this.x, this.y + this.height * 0.5, 8, '#141413', 0.6);
      } else if (this.onWall !== 0) {
        // 벽 차기
        this.vy = -540;
        this.vx = -this.onWall * 460;
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
        // 허공답보 (공중 발판 먹물 원형 생성 후 2단 점프)
        this.vy = -510;
        this.jumpCount++;
        InkEffects.spawnSplash(this.x, this.y + this.height * 0.5, 14, ink.color, 0.9);
      }
    }

    // 5. 묵검술 베기 & 모아 베기(발도술) 처리
    this._handleSwordAttack(keys, stage, ink, frenzyBonus);

    // 6. 물리 위치 이동 및 스테이지 지형 충돌 판정
    this._moveAndCollide(dt, stage.platforms);
  }

  _handleChainAction(dt, keys, stage, ink, frenzyBonus) {
    const maxRange = this.chain.maxRange * frenzyBonus;

    // 우클릭 또는 K키를 누르는 순간 가장 가까운 사슬 고리(Grapple Point)나 적 탐색
    if (keys.chainJustPressed && this.chain.cooldown <= 0) {
      SoundSystem.playChainThrow();

      // 마우스 방향 또는 플레이어 전방 상단 기준 탐색
      const aimX = keys.worldMouseX || this.x + this.facing * 220;
      const aimY = keys.worldMouseY || this.y - 140;

      let bestPoint = null;
      let bestDist = maxRange;

      // 1순위: 스테이지 내 사슬 고리(묵점) 탐색
      stage.grapplePoints.forEach((pt) => {
        const dPlayer = Math.hypot(pt.x - this.x, pt.y - this.y);
        const dAim = Math.hypot(pt.x - aimX, pt.y - aimY);
        if (dPlayer <= maxRange && dAim < bestDist) {
          bestDist = dAim;
          bestPoint = { type: 'POINT', x: pt.x, y: pt.y };
        }
      });

      // 2순위: 적 또는 보스에게 직접 사슬 꽂기 (산나비식 적 급습)
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
        // 허공에 쏘았을 때 짧은 쿨타임
        this.chain.cooldown = 0.25;
      }
    }

    // 사슬 고리에 매달린 진자 스윙 및 견인 물리 연산
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

      // 고리 쪽으로 빠르게 당겨주면서 좌우 스윙 가속 부여
      this.vx += nx * 1650 * dt;
      this.vy += (ny * 1850 + 600) * dt;

      if (keys.left) this.vx -= 650 * dt;
      if (keys.right) this.vx += 650 * dt;

      // 유수의 낙관 장착 시 사슬 기동 중 부딪히는 적 자동 베기
      if (GameState.hasSeal('chain_blade')) {
        this._checkChainDashSlash(stage, ink);
      }

      if (dist < 48) {
        this.chain.state = 'IDLE';
        this.vy = -420;
        this.chain.cooldown = 0.4 * ink.chainCooldownMul;
      }
    } else if (this.chain.state === 'PULL_ENEMY') {
      // 적을 향해 초고속 돌진 (산나비 사슬 대시)
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

      // 적 코앞에 도달하면 사슬 해제 후 공중 도약 + 자동 강타!
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
    // 1. 일반 3단 연속 베기
    if (keys.attackJustPressed && this.attackCooldown <= 0) {
      this.executeSlash(stage, ink, false, frenzyBonus);
    }

    // 2. 버튼을 0.45초 이상 모았다가 떼면 메가맨 제로식 '차지 발도술' 발동!
    if (keys.attackJustReleased) {
      if (keys.attackHoldTime >= 0.45) {
        this.executeSlash(stage, ink, true, frenzyBonus);
      }
      keys.attackHoldTime = 0;
    }
  }

  executeSlash(stage, ink, isCharge = false, frenzyBonus = 1.0) {
    this.comboStep = isCharge ? 4 : (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.7;
    this.attackCooldown = (isCharge ? 0.32 : 0.16) / frenzyBonus;

    // 금묵 장착 시 베기 순간 0.22초 동안 패링(튕겨내기) 판정 활성화
    if (ink.id === 'gold') {
      this.parryWindowTimer = 0.22;
    }

    if (isCharge) {
      SoundSystem.playChargeSlash();
    } else {
      SoundSystem.playSlash(this.comboStep);
    }

    // 수묵 갈필 검기 궤적 생성
    const slashRadius = isCharge ? 88 : 64;
    const startAng = this.facing > 0 ? -Math.PI * 0.45 : Math.PI * 1.45;
    const endAng = this.facing > 0 ? Math.PI * 0.45 : Math.PI * 0.55;

    BrushEffects.spawnSlashArc({
      x: this.x + this.facing * 18,
      y: this.y,
      radius: slashRadius,
      startAngle: startAng,
      endAngle: endAng,
      dir: this.facing,
      color: isCharge ? '#c92a2a' : ink.color,
      isCharge
    });

    // 파천의 낙관 장착 + 차지 베기 시 전방으로 초승달 검기 발사
    if (isCharge && GameState.hasSeal('slash_wave')) {
      BrushEffects.spawnSlashWave({
        x: this.x + this.facing * 40,
        y: this.y,
        vx: this.facing * 720,
        color: ink.color === '#141413' ? '#c92a2a' : ink.color,
        damage: 38 * ink.atkMul * (GameState.playerStats.isBerserk ? 2 : 1)
      });
    }

    // 살생의 금기 스테이지일 경우 검을 휘두를 때마다 혈묵 증가
    if (GameState.currentRule.id === 'BLOOD_TAX') {
      GameState.addKarma(2.5);
    }

    // 근접 공격 히트박스 판정
    const reachX = isCharge ? 115 : 85;
    const reachY = isCharge ? 80 : 60;
    const hitCenterX = this.x + this.facing * (reachX * 0.5);
    const baseDmg = isCharge ? 42 : 16 + this.comboStep * 4;
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

    // 적의 투사체를 베어 지우거나 금묵으로 튕겨내기
    stage.projectiles.forEach((proj) => {
      if (
        proj.fromEnemy &&
        Math.hypot(proj.x - hitCenterX, proj.y - this.y) < slashRadius + 20
      ) {
        if (ink.id === 'gold' || isCharge) {
          // 패링 반사!
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

    // 금묵 패링 타이밍에 피격 시 완전 무효화 및 반격 충격파!
    if (this.parryWindowTimer > 0) {
      SoundSystem.playParry();
      Engine.triggerHitImpact(0.1, 12, 0.25);
      InkEffects.spawnSplash(this.x, this.y, 20, '#c59b27', 1.3);
      this.invincibleTimer = 0.6;
      return;
    }

    // 혈묵 100% 광폭화 상태에서는 단 한 대만 맞아도 즉사 (단, 묵갑의 낙관이 있으면 1회 보호)
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
    // 수평 이동 및 벽 충돌
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

    // 수직 이동 및 바닥/천장 충돌
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

    ctx.save();

    // 1. 묵사슬(산나비 와이어) 렌더링
    if (this.chain.state !== 'IDLE') {
      const tx =
        (this.chain.state === 'HOOKED_POINT'
          ? this.chain.targetX
          : this.chain.targetEntity?.x || this.x) - camera.x;
      const ty =
        (this.chain.state === 'HOOKED_POINT'
          ? this.chain.targetY
          : this.chain.targetEntity?.y || this.y) - camera.y;

      ctx.strokeStyle = ink.color;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // 사슬 끝 붉은 수묵 작살 인장
      ctx.fillStyle = '#c92a2a';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 무적 시간 깜빡임
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.translate(sx, sy);
    ctx.scale(this.facing, 1);

    // 2. 덧칠(부활) 횟수 및 광폭화에 따른 '야차화(먹물 번짐 아우라)' 표현
    const corruptionLevel = Math.min(8, deaths) + (isBerserk ? 5 : 0);
    if (corruptionLevel > 0) {
      for (let i = 0; i < corruptionLevel; i++) {
        const ang = this.animTime * 4 + i * 1.1;
        const ox = Math.cos(ang) * (8 + i * 1.5);
        const oy = Math.sin(ang * 1.3) * (12 + i * 1.5);
        ctx.fillStyle = isBerserk ? 'rgba(201, 42, 42, 0.35)' : 'rgba(20, 20, 19, 0.35)';
        ctx.beginPath();
        ctx.arc(ox, oy, 6 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. 휘날리는 붉은 목도리 & 먹물 도포 자락 (산나비 + 록맨 제로 감성)
    const capeWave = Math.sin(this.animTime * 14) * 8 - Math.abs(this.vx) * 0.03;
    ctx.fillStyle = '#c92a2a';
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.quadraticCurveTo(-24, -18 + capeWave * 0.5, -38 + capeWave, -4);
    ctx.lineTo(-32 + capeWave, 6);
    ctx.quadraticCurveTo(-18, -6, -4, -6);
    ctx.closePath();
    ctx.fill();

    // 4. 검객 몸통 (먹물 도포)
    ctx.fillStyle = '#141413';
    ctx.fillRect(-11, -14, 22, 30);

    // 도포 하단 자락
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.lineTo(12, 14);
    ctx.lineTo(15, 27);
    ctx.lineTo(-16 + capeWave * 0.3, 27);
    ctx.closePath();
    ctx.fill();

    // 5. 흑립/삿갓 (수묵 무사 모자)
    ctx.fillStyle = '#141413';
    ctx.beginPath();
    ctx.moveTo(-22, -13);
    ctx.lineTo(22, -13);
    ctx.lineTo(0, -28);
    ctx.closePath();
    ctx.fill();

    // 삿갓 아래 빛나는 붉은 안광 (덧칠 횟수가 많거나 광폭화 시 더욱 길게 빛남)
    ctx.fillStyle = isBerserk || deaths >= 3 ? '#ff2a2a' : '#c92a2a';
    ctx.fillRect(3, -12, 6 + Math.min(6, deaths), 3);

    // 6. 등 뒤 또는 손에 쥔 묵검(墨劍) 렌더링
    ctx.strokeStyle = ink.color === '#141413' ? '#3d3b38' : ink.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(26, -10);
    ctx.stroke();

    // 차지 발도 준비 완료 시 검신 주변에 먹물 벼락 이펙트 표시
    if (Engine.keys.attackHoldTime >= 0.45) {
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(4, 0, 28 + Math.sin(this.animTime * 30) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
