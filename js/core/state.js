export const GameState = {
  // 모드: TITLE, PROLOGUE, TUTORIAL, STAGE_INTRO, PLAYING, STAGE_RESULT, GAME_OVER
  mode: 'TITLE',

  chapter: 1, // 1: 강서, 2: 강북, 3: 강동, 4: 강남, 5: 중앙
  stage: 1,
  worldWidth: 3800,
  cameraX: 0,
  activeBarrierX: null, // 결계 잠금 X 좌표

  tutorialCompleted: false,
  bestRanks: {},

  // 전투 스탯
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
  clearTimeStr: "00:00",

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
    this.stageStartTime = Date.now();
  }
};
