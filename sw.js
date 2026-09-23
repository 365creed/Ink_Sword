// 버전을 고정합니다. 앞으로 이 이름을 바꿀 필요가 없습니다.
const CACHE_NAME = 'ink-sword-cache';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './js/core/sound.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/engine.js',
  './js/effects/skyline.js',
  './js/effects/brush.js',
  './js/effects/ink.js',
  './js/entities/player.js',
  './js/entities/enemy.js',
  './js/entities/boss.js',
  './js/systems/stage.js',
  './assets/images/player.png'
];

// 최초 설치 시 기본 에셋 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting(); // 새 워커가 감지되면 즉시 활성화
});

// 활성화 시 즉시 제어권 획득
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// 네트워크 우선 + 캐시 자동 덮어쓰기
self.addEventListener('fetch', (e) => {
  // HTTP/HTTPS GET 요청만 캐싱 처리
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // 서버 응답이 정상이면 캐시 저장소의 파일도 최신본으로 자동 갱신
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // 인터넷이 끊긴 오프라인 상태일 때만 캐시 파일 반환
        return caches.match(e.request).then((cached) => cached || caches.match('./index.html'));
      })
  );
});
