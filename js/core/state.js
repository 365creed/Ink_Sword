import { CHAPTER_DATA } from '../systems/stageData.js';

export const GameState = {
  mode: 'TITLE',

  chapter: 1,
  stage: 1,
  worldWidth: 3800,
  cameraX: 0,
  minBarrierX: null,
  activeBarrierX: null,

  isPaused: false,
  isHelpOpen: false,
  guideTimer: 5.0,
  saveToastTimer: 0,
  saveToastText: '',

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
  clearTimeStr: '00:00',

  tutorialStep: 0,

  // 록맨식 투사체 (검기 파동 / 적 탄환)
  projectiles: [],

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

  getCurrentChapterData() {
    return CHAPTER_DATA[this.chapter] || CHAPTER_DATA[1];
  },

  getCurrentStageData() {
    const ch = this.getCurrentChapterData();
    return ch.stages[this.stage] || ch.stages[1];
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
    this.minBarrierX = null;
    this.activeBarrierX = null;
    this.projectiles = [];
    this.isPaused = false;
    this.isHelpOpen = false;
    this.guideTimer = 5.0;
    this.stageStartTime = Date.now();
  }
};
