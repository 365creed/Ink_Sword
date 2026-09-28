export const GameState = {
  mode: 'TITLE', // TITLE, PROLOGUE, TUTORIAL, STAGE_INTRO, PLAYING, STAGE_RESULT, GAME_OVER

  chapter: 1,
  stage: 1,
  worldWidth: 3800,
  cameraX: 0,
  activeBarrierX: null,

  // UI/UX 상태
  isPaused: false,
  isHelpOpen: false,
  guideTimer: 5.0, // 5초 자동 감추기
  saveToastTimer: 0,
  saveToastText: '',

  tutorialCompleted: false,
  bestRanks: {},

  // 전투 실시간 수치
  hp: 100,
  maxHp: 100,
  ink: 60,
  maxInk: 100,

  combo: 0,
  maxCombo: 0,
  kills: 0,
  parries: 0,
  hitsTaken: 0,
  stageStartTime: 0,
  clearTimeStr: '00:00',

  tutorialStep: 0,

  addCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  },

  resetCombo() {
    this.combo = 0;
  },

  addInk(amount) {
    this.ink = Math.min(this.maxInk, this.ink + amount);
  },

  useInk(amount) {
    if (this.ink >= amount) {
      this.ink -= amount;
      return true;
    }
    return false;
  },

  showToast(msg) {
    this.saveToastText = msg;
    this.saveToastTimer = 1.6;
  },

  resetForStage() {
    this.hp = this.maxHp;
    this.ink = 60;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.parries = 0;
    this.hitsTaken = 0;
    this.cameraX = 0;
    this.activeBarrierX = null;
    this.isPaused = false;
    this.isHelpOpen = false;
    this.guideTimer = 5.0;
    this.stageStartTime = Date.now();
  }
};
