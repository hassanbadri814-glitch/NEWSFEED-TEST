/* ============================================================
   WAR DESK — boot-check.js v1.0
   Controleert na 3 seconden of alle verwachte modules geladen
   zijn. Rapporteert ontbrekende modules in de debug-log en
   toont een rode banner als kritieke modules missen.
   ============================================================ */

(function(){
  "use strict";

  var LOG_INFO  = function(){ try{ wdLog.info.apply(null, arguments); }catch(e){} };
  var LOG_WARN  = function(){ try{ wdLog.warn.apply(null, arguments); }catch(e){} };
  var LOG_ERR   = function(){ try{ wdLog.error.apply(null, arguments); }catch(e){} };

  var REQUIRED = [
    { name: "WDStorage",        file: "storage.js",           critical: true  },
    { name: "WarDesk",          file: "utils.js",             critical: true  },
    { name: "WDClassifier",     file: "classifier.js",        critical: true  },
    { name: "WDCityActors",     file: "city-actors.js",       critical: false },
    { name: "WDEventDetector",  file: "event-detector.js",    critical: true  },
    { name: "WDEventDedup",     file: "event-dedup.js",       critical: false },
    { name: "AIShared",         file: "ai-shared.js",         critical: false },
    { name: "WDBaseline",       file: "baseline.js",          critical: true  },
    { name: "CityStatus",       file: "city-status.js",       critical: true  },
    { name: "WorldMap",         file: "worldmap.js",          critical: true  },
    { name: "MapAI",            file: "ai-map.js",            critical: false },
    { name: "ProvinceMapper",   file: "province-mapper.js",   critical: false },
    { name: "ConflictAreas",    file: "conflict-areas.js",    critical: true  },
    { name: "WDCaptureTracker", file: "capture-tracker.js",   critical: false },
    { name: "OSINTFeeds",       file: "osint-feeds.js",       critical: false },
    { name: "NewsAPI",          file: "news-v27.js",          critical: true  },
    { name: "MAPAPI",           file: "map-v11.10.js",        critical: true  },
    { name: "WDAdmin",          file: "admin.js",             critical: false }
  ];

  var _hasRun = false;

  function check(label){
    var missing = [];
    var loaded = [];

    REQUIRED.forEach(function(r){
      if (window[r.name]) loaded.push(r.name);
      else missing.push(r);
    });

    if (missing.length === 0){
      if (!_hasRun){
        LOG_INFO("[BOOT] ✓ Alle " + REQUIRED.length + " modules geladen");
        _hasRun = true;
      }
      return { ok: true, missing: [] };
    }

    var critical = missing.filter(function(m){ return m.critical; });
    var nonCritical = missing.filter(function(m){ return !m.critical; });

    LOG_INFO("[BOOT " + label + "] " + loaded.length + "/" + REQUIRED.length + " modules geladen");

    if (critical.length){
      LOG_ERR("[BOOT " + label + "] ❌ KRITIEKE modules ontbreken: " +
        critical.map(function(m){ return m.name + " (" + m.file + ")"; }).join(", "));
    }
    if (nonCritical.length){
      LOG_WARN("[BOOT " + label + "] ⚠ Optionele modules ontbreken: " +
        nonCritical.map(function(m){ return m.name + " (" + m.file + ")"; }).join(", "));
    }

    if (critical.length){
      showBanner(critical);
    }

    _hasRun = true;
    return { ok: false, missing: missing, critical: critical };
  }

  function showBanner(missing){
    var existing = document.getElementById("wdBootErrorBanner");
    if (existing) existing.remove();

    var b = document.createElement("div");
    b.id = "wdBootErrorBanner";
    b.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:10000001;" +
      "background:linear-gradient(90deg,#b91c1c,#dc2626);color:#fff;" +
      "padding:10px 14px;font-size:12px;font-family:Inter,system-ui,sans-serif;" +
      "text-align:center;font-weight:600;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.6);" +
      "display:flex;align-items:center;justify-content:center;gap:10px;";

    b.innerHTML =
      '<span>⚠ ' + missing.length + ' kritieke module(s) ontbreken</span>' +
      '<button id="wdBootShowDetails" style="background:#fff;color:#b91c1c;border:0;border-radius:4px;padding:4px 10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:11px;">Details</button>' +
      '<button id="wdBootDismiss" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;font-family:inherit;font-size:11px;">Sluiten</button>';

    document.body.appendChild(b);

    document.getElementById("wdBootShowDetails").addEventListener("click", function(){
      var panel = document.getElementById("wdDebugPanel");
      if (panel) {
        panel.classList.add("show");
      } else {
        console.error("Debug panel niet gevonden. Missende modules:", missing);
      }
    });
    document.getElementById("wdBootDismiss").addEventListener("click", function(){
      b.remove();
    });
  }

  function scheduleChecks(){
    setTimeout(function(){ check("3s"); }, 3000);
    setTimeout(function(){
      var result = check("8s");
      if (!result.ok && result.critical && result.critical.length){
        // Laatste poging na 15 sec
        setTimeout(function(){ check("15s"); }, 7000);
      }
    }, 8000);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", scheduleChecks);
  } else {
    scheduleChecks();
  }

  window.WDBootCheck = {
    check: check,
    _version: "v1.0",
    _required: REQUIRED
  };
})();