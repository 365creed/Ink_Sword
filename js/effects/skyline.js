export class SkylineEffect {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }
  update(dt) {
    // 배경 산수화 흐름 업데이트
  }
  render() {
    this.ctx.save();
    // 농담이 살아있는 수묵 능선 (먹물 톤)
    this.ctx.fillStyle = "rgba(70, 65, 58, 0.15)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 220);
    this.ctx.quadraticCurveTo(this.width / 3, this.height - 380, this.width * 0.7, this.height - 200);
    this.ctx.lineTo(this.width, this.height - 260);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // 전경 능선
    this.ctx.fillStyle = "rgba(40, 37, 33, 0.3)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 120);
    this.ctx.quadraticCurveTo(this.width / 2, this.height - 220, this.width, this.height - 140);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}
