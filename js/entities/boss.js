export class Boss {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.w = 95;
    this.h = 145;
    this.maxHp = 350;
    this.hp = 350;
    this.isDead = false;

    this.phase = 1;
    this.stateTimer = 2.0;
    this.isTelegraphing = false;
    this.speed = 130;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    } else if (this.hp < 150 && this.phase === 1) {
      this.phase = 2; // 2페이즈 격노
      this.speed = 190;
    }
  }

  update(dt, player, ink, engine) {
    if (this.isDead) return;

    const dist = Math.abs(this.x - player.x);
    this.stateTimer -= dt;

    if (dist > 90) {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
    }

    if (this.stateTimer <= 0.6 && this.stateTimer > 0) {
      this.isTelegraphing = true;
    } else if (this.stateTimer <= 0) {
      this.isTelegraphing = false;
      this.stateTimer = this.phase === 2 ? 1.4 : 2.2;
      // 대검 횡베기
      if (dist < 140) {
        player.takeDamage(this.phase === 2 ? 30 : 20, ink, engine);
      }
    }
  }

  render() {
    if (this.isDead) return;
    const ctx = this.ctx;
    ctx.save();

    // 흑면장 거대 실루엣
    ctx.fillStyle = this.isTelegraphing ? "#7a1a1a" : "#14110e";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // 도깨비 문양 뿔 & 투구
    ctx.fillStyle = "#8c2020";
    ctx.fillRect(this.x + 15, this.y - 18, 12, 18);
    ctx.fillRect(this.x + this.w - 27, this.y - 18, 12, 18);

    // 붉은 화염 안광
    ctx.fillStyle = "#e62e2e";
    ctx.fillRect(this.x + 20, this.y + 28, 14, 8);
    ctx.fillRect(this.x + 55, this.y + 28, 14, 8);

    // 보스 전용 상단 체력바
    ctx.fillStyle = "rgba(40, 34, 28, 0.4)";
    ctx.fillRect(340, 30, 600, 16);
    ctx.fillStyle = "#7a1c1c";
    ctx.fillRect(340, 30, (this.hp / this.maxHp) * 600, 16);
    ctx.strokeStyle = "#241f1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 30, 600, 16);

    ctx.fillStyle = "#241f1a";
    ctx.font = "bold 16px 'Noto Serif KR', 'Batang', serif";
    ctx.textAlign = "center";
    ctx.fillText(`흑면장 (黑面將) - ${this.phase}페이즈`, 640, 22);

    ctx.restore();
  }
}
