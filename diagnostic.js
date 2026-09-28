/* ============================================================
   WAR DESK — diagnostic.js v1.3
   Forceert consensus run voordat diagnostic rapporteert.
   ============================================================ */

(function(){
  "use strict";

  function log(){
    try {
      var args = Array.prototype.slice.call(arguments);
      if(window.wdLog && wdLog.info){ wdLog.info.apply(null, ["[DIAG]"].concat(args)); }
    } catch(e){}
  }

  function runDiagnostic(){
    log("═══════════════════════════════");
    log("CONSENSUS DIAGNOSTIC v1.3");
    log("═══════════════════════════════");

    log("1. PM ready: " + (window.ProvinceMapper && ProvinceMapper.isReady()));
    log("   PM version: " + (window.ProvinceMapper && ProvinceMapper._version));
    log("   PC version: " + (window.ProvinceConsensus && ProvinceConsensus._version));
    log("   CA version: " + (window.ConflictAreas && ConflictAreas._version));

    var state = window.MAPAPI && window.MAPAPI.state;
    var events = [];
    if(state){
      if(Array.isArray(state.events) && state.events.length > 0) events = state.events;
      else if(Array.isArray(state.militaryEvents) && state.militaryEvents.length > 0) events = state.militaryEvents;
    }
    log("2. Totaal events: " + events.length);
    log("   (events=" + (state && state.events ? state.events.length : 0) +
        ", militaryEvents=" + (state && state.militaryEvents ? state.militaryEvents.length : 0) + ")");

    var withLatLng = events.filter(function(e){
      return typeof e.lat === "number" && typeof e.lng === "number";
    });
    log("3. Met lat/lng: " + withLatLng.length);

    var withActors = events.filter(function(e){
      return e.actorCountries && e.actorCountries.length > 0;
    });
    log("4. Met actors: " + withActors.length);

    var conflictCountry = events.filter(function(e){
      return ["SYR","UKR","RUS","YEM","ISR","LBN","PSE","SAU","IRQ","IRN"].indexOf(e.countryISO3) !== -1;
    });
    log("4b. In conflict-land: " + conflictCountry.length);

    var milOrCrime = events.filter(function(e){
      return e.category === "militair" || e.category === "crime";
    });
    log("5. Militair/crime: " + milOrCrime.length);

    var physical = milOrCrime.filter(function(e){
      return e.countsForHeat !== false;
    });
    log("6. Fysieke events: " + physical.length);

    var both = events.filter(function(e){
      return typeof e.lat === "number" && typeof e.lng === "number" &&
             e.countsForHeat !== false &&
             ["SYR","UKR","RUS","YEM","ISR","LBN","PSE","SAU","IRQ","IRN"].indexOf(e.countryISO3) !== -1;
    });
    log("7. ★ ALLE voorwaarden: " + both.length);

    try {
      var stats = ProvinceConsensus.getStats();
      log("11. Consensus: " + JSON.stringify(stats));
      var all = ProvinceConsensus.getAllConsensus();
      var keys = Object.keys(all);
      log("    GIDs (" + keys.length + "): " + (keys.length > 0 ? keys.slice(0, 5).join(", ") : "(leeg)"));
    } catch(err){
      log("11. ERROR: " + err.message);
    }

    log("═══════════════════════════════");
    log("EINDE DIAGNOSTIC");
    log("═══════════════════════════════");
  }

  function waitForReady(attempt){
    attempt = attempt || 0;
    var pmReady = window.ProvinceMapper && ProvinceMapper.isReady();
    var caReady = window.ConflictAreas && window.ConflictAreas.state && window.ConflictAreas.state.isInitialized;
    var state = window.MAPAPI && window.MAPAPI.state;
    var eventCount = 0;
    if(state){
      if(Array.isArray(state.events)) eventCount = Math.max(eventCount, state.events.length);
      if(Array.isArray(state.militaryEvents)) eventCount = Math.max(eventCount, state.militaryEvents.length);
    }

    /* v1.3: wacht tot events > 50 EN PM ready, dan forceer run + diagnostic */
    if(pmReady && caReady && eventCount > 50){
      log("Alles klaar — forceer consensus run...");
      if(window.ProvinceConsensus && ProvinceConsensus.runNow){
        ProvinceConsensus.runNow({ force: true }).then(function(){
          log("Consensus run voltooid — start diagnostic");
          try { runDiagnostic(); } catch(e){ log("FATAL: " + e.message); }
        }).catch(function(e){
          log("Consensus run faalde: " + e.message);
          try { runDiagnostic(); } catch(e2){}
        });
      } else {
        runDiagnostic();
      }
      return;
    }

    if(attempt >= 90){
      log("Timeout na 180s — start diagnostic met beschikbare data");
      try { runDiagnostic(); } catch(e){ log("FATAL: " + e.message); }
      return;
    }

    if(attempt % 5 === 0){
      log("Wacht... (" + (attempt+1) + "/90, PM=" + pmReady + ", CA=" + caReady + ", events=" + eventCount + ")");
    }
    setTimeout(function(){ waitForReady(attempt + 1); }, 2000);
  }

  setTimeout(function(){ waitForReady(0); }, 3000);

  window.WDDiagnostic = { run: runDiagnostic };
})();