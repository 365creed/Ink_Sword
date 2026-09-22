export class BrushEffect {
  constructor(ctx) {
    this.ctx = ctx;
    this.strokes = [];
  }

  addSlash(x, y, facing) {
    this.strokes.push({
      x, y, facing,
      life: 0.25,
      maxLife: 0.25
    });
  }

  update(dt) {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      this.strokes[i].life -= dt;
      if (this.strokes[i].life <= 0) {
        this.strokes.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.save();
    for (const s of this.strokes) {
      const alpha = s.life / s.maxLife;
      this.ctx.strokeStyle = `rgba(20, 18, 15, ${alpha * 0.9})`;
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      const startAngle = s.facing > 0 ? -Math.PI * 0.4 : Math.PI * 0.6;
      const endAngle = s.facing > 0 ? Math.PI * 0.4 : Math.PI * 1.4;
      this.ctx.arc(s.x, s.y, 75, startAngle, endAngle);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}
