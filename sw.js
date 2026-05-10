// 짐싸기 PWA service worker
// 설치 가능 요건(installability)을 만족하기 위한 최소 SW.
// Firebase 실시간 동기화에 의존하므로 캐시 전략은 단순한 network-first.

const VERSION = 'v2';
const CACHE   = 'jimssagi-' + VERSION;

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase / SortableJS / Google Fonts 등 외부 요청은 그냥 통과
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(()=>{});
      }
      return fresh;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // index.html fallback for navigations
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw new Error('offline');
    }
  })());
});
