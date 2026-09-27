/* ============================================================
   WAR DESK — conflict-areas.js v1.3
   ------------------------------------------------------------
   FASE 1: Gebieds-GeoJSON laden (Oekraïne oblasten)
   - v1.3: proxy-first + meerdere bronnen + uitgebreide logging
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var SOURCES = [
    "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
    "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json",
    "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
    "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/master/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson"
  ];

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_VERSION = "v4";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420;

  var CA = { map: null, layer: null, geojson: null, areas: [], isLoaded: false, isInitialized: false };
  var db = null;

  /* ============================================================
     IndexedDB
     ============================================================ */
  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains(STORE_GEOJSON)){
            d.createObjectStore(STORE_GEOJSON, { keyPath: "k" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }
  function dbPut(key, value){
    if(!db) return Promise.resolve(false);
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
    if(!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readonly");
        var r = tx.objectStore(STORE_GEOJSON).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }
  function dbDelete(key){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readwrite");
        tx.objectStore(STORE_GEOJSON).delete(key);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  /* ============================================================
     Cache
     ============================================================ */
  function isValidGeoJSON(json){
    return json && json.features && Array.isArray(json.features) && json.features.length > 5;
  }
  function loadFromCache(){
    return dbGet(CACHE_KEY).then(function(cached){
      if(!cached || !cached.v) return null;
      if(cached.v.version === CACHE_VERSION &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        LOG("GeoJSON uit cache (" + cached.v.geojson.features.length + " features)");
        return cached.v.geojson;
      }
      return null;
    });
  }

  /* ============================================================
     Fetch helpers
     ============================================================ */
  function parseJsonText(text){
    var trimmed = String(text).replace(/^\uFEFF/, "").replace(/^\s+/, "");
    if(trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "["){
      throw new Error("Response is geen JSON: " + trimmed.slice(0, 60).replace(/\s+/g, " "));
    }
    try { return JSON.parse(text); }
    catch(e){ throw new Error("JSON parse fout: " + e.message); }
  }

  function fetchRaw(url, timeoutMs){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs || 25000);
    return fetch(url, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function(text){ clearTimeout(timer); return parseJsonText(text); })
      .catch(function(e){ clearTimeout(timer); throw e; });
  }

  function fetchViaProxy(targetUrl){
    var idx = 0;
    function tryNext(){
      if(idx >= PROXIES.length){
        return Promise.reject(new Error("Alle " + PROXIES.length + " proxies faalden"));
      }
      var proxy = PROXIES[idx];
      var fullUrl = proxy + encodeURIComponent(targetUrl);
      var proxyNum = idx + 1;
      idx++;
      LOG("  → proxy " + proxyNum + "/" + PROXIES.length);
      return fetchRaw(fullUrl, 30000).catch(function(e){
        LOG("  proxy " + proxyNum + " faalde: " + e.message);
        return tryNext();
      });
    }
    return tryNext();
  }

  /* ============================================================
     Normalisatie
     ============================================================ */
  function detectSourceFormat(json){
    if(!json || !json.features || !json.features.length) return "unknown";
    var p = json.features[0].properties || {};
    if(p.GID_1 || p.NAME_1 || p.VARNAME_1) return "gadm";
    if(p.shapeName || p.shapeID || p.shapeISO) return "gbound";
    return "unknown";
  }

  function normalize(json){
    var format = detectSourceFormat(json);
    LOG("  formaat: " + format);
    json.features.forEach(function(f){
      if(!f || !f.properties) return;
      var p = f.properties;
      var name, iso, id;
      if(format === "gadm"){
        name = p.NAME_1 || p.VARNAME_1 || p.name_1 || "?";
        iso  = p.ISO_1 || p.GID_1 || "";
        id   = (p.GID_1 || iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      } else {
        name = p.shapeName || p.NAME_1 || p.name || "?";
        iso  = p.shapeISO || p.ISO_1 || "";
        id   = (p.shapeID || iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      }
      f.properties = {
        id: id, name: name, iso: iso,
        controller: null, control_confidence: 0,
        territory_gain: false, attack_intensity: 0, last_update: null
      };
    });
    return json;
  }

  /* ============================================================
     Hoofd fetch-flow
     ============================================================ */
  function fetchGeoJSON(){
    var lastErr = null;
    function trySource(srcIdx){
      if(srcIdx >= SOURCES.length){
        return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      }
      var url = SOURCES[srcIdx];
      var shortUrl = url.replace(/^https?:\/\//, "").slice(0, 60);
      LOG("Bron " + (srcIdx+1) + "/" + SOURCES.length + ": " + shortUrl);

      return fetchViaProxy(url)
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON na fetch");
          return normalize(json);
        })
        .then(function(json){
          LOG("  ✓ " + json.features.length + " features van bron " + (srcIdx+1));
          return json;
        })
        .catch(function(e){
          LOG("Bron " + (srcIdx+1) + " faalde: " + e.message);
          lastErr = e;
          return trySource(srcIdx + 1);
        });
    }
    return trySource(0);
  }

  function loadGeoJSON(){
    return loadFromCache().then(function(cached){
      if(cached) return cached;
      LOG("Cache leeg — start proxy fetch");
      return fetchGeoJSON().then(function(json){
        return dbPut(CACHE_KEY, {
          version: CACHE_VERSION, t: Date.now(), geojson: json
        }).then(function(){
          LOG("GeoJSON opgeslagen in cache");
          return json;
        });
      });
    });
  }

  /* ============================================================
     Pane + Render
     ============================================================ */
  function ensurePane(map){
    if(map.getPane(PANE_NAME)) return;
    map.createPane(PANE_NAME);
    map.getPane(PANE_NAME).style.zIndex = PANE_Z;
    map.getPane(PANE_NAME).style.pointerEvents = "none";
  }

  function styleArea(){
    return {
      fillColor: "#b42828", fillOpacity: 0,
      color: "#e0a857", weight: 1.2,
      opacity: 0.65, dashArray: null, interactive: false
    };
  }

  function renderLayer(){
    if(!CA.map || !CA.geojson) return;
    ensurePane(CA.map);
    CA.layer = L.geoJSON(CA.geojson, {
      style: styleArea, pane: PANE_NAME, smoothFactor: 1.2
    });
    CA.layer.addTo(CA.map);
    CA.areas = [];
    CA.layer.eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas.push({
          id: l.feature.properties.id,
          name: l.feature.properties.name,
          iso: l.feature.properties.iso,
          layer: l, feature: l.feature
        });
      }
    });
    LOG("Gebiedslaag gerenderd: " + CA.areas.length + " gebieden");
  }

  /* ============================================================
     Public API
     ============================================================ */
  function init(mapInstance){
    if(CA.isInitialized){ LOG("Al geïnitialiseerd"); return Promise.resolve(); }
    if(!mapInstance) return Promise.reject(new Error("Geen map instance"));
    CA.map = mapInstance;
    LOG("Init gestart");
    return openDB()
      .then(loadGeoJSON)
      .then(function(json){
        CA.geojson = json;
        renderLayer();
        CA.isInitialized = true;
        CA.isLoaded = true;
        LOG("Init klaar — " + CA.areas.length + " oblasten");
        return true;
      })
      .catch(function(e){
        LOG("Init faalde: " + (e.message || "?"));
        throw e;
      });
  }

  function clearCache(){
    return dbDelete(CACHE_KEY).then(function(){
      LOG("Cache gewist");
      return true;
    });
  }

  function destroy(){
    if(CA.layer && CA.map){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }
    CA.layer = null; CA.isInitialized = false; CA.isLoaded = false;
  }

  window.ConflictAreas = {
    init: init, destroy: destroy, clearCache: clearCache,
    state: CA, _version: "v1.3", _sources: SOURCES
  };

  /* ============================================================
     Auto-init
     ============================================================ */
  var tries = 0, MAX = 60;
  function tryInit(){
    if(CA.isInitialized) return;
    tries++;
    var m = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
    if(m){
      init(m).catch(function(e){ LOG("Auto-init faalde: " + (e.message || "?")); });
      return;
    }
    if(tries >= MAX){ LOG("Auto-init opgegeven"); return; }
    setTimeout(tryInit, 500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(tryInit, 1500); });
  } else {
    setTimeout(tryInit, 1500);
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab) setTimeout(tryInit, 1200);
  });

  LOG("conflict-areas.js v1.3 geladen — wacht op map init");
})();