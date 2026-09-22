export class BrushEffect {
  constructor(ctx) {
    this.ctx = ctx;
    this.slashes = [];
  }

  addSlash(x, y, facing, type = 'normal') {
    this.slashes.push({
      x, y, facing, type,
      life: type === 'heavy' ? 0.3 : 0.2,
      maxLife: type === 'heavy' ? 0.3 : 0.2
    });
  }

  update(dt) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life -= dt;
      if (this.slashes[i].life <= 0) this.slashes.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    for (const s of this.slashes) {
      const alpha = s.life / s.maxLife;
      if (s.type === 'heavy') {
        // 강공격 '破' - 묵직한 짙은 붓선
        ctx.strokeStyle = `rgba(18, 15, 12, ${alpha * 0.95})`;
        ctx.lineWidth = 14;
      } else if (s.type === 'parry') {
        // 패링 '返' - 금빛 도는 강한 섬광
        ctx.strokeStyle = `rgba(180, 140, 40, ${alpha})`;
        ctx.lineWidth = 10;
      } else {
        // 기본검격 '斬'
        ctx.strokeStyle = `rgba(32, 28, 23, ${alpha * 0.9})`;
        ctx.lineWidth = 7;
      }
      ctx.lineCap = 'round';
      ctx.beginPath();
      const radius = s.type === 'heavy' ? 110 : 80;
      const start = s.facing > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
      const end = s.facing > 0 ? Math.PI * 0.45 : Math.PI * 1.45;
      ctx.arc(s.x, s.y, radius, start, end);
      ctx.stroke();
    }
    ctx.restore();
  }
}
