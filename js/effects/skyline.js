export class SkylineEffect {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.sway = 0;
  }

  update(dt) {
    this.sway += dt * 3.5;
  }

  render(cameraX, chapter = 1, worldWidth = 3800) {
    const ctx = this.ctx;
    ctx.save();

    // 1. 원경 (느린 스크롤, 계수 0.1)
    const bgOff = cameraX * 0.1;
    ctx.fillStyle = "rgba(75, 68, 58, 0.12)";
    ctx.beginPath();
    ctx.moveTo(cameraX, this.height);
    for (let x = cameraX - 200; x <= cameraX + this.width + 200; x += 300) {
      const hillY = this.height - 300 - Math.sin((x + bgOff) * 0.002) * 80;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(cameraX + this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // 2. 중경 (계수 0.4)
    const midOff = cameraX * 0.4;
    ctx.fillStyle = "rgba(45, 40, 34, 0.22)";
    ctx.beginPath();
    ctx.moveTo(cameraX, this.height);
    for (let x = cameraX - 150; x <= cameraX + this.width + 150; x += 200) {
      const midY = this.height - 180 - Math.cos((x + midOff) * 0.005) * 45;
      ctx.lineTo(x, midY);
    }
    ctx.lineTo(cameraX + this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // 3. 지면 및 전경 갈대밭 (월드 전체 x축 생성)
    ctx.strokeStyle = "#27221b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 620);
    ctx.lineTo(worldWidth, 620);
    ctx.stroke();

    ctx.strokeStyle = "rgba(42, 36, 30, 0.35)";
    ctx.lineWidth = 2.5;
    const startX = Math.max(0, Math.floor(cameraX / 40) * 40);
    const endX = Math.min(worldWidth, cameraX + this.width + 50);

    for (let rx = startX; rx < endX; rx += 38) {
      const s = Math.sin(this.sway + rx) * 12;
      ctx.beginPath();
      ctx.moveTo(rx, 620);
      ctx.quadraticCurveTo(rx + s * 0.5, 570, rx + s, 530);
      ctx.stroke();
    }

    ctx.restore();
  }
}
