import { GameState } from '../core/state.js';

export class Player {
  constructor(ctx, x, y, sound) {
    this.ctx = ctx;
    this.sound = sound;
    this.x = x;
    this.y = y;

    // 382:287 원본 비율 엄수 렌더링
    this.renderH = 112;
    this.renderW = 112 * (382 / 287);
    this.hitW = 54;
    this.hitH = 96;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;

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
    this.stateTimer = 0.2;
    this.sound.playSlash();

    const atkX = this.x + (this.facing > 0 ? this.hitW + 30 : -30);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'normal');
    this.checkHit(atkX, atkY, 90, 28, ink, enemies, boss, false);
  }

  heavyAttack(brush, ink, enemies, boss) {
    if (this.state === 'dash') return;
    if (!GameState.useInk(20)) return; // 墨 20 소모
    this.state = 'heavy';
    this.stateTimer = 0.32;
    this.sound.playHeavySlash();

    const atkX = this.x + (this.facing > 0 ? this.hitW + 45 : -45);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'heavy');
    this.checkHit(atkX, atkY, 130, 65, ink, enemies, boss, true);
  }

  dash() {
    if (this.state === 'dash') return;
    if (!GameState.useInk(15)) return; // 墨 15 소모
    this.state = 'dash';
    this.stateTimer = 0.22;
    this.sound.playDash();
    this.vx = this.facing * 800;

    // 먹물 잔상 기록
    this.dashGhosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.7 });
  }

  parry() {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'parry';
    this.stateTimer = 0.25; // 0.25초 패링 유효 시간
  }

  takeDamage(amount, ink, engine) {
    if (this.state === 'dash') return 'dodged';

    if (this.state === 'parry') {
      // 패링 완벽 성공!
      GameState.parries++;
      GameState.addInk(35);
      GameState.addCombo();
      this.sound.playParry();
      engine.triggerHitStop(0.14);
      engine.triggerShake(12, 0.22);
      engine.triggerWhiteFlash(0.08); // 백색 여백 섬광
      ink.parryBurst(this.x + this.hitW / 2, this.y + 45);
      this.state = 'idle';
      return 'parried';
    }

    // 일반 피격
    GameState.hp -= amount;
    GameState.hitsTaken++;
    GameState.resetCombo();
    this.sound.playInkDrop();
    engine.triggerHitStop(0.06);
    engine.triggerShake(8, 0.18);
    ink.splash(this.x + this.hitW / 2, this.y + 45, 14, "rgba(130, 24, 20, ");
    this.state = 'hurt';
    this.stateTimer = 0.2;

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

    if (hitCount > 0) {
      this.sound.playInkDrop();
    }
  }

  jump() {
    if (this.isGrounded && this.state !== 'dash') {
      this.vy = -560;
      this.isGrounded = false;
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

    if (this.state !== 'dash') {
      if (input.left) {
        this.vx = -330;
        this.facing = -1;
      } else if (input.right) {
        this.vx = 330;
        this.facing = 1;
      } else {
        this.vx = 0;
      }
    }

    this.vy += 1300 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.hitH >= 620) {
      this.y = 620 - this.hitH;
      this.vy = 0;
      this.isGrounded = true;
    }

    this.x = Math.max(30, Math.min(1280 - this.hitW - 30, this.x));
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 대시 먹물 잔상
    for (const g of this.dashGhosts) {
      ctx.fillStyle = `rgba(28, 24, 20, ${g.alpha * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(g.x + this.hitW / 2, g.y + this.hitH / 2, this.hitW * 0.7, this.hitH * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 검객 본체
    if (this.imgLoaded) {
      ctx.save();
      if (this.facing < 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, -this.x - this.renderW + 28, this.y - 10, this.renderW, this.renderH);
      } else {
        ctx.drawImage(this.img, this.x - 28, this.y - 10, this.renderW, this.renderH);
      }
      ctx.restore();
    } else {
      // 갓과 도포 실루엣
      ctx.fillStyle = this.state === 'hurt' ? "#7a2222" : (this.state === 'parry' ? "#443928" : "#1a1613");
      ctx.beginPath();
      ctx.ellipse(this.x + this.hitW / 2, this.y + 12, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.x + 10, this.y + 20);
      ctx.lineTo(this.x + this.hitW - 10, this.y + 20);
      ctx.lineTo(this.x + this.hitW + (this.facing > 0 ? 8 : -8), this.y + this.hitH);
      ctx.lineTo(this.x - (this.facing > 0 ? 8 : -8), this.y + this.hitH);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
