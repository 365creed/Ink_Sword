const CACHE_NAME = 'ink-sword-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './main.js',
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
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // 오프라인 시 대체 처리 (필요한 경우)
      });
    })
  );
});
