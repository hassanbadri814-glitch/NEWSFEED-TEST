/* ============================================================
   WAR DESK — conflict-areas.js v1.0
   ------------------------------------------------------------
   FASE 1: Gebieds-GeoJSON laden (Oekraïne oblasten)
   - Haalt geoBoundaries GeoJSON op (via jsdelivr CDN)
   - Cachet in IndexedDB (30 dagen geldig)
   - Rendert basislaag met amber randen
   - Klaar voor fase 2 (controller-kleuring + attack intensity)
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var GEOJSON_URLS = [
    "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
    "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson"
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_VERSION = "v1";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420; /* Boven landen (400), onder markers (600) */

  var CA = {
    map: null,
    layer: null,
    geojson: null,
    areas: [],
    isLoaded: false,
    isInitialized: false
  };

  /* ============================================================
     IndexedDB
     ============================================================ */
  var db = null;

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

  /* ============================================================
     GeoJSON laden (met cache)
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

  function fetchFromUrl(url){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 20000);
    return fetch(url, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function(e){ clearTimeout(timer); throw e; });
  }

  function fetchGeoJSON(){
    var lastErr = null;
    function tryUrl(idx){
      if(idx >= GEOJSON_URLS.length){
        return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      }
      LOG("Probeer bron " + (idx+1) + "/" + GEOJSON_URLS.length);
      return fetchFromUrl(GEOJSON_URLS[idx]).then(function(json){
        if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
        return json;
      }).catch(function(e){
        LOG("Bron " + (idx+1) + " faalde: " + e.message);
        lastErr = e;
        return tryUrl(idx+1);
      });
    }
    return tryUrl(0);
  }

  function loadGeoJSON(){
    return loadFromCache().then(function(cached){
      if(cached) return cached;
      LOG("Cache leeg — fetch externe bron");
      return fetchGeoJSON().then(function(json){
        return dbPut(CACHE_KEY, {
          version: CACHE_VERSION,
          t: Date.now(),
          geojson: json
        }).then(function(){
          LOG("GeoJSON opgeslagen in cache");
          return json;
        });
      });
    });
  }

  /* ============================================================
     Normaliseer properties (uniform formaat voor fase 2/3)
     ============================================================ */
  function normalizeFeature(f){
    if(!f || !f.properties) return f;
    var p = f.properties;
    var name = p.shapeName || p.NAME_1 || p.name || p.NAME || p.ADMIN || "?";
    var iso  = p.shapeISO  || p.ISO_1  || p.iso  || "";
    var id   = p.shapeID   || p.id     || (iso || name).toLowerCase().replace(/\s+/g, "-");
    f.properties = {
      id: id,
      name: name,
      iso: iso,
      /* Placeholders — worden gevuld in fase 2/3 */
      controller: null,
      control_confidence: 0,
      territory_gain: false,
      attack_intensity: 0,
      last_update: null
    };
    return f;
  }

  /* ============================================================
     Pane (Leaflet z-index laag)
     ============================================================ */
  function ensurePane(map){
    if(map.getPane(PANE_NAME)) return;
    map.createPane(PANE_NAME);
    map.getPane(PANE_NAME).style.zIndex = PANE_Z;
    map.getPane(PANE_NAME).style.pointerEvents = "none";
  }

  /* ============================================================
     Styling — FASE 1: alleen amber rand, geen fill
     ============================================================ */
  function styleArea(feature){
    return {
      fillColor: "#b42828",
      fillOpacity: 0,               /* onzichtbaar — kleur volgt in fase 2 */
      color: "#e0a857",             /* amber */
      weight: 1.2,
      opacity: 0.65,
      dashArray: null,
      interactive: false            /* klik volgt in fase 4 */
    };
  }

  function onEachArea(feature, layer){
    /* Fase 1: geen interactie — alleen laag opbouwen */
  }

  /* ============================================================
     Render
     ============================================================ */
  function renderLayer(){
    if(!CA.map || !CA.geojson) return;
    ensurePane(CA.map);

    CA.layer = L.geoJSON(CA.geojson, {
      style: styleArea,
      onEachFeature: onEachArea,
      pane: PANE_NAME,
      smoothFactor: 1.2
    });

    CA.layer.addTo(CA.map);

    /* Verzamel gebieden voor fase 2 */
    CA.areas = [];
    CA.layer.eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas.push({
          id: l.feature.properties.id,
          name: l.feature.properties.name,
          iso: l.feature.properties.iso,
          layer: l,
          feature: l.feature
        });
      }
    });

    LOG("Gebiedslaag gerenderd: " + CA.areas.length + " gebieden");
  }

  /* ============================================================
     Public API
     ============================================================ */
  function init(mapInstance){
    if(CA.isInitialized){
      LOG("Al geïnitialiseerd — skip");
      return Promise.resolve();
    }
    if(!mapInstance){
      return Promise.reject(new Error("Geen geldige map instance"));
    }

    CA.map = mapInstance;
    LOG("Init gestart — laden GeoJSON…");

    return openDB()
      .then(loadGeoJSON)
      .then(function(json){
        json.features = json.features.map(normalizeFeature);
        CA.geojson = json;
        renderLayer();
        CA.isInitialized = true;
        CA.isLoaded = true;
        LOG("Init klaar — " + CA.areas.length + " oblasten geladen");
        return true;
      })
      .catch(function(e){
        LOG("Init faalde: " + (e.message || "?"));
        throw e;
      });
  }

  function destroy(){
    if(CA.layer && CA.map){
      try{ CA.map.removeLayer(CA.layer); }catch(e){}
    }
    CA.layer = null;
    CA.isInitialized = false;
    CA.isLoaded = false;
  }

  window.ConflictAreas = {
    init: init,
    destroy: destroy,
    state: CA,
    _version: "v1.0",
    _urls: GEOJSON_URLS
  };

  /* ============================================================
     Auto-init: wacht op MAPAPI + map instance
     ============================================================ */
  var tryInitAttempts = 0;
  var MAX_TRIES = 60; /* 30 seconden */

  function tryInit(){
    if(CA.isInitialized) return;
    tryInitAttempts++;
    var m = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
    if(m){
      init(m).catch(function(e){
        LOG("Auto-init faalde: " + (e.message || "?"));
      });
      return;
    }
    if(tryInitAttempts >= MAX_TRIES){
      LOG("Auto-init opgegeven na " + MAX_TRIES + " pogingen");
      return;
    }
    setTimeout(tryInit, 500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(tryInit, 1500); });
  } else {
    setTimeout(tryInit, 1500);
  }

  /* Herprobeer bij klik op de kaart-tab */
  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab) setTimeout(tryInit, 1200);
  });

  LOG("conflict-areas.js v1.0 geladen — wacht op map init");
})();