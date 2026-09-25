/* ============================================================
   WAR DESK Service Worker v2.7
   - v2.7: HTML fallback naar offline.html (voorkomt stale HTML)
   - v2.6: HTML/JSON network-first, JS/CSS SWR, images cache-first
   ============================================================ */

const CACHE_NAME = 'wardesk-v14.8';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precache openen:', CACHE_NAME);
        return Promise.all(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('[SW] Precache faalde voor', url, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME)
          .map(n => {
            console.log('[SW] Oude cache verwijderen:', n);
            return caches.delete(n);
          })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  const isAsset = /\.(js|css)$/i.test(url.pathname);
  const isHtml = /\.html$/i.test(url.pathname)
              || url.pathname === '/'
              || url.pathname.endsWith('/');
  const isJson = /\.json$/i.test(url.pathname);

  /* ===== JS/CSS: Stale-while-revalidate ===== */
  if (isAsset) {
    event.respondWith(
      caches.match(req).then(cached => {
        const networkFetch = fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  /* ===== HTML/JSON: Network-first met veilige fallback ===== */
  if (isHtml || isJson) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            if (cached) return cached;
            /* v2.7: Voor HTML fallback naar offline.html (geen stale index.html) */
            if (isHtml) return caches.match('./offline.html');
            return new Response('', { status: 503 });
          });
        })
    );
    return;
  }

  /* ===== Images/Fonts: Cache-first + background update ===== */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone())).catch(() => {});
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});