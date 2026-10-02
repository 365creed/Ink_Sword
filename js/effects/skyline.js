// js/effects/skyline.js
class Skyline {
  constructor() {
    this.windTick = 0;
    this.rainDrops = Array.from({ length: 65 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 450,
      len: 12 + Math.random() * 18,
      speed: 14 + Math.random() * 8
    }));
    this.cinders = Array.from({ length: 35 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 450,
      size: 1.5 + Math.random() * 2.5,
      vx: -(0.5 + Math.random() * 1.5),
      vy: -(0.8 + Math.random() * 1.2)
    }));
  }

  update(dt) {
    this.windTick += dt * 3;
    
    // 3장 비 파티클 업데이트
    for (const drop of this.rainDrops) {
      drop.y += drop.speed;
      drop.x -= 3.5;
      if (drop.y > 450) {
        drop.y = -20;
        drop.x = Math.random() * 850;
      }
    }

    // 4장 불탄 재 파티클 업데이트
    for (const c of this.cinders) {
      c.x += c.vx;
      c.y += c.vy;
      if (c.y < -10 || c.x < -10) {
        c.y = 450 + Math.random() * 20;
        c.x = Math.random() * 800 + 50;
      }
    }
  }

  render(ctx, cameraX, chapter) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.save();
    switch (chapter) {
      case 1: this.renderGangseo(ctx, W, H, cameraX); break;
      case 2: this.renderGangbuk(ctx, W, H, cameraX); break;
      case 3: this.renderGangdong(ctx, W, H, cameraX); break;
      case 4: this.renderGangnam(ctx, W, H, cameraX); break;
      case 5: this.renderPalace(ctx, W, H, cameraX); break;
      default: this.renderGangseo(ctx, W, H, cameraX); break;
    }
    ctx.restore();
  }

  // 1장 강서: 나루터와 갈대숲, 흐릿한 달
  renderGangseo(ctx, W, H, camX) {
    ctx.fillStyle = '#eae6dd';
    ctx.fillRect(0, 0, W, H);

    // 원경: 흐린 초승달
    ctx.fillStyle = 'rgba(50, 50, 50, 0.12)';
    ctx.beginPath();
    ctx.arc(W * 0.78 - camX * 0.02, 90, 36, 0, Math.PI * 2);
    ctx.fill();

    // 중경: 안개 낀 언덕과 버려진 배 실루엣 (0.2x)
    ctx.fillStyle = 'rgba(40, 40, 40, 0.28)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) {
      const y = H - 80 + Math.sin((x + camX * 0.2) * 0.012) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.fill();

    // 근경: 바람에 흔들리는 갈대숲 줄기 (0.6x)
    ctx.strokeStyle = 'rgba(25, 25, 25, 0.7)';
    ctx.lineWidth = 2.2;
    const reedSpacing = 16;
    const reedOffset = (camX * 0.6) % reedSpacing;
    for (let x = -reedSpacing; x < W + reedSpacing; x += reedSpacing) {
      const sway = Math.sin(this.windTick + x * 0.08) * 12;
      ctx.beginPath();
      ctx.moveTo(x - reedOffset, H);
      ctx.quadraticCurveTo(x - reedOffset + sway * 0.4, H - 40, x - reedOffset + sway, H - 85);
      ctx.stroke();
    }
  }

  // 2장 강북: 북악산 암봉군과 도성 성곽
  renderGangbuk(ctx, W, H, camX) {
    ctx.fillStyle = '#dedad2';
    ctx.fillRect(0, 0, W, H);

    // 원경: 험준한 산세 (0.1x)
    ctx.fillStyle = 'rgba(40, 40, 40, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, 160);
    ctx.lineTo(W * 0.3 - camX * 0.08, 90);
    ctx.lineTo(W * 0.65 - camX * 0.08, 140);
    ctx.lineTo(W, 110);
    ctx.lineTo(W, H);
    ctx.fill();

    // 중경: 한양도성 여장(성벽) 실루엣 (0.35x)
    ctx.fillStyle = 'rgba(20, 20, 20, 0.55)';
    const wallStep = 40;
    const wallOff = (camX * 0.35) % wallStep;
    for (let x = -wallStep; x < W + wallStep; x += wallStep) {
      ctx.fillRect(x - wallOff, H - 110, wallStep - 6, 110);
      ctx.fillRect(x - wallOff, H - 122, 14, 12); // 성벽 총안
    }
  }

  // 3장 강동: 수문(水門)과 폭풍우 뇌우
  renderGangdong(ctx, W, H, camX) {
    ctx.fillStyle = '#222426';
    ctx.fillRect(0, 0, W, H);

    // 중경: 거대한 목조 격자 수문 구조물 (0.3x)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.7)';
    const gateX = (( -camX * 0.3) % 450) + 120;
    ctx.fillRect(gateX, H - 240, 200, 240);
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 4;
    for (let gx = gateX + 20; gx < gateX + 200; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, H - 240);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }

    // 근경: 내리꽂히는 먹물 빗줄기
    ctx.strokeStyle = 'rgba(210, 210, 210, 0.35)';
    ctx.lineWidth = 1.6;
    for (const d of this.rainDrops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 5, d.y + d.len);
      ctx.stroke();
    }
  }

  // 4장 강남: 불탄 저잣거리와 흩날리는 재
  renderGangnam(ctx, W, H, camX) {
    ctx.fillStyle = '#2e2624';
    ctx.fillRect(0, 0, W, H);

    // 중경: 기울어진 홍살문과 무너진 초가/기와 처마 (0.3x)
    ctx.fillStyle = 'rgba(15, 12, 12, 0.75)';
    const streetOff = (camX * 0.3) % 300;
    ctx.fillRect(100 - streetOff, H - 140, 18, 140);
    ctx.fillRect(170 - streetOff, H - 140, 18, 140);
    ctx.fillRect(80 - streetOff, H - 150, 130, 15); // 홍살문 들보

    // 근경: 공중에 부유하는 먹빛 재(Cinder)
    ctx.fillStyle = 'rgba(235, 110, 50, 0.7)';
    for (const c of this.cinders) {
      ctx.fillRect(c.x, c.y, c.size, c.size);
    }
  }

  // 5장 한양궁: 묵재에 잠식된 근정전 회랑과 소용돌이
  renderPalace(ctx, W, H, camX) {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, W, H);

    // 원경: 하늘의 먹물 블랙홀 소용돌이
    ctx.strokeStyle = 'rgba(180, 20, 20, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, 90, 55 + Math.sin(this.windTick) * 6, 0, Math.PI * 2);
    ctx.stroke();

    // 중경: 거대한 궁궐 원기둥 열주 (0.4x)
    ctx.fillStyle = 'rgba(5, 5, 6, 0.9)';
    const colStep = 110;
    const colOff = (camX * 0.4) % colStep;
    for (let x = -colStep; x < W + colStep; x += colStep) {
      ctx.fillRect(x - colOff, 0, 36, H);
      ctx.fillRect(x - colOff - 8, H - 90, 52, 16); // 주춧돌
    }
  }
}
