import { GameState } from '../core/state.js';

export class Player {
  constructor(ctx, x, y, sound) {
    this.ctx = ctx;
    this.sound = sound;
    this.x = x;
    this.y = y;

    // 히트박스 (AABB 고정 규격)
    this.hitW = 56;
    this.hitH = 98;
    this.renderW = 142;
    this.renderH = 116;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;

    // 2.5D 모션 및 원화 모사 변수
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.tilt = 0;
    this.breathe = 0;
    this.swordAngle = 0.55;
    this.parryFlashText = 0;
    this.invincibleTimer = 0; // 0.6초 피격 무적

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

    this.tilt = this.facing * 0.22;
    this.swordAngle = -0.8;
    this.scaleX = 1.25;
    this.scaleY = 0.85;

    const atkX = this.x + (this.facing > 0 ? this.hitW + 40 : -40);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'normal');
    this.checkHit(atkX, atkY, 100, 28, ink, enemies, boss, false);
  }

  heavyAttack(brush, ink, enemies, boss) {
    if (this.state === 'dash') return;
    if (!GameState.useInk(20)) return;
    this.state = 'heavy';
    this.stateTimer = 0.35;
    this.sound.playHeavySlash();

    this.tilt = this.facing * 0.32;
    this.swordAngle = -1.2;
    this.scaleX = 1.4;
    this.scaleY = 0.75;

    const atkX = this.x + (this.facing > 0 ? this.hitW + 60 : -60);
    const atkY = this.y + this.hitH / 2;
    brush.addSlash(atkX, atkY, this.facing, 'heavy');
    this.checkHit(atkX, atkY, 145, 65, ink, enemies, boss, true);
  }

  dash() {
    if (this.state === 'dash') return;
    if (!GameState.useInk(15)) return;
    this.state = 'dash';
    this.stateTimer = 0.22;
    this.sound.playDash();
    this.vx = this.facing * 850;

    this.scaleX = 1.45;
    this.scaleY = 0.65;
    this.swordAngle = 0.8;
    this.dashGhosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.8 });
  }

  parry() {
    if (this.state === 'dash' || this.state === 'parry') return;
    this.state = 'parry';
    this.stateTimer = 0.25;
    this.swordAngle = -1.57; // 대도를 수직 90도로 꼿꼿이 세움
    this.scaleX = 0.85;
    this.scaleY = 1.22;
  }

  takeDamage(amount, ink, engine) {
    if (this.state === 'dash') return 'dodged';
    if (this.invincibleTimer > 0) return 'invulnerable';

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
      this.parryFlashText = 0.35;
      return 'parried';
    }

    // 피격 처리 및 0.6초 무적 부여
    GameState.hp -= amount;
    GameState.hitsTaken++;
    GameState.resetCombo();
    this.sound.playInkDrop();
    engine.triggerHitStop(0.06);
    engine.triggerShake(8, 0.18);
    ink.splash(this.x + this.hitW / 2, this.y + 45, 15, "rgba(130, 24, 20, ");
    this.state = 'hurt';
    this.stateTimer = 0.22;
    this.invincibleTimer = 0.6; // 피격 무적
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

    if (boss && !boss.isDead && Math.hypot(boss.x + boss.w / 2 - atkX, boss.y + boss.h / 2 - atkY) < range + 40) {
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
      this.scaleY = 1.25;
    }
  }

  update(dt, input) {
    this.breathe += dt * 2.5;
    if (this.parryFlashText > 0) this.parryFlashText -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= dt * 3.5;
      if (this.dashGhosts[i].alpha <= 0) this.dashGhosts.splice(i, 1);
    }

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 && this.state !== 'idle') {
        this.state = 'idle';
        this.swordAngle = 0.55;
      }
    }

    if (this.state !== 'dash') {
      if (input.left) {
        this.vx = -330;
        this.facing = -1;
        this.tilt = -0.08;
      } else if (input.right) {
        this.vx = 330;
        this.facing = 1;
        this.tilt = 0.08;
      } else {
        this.vx = 0;
        this.tilt *= 0.8;
      }
    }

    this.vy += 1350 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!this.isGrounded) {
      if (this.vy < 0) {
        this.scaleX = 0.9;
        this.scaleY = 1.15;
      } else {
        this.scaleX = 1.05;
        this.scaleY = 0.95;
      }
    }

    if (this.y + this.hitH >= 620) {
      if (!this.isGrounded) {
        this.scaleX = 1.25;
        this.scaleY = 0.8;
      }
      this.y = 620 - this.hitH;
      this.vy = 0;
      this.isGrounded = true;
    }

    this.scaleX += (1.0 - this.scaleX) * 0.15;
    this.scaleY += (1.0 - this.scaleY) * 0.15;

    // 전·후방 결계 박스 내로 이동 제한 보정
    let minX = Math.max(30, GameState.cameraX);
    if (GameState.minBarrierX !== null) {
      minX = Math.max(minX, GameState.minBarrierX + 20);
    }

    let maxX = GameState.worldWidth - this.hitW - 30;
    if (GameState.activeBarrierX !== null) {
      maxX = Math.min(maxX, GameState.activeBarrierX - this.hitW - 10);
    }
    this.x = Math.max(minX, Math.min(maxX, this.x));
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 대시 갈필 잔상
    for (const g of this.dashGhosts) {
      ctx.save();
      ctx.translate(g.x + this.hitW / 2, g.y + this.hitH);
      if (g.facing < 0) ctx.scale(-1, 1);
      ctx.fillStyle = `rgba(35, 30, 24, ${g.alpha * 0.4})`;
      this.drawSuibokuShape(ctx, 0.55, 0);
      ctx.restore();
    }

    // 2. 본체 트랜스폼 및 피격 무적 점멸
    ctx.translate(this.x + this.hitW / 2, this.y + this.hitH);
    if (this.facing < 0) ctx.scale(-1, 1);
    ctx.rotate(this.tilt);
    ctx.scale(this.scaleX, this.scaleY);

    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    if (this.imgLoaded) {
      ctx.drawImage(this.img, -this.renderW / 2, -this.renderH + 10, this.renderW, this.renderH);
    } else {
      const breatheOff = Math.sin(this.breathe) * 2;
      this.drawSuibokuShape(ctx, this.swordAngle, breatheOff);
    }

    // 3. 패링 성공 붉은 낙관 (返)
    if (this.parryFlashText > 0) {
      ctx.fillStyle = "#8a2420";
      ctx.font = "bold 28px 'Noto Serif KR', serif";
      ctx.fillText("返", 0, -this.hitH - 25);
    }

    ctx.restore();
  }

  // [원화 1:1 수묵 필치 절차적 렌더러]
  drawSuibokuShape(ctx, swordAngle, breatheOff) {
    ctx.save();

    // (1) 발밑 갈필 먹그림자 번짐
    ctx.fillStyle = "rgba(45, 38, 30, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, -3, 50, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(70, 60, 48, 0.25)";
    ctx.beginPath();
    ctx.ellipse(15, -2, 65, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // (2) 파검(破劍) 대도 렌더링
    ctx.save();
    ctx.translate(10, -50 + breatheOff);
    ctx.rotate(swordAngle);

    // 대검 칼날 (중묵)
    ctx.fillStyle = "#332c24";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(85, -8);
    ctx.lineTo(100, 12);
    ctx.lineTo(-5, 18);
    ctx.closePath();
    ctx.fill();

    // 대검 능선 (농묵)
    ctx.fillStyle = "#1b1713";
    ctx.fillRect(-12, 2, 95, 6);

    // 원화 특유의 비백(飛白, 칼날 가운데 뚫린 타원형 여백)
    ctx.fillStyle = "#f7f4eb"; // 배경 한지색으로 투과
    ctx.beginPath();
    ctx.ellipse(55, 4, 10, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 칼자루와 끈
    ctx.fillStyle = "#15120f";
    ctx.fillRect(-28, -2, 20, 7);
    ctx.restore();

    // (3) 웅크린 몸체와 거친 도포 (3단계 농담)
    // 1층 담묵
    ctx.fillStyle = "#6d6252";
    ctx.beginPath();
    ctx.moveTo(-35, -15);
    ctx.lineTo(-20, -75 + breatheOff);
    ctx.lineTo(25, -75 + breatheOff);
    ctx.lineTo(40, -15);
    ctx.lineTo(20, -2);
    ctx.lineTo(-20, -2);
    ctx.closePath();
    ctx.fill();

    // 2층 중묵
    ctx.fillStyle = "#3a3329";
    ctx.beginPath();
    ctx.moveTo(-28, -20);
    ctx.lineTo(-14, -68 + breatheOff);
    ctx.lineTo(18, -68 + breatheOff);
    ctx.lineTo(28, -20);
    ctx.lineTo(8, -4);
    ctx.lineTo(-16, -4);
    ctx.closePath();
    ctx.fill();

    // 3층 농묵
    ctx.fillStyle = "#1c1813";
    ctx.fillRect(-15, -45 + breatheOff, 28, 25);

    // (4) 3단 계단형 갈모 (삿갓)
    ctx.translate(0, -76 + breatheOff);

    // 삿갓 밑그림자
    ctx.fillStyle = "#181410";
    ctx.beginPath();
    ctx.ellipse(0, 4, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1단 챙
    ctx.fillStyle = "#463d31";
    ctx.beginPath();
    ctx.moveTo(-46, 2);
    ctx.lineTo(46, 2);
    ctx.lineTo(32, -10);
    ctx.lineTo(-32, -10);
    ctx.closePath();
    ctx.fill();

    // 2단 갓 중앙
    ctx.fillStyle = "#736756";
    ctx.beginPath();
    ctx.moveTo(-30, -9);
    ctx.lineTo(30, -9);
    ctx.lineTo(18, -22);
    ctx.lineTo(-18, -22);
    ctx.closePath();
    ctx.fill();

    // 3단 꼭대기
    ctx.fillStyle = "#1c1813";
    ctx.beginPath();
    ctx.moveTo(-16, -21);
    ctx.lineTo(16, -21);
    ctx.lineTo(6, -30);
    ctx.lineTo(-6, -30);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
