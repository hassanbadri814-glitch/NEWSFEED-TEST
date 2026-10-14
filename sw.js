/* ============================================================
   WAR DESK Service Worker v4.41
   - v4.41: styles.css + timeline.js + icons + consensus modules
            maplibre-labels.js verwijderd (dode code)
   - v4.40: JS/CSS network-first met 3s timeout
   ============================================================ */

const CACHE_VERSION = 'v4.43';
const STATIC_CACHE  = 'wardesk-static-' + CACHE_VERSION;
const MEDIA_CACHE   = 'wardesk-media-v1';
const TILE_CACHE    = 'wardesk-tiles-v1';

const NETWORK_TIMEOUT_MS = 3000;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './styles.css',                     /* ← v4.41 TOEGEVOEGD */
  './icon.svg',
  './manifest.json',

  /* Icons (voor PWA-installatie) */
  './icons/icon-144.png',             /* ← v4.41 TOEGEVOEGD */
  './icons/icon-152.png',             /* ← v4.41 TOEGEVOEGD */
  './icons/icon-180.png',             /* ← v4.41 TOEGEVOEGD */

  /* Core */
  './config.js',
  './utils.js',
  './storage.js',
  './store.js',

  /* WD modules */
  './wd-utils.js',
  './wd-geo.js',
  './wd-proxy.js',
  './cache-manager.js',
  './boot-check.js',

  /* Classifier + event logic */
  './classifier.js',
  './city-actors.js',
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
  './baseline.js',
  './worldmap.js',
  './province-mapper.js',
  './province-consensus.js',          /* ← v4.41 TOEGEVOEGD */
  './consensus-history.js',           /* ← v4.41 TOEGEVOEGD */
  './city-status.js',
  './capture-tracker.js',
  './conflict-areas-data.js',
  './conflict-areas-fetch.js',
  './conflict-areas.js',
  './timeline.js',                    /* ← v4.41 TOEGEVOEGD */
  /* maplibre-labels.js VERWIJDERD — dode code */

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
  './vod-v24.js',
  './admin.js',
  './debug-menu.js'
];

const KEEP_CACHES = [STATIC_CACHE, MEDIA_CACHE, TILE_CACHE];

const TILE_HOSTS = [
  'a.basemaps.cartocdn.com',
  'b.basemaps.cartocdn.com',
  'c.basemaps.cartocdn.com',
  'd.basemaps.cartocdn.com',
  'tiles.openfreemap.org',
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org'
];

function isTileRequest(url){
  if(!url) return false;
  for(var i = 0; i < TILE_HOSTS.length; i++){
    if(url.hostname === TILE_HOSTS[i]) return true;
  }
  return false;
}

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
      console.log('[SW] Actief:', STATIC_CACHE, '+', MEDIA_CACHE, '+', TILE_CACHE);
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

  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res && res.status === 200) {
              cache.put(req, res.clone()).catch(()=>{});
            }
            return res;
          }).catch(() => {
            return new Response('', { status: 503 });
          });
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  const isImage = /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(url.pathname);
  const isFont  = /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isAsset = /\.(js|css)$/i.test(url.pathname);
  const isHtml  = /\.html$/i.test(url.pathname)
               || url.pathname === '/'
               || url.pathname.endsWith('/');
  const isJson  = /\.json$/i.test(url.pathname);

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

  if (isAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
          const res = await fetch(req, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res && res.status === 200) {
            cache.put(req, res.clone()).catch(()=>{});
          }
          return res;
        } catch (err) {
          if (cached) return cached;
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

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