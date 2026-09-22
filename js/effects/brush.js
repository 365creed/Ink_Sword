export class BrushEffect {
  constructor(ctx) {
    this.ctx = ctx;
    this.slashes = [];
  }

  // 역입, 중봉, 회봉의 서예 필법을 반영한 붓질 추가
  addSlash(x, y, facing, type = 'normal') {
    this.slashes.push({
      x, y, facing, type,
      life: type === 'heavy' ? 0.35 : (type === 'special' ? 0.8 : 0.22),
      maxLife: type === 'heavy' ? 0.35 : (type === 'special' ? 0.8 : 0.22)
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
        // 필살기: 화면 전체를 대각선으로 베어내는 거대한 묵흔(墨痕)
        ctx.strokeStyle = `rgba(16, 12, 10, ${alpha * 0.95})`;
        ctx.lineWidth = 45 * (1 - progress * 0.3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(100, 120);
        ctx.bezierCurveTo(450, 280, 800, 420, 1180, 600);
        ctx.stroke();

        // 흩날리는 비백(飛白) 먹선
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(120, 100);
        ctx.lineTo(1160, 580);
        ctx.stroke();
      } else if (s.type === 'heavy') {
        // 강공격(破): 묵직하게 가로지르는 굵은 붓질
        ctx.strokeStyle = `rgba(20, 16, 12, ${alpha * 0.95})`;
        ctx.lineWidth = 22 * (1 - progress * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startX = s.x - s.facing * 40;
        const endX = s.x + s.facing * 120;
        ctx.moveTo(startX, s.y + 10);
        ctx.quadraticCurveTo(s.x + s.facing * 40, s.y - 30, endX, s.y + 15);
        ctx.stroke();
      } else {
        // 기본 참격(斬): 날카롭게 곡선을 그리는 붓 한 획
        ctx.strokeStyle = `rgba(28, 24, 20, ${alpha * 0.9})`;
        ctx.lineWidth = 11 * (1 - progress * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startX = s.x;
        const startY = s.y - 45;
        const cpX = s.x + s.facing * 75;
        const cpY = s.y;
        const endX = s.x + s.facing * 20;
        const endY = s.y + 55;
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
