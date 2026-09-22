import { GameState } from './state.js';

export const StorageManager = {
  KEY: 'ink_sword_master_save',

  save() {
    try {
      const data = {
        chapter: GameState.chapter,
        stage: GameState.stage,
        score: GameState.score,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const d = JSON.parse(raw);
        GameState.chapter = d.chapter || 1;
        GameState.stage = d.stage || 1;
        GameState.score = d.score || 0;
        return d;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }
};
