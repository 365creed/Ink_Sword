const CACHE_NAME = 'ink-sword-v5-clean';
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
  './js/entities/player.js',
  './js/entities/enemy.js',
  './js/entities/boss.js',
  './js/systems/auth.js',
  './js/systems/stage.js',
  './js/systems/chapter.js',
  './js/systems/story.js',
  './assets/images/player.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
