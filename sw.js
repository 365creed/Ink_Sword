const CACHE_NAME = 'ink-sword-cache';
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
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;
  e.respondWith(
    fetch(e.request)
      .then((netRes) => {
        if (netRes && netRes.status === 200) {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return netRes;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});
