export const BrushEffects = {
  slashes: [],         // 검기 궤적 배열
  waves: [],           // 파천의 낙관 발도 검기 투사체 배열
  repaintAnim: null,   // 사망 후 부활(덧칠) 전체화면 연출 객체

  init() {
    this.slashes = [];
    this.waves = [];
    this.repaintAnim = null;
  },

  // 붓터치 검기 생성 (갈필 효과)
  spawnSlashArc({ x, y, radius, startAngle, endAngle, dir = 1, color = '#141413', isCharge = false }) {
    this.slashes.push({
      x,
      y,
      radius,
      startAngle,
      endAngle,
      dir,
      color,
      isCharge,
      life: 1.0,
      decay: isCharge ? 3.2 : 5.5,
      bristles: Array.from({ length: isCharge ? 7 : 4 }, (_, i) => ({
        offsetRadius: (i - 2) * (isCharge ? 5 : 3),
        thickness: (isCharge ? 14 : 8) - i * 1.5,
        alphaMul: 1 - i * 0.12
      }))
    });
  },

  // 파천의 낙관 : 전방으로 날아가는 초승달 수묵 검기 생성
  spawnSlashWave({ x, y, vx, color = '#c92a2a', damage = 35 }) {
    this.waves.push({
      x,
      y,
      vx,
      width: 36,
      height: 84,
      color,
      damage,
      life: 1.2,
      hitIds: new Set()
    });
  },

  // 사망 시 화면 전체를 쓸고 지나가는 '덧칠(부활)' 거대 붓 연출 시작
  triggerRepaintRevive(onMidpointCallback) {
    this.repaintAnim = {
      progress: 0,
      triggeredMid: false,
      onMidpoint: onMidpointCallback
    };
  },

  update(dt, enemies = [], boss = null, onEnemyHit = null) {
    // 1. 검기 궤적 업데이트
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= s.decay * dt;
      if (s.life <= 0) {
        this.slashes.splice(i, 1);
      }
    }

    // 2. 날아가는 초승달 검기(파천의 낙관) 업데이트 및 충돌 판정
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.x += w.vx * dt;
      w.life -= dt;

      const targets = [...enemies];
      if (boss && !boss.isDead) targets.push(boss);

      targets.forEach((t) => {
        if (!w.hitIds.has(t.id) &&
            Math.abs(w.x - t.x) < (w.width + t.width) * 0.5 &&
            Math.abs(w.y - t.y) < (w.height + t.height) * 0.5) {
          w.hitIds.add(t.id);
          if (onEnemyHit) onEnemyHit(t, w.damage, Math.sign(w.vx));
        }
      });

      if (w.life <= 0) {
        this.waves.splice(i, 1);
      }
    }

    // 3. 부활(덧칠) 애니메이션 진행
    if (this.repaintAnim) {
      this.repaintAnim.progress += dt * 1.4;
      if (this.repaintAnim.progress >= 0.5 && !this.repaintAnim.triggeredMid) {
        this.repaintAnim.triggeredMid = true;
        if (this.repaintAnim.onMidpoint) this.repaintAnim.onMidpoint();
      }
      if (this.repaintAnim.progress >= 1.0) {
        this.repaintAnim = null;
      }
    }
  },

  render(ctx, camera) {
    ctx.save();

    // 1. 갈필 검기 궤적 렌더링
    this.slashes.forEach((s) => {
      const screenX = s.x - camera.x;
      const screenY = s.y - camera.y;

      s.bristles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(
          screenX,
          screenY,
          Math.max(8, s.radius + b.offsetRadius),
          s.startAngle,
          s.endAngle,
          s.dir < 0
        );
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.life * b.alphaMul);
        ctx.lineWidth = Math.max(1, b.thickness * s.life);
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // 차지 베기 시 붉은 인주 빛무리 추가
      if (s.isCharge) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, s.radius + 8, s.startAngle, s.endAngle, s.dir < 0);
        ctx.strokeStyle = '#c92a2a';
        ctx.globalAlpha = Math.max(0, s.life * 0.6);
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });

    // 2. 파천의 낙관 검기 파동 렌더링
    this.waves.forEach((w) => {
      const sx = w.x - camera.x;
      const sy = w.y - camera.y;
      const dir = Math.sign(w.vx) || 1;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(dir, 1);
      ctx.globalAlpha = Math.min(1, w.life * 1.5);

      ctx.beginPath();
      ctx.arc(-15, 0, w.height * 0.55, -Math.PI * 0.42, Math.PI * 0.42, false);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-10, 0, w.height * 0.5, -Math.PI * 0.35, Math.PI * 0.35, false);
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  },

  // 최상단 레이어에 그려지는 부활(덧칠) 연출
  renderOverlay(ctx, canvasWidth, canvasHeight) {
    if (!this.repaintAnim) return;

    const p = this.repaintAnim.progress;
    ctx.save();

    // 거대한 먹물 붓자국이 화면 좌에서 우로 덮고 지나감
    const sweepX = p < 0.5 ? (p * 2) * canvasWidth : canvasWidth;
    const fadeAlpha = p < 0.5 ? 1 : 1 - (p - 0.5) * 2;

    ctx.globalAlpha = Math.max(0, fadeAlpha);
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, sweepX, canvasHeight);

    // 붓질 경계선의 갈필 표현
    for (let y = 0; y < canvasHeight; y += 28) {
      ctx.fillStyle = y % 56 === 0 ? '#141413' : '#9e1b1b';
      ctx.fillRect(sweepX - 40, y, 80 * Math.sin(p * Math.PI), 20);
    }

    // 중앙 한자 각인 연출 ("다시 그리다 : 重描")
    if (p > 0.25 && p < 0.85) {
      ctx.fillStyle = '#e8e2d5';
      ctx.font = 'bold 64px "East Sea Dokdo", serif';
      ctx.textAlign = 'center';
      ctx.fillText('【 탈묵(脫墨) 후 덧칠하여 소생하다 】', canvasWidth * 0.5, canvasHeight * 0.48);
      ctx.fillStyle = '#c92a2a';
      ctx.font = 'bold 22px "Noto Serif KR", serif';
      ctx.fillText('화폭에 덧칠이 반복될수록 당신의 영혼은 점차 괴물로 번져갑니다.', canvasWidth * 0.5, canvasHeight * 0.56);
    }

    ctx.restore();
  }
};
