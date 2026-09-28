/* ============================================================
   WAR DESK — conflict-areas.js v9.2
   ------------------------------------------------------------
   - v9.2: ISRAËL (rood) + PALESTINA (blauw) toegevoegd
   - v9.1.1: SAU fix (ArRiyad, Jizan)
   - v9.0: 5 landen
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var CONFLICTS = {
    "UKR": {
      name: "Oekraïne",
      paneName: "conflictAreasPaneUKR",
      paneZ: 420,
      level: "ADM1",
      parties: {
        "Rusland":  { color: "#C62828", fill: "#C62828" },
        "Oekraïne": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json"
      ],
      iswUrl: "https://services5.arcgis.com/SaBe5HMtmnbqSWlu/ArcGIS/rest/services/VIEW_RussiaCoTinUkraine_V3/FeatureServer/49/query?where=1%3D1&outFields=*&f=geojson",
      deepStateUrlFn: function(){
        var now = new Date();
        if(now.getUTCHours() < 4){ now.setUTCDate(now.getUTCDate() - 1); }
        var y = now.getUTCFullYear();
        var m = String(now.getUTCMonth() + 1).padStart(2, "0");
        var d = String(now.getUTCDate()).padStart(2, "0");
        return "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_" + y + m + d + ".geojson";
      },
      provinceRules: null,
      districtOverrides: null,
      overlayPolygons: null,
      cacheKeys: {
        oblasts:   { key: "wardesk_ukraine_oblasts", version: "v11" },
        deepState: { key: "wardesk_deepstate_geo",   version: "v7"  },
        isw:       { key: "wardesk_isw_geo",         version: "v5"  },
        snapshot:  { key: "wardesk_ukraine_snapshot",version: "v1"  }
      }
    },

    "SYR": {
      name: "Syrië",
      paneName: "conflictAreasPaneSYR",
      paneZ: 421,
      level: "ADM2",
      parties: {
        "Regering":  { color: "#2A6FDB", fill: "#2A6FDB" },
        "Druze":     { color: "#C62828", fill: "#C62828" },
        "Israël":    { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SYR_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SYR_2.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["aleppo"],                                            controller: "Regering" },
        { match: ["alhasakah", "hasakah"],                              controller: "Regering" },
        { match: ["arraqqah", "raqqah"],                                controller: "Regering" },
        { match: ["assuwayda", "suwayda"],                              controller: "Druze" },
        { match: ["damascus"],                                          controller: "Regering" },
        { match: ["dara"],                                              controller: "Regering" },
        { match: ["dayrazzawr", "deirez"],                              controller: "Regering" },
        { match: ["hamah", "hama"],                                     controller: "Regering" },
        { match: ["hims", "homs"],                                      controller: "Regering" },
        { match: ["idlib"],                                             controller: "Regering" },
        { match: ["lattakia", "latakia"],                               controller: "Regering" },
        { match: ["quneitra"],                                          controller: "Regering" },
        { match: ["rifdimashq", "dimashq"],                             controller: "Regering" },
        { match: ["tartus"],                                            controller: "Regering" }
      ],
      districtOverrides: [],
      overlayPolygons: [
        {
          name: "Israëlische zone (UNDOF)",
          controller: "Israël",
          coords: [
            [33.3200, 35.8050], [33.2900, 35.8150], [33.2600, 35.8250],
            [33.2300, 35.8300], [33.2000, 35.8400], [33.1700, 35.8450],
            [33.1400, 35.8500], [33.1100, 35.8600], [33.0800, 35.8650],
            [33.0500, 35.8700], [33.0200, 35.8700], [32.9900, 35.8600],
            [32.9600, 35.8500], [32.9300, 35.8400], [32.9000, 35.8300],
            [32.8700, 35.8200], [32.8400, 35.8100], [32.8100, 35.8000],
            [32.7800, 35.7900], [32.7550, 35.7770],
            [32.7700, 35.9000], [32.8000, 35.9200], [32.8300, 35.9350],
            [32.8600, 35.9450], [32.8900, 35.9550], [32.9200, 35.9600],
            [32.9500, 35.9700], [32.9800, 35.9750], [33.0100, 35.9800],
            [33.0400, 35.9800], [33.0700, 35.9750], [33.1000, 35.9650],
            [33.1300, 35.9550], [33.1600, 35.9450], [33.1900, 35.9400],
            [33.2200, 35.9350], [33.2500, 35.9300], [33.2800, 35.9250],
            [33.3100, 35.9200], [33.3300, 35.8800]
          ]
        }
      ],
      cacheKeys: {
        oblasts:   { key: "wardesk_syria_adm2",      version: "v4" },
        deepState: { key: "wardesk_syria_ds",        version: "v1" },
        isw:       { key: "wardesk_syria_isw",       version: "v1" },
        snapshot:  { key: "wardesk_syria_snapshot",  version: "v1" }
      }
    },

    "LBN": {
      name: "Libanon",
      paneName: "conflictAreasPaneLBN",
      paneZ: 422,
      level: "ADM2",
      parties: {
        "Libanese staat": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Hezbollah":      { color: "#FBC02D", fill: "#FBC02D" },
        "Israël":         { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_LBN_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_LBN_2.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["akkar"],                          controller: "Libanese staat" },
        { match: ["beirut"],                         controller: "Libanese staat" },
        { match: ["mountlebanon"],                   controller: "Libanese staat" },
        { match: ["north"],                          controller: "Libanese staat" },
        { match: ["baalbak", "hermel"],              controller: "Hezbollah" },
        { match: ["bekaa"],                          controller: "Hezbollah" },
        { match: ["nabatiyeh"],                      controller: "Hezbollah" },
        { match: ["south"],                          controller: "Hezbollah" }
      ],
      districtOverrides: [],
      overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_lebanon_adm2",      version: "v2" },
        deepState: { key: "wardesk_lebanon_ds",        version: "v1" },
        isw:       { key: "wardesk_lebanon_isw",       version: "v1" },
        snapshot:  { key: "wardesk_lebanon_snapshot",  version: "v1" }
      }
    },

    "YEM": {
      name: "Jemen",
      paneName: "conflictAreasPaneYEM",
      paneZ: 423,
      level: "ADM1",
      parties: {
        "Regering":  { color: "#2A6FDB", fill: "#2A6FDB" },
        "Houthi's":  { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_YEM_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_YEM_1.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["sa'dah", "sadah"],         controller: "Houthi's" },
        { match: ["san'a'", "sanaa"],         controller: "Houthi's" },
        { match: ["amanatalasimah", "sana"],  controller: "Houthi's" },
        { match: ["amran"],                   controller: "Houthi's" },
        { match: ["dhamar"],                  controller: "Houthi's" },
        { match: ["almahwit"],                controller: "Houthi's" },
        { match: ["raymah"],                  controller: "Houthi's" },
        { match: ["alhaduyadah", "hodeidah"], controller: "Houthi's" },
        { match: ["hajjah"],                  controller: "Houthi's" },
        { match: ["ibb"],                     controller: "Houthi's" },
        { match: ["ta'izz", "taizz"],         controller: "Houthi's" },
        { match: ["albayda"],                 controller: "Houthi's" },
        { match: ["ma'rib", "marib"],         controller: "Houthi's" },
        { match: ["aljawf"],                  controller: "Houthi's" },
        { match: ["aldali", "dhale"],         controller: "Houthi's" },
        { match: ["'adan", "adan", "aden"],   controller: "Regering" },
        { match: ["abyan"],                   controller: "Regering" },
        { match: ["lahij"],                   controller: "Regering" },
        { match: ["shabwah"],                 controller: "Regering" },
        { match: ["hadramawt"],               controller: "Regering" },
        { match: ["almahrah", "mahra"],       controller: "Regering" }
      ],
      districtOverrides: [],
      overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_yemen_adm1",      version: "v1" },
        deepState: { key: "wardesk_yemen_ds",        version: "v1" },
        isw:       { key: "wardesk_yemen_isw",       version: "v1" },
        snapshot:  { key: "wardesk_yemen_snapshot",  version: "v1" }
      }
    },

    "SAU": {
      name: "Saoedi-Arabië",
      paneName: "conflictAreasPaneSAU",
      paneZ: 424,
      level: "ADM1",
      parties: {
        "Saoedi-Arabië": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SAU_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SAU_1.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["asir"],                     controller: "Saoedi-Arabië" },
        { match: ["albahah"],                  controller: "Saoedi-Arabië" },
        { match: ["alhududashshamaliyah"],     controller: "Saoedi-Arabië" },
        { match: ["aljawf"],                   controller: "Saoedi-Arabië" },
        { match: ["almadinah"],                controller: "Saoedi-Arabië" },
        { match: ["alqassim"],                 controller: "Saoedi-Arabië" },
        { match: ["arriyad", "arriyadh"],      controller: "Saoedi-Arabië" },
        { match: ["ashsharqiyah"],             controller: "Saoedi-Arabië" },
        { match: ["ha'il", "hail"],            controller: "Saoedi-Arabië" },
        { match: ["jizan", "jazan"],           controller: "Saoedi-Arabië" },
        { match: ["makkah"],                   controller: "Saoedi-Arabië" },
        { match: ["najran"],                   controller: "Saoedi-Arabië" },
        { match: ["tabuk"],                    controller: "Saoedi-Arabië" }
      ],
      districtOverrides: [],
      overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_saudi_adm1",      version: "v1" },
        deepState: { key: "wardesk_saudi_ds",        version: "v1" },
        isw:       { key: "wardesk_saudi_isw",       version: "v1" },
        snapshot:  { key: "wardesk_saudi_snapshot",  version: "v1" }
      }
    },

    "ISR": {
      name: "Israël",
      paneName: "conflictAreasPaneISR",
      paneZ: 425,
      level: "ADM1",
      parties: {
        "Israël": { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ISR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ISR_1.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["golan"],                    controller: "Israël" },
        { match: ["hadarom"],                  controller: "Israël" },
        { match: ["haifa"],                    controller: "Israël" },
        { match: ["hamerkaz"],                 controller: "Israël" },
        { match: ["hazafon"],                  controller: "Israël" },
        { match: ["jerusalem"],                controller: "Israël" },
        { match: ["telaviv"],                  controller: "Israël" }
      ],
      districtOverrides: [],
      overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_israel_adm1",      version: "v1" },
        deepState: { key: "wardesk_israel_ds",        version: "v1" },
        isw:       { key: "wardesk_israel_isw",       version: "v1" },
        snapshot:  { key: "wardesk_israel_snapshot",  version: "v1" }
      }
    },

    "PSE": {
      name: "Palestina",
      paneName: "conflictAreasPanePSE",
      paneZ: 426,
      level: "ADM1",
      parties: {
        "Palestina": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PSE_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PSE_1.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      provinceRules: [
        { match: ["gaza"],                     controller: "Palestina" },
        { match: ["westbank"],                 controller: "Palestina" }
      ],
      districtOverrides: [],
      overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_palestine_adm1",   version: "v1" },
        deepState: { key: "wardesk_palestine_ds",     version: "v1" },
        isw:       { key: "wardesk_palestine_isw",    version: "v1" },
        snapshot:  { key: "wardesk_palestine_snapshot", version: "v1" }
      }
    }
  };

  var ACTIVE_CONFLICTS = ["UKR", "SYR", "LBN", "YEM", "SAU", "ISR", "PSE"];

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";

  var COLORS = {
    neutralBorder: "rgba(255,255,255,0.10)",
    pulse:         "rgba(255,90,90,0.95)",
    territoryGain: "#e0a857"
  };

  var FILL_OPACITY = 0.45;
  var OVERLAY_FILL_OPACITY = 0.55;
  var BORDER_WEIGHT = 0.6;
  var BORDER_WEIGHT_HOVER = 2.2;
  var OVERLAY_BORDER_WEIGHT = 1.5;

  var PULSE_INTERVAL_MS = 900;
  var PULSE_MIN_INTENSITY = 0.15;
  var PULSE_WEIGHT_MIN = 1.4;
  var PULSE_WEIGHT_MAX = 3.6;

  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var DS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  var ISW_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  var CA = {
    map: null,
    layers: {},
    overlayLayers: {},
    geojsons: {},
    areas: {},
    deepStateGeos: {},
    iswGeos: {},
    isLoaded: false,
    isInitialized: false,
    stats: {},
    panel: null,
    selectedId: null,
    pulseTimer: null,
    pulsePhase: 0,
    isMapActive: true,
    _snapshotSavedFor: {}
  };

  var db = null;
  var _initPromise = null;

  function getConflict(iso){ return CONFLICTS[iso] || null; }

  function normalize(str){
    return String(str || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function findProvinceRule(nameOrProvince, rules){
    if(!nameOrProvince || !rules || !rules.length) return null;
    var norm = normalize(nameOrProvince);
    if(!norm) return null;
    for(var i = 0; i < rules.length; i++){
      var entry = rules[i];
      if(!entry || !entry.match) continue;
      for(var j = 0; j < entry.match.length; j++){
        var needle = normalize(entry.match[j]);
        if(!needle) continue;
        if(norm.indexOf(needle) !== -1) return entry.controller;
      }
    }
    return null;
  }

  function findDistrictOverride(districtName, overrides){
    if(!districtName || !overrides || !overrides.length) return null;
    var norm = normalize(districtName);
    if(!norm) return null;
    for(var i = 0; i < overrides.length; i++){
      var entry = overrides[i];
      if(!entry || !entry.match) continue;
      for(var j = 0; j < entry.match.length; j++){
        var needle = normalize(entry.match[j]);
        if(!needle) continue;
        if(norm === needle) return entry.controller;
      }
    }
    return null;
  }

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

  function pointInGeometry(x, y, geometry){
    if(!geometry) return false;
    if(geometry.type === "Polygon"){
      var rings = geometry.coordinates;
      if(!rings || !rings.length) return false;
      if(!pointInRing(x, y, rings[0])) return false;
      for(var h = 1; h < rings.length; h++){
        if(pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }
    if(geometry.type === "MultiPolygon"){
      var polys = geometry.coordinates;
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

  function featureContainsPoint(feature, x, y){
    if(!feature || !feature.geometry) return false;
    return pointInGeometry(x, y, feature.geometry);
  }

  function getCentroid(feature){
    if(!feature || !feature.geometry) return null;
    var geom = feature.geometry;
    var outerRing = null;
    if(geom.type === "Polygon"){
      outerRing = geom.coordinates[0];
    } else if(geom.type === "MultiPolygon"){
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
    if(Math.abs(area) < 1e-12) return getBBoxCenter(outerRing);
    cx = cx / (6 * area);
    cy = cy / (6 * area);
    if(!pointInRing(cx, cy, outerRing)) return getBBoxCenter(outerRing);
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
      return fetchRaw(fullUrl, 50000).catch(function(){ return tryNext(); });
    }
    return tryNext();
  }

  function normalizeArea(json, level){
    json.features.forEach(function(f){
      if(!f || !f.properties) return;
      var p = f.properties;
      var name, provinceName, iso, id;
      if(level === "ADM2"){
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
        id: id, name: name, provinceName: provinceName, iso: iso,
        controller: null, control_confidence: 0, control_source: null,
        territory_gain: false, territory_gain_from: null,
        attack_intensity: 0, attack_count: 0, last_update: null
      };
    });
    return json;
  }

  function fetchOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.oblastSources) return Promise.reject(new Error("Geen bronnen"));
    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.oblastSources.length){
        return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      }
      LOG("[" + conflictIso + "] Bron " + (idx+1) + "/" + conflict.oblastSources.length);
      return fetchViaProxy(conflict.oblastSources[idx])
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
          return normalizeArea(json, conflict.level);
        })
        .then(function(json){
          LOG("[" + conflictIso + "]   ✓ " + json.features.length + " gebieden");
          return json;
        })
        .catch(function(e){
          LOG("[" + conflictIso + "]   bron " + (idx+1) + " faalde: " + e.message);
          lastErr = e;
          return trySource(idx+1);
        });
    }
    return trySource(0);
  }

  function loadOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict) return Promise.reject(new Error("Geen conflict"));
    var cacheKey = conflict.cacheKeys.oblasts.key;
    var cacheVer = conflict.cacheKeys.oblasts.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        LOG("[" + conflictIso + "] Gebieden uit cache (" + cached.v.geojson.features.length + ")");
        return cached.v.geojson;
      }
      LOG("[" + conflictIso + "] Cache leeg — fetch externe bron");
      return fetchOblasts(conflictIso).then(function(json){
        return dbPut(cacheKey, {
          version: cacheVer, t: Date.now(), geojson: json
        }).then(function(){ LOG("[" + conflictIso + "] Gebieden opgeslagen"); return json; });
      });
    });
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

  function loadDeepState(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.deepStateUrlFn) return Promise.resolve(null);
    var cacheKey = conflict.cacheKeys.deepState.key;
    var cacheVer = conflict.cacheKeys.deepState.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS && cached.v.geojson){
        LOG("[" + conflictIso + "] DeepState uit cache");
        return cached.v.geojson;
      }
      LOG("[" + conflictIso + "] DeepState cache leeg — fetch");
      var url = conflict.deepStateUrlFn();
      return fetchRaw(url, 20000)
        .then(function(json){
          var feat = extractDeepStateGeometry(json);
          if(!feat) throw new Error("Geen polygoon");
          LOG("[" + conflictIso + "]   ✓ DeepState geladen");
          return dbPut(cacheKey, {
            version: cacheVer, t: Date.now(), geojson: feat
          }).then(function(){ return feat; });
        })
        .catch(function(e){ LOG("[" + conflictIso + "] DeepState faalde: " + e.message); return null; });
    });
  }

  function loadISW(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.iswUrl) return Promise.resolve(null);
    var cacheKey = conflict.cacheKeys.isw.key;
    var cacheVer = conflict.cacheKeys.isw.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < ISW_CACHE_MAX_AGE_MS && isValidGeoJSON(cached.v.geojson)){
        LOG("[" + conflictIso + "] ISW uit cache");
        return cached.v.geojson;
      }
      LOG("[" + conflictIso + "] ISW fallback — fetch ArcGIS");
      return fetchViaProxy(conflict.iswUrl)
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige ISW GeoJSON");
          LOG("[" + conflictIso + "]   ✓ ISW geladen (" + json.features.length + ")");
          return dbPut(cacheKey, {
            version: cacheVer, t: Date.now(), geojson: json
          }).then(function(){ return json; });
        })
        .catch(function(e){ LOG("[" + conflictIso + "] ISW faalde: " + e.message); return null; });
    });
  }

  function calculateControllers(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;

    var hasDS = !!CA.deepStateGeos[conflictIso];
    var hasISW = !!CA.iswGeos[conflictIso] && CA.iswGeos[conflictIso].features && CA.iswGeos[conflictIso].features.length > 0;
    var hasInheritance = !!conflict.provinceRules;
    var isADM1 = conflict.level === "ADM1";

    LOG("[" + conflictIso + "] Controller berekening — DS: " + hasDS + ", ISW: " + hasISW + ", inheritance: " + hasInheritance + ", level: " + conflict.level);

    var stats = {};
    var partyNames = Object.keys(conflict.parties);
    partyNames.forEach(function(p){ stats[p] = 0; });
    stats.total = 0;
    stats.unknown = 0;

    var dsCount = 0, iswCount = 0, provinceCount = 0, districtOverrideCount = 0;
    var unmatched = [];

    geojson.features.forEach(function(feature){
      if(!feature || !feature.properties) return;
      stats.total++;
      var props = feature.properties;

      if(hasInheritance){
        var districtOverride = findDistrictOverride(props.name, conflict.districtOverrides);
        if(districtOverride){
          props.controller = districtOverride;
          props.control_confidence = 0.85;
          props.control_source = "Handmatig (district)";
          props.last_update = new Date().toISOString();
          if(stats[districtOverride] !== undefined) stats[districtOverride]++;
          districtOverrideCount++;
          return;
        }
        var matchTarget = isADM1 ? props.name : props.provinceName;
        var provinceRule = findProvinceRule(matchTarget, conflict.provinceRules);
        if(provinceRule){
          props.controller = provinceRule;
          props.control_confidence = 0.8;
          props.control_source = "Handmatig (provincie)";
          props.last_update = new Date().toISOString();
          if(stats[provinceRule] !== undefined) stats[provinceRule]++;
          provinceCount++;
          return;
        }
        props.controller = null;
        props.control_confidence = 0;
        props.control_source = "Onbekend";
        stats.unknown++;
        unmatched.push(props.name);
        return;
      }

      var centroid = getCentroid(feature);
      if(!centroid){ props.controller = null; stats.unknown++; return; }
      var cx = centroid[0], cy = centroid[1];
      var inOccupied = false;
      var source = null;
      if(hasDS){
        try {
          if(featureContainsPoint(CA.deepStateGeos[conflictIso], cx, cy)){
            inOccupied = true; source = "DeepState"; dsCount++;
          }
        } catch(e){}
      }
      if(!inOccupied && hasISW){
        for(var i = 0; i < CA.iswGeos[conflictIso].features.length; i++){
          if(featureContainsPoint(CA.iswGeos[conflictIso].features[i], cx, cy)){
            inOccupied = true; source = "ISW"; iswCount++;
            break;
          }
        }
      }
      var controller = inOccupied ? "Rusland" : "Oekraïne";
      props.controller = controller;
      props.control_confidence = 0.7;
      props.last_update = new Date().toISOString();
      if(controller === "Rusland"){
        props.control_source = source || "Onbekend";
      } else {
        props.control_source = hasDS ? "DeepState" : (hasISW ? "ISW" : "Onbekend");
      }
      if(stats[controller] !== undefined) stats[controller]++;
    });

    CA.stats[conflictIso] = stats;
    var summary = partyNames.map(function(p){ return p + ": " + (stats[p] || 0); }).join(" | ");
    LOG("[" + conflictIso + "] Controllers: " + stats.total + " gebieden | " + summary +
        " | onbekend: " + stats.unknown +
        " (auto: DS " + dsCount + ", ISW " + iswCount +
        ", province: " + provinceCount + ", district: " + districtOverrideCount + ")");

    if(unmatched.length){
      LOG("[" + conflictIso + "] ⚠️ Onbekend: " + unmatched.join(" | "));
    }
  }

  function calculateAttackIntensity(conflictIso){
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;
    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){}
    if(!events.length) return;

    geojson.features.forEach(function(f){
      if(f.properties){ f.properties.attack_intensity = 0; f.properties.attack_count = 0; }
    });

    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var countByArea = {};

    events.forEach(function(ev){
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      if(ev.category !== "militair" && ev.category !== "crime") return;
      if(ev.countsForHeat === false) return;
      if(new Date(ev.date).getTime() < periodAgo) return;
      for(var i = 0; i < geojson.features.length; i++){
        var f = geojson.features[i];
        if(featureContainsPoint(f, ev.lng, ev.lat)){
          var id = f.properties.id;
          countByArea[id] = (countByArea[id] || 0) + 1;
          break;
        }
      }
    });

    var activeAreas = 0, totalEvents = 0;
    geojson.features.forEach(function(f){
      if(!f.properties) return;
      var count = countByArea[f.properties.id] || 0;
      if(count > 0){ activeAreas++; totalEvents += count; }
      var intensity = Math.min(1, Math.log(1 + count) / Math.log(21));
      f.properties.attack_intensity = Math.round(intensity * 100) / 100;
      f.properties.attack_count = count;
    });
    if(totalEvents > 0){
      LOG("[" + conflictIso + "] Attack intensity: " + totalEvents + " events in " + activeAreas + " gebieden");
    }
  }

  function hasActiveAreas(){
    for(var c = 0; c < ACTIVE_CONFLICTS.length; c++){
      var geojson = CA.geojsons[ACTIVE_CONFLICTS[c]];
      if(!geojson || !geojson.features) continue;
      for(var i = 0; i < geojson.features.length; i++){
        var p = geojson.features[i].properties;
        if(p && p.attack_intensity >= PULSE_MIN_INTENSITY) return true;
      }
    }
    return false;
  }

  function styleAreaFor(conflictIso){
    return function(feature){
      var props = (feature && feature.properties) || {};
      var conflict = getConflict(conflictIso);
      var fillColor = "transparent";
      var borderColor = COLORS.neutralBorder;
      if(props.controller && conflict.parties[props.controller]){
        fillColor = conflict.parties[props.controller].fill;
        borderColor = conflict.parties[props.controller].color;
      }
      var borderWeight = BORDER_WEIGHT;
      if(props.territory_gain){
        borderColor = COLORS.territoryGain;
        borderWeight = 2.4;
      }
      return {
        fillColor: fillColor,
        fillOpacity: props.controller ? FILL_OPACITY : 0,
        color: borderColor,
        weight: borderWeight,
        opacity: props.territory_gain ? 0.95 : 0.7,
        dashArray: null,
        interactive: true,
        lineCap: "round",
        lineJoin: "round"
      };
    };
  }

  function renderOverlayPolygons(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.overlayPolygons || !conflict.overlayPolygons.length) return;
    if(!CA.map) return;

    if(CA.overlayLayers[conflictIso]){
      try{ CA.map.removeLayer(CA.overlayLayers[conflictIso]); }catch(e){}
    }

    var overlayGroup = L.layerGroup();

    conflict.overlayPolygons.forEach(function(overlay){
      var party = conflict.parties[overlay.controller];
      if(!party) return;

      var poly = L.polygon(overlay.coords, {
        pane: conflict.paneName,
        color: party.color,
        fillColor: party.fill,
        fillOpacity: OVERLAY_FILL_OPACITY,
        weight: OVERLAY_BORDER_WEIGHT,
        opacity: 0.9,
        interactive: true,
        lineCap: "round",
        lineJoin: "round"
      });

      poly.bindTooltip(
        '<b>' + overlay.name + '</b><br>' + overlay.controller,
        { direction: "top", className: "wm-tooltip", offset: [0, -6] }
      );

      poly.on("click", function(e){
        if(L.DomEvent) L.DomEvent.stopPropagation(e);
        var syntheticArea = {
          id: "overlay-" + conflictIso,
          name: overlay.name,
          provinceName: null,
          controller: overlay.controller,
          layer: poly,
          feature: {
            properties: {
              id: "overlay-" + conflictIso,
              name: overlay.name,
              provinceName: null,
              controller: overlay.controller,
              control_confidence: 0.9,
              control_source: "Handmatig (overlay)",
              attack_intensity: 0,
              attack_count: 0
            },
            geometry: { type: "Polygon", coordinates: [overlay.coords] }
          }
        };
        openPanel(syntheticArea, conflictIso);
      });

      overlayGroup.addLayer(poly);
    });

    overlayGroup.addTo(CA.map);
    CA.overlayLayers[conflictIso] = overlayGroup;
    LOG("[" + conflictIso + "] Overlay-polygonen gerenderd: " + conflict.overlayPolygons.length);
  }

  var _pulseRetryTimer = null;
  var _pulseEmptyChecks = 0;
  var _pulseGraceMax = 3;

  function startPulse(){
    stopPulse();
    if(!CA.isMapActive) return;
    if(!hasActiveAreas()){
      _pulseEmptyChecks++;
      if(_pulseEmptyChecks < _pulseGraceMax){
        _pulseRetryTimer = setTimeout(function(){
          _pulseRetryTimer = null;
          if(CA.isMapActive && CA.isInitialized) startPulse();
        }, 5000);
      } else {
        LOG("Geen actieve gebieden — pulse over 30s");
        _pulseRetryTimer = setTimeout(function(){
          _pulseRetryTimer = null;
          _pulseEmptyChecks = 0;
          if(CA.isMapActive && CA.isInitialized) startPulse();
        }, 30000);
      }
      return;
    }
    _pulseEmptyChecks = 0;
    CA.pulseTimer = setInterval(function(){
      if(!CA.isMapActive) return;
      CA.pulsePhase = (CA.pulsePhase + 1) % 2;
      var growing = CA.pulsePhase === 0;
      ACTIVE_CONFLICTS.forEach(function(iso){
        var layer = CA.layers[iso];
        if(!layer) return;
        layer.eachLayer(function(l){
          if(!l.feature || !l.feature.properties) return;
          var p = l.feature.properties;
          if(!p.attack_intensity || p.attack_intensity < PULSE_MIN_INTENSITY) return;
          if(l._caHover) return;
          var baseWeight = p.territory_gain ? 2.4 : BORDER_WEIGHT;
          var extra = (PULSE_WEIGHT_MAX - PULSE_WEIGHT_MIN) * p.attack_intensity;
          var newWeight = growing ? (baseWeight + extra) : baseWeight;
          var newOpacity = growing ? 0.95 : 0.7;
          try {
            l.setStyle({
              weight: newWeight,
              opacity: newOpacity,
              color: p.territory_gain ? COLORS.territoryGain : COLORS.pulse,
              fillOpacity: Math.min(0.65, FILL_OPACITY + (growing ? 0.08 * p.attack_intensity : 0))
            });
          } catch(e){}
        });
      });
    }, PULSE_INTERVAL_MS);
    LOG("Pulse animatie gestart (" + PULSE_INTERVAL_MS + "ms)");
  }

  function stopPulse(){
    if(CA.pulseTimer){ clearInterval(CA.pulseTimer); CA.pulseTimer = null; }
    if(_pulseRetryTimer){ clearTimeout(_pulseRetryTimer); _pulseRetryTimer = null; }
  }

  function ensurePanel(){
    if(CA.panel) return CA.panel;
    var panel = document.createElement("div");
    panel.id = "caAreaPanel";
    panel.className = "wm-country-panel";
    panel.innerHTML =
      '<div class="wm-panel-head">' +
        '<div class="wm-panel-title" id="caPanelTitle">—</div>' +
        '<button class="wm-panel-close" id="caPanelClose" aria-label="Sluiten">✕</button>' +
      '</div>' +
      '<div class="wm-panel-stats" id="caPanelStats"></div>' +
      '<div class="wm-panel-events" id="caPanelEvents"></div>';
    document.body.appendChild(panel);
    CA.panel = panel;
    panel.querySelector("#caPanelClose").addEventListener("click", closePanel);
    panel.addEventListener("click", function(e){ if(e.target === panel) closePanel(); });
    return panel;
  }

  function getEventsForArea(area){
    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){}
    if(!events.length) return [];
    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var filtered = [];
    for(var i = 0; i < events.length; i++){
      var ev = events[i];
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") continue;
      if(ev.category !== "militair" && ev.category !== "crime") continue;
      if(new Date(ev.date).getTime() < periodAgo) continue;
      if(featureContainsPoint(area.feature, ev.lng, ev.lat)) filtered.push(ev);
    }
    filtered.sort(function(a, b){ return new Date(b.date).getTime() - new Date(a.date).getTime(); });
    return filtered.slice(0, 15);
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function timeAgoShort(d){
    var t = new Date(d).getTime();
    if(isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if(diff < 60) return "nu";
    if(diff < 3600) return Math.floor(diff / 60) + "m";
    if(diff < 86400) return Math.floor(diff / 3600) + "u";
    return Math.floor(diff / 86400) + "d";
  }

  function openPanel(area, conflictIso){
    var panel = ensurePanel();
    var props = area.feature.properties;
    panel.querySelector("#caPanelTitle").textContent = props.name || "?";

    var statsEl = panel.querySelector("#caPanelStats");
    var ctrlLabel = props.controller || "Onbekend";
    var ctrlClass = "conf-med";
    if(props.controller === "Rusland" || props.controller === "Israël" || props.controller === "Houthi's") ctrlClass = "conf-low";
    else if(props.controller === "Oekraïne" || props.controller === "Regering" || props.controller === "Libanese staat" || props.controller === "Saoedi-Arabië" || props.controller === "Palestina") ctrlClass = "conf-high";

    var events = getEventsForArea(area);
    var physicalCount = 0;
    for(var i = 0; i < events.length; i++){
      if(events[i].countsForHeat !== false) physicalCount++;
    }

    var provinceLine = "";
    if(props.provinceName){
      provinceLine = '<div class="wm-panel-conf-detail">Provincie: ' + escapeHtml(props.provinceName) + '</div>';
    }

    statsEl.innerHTML =
      '<div class="wm-panel-stat ' + ctrlClass + '">' +
        '<div class="wm-panel-stat-val">' + escapeHtml(ctrlLabel) + '</div>' +
        '<div class="wm-panel-stat-lbl">Controller</div>' +
      '</div>' +
      '<div class="wm-panel-stat">' +
        '<div class="wm-panel-stat-val">' + events.length + '</div>' +
        '<div class="wm-panel-stat-lbl">Events (7d)</div>' +
      '</div>' +
      '<div class="wm-panel-stat">' +
        '<div class="wm-panel-stat-val">' + physicalCount + '</div>' +
        '<div class="wm-panel-stat-lbl">Fysiek</div>' +
      '</div>' +
      '<div class="wm-panel-conf-detail">Bron: ' + escapeHtml(props.control_source || "—") +
        ' · Confidence: ' + Math.round((props.control_confidence || 0) * 100) + '%</div>' +
      provinceLine;

    var evEl = panel.querySelector("#caPanelEvents");
    if(!events.length){
      evEl.innerHTML = '<div class="wm-panel-empty">Geen militaire events in dit gebied</div>';
    } else {
      evEl.innerHTML = events.map(function(ev){
        var physical = ev.countsForHeat !== false;
        var actionTag = physical ? "Fysiek" : "Niet-fysiek";
        var actionClass = physical ? "wm-ev-physical" : "wm-ev-political";
        return '<div class="wm-panel-event">' +
          '<div class="wm-panel-event-title">' + escapeHtml(ev.title || "?") + '</div>' +
          '<div class="wm-panel-event-meta">' +
            '<span class="wm-panel-event-src">' + escapeHtml(ev.source || "?") + '</span>' +
            '<span class="wm-panel-event-dot">·</span>' +
            '<span>' + timeAgoShort(ev.date) + '</span>' +
            '<span class="' + actionClass + '">' + actionTag + '</span>' +
            '<span class="wm-panel-event-sub">' + escapeHtml(ev.subtype || "—") + '</span>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    CA.selectedId = props.id;
    requestAnimationFrame(function(){ panel.classList.add("show"); });
  }

  function closePanel(){
    if(CA.panel) CA.panel.classList.remove("show");
    CA.selectedId = null;
  }

  function ensurePane(map, conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict) return;
    var paneName = conflict.paneName;
    if(map.getPane(paneName)) return;
    map.createPane(paneName);
    map.getPane(paneName).style.zIndex = conflict.paneZ;
    map.getPane(paneName).style.pointerEvents = "auto";
  }

  function onEachAreaFor(conflictIso){
    return function(feature, layer){
      layer.on({
        mouseover: function(e){
          var l = e.target;
          l._caHover = true;
          var conflict = getConflict(conflictIso);
          var props = feature.properties;
          var w = props.territory_gain ? 3.0 : BORDER_WEIGHT_HOVER;
          var col = props.territory_gain ? COLORS.territoryGain :
                    (props.controller && conflict.parties[props.controller]
                     ? conflict.parties[props.controller].color
                     : "rgba(255,255,255,0.5)");
          l.setStyle({
            weight: w, color: col, opacity: 0.95,
            fillOpacity: Math.min(0.75, FILL_OPACITY + 0.15)
          });
          if(l.bringToFront) l.bringToFront();
        },
        mouseout: function(e){
          var l = e.target;
          l._caHover = false;
          var layer = CA.layers[conflictIso];
          if(layer) layer.resetStyle(l);
        },
        click: function(e){
          if(L.DomEvent) L.DomEvent.stopPropagation(e);
          var areasArr = CA.areas[conflictIso] || [];
          var area = null;
          for(var i = 0; i < areasArr.length; i++){
            if(areasArr[i].layer === e.target){ area = areasArr[i]; break; }
          }
          if(area) openPanel(area, conflictIso);
        }
      });
    };
  }

  function renderLayer(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!CA.map || !geojson || !conflict) return;
    ensurePane(CA.map, conflictIso);
    if(CA.layers[conflictIso]){ try{ CA.map.removeLayer(CA.layers[conflictIso]); }catch(e){} }

    CA.layers[conflictIso] = L.geoJSON(geojson, {
      style: styleAreaFor(conflictIso),
      pane: conflict.paneName,
      smoothFactor: 1.2,
      onEachFeature: onEachAreaFor(conflictIso)
    });
    CA.layers[conflictIso].addTo(CA.map);

    CA.areas[conflictIso] = [];
    CA.layers[conflictIso].eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas[conflictIso].push({
          id: l.feature.properties.id,
          name: l.feature.properties.name,
          provinceName: l.feature.properties.provinceName,
          controller: l.feature.properties.controller,
          layer: l, feature: l.feature
        });
      }
    });
    LOG("[" + conflictIso + "] Gebiedslaag gerenderd: " + CA.areas[conflictIso].length + " gebieden");

    renderOverlayPolygons(conflictIso);
  }

  function getLegendHtml(){
    var html = "";
    ACTIVE_CONFLICTS.forEach(function(iso){
      var conflict = getConflict(iso);
      if(!conflict || !conflict.parties) return;
      html += '<div class="wm-legend-block">';
      html += '<div class="wm-legend-block-title">── ' + escapeHtml(conflict.name) + ' ──</div>';
      var partyNames = Object.keys(conflict.parties);
      partyNames.forEach(function(party){
        var c = conflict.parties[party];
        html += '<div class="wm-legend-row">' +
          '<span class="wm-legend-swatch-square" style="background:' + c.fill + '"></span>' +
          escapeHtml(party) + '</div>';
      });
      html += '</div>';
    });
    return html;
  }

  function initOneConflict(conflictIso){
    return loadOblasts(conflictIso).then(function(oblastsJson){
      CA.geojsons[conflictIso] = oblastsJson;
      return Promise.all([loadDeepState(conflictIso), loadISW(conflictIso)]).then(function(res){
        CA.deepStateGeos[conflictIso] = res[0];
        CA.iswGeos[conflictIso] = res[1];
        calculateControllers(conflictIso);
        calculateAttackIntensity(conflictIso);
        renderLayer(conflictIso);
        LOG("[" + conflictIso + "] Klaar — " + (CA.areas[conflictIso] || []).length + " gebieden");
        return true;
      });
    }).catch(function(e){
      LOG("[" + conflictIso + "] Init faalde: " + (e.message || "?"));
      return false;
    });
  }

  function _doInit(){
    LOG("Init gestart voor: " + ACTIVE_CONFLICTS.join(", "));
    return openDB().then(function(){
      return Promise.all(ACTIVE_CONFLICTS.map(function(iso){ return initOneConflict(iso); }));
    }).then(function(){
      CA.isInitialized = true;
      CA.isLoaded = true;
      try {
        if(window.WorldMap && window.WorldMap.refreshLegend) window.WorldMap.refreshLegend();
      } catch(e){}
      startPulse();
      LOG("Init volledig klaar — " + ACTIVE_CONFLICTS.length + " conflicten actief");
      return true;
    }).catch(function(e){
      LOG("Init faalde: " + (e.message || "?"));
      _initPromise = null;
      throw e;
    });
  }

  function init(mapInstance){
    if(CA.isInitialized){ LOG("Al geïnitialiseerd"); return Promise.resolve(); }
    if(_initPromise){ LOG("Init al bezig — wacht"); return _initPromise; }
    if(!mapInstance) return Promise.reject(new Error("Geen map instance"));
    CA.map = mapInstance;
    _initPromise = _doInit();
    return _initPromise;
  }

  function refresh(){
    if(!CA.isInitialized) return Promise.resolve();
    LOG("Refresh — alle conflicten");
    return Promise.all(ACTIVE_CONFLICTS.map(function(iso){
      var conflict = getConflict(iso);
      return dbPut(conflict.cacheKeys.deepState.key, { version: "cleared", t: 0, geojson: null })
        .then(function(){ return dbPut(conflict.cacheKeys.isw.key, { version: "cleared", t: 0, geojson: null }); })
        .then(function(){ return initOneConflict(iso); });
    })).then(function(){ return true; });
  }

  function updateIntensity(){
    ACTIVE_CONFLICTS.forEach(function(iso){
      calculateAttackIntensity(iso);
      var layer = CA.layers[iso];
      if(!layer) return;
      var styleFn = styleAreaFor(iso);
      layer.eachLayer(function(l){
        if(!l.feature) return;
        try { l.setStyle(styleFn(l.feature)); } catch(e){}
      });
    });
    if(hasActiveAreas() && !CA.pulseTimer) startPulse();
  }

  function clearCache(){
    return Promise.all(ACTIVE_CONFLICTS.map(function(iso){
      var conflict = getConflict(iso);
      return Promise.all([
        dbPut(conflict.cacheKeys.oblasts.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.deepState.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.isw.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.snapshot.key, { version: "cleared", t: 0, geojson: null })
      ]);
    })).then(function(){ LOG("Alle caches gewist"); return true; });
  }

  function destroy(){
    stopPulse();
    ACTIVE_CONFLICTS.forEach(function(iso){
      if(CA.layers[iso] && CA.map){ try{ CA.map.removeLayer(CA.layers[iso]); }catch(e){} }
      if(CA.overlayLayers[iso] && CA.map){ try{ CA.map.removeLayer(CA.overlayLayers[iso]); }catch(e){} }
    });
    CA.layers = {}; CA.overlayLayers = {};
    CA.isInitialized = false; CA.isLoaded = false;
    _initPromise = null;
  }

  function getStats(){
    var out = {};
    ACTIVE_CONFLICTS.forEach(function(iso){
      if(CA.stats[iso]) out[iso] = CA.stats[iso];
    });
    return out;
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab');
    if(!tab) return;
    var view = tab.getAttribute("data-view");
    if(view === "map"){
      CA.isMapActive = true;
      if(CA.isInitialized) startPulse();
    } else {
      CA.isMapActive = false;
      stopPulse();
    }
  });

  window.ConflictAreas = {
    init: init, refresh: refresh, updateIntensity: updateIntensity,
    destroy: destroy, clearCache: clearCache, getStats: getStats,
    getLegendHtml: getLegendHtml,
    state: CA, _version: "v9.2",
    _conflicts: CONFLICTS,
    _activeConflicts: ACTIVE_CONFLICTS
  };

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

  try {
    if(window.WarDesk && window.WarDesk.events){
      window.WarDesk.events.on("map:military-events", function(){
        if(CA.isInitialized) setTimeout(function(){ updateIntensity(); }, 500);
      });
    }
  } catch(e){}

  LOG("conflict-areas.js v9.2 geladen (7 landen: UKR, SYR, LBN, YEM, SAU, ISR, PSE)");
})();