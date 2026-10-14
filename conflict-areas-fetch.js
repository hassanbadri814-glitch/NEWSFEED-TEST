/* ============================================================
   WAR DESK — conflict-areas-fetch.js v1.0
   Alleen fetching + caching. Geen UI. Geen rendering.
   Alle fetches via WDProxy, alle logging via wdLog.
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";
  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";

  var db = null;

  function openDB(){
    return new Promise(function(resolve){
      try {
        if (!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_GEOJSON)){
            d.createObjectStore(STORE_GEOJSON, { keyPath: "k" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){
          try { wdLog.warn("[CA-Fetch] DB open faalde"); } catch(e){}
          resolve(null);
        };
      } catch(e){ resolve(null); }
    });
  }

  function closeDB(){
    if (db){
      try { db.close(); } catch(e){}
      db = null;
    }
  }

  function dbPut(key, value){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readwrite");
        tx.objectStore(STORE_GEOJSON).put({ k: key, v: value, t: Date.now() });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function dbGet(key){
    if (!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readonly");
        var r = tx.objectStore(STORE_GEOJSON).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function isValidGeoJSON(json){
    return json && json.features && Array.isArray(json.features) && json.features.length > 0;
  }

  function fetchJSON(url){
    if (window.WDProxy && WDProxy.fetchJSON){
      return WDProxy.fetchJSON(url);
    }
    /* Fallback als WDProxy niet geladen */
    var proxies = [
      "https://newsfeed2.hassanbadri814.workers.dev/?url=",
      "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
      "https://api.allorigins.win/raw?url="
    ];
    var idx = 0;
    function tryNext(){
      if (idx >= proxies.length){
        return Promise.reject(new Error("Alle proxies faalden voor " + url));
      }
      var fullUrl = proxies[idx++] + encodeURIComponent(url);
      return fetch(fullUrl).then(function(r){
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).catch(function(){ return tryNext(); });
    }
    return tryNext();
  }

  function normalizeArea(json, level){
    json.features.forEach(function(f){
      if (!f || !f.properties) return;
      var p = f.properties;
      var name, provinceName, iso, id;
      if (level === "ADM2"){
        name = p.NAME_2 || p.name_2 || "?";
        provinceName = p.NAME_1 || p.name_1 || null;
        iso = p.GID_2 || "";
        id = (p.GID_2 || name).toString().toLowerCase().replace(/\s+/g, "-");
      } else {
        name = p.NAME_1 || p.VARNAME_1 || p.name_1 || "?";
        provinceName = null;
        iso = p.ISO_1 || p.GID_1 || "";
        id = (p.GID_1 || iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      }
      f.properties = {
        id: id,
        name: name,
        provinceName: provinceName,
        iso: iso,
        attack_intensity: 0,
        attack_count: 0
      };
    });
    return json;
  }

  function fetchOblasts(conflictIso, conflict){
    if (!conflict || !conflict.oblastSources){
      return Promise.reject(new Error("Geen oblast bronnen voor " + conflictIso));
    }
    var lastErr = null;
    function trySource(idx){
      if (idx >= conflict.oblastSources.length){
        return Promise.reject(lastErr || new Error("Alle oblast bronnen faalden"));
      }
      return fetchJSON(conflict.oblastSources[idx])
        .then(function(json){
          if (!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
          return normalizeArea(json, conflict.level);
        })
        .catch(function(e){
          lastErr = e;
          try { wdLog.warn("[CA-Fetch] " + conflictIso + " bron " + (idx+1) + " faalde:", e.message); } catch(err){}
          return trySource(idx + 1);
        });
    }
    return trySource(0);
  }

  function fetchCountry(conflictIso, conflict){
    if (!conflict || !conflict.countrySources){
      return Promise.reject(new Error("Geen country bronnen voor " + conflictIso));
    }
    var lastErr = null;
    function trySource(idx){
      if (idx >= conflict.countrySources.length){
        return Promise.reject(lastErr || new Error("Alle country bronnen faalden"));
      }
      return fetchJSON(conflict.countrySources[idx])
        .then(function(json){
          if (!isValidGeoJSON(json)) throw new Error("Ongeldige country GeoJSON");
          return json;
        })
        .catch(function(e){
          lastErr = e;
          try { wdLog.warn("[CA-Fetch] " + conflictIso + " country bron " + (idx+1) + " faalde:", e.message); } catch(err){}
          return trySource(idx + 1);
        });
    }
    return trySource(0);
  }

  function loadOblasts(conflictIso, conflict){
    var cacheKey = "ca_oblasts_" + conflictIso;
    return dbGet(cacheKey).then(function(cached){
      if (cached && cached.v && isValidGeoJSON(cached.v)){
        return cached.v;
      }
      return fetchOblasts(conflictIso, conflict).then(function(json){
        return dbPut(cacheKey, json).then(function(){ return json; });
      });
    });
  }

  function loadCountry(conflictIso, conflict){
    if (!conflict || !conflict.countrySources) return Promise.resolve(null);
    var cacheKey = "ca_country_" + conflictIso;
    return dbGet(cacheKey).then(function(cached){
      if (cached && cached.v && isValidGeoJSON(cached.v)){
        return cached.v;
      }
      return fetchCountry(conflictIso, conflict)
        .then(function(json){
          return dbPut(cacheKey, json).then(function(){ return json; });
        })
        .catch(function(e){
          try { wdLog.warn("[CA-Fetch] " + conflictIso + " country laden faalde:", e.message); } catch(err){}
          return null;
        });
    });
  }

  /* Verwijder alle cache — voor "hard refresh" menu actie */
  function clearCache(){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readwrite");
        tx.objectStore(STORE_GEOJSON).clear();
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  window.WDCAFetch = {
    version: VERSION,
    openDB: openDB,
    closeDB: closeDB,
    loadOblasts: loadOblasts,
    loadCountry: loadCountry,
    isValidGeoJSON: isValidGeoJSON,
    clearCache: clearCache
  };

  try { wdLog.info("[CA-Fetch] " + VERSION + " geladen"); } catch(e){}

})();