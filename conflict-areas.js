/* ============================================================
   WAR DESK — conflict-areas.js v1.1
   ------------------------------------------------------------
   FASE 1: Gebieds-GeoJSON laden (Oekraïne oblasten)
   - v1.1: robuuste bronkeuze (geoBoundaries API → Natural Earth)
   - v1.0: eerste opzet
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  /* ============================================================
     BRONNEN (in volgorde van voorkeur)
     ============================================================ */
  var GEOJSON_SOURCES = [
    /* 1. geoBoundaries API: klein metadata-bestand met download-URL */
    { type: "gbapi", url: "https://www.geoboundaries.org/api/current/gbOpen/UKR/ADM1/" },

    /* 2. Natural Earth 50m admin-1 (filter op Oekraïne) */
    { type: "ne", url: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson" },

    /* 3. Natural Earth 10m admin-1 (gedetailleerder, groter bestand) */
    { type: "ne", url: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_1_states_provinces.geojson" }
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_VERSION = "v2"; /* gebumpt → oude cache wordt genegeerd */
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420;

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
     HTTP helper — geeft ALTIJD JSON of gooit een error
     ============================================================ */
  function fetchJson(url, timeoutMs){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs || 20000);
    return fetch(url, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function(text){
        var trimmed = text.replace(/^\uFEFF/, "").replace(/^\s+/, "");
        if(trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "["){
          throw new Error("Response is geen JSON (kreeg: " + trimmed.slice(0, 30).replace(/\s+/g, " ") + ")");
        }
        try { return JSON.parse(text); }
        catch(e){ throw new Error("JSON parse fout: " + e.message); }
      })
      .catch(function(e){ clearTimeout(timer); throw e; });
  }

  /* ============================================================
     Natural Earth: filter Oekraïne + normaliseer properties
     ============================================================ */
  function filterAndNormalizeNE(json){
    if(!json || !json.features) throw new Error("Geen features in NE bestand");

    var ukrFeatures = json.features.filter(function(f){
      if(!f || !f.properties) return false;
      var p = f.properties;
      return (p.adm0_a3 === "UKR") ||
             (p.iso_a2 === "UA") ||
             (p.admin === "Ukraine") ||
             (p.sovereignt === "Ukraine");
    });

    if(!ukrFeatures.length){
      throw new Error("Geen Oekraïense features in NE bestand (" + json.features.length + " totaal)");
    }

    ukrFeatures.forEach(function(f){
      var p = f.properties;
      var name = p.name || p.name_nl || p.NAME || p.admin || "?";
      var iso = p.iso_3166_2 || p.iso_3166_2_l || p.postal || "";
      var id = (iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      f.properties = {
        id: id,
        name: name,
        iso: iso,
        controller: null,
        control_confidence: 0,
        territory_gain: false,
        attack_intensity: 0,
        last_update: null
      };
    });

    return { type: "FeatureCollection", features: ukrFeatures };
  }

  /* ============================================================
     geoBoundaries: normaliseer properties
     ============================================================ */
  function normalizeGB(json){
    if(!json || !json.features) throw new Error("Geen features in geoBoundaries bestand");
    json.features.forEach(function(f){
      if(!f || !f.properties) return;
      var p = f.properties;
      var name = p.shapeName || p.NAME_1 || p.name || "?";
      var iso  = p.shapeISO  || p.ISO_1  || "";
      var id   = p.shapeID   || p.id     || (iso || name).toLowerCase().replace(/\s+/g, "-");
      f.properties = {
        id: id,
        name: name,
        iso: iso,
        controller: null,
        control_confidence: 0,
        territory_gain: false,
        attack_intensity: 0,
        last_update: null
      };
    });
    return json;
  }

  /* ============================================================
     Bron-specifieke fetchers
     ============================================================ */

  /* geoBoundaries API: 2-staps (metadata → echte GeoJSON URL) */
  function fetchFromGBAPI(apiUrl){
    return fetchJson(apiUrl).then(function(meta){
      if(!meta || !meta.gjDownloadURL){
        throw new Error("API geeft geen gjDownloadURL (" + JSON.stringify(meta).slice(0, 100) + ")");
      }
      LOG("API download-URL: " + meta.gjDownloadURL.slice(0, 80));
      return fetchJson(meta.gjDownloadURL, 30000).then(function(gj){
        return normalizeGB(gj);
      });
    });
  }

  /* Natural Earth: download + filter + normaliseer */
  function fetchFromNE(url){
    return fetchJson(url, 60000).then(function(json){
      return filterAndNormalizeNE(json);
    });
  }

  /* ============================================================
     Alle bronnen proberen
     ============================================================ */
  function fetchGeoJSON(){
    var lastErr = null;

    function trySource(idx){
      if(idx >= GEOJSON_SOURCES.length){
        return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      }
      var src = GEOJSON_SOURCES[idx];
      LOG("Probeer bron " + (idx+1) + "/" + GEOJSON_SOURCES.length + " (" + src.type + ")");

      var p;
      if(src.type === "gbapi") p = fetchFromGBAPI(src.url);
      else p = fetchFromNE(src.url);

      return p.then(function(json){
        if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON na verwerking");
        LOG("Bron " + (idx+1) + " OK — " + json.features.length + " features");
        return json;
      }).catch(function(e){
        LOG("Bron " + (idx+1) + " faalde: " + e.message);
        lastErr = e;
        return trySource(idx+1);
      });
    }

    return trySource(0);
  }

  /* ============================================================
     Volledige laad-flow
     ============================================================ */
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
     Pane + Styling + Render
     ============================================================ */
  function ensurePane(map){
    if(map.getPane(PANE_NAME)) return;
    map.createPane(PANE_NAME);
    map.getPane(PANE_NAME).style.zIndex = PANE_Z;
    map.getPane(PANE_NAME).style.pointerEvents = "none";
  }

  function styleArea(feature){
    return {
      fillColor: "#b42828",
      fillOpacity: 0,
      color: "#e0a857",
      weight: 1.2,
      opacity: 0.65,
      dashArray: null,
      interactive: false
    };
  }

  function renderLayer(){
    if(!CA.map || !CA.geojson) return;
    ensurePane(CA.map);

    CA.layer = L.geoJSON(CA.geojson, {
      style: styleArea,
      pane: PANE_NAME,
      smoothFactor: 1.2
    });

    CA.layer.addTo(CA.map);

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

  function clearCache(){
    return dbDelete(CACHE_KEY).then(function(){
      LOG("Cache gewist");
      return true;
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
    clearCache: clearCache,
    state: CA,
    _version: "v1.1",
    _sources: GEOJSON_SOURCES
  };

  /* ============================================================
     Auto-init
     ============================================================ */
  var tryInitAttempts = 0;
  var MAX_TRIES = 60;

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

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab) setTimeout(tryInit, 1200);
  });

  LOG("conflict-areas.js v1.1 geladen — wacht op map init");
})();