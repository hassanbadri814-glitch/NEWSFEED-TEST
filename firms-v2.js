/* ============================================================
   WAR DESK — firms.js v1.0d (DEBUG)
   Voegt uitgebreide logging toe om te zien wat de proxy retourneert
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[FIRMS]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var MAP_KEY = "3bebfbeb07719b8f8d5e7247fad69338";
  var REFRESH_MS = 15 * 60 * 1000;
  var MAX_AGE_HOURS = 24;
  var BRIGHTNESS_MIN = 330;
  var FRP_MIN = 10;
  var SOURCE = "VIIRS_SNPP_NRT";
  var DAY_RANGE = 1;

  var REGIONS = [
    { name: "Oekraïne",       bbox: "22,44,40,53" },
    { name: "Midden-Oosten",  bbox: "34,29,60,38" },
    { name: "Jemen",          bbox: "42,12,54,19" },
    { name: "Sahel",          bbox: "-18,10,25,25" },
    { name: "Soedan",         bbox: "22,3,48,18" },
    { name: "DR Congo",       bbox: "12,-10,32,5" },
    { name: "Myanmar",        bbox: "92,9,102,28" },
    { name: "Pakistan",       bbox: "60,23,78,38" }
  ];

  var FIRMS = {
    detections: [],
    lastRun: 0,
    isRunning: false,
    _timer: null,
    layer: null,
    enabled: true
  };

  function buildFirmsUrl(bbox){
    return "https://firms.modaps.eosdis.nasa.gov/api/area/csv/" +
      MAP_KEY + "/" + SOURCE + "/" + bbox + "/" + DAY_RANGE;
  }

  function fetchViaProxy(targetUrl){
    var proxies = (window.CONFIG && CONFIG.proxies && CONFIG.proxies.length)
      ? CONFIG.proxies.slice()
      : ["https://newsfeed2.hassanbadri814.workers.dev/?url="];
    var idx = 0;
    function tryNext(){
      if(idx >= proxies.length) return Promise.reject(new Error("Alle proxies faalden"));
      var proxy = proxies[idx++];
      var fullUrl = proxy + encodeURIComponent(targetUrl);
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, 20000);
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

  function parseCsvLine(line){
    return line.split(",");
  }

  function parseFirmsCsv(text, regionConfig, debugInfo){
    if(!text || text.length < 50){
      debugInfo.reason = "text te kort (" + (text ? text.length : 0) + " chars)";
      return [];
    }

    /* DEBUG: log eerste 300 chars */
    var preview = text.substring(0, 300).replace(/\n/g, " | ");
    LOG(regionConfig.name + " RAW: " + preview);

    var lines = text.trim().split("\n");
    if(lines.length < 2){
      debugInfo.reason = "minder dan 2 regels (" + lines.length + ")";
      return [];
    }

    var header = parseCsvLine(lines[0].trim());
    LOG(regionConfig.name + " HEADER (" + header.length + " cols): " + header.join(" / "));

    var latIdx = header.indexOf("latitude");
    var lngIdx = header.indexOf("longitude");
    var brightIdx = header.indexOf("bright_ti4");
    var dateIdx = header.indexOf("acq_date");
    var timeIdx = header.indexOf("acq_time");
    var confIdx = header.indexOf("confidence");
    var frpIdx = header.indexOf("frp");

    debugInfo.header = header;
    debugInfo.latIdx = latIdx;
    debugInfo.lngIdx = lngIdx;
    debugInfo.brightIdx = brightIdx;
    debugInfo.dateIdx = dateIdx;
    debugInfo.timeIdx = timeIdx;
    debugInfo.confIdx = confIdx;
    debugInfo.frpIdx = frpIdx;
    debugInfo.totalLines = lines.length;

    if(latIdx < 0 || lngIdx < 0){
      debugInfo.reason = "lat/lng kolommen niet gevonden";
      return [];
    }

    var detections = [];
    var cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
    var skippedBright = 0;
    var skippedFrp = 0;
    var skippedConf = 0;
    var skippedOld = 0;
    var skippedParse = 0;

    for(var i = 1; i < lines.length; i++){
      var parts = parseCsvLine(lines[i].trim());
      if(parts.length < 5){ skippedParse++; continue; }
      var lat = parseFloat(parts[latIdx]);
      var lng = parseFloat(parts[lngIdx]);
      var bright = parseFloat(parts[brightIdx]) || 0;
      var date = parts[dateIdx] || "";
      var time = parts[timeIdx] || "0";
      var conf = parts[confIdx] || "";
      var frp = parseFloat(parts[frpIdx]) || 0;
      if(isNaN(lat) || isNaN(lng)){ skippedParse++; continue; }
      if(bright < BRIGHTNESS_MIN){ skippedBright++; continue; }
      if(frp < FRP_MIN){ skippedFrp++; continue; }
      if(conf === "l"){ skippedConf++; continue; }
      var timestamp = null;
      try {
        var year = parseInt(date.substring(0,4), 10);
        var month = parseInt(date.substring(5,7), 10) - 1;
        var day = parseInt(date.substring(8,10), 10);
        var timeInt = parseInt(time, 10);
        var hour = Math.floor(timeInt / 100);
        var min = timeInt % 100;
        timestamp = new Date(Date.UTC(year, month, day, hour, min)).getTime();
      } catch(e){ skippedParse++; continue; }
      if(timestamp < cutoff){ skippedOld++; continue; }
      detections.push({
        id: "firms-" + lat.toFixed(4) + "-" + lng.toFixed(4) + "-" + timestamp,
        lat: lat, lng: lng,
        brightness: Math.round(bright),
        frp: Math.round(frp),
        confidence: conf,
        date: new Date(timestamp).toISOString(),
        region: regionConfig.name,
        _source: "firms"
      });
    }

    debugInfo.skippedBright = skippedBright;
    debugInfo.skippedFrp = skippedFrp;
    debugInfo.skippedConf = skippedConf;
    debugInfo.skippedOld = skippedOld;
    debugInfo.skippedParse = skippedParse;
    debugInfo.kept = detections.length;

    return detections;
  }

  async function runNow(){
    if(FIRMS.isRunning) return FIRMS.detections;
    FIRMS.isRunning = true;
    var startTime = Date.now();
    LOG("Start — " + REGIONS.length + " regio's");
    var allDetections = [];
    var okCount = 0;
    var failCount = 0;

    for(var i = 0; i < REGIONS.length; i++){
      var region = REGIONS[i];
      var debugInfo = { region: region.name };
      try {
        var url = buildFirmsUrl(region.bbox);
        LOG(region.name + " URL: " + url);
        var text = await fetchViaProxy(url);
        var detections = parseFirmsCsv(text, region, debugInfo);
        allDetections = allDetections.concat(detections);
        okCount++;
        LOG(region.name + " → " + detections.length + " kept | " +
            "skip bright:" + (debugInfo.skippedBright||0) +
            " frp:" + (debugInfo.skippedFrp||0) +
            " conf:" + (debugInfo.skippedConf||0) +
            " old:" + (debugInfo.skippedOld||0) +
            " parse:" + (debugInfo.skippedParse||0));
        if(debugInfo.reason){
          LOG(region.name + " REASON: " + debugInfo.reason);
        }
      } catch(e){
        failCount++;
        LOG(region.name + " faalde: " + e.message);
      }
      if(i < REGIONS.length - 1){
        await new Promise(function(r){ setTimeout(r, 500); });
      }
    }

    var seen = {};
    var unique = [];
    allDetections.forEach(function(d){
      if(!seen[d.id]){ seen[d.id] = 1; unique.push(d); }
    });
    unique.sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    FIRMS.detections = unique;
    FIRMS.lastRun = Date.now();
    FIRMS.isRunning = false;
    var elapsed = Date.now() - startTime;
    LOG("Klaar — " + unique.length + " detecties uit " + okCount + "/" + REGIONS.length + " regio's | " + elapsed + "ms");

    renderDetections();

    try {
      if(window.WarDesk && WarDesk.events){
        WarDesk.events.emit("firms:detections", unique);
      }
    } catch(e){}

    return unique;
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
      LOG("Geen map instance — probeer later");
      setTimeout(renderDetections, 3000);
      return;
    }
    if(!FIRMS.layer){
      FIRMS.layer = L.layerGroup();
    }
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
    _version: "v1.0d"
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("firms.js v1.0d geladen (DEBUG)");
})();