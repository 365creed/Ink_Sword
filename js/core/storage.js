// js/core/storage.js
const StorageManager = {
  KEY: 'INK_SWORD_SAVE_DATA',

  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : {
        gameCleared: false,
        speedRunnerUnlocked: false,
        bestRecord: null
      };
    } catch (e) {
      return { gameCleared: false, speedRunnerUnlocked: false, bestRecord: null };
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error('기록 저장 실패:', e);
    }
  },

  unlockSpeedRunner() {
    const data = this.load();
    data.speedRunnerUnlocked = true;
    data.gameCleared = true;
    this.save(data);
    GameState.speedRunnerUnlocked = true;
    GameState.gameCleared = true;
  },

  saveRecord(seconds) {
    const data = this.load();
    data.gameCleared = true;
    data.speedRunnerUnlocked = true;
    if (data.bestRecord === null || seconds < data.bestRecord) {
      data.bestRecord = seconds;
    }
    this.save(data);
  },

  // 개발자용 완전 초기화 (낙관 3회 클릭 시 실행)
  clearDevData() {
    try {
      localStorage.removeItem(this.KEY);
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};
