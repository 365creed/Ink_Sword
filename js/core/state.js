export const GameState = {
  score: 0,
  stage: 1,
  chapter: 1,
  health: 100,
  maxHealth: 100,
  isGameOver: false,
  isPaused: false,

  reset() {
    this.score = 0;
    this.stage = 1;
    this.chapter = 1;
    this.health = 100;
    this.isGameOver = false;
    this.isPaused = false;
  }
};
