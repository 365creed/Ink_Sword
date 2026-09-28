import { GameState } from '../core/state.js';

export class Enemy {
  constructor(ctx, x, y, type = 'grunt') {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.type = type;

    if (type === 'grunt') {
      this.w = 54; this.h = 92; this.hp = 55; this.speed = 115; this.dmg = 12;
    } else if (type === 'archer') {
      this.w = 50; this.h = 86; this.hp = 38; this.speed = 85; this.dmg = 14;
    } else {
      this.w = 64; this.h = 78; this.hp = 35; this.speed = 240; this.dmg = 18;
    }

    this.isDead = false;
    this.deathTimer = 0.35;
    this.atkCooldown = Math.random() * 1.5 + 1.2;

    this.phase = 'idle'; // idle, windup(0.35s), tell(0.12s), swing, recovery(0.4s)
    this.phaseTimer = 0;
  }

  takeDamage(amount, ink) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      ink.splash(this.x + this.w / 2, this.y + this.h / 2, 22);
    }
  }

  update(dt, player, ink, engine, otherEnemies = []) {
    if (this.isDead) {
      this.deathTimer -= dt;
      return;
    }

    // 적 간 겹침 방지 (Separation Force)
    for (const other of otherEnemies) {
      if (other !== this && !other.isDead) {
        const dx = this.x - other.x;
        if (Math.abs(dx) < 45) {
          const push = (45 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1);
          this.x += push * dt * 6;
        }
      }
    }

    const dist = Math.abs(this.x - player.x);
    this.atkCooldown -= dt;

    if (this.phaseTimer > 0) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.phase === 'windup') {
          this.phase = 'tell';
          this.phaseTimer = 0.12; // 2단계 패링 섬광 발생 (0.12초)
        } else if (this.phase === 'tell') {
          this.phase = 'swing';
          if (dist < (this.type === 'archer' ? 550 : 90)) {
            const res = player.takeDamage(this.dmg, ink, engine);
            if (res === 'parried') {
              this.phase = 'recovery';
              this.phaseTimer = 0.6; // 패링당하면 긴 그로기
            } else {
              this.phase = 'idle';
              this.atkCooldown = 2.0;
            }
          } else {
            // 헛방 친 경우 칼이 바닥에 박힘 (0.4초 무방비)
            this.phase = 'recovery';
            this.phaseTimer = 0.4;
          }
        } else if (this.phase === 'recovery') {
          this.phase = 'idle';
          this.atkCooldown = 1.8;
        }
      }
      return;
    }

    // 결계 안전 마진(SAFE_MARGIN = 160) 준수
    let enemyMaxX = GameState.worldWidth - 50;
    if (GameState.activeBarrierX !== null) {
      enemyMaxX = GameState.activeBarrierX - 160;
    }
    let enemyMinX = 30;
    if (GameState.minBarrierX !== null) {
      enemyMinX = GameState.minBarrierX + 60;
    }

    if (this.type === 'grunt') {
      if (dist > 70) {
        this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      } else if (this.atkCooldown <= 0) {
        this.phase = 'windup';
        this.phaseTimer = 0.35;
      }
    } else if (this.type === 'archer') {
      if (dist < 320) this.x += (player.x > this.x ? -1 : 1) * this.speed * dt;
      if (this.atkCooldown <= 0 && dist < 600) {
        this.phase = 'windup';
        this.phaseTimer = 0.4;
      }
    } else {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      if (dist < 60 && this.atkCooldown <= 0) {
        this.phase = 'windup';
        this.phaseTimer = 0.25;
      }
    }

    this.x = Math.max(enemyMinX, Math.min(enemyMaxX, this.x));
  }

  render(cameraX) {
    if (this.x + this.w < cameraX - 50 || this.x > cameraX + 1330) return;

    const ctx = this.ctx;
    ctx.save();

    if (this.isDead) {
      const alpha = Math.max(0, this.deathTimer / 0.35);
      ctx.fillStyle = `rgba(20, 16, 12, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + this.h - 10, this.w * 0.8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.translate(this.x + this.w / 2, this.y + this.h);
    if (this.phase === 'windup') ctx.rotate(0.15);
    if (this.phase === 'recovery') ctx.rotate(-0.25);

    ctx.fillStyle = this.phase === 'windup' ? "#681818" : (this.phase === 'recovery' ? "#383228" : "#241f1a");

    if (this.type === 'grunt') {
      ctx.fillRect(-this.w / 2, -this.h + 16, this.w, this.h - 16);
      ctx.beginPath();
      ctx.moveTo(0, -this.h);
      ctx.lineTo(this.w / 2 + 8, -this.h + 16);
      ctx.lineTo(-this.w / 2 - 8, -this.h + 16);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'archer') {
      ctx.fillRect(-this.w / 2 + 5, -this.h + 10, this.w - 10, this.h - 10);
      ctx.strokeStyle = "#40382f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-this.w / 2, -this.h / 2, 28, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else {
      ctx.fillRect(-this.w / 2, -this.h + 14, this.w, this.h - 14);
      ctx.beginPath();
      ctx.moveTo(-10, -this.h + 14);
      ctx.lineTo(-2, -this.h - 8);
      ctx.lineTo(6, -this.h + 14);
      ctx.fill();
    }

    // 백색 섬광 패링 텔레그래프 (★ 직경 24px)
    if (this.phase === 'tell') {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, -this.h - 15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
