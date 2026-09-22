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
  '/vod-v24.js'
];

const API_DOMAINS = [
  'war-tracker.com',
  'tiles.stadiamaps.com',
  'v3-cinemeta.strem.io',
  'api.mymemory.translated.net'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if(API_DOMAINS.some(domain => url.hostname.includes(domain))){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});