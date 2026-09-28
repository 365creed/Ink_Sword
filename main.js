import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();

    // 상단 네비게이션 버튼 연동
    document.getElementById('pause-btn')?.addEventListener('click', () => engine.togglePause());
    document.getElementById('help-btn')?.addEventListener('click', () => engine.toggleHelp());
    document.getElementById('save-btn')?.addEventListener('click', () => engine.manualSave());
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => engine.toggleFullscreen());
    document.getElementById('clear-cache-btn')?.addEventListener('click', () => engine.clearCacheAndReload());
    document.getElementById('skip-btn')?.addEventListener('click', () => engine.skipToGame());
  }

  // 15초 주기 자동 저장
  setInterval(() => {
    StorageManager.save();
  }, 15000);

  window.addEventListener('beforeunload', () => {
    StorageManager.save();
  });
});
