export class InkEffect {
  constructor(ctx) {
    this.ctx = ctx;
    this.splats = [];   // 큰 먹물 덩어리
    this.droplets = []; // 작은 튐
    this.stains = [];   // 바닥에 남는 번진 얼룩
  }

  splash(x, y, count = 16, color = "rgba(22, 18, 15, ") {
    // 1. 큰 먹 덩어리 (불규칙한 형태)
    this.splats.push({
      x, y,
      r: Math.random() * 16 + 12,
      color,
      life: 0.45,
      maxLife: 0.45
    });

    // 2. 작은 튐 (사방으로 비산)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 280 + 70;
      this.droplets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        r: Math.random() * 4 + 1.5,
        color,
        life: 0.55,
        maxLife: 0.55
      });
    }

    // 3. 지면 근처일 경우 바닥 얼룩 생성
    if (y > 520) {
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

  // 패링 시 발동하는 흑백 여백 충격파
  parryBurst(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = Math.random() * 320 + 150;
      this.droplets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 5 + 2,
        color: "rgba(18, 15, 12, ",
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  update(dt) {
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const s = this.splats[i];
      s.life -= dt;
      s.r += dt * 25; // 먹물이 번지며 확장
      if (s.life <= 0) this.splats.splice(i, 1);
    }

    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 600 * dt; // 중력
      d.life -= dt;
      if (d.life <= 0) this.droplets.splice(i, 1);
    }

    for (let i = this.stains.length - 1; i >= 0; i--) {
      const st = this.stains[i];
      st.life -= dt;
      st.alpha = Math.max(0, st.life / 4.0 * 0.45);
      if (st.life <= 0) this.stains.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 바닥 얼룩
    for (const st of this.stains) {
      ctx.fillStyle = `rgba(20, 16, 12, ${st.alpha})`;
      ctx.beginPath();
      ctx.ellipse(st.x, st.y, st.w, st.h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 큰 번짐
    for (const s of this.splats) {
      const a = (s.life / s.maxLife) * 0.85;
      ctx.fillStyle = `${s.color}${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 튄 물방울
    for (const d of this.droplets) {
      const a = d.life / d.maxLife;
      ctx.fillStyle = `${d.color}${a})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
