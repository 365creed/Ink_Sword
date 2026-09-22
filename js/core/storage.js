import { GameState } from './state.js';

export const StorageManager = {
  KEY: 'ink_sword_save_v5',

  save() {
    try {
      const data = {
        score: GameState.score,
        stage: GameState.stage,
        chapter: GameState.chapter,
        health: GameState.health,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
      
      if (window.currentUser && window.syncCloudSave) {
        window.syncCloudSave(window.currentUser.uid, data);
      }
    } catch (e) {
      console.error(e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const data = JSON.parse(raw);
        GameState.score = data.score || 0;
        GameState.stage = data.stage || 1;
        GameState.chapter = data.chapter || 1;
        GameState.health = data.health || 100;
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }
};
