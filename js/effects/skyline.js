export class SkylineEffect {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.offset = 0;
  }

  update(dt, playerVx) {
    this.offset += playerVx * dt * 0.15;
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // 1. 하늘의 은은한 먹구름 안개
    ctx.fillStyle = "rgba(180, 172, 156, 0.15)";
    ctx.fillRect(0, 0, this.width, 240);

    // 2. 원경: 북한산/인왕산 능선 실루엣 (연한 담묵)
    ctx.fillStyle = "rgba(75, 68, 58, 0.12)";
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 320);
    ctx.quadraticCurveTo(this.width * 0.3 - (this.offset * 0.2) % 300, this.height - 480, this.width * 0.6, this.height - 290);
    ctx.quadraticCurveTo(this.width * 0.85, this.height - 410, this.width, this.height - 260);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // 3. 중경: 강서 갈대 언덕 및 한양 성곽 실루엣 (농묵)
    ctx.fillStyle = "rgba(42, 38, 32, 0.25)";
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 180);
    ctx.quadraticCurveTo(this.width * 0.45 - (this.offset * 0.5) % 400, this.height - 270, this.width * 0.8, this.height - 150);
    ctx.lineTo(this.width, this.height - 200);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // 4. 지면: 거친 붓으로 그은 대지선 (y = 620)
    ctx.strokeStyle = "#2b251e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 620);
    ctx.lineTo(this.width, 620);
    ctx.stroke();

    ctx.restore();
  }
}
