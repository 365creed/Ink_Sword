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

// 캐시 초기화 및 강제 업데이트 버튼 리스너
const clearBtn = document.getElementById('clear-cache-btn');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    try {
      // 1. 서비스 워커 등록 해제
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Cache Storage에 보관된 모든 캐시 삭제
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      // 3. 브라우저 캐시를 우회하도록 타임스탬프를 붙여 새로고침
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.href = `${cleanUrl}?v=${Date.now()}`;
    } catch (e) {
      console.error("캐시 초기화 실패:", e);
      window.location.reload();
    }
  });
}
