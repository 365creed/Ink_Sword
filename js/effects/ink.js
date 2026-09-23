export class InkEffect {
  constructor(ctx) {
    this.ctx = ctx;
    // GC 부담을 없애기 위한 100개 파티클 풀 사전 할당
    this.poolSize = 100;
    this.particles = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.particles.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0, r: 0,
        color: "rgba(22, 18, 15, ",
        life: 0, maxLife: 0.5
      });
    }
    this.stains = [];
  }

  getFreeParticle() {
    for (let i = 0; i < this.poolSize; i++) {
      if (!this.particles[i].active) return this.particles[i];
    }
    return null;
  }

  splash(x, y, count = 16, color = "rgba(22, 18, 15, ") {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 60;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 60;
      p.r = Math.random() * 5 + 2;
      p.color = color;
      p.life = 0.55;
      p.maxLife = 0.55;
    }

    if (y > 520 && this.stains.length < 40) {
      this.stains.push({
        x: x + (Math.random() - 0.5) * 40,
        y: 618,
        w: Math.random() * 35 + 20,
        h: Math.random() * 8 + 4,
        alpha: 0.45,
        life: 4.0
      });
    }
  }

  parryBurst(x, y) {
    for (let i = 0; i < 28; i++) {
      const p = this.getFreeParticle();
      if (!p) break;
      const angle = (i / 28) * Math.PI * 2;
      const speed = Math.random() * 340 + 150;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.r = Math.random() * 6 + 2.5;
      p.color = "rgba(18, 15, 12, ";
      p.life = 0.45;
      p.maxLife = 0.45;
    }
  }

  update(dt) {
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 650 * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }

    for (let i = this.stains.length - 1; i >= 0; i--) {
      const st = this.stains[i];
      st.life -= dt;
      st.alpha = Math.max(0, (st.life / 4.0) * 0.45);
      if (st.life <= 0) this.stains.splice(i, 1);
    }
  }

  render(cameraX) {
    const ctx = this.ctx;
    ctx.save();

    for (const st of this.stains) {
      if (st.x + st.w < cameraX || st.x > cameraX + 1280) continue; // 컬링
      ctx.fillStyle = `rgba(20, 16, 12, ${st.alpha})`;
      ctx.beginPath();
      ctx.ellipse(st.x, st.y, st.w, st.h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.x < cameraX - 50 || p.x > cameraX + 1330) continue; // 컬링
      const a = p.life / p.maxLife;
      ctx.fillStyle = `${p.color}${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
