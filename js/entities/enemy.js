export class Enemy {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = 55;
    this.height = 85;
    this.hp = 50;
    this.isDead = false;
    this.speed = 100;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  update(dt, playerX) {
    if (this.isDead) return;
    // 플레이어를 향해 천천히 전진
    if (this.x > playerX + 60) {
      this.x -= this.speed * dt;
    } else if (this.x < playerX - 60) {
      this.x += this.speed * dt;
    }
  }

  render() {
    if (this.isDead) return;
    this.ctx.save();
    // 짙은 먹색의 그림자 자객 실루엣
    this.ctx.fillStyle = "rgba(40, 35, 30, 0.9)";
    this.ctx.fillRect(this.x, this.y, this.width, this.height);

    // 붉은 안광
    this.ctx.fillStyle = "#8a1a1a";
    this.ctx.fillRect(this.x + 12, this.y + 18, 6, 4);
    this.ctx.fillRect(this.x + 24, this.y + 18, 6, 4);
    this.ctx.restore();
  }
}
