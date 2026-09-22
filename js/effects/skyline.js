export class SkylineEffect {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.offset = 0;
    this.reedSway = 0;
  }

  update(dt, playerVx) {
    this.offset += playerVx * dt * 0.15;
    this.reedSway += dt * 3.5;
  }

  render(chapter = 1) {
    const ctx = this.ctx;
    ctx.save();

    // 1. 상단 원경 먹안개
    ctx.fillStyle = "rgba(195, 187, 172, 0.18)";
    ctx.fillRect(0, 0, this.width, 260);

    if (chapter === 1) {
      // 제1장 강서(江西): 한강 나루터와 갈대밭, 원경의 낮은 구릉
      ctx.fillStyle = "rgba(75, 68, 58, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      ctx.lineTo(0, this.height - 290);
      ctx.quadraticCurveTo(this.width * 0.35, this.height - 420, this.width * 0.7, this.height - 270);
      ctx.lineTo(this.width, this.height - 310);
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();

      // 한강 강물 실루엣 선
      ctx.strokeStyle = "rgba(60, 54, 46, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 560);
      ctx.lineTo(this.width, 560);
      ctx.stroke();

      // 흔들리는 수묵 갈대밭
      ctx.strokeStyle = "rgba(42, 36, 30, 0.35)";
      ctx.lineWidth = 2.5;
      for (let x = 30; x < this.width; x += 35) {
        const sway = Math.sin(this.reedSway + x) * 12;
        ctx.beginPath();
        ctx.moveTo(x, 620);
        ctx.quadraticCurveTo(x + sway * 0.5, 570, x + sway, 530);
        ctx.stroke();
      }
    } else {
      // 제2장 강북(江北): 험준한 북한산 암봉과 한양 성곽
      ctx.fillStyle = "rgba(60, 52, 44, 0.16)";
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      ctx.lineTo(0, this.height - 380);
      ctx.lineTo(this.width * 0.3, this.height - 520);
      ctx.lineTo(this.width * 0.65, this.height - 340);
      ctx.lineTo(this.width, this.height - 460);
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();
    }

    // 지면 수묵 경계선
    ctx.strokeStyle = "#27221b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 620);
    ctx.lineTo(this.width, 620);
    ctx.stroke();

    ctx.restore();
  }
}
