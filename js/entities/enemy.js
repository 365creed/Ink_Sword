export class Enemy {
  constructor(ctx, x, y, type = 'grunt') {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.type = type; // 'grunt' (묵객), 'archer' (궁수), 'rusher' (도깨비)

    if (type === 'grunt') {
      this.w = 55; this.h = 90; this.hp = 60; this.speed = 110; this.dmg = 12;
    } else if (type === 'archer') {
      this.w = 50; this.h = 85; this.hp = 40; this.speed = 80; this.dmg = 15;
    } else { // rusher
      this.w = 60; this.h = 75; this.hp = 35; this.speed = 240; this.dmg = 18;
    }

    this.isDead = false;
    this.atkCooldown = Math.random() * 1.5 + 1.0;
    this.isTelegraphing = false; // 공격 전조 (붉은빛)
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  update(dt, player, ink, engine) {
    if (this.isDead) return;

    const dist = Math.abs(this.x - player.x);
    this.atkCooldown -= dt;

    if (this.type === 'grunt') {
      // 묵객: 다가가서 전조 후 칼찌르기
      if (dist > 65) {
        this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
        this.isTelegraphing = false;
      } else {
        if (this.atkCooldown <= 0.4 && this.atkCooldown > 0) {
          this.isTelegraphing = true;
        } else if (this.atkCooldown <= 0) {
          this.isTelegraphing = false;
          this.atkCooldown = 1.8;
          player.takeDamage(this.dmg, ink, engine);
        }
      }
    } else if (this.type === 'archer') {
      // 궁수: 일정 거리 유지 후 먹 화살 발사
      if (dist < 320) {
        this.x += (player.x > this.x ? -1 : 1) * this.speed * dt;
      }
      if (this.atkCooldown <= 0.5 && this.atkCooldown > 0) {
        this.isTelegraphing = true;
      } else if (this.atkCooldown <= 0) {
        this.isTelegraphing = false;
        this.atkCooldown = 2.4;
        if (dist < 550) {
          player.takeDamage(this.dmg, ink, engine);
        }
      }
    } else {
      // 도깨비: 고속 돌진
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      if (dist < 50 && this.atkCooldown <= 0) {
        this.atkCooldown = 1.4;
        player.takeDamage(this.dmg, ink, engine);
      }
    }
  }

  render() {
    if (this.isDead) return;
    const ctx = this.ctx;
    ctx.save();

    // 몸체 렌더링
    ctx.fillStyle = this.isTelegraphing ? "#661818" : "rgba(35, 30, 26, 0.92)";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // 붉은 안광
    ctx.fillStyle = this.isTelegraphing ? "#ff2222" : "#9e2020";
    ctx.fillRect(this.x + 12, this.y + 18, 7, 5);
    ctx.fillRect(this.x + 28, this.y + 18, 7, 5);

    // 체력 게이지
    ctx.fillStyle = "#8a7e6d";
    ctx.fillRect(this.x, this.y - 12, this.w, 4);
    ctx.fillStyle = "#221c17";
    ctx.fillRect(this.x, this.y - 12, Math.max(0, (this.hp / 60) * this.w), 4);

    ctx.restore();
  }
}
