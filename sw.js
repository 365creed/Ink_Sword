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

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선(Network-First) 핸들러
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});
