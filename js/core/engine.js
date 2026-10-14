import { GameState } from './state.js';
import { SoundSystem } from './sound.js';
import { SkylineRenderer } from '../effects/skyline.js';
import { InkEffects } from '../effects/ink.js';
import { BrushEffects } from '../effects/brush.js';

export const Engine = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  camera: {
    x: 0,
    y: 0,
    shakeTime: 0,
    shakeIntensity: 0
  },

  // 통합 키보드 및 마우스 입력 상태
  keys: {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    jumpJustPressed: false,
    dash: false,
    dashJustPressed: false,
    attack: false,
    attackJustPressed: false,
    attackHoldTime: 0,
    attackJustReleased: false,
    chain: false,
    chainJustPressed: false,
    mouseX: 640,
    mouseY: 360,
    worldMouseX: 640,
    worldMouseY: 360
  },

  // 외부 시스템 주입 슬롯 (3, 4단계 엔티티 및 스테이지 연결용)
  activeStage: null,
  player: null,
  storySystem: null,

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    SkylineRenderer.init();
    InkEffects.init();
    BrushEffects.init();
    this._bindInputs();
  },

  _bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (GameState.inDialogue) {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.storySystem?.next();
        }
        return;
      }

      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          if (!this.keys.jump) this.keys.jumpJustPressed = true;
          this.keys.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyL':
          if (!this.keys.dash) this.keys.dashJustPressed = true;
          this.keys.dash = true;
          break;
        case 'KeyJ':
          if (!this.keys.attack) this.keys.attackJustPressed = true;
          this.keys.attack = true;
          break;
        case 'KeyK':
          if (!this.keys.chain) this.keys.chainJustPressed = true;
          this.keys.chain = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyL':
          this.keys.dash = false;
          break;
        case 'KeyJ':
          this.keys.attack = false;
          this.keys.attackJustReleased = true;
          break;
        case 'KeyK':
          this.keys.chain = false;
          break;
      }
    });

    // 마우스 조작 지원 (좌클릭: 베기/차지베기, 우클릭: 마우스 방향으로 묵사슬 발사)
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.keys.mouseX = (e.clientX - rect.left) * scaleX;
      this.keys.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      SoundSystem.init();
      if (GameState.inDialogue) {
        this.storySystem?.next();
        return;
      }
      if (e.button === 0) {
        if (!this.keys.attack) this.keys.attackJustPressed = true;
        this.keys.attack = true;
      } else if (e.button === 2) {
        if (!this.keys.chain) this.keys.chainJustPressed = true;
        this.keys.chain = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keys.attack = false;
        this.keys.attackJustReleased = true;
      } else if (e.button === 2) {
        this.keys.chain = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  // 타격감 극대화를 위한 히트스톱 & 카메라 흔들림
  triggerHitImpact(stopDuration = 0.055, shakeIntensity = 7, shakeDuration = 0.14) {
    GameState.hitStopTimer = Math.max(GameState.hitStopTimer, stopDuration);
    this.camera.shakeIntensity = Math.max(this.camera.shakeIntensity, shakeIntensity);
    this.camera.shakeTime = Math.max(this.camera.shakeTime, shakeDuration);
  },

  start() {
    if (GameState.isRunning) return;
    GameState.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  },

  _loop(timestamp) {
    if (!GameState.isRunning) return;

    let rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (rawDt > 0.05) rawDt = 0.05; // 탭 전환 시 물리 폭주 방지

    if (!GameState.isPaused) {
      this.update(rawDt);
      this.render();
    }

    // 단발성 입력 플래그 초기화
    this.keys.jumpJustPressed = false;
    this.keys.dashJustPressed = false;
    this.keys.attackJustPressed = false;
    this.keys.attackJustReleased = false;
    this.keys.chainJustPressed = false;

    requestAnimationFrame((t) => this._loop(t));
  },

  update(rawDt) {
    // 공격 차지 시간 누적 계산
    if (this.keys.attack) {
      this.keys.attackHoldTime += rawDt;
    }

    // 히트스톱 처리
    if (GameState.hitStopTimer > 0) {
      GameState.hitStopTimer -= rawDt;
      return;
    }

    const dt = rawDt * GameState.timeScale;

    // 월드 마우스 좌표 동기화
    this.keys.worldMouseX = this.keys.mouseX + this.camera.x;
    this.keys.worldMouseY = this.keys.mouseY + this.camera.y;

    SkylineRenderer.update(dt);

    if (this.activeStage && !GameState.inDialogue) {
      this.activeStage.update(dt, this.keys);
    }

    // 카메라가 플레이어를 부드럽게 추적 (산나비 스타일 선행 시야 확보)
    if (this.player) {
      const targetCamX = Math.max(0, this.player.x - this.canvas.width * 0.38 + this.player.vx * 0.18);
      this.camera.x += (targetCamX - this.camera.x) * Math.min(1, rawDt * 8);
    }

    if (this.camera.shakeTime > 0) {
      this.camera.shakeTime -= rawDt;
    }

    this.updateHUD();
  },

  updateHUD() {
    const hpBar = document.getElementById('hp-bar');
    const hpText = document.getElementById('hp-text');
    const karmaBar = document.getElementById('karma-bar');
    const karmaText = document.getElementById('karma-text');
    const ruleFill = document.getElementById('rule-penalty-fill');

    const { hp, maxHp, karma, isBerserk, rulePenaltyRatio } = GameState.playerStats;

    if (hpBar) hpBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
    if (hpText) hpText.textContent = `${Math.ceil(hp)}/${maxHp}`;
    if (karmaBar) karmaBar.style.width = `${karma}%`;
    if (karmaText) karmaText.textContent = isBerserk ? '100% (혈귀 광폭화!)' : `${Math.floor(karma)}%`;
    if (ruleFill) ruleFill.style.width = `${Math.min(100, rulePenaltyRatio * 100)}%`;
  },

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // 카메라 흔들림 적용
    let renderCam = { x: this.camera.x, y: this.camera.y };
    if (this.camera.shakeTime > 0) {
      renderCam.x += (Math.random() - 0.5) * this.camera.shakeIntensity * 2;
      renderCam.y += (Math.random() - 0.5) * this.camera.shakeIntensity * 2;
    }

    // 1. 배경 수묵 산수화 렌더링
    SkylineRenderer.render(ctx, renderCam, w, h);

    // 2. 스테이지 지형, 사슬 고리, 엔티티(적, 보스, 플레이어) 렌더링
    if (this.activeStage) {
      this.activeStage.render(ctx, renderCam);
    }

    // 3. 먹물 파티클 및 갈필 검기 렌더링
    InkEffects.render(ctx, renderCam);
    BrushEffects.render(ctx, renderCam);

    // 4. 사망 후 덧칠(부활) 최상단 오버레이 연출
    BrushEffects.renderOverlay(ctx, w, h);

    ctx.restore();
  }
};
