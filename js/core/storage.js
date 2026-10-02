import { GameState } from './state.js';

export const StorageManager = {
  KEY: 'ink_sword_master_save',

  save() {
    try {
      const data = {
        chapter: GameState.chapter,
        stage: GameState.stage,
        tutorialCompleted: GameState.tutorialCompleted,
        bestRanks: GameState.bestRanks,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
      if (typeof GameState.showToast === 'function') {
        GameState.showToast("수묵 기록 완료 (저장됨)");
      }
    } catch (e) {
      console.warn("저장 실패:", e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const d = JSON.parse(raw);
        GameState.chapter = d.chapter || 1;
        GameState.stage = d.stage || 1;
        GameState.tutorialCompleted = !!d.tutorialCompleted;
        GameState.bestRanks = d.bestRanks || {};
        return d;
      }
    } catch (e) {
      console.warn("불러오기 실패:", e);
    }
    return null;
  }
};

export default StorageManager;
