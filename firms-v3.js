/* ============================================================
   WAR DESK — firms-v3.js v1.0
   NASA FIRMS via publieke 24u CSV (geen API key nodig)
   - Download 6.9MB CSV één keer per 15 min
   - Filter lokaal op 8 conflictregio's
   - Brightness > 330K, FRP > 10 MW
   - Cache in IndexedDB om herhaald downloaden te voorkomen
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[FIRMS]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var CSV_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";
  var REFRESH_MS = 15 * 60 * 1000;
  var CACHE_MAX_AGE_MS = 10 * 60 * 1000;
  var BRIGHTNESS_MIN = 330;
  var FRP_MIN = 10;

  /* Regio's als [minLng, minLat, maxLng, maxLat] */
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
    enabled: true,
    _csvCache: null,
    _csvCacheTime: 0
  };

  function getCacheKey(){
    return "wardesk_firms_csv_v1";
  }

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
    /* Stap 1: memory cache (binnen 10 min) */
    if(FIRMS._csvCache && (Date.now() - FIRMS._csvCacheTime) < CACHE_MAX_AGE_MS){
      LOG("CSV uit memory cache");
      return FIRMS._csvCache;
    }

    /* Stap 2: IndexedDB cache */
    var db = await openDB();
    if(db){
      var cached = await dbGet(db, getCacheKey());
      if(cached && cached.v && (Date.now() - cached.t) < CACHE_MAX_AGE_MS){
        LOG("CSV uit IndexedDB cache (" + Math.round(cached.v.length / 1024) + " KB)");
        FIRMS._csvCache = cached.v;
        FIRMS._csvCacheTime = cached.t;
        return cached.v;
      }
    }

    /* Stap 3: netwerk — direct eerst, dan proxy */
    LOG("CSV downloaden (kan 5-10s duren)...");
    var text;
    try {
      text = await fetchCsvDirect();
    } catch(e){
      LOG("Direct faalde: " + e.message + " — probeer proxy");
      text = await fetchCsvViaProxy();
    }

    if(!text || text.length < 100){
      throw new Error("CSV te kort (" + (text ? text.length : 0) + " chars)");
    }

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

    LOG("Header kolommen: lat=" + latIdx + " lng=" + lngIdx + " bright=" + brightIdx + " frp=" + frpIdx);

    if(latIdx < 0 || lngIdx < 0 || brightIdx < 0){
      LOG("Vereiste kolommen niet gevonden");
      return [];
    }

    var detections = [];
    var totalRows = lines.length - 1;
    var skippedRegion = 0;
    var skippedBright = 0;
    var skippedFrp = 0;
    var skippedConf = 0;
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

    LOG("CSV analyse: " + totalRows + " rijen | regio-skip:" + skippedRegion +
        " bright:" + skippedBright + " frp:" + skippedFrp + " conf:" + skippedConf +
        " → " + detections.length + " detecties");

    var keys = Object.keys(regionCounts);
    if(keys.length > 0){
      LOG("Verdeling: " + keys.map(function(k){ return k + ":" + regionCounts[k]; }).join(" · "));
    }

    return detections;
  }

  async function runNow(){
    if(FIRMS.isRunning) return FIRMS.detections;
    FIRMS.isRunning = true;
    var startTime = Date.now();
    LOG("Start — publieke CSV ophalen");

    try {
      var csvText = await getCsv();
      var detections = parseAndFilter(csvText);

      detections.sort(function(a, b){
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      FIRMS.detections = detections;
      FIRMS.lastRun = Date.now();
      var elapsed = Date.now() - startTime;
      LOG("Klaar — " + detections.length + " detecties | " + elapsed + "ms");

      renderDetections();

      try {
        if(window.WarDesk && WarDesk.events){
          WarDesk.events.emit("firms:detections", detections);
        }
      } catch(e){}

      try {
        localStorage.setItem("wardesk_firms_lastRun", String(FIRMS.lastRun));
        localStorage.setItem("wardesk_firms_count", String(detections.length));
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
    if(!mapInstance){
      setTimeout(renderDetections, 3000);
      return;
    }
    if(!FIRMS.layer) FIRMS.layer = L.layerGroup();
    FIRMS.layer.clearLayers();

    FIRMS.detections.forEach(function(d){
      var size = d.frp > 100 ? 14 : (d.frp > 30 ? 12 : 10);
      var color = d.frp > 100 ? "#ff2200" : (d.frp > 30 ? "#ff6a00" : "#ffaa00");
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

    if(FIRMS.enabled && !mapInstance.hasLayer(FIRMS.layer)){
      FIRMS.layer.addTo(mapInstance);
    }
    LOG("FIRMS: " + FIRMS.detections.length + " markers op kaart");
    ensureToggleButton();
  }

  function ensureToggleButton(){
    var controls = document.querySelector(".map-controls");
    if(!controls) return;
    if(document.getElementById("mapFirmsToggle")) return;
    var btn = document.createElement("button");
    btn.className = "map-ctrl";
    btn.id = "mapFirmsToggle";
    btn.setAttribute("aria-label", "Satelliet-detectie");
    btn.style.color = "#ff6a00";
    btn.style.borderColor = "rgba(255,106,0,0.6)";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>';
    btn.addEventListener("click", function(){
      FIRMS.enabled = !FIRMS.enabled;
      var mapInstance = getMapInstance();
      if(!mapInstance) return;
      if(FIRMS.enabled){
        if(FIRMS.layer && !mapInstance.hasLayer(FIRMS.layer)) FIRMS.layer.addTo(mapInstance);
        btn.style.color = "#ff6a00";
        btn.style.borderColor = "rgba(255,106,0,0.6)";
        if(window.showToast) window.showToast("Satelliet-detectie aan");
      } else {
        if(FIRMS.layer && mapInstance.hasLayer(FIRMS.layer)) mapInstance.removeLayer(FIRMS.layer);
        btn.style.color = "rgba(255,255,255,0.35)";
        btn.style.borderColor = "rgba(255,255,255,0.15)";
        if(window.showToast) window.showToast("Satelliet-detectie uit");
      }
    });
    controls.appendChild(btn);
  }

  function scheduleNext(){
    if(FIRMS._timer) clearTimeout(FIRMS._timer);
    FIRMS._timer = setTimeout(function(){
      FIRMS._timer = null;
      runNow().then(scheduleNext);
    }, REFRESH_MS);
  }

  function init(){
    var waitCount = 0;
    var waitTimer = setInterval(function(){
      waitCount++;
      if(getMapInstance()){
        clearInterval(waitTimer);
        runNow();
        scheduleNext();
      } else if(waitCount > 30){
        clearInterval(waitTimer);
        LOG("Geen map instance — FIRMS start niet");
      }
    }, 1000);
  }

  window.FIRMSDetect = {
    init: init,
    runNow: runNow,
    getDetections: function(){ return FIRMS.detections; },
    getLastRun: function(){ return FIRMS.lastRun; },
    _version: "v3.0"
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("firms-v3.js v1.0 geladen (publieke CSV, geen key)");
})();