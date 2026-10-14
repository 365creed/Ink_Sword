import { GameState } from '../core/state.js';

export const SkylineRenderer = {
  mountains: [],
  bamboos: [],
  mistClouds: [],

  init() {
    // 3개 층위의 수묵 산맥 능선 시드 생성 (원경, 중경, 근경)
    this.mountains = [
      { parallax: 0.12, baseHeight: 420, amp: 110, color: 'rgba(61, 59, 56, 0.22)', seed: 1.3 },
      { parallax: 0.28, baseHeight: 490, amp: 85, color: 'rgba(40, 38, 36, 0.38)', seed: 2.7 },
      { parallax: 0.48, baseHeight: 560, amp: 60, color: 'rgba(20, 20, 19, 0.55)', seed: 4.1 }
    ];

    // 수묵 대나무 숲 오브젝트 생성
    this.bamboos = Array.from({ length: 28 }, (_, i) => ({
      worldX: i * 190 + (Math.random() * 80 - 40),
      height: 180 + Math.random() * 220,
      thickness: 3 + Math.random() * 4,
      lean: (Math.random() - 0.5) * 0.12
    }));

    // 흐르는 안개 구름
    this.mistClouds = Array.from({ length: 8 }, (_, i) => ({
      x: i * 320,
      y: 380 + (i % 3) * 85,
      width: 280 + Math.random() * 180,
      speed: 12 + Math.random() * 18
    }));
  },

  update(dt) {
    this.mistClouds.forEach((m) => {
      m.x -= m.speed * dt;
      if (m.x + m.width < -200) {
        m.x = 2600;
      }
    });
  },

  render(ctx, camera, canvasWidth, canvasHeight) {
    ctx.save();

    const isBerserk = GameState.playerStats.isBerserk;
    const karmaRatio = GameState.playerStats.karma / 100;

    // 1. 한지 배경 바탕색 (혈묵 수치에 따라 미세하게 붉은 기운이 감돎)
    ctx.fillStyle = isBerserk ? '#dcc5c1' : '#e8e2d5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. 화폭의 달 / 거대한 붉은 낙관 태양
    const moonX = canvasWidth * 0.78 - camera.x * 0.04;
    const moonY = 140;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 68, 0, Math.PI * 2);
    ctx.fillStyle = isBerserk
      ? 'rgba(201, 42, 42, 0.75)'
      : `rgba(201, 42, 42, ${0.18 + karmaRatio * 0.45})`;
    ctx.fill();

    // 3. 패럴랙스 수묵 산수화 능선 렌더링
    this.mountains.forEach((layer) => {
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight);

      for (let x = 0; x <= canvasWidth; x += 24) {
        const wx = x + camera.x * layer.parallax;
        const y =
          layer.baseHeight -
          Math.sin(wx * 0.0025 + layer.seed) * layer.amp -
          Math.cos(wx * 0.006 - layer.seed) * (layer.amp * 0.45);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(canvasWidth, canvasHeight);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });

    // 4. 중경 수묵 대나무 실루엣 렌더링
    ctx.strokeStyle = 'rgba(20, 20, 19, 0.35)';
    this.bamboos.forEach((b) => {
      const sx = b.worldX - camera.x * 0.65;
      if (sx < -60 || sx > canvasWidth + 60) return;

      const bottomY = canvasHeight - 40;
      const segments = 5;
      const segHeight = b.height / segments;

      let curX = sx;
      let curY = bottomY;

      for (let s = 0; s < segments; s++) {
        const nextX = curX + b.lean * segHeight;
        const nextY = curY - segHeight;

        ctx.lineWidth = b.thickness;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        // 대나무 마디 표현
        ctx.lineWidth = b.thickness + 2;
        ctx.beginPath();
        ctx.moveTo(nextX - 4, nextY);
        ctx.lineTo(nextX + 4, nextY);
        ctx.stroke();

        curX = nextX;
        curY = nextY;
      }
    });

    // 5. 화폭 안개 레이어
    this.mistClouds.forEach((m) => {
      const sx = ((m.x - camera.x * 0.35) % (canvasWidth + 600)) - 200;
      const grad = ctx.createLinearGradient(sx, m.y, sx + m.width, m.y);
      grad.addColorStop(0, 'rgba(232, 226, 213, 0)');
      grad.addColorStop(0.5, 'rgba(232, 226, 213, 0.55)');
      grad.addColorStop(1, 'rgba(232, 226, 213, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(sx, m.y, m.width, 46);
    });

    ctx.restore();
  }
};
