/* ============================================================
   WAR DESK Service Worker v2.8
   - v2.8: split cache (static + media) voor efficiëntere updates
   - v2.7: HTML fallback naar offline.html
   - v2.6: HTML/JSON network-first, JS/CSS SWR, images cache-first
   ============================================================ */

const CACHE_VERSION = 'v14.29';
const STATIC_CACHE = 'wardesk-static-' + CACHE_VERSION;
const MEDIA_CACHE = 'wardesk-media-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './icon.svg',
  './manifest.json'
];

const KEEP_CACHES = [STATIC_CACHE, MEDIA_CACHE];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Precache openen:', STATIC_CACHE);
      return Promise.all(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Precache faalde voor', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => !KEEP_CACHES.includes(n))
          .map(n => {
            console.log('[SW] Oude cache verwijderen:', n);
            return caches.delete(n);
          })
      )
    ).then(() => {
      console.log('[SW] Actief:', STATIC_CACHE, '+', MEDIA_CACHE);
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  const isImage = /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(url.pathname);
  const isFont  = /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isAsset = /\.(js|css)$/i.test(url.pathname);
  const isHtml  = /\.html$/i.test(url.pathname)
               || url.pathname === '/'
               || url.pathname.endsWith('/');
  const isJson  = /\.json$/i.test(url.pathname);

  /* ===== MEDIA: images/fonts → MEDIA_CACHE ===== */
  if (isImage || isFont) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) {
            fetch(req).then(res => {
              if (res && res.status === 200) {
                cache.put(req, res.clone()).catch(() => {});
              }
            }).catch(() => {});
            return cached;
          }
          return fetch(req).then(res => {
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          });
        })
      )
    );
    return;
  }

  /* ===== STATIC: JS/CSS → STATIC_CACHE (stale-while-revalidate) ===== */
  if (isAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(res => {
            if (res && res.status === 200) {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  /* ===== HTML/JSON → STATIC_CACHE (network-first met offline fallback) ===== */
  if (isHtml || isJson) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            if (cached) return cached;
            if (isHtml) return caches.match('./offline.html');
            return new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
});