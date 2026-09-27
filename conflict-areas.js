/* ============================================================
   WAR DESK — conflict-areas.js v2.0
   ------------------------------------------------------------
   FASE 2: Controller-kleuring (rood/blauw) op basis van DeepState
   - v2.0: DeepState fetcher + turf.js centroid + point-in-polygon
   - v1.3: proxy-first fetch + GADM oblasten
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  /* ============================================================
     BRONNEN
     ============================================================ */
  var OBLAST_SOURCES = [
    "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
    "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json"
  ];

  /* DeepState bezette gebieden — meerdere mirrors */
  var DEEPSTATE_SOURCES = [
    "https://deepstatemap.live/api/history/last",
    "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/deepstate-map-data.geojson",
    "https://raw.githubusercontent.com/Andkto/ukraine-war-map/main/deepstate.geojson",
    "https://raw.githubusercontent.com/cyterat/DeepStateMap-Data/main/data.geojson"
  ];

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  /* Fallback: hardcoded lijst van bezette oblasten (september 2025)
     Substrings, case-insensitive match tegen oblast-naam */
  var FALLBACK_OCCUPIED = [
    "luhan",     /* Luhanska — vrijwel volledig bezet */
    "donets",    /* Donetska — grotendeels bezet */
    "zaporiz",   /* Zaporizka — deels bezet */
    "kherson",   /* Khersonska — deels bezet */
    "krym",      /* Krim — volledig bezet */
    "crimea",    /* Engelse naam Krim */
    "sevastopol" /* Sebastopol — volledig bezet */
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_KEY_DS = "wardesk_deepstate_geo";
  var CACHE_VERSION = "v5";
  var CACHE_VERSION_DS = "v1";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; /* 24 uur */

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420;

  /* Kleuren */
  var COLORS = {
    russia:   "#8B0000",   /* diep robijnrood */
    ukraine:  "#1E3A8A",   /* diep koningsblauw */
    border:   "#e0a857",   /* amber */
    unknown:  "transparent"
  };

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

  /* ============================================================
     Cache helpers
     ============================================================ */
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
      idx++;
      return fetchRaw(fullUrl, 30000).catch(function(e){
        return tryNext();
      });
    }
    return tryNext();
  }

  /* ============================================================
     Oblasten laden (GADM)
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
     DeepState laden
     ============================================================ */
  function extractDeepStateGeometry(json){
    /* DeepState API kan verschillende formaten teruggeven:
       - FeatureCollection met 1 multipolygon
       - Array met wijzigingen (dan is de geometry per item)
       We proberen beide. */
    if(!json) return null;

    /* Formaat 1: FeatureCollection */
    if(json.type === "FeatureCollection" && json.features){
      /* Zoek het grootste multipolygon */
      var best = null, bestArea = 0;
      json.features.forEach(function(f){
        if(!f.geometry) return;
        var area = 0;
        if(f.geometry.type === "Polygon"){
          area = f.geometry.coordinates.length;
        } else if(f.geometry.type === "MultiPolygon"){
          area = f.geometry.coordinates.length;
          f.geometry.coordinates.forEach(function(poly){
            area += poly.length;
          });
        }
        if(area > bestArea){ bestArea = area; best = f; }
      });
      if(best) return best;
    }

    /* Formaat 2: Array met items */
    if(Array.isArray(json) && json.length){
      var polys = [];
      json.forEach(function(item){
        if(!item) return;
        /* Soms is het {geometry: {...}} */
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
          LOG("  ✓ DeepState polygoon geladen");
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
        LOG("DeepState laden faalde volledig: " + e.message);
        return null; /* Fallback wordt gebruikt */
      });
    });
  }

  /* ============================================================
     Controller berekening
     ============================================================ */
  function checkFallbackOccupied(oblastName){
    var lname = String(oblastName || "").toLowerCase();
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
          if(inOccupied){
            controller = "Rusland";
            stats.russia++;
          } else {
            controller = "Oekraïne";
            stats.ukraine++;
          }
        } catch(e){
          /* Fallback bij turf-fout */
          if(checkFallbackOccupied(props.name)){
            controller = "Rusland";
            stats.russia++;
          } else {
            controller = "Oekraïne";
            stats.ukraine++;
          }
        }
      } else {
        /* Geen DeepState of turf — gebruik hardcoded fallback */
        if(checkFallbackOccupied(props.name)){
          controller = "Rusland";
          stats.russia++;
        } else {
          controller = "Oekraïne";
          stats.ukraine++;
        }
      }

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
  function getFillColor(controller){
    if(controller === "Rusland") return COLORS.russia;
    if(controller === "Oekraïne") return COLORS.ukraine;
    return COLORS.unknown;
  }

  function styleArea(feature){
    var props = (feature && feature.properties) || {};
    var controller = props.controller;
    var fillColor = getFillColor(controller);
    var fillOpacity = controller ? 0.35 : 0;
    return {
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      color: COLORS.border,
      weight: 1.3,
      opacity: 0.7,
      dashArray: null,
      interactive: false
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

    /* Verwijder bestaande layer */
    if(CA.layer){
      try{ CA.map.removeLayer(CA.layer); }catch(e){}
    }

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
    if(!window.turf){
      LOG("WAARSCHUWING: turf.js niet geladen — fallback modus");
    }

    CA.map = mapInstance;
    LOG("Init gestart");

    return openDB()
      .then(function(){ return loadOblasts(); })
      .then(function(oblastsJson){
        CA.geojson = oblastsJson;
        /* DeepState ophalen (optioneel — mag falen) */
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
    /* Wis DeepState cache om nieuwe data te forceren */
    return dbPut(CACHE_KEY_DS, {
      version: CACHE_VERSION_DS + "-expired", t: 0, geojson: null
    }).then(function(){
      return loadDeepState();
    }).then(function(dsFeat){
      CA.deepStateGeo = dsFeat;
      calculateControllers();
      renderLayer();
      LOG("Refresh klaar — " + CA.stats.russia + " rood, " + CA.stats.ukraine + " blauw");
      return true;
    });
  }

  function clearCache(){
    return Promise.all([
      dbPut(CACHE_KEY, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){
      LOG("Alle caches gewist");
      return true;
    });
  }

  function destroy(){
    if(CA.layer && CA.map){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }
    CA.layer = null; CA.isInitialized = false; CA.isLoaded = false;
  }

  function getStats(){
    return CA.stats;
  }

  window.ConflictAreas = {
    init: init, refresh: refresh, destroy: destroy, clearCache: clearCache,
    getStats: getStats,
    state: CA,
    _version: "v2.0"
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

  LOG("conflict-areas.js v2.0 geladen — wacht op map init");
})();