export class Player {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 96;
    this.vx = 0;
    this.vy = 0;
    this.speed = 320;
    this.isGrounded = true;
    this.facing = 1; // 1: 우측, -1: 좌측
    this.isAttacking = false;
    this.attackTimer = 0;

    // 이미지 로더 및 폴백 핸들러
    this.img = new Image();
    this.imgLoaded = false;
    this.img.onload = () => { this.imgLoaded = true; };
    this.img.onerror = () => { this.imgLoaded = false; };
    this.img.src = 'assets/images/player.png';
  }

  attack(brushSystem, inkSystem, enemies) {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.attackTimer = 0.2;

    const attackX = this.x + (this.facing > 0 ? this.width + 20 : -20);
    const attackY = this.y + this.height / 2;

    brushSystem.addSlash(attackX, attackY, this.facing);

    // 적 피격 판정
    enemies.forEach((enemy) => {
      if (Math.abs(enemy.x - attackX) < 90 && Math.abs(enemy.y - attackY) < 90) {
        enemy.takeDamage(35);
        inkSystem.createSplash(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 16);
      }
    });
  }

  jump() {
    if (this.isGrounded) {
      this.vy = -550;
      this.isGrounded = false;
    }
  }

  update(dt, input) {
    // 수평 이동
    if (input.left) {
      this.vx = -this.speed;
      this.facing = -1;
    } else if (input.right) {
      this.vx = this.speed;
      this.facing = 1;
    } else {
      this.vx = 0;
    }

    // 중력 및 이동 반영
    this.vy += 1200 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 바닥 충돌 처리 (y=620 기준)
    const groundY = 620;
    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
      this.isGrounded = true;
    }

    // 공격 타이머
    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }

    // 화면 경계 제한
    this.x = Math.max(30, Math.min(1280 - this.width - 30, this.x));
  }

  render() {
    this.ctx.save();
    if (this.imgLoaded) {
      // 이미지 정상 로드 시 스프라이트 출력
      this.ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    } else {
      // 이미지 미로드 또는 누락 시 즉시 가동되는 수묵 검객 실루엣
      this.ctx.fillStyle = "#1c1815";
      // 갓(모자)
      this.ctx.beginPath();
      this.ctx.ellipse(this.x + this.width / 2, this.y + 16, 28, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // 몸체 (도포)
      this.ctx.beginPath();
      this.ctx.moveTo(this.x + 12, this.y + 24);
      this.ctx.lineTo(this.x + this.width - 12, this.y + 24);
      this.ctx.lineTo(this.x + this.width, this.y + this.height);
      this.ctx.lineTo(this.x, this.y + this.height);
      this.ctx.closePath();
      this.ctx.fill();
      // 검(칼)
      this.ctx.strokeStyle = "#38322a";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      const bladeX = this.facing > 0 ? this.x + this.width + 10 : this.x - 10;
      this.ctx.moveTo(this.x + this.width / 2, this.y + 40);
      this.ctx.lineTo(bladeX, this.y + 20);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}
