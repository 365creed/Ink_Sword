import { GameState } from '../core/state.js';

export class Player {
  constructor(ctx, x, y, sound) {
    this.ctx = ctx;
    this.sound = sound;
    this.x = x;
    this.y = y;

    // 히트박스(AABB) - 절대 변형되지 않는 논리적 사각형
    this.hitW = 54;
    this.hitH = 96;
    this.renderH = 112;
    this.renderW = 112 * (382 / 287);

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;

    // 2.5D 절차적 탄성 변수
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.tilt = 0;
    this.runAnimTimer = 0;

    this.state = 'idle'; // idle, run, attack, heavy, dash, parry, hurt
    this.stateTimer = 0;
    this.dashGhosts = [];

    this.img = new Image();
    this.imgLoaded = false;
    this.img.onload = () => { this.imgLoaded = true; };
    this.img.src = 'assets/images/player.png';
  }

  attack(brush, ink, enemies, boss) {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'attack';
    this.stateTimer = 0.22;
    this.sound.playSlash();

    // 공격 시 전신 찌르기 탄성 (앞으로 쏠림)
    this.tilt = this.facing * 0.18;
    this.scaleX = 1.25;
    this.scaleY = 0.85;

    const atkX = this.x + (this.facing > 0 ? this.hitW + 35 : -35);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'normal');
    this.checkHit(atkX, atkY, 95, 28, ink, enemies, boss, false);
  }

  heavyAttack(brush, ink, enemies, boss) {
    if (this.state === 'dash') return;
    if (!GameState.useInk(20)) return;
    this.state = 'heavy';
    this.stateTimer = 0.35;
    this.sound.playHeavySlash();

    this.tilt = this.facing * 0.28;
    this.scaleX = 1.35;
    this.scaleY = 0.75;

    const atkX = this.x + (this.facing > 0 ? this.hitW + 55 : -55);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'heavy');
    this.checkHit(atkX, atkY, 140, 65, ink, enemies, boss, true);
  }

  dash() {
    if (this.state === 'dash') return;
    if (!GameState.useInk(15)) return;
    this.state = 'dash';
    this.stateTimer = 0.22;
    this.sound.playDash();
    this.vx = this.facing * 850;

    this.scaleX = 1.4;
    this.scaleY = 0.7;
    this.dashGhosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.75 });
  }

  parry() {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'parry';
    this.stateTimer = 0.25;
    this.scaleX = 0.85;
    this.scaleY = 1.2; // 검을 꼿꼿이 세우며 긴장 상태
  }

  takeDamage(amount, ink, engine) {
    if (this.state === 'dash') return 'dodged';

    if (this.state === 'parry') {
      GameState.parries++;
      GameState.addInk(35);
      GameState.addCombo();
      this.sound.playParry();
      engine.triggerHitStop(0.14);
      engine.triggerShake(12, 0.22);
      engine.triggerWhiteFlash(0.08);
      ink.parryBurst(this.x + this.hitW / 2, this.y + 45);
      this.state = 'idle';
      this.scaleX = 1.3;
      this.scaleY = 0.8;
      return 'parried';
    }

    GameState.hp -= amount;
    GameState.hitsTaken++;
    GameState.resetCombo();
    this.sound.playInkDrop();
    engine.triggerHitStop(0.06);
    engine.triggerShake(8, 0.18);
    ink.splash(this.x + this.hitW / 2, this.y + 45, 15, "rgba(130, 24, 20, ");
    this.state = 'hurt';
    this.stateTimer = 0.22;
    this.tilt = -this.facing * 0.25;

    if (GameState.hp <= 0) {
      GameState.hp = 0;
      GameState.mode = 'GAME_OVER';
    }
    return 'hit';
  }

  checkHit(atkX, atkY, range, damage, ink, enemies, boss, isHeavy) {
    let hitCount = 0;
    enemies.forEach((e) => {
      if (!e.isDead && Math.hypot(e.x + e.w / 2 - atkX, e.y + e.h / 2 - atkY) < range) {
        e.takeDamage(damage, ink);
        GameState.addInk(isHeavy ? 15 : 8);
        GameState.addCombo();
        hitCount++;
      }
    });

    if (boss && !boss.isDead && Math.hypot(boss.x + boss.w / 2 - atkX, boss.y + boss.h / 2 - atkY) < range + 35) {
      boss.takeDamage(damage, ink);
      GameState.addInk(16);
      GameState.addCombo();
      hitCount++;
    }

    if (hitCount > 0) this.sound.playInkDrop();
  }

  jump() {
    if (this.isGrounded && this.state !== 'dash') {
      this.vy = -580;
      this.isGrounded = false;
      this.scaleX = 0.8;
      this.scaleY = 1.25; // 도약 순간 위로 늘어남
    }
  }

  update(dt, input) {
    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= dt * 3.5;
      if (this.dashGhosts[i].alpha <= 0) this.dashGhosts.splice(i, 1);
    }

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 && this.state !== 'idle') this.state = 'idle';
    }

    // 이동 처리
    if (this.state !== 'dash') {
      if (input.left) {
        this.vx = -330;
        this.facing = -1;
        this.runAnimTimer += dt * 14;
        this.tilt = -0.08;
      } else if (input.right) {
        this.vx = 330;
        this.facing = 1;
        this.runAnimTimer += dt * 14;
        this.tilt = 0.08;
      } else {
        this.vx = 0;
        this.tilt *= 0.8;
      }
    }

    this.vy += 1350 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 점프 중/하강 중 탄성
    if (!this.isGrounded) {
      if (this.vy < 0) {
        this.scaleX = 0.9;
        this.scaleY = 1.15;
      } else {
        this.scaleX = 1.05;
        this.scaleY = 0.95;
      }
    }

    // 착지 시 스쿼시
    if (this.y + this.hitH >= 620) {
      if (!this.isGrounded) {
        this.scaleX = 1.25;
        this.scaleY = 0.8; // 착지 충격으로 가로 압축
      }
      this.y = 620 - this.hitH;
      this.vy = 0;
      this.isGrounded = true;
    }

    // 탄성 자연 복원 (Lerp)
    this.scaleX += (1.0 - this.scaleX) * 0.15;
    this.scaleY += (1.0 - this.scaleY) * 0.15;

    // 월드 경계 및 결계 잠금 제한
    let minX = Math.max(30, GameState.cameraX);
    let maxX = GameState.worldWidth - this.hitW - 30;
    if (GameState.activeBarrierX !== null) {
      maxX = Math.min(maxX, GameState.activeBarrierX - this.hitW);
    }
    this.x = Math.max(minX, Math.min(maxX, this.x));
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 잔상 렌더링
    for (const g of this.dashGhosts) {
      ctx.fillStyle = `rgba(28, 24, 20, ${g.alpha * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(g.x + this.hitW / 2, g.y + this.hitH / 2, this.hitW * 0.7, this.hitH * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 2.5D 트랜스폼 적용 (발바닥 중심 스케일 & 틸트)
    ctx.translate(this.x + this.hitW / 2, this.y + this.hitH);
    ctx.rotate(this.tilt);
    ctx.scale(this.scaleX, this.scaleY);

    if (this.imgLoaded) {
      ctx.save();
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(this.img, -this.renderW / 2, -this.renderH, this.renderW, this.renderH);
      ctx.restore();
    } else {
      ctx.fillStyle = this.state === 'hurt' ? "#7a2222" : (this.state === 'parry' ? "#443928" : "#1a1613");
      // 갓
      ctx.beginPath();
      ctx.ellipse(0, -this.hitH + 12, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 도포 (달리기 시 정현파 흔들림)
      const sway = Math.sin(this.runAnimTimer) * 5;
      ctx.beginPath();
      ctx.moveTo(-15, -this.hitH + 20);
      ctx.lineTo(15, -this.hitH + 20);
      ctx.lineTo(25 + sway, 0);
      ctx.lineTo(-25 + sway, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
