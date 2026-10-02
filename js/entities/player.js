// js/entities/player.js
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 40;
    this.height = 54;
    this.facing = 1; // 1: 우측, -1: 좌측

    // 스테이터스
    this.hp = 100;
    this.maxHp = 100;
    this.ink = 100;
    this.maxInk = 100;

    // 물리 상태
    this.onGround = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.isDashJumping = false;
    this.dashJumpVx = 0;

    // 공격 & 급강하
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackType = 'normal'; // 'normal', 'heavy', 'plunge'
    this.isPlunging = false;

    // 패링
    this.isParrying = false;
    this.parryTimer = 0;
    this.parryWindow = 0.22; // 0.22초 정밀 판정

    // 무적 및 피격
    this.invincibleTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;

    this.attackBox = null;
  }

  jump() {
    if (this.onGround) {
      this.vy = -560;
      this.onGround = false;

      // 대시 중 점프 시: 대시 점프 발동 (관성 보존)
      if (this.isDashing) {
        this.isDashJumping = true;
        this.dashJumpVx = this.facing * 460;
        SoundManager.play('dash_jump');
        EffectManager.addInkSplash(this.x, this.y + 20, 15);
      } else {
        this.isDashJumping = false;
        SoundManager.play('jump');
      }
    }
  }

  startDash() {
    if (this.dashCooldown <= 0 && this.ink >= 15) {
      this.isDashing = true;
      this.dashTimer = 0.24;
      this.dashCooldown = 0.55;
      this.invincibleTimer = 0.24;
      this.ink = Math.max(0, this.ink - 15);
      this.vx = this.facing * 440;
      SoundManager.play('dash');
      EffectManager.addDashGhost(this.x, this.y, this.facing);
    }
  }

  startParry() {
    if (!this.isParrying && this.onGround) {
      this.isParrying = true;
      this.parryTimer = this.parryWindow;
      SoundManager.play('parry_ready');
    }
  }

  // 공격 핸들러 (입력 상태 inputState: { down: boolean })
  triggerAttack(isHeavy = false, inputState = {}) {
    if (this.isAttacking || this.isPlunging) return;

    // 공중에서 아래 방향키(S/↓) + 공격 => 급강하 하향 베기
    if (!this.onGround && inputState.down) {
      this.isPlunging = true;
      this.attackType = 'plunge';
      this.vy = 760;
      this.vx = this.facing * 120;
      SoundManager.play('plunge_dive');
      return;
    }

    // 지상 공격
    if (this.onGround) {
      if (isHeavy) {
        if (this.ink >= 25) {
          this.ink -= 25;
          this.isAttacking = true;
          this.attackType = 'heavy';
          this.attackTimer = 0.38;
          SoundManager.play('heavy_slash');
        }
      } else {
        this.isAttacking = true;
        this.attackType = 'normal';
        this.attackTimer = 0.22;
        SoundManager.play('normal_slash');
      }
    }
  }

  update(dt, inputState) {
    // 쿨다운 업데이트
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    
    // 콤보 타이머 (2.2초간 미공격 시 리셋)
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // 먹 자연 회복
    if (this.ink < this.maxInk) {
      this.ink = Math.min(this.maxInk, this.ink + dt * 18);
    }

    // 패링 타이머
    if (this.isParrying) {
      this.parryTimer -= dt;
      if (this.parryTimer <= 0) this.isParrying = false;
    }

    // 지상 대시 감속
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    // 대시 점프 관성 보존
    if (!this.onGround && this.isDashJumping) {
      this.vx = this.dashJumpVx;
    } else if (!this.isDashing) {
      // 일반 좌우 걷기
      if (inputState.left) {
        this.vx = -210;
        this.facing = -1;
      } else if (inputState.right) {
        this.vx = 210;
        this.facing = 1;
      } else {
        this.vx *= 0.8;
      }
    }

    // 중력 적용
    this.vy += 1400 * dt;
    if (this.vy > 900) this.vy = 900;

    // 위치 갱신
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 지면 충돌 판정 (바닥 Y = 380 기준)
    const groundY = 380 - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.onGround = true;
      this.isDashJumping = false;

      // 급강하 착지 시 먹물 충격파 발생
      if (this.isPlunging) {
        this.isPlunging = false;
        SoundManager.play('ground_slam');
        EffectManager.addGroundShockwave(this.x, this.y + this.height);
        this.triggerPlungeLandingHit();
      }
    }

    // 공격 타이머 및 히트박스 계산
    this.updateHitboxes(dt);
  }

  updateHitboxes(dt) {
    if (this.isPlunging) {
      // 급강하 중 히트박스: 캐릭터 발밑 전체
      this.attackBox = {
        x: this.x - 20,
        y: this.y + 10,
        width: 60,
        height: 60,
        damage: 40,
        type: 'plunge'
      };
      return;
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      const reach = this.attackType === 'heavy' ? 75 : 55;
      const hX = this.facing === 1 ? this.x + 20 : this.x - reach + 10;
      this.attackBox = {
        x: hX,
        y: this.y + 8,
        width: reach,
        height: 40,
        damage: this.attackType === 'heavy' ? 45 : 22,
        type: this.attackType
      };

      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackBox = null;
      }
    } else {
      this.attackBox = null;
    }
  }

  triggerPlungeLandingHit() {
    this.attackBox = {
      x: this.x - 80,
      y: this.y + 10,
      width: 160,
      height: 45,
      damage: 50,
      type: 'plunge_shockwave'
    };
    setTimeout(() => {
      if (this.attackBox && this.attackBox.type === 'plunge_shockwave') {
        this.attackBox = null;
      }
    }, 120);
  }

  takeDamage(amount, fromX) {
    if (this.invincibleTimer > 0) return false;

    // 패링 성공 판정
    if (this.isParrying) {
      SoundManager.play('parry_success');
      EffectManager.addCalligraphyText(this.x, this.y - 30, '返');
      EffectManager.addSpark(this.x, this.y);
      this.ink = Math.min(this.maxInk, this.ink + 40);
      this.combo++;
      this.comboTimer = 2.5;
      this.invincibleTimer = 0.35;
      return 'parried';
    }

    // 일반 피격
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = 0.8;
    this.vx = (this.x < fromX ? -1 : 1) * 220;
    SoundManager.play('hurt');
    EffectManager.addInkSplash(this.x, this.y, 25);
    return 'hit';
  }

  render(ctx) {
    ctx.save();

    // 무적 점멸
    if (this.invincibleTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // 대시 점프 및 급강하 잔상 궤적
    if (this.isDashJumping || this.isPlunging) {
      ctx.fillStyle = 'rgba(20, 20, 20, 0.25)';
      ctx.fillRect(this.x - (this.vx * 0.04), this.y, this.width, this.height);
    }

    // 본체 (수묵 검객 실루엣)
    ctx.fillStyle = '#141416';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 갓/머리 묘사
    ctx.fillStyle = '#050505';
    ctx.fillRect(this.x - 4, this.y - 6, this.width + 8, 8);

    // 붉은 띠 포인트
    ctx.fillStyle = '#8b1e1e';
    ctx.fillRect(this.facing === 1 ? this.x + 22 : this.x + 8, this.y + 12, 10, 4);

    // 급강하 중 수직 검기 렌더링
    if (this.isPlunging) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + this.height);
      ctx.lineTo(this.x + this.width / 2, this.y + this.height + 25);
      ctx.stroke();
    }

    ctx.restore();
  }
}
