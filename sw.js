// 짐싸기 PWA service worker
// 설치 가능 요건(installability)을 만족하기 위한 최소 SW.
// Firebase 실시간 동기화에 의존하므로 캐시 전략은 단순한 network-first.

const VERSION = 'v3';
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

// HTML / navigation은 캐시하지 않고 무조건 네트워크. 정적 자산만 캐시 폴백 허용.
const isHTML = req => req.mode === 'navigate' || req.destination === 'document'
  || (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isHTML(req)) {
    // 항상 최신 HTML — 오프라인일 때만 캐시 폴백
    e.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch {
        return (await caches.match('./index.html')) || (await caches.match(req)) || new Response('offline', { status: 503 });
      }
    })());
    return;
  }

  // 정적 자산: network-first + 캐시 업데이트
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
      throw new Error('offline');
    }
  })());
});
