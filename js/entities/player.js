import { GameState } from '../core/state.js';

export class Player {
  constructor(ctx, x, y, sound) {
    this.ctx = ctx;
    this.sound = sound;
    this.x = x;
    this.y = y;

    this.hitW = 56;
    this.hitH = 98;
    this.renderW = 142;
    this.renderH = 116;

    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = false;
    this.isWallSliding = false;

    // 록맨식 차지 & 대시 & 콤보
    this.chargeTimer = 0;
    this.isCharging = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.comboStep = 0;
    this.comboResetTimer = 0;

    // 2.5D 모션 및 원화 모사 변수
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.tilt = 0;
    this.breathe = 0;
    this.swordAngle = 0.55;
    this.parryFlashText = 0;
    this.invincibleTimer = 0;

    this.state = 'idle'; // idle, run, attack, dash, parry, hurt
    this.stateTimer = 0;
    this.dashGhosts = [];

    this.img = new Image();
    this.imgLoaded = false;
    this.img.onload = () => { this.imgLoaded = true; };
    this.img.src = 'assets/images/player.png';
  }

  // 1. 록맨 제로식 3단 연속 베기 콤보
  attack(brush, ink, enemies, boss) {
    if (this.isDashing || this.state === 'parry') return;

    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.6;
    this.state = 'attack';
    this.stateTimer = 0.22;
    this.sound.playSlash();

    const atkX = this.x + (this.facing > 0 ? this.hitW + 40 : -40);
    const atkY = this.y + this.hitH / 2;

    if (this.comboStep === 1) {
      this.tilt = this.facing * 0.18;
      this.swordAngle = -0.7;
      brush.addSlash(atkX, atkY, this.facing, 'normal');
      this.checkHit(atkX, atkY, 95, 24, ink, enemies, boss, false);
    } else if (this.comboStep === 2) {
      this.tilt = this.facing * 0.26;
      this.swordAngle = -1.2;
      brush.addSlash(atkX, atkY - 15, this.facing, 'normal');
      this.checkHit(atkX, atkY - 15, 105, 30, ink, enemies, boss, false);
    } else {
      // 3단 피니시: 공중 회전 수묵 섬광
      this.tilt = this.facing * 0.35;
      this.swordAngle = -1.8;
      this.scaleX = 1.35;
      brush.addSlash(atkX, atkY, this.facing, 'heavy');
      this.checkHit(atkX, atkY, 130, 48, ink, enemies, boss, true);
    }
  }

  // 2. 록맨 차지샷: 기 모아 묵빛 검기 파동 발사
  startCharge() {
    this.isCharging = true;
  }

  releaseCharge(brush, ink, enemies, boss) {
    if (!this.isCharging) return;
    const isFull = this.chargeTimer >= 0.85;
    this.isCharging = false;
    this.chargeTimer = 0;

    if (isFull) {
      if (!GameState.useInk(20)) return;
      this.sound.playHeavySlash();
      this.tilt = this.facing * 0.32;
      this.swordAngle = -1.4;

      // 거대 관통 수묵 검기
      GameState.projectiles.push({
        x: this.x + (this.facing > 0 ? this.hitW + 20 : -30),
        y: this.y + 36,
        vx: this.facing * 880,
        dmg: 70,
        r: 34,
        isPlayer: true,
        life: 2.2
      });
      brush.addSlash(this.x + this.facing * 50, this.y + 40, this.facing, 'heavy');
    } else {
      if (!GameState.useInk(10)) return;
      this.sound.playSlash();
      GameState.projectiles.push({
        x: this.x + (this.facing > 0 ? this.hitW + 15 : -25),
        y: this.y + 40,
        vx: this.facing * 660,
        dmg: 35,
        r: 18,
        isPlayer: true,
        life: 1.6
      });
    }
  }

