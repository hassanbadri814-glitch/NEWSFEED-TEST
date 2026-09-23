/* ============================================================
   WAR DESK Service Worker v2.5
   - Network-first voor HTML/JS/CSS/JSON
   - Cache-first voor images/fonts/icons (eigen domein)
   - CDN assets NIET cachen
   - Cache-naam gebumpt voor update-detectie
   ============================================================ */

const CACHE_NAME = 'wardesk-v14.28';
const PRECACHE_ASSETS = [
  './',
  './index.html',
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

  if (url.origin !== location.origin) {
    return;
  }

  const isCode = /\.(html|js|css|json)$/i.test(url.pathname)
              || url.pathname === '/'
              || url.pathname.endsWith('/');

  if (isCode) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(r => r || caches.match('./index.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});

/* ============================================================
   WAR DESK v1.0 — Gedeelde Utilities
   - Centrale escapeHtml, getProxies, timeAgo
   - Laadt na config.js, voor de andere modules
   - Geen side-effects, geen DOM-manipulatie
   ============================================================ */

(function(){
  "use strict";

  var DEBUG = false;
  try{
    DEBUG = (typeof window.WD_DEBUG !== "undefined" && window.WD_DEBUG) ||
            (localStorage.getItem("wardesk_debug") === "1") ||
            /[?&]debug=1/.test(location.search);
  }catch(e){}

  function escapeHtml(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function getProxies(){
    if(window.CONFIG && CONFIG.proxies && CONFIG.proxies.length){
      return CONFIG.proxies.slice();
    }
    return ["https://newsfeed2.hassanbadri814.workers.dev/?url="];
  }

  function timeAgo(d){
    var t = new Date(d).getTime();
    if(isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if(diff < 60) return "nu";
    if(diff < 3600) return Math.floor(diff / 60) + " min";
    if(diff < 86400) return Math.floor(diff / 3600) + " u";
    return Math.floor(diff / 86400) + " d";
  }

  window.WD = window.WD || {};
  window.WD.escapeHtml = escapeHtml;
  window.WD.getProxies = getProxies;
  window.WD.timeAgo = timeAgo;

  if(DEBUG){
    try{ console.log("[WAR DESK] utils.js v1.0 geladen"); }catch(e){}
  }
})();