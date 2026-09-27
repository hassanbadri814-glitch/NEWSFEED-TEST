/* ============================================================
   WAR DESK — conflict-areas.js v3.1
   ------------------------------------------------------------
   - v3.1: Eigen point-in-polygon + centroid (geen turf.js meer)
   - v3.0: DeepStateMap primair + ISW fallback
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

  var ISW_URL = "https://services5.arcgis.com/SaBe5HMtmnbqSWlu/ArcGIS/rest/services/VIEW_RussiaCoTinUkraine_V3/FeatureServer/49/query?where=1%3D1&outFields=*&f=geojson";

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  var CACHE_KEY = "wardesk_ukraine_oblasts";
  var CACHE_KEY_DS = "wardesk_deepstate_geo";
  var CACHE_KEY_ISW = "wardesk_isw_geo";
  var CACHE_VERSION = "v8";
  var CACHE_VERSION_DS = "v4";
  var CACHE_VERSION_ISW = "v2";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  var ISW_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";
  var PANE_NAME = "conflictAreasPane";
  var PANE_Z = 420;

  var COLORS = {
    russiaFill:    "#C62828",
    ukraineFill:   "#2A6FDB",
    russiaBorder:  "rgba(180,40,40,0.55)",
    ukraineBorder: "rgba(50,110,200,0.55)",
    neutralBorder: "rgba(255,255,255,0.10)"
  };

  var FILL_OPACITY = 0.45;
  var BORDER_WEIGHT = 0.6;

  var CA = {
    map: null, layer: null, geojson: null, areas: [],
    deepStateGeo: null, iswGeo: null,
    isLoaded: false, isInitialized: false,
    stats: { total: 0, russia: 0, ukraine: 0, unknown: 0 }
  };

  var db = null;

  /* ============================================================
     GEO HELPERS — eigen implementatie, geen turf.js nodig
     ============================================================ */

  /* Ray-casting: is [lng,lat] binnen de ring? */
  function pointInRing(x, y, ring){
    var inside = false;
    var len = ring.length;
    for(var i = 0, j = len - 1; i < len; j = i++){
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  /* Test punt tegen Polygon (met holes) of MultiPolygon */
  function pointInGeometry(x, y, geometry){
    if(!geometry) return false;
    var type = geometry.type;

    if(type === "Polygon"){
      var rings = geometry.coordinates;
      if(!rings || !rings.length) return false;
      if(!pointInRing(x, y, rings[0])) return false;
      for(var h = 1; h < rings.length; h++){
        if(pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }

    if(type === "MultiPolygon"){
      var polys = geometry.coordinates;
      if(!polys || !polys.length) return false;
      for(var p = 0; p < polys.length; p++){
        var rings2 = polys[p];
        if(!rings2 || !rings2.length) continue;
        if(!pointInRing(x, y, rings2[0])) continue;
        var inHole = false;
        for(var h2 = 1; h2 < rings2.length; h2++){
          if(pointInRing(x, y, rings2[h2])){ inHole = true; break; }
        }
        if(!inHole) return true;
      }
      return false;
    }

    return false;
  }

  /* Test of een Feature (Polygon of MultiPolygon) een punt bevat */
  function featureContainsPoint(feature, x, y){
    if(!feature || !feature.geometry) return false;
    return pointInGeometry(x, y, feature.geometry);
  }

  /* Bepaal centroïde van een Feature — gebruikt shoelace formula */
  function getCentroid(feature){
    if(!feature || !feature.geometry) return null;
    var geom = feature.geometry;
    var outerRing = null;

    if(geom.type === "Polygon"){
      outerRing = geom.coordinates[0];
    } else if(geom.type === "MultiPolygon"){
      /* Kies het grootste polygoon (meeste punten) */
      var largest = null, largestSize = 0;
      for(var i = 0; i < geom.coordinates.length; i++){
        var ring = geom.coordinates[i][0];
        if(ring && ring.length > largestSize){
          largestSize = ring.length;
          largest = ring;
        }
      }
      outerRing = largest;
    }

    if(!outerRing || outerRing.length < 3) return null;

    /* Shoelace formula voor centroïde */
    var area = 0, cx = 0, cy = 0;
    for(var j = 0; j < outerRing.length - 1; j++){
      var x0 = outerRing[j][0], y0 = outerRing[j][1];
      var x1 = outerRing[j+1][0], y1 = outerRing[j+1][1];
      var cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area = area / 2;

    if(Math.abs(area) < 1e-12){
      /* Fallback: bounding box center */
      return getBBoxCenter(outerRing);
    }

    cx = cx / (6 * area);
    cy = cy / (6 * area);

    /* Verifieer dat centroïde ook daadwerkelijk in polygoon ligt
       (kan bij concave vormen buiten het polygoon vallen) */
    if(!pointInRing(cx, cy, outerRing)){
      return getBBoxCenter(outerRing);
    }

    return [cx, cy];
  }

  function getBBoxCenter(ring){
    var minX = ring[0][0], maxX = ring[0][0];
    var minY = ring[0][1], maxY = ring[0][1];
    for(var i = 1; i < ring.length; i++){
      if(ring[i][0] < minX) minX = ring[i][0];
      if(ring[i][0] > maxX) maxX = ring[i][0];
      if(ring[i][1] < minY) minY = ring[i][1];
      if(ring[i][1] > maxY) maxY = ring[i][1];
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

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
    return json && json.features && Array.isArray(json.features) && json.features.length > 0;
  }

  /* ============================================================
     Fetch helpers
     ============================================================ */
  function parseJsonText(text){
    var trimmed = String(text).replace(/^\uFEFF/, "").replace(/^\s+/, "");
    if(trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "["){
      throw new Error("Geen JSON response");
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
     Oblast laden
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
      LOG("Oblasten bron " + (idx+1) + "/" + OBLAST_SOURCES.length);
      return fetchViaProxy(OBLAST_SOURCES[idx])
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
    return dbGet(CACHE_KEY).then(function(cached){
      if(cached && cached.v && cached.v.version === CACHE_VERSION &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        LOG("Oblasten uit cache (" + cached.v.geojson.features.length + ")");
        return cached.v.geojson;
      }
      LOG("Oblast-cache leeg — fetch externe bron");
      return fetchOblasts().then(function(json){
        return dbPut(CACHE_KEY, {
          version: CACHE_VERSION, t: Date.now(), geojson: json
        }).then(function(){ LOG("Oblasten opgeslagen"); return json; });
      });
    });
  }

  /* ============================================================
     DeepStateMap laden
     ============================================================ */
  function getDeepStateUrl(){
    var now = new Date();
    /* Vóór 04:00 UTC → gebruik gisteren */
    if(now.getUTCHours() < 4){
      now.setUTCDate(now.getUTCDate() - 1);
    }
    var y = now.getUTCFullYear();
    var m = String(now.getUTCMonth() + 1).padStart(2, "0");
    var d = String(now.getUTCDate()).padStart(2, "0");
    return "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_" + y + m + d + ".geojson";
  }

  function extractDeepStateGeometry(json){
    if(!json) return null;
    if(json.type === "FeatureCollection" && json.features){
      var best = null, bestArea = 0;
      json.features.forEach(function(f){
        if(!f.geometry) return;
        var area = 0;
        if(f.geometry.type === "Polygon") area = f.geometry.coordinates.length;
        else if(f.geometry.type === "MultiPolygon"){
          f.geometry.coordinates.forEach(function(poly){ area += poly.length; });
        }
        if(area > bestArea){ bestArea = area; best = f; }
      });
      return best;
    }
    if(json.type === "Feature" && json.geometry) return json;
    return null;
  }

  function fetchDeepState(){
    var url = getDeepStateUrl();
    LOG("DeepState URL: ..." + url.slice(-30));
    return fetchRaw(url, 20000)
      .then(function(json){
        var feat = extractDeepStateGeometry(json);
        if(!feat) throw new Error("Geen polygoon in DeepState data");
        LOG("  ✓ DeepState geladen");
        return feat;
      })
      .catch(function(e){
        LOG("  DeepState faalde: " + e.message);
        throw e;
      });
  }

  function loadDeepState(){
    return dbGet(CACHE_KEY_DS).then(function(cached){
      if(cached && cached.v && cached.v.version === CACHE_VERSION_DS &&
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS &&
         cached.v.geojson){
        LOG("DeepState uit cache");
        return cached.v.geojson;
      }
      LOG("DeepState cache leeg — fetch externe bron");
      return fetchDeepState().then(function(feat){
        return dbPut(CACHE_KEY_DS, {
          version: CACHE_VERSION_DS, t: Date.now(), geojson: feat
        }).then(function(){ LOG("DeepState opgeslagen"); return feat; });
      }).catch(function(e){
        LOG("DeepState laden faalde: " + e.message);
        return null;
      });
    });
  }

  /* ============================================================
     ISW laden (fallback)
     ============================================================ */
  function fetchISW(){
    LOG("ISW fallback — fetch ArcGIS");
    return fetchViaProxy(ISW_URL)
      .then(function(json){
        if(!isValidGeoJSON(json)) throw new Error("Ongeldige ISW GeoJSON");
        LOG("  ✓ ISW geladen (" + json.features.length + " features)");
        return json;
      })
      .catch(function(e){
        LOG("  ISW faalde: " + e.message);
        throw e;
      });
  }

  function loadISW(){
    return dbGet(CACHE_KEY_ISW).then(function(cached){
      if(cached && cached.v && cached.v.version === CACHE_VERSION_ISW &&
         (Date.now() - cached.v.t) < ISW_CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        LOG("ISW uit cache");
        return cached.v.geojson;
      }
      return fetchISW().then(function(json){
        return dbPut(CACHE_KEY_ISW, {
          version: CACHE_VERSION_ISW, t: Date.now(), geojson: json
        }).then(function(){ LOG("ISW opgeslagen"); return json; });
      }).catch(function(e){
        LOG("ISW laden faalde: " + e.message);
        return null;
      });
    });
  }

  /* ============================================================
     Controller berekening
     ============================================================ */
  function calculateControllers(){
    if(!CA.geojson || !CA.geojson.features) return;

    var hasDS = !!CA.deepStateGeo;
    var hasISW = !!CA.iswGeo && CA.iswGeo.features && CA.iswGeo.features.length > 0;

    LOG("Controller berekening — DeepState: " + hasDS + ", ISW: " + hasISW);

    var stats = { total: 0, russia: 0, ukraine: 0, unknown: 0 };
    var dsCount = 0, iswCount = 0;

    CA.geojson.features.forEach(function(feature){
      if(!feature || !feature.properties) return;
      stats.total++;
      var props = feature.properties;

      var centroid = getCentroid(feature);
      if(!centroid){
        props.controller = "Onbekend";
        stats.unknown++;
        return;
      }

      var cx = centroid[0], cy = centroid[1];
      var inOccupied = false;
      var source = null;

      /* DeepState eerst */
      if(hasDS){
        try {
          if(featureContainsPoint(CA.deepStateGeo, cx, cy)){
            inOccupied = true;
            source = "DeepState";
            dsCount++;
          }
        } catch(e){}
      }

      /* ISW als DeepState geen hit gaf */
      if(!inOccupied && hasISW){
        for(var i = 0; i < CA.iswGeo.features.length; i++){
          if(featureContainsPoint(CA.iswGeo.features[i], cx, cy)){
            inOccupied = true;
            source = "ISW";
            iswCount++;
            break;
          }
        }
      }

      var controller = inOccupied ? "Rusland" : "Oekraïne";
      props.controller = controller;
      props.control_source = source;
      props.control_confidence = 0.7;
      props.last_update = new Date().toISOString();

      if(controller === "Rusland") stats.russia++;
      else stats.ukraine++;
    });

    CA.stats = stats;
    LOG("Controllers: " + stats.total + " oblasten | Rusland: " + stats.russia +
        " (DS: " + dsCount + ", ISW: " + iswCount + ") | Oekraïne: " + stats.ukraine);
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
    if(CA.layer){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }

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
          controller: l.feature.properties.controller,
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
      .then(function(){ return loadOblasts(); })
      .then(function(oblastsJson){
        CA.geojson = oblastsJson;
        return Promise.all([loadDeepState(), loadISW()]).then(function(res){
          CA.deepStateGeo = res[0];
          CA.iswGeo = res[1];
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
    LOG("Refresh — DeepState + ISW opnieuw ophalen");
    return Promise.all([
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_ISW, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){
      return Promise.all([loadDeepState(), loadISW()]);
    }).then(function(res){
      CA.deepStateGeo = res[0];
      CA.iswGeo = res[1];
      calculateControllers();
      renderLayer();
      return true;
    });
  }

  function clearCache(){
    return Promise.all([
      dbPut(CACHE_KEY, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_ISW, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){ LOG("Caches gewist"); return true; });
  }

  function destroy(){
    if(CA.layer && CA.map){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }
    CA.layer = null; CA.isInitialized = false; CA.isLoaded = false;
  }

  function getStats(){ return CA.stats; }

  window.ConflictAreas = {
    init: init, refresh: refresh, destroy: destroy, clearCache: clearCache,
    getStats: getStats, state: CA, _version: "v3.1"
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

  LOG("conflict-areas.js v3.1 geladen (eigen geo-implementatie)");
})();