  // 3. 록맨식 지상 슬라이딩 / 에어 대시
  dash() {
    if (this.isDashing) return;
    if (!GameState.useInk(15)) return;
    this.isDashing = true;
    this.dashTimer = 0.28;
    this.sound.playDash();
    this.vx = this.facing * 940;

    this.scaleX = 1.45;
    this.scaleY = 0.65;
    this.swordAngle = 0.8;
    this.dashGhosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.85 });
  }

  parry() {
    if (this.isDashing || this.state === 'parry') return;
    this.state = 'parry';
    this.stateTimer = 0.25;
    this.swordAngle = -1.57; // 대도를 수직 90도로 세움[cite: 8]
    this.scaleX = 0.85;
    this.scaleY = 1.22;
  }

  takeDamage(amount, ink, engine) {
    if (this.isDashing) return 'dodged';
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
      this.parryFlashText = 0.35;
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
    this.invincibleTimer = 0.6; // 0.6초 피격 무적
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
    if (this.isGrounded) {
      this.vy = -620;
      this.isGrounded = false;
      this.scaleX = 0.8;
      this.scaleY = 1.25;
    } else if (this.isWallSliding) {
      // 록맨식 벽차기 점프(Wall Jump)
      this.vy = -580;
      this.vx = -this.facing * 440;
      this.facing = -this.facing;
      this.isWallSliding = false;
      this.sound.playDash();
    }
  }

  cutJump() {
    if (this.vy < -220) {
      this.vy = -220; // 가변 점프: 키를 떼면 즉시 상승 감속
    }
  }

  update(dt, input, platforms = []) {
    this.breathe += dt * 2.5;
    if (this.parryFlashText > 0) this.parryFlashText -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    if (this.isCharging) {
      this.chargeTimer = Math.min(1.5, this.chargeTimer + dt);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

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

    if (!this.isDashing) {
      if (input.left) {
        this.vx = -340;
        this.facing = -1;
        this.tilt = -0.08;
      } else if (input.right) {
        this.vx = 340;
        this.facing = 1;
        this.tilt = 0.08;
      } else {
        this.vx = 0;
        this.tilt *= 0.8;
      }
    }

    // 중력 및 이동
    this.vy += 1400 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // --- [안전한 플랫폼 충돌 판정] ---
    this.isGrounded = false;
    this.isWallSliding = false;

    for (const plat of platforms) {
      const prevY = this.y - this.vy * dt;
      if (
        this.x + this.hitW > plat.x &&
        this.x < plat.x + plat.w &&
        prevY + this.hitH <= plat.y + 12 &&
        this.y + this.hitH >= plat.y
      ) {
        this.y = plat.y - this.hitH;
        this.vy = 0;
        this.isGrounded = true;
        break;
      }
    }

    // 최하단 바닥선 (Y = 620)
    if (!this.isGrounded && this.y + this.hitH >= 620) {
      this.y = 620 - this.hitH;
      this.vy = 0;
      this.isGrounded = true;
    }

    // 결계 벽 및 월드 경계 제한 (벽타기 판정)
    let minX = Math.max(30, GameState.cameraX);
    if (GameState.minBarrierX !== null) minX = Math.max(minX, GameState.minBarrierX + 20);

    let maxX = GameState.worldWidth - this.hitW - 30;
    if (GameState.activeBarrierX !== null) maxX = Math.min(maxX, GameState.activeBarrierX - this.hitW - 10);

    if (this.x <= minX) {
      this.x = minX;
      if (!this.isGrounded && this.vy > 0 && input.left) {
        this.isWallSliding = true;
        this.vy = 120; // 벽을 타고 천천히 미끄러짐
      }
    } else if (this.x >= maxX) {
      this.x = maxX;
      if (!this.isGrounded && this.vy > 0 && input.right) {
        this.isWallSliding = true;
        this.vy = 120;
      }
    }

    if (!this.isGrounded) {
      if (this.vy < 0) {
        this.scaleX = 0.88;
        this.scaleY = 1.18;
      } else {
        this.scaleX = 1.05;
        this.scaleY = 0.95;
      }
    }

    this.scaleX += (1.0 - this.scaleX) * 0.15;
    this.scaleY += (1.0 - this.scaleY) * 0.15;
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    for (const g of this.dashGhosts) {
      ctx.save();
      ctx.translate(g.x + this.hitW / 2, g.y + this.hitH);
      if (g.facing < 0) ctx.scale(-1, 1);
      ctx.fillStyle = `rgba(35, 30, 24, ${g.alpha * 0.4})`;
      this.drawSuibokuShape(ctx, 0.55, 0);
      ctx.restore();
    }

    // 기 모으기 먹 파동 이펙트
    if (this.isCharging) {
      const isFull = this.chargeTimer >= 0.85;
      ctx.save();
      ctx.strokeStyle = isFull ? "#8a2420" : "rgba(35, 30, 24, 0.7)";
      ctx.lineWidth = isFull ? 4 : 2;
      ctx.beginPath();
      const r = 35 + Math.sin(this.breathe * 6) * 6;
      ctx.arc(this.x + this.hitW / 2, this.y + this.hitH / 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

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

    if (this.parryFlashText > 0) {
      ctx.fillStyle = "#8a2420";
      ctx.font = "bold 28px 'Noto Serif KR', serif";
      ctx.fillText("返", 0, -this.hitH - 25);
    }

    ctx.restore();
  }

  // [원화 image_9fa209.png 1:1 수묵 필치 절차적 렌더러][cite: 8]
  drawSuibokuShape(ctx, swordAngle, breatheOff) {
    ctx.save();

    // 발밑 갈필 먹그림자[cite: 8]
    ctx.fillStyle = "rgba(45, 38, 30, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, -3, 50, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 파검(破劍) 대도 & 비백(飛白) 여백[cite: 8]
    ctx.save();
    ctx.translate(10, -50 + breatheOff);
    ctx.rotate(swordAngle);

    ctx.fillStyle = "#332c24";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(85, -8);
    ctx.lineTo(100, 12);
    ctx.lineTo(-5, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1b1713";
    ctx.fillRect(-12, 2, 95, 6);

    ctx.fillStyle = "#f7f4eb";
    ctx.beginPath();
    ctx.ellipse(55, 4, 10, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#15120f";
    ctx.fillRect(-28, -2, 20, 7);
    ctx.restore();

    // 3층 농담 도포[cite: 8]
    ctx.fillStyle = "#6d6252"; // 담묵[cite: 8]
    ctx.beginPath();
    ctx.moveTo(-35, -15);
    ctx.lineTo(-20, -75 + breatheOff);
    ctx.lineTo(25, -75 + breatheOff);
    ctx.lineTo(40, -15);
    ctx.lineTo(20, -2);
    ctx.lineTo(-20, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3a3329"; // 중묵[cite: 8]
    ctx.beginPath();
    ctx.moveTo(-28, -20);
    ctx.lineTo(-14, -68 + breatheOff);
    ctx.lineTo(18, -68 + breatheOff);
    ctx.lineTo(28, -20);
    ctx.lineTo(8, -4);
    ctx.lineTo(-16, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1c1813"; // 농묵[cite: 8]
    ctx.fillRect(-15, -45 + breatheOff, 28, 25);

    // 3단 계단형 갈모(삿갓)[cite: 8]
    ctx.translate(0, -76 + breatheOff);
    ctx.fillStyle = "#181410";
    ctx.beginPath();
    ctx.ellipse(0, 4, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#463d31";
    ctx.beginPath();
    ctx.moveTo(-46, 2);
    ctx.lineTo(46, 2);
    ctx.lineTo(32, -10);
    ctx.lineTo(-32, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#736756";
    ctx.beginPath();
    ctx.moveTo(-30, -9);
    ctx.lineTo(30, -9);
    ctx.lineTo(18, -22);
    ctx.lineTo(-18, -22);
    ctx.closePath();
    ctx.fill();

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
