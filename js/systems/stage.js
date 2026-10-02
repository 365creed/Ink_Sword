// js/systems/stage.js
class StageManager {
  constructor() {
    this.introTimer = 0;
    this.isIntro = false;
    this.arenas = [];
    this.currentArena = null;
    this.projectiles = [];
    this.enemies = [];
  }

  initStage(chapter, stageNum) {
    GameState.currentChapter = chapter;
    GameState.currentStage = stageNum;
    this.projectiles = [];
    this.enemies = [];

    // 스피드런 모드일 경우 인트로 생략
    if (GameState.gameMode === 'SPEEDRUN') {
      this.isIntro = false;
      this.introTimer = 0;
      document.getElementById('stage-intro-overlay').classList.add('hidden');
      GameState.state = 'PLAYING';
    } else {
      this.isIntro = true;
      this.introTimer = 2.5;
      this.showIntroUI();
      GameState.state = 'STAGE_INTRO';
    }

    this.setupArenas(chapter, stageNum);
  }

  showIntroUI() {
    const overlay = document.getElementById('stage-intro-overlay');
    const hanjaEl = document.getElementById('intro-chapter-hanja');
    const titleEl = document.getElementById('intro-chapter-title');
    
    const hanjaMap = { 1: '江西', 2: '江北', 3: '江東', 4: '江南', 5: '漢陽宮' };
    hanjaEl.innerText = hanjaMap[GameState.currentChapter] || '江西';
    titleEl.innerText = `제 ${GameState.currentChapter} 막 — ${GameState.currentStage} 장`;
    overlay.classList.remove('hidden');
  }

  // 즉시 스킵 트리거 (Space, Enter, 터치 클릭)
  skipIntro() {
    if (this.isIntro) {
      this.isIntro = false;
      this.introTimer = 0;
      document.getElementById('stage-intro-overlay').classList.add('hidden');
      GameState.state = 'PLAYING';
    }
  }

  setupArenas(chapter, stageNum) {
    this.arenas = [
      {
        triggerX: 950,
        minX: 750,
        maxX: 1350,
        camLockX: 850,
        state: 'INACTIVE',
        gateH: 0,
        enemies: [
          new Enemy(1150, 326, chapter === 2 ? 'shield' : 'grunt', chapter),
          new Enemy(1250, 326, chapter === 1 ? 'ronin' : 'arquebus', chapter)
        ]
      },
      {
        triggerX: 2100,
        minX: 1900,
        maxX: 2500,
        camLockX: 2000,
        state: 'INACTIVE',
        gateH: 0,
        enemies: [
          new Enemy(2280, 326, chapter === 4 ? 'twin_blade' : 'shield', chapter),
          new Enemy(2380, 326, 'arquebus', chapter),
          new Enemy(2440, 326, 'grunt', chapter)
        ]
      }
    ];
  }

  addProjectile(proj) {
    this.projectiles.push(proj);
  }

  update(dt, player) {
    // 인트로 대기 시간 카운트다운
    if (this.isIntro) {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.skipIntro();
      }
      return;
    }

    // 스피드런 타이머 누적
    if (GameState.state === 'PLAYING') {
      GameState.speedRunTime += dt;
      GameState.stageTime += dt;
    }

    // 록맨식 아레나 게이트 & 카메라 락 루프
    this.updateArenas(dt, player);

    // 투사체 처리
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;

      // 플레이어 피격 검사
      if (Math.abs(p.x - player.x) < 25 && Math.abs(p.y - player.y) < 35) {
        player.takeDamage(p.damage, p.x);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 화면 이탈
      if (Math.abs(p.x - player.x) > 600) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  updateArenas(dt, player) {
    for (const arena of this.arenas) {
      // 1. 트리거 진입: 카메라 고정 및 문 하강 시작
      if (arena.state === 'INACTIVE' && player.x >= arena.triggerX) {
        arena.state = 'CLOSING';
        GameState.lockCamera(arena.camLockX);
        SoundManager.play('gate_slam');
      }

      // 2. 문 닫히는 중
      if (arena.state === 'CLOSING') {
        arena.gateH = Math.min(300, arena.gateH + 900 * dt);
        if (arena.gateH >= 300) {
          arena.state = 'LOCKED';
          this.enemies.push(...arena.enemies);
        }
      }

      // 3. 전투 중: 플레이어 공간 가둠 및 전멸 확인
      if (arena.state === 'LOCKED') {
        player.x = Math.max(arena.minX + 25, Math.min(arena.maxX - 25, player.x));
        const aliveEnemies = this.enemies.filter(e => !e.isDead);
        
        if (aliveEnemies.length === 0) {
          arena.state = 'OPENING';
          SoundManager.play('gate_open');
          EffectManager.addCalligraphyText(arena.camLockX + 400, 180, '破');
        }
      }

      // 4. 문 열리는 중: 카메라 락 해제
      if (arena.state === 'OPENING') {
        arena.gateH = Math.max(0, arena.gateH - 600 * dt);
        if (arena.gateH <= 0) {
          arena.state = 'CLEARED';
          GameState.unlockCamera();
        }
      }
    }
  }

  render(ctx) {
    // 록맨식 아레나 셔터 게이트 렌더링
    for (const arena of this.arenas) {
      if (arena.gateH > 0) {
        ctx.save();
        ctx.fillStyle = '#111215';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;

        // 좌측 결계 문
        ctx.fillRect(arena.minX - 15, 380 - arena.gateH, 24, arena.gateH);
        ctx.strokeRect(arena.minX - 15, 380 - arena.gateH, 24, arena.gateH);

        // 우측 결계 문
        ctx.fillRect(arena.maxX - 9, 380 - arena.gateH, 24, arena.gateH);
        ctx.strokeRect(arena.maxX - 9, 380 - arena.gateH, 24, arena.gateH);

        ctx.restore();
      }
    }

    // 투사체 렌더링
    ctx.fillStyle = '#8b1e1e';
    for (const p of this.projectiles) {
      ctx.fillRect(p.x - 4, p.y - 2, 8, 4);
    }
  }
}
