import { SoundSystem } from '../core/sound.js';
import { InkEffects } from '../effects/ink.js';
import { BrushEffects } from '../effects/brush.js';
import { Engine } from '../core/engine.js';

export class Boss {
  constructor(x, y, config = {}) {
    this.id = 'boss_four_gentlemen';
    this.x = x;
    this.y = y;
    this.width = 56;
    this.height = 76;

    this.name = config.name || '사군자 제1화신 : 매화검귀(梅花劍鬼)';
    this.maxHp = config.maxHp || 650;
    this.hp = this.maxHp;
    this.isDead = false;
    this.phase = 1;

    this.vx = 0;
    this.vy = 0;
    this.facing = -1;

    this.state = 'IDLE'; // 'IDLE', 'TELEGRAPH', 'DASH_SLASH', 'PETAL_STORM'
    this.stateTimer = 1.8;
    this.hitFlashTimer = 0;
    this.animTime = 0;
  }

  update(dt, player, stage) {
    if (this.isDead) return;
    this.animTime += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // 보스 HUD 갱신
    const bossHud = document.getElementById('boss-hud');
    const bossName = document.getElementById('boss-name');
    const bossBar = document.getElementById('boss-hp-bar');
    if (bossHud) bossHud.classList.remove('hidden');
    if (bossName) bossName.textContent = this.name;
    if (bossBar) bossBar.style.width = `${Math.max(0, (this.hp / this.maxHp) * 100)}%`;

    // 2페이즈 각성 체크 (체력 50% 이하)
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.name = '【화폭 붕괴】 혈매화검귀 (血梅花劍鬼)';
      SoundSystem.playRepaintRevive();
      Engine.triggerHitImpact(0.15, 16, 0.45);
      InkEffects.spawnSplash(this.x, this.y, 40, '#c92a2a', 1.8);
    }

    const dx = player.x - this.x;
    this.stateTimer -= dt * (this.phase === 2 ? 1.35 : 1.0);

    switch (this.state) {
      case 'IDLE':
        this.facing = dx >= 0 ? 1 : -1;
        this.vx *= 0.85;
        if (this.stateTimer <= 0) {
          this.state = 'TELEGRAPH';
          this.stateTimer = 0.55;
          this.nextPattern = Math.random() < 0.55 ? 'DASH_SLASH' : 'PETAL_STORM';
          InkEffects.spawnSplash(this.x, this.y, 12, '#c92a2a', 0.9);
        }
        break;

      case 'TELEGRAPH':
        // 공격 전 붉은 안광 및 발도 준비 모션
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = this.nextPattern;
          if (this.state === 'DASH_SLASH') {
            this.stateTimer = 0.45;
            this.vx = this.facing * 880;
            SoundSystem.playChargeSlash();
            BrushEffects.spawnSlashArc({
              x: this.x,
              y: this.y,
              radius: 95,
              startAngle: 0,
              endAngle: Math.PI * 2,
              dir: this.facing,
              color: '#c92a2a',
              isCharge: true
            });
          } else {
            this.stateTimer = 1.2;
            this._firePetalStorm(stage, player);
          }
        }
        break;

      case 'DASH_SLASH':
        InkEffects.spawnAfterimage({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          facing: this.facing,
          color: 'rgba(158, 27, 27, 0.5)'
        });

        if (
          Math.abs(player.x - this.x) < (this.width + player.width) * 0.55 &&
          Math.abs(player.y - this.y) < (this.height + player.height) * 0.55
        ) {
          player.takeDamage(this.phase === 2 ? 28 : 20, this.facing);
        }

        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 1.4;
        }
        break;

      case 'PETAL_STORM':
        this.vx *= 0.9;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 1.5;
        }
        break;
    }

    // 중력 및 스테이지 경계 제한
    this.vy = Math.min(800, this.vy + 1200 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const halfH = this.height * 0.5;
    for (const p of stage.platforms) {
      if (
        this.x > p.x &&
        this.x < p.x + p.w &&
        this.y + halfH >= p.y &&
        this.y + halfH <= p.y + 28 &&
        this.vy >= 0
      ) {
        this.y = p.y - halfH;
        this.vy = 0;
      }
    }
  }

  _firePetalStorm(stage, player) {
    SoundSystem.playSlash(3);
    const count = this.phase === 2 ? 9 : 5;
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);

    for (let i = 0; i < count; i++) {
      const spread = (i - Math.floor(count / 2)) * 0.18;
      const ang = baseAngle + spread;
      stage.spawnProjectile({
        x: this.x,
        y: this.y - 12,
        vx: Math.cos(ang) * 440,
        vy: Math.sin(ang) * 440,
        damage: 18,
        color: '#c92a2a',
        fromEnemy: true
      });
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    ctx.save();
    ctx.translate(sx, sy);

    // 2페이즈 혈매화 아우라
    if (this.phase === 2) {
      ctx.strokeStyle = 'rgba(201, 42, 42, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 52 + Math.sin(this.animTime * 12) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 공격 예고(TELEGRAPH) 시 붉은 섬광선 표시 (금묵 패링 타이밍 힌트!)
    if (this.state === 'TELEGRAPH') {
      ctx.strokeStyle = '#ff2a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(60, 0);
      ctx.moveTo(0, -60);
      ctx.lineTo(0, 60);
      ctx.stroke();
    }

    ctx.scale(this.facing, 1);
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#c92a2a' : '#141413';

    // 거대한 무사 갑주 및 도포 실루엣
    ctx.beginPath();
    ctx.moveTo(-22, -26);
    ctx.lineTo(22, -26);
    ctx.lineTo(28, 38);
    ctx.lineTo(-28, 38);
    ctx.closePath();
    ctx.fill();

    // 장군 투구 뿔 장식
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -30, 18, Math.PI * 0.9, Math.PI * 0.1, true);
    ctx.stroke();

    // 매화검귀의 장검(대태도)
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(54, -22);
    ctx.stroke();

    ctx.restore();
  }
}
