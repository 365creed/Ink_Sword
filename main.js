import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';
import { AuthSystem } from './js/systems/auth.js';

window.addEventListener('DOMContentLoaded', () => {
  // 데이터 로드
  window.gameSaveData = StorageManager.load();

  // 구글 로그인 핸들러 연동
  AuthSystem.init((user) => {
    const statusEl = document.getElementById('auth-status');
    if (user) {
      statusEl.innerText = `${user.displayName} 계정 연동됨`;
    }
  });

  // 캔버스 및 엔진 부팅
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const engine = new Engine(canvas);
    engine.init();
    engine.start();
  } else {
    console.error("게임 캔버스를 찾을 수 없습니다.");
  }
});
