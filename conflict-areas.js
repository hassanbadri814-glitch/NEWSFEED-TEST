/* ============================================================
   WAR DESK — conflict-areas.js v14.1
   - v14.1: migratie naar WDGeo, WDProxy, WD.safeCatch
   - v14.0: Saoedi-Arabië toegevoegd
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  function adm0Sources(iso3){
    return [
      "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_" + iso3 + "_0.json",
      "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_" + iso3 + "_0.json"
    ];
  }

  var CONFLICTS = {
    "UKR": {
      name: "Oekraïne", level: "ADM1", center: [49.0, 32.0, 6],
      parties: {
        "Rusland":  { color: "#C62828", fill: "#C62828" },
        "Oekraïne": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json"
      ],
      countrySources: adm0Sources("UKR")
    },
    "SYR": {
      name: "Syrië", level: "ADM2", center: [34.8, 38.9, 7],
      parties: {
        "Al-Sharaa-regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Druze-milities":     { color: "#9333EA", fill: "#9333EA" },
        "IS":                 { color: "#1F2937", fill: "#1F2937" },
        "Israël (bezet)":     { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SYR_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SYR_2.json"
      ],
      countrySources: adm0Sources("SYR")
    },
    "LBN": {
      name: "Libanon", level: "ADM2", center: [33.85, 35.86, 8],
      parties: {
        "Libanese staat": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Hezbollah":      { color: "#FBC02D", fill: "#FBC02D" },
        "Israël (bezet)": { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_LBN_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_LBN_2.json"
      ],
      countrySources: adm0Sources("LBN")
    },
    "YEM": {
      name: "Jemen", level: "ADM1", center: [15.55, 48.52, 6],
      parties: {
        "Regering":  { color: "#2A6FDB", fill: "#2A6FDB" },
        "Houthi's":  { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_YEM_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_YEM_1.json"
      ],
      countrySources: adm0Sources("YEM")
    },
    "SAU": {
      name: "Saoedi-Arabië", level: "ADM1", center: [24.71, 46.68, 5],
      parties: {
        "Saoedi-Arabië": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SAU_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SAU_1.json"
      ],
      countrySources: adm0Sources("SAU")
    },
    "SDN": {
      name: "Soedan", level: "ADM1", center: [15.55, 32.53, 6],
      parties: {
        "Regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "RSF":      { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SDN_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SDN_1.json"
      ],
      countrySources: adm0Sources("SDN")
    },
    "ISR": {
      name: "Israël", level: "ADM1", center: [31.4, 34.9, 7],
      parties: { "Israël": { color: "#C62828", fill: "#C62828" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ISR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ISR_1.json"
      ],
      countrySources: adm0Sources("ISR")
    },
    "PSE": {
      name: "Palestina", level: "ADM1", center: [31.95, 35.23, 8],
      parties: { "Palestina": { color: "#2A6FDB", fill: "#2A6FDB" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PSE_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PSE_1.json"
      ],
      countrySources: adm0Sources("PSE")
    },
    "ETH": {
      name: "Ethiopië", level: "ADM1", center: [11.0, 39.0, 6],
      parties: {
        "Federale regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "TPLF (Tigray)":     { color: "#F59E0B", fill: "#F59E0B" },
        "Fano (Amhara)":     { color: "#C62828", fill: "#C62828" },
        "OLA (Oromia)":      { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ETH_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ETH_1.json"
      ],
      countrySources: adm0Sources("ETH")
    },
    "MMR": {
      name: "Myanmar", level: "ADM1", center: [21.9, 95.9, 6],
      parties: {
        "Militaire junta": { color: "#C62828", fill: "#C62828" },
        "Arakan Army":     { color: "#F59E0B", fill: "#F59E0B" },
        "KIA (Kachin)":    { color: "#9333EA", fill: "#9333EA" },
        "KNU (Karen)":     { color: "#3B82F6", fill: "#3B82F6" },
        "NUG (verzet)":    { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_MMR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_MMR_1.json"
      ],
      countrySources: adm0Sources("MMR")
    },
    "MLI": {
      name: "Mali", level: "ADM1", center: [17.6, -4.0, 6],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "FLA (Toeareg)":     { color: "#F59E0B", fill: "#F59E0B" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_MLI_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_MLI_1.json"
      ],
      countrySources: adm0Sources("MLI")
    },
    "BFA": {
      name: "Burkina Faso", level: "ADM1", center: [12.3, -1.6, 7],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_BFA_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_BFA_1.json"
      ],
      countrySources: adm0Sources("BFA")
    },
    "NER": {
      name: "Niger", level: "ADM1", center: [17.6, 8.1, 6],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" },
        "Boko Haram/ISWAP":  { color: "#F59E0B", fill: "#F59E0B" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_NER_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_NER_1.json"
      ],
      countrySources: adm0Sources("NER")
    },
    "COD": {
      name: "DR Congo", level: "ADM1", center: [-2.5, 26.0, 6],
      parties: {
        "Regering (FARDC)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "M23/AFC":          { color: "#C62828", fill: "#C62828" },
        "FDLR (Rwanda)":    { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_COD_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_COD_1.json"
      ],
      countrySources: adm0Sources("COD")
    },
    "PAK": {
      name: "Pakistan", level: "ADM1", center: [30.4, 69.3, 6],
      parties: {
        "Pakistan (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Afghanistan (Taliban)": { color: "#C62828", fill: "#C62828" },
        "India (grens)":         { color: "#F59E0B", fill: "#F59E0B" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PAK_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PAK_1.json"
      ],
      countrySources: adm0Sources("PAK")
    }
  };

  var ACTIVE_CONFLICTS = [
    "SYR", "LBN", "YEM", "SAU", "ISR", "PSE",
    "UKR",
    "SDN", "ETH",
    "MLI", "BFA", "NER",
    "COD",
    "MMR", "PAK"
  ];

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";

  var PANES = {
    province:      { name: "caPaneProvince",      z: 420 },
    countryShadow: { name: "caPaneCountryShadow", z: 430 },
    country:       { name: "caPaneCountry",       z: 440 }
  };

  var COLORS = {
    provinceBorder: "rgba(255,255,255,0.18)",
    countryBorder:  "rgba(255,255,255,0.80)",
    underAttack:    "#e63950"
  };

  var FILL_OPACITY = 0.55;
  var ATTACK_RING_THRESHOLD = 0.4;
  var ATTACK_RING_THRESHOLD_HIGH = 0.7;

  function provinceWeight(z){
    if(z <= 4) return 0.35;
    if(z <= 6) return 0.55;
    if(z <= 8) return 0.75;
    return 0.95;
  }
  function provinceOpacity(z){
    if(z <= 4) return 0.15;
    if(z <= 6) return 0.25;
    if(z <= 8) return 0.35;
    return 0.45;
  }

  var CA = {
    map: null, layers: {}, countryLayers: {}, geojsons: {}, countryGeojsons: {},
    isLoaded: false, isInitialized: false, panel: null,
    isMapActive: true, _currentConflictIso: null, _currentConflict: null
  };

  var db = null;
  var _initPromise = null;

  function getConflict(iso){ return CONFLICTS[iso] || null; }

  /* ─── GEO HELPERS: alles via WDGeo ─── */
  var G = window.WDGeo || {};
  function pointInRing(x,y,r){ return G.pointInRing ? G.pointInRing(x,y,r) : false; }
  function pointInGeometry(x,y,g){ return G.pointInGeometry ? G.pointInGeometry(x,y,g) : false; }
  function featureContainsPoint(f,x,y){ return G.featureContainsPoint ? G.featureContainsPoint(f,x,y) : false; }
  function getCentroid(f){ return G.getCentroid ? G.getCentroid(f) : null; }

  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains(STORE_GEOJSON)) d.createObjectStore(STORE_GEOJSON, { keyPath: "k" });
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

  /* ─── FETCH: alles via WDProxy ─── */
  function fetchViaProxy(url){
    if (window.WDProxy && WDProxy.fetchJSON){
      return WDProxy.fetchJSON(url);
    }
    /* Fallback voor als WDProxy niet geladen is */
    var proxies = [
      "https://newsfeed2.hassanbadri814.workers.dev/?url=",
      "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
      "https://api.allorigins.win/raw?url="
    ];
    var idx = 0;
    function tryNext(){
      if(idx >= proxies.length) return Promise.reject(new Error("Alle proxies faalden"));
      var fullUrl = proxies[idx++] + encodeURIComponent(url);
      return fetch(fullUrl).then(function(r){
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).catch(function(){ return tryNext(); });
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
      f.properties = { id: id, name: name, provinceName: provinceName, iso: iso, attack_intensity: 0, attack_count: 0 };
    });
    return json;
  }

  function fetchOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.oblastSources) return Promise.reject(new Error("Geen bronnen"));
    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.oblastSources.length) return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      return fetchViaProxy(conflict.oblastSources[idx])
        .then(function(json){ if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON"); return normalizeArea(json, conflict.level); })
        .catch(function(e){ lastErr = e; return trySource(idx+1); });
    }
    return trySource(0);
  }

  function fetchCountry(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.countrySources) return Promise.reject(new Error("Geen country bronnen"));
    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.countrySources.length) return Promise.reject(lastErr || new Error("Alle country bronnen faalden"));
      return fetchViaProxy(conflict.countrySources[idx])
        .then(function(json){ if(!isValidGeoJSON(json)) throw new Error("Ongeldige country GeoJSON"); return json; })
        .catch(function(e){ lastErr = e; return trySource(idx+1); });
    }
    return trySource(0);
  }

  function loadOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict) return Promise.reject(new Error("Geen conflict"));
    var cacheKey = "ca_oblasts_" + conflictIso;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && isValidGeoJSON(cached.v)) return cached.v;
      return fetchOblasts(conflictIso).then(function(json){ return dbPut(cacheKey, json).then(function(){ return json; }); });
    });
  }

  function loadCountry(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.countrySources) return Promise.resolve(null);
    var cacheKey = "ca_country_" + conflictIso;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && isValidGeoJSON(cached.v)) return cached.v;
      return fetchCountry(conflictIso).then(function(json){ return dbPut(cacheKey, json).then(function(){ return json; }); }).catch(WD && WD.safeCatch ? WD.safeCatch("loadCountry") : function(){ return null; });
    });
  }

  function calculateAttackIntensity(conflictIso){
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;
    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)) events = window.MAPAPI.state.events;
    } catch(e){
      try { wdLog.warn("[AREA] events ophalen faalde:", e.message); } catch(err){}
    }
    if(!events.length) return;

    geojson.features.forEach(function(f){ if(f.properties){ f.properties.attack_intensity = 0; f.properties.attack_count = 0; } });

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

    geojson.features.forEach(function(f){
      if(!f.properties) return;
      var count = countByArea[f.properties.id] || 0;
      var intensity = Math.min(1, Math.log(1 + count) / Math.log(21));
      f.properties.attack_intensity = Math.round(intensity * 100) / 100;
      f.properties.attack_count = count;
    });
  }

  function styleProvince(feature){
    var props = (feature && feature.properties) || {};
    var conflict = CA._currentConflict;
    var z = CA.map ? CA.map.getZoom() : 6;
    var baseWeight = provinceWeight(z);
    var baseOpacity = provinceOpacity(z);

    var baseline = null;
    if (window.WDBaseline && CA._currentConflictIso){
      baseline = window.WDBaseline.get(CA._currentConflictIso, props.name, props.provinceName);
    }

    var fillActor = baseline ? baseline.controller : null;
    var fillColor = "transparent";
    if (fillActor && conflict && conflict.parties && conflict.parties[fillActor]){
      fillColor = conflict.parties[fillActor].fill;
    }

    var result = {
      fillColor: fillColor, fillOpacity: fillActor ? FILL_OPACITY : 0,
      color: COLORS.provinceBorder, weight: baseWeight, opacity: baseOpacity,
      dashArray: null, lineCap: "round", lineJoin: "round", interactive: true
    };

    if (fillActor){
      result.weight = Math.max(baseWeight, 1.3);
      result.opacity = Math.max(baseOpacity, 0.55);
    }

    var attackIntensity = props.attack_intensity || 0;
    if (attackIntensity >= ATTACK_RING_THRESHOLD_HIGH){
      result.color = COLORS.underAttack;
      result.weight = Math.max(baseWeight, 2.5);
      result.opacity = 1.0;
      result.dashArray = "3 2";
    } else if (attackIntensity >= ATTACK_RING_THRESHOLD){
      result.color = COLORS.underAttack;
      result.weight = Math.max(baseWeight, 1.8);
      result.opacity = 0.85;
      result.dashArray = "5 3";
    }

    return result;
  }

  function renderLayer(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!CA.map || !geojson || !conflict) return;
    ensurePanes(CA.map);
    CA._currentConflictIso = conflictIso;
    CA._currentConflict = conflict;

    if (CA.layers[conflictIso]) try { CA.map.removeLayer(CA.layers[conflictIso]); } catch(e){}

    CA.layers[conflictIso] = L.geoJSON(geojson, {
      style: styleProvince,
      pane: PANES.province.name,
      smoothFactor: 1.5,
      onEachFeature: function(feature, layer){
        layer.on({
          click: function(e){
            try {
              if(L.DomEvent) L.DomEvent.stopPropagation(e);
              var area = { id: feature.properties.id, name: feature.properties.name, provinceName: feature.properties.provinceName, feature: feature, iso3: conflictIso };
              openPanel(area, conflictIso);
            } catch(err){
              try { wdLog.warn("[AREA] click handler faalde:", err.message); } catch(e2){}
            }
          }
        });
      }
    });
    CA.layers[conflictIso].addTo(CA.map);

    var countryJson = CA.countryGeojsons[conflictIso];
    if(countryJson && countryJson.features && countryJson.features.length){
      if (CA.countryLayers[conflictIso]) try { CA.map.removeLayer(CA.countryLayers[conflictIso]); } catch(e){}
      CA.countryLayers[conflictIso] = L.geoJSON(countryJson, {
        style: function(){ return { fillColor: "transparent", fillOpacity: 0, color: COLORS.countryBorder, weight: 1.0, opacity: 0.85, interactive: false }; },
        pane: PANES.country.name,
        smoothFactor: 1.5,
        interactive: false
      });
      CA.countryLayers[conflictIso].addTo(CA.map);
    }
  }

  function ensurePanes(map){
    Object.keys(PANES).forEach(function(key){
      var p = PANES[key];
      if(map.getPane(p.name)) return;
      map.createPane(p.name);
      map.getPane(p.name).style.zIndex = p.z;
      map.getPane(p.name).style.pointerEvents = "auto";
    });
  }

  function ensurePanel(){
    if (CA.panel) return CA.panel;
    var panel = document.createElement("div");
    panel.id = "caAreaPanel";
    panel.className = "wm-country-panel";
    panel.innerHTML =
      '<div class="wm-panel-head"><div class="wm-panel-title" id="caPanelTitle">—</div>' +
      '<button class="wm-panel-close" id="caPanelClose" aria-label="Sluiten">✕</button></div>' +
      '<div class="wm-panel-stats" id="caPanelStats"></div>' +
      '<div id="caPanelAdminSlot"></div>';
    document.body.appendChild(panel);
    CA.panel = panel;
    panel.querySelector("#caPanelClose").addEventListener("click", function(){ panel.classList.remove("show"); });
    return panel;
  }

  var _esc = function(s){
    if (window.WD && WD.escapeHtml) return WD.escapeHtml(s);
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  };

  function openPanel(area, conflictIso){
    try {
      var panel = ensurePanel();
      var props = area.feature.properties;

      var baseline = null;
      if (window.WDBaseline) baseline = window.WDBaseline.get(conflictIso, props.name, props.provinceName);

      panel.querySelector("#caPanelTitle").textContent = props.name || "?";

      var ctrlLabel = baseline ? baseline.controller : "Onbekend";
      var sinceLabel = baseline && baseline.since ? "sinds " + baseline.since : "";

      var attackIntensity = props.attack_intensity || 0;
      var attackLine = "";
      if (attackIntensity >= ATTACK_RING_THRESHOLD_HIGH){
        attackLine = '<div class="wm-panel-conf-detail" style="color:#e63950;font-weight:700">💥 ZWAAR ONDER VUUR — intensiteit ' + Math.round(attackIntensity * 100) + '% (' + (props.attack_count || 0) + ' events)</div>';
      } else if (attackIntensity >= ATTACK_RING_THRESHOLD){
        attackLine = '<div class="wm-panel-conf-detail" style="color:#e63950;font-weight:700">💥 Onder vuur — intensiteit ' + Math.round(attackIntensity * 100) + '% (' + (props.attack_count || 0) + ' events)</div>';
      }

      var statsEl = panel.querySelector("#caPanelStats");
      statsEl.innerHTML =
        '<div class="wm-panel-stat conf-high"><div class="wm-panel-stat-val">' + _esc(ctrlLabel) + '</div><div class="wm-panel-stat-lbl">Controller</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + (props.attack_count || 0) + '</div><div class="wm-panel-stat-lbl">Events (7d)</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + Math.round(attackIntensity * 100) + '%</div><div class="wm-panel-stat-lbl">Intensiteit</div></div>' +
        attackLine +
        '<div class="wm-panel-conf-detail">' + _esc(sinceLabel) + (baseline && baseline.source ? ' · bron: ' + _esc(baseline.source) : '') + '</div>';

      if (window.WDAdmin && window.WDAdmin.onPanelOpen){
        try { window.WDAdmin.onPanelOpen(area, conflictIso); } catch(e){
          try { wdLog.warn("[AREA] WDAdmin.onPanelOpen faalde:", e.message); } catch(e2){}
        }
      }

      requestAnimationFrame(function(){ panel.classList.add("show"); });
    } catch(err){
      try { wdLog.warn("[AREA] openPanel faalde:", err.message); } catch(e){}
    }
  }

  function logFeatureNames(conflictIso, oblastsJson){
    try {
      if (!oblastsJson || !oblastsJson.features) return;
      var names = oblastsJson.features.map(function(f){
        if (!f || !f.properties) return "?";
        return f.properties.name || "?";
      });
      var chunks = [];
      for (var i = 0; i < names.length; i += 8){
        chunks.push(names.slice(i, i + 8).join(" | "));
      }
      wdLog.info("[GADM " + conflictIso + "] " + names.length + " features:");
      chunks.forEach(function(chunk){
        wdLog.info("[GADM " + conflictIso + "]   " + chunk);
      });
    } catch(e){
      try { wdLog.warn("[AREA] logFeatureNames faalde:", e.message); } catch(e2){}
    }
  }

  function initOneConflict(conflictIso){
    return loadOblasts(conflictIso).then(function(oblastsJson){
      logFeatureNames(conflictIso, oblastsJson);
      CA.geojsons[conflictIso] = oblastsJson;
      return loadCountry(conflictIso).then(function(countryJson){
        CA.countryGeojsons[conflictIso] = countryJson;
        calculateAttackIntensity(conflictIso);
        renderLayer(conflictIso);
        return true;
      });
    }).catch(function(e){
      LOG("[" + conflictIso + "] Init faalde: " + (e.message || "?"));
      return false;
    });
  }

  function _doInit(){
    return openDB().then(function(){
      var batches = [];
      for(var i = 0; i < ACTIVE_CONFLICTS.length; i += 4) batches.push(ACTIVE_CONFLICTS.slice(i, i + 4));
      return batches.reduce(function(chain, batch){
        return chain.then(function(){
          return Promise.all(batch.map(function(iso){ return initOneConflict(iso); }));
        });
      }, Promise.resolve());
    }).then(function(){
      CA.isInitialized = true;
      CA.isLoaded = true;
      LOG("Init klaar — " + ACTIVE_CONFLICTS.length + " conflicten geladen (v14.1)");
      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("conflictareas:ready", { count: ACTIVE_CONFLICTS.length });
        }
      } catch(e){}
      return true;
    });
  }

  function init(mapInstance){
    if(CA.isInitialized) return Promise.resolve();
    if(_initPromise) return _initPromise;
    if(!mapInstance) return Promise.reject(new Error("Geen map instance"));
    CA.map = mapInstance;
    _initPromise = _doInit();
    return _initPromise;
  }

  function refreshLayerForIso(iso3){
    if (!CA.layers[iso3]) return;
    CA._currentConflictIso = iso3;
    CA._currentConflict = getConflict(iso3);
    CA.layers[iso3].eachLayer(function(l){
      if (l.feature) try { l.setStyle(styleProvince(l.feature)); } catch(e){}
    });
  }

  window.ConflictAreas = {
    init: init,
    state: CA,
    _version: "v14.1",
    _conflicts: CONFLICTS,
    _activeConflicts: ACTIVE_CONFLICTS,
    refreshLayer: refreshLayerForIso
  };

  var tries = 0, MAX = 240;
  function tryInit(){
    if(CA.isInitialized) return;
    tries++;
    var m = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
    if(m){
      init(m).catch(function(e){ LOG("Init FAALDE: " + (e.message || "?")); });
      return;
    }
    if(tries >= MAX) return;
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

  var _intensityTimer = null;
  try {
    if(window.WarDesk && window.WarDesk.events){
      window.WarDesk.events.on("map:military-events", function(){
        if(!CA.isInitialized) return;
        if(_intensityTimer) clearTimeout(_intensityTimer);
        _intensityTimer = setTimeout(function(){
          _intensityTimer = null;
          ACTIVE_CONFLICTS.forEach(function(iso){
            calculateAttackIntensity(iso);
            if (CA.layers[iso]){
              CA.layers[iso].eachLayer(function(l){
                if(l.feature) try { l.setStyle(styleProvince(l.feature)); } catch(e){}
              });
            }
          });
        }, 800);
      });
    }
  } catch(e){}

  LOG("conflict-areas.js v14.1 geladen (WDGeo + WDProxy + safeCatch)");

})();