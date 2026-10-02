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

    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.isDead = false;
    this.deathTimer = 0.35;
    this.atkCooldown = Math.random() * 1.5 + 1.2;

    this.phase = 'idle';
    this.phaseTimer = 0;
  }

  takeDamage(amount, ink) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      ink.splash(this.x + this.w / 2, this.y + this.h / 2, 22);
    }
  }

  update(dt, player, ink, engine, otherEnemies = [], platforms = []) {
    if (this.isDead) {
      this.deathTimer -= dt;
      return;
    }

    // 적 간 겹침 방지 (Separation)
    for (const other of otherEnemies) {
      if (other !== this && !other.isDead) {
        const dx = this.x - other.x;
        if (Math.abs(dx) < 45) {
          this.x += (45 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1) * dt * 6;
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
          this.phaseTimer = 0.12;
        } else if (this.phase === 'tell') {
          this.phase = 'swing';
          if (this.type === 'archer') {
            const dir = player.x > this.x ? 1 : -1;
            GameState.projectiles.push({
              x: this.x + (dir > 0 ? this.w + 10 : -10),
              y: this.y + 35,
              vx: dir * 420,
              dmg: this.dmg,
              r: 10,
              isPlayer: false,
              life: 3.0
            });
            this.phase = 'idle';
            this.atkCooldown = 2.4;
          } else {
            if (dist < 90) {
              const res = player.takeDamage(this.dmg, ink, engine);
              if (res === 'parried') {
                this.phase = 'recovery';
                this.phaseTimer = 0.6;
              } else {
                this.phase = 'idle';
                this.atkCooldown = 2.0;
              }
            } else {
              this.phase = 'recovery';
              this.phaseTimer = 0.4;
            }
          }
        } else if (this.phase === 'recovery') {
          this.phase = 'idle';
          this.atkCooldown = 1.8;
        }
      }
      return;
    }

    // 결계 안전 마진(160px) 준수
    let enemyMaxX = GameState.worldWidth - 50;
    if (GameState.activeBarrierX !== null) enemyMaxX = GameState.activeBarrierX - 160;
    let enemyMinX = 30;
    if (GameState.minBarrierX !== null) enemyMinX = GameState.minBarrierX + 60;

    if (this.type === 'grunt') {
      if (dist > 70) this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      else if (this.atkCooldown <= 0) {
        this.phase = 'windup';
        this.phaseTimer = 0.35;
      }
    } else if (this.type === 'archer') {
      if (dist < 340) this.x += (player.x > this.x ? -1 : 1) * this.speed * dt;
      if (this.atkCooldown <= 0 && dist < 650) {
        this.phase = 'windup';
        this.phaseTimer = 0.4;
      }
    } else {
      this.x += (player.x > this.x ? 1 : -1) * this.speed * dt;
      if (dist < 80 && this.atkCooldown <= 0) {
        this.phase = 'windup';
        this.phaseTimer = 0.25;
      }
    }

    this.x = Math.max(enemyMinX, Math.min(enemyMaxX, this.x));

    // 발판 착지 검사
    this.vy += 1300 * dt;
    this.y += this.vy * dt;
    this.isGrounded = false;

    for (const plat of platforms) {
      if (
        this.x + this.w > plat.x &&
        this.x < plat.x + plat.w &&
        this.y + this.h >= plat.y &&
        this.y + this.h <= plat.y + 20
      ) {
        this.y = plat.y - this.h;
        this.vy = 0;
        this.isGrounded = true;
        break;
      }
    }

    if (!this.isGrounded && this.y + this.h >= 620) {
      this.y = 620 - this.h;
      this.vy = 0;
      this.isGrounded = true;
    }
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
