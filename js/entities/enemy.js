// js/entities/enemy.js
class Enemy {
  constructor(x, y, type = 'grunt', chapter = 1) {
    this.x = x;
    this.y = y;
    this.type = type; // 'grunt', 'shield', 'arquebus', 'ronin', 'twin_blade'
    this.chapter = chapter;

    this.width = 38;
    this.height = 52;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;

    // 타입별 능력치
    this.initStats();

    // 상태 플래그
    this.isGuarding = (type === 'shield');
    this.guardBreakTimer = 0;
    this.aimTimer = 0;
    this.attackCooldown = 1.0;
    this.isDead = false;
  }

  initStats() {
    switch (this.type) {
      case 'shield': // 강북 도성 방패병
        this.hp = 80;
        this.maxHp = 80;
        this.speed = 70;
        this.damage = 18;
        break;
      case 'arquebus': // 강북/강동 조총수
        this.hp = 45;
        this.maxHp = 45;
        this.speed = 50;
        this.damage = 25;
        break;
      case 'ronin': // 강서 갈대 낭인 (발도 기습)
        this.hp = 60;
        this.maxHp = 60;
        this.speed = 180;
        this.damage = 22;
        break;
      case 'twin_blade': // 강남 비도 살수
        this.hp = 70;
        this.maxHp = 70;
        this.speed = 130;
        this.damage = 12;
        break;
      case 'grunt':
      default:
        this.hp = 40;
        this.maxHp = 40;
        this.speed = 85;
        this.damage = 15;
        break;
    }
  }

  takeDamage(amount, attackType, playerFacing, isPlunge = false) {
    // 1. 방패병 전면 방어 기믹
    if (this.type === 'shield' && this.guardBreakTimer <= 0) {
      const isFrontal = (this.facing === 1 && playerFacing === -1) || (this.facing === -1 && playerFacing === 1);
      
      if (isFrontal && !isPlunge) {
        if (attackType === 'heavy') {
          // 강공격으로 방패 가드 브레이크
          this.guardBreakTimer = 2.2;
          SoundManager.play('guard_break');
          EffectManager.addSpark(this.x, this.y);
          EffectManager.addCalligraphyText(this.x, this.y - 25, '破');
          return { hit: true, broken: true };
        } else {
          // 일반 공격 튕김
          SoundManager.play('deflect');
          EffectManager.addSpark(this.x, this.y);
          return { hit: false, blocked: true };
        }
      }
    }

    // 급강하 베기는 방패병 가드 강제 해제 및 고데미지
    if (isPlunge && this.type === 'shield') {
      this.guardBreakTimer = 2.0;
    }

    this.hp -= amount;
    SoundManager.play('enemy_hit');
    EffectManager.addInkSplash(this.x, this.y, 20);

    if (this.hp <= 0) {
      this.isDead = true;
      SoundManager.play('enemy_die');
      EffectManager.addCalligraphyText(this.x, this.y - 20, '滅');
    }

    return { hit: true, dead: this.hp <= 0 };
  }

  update(dt, player, stage) {
    if (this.isDead) return;

    if (this.guardBreakTimer > 0) {
      this.guardBreakTimer -= dt;
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const dist = player.x - this.x;
    const absDist = Math.abs(dist);
    this.facing = dist > 0 ? 1 : -1;

    // 조총수 AI (거리 유지 및 붉은 먹선 조준 후 사격)
    if (this.type === 'arquebus') {
      if (absDist < 420) {
        this.aimTimer += dt;
        if (this.aimTimer >= 1.25) {
          this.shootBullet(stage);
          this.aimTimer = 0;
        }
      } else {
        this.aimTimer = 0;
        this.x += this.facing * this.speed * dt;
      }
      return;
    }

    // 방패병 AI (느리게 압박 전진)
    if (this.type === 'shield') {
      if (this.guardBreakTimer <= 0 && absDist > 45) {
        this.x += this.facing * this.speed * dt;
      }
      if (absDist <= 55 && this.attackCooldown <= 0) {
        player.takeDamage(this.damage, this.x);
        this.attackCooldown = 1.4;
      }
      return;
    }

    // 낭인/살수/일반병 AI
    if (absDist > 50) {
      this.x += this.facing * this.speed * dt;
    } else if (this.attackCooldown <= 0) {
      player.takeDamage(this.damage, this.x);
      this.attackCooldown = this.type === 'twin_blade' ? 0.7 : 1.2;
    }
  }

  shootBullet(stage) {
    SoundManager.play('gunshot');
    stage.addProjectile({
      x: this.x + (this.facing === 1 ? 30 : -30),
      y: this.y + 18,
      vx: this.facing * 520,
      damage: this.damage
    });
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();

    // 조총수 붉은 먹선 조준 궤적 렌더링
    if (this.type === 'arquebus' && this.aimTimer > 0.3) {
      ctx.strokeStyle = `rgba(180, 20, 20, ${this.aimTimer / 1.25})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 18);
      ctx.lineTo(this.facing === 1 ? this.x + 450 : this.x - 450, this.y + 18);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 본체 실루엣
    ctx.fillStyle = this.type === 'shield' ? '#1c1f24' : '#2b2626';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 방패병 방패 렌더링
    if (this.type === 'shield') {
      ctx.fillStyle = this.guardBreakTimer > 0 ? '#666' : '#080808';
      const shieldX = this.facing === 1 ? this.x + 28 : this.x - 12;
      ctx.fillRect(shieldX, this.y - 4, 14, this.height + 8);
    }

    ctx.restore();
  }
}
