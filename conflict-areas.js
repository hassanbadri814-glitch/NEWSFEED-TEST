/* ============================================================
   WAR DESK — conflict-areas.js v6.2.1
   ------------------------------------------------------------
   - v6.2.1: Diagnostische logging in findManualOverride
             (om te achterhalen waarom AlHasakah niet matcht)
   - v6.2: Robuuste fuzzy matching
   - v6.0: MULTI-COUNTRY (Oekraïne + Syrië)
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  /* ============================================================
     CONFLICTS — per land configuratie
     ============================================================ */
  var CONFLICTS = {
    "UKR": {
      name: "Oekraïne",
      paneName: "conflictAreasPaneUKR",
      paneZ: 420,
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
      manualOverrides: null,
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
      parties: {
        "Regering":  { color: "#2E7D32", fill: "#2E7D32" },
        "SDF":       { color: "#2A6FDB", fill: "#2A6FDB" },
        "Druze":     { color: "#9333EA", fill: "#9333EA" },
        "Israël":    { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SYR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SYR_1.json"
      ],
      iswUrl: null,
      deepStateUrlFn: null,
      manualOverrides: [
        { match: ["aleppo"],                                                controller: "Regering" },
        { match: ["damascus"],                                              controller: "Regering" },
        { match: ["rifdimashq", "rif", "dimashq"],                          controller: "Regering" },
        { match: ["homs", "hims"],                                          controller: "Regering" },
        { match: ["hama", "hamah"],                                         controller: "Regering" },
        { match: ["latakia", "lattakia", "ladhiqiyah", "lattak"],           controller: "Regering" },
        { match: ["tartus", "tartous"],                                     controller: "Regering" },
        { match: ["idlib", "idleb"],                                        controller: "Regering" },
        { match: ["dayrazzawr", "dayraz", "deirez", "zawr", "zur"],         controller: "Regering" },
        { match: ["raqqa", "raqqah", "arraqqah"],                           controller: "Regering" },
        { match: ["alhasakah", "hasakah", "hasakeh", "hasaka"],             controller: "Regering" },
        { match: ["daraa", "dara", "dar"],                                  controller: "Regering" },
        { match: ["quneitra", "qunaytirah", "kuneitra"],                    controller: "Israël" },
        { match: ["assuwayda", "suwayda", "suweida", "suwaydah"],           controller: "Druze" }
      ],
      cacheKeys: {
        oblasts:   { key: "wardesk_syria_provinces", version: "v4" },
        deepState: { key: "wardesk_syria_ds",        version: "v1" },
        isw:       { key: "wardesk_syria_isw",       version: "v1" },
        snapshot:  { key: "wardesk_syria_snapshot",  version: "v1" }
      }
    }
  };

  var ACTIVE_CONFLICTS = ["UKR", "SYR"];

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
  var BORDER_WEIGHT = 0.6;
  var BORDER_WEIGHT_HOVER = 2.2;

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
    geojsons: {},
    areas: {},
    deepStateGeos: {},
    iswGeos: {},
    prevSnapshots: {},
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

  function getConflict(iso){
    return CONFLICTS[iso] || null;
  }

  function getPartyColor(iso, partyName){
    var conflict = getConflict(iso);
    if(!conflict || !conflict.parties) return "#6b7280";
    var p = conflict.parties[partyName];
    return p ? p.color : "#6b7280";
  }

  /* ============================================================
     v6.2.1: Robuuste fuzzy matcher + diagnostic logging
     ============================================================ */
  function findManualOverride(provinceName, overrides){
    if(!provinceName || !overrides || !overrides.length) return null;
    var norm = String(provinceName).toLowerCase().replace(/[^a-z0-9]/g, "");
    if(!norm) return null;

    for(var i = 0; i < overrides.length; i++){
      var entry = overrides[i];
      if(!entry || !entry.match) continue;
      for(var j = 0; j < entry.match.length; j++){
        var needle = String(entry.match[j]).toLowerCase().replace(/[^a-z0-9]/g, "");
        if(!needle) continue;
        if(norm.indexOf(needle) !== -1) return entry.controller;
      }
    }

    /* v6.2.1: diagnostic — log eerste unmatched naam met char codes */
    if(!window.__caLoggedUnmatched){
      window.__caLoggedUnmatched = {};
    }
    if(!window.__caLoggedUnmatched[norm]){
      window.__caLoggedUnmatched[norm] = true;
      var codes = [];
      var rawStr = String(provinceName);
      for(var c = 0; c < Math.min(rawStr.length, 30); c++){
        codes.push(rawStr.charCodeAt(c));
      }
      LOG("DIAG unmatched: norm='" + norm + "' raw='" + provinceName +
          "' len=" + rawStr.length + " codes=[" + codes.join(",") + "]");
    }

    return null;
  }

  /* ============================================================
     GEO HELPERS
     ============================================================ */
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
        controller: null, control_confidence: 0, control_source: null,
        territory_gain: false, territory_gain_from: null,
        attack_intensity: 0, attack_count: 0,
        last_update: null
      };
    });
    return json;
  }

  function fetchOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.oblastSources) return Promise.reject(new Error("Geen oblast-bronnen"));

    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.oblastSources.length){
        return Promise.reject(lastErr || new Error("Alle oblast-bronnen faalden"));
      }
      LOG("[" + conflictIso + "] Oblasten bron " + (idx+1) + "/" + conflict.oblastSources.length);
      return fetchViaProxy(conflict.oblastSources[idx])
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
          return normalizeOblast(json);
        })
        .then(function(json){
          LOG("[" + conflictIso + "]   ✓ " + json.features.length + " oblasten");
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
        LOG("[" + conflictIso + "] Oblasten uit cache (" + cached.v.geojson.features.length + ")");
        return cached.v.geojson;
      }
      LOG("[" + conflictIso + "] Oblast-cache leeg — fetch externe bron");
      return fetchOblasts(conflictIso).then(function(json){
        return dbPut(cacheKey, {
          version: cacheVer, t: Date.now(), geojson: json
        }).then(function(){ LOG("[" + conflictIso + "] Oblasten opgeslagen"); return json; });
      });
    });
  }

  /* ============================================================
     DeepState + ISW
     ============================================================ */
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
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS &&
         cached.v.geojson){
        LOG("[" + conflictIso + "] DeepState uit cache");
        return cached.v.geojson;
      }
      LOG("[" + conflictIso + "] DeepState cache leeg — fetch");
      var url = conflict.deepStateUrlFn();
      LOG("[" + conflictIso + "] DeepState URL: ..." + url.slice(-30));
      return fetchRaw(url, 20000)
        .then(function(json){
          var feat = extractDeepStateGeometry(json);
          if(!feat) throw new Error("Geen polygoon");
          LOG("[" + conflictIso + "]   ✓ DeepState geladen");
          return dbPut(cacheKey, {
            version: cacheVer, t: Date.now(), geojson: feat
          }).then(function(){ LOG("[" + conflictIso + "] DeepState opgeslagen"); return feat; });
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
         (Date.now() - cached.v.t) < ISW_CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
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
          }).then(function(){ LOG("[" + conflictIso + "] ISW opgeslagen"); return json; });
        })
        .catch(function(e){ LOG("[" + conflictIso + "] ISW faalde: " + e.message); return null; });
    });
  }

  /* ============================================================
     Controller berekening
     ============================================================ */
  function calculateControllers(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;

    var hasDS = !!CA.deepStateGeos[conflictIso];
    var hasISW = !!CA.iswGeos[conflictIso] && CA.iswGeos[conflictIso].features && CA.iswGeos[conflictIso].features.length > 0;
    var hasManual = !!conflict.manualOverrides;

    LOG("[" + conflictIso + "] Controller berekening — DS: " + hasDS + ", ISW: " + hasISW + ", manual: " + hasManual);

    if(hasManual){
      var allNames = geojson.features.map(function(f){ return f.properties.name; });
      LOG("[" + conflictIso + "] GADM provincie-namen: " + allNames.join(" | "));
    }

    var stats = {};
    var partyNames = Object.keys(conflict.parties);
    partyNames.forEach(function(p){ stats[p] = 0; });
    stats.total = 0;
    stats.unknown = 0;

    var dsCount = 0, iswCount = 0, manualCount = 0;
    var unmatched = [];

    geojson.features.forEach(function(feature){
      if(!feature || !feature.properties) return;
      stats.total++;
      var props = feature.properties;

      if(hasManual){
        var override = findManualOverride(props.name, conflict.manualOverrides);
        if(override){
          props.controller = override;
          props.control_confidence = 0.9;
          props.control_source = "Handmatig";
          props.last_update = new Date().toISOString();
          if(stats[override] !== undefined) stats[override]++;
          manualCount++;
          return;
        } else {
          props.controller = null;
          props.control_confidence = 0;
          props.control_source = "Onbekend";
          props.last_update = new Date().toISOString();
          stats.unknown++;
          unmatched.push(props.name);
          return;
        }
      }

      var centroid = getCentroid(feature);
      if(!centroid){
        props.controller = null;
        props.control_source = null;
        stats.unknown++;
        return;
      }

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
      } else if(controller === "Oekraïne"){
        props.control_source = hasDS ? "DeepState" : (hasISW ? "ISW" : "Onbekend");
      } else {
        props.control_source = "Onbekend";
      }

      if(stats[controller] !== undefined) stats[controller]++;
    });

    CA.stats[conflictIso] = stats;
    var summary = partyNames.map(function(p){ return p + ": " + (stats[p] || 0); }).join(" | ");
    LOG("[" + conflictIso + "] Controllers: " + stats.total + " gebieden | " + summary +
        " | onbekend: " + stats.unknown +
        " (auto: DS " + dsCount + ", ISW " + iswCount + ", manual: " + manualCount + ")");

    if(unmatched.length){
      LOG("[" + conflictIso + "] ⚠️ Geen override voor: " + unmatched.join(" | "));
    }
  }

  /* ============================================================
     Attack intensity
     ============================================================ */
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
      if(f.properties){
        f.properties.attack_intensity = 0;
        f.properties.attack_count = 0;
      }
    });

    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var countByArea = {};

    events.forEach(function(ev){
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      if(ev.category !== "militair" && ev.category !== "crime") return;
      if(ev.countsForHeat === false) return;
      var t = new Date(ev.date).getTime();
      if(t < periodAgo) return;

      for(var i = 0; i < geojson.features.length; i++){
        var f = geojson.features[i];
        if(featureContainsPoint(f, ev.lng, ev.lat)){
          var id = f.properties.id;
          countByArea[id] = (countByArea[id] || 0) + 1;
          break;
        }
      }
    });

    var activeAreas = 0;
    var totalEvents = 0;
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

  /* ============================================================
     Styling
     ============================================================ */
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

  /* ============================================================
     Pulse
     ============================================================ */
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

  /* ============================================================
     Paneel
     ============================================================ */
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
    var conflict = getConflict(conflictIso);
    panel.querySelector("#caPanelTitle").textContent = props.name || "?";

    var statsEl = panel.querySelector("#caPanelStats");
    var ctrlLabel = props.controller || "Onbekend";
    var ctrlClass = props.controller === "Rusland" ? "conf-low" :
                    (props.controller === "Oekraïne" || props.controller === "Regering" ? "conf-high" : "conf-med");
    var sourceLabel = props.control_source || "—";

    var events = getEventsForArea(area);
    var physicalCount = 0;
    for(var i = 0; i < events.length; i++){
      if(events[i].countsForHeat !== false) physicalCount++;
    }

    var territoryBadge = "";
    if(props.territory_gain && props.territory_gain_from){
      territoryBadge = '<div class="wm-panel-conf-detail" style="color:#e0a857;font-weight:700">' +
        '⚡ Terreinwinst — voorheen ' + escapeHtml(props.territory_gain_from) + '</div>';
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
      '<div class="wm-panel-conf-detail">Bron: ' + escapeHtml(sourceLabel) +
        ' · Confidence: ' + Math.round((props.control_confidence || 0) * 100) + '%</div>' +
      territoryBadge;

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

  /* ============================================================
     Render per conflict
     ============================================================ */
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

    if(CA.layers[conflictIso]){
      try{ CA.map.removeLayer(CA.layers[conflictIso]); }catch(e){}
    }

    CA.layers[conflictIso] = L.geoJSON(geojson, {
      style: styleAreaFor(conflictIso),
      pane: conflict.paneName,
      smoothFactor: 1.5,
      onEachFeature: onEachAreaFor(conflictIso)
    });
    CA.layers[conflictIso].addTo(CA.map);

    CA.areas[conflictIso] = [];
    CA.layers[conflictIso].eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas[conflictIso].push({
          id: l.feature.properties.id,
          name: l.feature.properties.name,
          controller: l.feature.properties.controller,
          layer: l, feature: l.feature
        });
      }
    });
    LOG("[" + conflictIso + "] Gebiedslaag gerenderd: " + CA.areas[conflictIso].length + " gebieden");
  }

  /* ============================================================
     Legenda
     ============================================================ */
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
          escapeHtml(party) +
        '</div>';
      });

      html += '<div class="wm-legend-row">' +
        '<span class="wm-legend-swatch-square wm-legend-swatch-gold"></span>Terreinwinst</div>';
      html += '<div class="wm-legend-row">' +
        '<span class="wm-legend-swatch-square wm-legend-swatch-pulse"></span>Actief conflict</div>';
      html += '</div>';
    });
    return html;
  }

  /* ============================================================
     Init
     ============================================================ */
  function initOneConflict(conflictIso){
    return loadOblasts(conflictIso).then(function(oblastsJson){
      CA.geojsons[conflictIso] = oblastsJson;
      return Promise.all([
        loadDeepState(conflictIso),
        loadISW(conflictIso)
      ]).then(function(res){
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
    });
    CA.layers = {}; CA.isInitialized = false; CA.isLoaded = false;
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
    state: CA, _version: "v6.2.1",
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

  LOG("conflict-areas.js v6.2.1 geladen (met diagnostic logging)");
})();