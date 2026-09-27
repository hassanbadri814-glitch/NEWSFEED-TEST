/* ============================================================
   WAR DESK — conflict-areas.js v2.1
   ------------------------------------------------------------
   FASE 2: Controller-kleuring met verfijnde visuele stijl
   - v2.1: schonere kleuren, subtiele randen, lagere opacity
   - v2.0: DeepState + turf.js integratie
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var OBLAST_SOURCES = [
    "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
    "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json"
  ];

  var DEEPSTATE_SOURCES = [
    "https://deepstatemap.live/api/history/last",
    "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/deepstate-map-data.geojson",
    "https://raw.githubusercontent.com/Andkto/ukraine-war-map/main/deepstate.geojson"
  ];

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  /* Fallback-lijst van bezette oblasten (wordt gebruikt als DeepState faalt) */
  var FALLBACK_OCCUPIED = [
    "luhan", "donets", "zaporiz", "kherson", "krym", "crimea", "sevastopol"
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_KEY_DS = "wardesk_deepstate_geo";
  var CACHE_VERSION = "v6";
  var CACHE_VERSION_DS = "v2";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420;

  /* ============================================================
     KLEUREN — schoon en elegant
     ============================================================ */
  var COLORS = {
    russiaFill:    "#C62828",          /* elegant dieprood */
    ukraineFill:   "#2A6FDB",          /* mooi koningsblauw */
    russiaBorder:  "rgba(180,40,40,0.55)",
    ukraineBorder: "rgba(50,110,200,0.55)",
    neutralBorder: "rgba(255,255,255,0.10)"
  };

  var FILL_OPACITY = 0.45;              /* subtieler dan 0.55 */
  var BORDER_WEIGHT = 0.6;              /* dun en strak */

  var CA = {
    map: null,
    layer: null,
    geojson: null,
    areas: [],
    deepStateGeo: null,
    isLoaded: false,
    isInitialized: false,
    stats: { total: 0, russia: 0, ukraine: 0, unknown: 0 }
  };

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

  function isValidGeoJSON(json){
    return json && json.features && Array.isArray(json.features) && json.features.length > 5;
  }

  function loadOblastsFromCache(){
    return dbGet(CACHE_KEY).then(function(cached){
      if(!cached || !cached.v) return null;
      if(cached.v.version === CACHE_VERSION &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        LOG("Oblasten uit cache (" + cached.v.geojson.features.length + " features)");
        return cached.v.geojson;
      }
      return null;
    });
  }

  function loadDeepStateFromCache(){
    return dbGet(CACHE_KEY_DS).then(function(cached){
      if(!cached || !cached.v) return null;
      if(cached.v.version === CACHE_VERSION_DS &&
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS){
        LOG("DeepState uit cache");
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
      throw new Error("Response is geen JSON");
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
        return Promise.reject(new Error("Alle proxies faalden"));
      }
      var proxy = PROXIES[idx];
      var fullUrl = proxy + encodeURIComponent(targetUrl);
      idx++;
      return fetchRaw(fullUrl, 30000).catch(function(e){
        return tryNext();
      });
    }
    return tryNext();
  }

  /* ============================================================
     Oblast normalisatie
     ============================================================ */
  function normalizeOblast(json){
    json.features.forEach(function(f){
      if(!f || !f.properties) return;
      var p = f.properties;
      var name = p.NAME_1 || p.VARNAME_1 || p.name_1 || "?";
      var iso  = p.ISO_1 || p.GID_1 || "";
      var id   = (p.GID_1 || iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      f.properties = {
        id: id, name: name, iso: iso,
        controller: null, control_confidence: 0,
        territory_gain: false, attack_intensity: 0, last_update: null
      };
    });
    return json;
  }

  function fetchOblasts(){
    var lastErr = null;
    function trySource(idx){
      if(idx >= OBLAST_SOURCES.length){
        return Promise.reject(lastErr || new Error("Alle oblast-bronnen faalden"));
      }
      var url = OBLAST_SOURCES[idx];
      LOG("Oblasten bron " + (idx+1) + "/" + OBLAST_SOURCES.length);
      return fetchViaProxy(url)
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
          return normalizeOblast(json);
        })
        .then(function(json){
          LOG("  ✓ " + json.features.length + " oblasten");
          return json;
        })
        .catch(function(e){
          LOG("  bron " + (idx+1) + " faalde: " + e.message);
          lastErr = e;
          return trySource(idx+1);
        });
    }
    return trySource(0);
  }

  function loadOblasts(){
    return loadOblastsFromCache().then(function(cached){
      if(cached) return cached;
      LOG("Oblast-cache leeg — fetch externe bron");
      return fetchOblasts().then(function(json){
        return dbPut(CACHE_KEY, {
          version: CACHE_VERSION, t: Date.now(), geojson: json
        }).then(function(){
          LOG("Oblasten opgeslagen in cache");
          return json;
        });
      });
    });
  }

  /* ============================================================
     DeepState extractie
     ============================================================ */
  function extractDeepStateGeometry(json){
    if(!json) return null;

    if(json.type === "FeatureCollection" && json.features){
      var best = null, bestArea = 0;
      json.features.forEach(function(f){
        if(!f.geometry) return;
        var area = 0;
        if(f.geometry.type === "Polygon"){
          area = f.geometry.coordinates.length;
        } else if(f.geometry.type === "MultiPolygon"){
          f.geometry.coordinates.forEach(function(poly){ area += poly.length; });
        }
        if(area > bestArea){ bestArea = area; best = f; }
      });
      if(best) return best;
    }

    if(Array.isArray(json) && json.length){
      var polys = [];
      json.forEach(function(item){
        if(!item) return;
        if(item.geometry && item.geometry.type === "MultiPolygon"){
          polys = polys.concat(item.geometry.coordinates);
        } else if(item.geometry && item.geometry.type === "Polygon"){
          polys.push(item.geometry.coordinates);
        } else if(item.type === "MultiPolygon"){
          polys = polys.concat(item.coordinates);
        } else if(item.type === "Polygon"){
          polys.push(item.coordinates);
        }
      });
      if(polys.length){
        return {
          type: "Feature",
          properties: { name: "deepstate_occupied" },
          geometry: { type: "MultiPolygon", coordinates: polys }
        };
      }
    }
    return null;
  }

  function fetchDeepState(){
    var lastErr = null;
    function trySource(idx){
      if(idx >= DEEPSTATE_SOURCES.length){
        return Promise.reject(lastErr || new Error("Alle DeepState bronnen faalden"));
      }
      var url = DEEPSTATE_SOURCES[idx];
      LOG("DeepState bron " + (idx+1) + "/" + DEEPSTATE_SOURCES.length);
      return fetchViaProxy(url)
        .then(function(json){
          var feat = extractDeepStateGeometry(json);
          if(!feat) throw new Error("Geen polygoon in response");
          return feat;
        })
        .then(function(feat){
          LOG("  ✓ DeepState geladen");
          return feat;
        })
        .catch(function(e){
          LOG("  bron " + (idx+1) + " faalde: " + e.message);
          lastErr = e;
          return trySource(idx+1);
        });
    }
    return trySource(0);
  }

  function loadDeepState(){
    return loadDeepStateFromCache().then(function(cached){
      if(cached) return cached;
      LOG("DeepState cache leeg — fetch externe bron");
      return fetchDeepState().then(function(feat){
        return dbPut(CACHE_KEY_DS, {
          version: CACHE_VERSION_DS, t: Date.now(), geojson: feat
        }).then(function(){
          LOG("DeepState opgeslagen in cache");
          return feat;
        });
      }).catch(function(e){
        LOG("DeepState laden faalde: " + e.message);
        return null;
      });
    });
  }

  /* ============================================================
     Controller berekening
     ============================================================ */
  function checkFallbackOccupied(name){
    var lname = String(name || "").toLowerCase();
    for(var i = 0; i < FALLBACK_OCCUPIED.length; i++){
      if(lname.indexOf(FALLBACK_OCCUPIED[i]) !== -1) return true;
    }
    return false;
  }

  function calculateControllers(){
    if(!CA.geojson || !CA.geojson.features) return;

    var hasDeepState = !!CA.deepStateGeo;
    var hasTurf = !!(window.turf && window.turf.centroid && window.turf.booleanPointInPolygon);

    LOG("Controller berekening — DeepState: " + hasDeepState + ", turf: " + hasTurf);

    var stats = { total: 0, russia: 0, ukraine: 0, unknown: 0 };

    CA.geojson.features.forEach(function(feature){
      if(!feature || !feature.properties) return;
      stats.total++;
      var props = feature.properties;
      var controller = null;

      if(hasDeepState && hasTurf){
        try {
          var centroid = window.turf.centroid(feature);
          var inOccupied = window.turf.booleanPointInPolygon(centroid, CA.deepStateGeo);
          controller = inOccupied ? "Rusland" : "Oekraïne";
        } catch(e){
          controller = checkFallbackOccupied(props.name) ? "Rusland" : "Oekraïne";
        }
      } else {
        controller = checkFallbackOccupied(props.name) ? "Rusland" : "Oekraïne";
      }

      if(controller === "Rusland") stats.russia++;
      else if(controller === "Oekraïne") stats.ukraine++;
      else stats.unknown++;

      props.controller = controller;
      props.control_confidence = controller ? 0.7 : 0;
      props.last_update = new Date().toISOString();
    });

    CA.stats = stats;
    LOG("Controllers: " + stats.total + " oblasten | Rusland: " + stats.russia +
        " | Oekraïne: " + stats.ukraine);
  }

  /* ============================================================
     Styling
     ============================================================ */
  function styleArea(feature){
    var props = (feature && feature.properties) || {};
    var controller = props.controller;
    var fillColor, borderColor;

    if(controller === "Rusland"){
      fillColor = COLORS.russiaFill;
      borderColor = COLORS.russiaBorder;
    } else if(controller === "Oekraïne"){
      fillColor = COLORS.ukraineFill;
      borderColor = COLORS.ukraineBorder;
    } else {
      fillColor = "transparent";
      borderColor = COLORS.neutralBorder;
    }

    return {
      fillColor: fillColor,
      fillOpacity: controller ? FILL_OPACITY : 0,
      color: borderColor,
      weight: BORDER_WEIGHT,
      opacity: 0.7,
      dashArray: null,
      interactive: false,
      lineCap: "round",
      lineJoin: "round"
    };
  }

  /* ============================================================
     Render
     ============================================================ */
  function ensurePane(map){
    if(map.getPane(PANE_NAME)) return;
    map.createPane(PANE_NAME);
    map.getPane(PANE_NAME).style.zIndex = PANE_Z;
    map.getPane(PANE_NAME).style.pointerEvents = "none";
  }

  function renderLayer(){
    if(!CA.map || !CA.geojson) return;
    ensurePane(CA.map);

    if(CA.layer){
      try{ CA.map.removeLayer(CA.layer); }catch(e){}
    }

    CA.layer = L.geoJSON(CA.geojson, {
      style: styleArea,
      pane: PANE_NAME,
      smoothFactor: 1.5
    });

    CA.layer.addTo(CA.map);

    CA.areas = [];
    CA.layer.eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas.push({
          id: l.feature.properties.id,
          name: l.feature.properties.name,
          iso: l.feature.properties.iso,
          controller: l.feature.properties.controller,
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
    if(CA.isInitialized){ LOG("Al geïnitialiseerd"); return Promise.resolve(); }
    if(!mapInstance) return Promise.reject(new Error("Geen map instance"));

    CA.map = mapInstance;
    LOG("Init gestart");

    return openDB()
      .then(function(){ return loadOblasts(); })
      .then(function(oblastsJson){
        CA.geojson = oblastsJson;
        return loadDeepState().then(function(dsFeat){
          CA.deepStateGeo = dsFeat;
          calculateControllers();
          renderLayer();
          CA.isInitialized = true;
          CA.isLoaded = true;
          LOG("Init klaar — " + CA.areas.length + " oblasten (" +
              CA.stats.russia + " rood, " + CA.stats.ukraine + " blauw)");
          return true;
        });
      })
      .catch(function(e){
        LOG("Init faalde: " + (e.message || "?"));
        throw e;
      });
  }

  function refresh(){
    if(!CA.isInitialized) return Promise.resolve();
    LOG("Refresh — DeepState opnieuw ophalen");
    return dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null })
      .then(function(){ return loadDeepState(); })
      .then(function(dsFeat){
        CA.deepStateGeo = dsFeat;
        calculateControllers();
        renderLayer();
        return true;
      });
  }

  function clearCache(){
    return Promise.all([
      dbPut(CACHE_KEY, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){ LOG("Caches gewist"); return true; });
  }

  function destroy(){
    if(CA.layer && CA.map){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }
    CA.layer = null; CA.isInitialized = false; CA.isLoaded = false;
  }

  function getStats(){ return CA.stats; }

  window.ConflictAreas = {
    init: init, refresh: refresh, destroy: destroy, clearCache: clearCache,
    getStats: getStats, state: CA, _version: "v2.1"
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

  LOG("conflict-areas.js v2.1 geladen");
})();