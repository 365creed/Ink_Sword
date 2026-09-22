import { GameState } from '../core/state.js';

export class Player {
  constructor(ctx, x, y, sound) {
    this.ctx = ctx;
    this.sound = sound;
    this.x = x;
    this.y = y;
    
    // 원본 비율(382x287) 유지 렌더링 규격 (높이 110 기준 폭 약 146)
    this.renderH = 110;
    this.renderW = 110 * (382 / 287);
    this.hitW = 55;
    this.hitH = 95;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;

    // 상태 머신
    this.state = 'idle'; // idle, run, attack, heavy, dash, parry, hurt
    this.stateTimer = 0;
    this.comboStep = 0;
    this.dashGhosts = [];

    // 이미지 안전 로드
    this.img = new Image();
    this.imgLoaded = false;
    this.img.onload = () => { this.imgLoaded = true; };
    this.img.src = 'assets/images/player.png';
  }

  // 1. 기본 참격 (斬)
  attack(brush, ink, enemies, boss) {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'attack';
    this.stateTimer = 0.22;
    this.comboStep = (this.comboStep % 2) + 1;
    this.sound.playSlash();

    const atkX = this.x + (this.facing > 0 ? this.hitW + 25 : -25);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'normal');

    this.checkHit(atkX, atkY, 85, 25, ink, enemies, boss);
  }

  // 2. 강공격 (破)
  heavyAttack(brush, ink, enemies, boss) {
    if (this.state === 'dash') return;
    if (!GameState.useInk(20)) return; // 墨 20 소모
    this.state = 'heavy';
    this.stateTimer = 0.35;
    this.sound.playSlash();

    const atkX = this.x + (this.facing > 0 ? this.hitW + 40 : -40);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'heavy');

    this.checkHit(atkX, atkY, 120, 60, ink, enemies, boss, true);
  }

  // 3. 대시 (迅 - 무적 잔상 회피)
  dash() {
    if (this.state === 'dash') return;
    if (!GameState.useInk(15)) return; // 墨 15 소모
    this.state = 'dash';
    this.stateTimer = 0.22;
    this.sound.playDash();
    this.vx = this.facing * 750;

    // 먹물 잔상 기록
    this.dashGhosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.6 });
  }

  // 4. 패링 (返 - 쳐내기)
  parry() {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'parry';
    this.stateTimer = 0.25; // 0.25초의 패링 타이밍
  }

  takeDamage(amount, ink, engine) {
    if (this.state === 'dash') return; // 대시 중 무적

    if (this.state === 'parry') {
      // 패링 성공!
      GameState.parries++;
      GameState.addInk(35);
      GameState.addCombo();
      this.sound.playParry();
      engine.triggerHitStop(0.12);
      engine.triggerShake(12, 0.25);
      ink.splash(this.x + this.hitW / 2, this.y + 40, 20, "rgba(210, 160, 40, ");
      this.state = 'idle';
      return 'parried';
    }

    // 피격 처리
    GameState.hp -= amount;
    GameState.hitsTaken++;
    GameState.resetCombo();
    this.sound.playHit();
    engine.triggerHitStop(0.06);
    engine.triggerShake(8, 0.2);
    ink.splash(this.x + this.hitW / 2, this.y + 40, 16, "rgba(140, 25, 25, ");
    this.state = 'hurt';
    this.stateTimer = 0.2;

    if (GameState.hp <= 0) {
      GameState.hp = 0;
      GameState.isGameOver = true;
    }
    return 'hit';
  }

  checkHit(atkX, atkY, range, damage, ink, enemies, boss, isHeavy = false) {
    let hitCount = 0;
    enemies.forEach((e) => {
      if (!e.isDead && Math.hypot(e.x + e.w / 2 - atkX, e.y + e.h / 2 - atkY) < range) {
        e.takeDamage(damage);
        GameState.addInk(isHeavy ? 15 : 8);
        GameState.addCombo();
        ink.splash(e.x + e.w / 2, e.y + e.h / 2, 14);
        hitCount++;
      }
    });

    if (boss && !boss.isDead && Math.hypot(boss.x + boss.w / 2 - atkX, boss.y + boss.h / 2 - atkY) < range + 30) {
      boss.takeDamage(damage);
      GameState.addInk(15);
      GameState.addCombo();
      ink.splash(boss.x + boss.w / 2, boss.y + boss.h / 2, 20);
      hitCount++;
    }

    if (hitCount > 0) {
      this.sound.playHit();
    }
  }

  jump() {
    if (this.isGrounded && this.state !== 'dash') {
      this.vy = -560;
      this.isGrounded = false;
    }
  }

  update(dt, input) {
    // 잔상 감쇠
    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= dt * 3;
      if (this.dashGhosts[i].alpha <= 0) this.dashGhosts.splice(i, 1);
    }

    // 상태 타이머
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 && this.state !== 'idle') {
        this.state = 'idle';
      }
    }

    // 이동 처리
    if (this.state !== 'dash') {
      if (input.left) {
        this.vx = -320;
        this.facing = -1;
      } else if (input.right) {
        this.vx = 320;
        this.facing = 1;
      } else {
        this.vx = 0;
      }
    }

    this.vy += 1250 * dt;
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

    // 1. 대시 먹 잔상
    for (const g of this.dashGhosts) {
      ctx.fillStyle = `rgba(32, 28, 23, ${g.alpha * 0.5})`;
      ctx.fillRect(g.x, g.y + 10, this.hitW, this.hitH - 10);
    }

    // 2. 검객 본체 (스프라이트 or 수묵 벡터)
    if (this.imgLoaded) {
      ctx.save();
      if (this.facing < 0) {
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, -this.x - this.renderW + 25, this.y - 12, this.renderW, this.renderH);
      } else {
        ctx.drawImage(this.img, this.x - 25, this.y - 12, this.renderW, this.renderH);
      }
      ctx.restore();
    } else {
      // 갓을 쓰고 도포를 두른 수묵화풍 자객 실루엣
      ctx.fillStyle = this.state === 'hurt' ? "#8a2424" : (this.state === 'parry' ? "#5a4820" : "#1c1814");
      // 갓 (곡선)
      ctx.beginPath();
      ctx.ellipse(this.x + this.hitW / 2, this.y + 12, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 도포 몸체
      ctx.beginPath();
      ctx.moveTo(this.x + 10, this.y + 20);
      ctx.lineTo(this.x + this.hitW - 10, this.y + 20);
      ctx.lineTo(this.x + this.hitW + (this.facing > 0 ? 5 : -5), this.y + this.hitH);
      ctx.lineTo(this.x - (this.facing > 0 ? 5 : -5), this.y + this.hitH);
      ctx.closePath();
      ctx.fill();
      // 환도(검)
      ctx.strokeStyle = "#38322a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x + this.hitW / 2, this.y + 40);
      ctx.lineTo(this.x + (this.facing > 0 ? this.hitW + 25 : -25), this.y + 30);
      ctx.stroke();
    }

    ctx.restore();
  }
}
