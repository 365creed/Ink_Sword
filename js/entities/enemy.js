import { InkEffects } from '../effects/ink.js';
import { SoundSystem } from '../core/sound.js';

let enemyIdCounter = 1;

export class Enemy {
  constructor(x, y, type = 'INK_GHOST') {
    this.id = `enemy_${enemyIdCounter++}`;
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.type = type; // 'INK_GHOST' | 'ARCHER' | 'WARDEN'

    this.width = type === 'WARDEN' ? 42 : 36;
    this.height = type === 'WARDEN' ? 48 : 50;

    this.maxHp = type === 'WARDEN' ? 95 : type === 'ARCHER' ? 55 : 70;
    this.hp = this.maxHp;
    this.isDead = false;

    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.attackTimer = 1.5 + Math.random();
    this.hitFlashTimer = 0;
    this.animSeed = Math.random() * 10;
  }

  update(dt, player, stage) {
    if (this.isDead) return;
    this.animSeed += dt * 5;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.type === 'INK_GHOST') {
      // 묵귀: 플레이어 감지 시 빠르게 접근하여 도약 할퀴기
      if (dist < 420) {
        this.vx += (this.facing * 210 - this.vx) * dt * 5;
        if (dist < 54 && Math.abs(dy) < 48) {
          player.takeDamage(14, this.facing);
        }
      } else {
        // 순찰 이동
        this.vx = Math.sin(this.animSeed * 0.4) * 90;
      }
      this.vy = Math.min(800, this.vy + 1200 * dt);
    } else if (this.type === 'ARCHER') {
      // 화폭 궁수: 거리를 유지하며 먹물 화살 조준 발사
      this.vx *= 0.85;
      this.vy = Math.min(800, this.vy + 1200 * dt);

      if (dist < 560) {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackTimer = 2.1;
          const angle = Math.atan2(dy - 10, dx);
          stage.spawnProjectile({
            x: this.x,
            y: this.y - 8,
            vx: Math.cos(angle) * 460,
            vy: Math.sin(angle) * 460,
            damage: 16,
            color: '#141413',
            fromEnemy: true
          });
          SoundSystem.playSlash(1);
        }
      }
    } else if (this.type === 'WARDEN') {
      // 계율 감시자: 공중에 떠서 플레이어 주변을 압박하며 붉은 부적 구체 발사
      const targetY = player.y - 110 + Math.sin(this.animSeed) * 25;
      this.vy = (targetY - this.y) * 2.5;
      if (dist < 520 && dist > 160) {
        this.vx = this.facing * 110;
      } else {
        this.vx *= 0.9;
      }

      this.attackTimer -= dt;
      if (this.attackTimer <= 0 && dist < 550) {
        this.attackTimer = 2.6;
        const angle = Math.atan2(dy, dx);
        stage.spawnProjectile({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 340,
          vy: Math.sin(angle) * 340,
          damage: 20,
          color: '#c92a2a',
          fromEnemy: true
        });
      }
    }

    // 이동 및 플랫폼 바닥 충돌
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.type !== 'WARDEN') {
      const halfH = this.height * 0.5;
      for (const p of stage.platforms) {
        if (
          this.x > p.x &&
          this.x < p.x + p.w &&
          this.y + halfH >= p.y &&
          this.y + halfH <= p.y + 24 &&
          this.vy >= 0
        ) {
          this.y = p.y - halfH;
          this.vy = 0;
        }
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    if (sx < -80 || sx > 1360) return;

    ctx.save();
    ctx.translate(sx, sy);

    // 체력바 표시 (피격된 적만)
    if (this.hp < this.maxHp) {
      ctx.fillStyle = 'rgba(20,20,19,0.5)';
      ctx.fillRect(-20, -this.height * 0.5 - 12, 40, 5);
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(-20, -this.height * 0.5 - 12, 40 * (this.hp / this.maxHp), 5);
    }

    ctx.scale(this.facing, 1);
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#c92a2a' : '#141413';

    if (this.type === 'INK_GHOST') {
      // 일그러진 먹물 망령 실루엣
      ctx.beginPath();
      ctx.arc(0, -10, 14, Math.PI, 0);
      ctx.lineTo(16, 22 + Math.sin(this.animSeed) * 4);
      ctx.lineTo(0, 16);
      ctx.lineTo(-16, 24 - Math.sin(this.animSeed) * 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e8e2d5';
      ctx.fillRect(4, -12, 5, 3);
    } else if (this.type === 'ARCHER') {
      // 삿갓 쓴 화폭 궁수
      ctx.fillRect(-10, -12, 20, 34);
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(18, -12);
      ctx.lineTo(0, -24);
      ctx.closePath();
      ctx.fill();

      // 활(弓) 렌더링
      ctx.strokeStyle = '#9e1b1b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(8, 0, 18, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else if (this.type === 'WARDEN') {
      // 공중에 떠 있는 부적 감시자
      ctx.rotate(Math.sin(this.animSeed * 0.5) * 0.15);
      ctx.strokeStyle = '#c92a2a';
      ctx.lineWidth = 3;
      ctx.strokeRect(-18, -22, 36, 44);
      ctx.fillRect(-12, -16, 24, 32);

      ctx.fillStyle = '#e8e2d5';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('禁', 0, 6);
    }

    ctx.restore();
  }
}
