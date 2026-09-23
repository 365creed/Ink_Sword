export class BrushEffect {
  constructor(ctx) {
    this.ctx = ctx;
    this.slashes = [];
  }

  addSlash(x, y, facing, type = 'normal') {
    this.slashes.push({
      x, y, facing, type,
      life: type === 'heavy' ? 0.35 : (type === 'special' ? 0.75 : 0.22),
      maxLife: type === 'heavy' ? 0.35 : (type === 'special' ? 0.75 : 0.22)
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
      const progress = 1 - (s.life / s.maxLife);
      const alpha = Math.max(0, 1 - progress);

      if (s.type === 'special') {
        ctx.strokeStyle = `rgba(16, 12, 10, ${alpha * 0.95})`;
        ctx.lineWidth = 45 * (1 - progress * 0.3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x - 500, s.y - 250);
        ctx.bezierCurveTo(s.x - 100, s.y, s.x + 200, s.y + 100, s.x + 600, s.y + 250);
        ctx.stroke();
      } else if (s.type === 'heavy') {
        ctx.strokeStyle = `rgba(20, 16, 12, ${alpha * 0.95})`;
        ctx.lineWidth = 24 * (1 - progress * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startX = s.x - s.facing * 40;
        const endX = s.x + s.facing * 140;
        ctx.moveTo(startX, s.y + 10);
        ctx.quadraticCurveTo(s.x + s.facing * 50, s.y - 35, endX, s.y + 15);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(28, 24, 20, ${alpha * 0.9})`;
        ctx.lineWidth = 12 * (1 - progress * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 45);
        ctx.quadraticCurveTo(s.x + s.facing * 80, s.y, s.x + s.facing * 25, s.y + 55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
