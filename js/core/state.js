export const GameState = {
  // 전투 수치
  hp: 100,
  maxHp: 100,
  ink: 60,       // 먹 게이지 (0 ~ 100)
  maxInk: 100,
  
  // 콤보 및 랭크 통계
  combo: 0,
  maxCombo: 0,
  score: 0,
  kills: 0,
  parries: 0,
  hitsTaken: 0,
  startTime: 0,

  // 진행 상태
  chapter: 1,    // 제1장 강서(江西)
  stage: 1,
  isGameOver: false,
  isVictory: false,

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

  reset() {
    this.hp = this.maxHp;
    this.ink = 60;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.parries = 0;
    this.hitsTaken = 0;
    this.score = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.startTime = Date.now();
  }
};
