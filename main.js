import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';
import { AuthSystem } from './js/systems/auth.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log("Ink Sword 시스템 부팅 중...");

  // 1. 저장 데이터 로드
  const savedData = StorageManager.load();
  window.gameSaveData = savedData;

  // 2. 인증 시스템 초기화
  AuthSystem.init((user) => {
    const statusEl = document.getElementById('auth-status');
    if (user) {
      statusEl.innerText = `${user.displayName} 계정 연동됨`;
    }
  });

  // 3. 게임 엔진 초기화 및 실행
  const canvas = document.getElementById('gameCanvas');
  const engine = new Engine(canvas);
  engine.init();
  engine.start();

  // 자동 세이브 예시 (주기적 혹은 스테이지 클리어 시)
  window.addEventListener('beforeunload', () => {
    StorageManager.save(window.gameSaveData);
  });
});
