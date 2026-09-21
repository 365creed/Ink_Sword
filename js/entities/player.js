export class Player {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = 60;
    this.height = 80;
  }

  update(dt) {}

  render() {
    this.ctx.save();
    // 한지 배경에 대비되는 진한 먹색 실루엣 캐릭터
    this.ctx.fillStyle = "#1c1917";
    this.ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 검기 궤적 (진한 먹과 번짐 효과)
    this.ctx.strokeStyle = "#292524";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(this.x + 30, this.y + 40, 55, 0, Math.PI);
    this.ctx.stroke();
    this.ctx.restore();
  }
}
