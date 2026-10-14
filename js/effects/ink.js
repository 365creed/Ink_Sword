export const InkEffects = {
  particles: [],    // 튀기는 먹물 방울
  afterimages: [],  // 대시 및 고속 사슬 이동 잔상
  stains: [],       // 지형에 묻은 먹물/혈묵 얼룩 (화폭 손상 표현)

  init() {
    this.particles = [];
    this.afterimages = [];
    this.stains = [];
  },

  // 먹물 스플래시 생성 (타격, 피격, 점프, 착지 시)
  spawnSplash(x, y, count = 12, color = '#141413', speedScale = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (60 + Math.random() * 240) * speedScale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        radius: 2.5 + Math.random() * 5.5,
        color,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9,
        gravity: 520
      });
    }
  },

  // 메가맨 제로 + 산나비 스타일 먹물 잔상 추가
  spawnAfterimage({ x, y, width, height, facing, color = 'rgba(20, 20, 19, 0.5)' }) {
    this.afterimages.push({
      x,
      y,
      width,
      height,
      facing,
      color,
      life: 0.25,
      maxLife: 0.25
    });
  },

  // 지형 표면에 먹물 얼룩 남기기
  addStain(x, y, radius = 14, color = '#141413') {
    if (this.stains.length > 180) {
      this.stains.shift(); // 성능 유지를 위해 오래된 얼룩부터 제거
    }
    this.stains.push({
      x,
      y,
      radius,
      color,
      alpha: 0.55 + Math.random() * 0.25
    });
  },

  update(dt, platforms = []) {
    // 1. 먹물 파티클 물리 업데이트 및 지형 착지 시 얼룩 변환
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;

      // 플랫폼에 닿으면 화폭에 먹물 얼룩으로 스며듦
      for (let p = 0; p < platforms.length; p++) {
        const plat = platforms[p];
        if (
          pt.x >= plat.x &&
          pt.x <= plat.x + plat.w &&
          pt.y >= plat.y &&
          pt.y <= plat.y + 14 &&
          pt.vy > 0
        ) {
          if (Math.random() < 0.35) {
            this.addStain(pt.x, plat.y + 2, pt.radius * 1.4, pt.color);
          }
          pt.life = 0;
          break;
        }
      }

      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. 잔상 수명 감소
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) {
        this.afterimages.splice(i, 1);
      }
    }
  },

  render(ctx, camera) {
    ctx.save();

    // 1. 지형에 스며든 먹물 얼룩 렌더링
    this.stains.forEach((st) => {
      const sx = st.x - camera.x;
      const sy = st.y - camera.y;
      if (sx < -50 || sx > 1330) return;

      ctx.globalAlpha = st.alpha;
      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.ellipse(sx, sy, st.radius * 1.5, st.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. 대시 잔상 렌더링 (검객 실루엣)
    this.afterimages.forEach((af) => {
      const sx = af.x - camera.x;
      const sy = af.y - camera.y;
      ctx.globalAlpha = (af.life / af.maxLife) * 0.55;
      ctx.fillStyle = af.color;

      // 삿갓과 도포 자락 형태의 수묵 잔상
      ctx.beginPath();
      ctx.moveTo(sx - af.width * 0.6, sy - af.height * 0.35);
      ctx.lineTo(sx + af.width * 0.6, sy - af.height * 0.35);
      ctx.lineTo(sx, sy - af.height * 0.62);
      ctx.closePath();
      ctx.fill();

      ctx.fillRect(sx - af.width * 0.35, sy - af.height * 0.35, af.width * 0.7, af.height * 0.8);
    });

    // 3. 공중에 튀는 먹물 파티클 렌더링
    this.particles.forEach((pt) => {
      const sx = pt.x - camera.x;
      const sy = pt.y - camera.y;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
};
