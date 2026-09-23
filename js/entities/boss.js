export class Boss {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.w = 100;
    this.h = 150;
    this.maxHp = 450;
    this.hp = 450;
    this.isDead = false;

    this.phase = 1;
    this.stateTimer = 2.0;
    this.phaseStep = 'idle'; // idle, windup, tell, swing, recovery
    this.stepTimer = 0;
    this.speed = 135;
  }

  takeDamage(amount, ink) {
    this.hp -= amount;
    ink.splash(this.x + this.w / 2, this.y + this.h / 2, 18);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      ink.splash(this.x + this.w / 2, this.y + this.h / 2, 50);
    } else if (this.hp < 200 && this.phase === 1) {
      this.phase = 2;
      this.speed = 190;
    }
  }

  update(dt, player, ink, engine) {
    if (this.isDead) return;

    const dist = Math.abs(this.x - player.x);
    this.stateTimer -= dt;

    if (this.stepTimer > 0) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        if (this.phaseStep === 'windup') {
          this.phaseStep = 'tell';
          this.stepTimer = 0.14; // 거대 보스 패링 섬광
        } else if (this.phaseStep === 'tell') {
          this.phaseStep = 'swing';
          if (dist < 150) {
            const res = player.takeDamage(this.phase === 2 ? 34 : 24, ink, engine);
            if (res === 'parried') {
              this.phaseStep = 'recovery';
              this.stepTimer = 0.7;
            } else {
              this.phaseStep = 'idle';
              this.stateTimer = this.phase === 2 ? 1.4 : 2.2;
            }
          } else {
            this.phaseStep = 'recovery';
            this.stepTimer = 0.5;
          }
        } else if (this.phaseStep === 'recovery') {
          this.phaseStep = 'idle';
          this.stateTimer = this.phase === 2 ? 1.3 : 2.0;
        }
      }
      return;
    }

    if (dist > 105) {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
    } else if (this.stateTimer <= 0) {
      this.phaseStep = 'windup';
      this.stepTimer = 0.45;
    }
  }

  render(cameraX) {
    if (this.x + this.w < cameraX - 50 || this.x > cameraX + 1330) return;

    const ctx = this.ctx;
    ctx.save();

    ctx.translate(this.x + this.w / 2, this.y + this.h);
    if (this.phaseStep === 'windup') ctx.rotate(0.18);
    if (this.phaseStep === 'recovery') ctx.rotate(-0.2);

    ctx.fillStyle = this.phaseStep === 'windup' ? "#6b1a1a" : "#14110e";
    ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);

    // 투구와 뿔
    ctx.fillStyle = "#8a1c1c";
    ctx.fillRect(-this.w / 2 + 10, -this.h - 22, 16, 22);
    ctx.fillRect(this.w / 2 - 26, -this.h - 22, 16, 22);

    // 붉은 화염 안광
    ctx.fillStyle = "#ff2222";
    ctx.fillRect(-26, -this.h + 30, 16, 8);
    ctx.fillRect(10, -this.h + 30, 16, 8);

    // 패링 섬광 (★)
    if (this.phaseStep === 'tell') {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, -this.h - 25, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
