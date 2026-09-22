export class Boss {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.w = 98;
    this.h = 148;
    this.maxHp = 400;
    this.hp = 400;
    this.isDead = false;

    this.phase = 1;
    this.stateTimer = 2.0;
    this.isTelegraphing = false;
    this.speed = 135;
  }

  takeDamage(amount, ink) {
    this.hp -= amount;
    ink.splash(this.x + this.w / 2, this.y + this.h / 2, 18);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      ink.splash(this.x + this.w / 2, this.y + this.h / 2, 45);
    } else if (this.hp < 180 && this.phase === 1) {
      this.phase = 2; // 2페이즈 폭주
      this.speed = 195;
    }
  }

  update(dt, player, ink, engine) {
    if (this.isDead) return;

    const dist = Math.abs(this.x - player.x);
    this.stateTimer -= dt;

    if (dist > 95) {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
    }

    if (this.stateTimer <= 0.65 && this.stateTimer > 0) {
      this.isTelegraphing = true;
    } else if (this.stateTimer <= 0) {
      this.isTelegraphing = false;
      this.stateTimer = this.phase === 2 ? 1.3 : 2.1;
      if (dist < 145) {
        player.takeDamage(this.phase === 2 ? 32 : 22, ink, engine);
      }
    }
  }

  render() {
    if (this.isDead) return;
    const ctx = this.ctx;
    ctx.save();

    // 흑면장 실루엣
    ctx.fillStyle = this.isTelegraphing ? "#6b1a1a" : "#14110e";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // 투구와 거대한 뿔
    ctx.fillStyle = "#8a1c1c";
    ctx.fillRect(this.x + 12, this.y - 20, 14, 20);
    ctx.fillRect(this.x + this.w - 26, this.y - 20, 14, 20);

    // 붉은 화염 눈빛
    ctx.fillStyle = "#ff2222";
    ctx.fillRect(this.x + 22, this.y + 30, 14, 7);
    ctx.fillRect(this.x + 60, this.y + 30, 14, 7);

    // 상단 보스 체력 게이지
    ctx.fillStyle = "rgba(35, 30, 24, 0.4)";
    ctx.fillRect(340, 28, 600, 16);
    ctx.fillStyle = "#8a1c1c";
    ctx.fillRect(340, 28, (this.hp / this.maxHp) * 600, 16);
    ctx.strokeStyle = "#241f1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 28, 600, 16);

    ctx.fillStyle = "#241f1a";
    ctx.font = "bold 16px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText(`흑면장 (黑面將) — 제 ${this.phase} 막`, 640, 20);

    ctx.restore();
  }
}
