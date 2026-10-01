/* ============================================================
   WAR DESK Service Worker v4.31
   - v4.31: MEDIA_CACHE cache-first (geen background re-fetch)
            PRECACHE_ASSETS compleet (34 bestanden)
   - v4.30: SW cache-bump
   ============================================================ */

const CACHE_VERSION = 'v4.32';
const STATIC_CACHE  = 'wardesk-static-' + CACHE_VERSION;
const MEDIA_CACHE   = 'wardesk-media-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './icon.svg',
  './manifest.json',

  /* Core */
  './config.js',
  './utils.js',
  './storage.js',
  './store.js',

  /* Classifier + event logic */
  './classifier.js',
  './event-detector.js',
  './event-dedup.js',

  /* AI */
  './ai-shared.js',
  './ai-trending.js',
  './ai-ranking.js',
  './ai-dedup.js',
  './ai-summary.js',
  './ai-map.js',
  './ai-chat.js',
  './ai-ui.js',

  /* Worldmap */
  './worldmap-data.js',
  './worldmap.js',
  './province-mapper.js',
  './province-consensus.js',
  './consensus-history.js',
  './city-status.js',
  './conflict-areas.js',
  './maplibre-labels.js',

  /* OSINT */
  './osint-feeds.js',
  './diagnostic.js',

  /* Map + UI */
  './map-v11.10.js',
  './news-v27.js',
  './app-v12.js',
  './persist-v4.js',
  './refresh-v12.js',
  './world-status.js',
  './enhancements.js',
  './iptv-v8.js',
  './vod-v24.js'
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

  /* v4.31: images/fonts — pure cache-first, geen background re-fetch */
  if (isImage || isFont) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              cache.put(req, res.clone()).catch(()=>{});
            }
            return res;
          });
        })
      )
    );
    return;
  }

  /* JS/CSS: cache-first, dan netwerk, dan cache-update */
  if (isAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone()).catch(()=>{});
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  /* HTML/JSON: network-first met cache-fallback */
  if (isHtml || isJson) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, clone)).catch(()=>{});
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => {
          if (cached) return cached;
          if (isHtml) return caches.match('./offline.html');
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }))
    );
    return;
  }
});