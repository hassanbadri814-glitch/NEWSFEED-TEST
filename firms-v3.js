/* ============================================================
   WAR DESK — firms-v3.js v1.1
   - v1.1: FIRMS standaard UIT, duidelijk toggle, strengere filters
   - v3.0: publieke 24u CSV (geen API key nodig)
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[FIRMS]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var CSV_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";
  var REFRESH_MS = 15 * 60 * 1000;
  var CACHE_MAX_AGE_MS = 10 * 60 * 1000;

  /* Strengere filters v1.1 */
  var BRIGHTNESS_MIN = 340;
  var FRP_MIN = 30;
  var PREFER_NIGHT = false; /* true = alleen 's nachts (filtert industrie) */

  var REGIONS = [
    { name: "Oekraïne",      bbox: [22, 44, 40, 53] },
    { name: "Midden-Oosten", bbox: [34, 29, 60, 38] },
    { name: "Jemen",         bbox: [42, 12, 54, 19] },
    { name: "Sahel",         bbox: [-18, 10, 25, 25] },
    { name: "Soedan",        bbox: [22, 3, 48, 18] },
    { name: "DR Congo",      bbox: [12, -10, 32, 5] },
    { name: "Myanmar",       bbox: [92, 9, 102, 28] },
    { name: "Pakistan",      bbox: [60, 23, 78, 38] }
  ];

  var FIRMS = {
    detections: [],
    lastRun: 0,
    isRunning: false,
    _timer: null,
    layer: null,
    enabled: false,
    _csvCache: null,
    _csvCacheTime: 0
  };

  var ENABLED_KEY = "wardesk_firms_enabled";

  function loadEnabledState(){
    try {
      var saved = localStorage.getItem(ENABLED_KEY);
      if(saved === "1") FIRMS.enabled = true;
      else if(saved === "0") FIRMS.enabled = false;
    } catch(e){}
  }

  function saveEnabledState(){
    try { localStorage.setItem(ENABLED_KEY, FIRMS.enabled ? "1" : "0"); } catch(e){}
  }

  function getCacheKey(){ return "wardesk_firms_csv_v1"; }

  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open("wardesk_firms_db", 1);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains("csv")){
            d.createObjectStore("csv", { keyPath: "k" });
          }
        };
        req.onsuccess = function(e){ resolve(e.target.result); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function dbGet(db, key){
    if(!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction("csv", "readonly");
        var r = tx.objectStore("csv").get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function dbPut(db, key, value){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction("csv", "readwrite");
        tx.objectStore("csv").put({ k: key, v: value, t: Date.now() });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function fetchCsvDirect(){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 60000);
    return fetch(CSV_URL, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .catch(function(e){ clearTimeout(timer); throw e; });
  }

  function fetchCsvViaProxy(){
    var proxies = (window.CONFIG && CONFIG.proxies && CONFIG.proxies.length)
      ? CONFIG.proxies.slice()
      : ["https://newsfeed2.hassanbadri814.workers.dev/?url="];
    var idx = 0;
    function tryNext(){
      if(idx >= proxies.length) return Promise.reject(new Error("Alle proxies faalden"));
      var proxy = proxies[idx++];
      var fullUrl = proxy + encodeURIComponent(CSV_URL);
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, 60000);
      return fetch(fullUrl, { signal: ctrl.signal })
        .then(function(r){
          clearTimeout(timer);
          if(!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .catch(function(e){
          clearTimeout(timer);
          return tryNext();
        });
    }
    return tryNext();
  }

  async function getCsv(){
    if(FIRMS._csvCache && (Date.now() - FIRMS._csvCacheTime) < CACHE_MAX_AGE_MS){
      LOG("CSV uit memory cache");
      return FIRMS._csvCache;
    }
    var db = await openDB();
    if(db){
      var cached = await dbGet(db, getCacheKey());
      if(cached && cached.v && (Date.now() - cached.t) < CACHE_MAX_AGE_MS){
        LOG("CSV uit IndexedDB cache");
        FIRMS._csvCache = cached.v;
        FIRMS._csvCacheTime = cached.t;
        return cached.v;
      }
    }
    LOG("CSV downloaden (5-10s)...");
    var text;
    try {
      text = await fetchCsvDirect();
    } catch(e){
      LOG("Direct faalde — proxy");
      text = await fetchCsvViaProxy();
    }
    if(!text || text.length < 100) throw new Error("CSV te kort");
    FIRMS._csvCache = text;
    FIRMS._csvCacheTime = Date.now();
    if(db) dbPut(db, getCacheKey(), text);
    LOG("CSV geladen: " + Math.round(text.length / 1024) + " KB");
    return text;
  }

  function inBbox(lat, lng, bbox){
    return lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3];
  }

  function findRegion(lat, lng){
    for(var i = 0; i < REGIONS.length; i++){
      if(inBbox(lat, lng, REGIONS[i].bbox)) return REGIONS[i].name;
    }
    return null;
  }

  function parseAndFilter(csvText){
    var lines = csvText.split("\n");
    if(lines.length < 2) return [];
    var header = lines[0].trim().split(",");
    var latIdx = header.indexOf("latitude");
    var lngIdx = header.indexOf("longitude");
    var brightIdx = header.indexOf("bright_ti4");
    var dateIdx = header.indexOf("acq_date");
    var timeIdx = header.indexOf("acq_time");
    var confIdx = header.indexOf("confidence");
    var frpIdx = header.indexOf("frp");
    var daynightIdx = header.indexOf("daynight");
    if(latIdx < 0 || lngIdx < 0 || brightIdx < 0) return [];

    var detections = [];
    var skippedRegion = 0, skippedBright = 0, skippedFrp = 0, skippedConf = 0, skippedDay = 0;
    var regionCounts = {};

    for(var i = 1; i < lines.length; i++){
      var parts = lines[i].trim().split(",");
      if(parts.length < 10) continue;
      var lat = parseFloat(parts[latIdx]);
      var lng = parseFloat(parts[lngIdx]);
      if(isNaN(lat) || isNaN(lng)) continue;
      var region = findRegion(lat, lng);
      if(!region){ skippedRegion++; continue; }
      var bright = parseFloat(parts[brightIdx]) || 0;
      if(bright < BRIGHTNESS_MIN){ skippedBright++; continue; }
      var frp = parseFloat(parts[frpIdx]) || 0;
      if(frp < FRP_MIN){ skippedFrp++; continue; }
      var conf = parts[confIdx] || "";
      if(conf === "l" || conf === "low"){ skippedConf++; continue; }
      if(PREFER_NIGHT && daynightIdx >= 0){
        var dn = parts[daynightIdx] || "";
        if(dn === "D"){ skippedDay++; continue; }
      }

      var dateStr = parts[dateIdx] || "";
      var timeStr = parts[timeIdx] || "0";
      var timestamp = null;
      try {
        var y = parseInt(dateStr.substring(0,4), 10);
        var mo = parseInt(dateStr.substring(5,7), 10) - 1;
        var d = parseInt(dateStr.substring(8,10), 10);
        var t = parseInt(timeStr, 10);
        var hh = Math.floor(t / 100);
        var mm = t % 100;
        timestamp = new Date(Date.UTC(y, mo, d, hh, mm)).getTime();
      } catch(e){ continue; }

      regionCounts[region] = (regionCounts[region] || 0) + 1;
      detections.push({
        id: "firms-" + lat.toFixed(4) + "-" + lng.toFixed(4) + "-" + timestamp,
        lat: lat, lng: lng,
        brightness: Math.round(bright),
        frp: Math.round(frp),
        confidence: conf,
        date: new Date(timestamp).toISOString(),
        region: region,
        _source: "firms"
      });
    }

    LOG("Analyse: regio-skip:" + skippedRegion + " bright:" + skippedBright +
        " frp:" + skippedFrp + " conf:" + skippedConf +
        (PREFER_NIGHT ? " day:" + skippedDay : "") +
        " → " + detections.length + " kept");
    return detections;
  }

  async function runNow(){
    if(!FIRMS.enabled){
      LOG("FIRMS uitgeschakeld — skip");
      return [];
    }
    if(FIRMS.isRunning) return FIRMS.detections;
    FIRMS.isRunning = true;
    var startTime = Date.now();
    LOG("Start");
    try {
      var csvText = await getCsv();
      var detections = parseAndFilter(csvText);
      detections.sort(function(a, b){
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      FIRMS.detections = detections;
      FIRMS.lastRun = Date.now();
      LOG("Klaar — " + detections.length + " detecties | " + (Date.now() - startTime) + "ms");
      renderDetections();
      try {
        if(window.WarDesk && WarDesk.events){
          WarDesk.events.emit("firms:detections", detections);
        }
      } catch(e){}
      return detections;
    } catch(e){
      LOG("FOUT: " + e.message);
      return [];
    } finally {
      FIRMS.isRunning = false;
    }
  }

  function getMapInstance(){
    if(window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance){
      return window.MAPAPI.state.instance;
    }
    return null;
  }

  function renderDetections(){
    var mapInstance = getMapInstance();
    if(!mapInstance) return;
    if(!FIRMS.layer) FIRMS.layer = L.layerGroup();
    FIRMS.layer.clearLayers();

    if(!FIRMS.enabled){
      if(mapInstance.hasLayer(FIRMS.layer)) mapInstance.removeLayer(FIRMS.layer);
      return;
    }

    FIRMS.detections.forEach(function(d){
      var size = d.frp > 100 ? 14 : (d.frp > 50 ? 12 : 10);
      var color = d.frp > 100 ? "#ff2200" : (d.frp > 50 ? "#ff6a00" : "#ffaa00");
      var icon = L.divIcon({
        className: "firms-marker",
        html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';box-shadow:0 0 10px ' + color + ';border:1px solid rgba(255,255,255,0.9);"></div>',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });
      var marker = L.marker([d.lat, d.lng], { icon: icon });
      var timeAgo = Math.round((Date.now() - new Date(d.date).getTime()) / 60000);
      var timeStr = timeAgo < 60 ? timeAgo + " min" : Math.round(timeAgo/60) + " u";
      marker.bindTooltip(
        '<b>🔥 Satelliet-detectie</b><br>' +
        'Brightness: ' + d.brightness + 'K<br>' +
        'FRP: ' + d.frp + ' MW<br>' +
        'Confidence: ' + d.confidence + '<br>' +
        'Regio: ' + d.region + '<br>' +
        'Tijd: ' + timeStr + ' geleden',
        { direction: "top", className: "wm-tooltip", offset: [0, -6] }
      );
      FIRMS.layer.addLayer(marker);
    });

    if(!mapInstance.hasLayer(FIRMS.layer)){
      FIRMS.layer.addTo(mapInstance);
    }
    LOG("Render: " + FIRMS.detections.length + " markers");
    ensureToggleButton();
  }

  function ensureToggleButton(){
    var controls = document.querySelector(".map-controls");
    if(!controls) return;
    if(document.getElementById("mapFirmsToggle")){
      updateToggleAppearance();
      return;
    }
    var btn = document.createElement("button");
    btn.className = "map-ctrl";
    btn.id = "mapFirmsToggle";
    btn.setAttribute("aria-label", "Satelliet-detectie aan/uit");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>';
    btn.addEventListener("click", toggleFirms);
    controls.appendChild(btn);
    updateToggleAppearance();
  }

  function updateToggleAppearance(){
    var btn = document.getElementById("mapFirmsToggle");
    if(!btn) return;
    if(FIRMS.enabled){
      btn.style.color = "#ff6a00";
      btn.style.borderColor = "rgba(255,106,0,0.8)";
      btn.style.boxShadow = "0 0 14px rgba(255,106,0,0.5)";
      btn.style.opacity = "1";
    } else {
      btn.style.color = "rgba(255,255,255,0.35)";
      btn.style.borderColor = "rgba(255,255,255,0.15)";
      btn.style.boxShadow = "none";
      btn.style.opacity = "0.6";
    }
  }

  function toggleFirms(){
    FIRMS.enabled = !FIRMS.enabled;
    saveEnabledState();
    updateToggleAppearance();

    if(FIRMS.enabled){
      if(window.showToast) window.showToast("🔥 Satelliet-detectie AAN");
      if(FIRMS.detections.length === 0){
        runNow();
      } else {
        renderDetections();
      }
    } else {
      if(window.showToast) window.showToast("Satelliet-detectie UIT");
      var mapInstance = getMapInstance();
      if(mapInstance && FIRMS.layer && mapInstance.hasLayer(FIRMS.layer)){
        mapInstance.removeLayer(FIRMS.layer);
      }
    }
  }

  function scheduleNext(){
    if(FIRMS._timer) clearTimeout(FIRMS._timer);
    FIRMS._timer = setTimeout(function(){
      FIRMS._timer = null;
      if(FIRMS.enabled){
        runNow().then(scheduleNext);
      } else {
        scheduleNext();
      }
    }, REFRESH_MS);
  }

  function init(){
    loadEnabledState();
    LOG("Init — enabled: " + FIRMS.enabled);
    var waitCount = 0;
    var waitTimer = setInterval(function(){
      waitCount++;
      if(getMapInstance()){
        clearInterval(waitTimer);
        ensureToggleButton();
        if(FIRMS.enabled){
          runNow();
        } else {
          LOG("FIRMS uit — wacht op toggle");
        }
        scheduleNext();
      } else if(waitCount > 30){
        clearInterval(waitTimer);
      }
    }, 1000);
  }

  window.FIRMSDetect = {
    init: init,
    runNow: runNow,
    toggle: toggleFirms,
    isEnabled: function(){ return FIRMS.enabled; },
    setEnabled: function(v){
      FIRMS.enabled = !!v;
      saveEnabledState();
      updateToggleAppearance();
      if(FIRMS.enabled) runNow(); else {
        var m = getMapInstance();
        if(m && FIRMS.layer && m.hasLayer(FIRMS.layer)) m.removeLayer(FIRMS.layer);
      }
    },
    getDetections: function(){ return FIRMS.detections; },
    getLastRun: function(){ return FIRMS.lastRun; },
    _version: "v1.1"
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("firms-v3.js v1.1 geladen (default OFF)");
})();