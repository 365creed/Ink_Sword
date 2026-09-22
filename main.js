import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();
  }

  // 10초 주기 자동 저장
  setInterval(() => {
    StorageManager.save();
  }, 10000);

  window.addEventListener('beforeunload', () => {
    StorageManager.save();
  });
});
