/* ============================================================
   WAR DESK v2.1 — VOD (Stremio via Cinemeta)
   - FIX: grid wordt nu altijd geleegd bij nieuwe categorie
   - FIX: loadMore-wrap wordt gereset
   - Race-conditie, timeout, skeleton, zoekfunctie
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ console.log.apply(console, ["[VOD]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v2.1 geladen");

  var CINEMETA_BASE = "https://v3-cinemeta.strem.io";

  var VOD = {
    currentCatId: "movie/top",
    currentType: "movie",
    currentLabel: "Top films",
    currentSkip: 0,
    currentItems: [],
    currentDetail: null,
    cache: new Map(),
    cacheMaxSize: 30,
    isLoading: false,
    loadToken: 0,
    _initialized: false,
    _sidebarBound: false,
    _gridBound: false,
    _searchValue: ""
  };

  var CATS = [
    { group: "Populair", items: [
      { id: "movie/top",  label: "Top films",  color: "#e0a857" },
      { id: "series/top", label: "Top series", color: "#e0a857" }
    ]},
    { group: "Film genres", items: [
      { id: "movie/top/genre=Action",     label: "Actie",    color: "#ef4444" },
      { id: "movie/top/genre=Comedy",     label: "Komedie",  color: "#f59e0b" },
      { id: "movie/top/genre=Drama",      label: "Drama",    color: "#a855f7" },
      { id: "movie/top/genre=Sci-Fi",     label: "Sci-Fi",   color: "#06b6d4" },
      { id: "movie/top/genre=Thriller",   label: "Thriller", color: "#8b5cf6" }
    ]},
    { group: "Serie genres", items: [
      { id: "series/top/genre=Action",    label: "Actie",    color: "#ef4444" },
      { id: "series/top/genre=Comedy",    label: "Komedie",  color: "#f59e0b" },
      { id: "series/top/genre=Drama",     label: "Drama",    color: "#a855f7" },
      { id: "series/top/genre=Sci-Fi",    label: "Sci-Fi",   color: "#06b6d4" },
      { id: "series/top/genre=Thriller",  label: "Thriller", color: "#8b5cf6" }
    ]}
  ];

  function esc(s){
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

  function fetchJsonDirect(url, timeoutMs){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, { method: "GET", signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function(e){
        clearTimeout(timer);
        throw e;
      });
  }

  function fetchJsonViaProxy(url){
    var proxies = getProxies();
    var lastErr = null;
    function tryProxy(idx){
      if(idx >= proxies.length) return Promise.reject(lastErr || new Error("Alle proxies faalden"));
      var proxy = proxies[idx];
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, 15000);
      return fetch(proxy + encodeURIComponent(url), { method: "GET", signal: ctrl.signal })
        .then(function(r){
          clearTimeout(timer);
          if(!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(function(e){
          clearTimeout(timer);
          lastErr = e;
          LOG("Proxy " + (idx + 1) + " faalde:", e.message);
          return tryProxy(idx + 1);
        });
    }
    return tryProxy(0);
  }

  function fetchJson(url){
    return fetchJsonDirect(url, 12000).catch(function(e){
      LOG("Direct faalde:", e.message, "- probeer proxy");
      return fetchJsonViaProxy(url);
    });
  }

  function buildCatalogUrl(catId, skip){
    var url = CINEMETA_BASE + "/catalog/" + catId;
    if(typeof skip === "number" && skip > 0){
      url += "/skip=" + skip;
    }
    return url + ".json";
  }

  function buildSearchUrl(type, query, skip){
    var url = CINEMETA_BASE + "/catalog/" + type + "/top/search=" + encodeURIComponent(query);
    if(typeof skip === "number" && skip > 0){
      url += "/skip=" + skip;
    }
    return url + ".json";
  }

  function buildMetaUrl(type, id){
    return CINEMETA_BASE + "/meta/" + type + "/" + encodeURIComponent(id) + ".json";
  }

  function cacheGet(key){
    var entry = VOD.cache.get(key);
    return entry ? entry.items : null;
  }
  function cacheSet(key, items){
    VOD.cache.set(key, { items: items, t: Date.now() });
    if(VOD.cache.size > VOD.cacheMaxSize){
      var oldestKey = null;
      var oldestT = Infinity;
      VOD.cache.forEach(function(v, k){
        if(v.t