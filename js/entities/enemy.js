export class Enemy {
  constructor(ctx, x, y, type = 'grunt') {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.type = type; // 'grunt'(묵객), 'archer'(궁수), 'rusher'(도깨비)

    if (type === 'grunt') {
      this.w = 54; this.h = 92; this.hp = 55; this.speed = 110; this.dmg = 12;
    } else if (type === 'archer') {
      this.w = 50; this.h = 86; this.hp = 38; this.speed = 85; this.dmg = 14;
    } else {
      this.w = 64; this.h = 78; this.hp = 35; this.speed = 230; this.dmg = 18;
    }

    this.isDead = false;
    this.deathTimer = 0.35; // 사망 시 먹물로 녹아내리는 시간
    this.atkCooldown = Math.random() * 1.5 + 1.0;
    this.isTelegraphing = false;
  }

  takeDamage(amount, ink) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      ink.splash(this.x + this.w / 2, this.y + this.h / 2, 22);
    }
  }

  update(dt, player, ink, engine) {
    if (this.isDead) {
      this.deathTimer -= dt;
      return;
    }

    const dist = Math.abs(this.x - player.x);
    this.atkCooldown -= dt;

    if (this.type === 'grunt') {
      if (dist > 65) {
        this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
        this.isTelegraphing = false;
      } else {
        if (this.atkCooldown <= 0.45 && this.atkCooldown > 0) {
          this.isTelegraphing = true;
        } else if (this.atkCooldown <= 0) {
          this.isTelegraphing = false;
          this.atkCooldown = 1.8;
          player.takeDamage(this.dmg, ink, engine);
        }
      }
    } else if (this.type === 'archer') {
      if (dist < 320) this.x += (player.x > this.x ? -1 : 1) * this.speed * dt;
      if (this.atkCooldown <= 0.5 && this.atkCooldown > 0) {
        this.isTelegraphing = true;
      } else if (this.atkCooldown <= 0) {
        this.isTelegraphing = false;
        this.atkCooldown = 2.4;
        if (dist < 580) player.takeDamage(this.dmg, ink, engine);
      }
    } else {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      if (dist < 55 && this.atkCooldown <= 0) {
        this.atkCooldown = 1.3;
        player.takeDamage(this.dmg, ink, engine);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.isDead) {
      // 사망 시 먹물로 무너지며 녹아내림
      const alpha = Math.max(0, this.deathTimer / 0.35);
      ctx.fillStyle = `rgba(20, 16, 12, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + this.h - 10, this.w * 0.8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.fillStyle = this.isTelegraphing ? "#701818" : "#241f1a";

    if (this.type === 'grunt') {
      // 삿갓 묵객
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2, this.y);
      ctx.lineTo(this.x + this.w + 6, this.y + 16);
      ctx.lineTo(this.x - 6, this.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(this.x + 8, this.y + 16, this.w - 16, this.h - 16);
    } else if (this.type === 'archer') {
      // 각궁을 든 궁수 실루엣
      ctx.fillRect(this.x + 10, this.y + 10, this.w - 20, this.h - 10);
      ctx.strokeStyle = "#40382f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x - 4, this.y + 35, 26, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else {
      // 뿔 달린 웅크린 도깨비
      ctx.fillRect(this.x, this.y + 14, this.w, this.h - 14);
      ctx.beginPath();
      ctx.moveTo(this.x + 10, this.y + 14);
      ctx.lineTo(this.x + 18, this.y - 6);
      ctx.lineTo(this.x + 24, this.y + 14);
      ctx.fill();
    }

    // 붉은 안광
    ctx.fillStyle = this.isTelegraphing ? "#ff2424" : "#a82424";
    ctx.fillRect(this.x + 14, this.y + 20, 6, 4);
    ctx.fillRect(this.x + this.w - 20, this.y + 20, 6, 4);

    ctx.restore();
  }
}
