/* ============================================================
   WAR DESK Service Worker v1.0
   - Offline caching voor essentiële resources
   - Network-first voor API calls
   - Cache-first voor statische assets
   ============================================================ */

const CACHE_NAME = 'wardesk-v13.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/config.js',
  '/store.js',
  '/news-v27.js',
  '/app-v12.js',
  '/persist-v4.js',
  '/refresh-v12.js',
  '/iptv-v8.js',
  '/map-v11.js',
  '/vod-v24.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

const API_DOMAINS = [
  'war-tracker.com',
  'tiles.stadiamaps.com',
  'v3-cinemeta.strem.io',
  'api.mymemory.translated.net'
];

// Install: cache statische assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup oude caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first voor API, cache-first voor static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // API calls: network-first
  if (API_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Statische assets: cache-first
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});