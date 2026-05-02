/* ═══════════════════════════════════════════
   김일수 목사 포털 — Service Worker
   오프라인에서도 콘텐츠를 볼 수 있도록 캐싱
   ═══════════════════════════════════════════ */

const CACHE_NAME = 'pastor-kim-v1';

/* 오프라인에서도 보여줄 파일 목록 */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

/* ── 설치: 핵심 파일을 미리 캐시에 저장 ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ── 활성화: 오래된 캐시 삭제 ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── 요청 처리: 캐시 우선, 실패 시 네트워크 ── */
self.addEventListener('fetch', event => {
  /* 구글 폰트 등 외부 요청은 네트워크 우선 */
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request)
      )
    );
    return;
  }

  /* 내부 파일은 캐시 우선 → 네트워크 fallback */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        /* 유효한 응답만 캐시에 추가 */
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, toCache);
          });
        }
        return response;
      }).catch(() => {
        /* 완전 오프라인: index.html 반환 */
        return caches.match('/index.html');
      });
    })
  );
});
