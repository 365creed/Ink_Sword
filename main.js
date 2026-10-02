import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();

    document.getElementById('pause-btn')?.addEventListener('click', () => engine.togglePause());
    document.getElementById('help-btn')?.addEventListener('click', () => engine.toggleHelp());
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => engine.toggleFullscreen());
  }

  setInterval(() => {
    StorageManager.save();
  }, 15000);

  window.addEventListener('beforeunload', () => {
    StorageManager.save();
  });
});
