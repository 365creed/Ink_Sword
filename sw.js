const CACHE_NAME = 'ink-sword-v2';
const ASSETS = [
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './js/core/engine.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/effects/brush.js',
  './js/effects/ink.js',
  './js/effects/skyline.js',
  './js/entities/boss.js',
  './js/entities/enemy.js',
  './js/entities/player.js',
  './js/systems/auth.js',
  './js/systems/chapter.js',
  './js/systems/stage.js',
  './js/systems/story.js',
  './assets/images/player.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // 네트워크 연결 실패 및 오프라인 시 대체 처리
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
