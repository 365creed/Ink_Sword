const CACHE_NAME = 'ink-sword-v8-netfirst';
const ASSETS = [
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

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// 새 버전(v8)이 활성화되면 구버전(v7) 캐시를 즉시 전량 자동 파기
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
    ))
  );
  self.clients.claim();
});

// 네트워크 우선(Network-First): 서버에서 최신본 다운로드 ➔ 오프라인일 때만 캐시 사용
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});
