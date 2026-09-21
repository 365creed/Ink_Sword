import { GameState } from './state.js';

export const StorageManager = {
  KEY: 'ink_sword_save_v2',

  save() {
    try {
      const saveData = {
        score: GameState.score,
        stage: GameState.stage,
        chapter: GameState.chapter,
        health: GameState.health,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.KEY, JSON.stringify(saveData));

      // 구글 로그인 연동 시 클라우드 백업 트리거
      if (window.currentUser && window.syncCloudSave) {
        window.syncCloudSave(window.currentUser.uid, saveData);
      }
    } catch (e) {
      console.error("세이브 저장 실패:", e);
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
      console.error("세이브 불러오기 실패:", e);
    }
    return null;
  }
};
