export class SkylineEffect {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  update(dt) {}

  render() {
    this.ctx.save();
    // 1. 원경 안개산 (먹 농담)
    this.ctx.fillStyle = "rgba(65, 60, 52, 0.12)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 280);
    this.ctx.quadraticCurveTo(this.width * 0.25, this.height - 440, this.width * 0.55, this.height - 260);
    this.ctx.quadraticCurveTo(this.width * 0.8, this.height - 380, this.width, this.height - 230);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // 2. 근경 산 능선
    this.ctx.fillStyle = "rgba(35, 32, 28, 0.25)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 150);
    this.ctx.quadraticCurveTo(this.width * 0.4, this.height - 250, this.width * 0.75, this.height - 130);
    this.ctx.lineTo(this.width, this.height - 180);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. 지면 바닥선
    this.ctx.strokeStyle = "#2e2922";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height - 100);
    this.ctx.lineTo(this.width, this.height - 100);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
