export const GameState = {
  // 모드: 'TITLE', 'PROLOGUE', 'TUTORIAL', 'STAGE_INTRO', 'PLAYING', 'STAGE_RESULT', 'GAME_OVER'
  mode: 'TITLE',

  // 영구 진행 데이터
  chapter: 1,      // 1: 강서(江西), 2: 강북(江北)
  stage: 1,        // 1, 2, 3(보스)
  tutorialCompleted: false,
  bestRanks: {},

  // 스테이지 전투 실시간 수치
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

  // 튜토리얼 내부 스텝 (0:참, 1:파, 2:신, 3:반, 4:묵)
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

  // 스테이지 진입 시 전투 상태만 초기화 (진행도는 유지!)
  resetForStage() {
    this.hp = this.maxHp;
    this.ink = 60;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.parries = 0;
    this.hitsTaken = 0;
    this.stageStartTime = Date.now();
  }
};
