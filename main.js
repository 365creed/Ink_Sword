import { Engine } from './js/core/engine.js';
import { StorageManager } from './js/core/storage.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  
  if (canvas) {
    // 게임 엔진 생성 및 구동
    const engine = new Engine(canvas);
    engine.init();
    engine.start();
  } else {
    console.error("게임 구동 실패: 캔버스 요소를 찾을 수 없습니다.");
  }

  // 구글 로그인 버튼 이벤트 바인딩
  const loginBtn = document.getElementById('google-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      console.log("구글 로그인 시도...");
      // 가상 계정 연동 성공 테스트
      window.currentUser = { uid: "user_ink_99", displayName: "수묵검객" };
      document.getElementById('auth-status').innerText = `${window.currentUser.displayName} 계정 연동됨`;
    });
  }

  // 페이지 종료 시 자동 세이브
  window.addEventListener('beforeunload', () => {
    StorageManager.save();
  });
});
