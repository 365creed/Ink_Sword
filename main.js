import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';
import { AuthSystem } from './js/systems/auth.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  
  if (canvas) {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();
  }

  AuthSystem.init((user) => {
    const status = document.getElementById('auth-status');
    if (status && user) {
      status.innerText = `${user.displayName} 계정 동기화 활성`;
    }
  });

  window.addEventListener('beforeunload', () => {
    StorageManager.save();
  });
});
