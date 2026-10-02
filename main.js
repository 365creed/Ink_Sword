import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';

function bootGame() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  try {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();

    // 상단 네비게이션 버튼 연동
    document.getElementById('pause-btn')?.addEventListener('click', () => engine.togglePause());
    document.getElementById('help-btn')?.addEventListener('click', () => engine.toggleHelp());
    document.getElementById('clear-cache-btn')?.addEventListener('click', () => engine.clearCacheAndReload());
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => engine.toggleFullscreen());
  } catch (err) {
    console.error("부팅 중 치명적 오류:", err);
  }
}

// DOM 로딩 완료 여부를 직접 검사하여 100% 즉시 시동 보장
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

setInterval(() => {
  StorageManager.save();
}, 15000);

window.addEventListener('beforeunload', () => {
  StorageManager.save();
});
