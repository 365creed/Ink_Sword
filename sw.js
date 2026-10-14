const CACHE_NAME = 'ink-sword-v2-remaster';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './main.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/engine.js',
  './js/core/sound.js',
  './js/effects/brush.js',
  './js/effects/ink.js',
  './js/effects/skyline.js',
  './js/entities/player.js',
  './js/entities/enemy.js',
  './js/entities/boss.js',
  './js/systems/auth.js',
  './js/systems/chapter.js',
  './js/systems/stage.js',
  './js/systems/stageData.js',
  './js/systems/story.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // 개발 단계에서 아직 생성되지 않은 파일이 있어도 설치가 중단되지 않도록 개별 캐싱 처리
        return Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url)));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        })
      );
    })
  );
});
