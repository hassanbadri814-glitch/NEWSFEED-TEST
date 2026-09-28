/* ============================================================
   WAR DESK — conflict-areas.js v5.0
   ------------------------------------------------------------
   FASE 3: Aanvalspulsen + Terreinwinst
   - v5.0: pulserende randen bij aanvallen, gouden rand bij terreinwinst
   - v4.0: interactief paneel
   - v3.1: eigen point-in-polygon (geen turf.js)
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
  var CACHE_KEY_SNAPSHOT = "wardesk_ukraine_snapshot";
  var CACHE_VERSION = "v10";
  var CACHE_VERSION_DS = "v6";
  var CACHE_VERSION_ISW = "v4";
  var SNAPSHOT_VERSION = "v1";
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
    neutralBorder: "rgba(255,255,255,0.10)",
    russiaBorderHover:  "rgba(220,60,60,0.95)",
    ukraineBorderHover: "rgba(70,140,240,0.95)",
    pulse:         "rgba(255,90,90,0.95)",
    territoryGain: "#e0a857"
  };

  var FILL_OPACITY = 0.45;
  var BORDER_WEIGHT = 0.6;
  var BORDER_WEIGHT_HOVER = 2.2;

  /* Pulserende animatie-instellingen */
  var PULSE_INTERVAL_MS = 900;
  var PULSE_MIN_INTENSITY = 0.15;
  var PULSE_WEIGHT_MIN = 1.4;
  var PULSE_WEIGHT_MAX = 3.6;

  var CA = {
    map: null, layer: null, geojson: null, areas: [],
    deepStateGeo: null, iswGeo: null,
    isLoaded: false, isInitialized: false,
    stats: { total: 0, russia: 0, ukraine: 0, unknown: 0 },
    panel: null, selectedId: null,
    snapshot: null, prevSnapshot: null,
    pulseTimer: null, pulsePhase: 0,
    isMapActive: true
  };

  var db = null;

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
     DeepState + ISW laden
     ============================================================ */
  function getDeepStateUrl(){
    var now = new Date();
    if(now.getUTCHours() < 4){ now.setUTCDate(now.getUTCDate() - 1); }
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

  function loadDeepState(){
    return dbGet(CACHE_KEY_DS).then(function(cached){
      if(cached && cached.v && cached.v.version === CACHE_VERSION_DS &&
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS &&
         cached.v.geojson){
        LOG("DeepState uit cache");
        return cached.v.geojson;
      }
      LOG("DeepState cache leeg — fetch");
      var url = getDeepStateUrl();
      LOG("DeepState URL: ..." + url.slice(-30));
      return fetchRaw(url, 20000)
        .then(function(json){
          var feat = extractDeepStateGeometry(json);
          if(!feat) throw new Error("Geen polygoon");
          LOG("  ✓ DeepState geladen");
          return dbPut(CACHE_KEY_DS, {
            version: CACHE_VERSION_DS, t: Date.now(), geojson: feat
          }).then(function(){ LOG("DeepState opgeslagen"); return feat; });
        })
        .catch(function(e){ LOG("DeepState faalde: " + e.message); return null; });
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
      LOG("ISW fallback — fetch ArcGIS");
      return fetchViaProxy(ISW_URL)
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige ISW GeoJSON");
          LOG("  ✓ ISW geladen (" + json.features.length + ")");
          return dbPut(CACHE_KEY_ISW, {
            version: CACHE_VERSION_ISW, t: Date.now(), geojson: json
          }).then(function(){ LOG("ISW opgeslagen"); return json; });
        })
        .catch(function(e){ LOG("ISW faalde: " + e.message); return null; });
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

      if(hasDS){
        try {
          if(featureContainsPoint(CA.deepStateGeo, cx, cy)){
            inOccupied = true; source = "DeepState"; dsCount++;
          }
        } catch(e){}
      }

      if(!inOccupied && hasISW){
        for(var i = 0; i < CA.iswGeo.features.length; i++){
          if(featureContainsPoint(CA.iswGeo.features[i], cx, cy)){
            inOccupied = true; source = "ISW"; iswCount++;
            break;
          }
        }
      }

      var controller = inOccupied ? "Rusland" : "Oekraïne";
      props.controller = controller;
      props.control_source = source || (controller === "Oekraïne" ? "DeepState" : null);
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
     SNAPSHOT — dagelijkse momentopname voor terreinwinst
     ============================================================ */
  function getTodayKey(){
    var d = new Date();
    return d.getUTCFullYear() + "-" +
           String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
           String(d.getUTCDate()).padStart(2, "0");
  }

  function saveSnapshot(){
    if(!CA.geojson || !CA.geojson.features) return Promise.resolve();
    var today = getTodayKey();
    var areas = {};
    CA.geojson.features.forEach(function(f){
      if(f.properties && f.properties.id){
        areas[f.properties.id] = {
          controller: f.properties.controller,
          name: f.properties.name
        };
      }
    });
    var snap = {
      version: SNAPSHOT_VERSION,
      date: today,
      t: Date.now(),
      areas: areas
    };
    return dbPut(CACHE_KEY_SNAPSHOT, snap).then(function(){
      LOG("Snapshot opgeslagen (" + today + "): " + Object.keys(areas).length + " oblasten");
      return snap;
    });
  }

  function loadPrevSnapshot(){
    return dbGet(CACHE_KEY_SNAPSHOT).then(function(cached){
      if(!cached || !cached.v) return null;
      var snap = cached.v;
      if(snap.version !== SNAPSHOT_VERSION) return null;
      var today = getTodayKey();
      if(snap.date === today){
        /* Snapshot is van vandaag; gebruik hem als huidige */
        return null;
      }
      LOG("Vorige snapshot: " + snap.date);
      return snap;
    });
  }

  function calculateTerritoryGain(){
    if(!CA.geojson || !CA.geojson.features) return;
    if(!CA.prevSnapshot || !CA.prevSnapshot.areas) {
      LOG("Geen vorige snapshot — geen terreinwinst berekend");
      return;
    }

    var changed = 0;
    CA.geojson.features.forEach(function(f){
      if(!f.properties || !f.properties.id) return;
      var id = f.properties.id;
      var prev = CA.prevSnapshot.areas[id];
      if(!prev) return;

      var currentController = f.properties.controller;
      var prevController = prev.controller;

      if(currentController && prevController && currentController !== prevController){
        f.properties.territory_gain = true;
        f.properties.territory_gain_from = prevController;
        changed++;
      } else {
        f.properties.territory_gain = false;
        f.properties.territory_gain_from = null;
      }
    });

    LOG("Terreinwinst: " + changed + " oblasten gewijzigd sinds " + CA.prevSnapshot.date);
  }

  /* ============================================================
     Attack intensity — gebaseerd op MAPAPI events
     ============================================================ */
  function calculateAttackIntensity(){
    if(!CA.geojson || !CA.geojson.features) return;

    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){}

    if(!events.length){
      LOG("Geen events beschikbaar voor attack_intensity");
      return;
    }

    /* Reset eerst */
    CA.geojson.features.forEach(function(f){
      if(f.properties){
        f.properties.attack_intensity = 0;
        f.properties.attack_count = 0;
      }
    });

    /* Tijdvenster: laatste 7 dagen */
    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    /* Voor elk event: vind de oblast waarin het valt */
    var countByArea = {};
    events.forEach(function(ev){
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      if(ev.category !== "militair" && ev.category !== "crime") return;
      if(ev.countsForHeat === false) return;
      var t = new Date(ev.date).getTime();
      if(t < periodAgo) return;

      /* Vind eerste oblast die het event bevat */
      for(var i = 0; i < CA.geojson.features.length; i++){
        var f = CA.geojson.features[i];
        if(featureContainsPoint(f, ev.lng, ev.lat)){
          var id = f.properties.id;
          countByArea[id] = (countByArea[id] || 0) + 1;
          break;
        }
      }
    });

    /* Bereken intensiteit per oblast (0.0 – 1.0) */
    var activeAreas = 0;
    var totalEvents = 0;
    CA.geojson.features.forEach(function(f){
      if(!f.properties) return;
      var count = countByArea[f.properties.id] || 0;
      if(count > 0){
        activeAreas++;
        totalEvents += count;
      }
      /* Logaritmische schaal: 1 event = 0.15, 3 = 0.4, 10 = 0.7, 20+ = 1.0 */
      var intensity = Math.min(1, Math.log(1 + count) / Math.log(21));
      f.properties.attack_intensity = Math.round(intensity * 100) / 100;
      f.properties.attack_count = count;
    });

    LOG("Attack intensity: " + totalEvents + " events in " + activeAreas + " oblasten");
  }

  /* ============================================================
     Styling
     ============================================================ */
  function getColorsFor(props){
    var controller = props && props.controller;
    if(controller === "Rusland"){
      return { fill: COLORS.russiaFill, border: COLORS.russiaBorder, borderHover: COLORS.russiaBorderHover };
    }
    if(controller === "Oekraïne"){
      return { fill: COLORS.ukraineFill, border: COLORS.ukraineBorder, borderHover: COLORS.ukraineBorderHover };
    }
    return { fill: "transparent", border: COLORS.neutralBorder, borderHover: "rgba(255,255,255,0.5)" };
  }

  function styleArea(feature){
    var props = (feature && feature.properties) || {};
    var c = getColorsFor(props);

    /* Terreinwinst: gouden rand */
    var borderColor = c.border;
    var borderWeight = BORDER_WEIGHT;
    if(props.territory_gain){
      borderColor = COLORS.territoryGain;
      borderWeight = 2.4;
    }

    return {
      fillColor: c.fill,
      fillOpacity: props.controller ? FILL_OPACITY : 0,
      color: borderColor,
      weight: borderWeight,
      opacity: props.territory_gain ? 0.95 : 0.7,
      dashArray: null,
      interactive: true,
      lineCap: "round",
      lineJoin: "round"
    };
  }

  /* ============================================================
     Pulse animatie — randen van actieve oblasten knipperen
     ============================================================ */
  function startPulse(){
    stopPulse();
    if(!CA.isMapActive) return;

    CA.pulseTimer = setInterval(function(){
      if(!CA.isMapActive || !CA.layer) return;
      CA.pulsePhase = (CA.pulsePhase + 1) % 2;
      var growing = CA.pulsePhase === 0;

      CA.layer.eachLayer(function(l){
        if(!l.feature || !l.feature.properties) return;
        var p = l.feature.properties;
        if(!p.attack_intensity || p.attack_intensity < PULSE_MIN_INTENSITY) return;

        /* Skip als de laag gehoverd is */
        if(l._caHover) return;

        var c = getColorsFor(p);
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
    }, PULSE_INTERVAL_MS);

    LOG("Pulse animatie gestart (" + PULSE_INTERVAL_MS + "ms)");
  }

  function stopPulse(){
    if(CA.pulseTimer){
      clearInterval(CA.pulseTimer);
      CA.pulseTimer = null;
    }
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
      if(featureContainsPoint(area.feature, ev.lng, ev.lat)){
        filtered.push(ev);
      }
    }
    filtered.sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
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

  function openPanel(area){
    var panel = ensurePanel();
    var props = area.feature.properties;
    panel.querySelector("#caPanelTitle").textContent = props.name || "?";

    var statsEl = panel.querySelector("#caPanelStats");
    var ctrlLabel = props.controller || "Onbekend";
    var ctrlClass = props.controller === "Rusland" ? "conf-low" :
                    (props.controller === "Oekraïne" ? "conf-high" : "");
    var sourceLabel = props.control_source || "—";

    var events = getEventsForArea(area);
    var physicalCount = 0;
    for(var i = 0; i < events.length; i++){
      if(events[i].countsForHeat !== false) physicalCount++;
    }

    var territoryBadge = "";
    if(props.territory_gain && props.territory_gain_from){
      territoryBadge = '<div class="wm-panel-conf-detail" style="color:#e0a857;font-weight:700">' +
        '⚡ Terreinwinst — voorheen ' + escapeHtml(props.territory_gain_from) +
        '</div>';
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
      evEl.innerHTML = '<div class="wm-panel-empty">Geen militaire events in deze oblast</div>';
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
     Render
     ============================================================ */
  function ensurePane(map){
    if(map.getPane(PANE_NAME)) return;
    map.createPane(PANE_NAME);
    map.getPane(PANE_NAME).style.zIndex = PANE_Z;
    map.getPane(PANE_NAME).style.pointerEvents = "auto";
  }

  function onEachArea(feature, layer){
    layer.on({
      mouseover: function(e){
        var l = e.target;
        l._caHover = true;
        var c = getColorsFor(feature.properties);
        var w = feature.properties.territory_gain ? 3.0 : BORDER_WEIGHT_HOVER;
        var col = feature.properties.territory_gain ? COLORS.territoryGain : c.borderHover;
        l.setStyle({
          weight: w,
          color: col,
          opacity: 0.95,
          fillOpacity: Math.min(0.75, FILL_OPACITY + 0.15)
        });
        if(l.bringToFront) l.bringToFront();
      },
      mouseout: function(e){
        var l = e.target;
        l._caHover = false;
        if(CA.layer) CA.layer.resetStyle(l);
      },
      click: function(e){
        if(L.DomEvent) L.DomEvent.stopPropagation(e);
        var area = null;
        for(var i = 0; i < CA.areas.length; i++){
          if(CA.areas[i].layer === e.target){ area = CA.areas[i]; break; }
        }
        if(area) openPanel(area);
      }
    });
  }

  function renderLayer(){
    if(!CA.map || !CA.geojson) return;
    ensurePane(CA.map);
    if(CA.layer){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }

    CA.layer = L.geoJSON(CA.geojson, {
      style: styleArea,
      pane: PANE_NAME,
      smoothFactor: 1.5,
      onEachFeature: onEachArea
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
    LOG("Gebiedslaag gerenderd: " + CA.areas.length + " gebieden (interactive)");
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
        return Promise.all([
          loadDeepState(),
          loadISW(),
          loadPrevSnapshot()
        ]).then(function(res){
          CA.deepStateGeo = res[0];
          CA.iswGeo = res[1];
          CA.prevSnapshot = res[2];

          calculateControllers();
          calculateTerritoryGain();
          calculateAttackIntensity();
          renderLayer();
          saveSnapshot();

          CA.isInitialized = true;
          CA.isLoaded = true;
          LOG("Init klaar — " + CA.areas.length + " oblasten (" +
              CA.stats.russia + " rood, " + CA.stats.ukraine + " blauw)");

          startPulse();
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
    LOG("Refresh — DeepState + ISW + intensity opnieuw");
    return Promise.all([
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_ISW, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){
      return Promise.all([loadDeepState(), loadISW()]);
    }).then(function(res){
      CA.deepStateGeo = res[0];
      CA.iswGeo = res[1];
      calculateControllers();
      calculateTerritoryGain();
      calculateAttackIntensity();
      renderLayer();
      return true;
    });
  }

  function updateIntensity(){
    calculateAttackIntensity();
    if(CA.layer){
      CA.layer.eachLayer(function(l){
        if(!l.feature) return;
        try { l.setStyle(styleArea(l.feature)); } catch(e){}
      });
    }
    LOG("Attack intensity bijgewerkt");
  }

  function clearCache(){
    return Promise.all([
      dbPut(CACHE_KEY, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_DS, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_ISW, { version: "cleared", t: 0, geojson: null }),
      dbPut(CACHE_KEY_SNAPSHOT, { version: "cleared", t: 0, geojson: null })
    ]).then(function(){ LOG("Caches gewist"); return true; });
  }

  function destroy(){
    stopPulse();
    if(CA.layer && CA.map){ try{ CA.map.removeLayer(CA.layer); }catch(e){} }
    CA.layer = null; CA.isInitialized = false; CA.isLoaded = false;
  }

  function getStats(){ return CA.stats; }

  /* Pauzeer pulse als de map-tab verlaat */
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
    state: CA, _version: "v5.0"
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

  /* Update intensity zodra nieuwe events binnenkomen */
  try {
    if(window.WarDesk && window.WarDesk.events){
      window.WarDesk.events.on("map:military-events", function(){
        if(CA.isInitialized){
          setTimeout(function(){ updateIntensity(); }, 500);
        }
      });
    }
  } catch(e){}

  LOG("conflict-areas.js v5.0 geladen (pulse + territory gain)");
})();