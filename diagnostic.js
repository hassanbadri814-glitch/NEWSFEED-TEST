/* ============================================================
   WAR DESK — diagnostic.js v1.1
   Wacht tot PM + CA klaar zijn, dan diagnostic dump.
   ============================================================ */

(function(){
  "use strict";

  function log(){
    try {
      var args = Array.prototype.slice.call(arguments);
      if(window.wdLog && wdLog.info){
        wdLog.info.apply(null, ["[DIAG]"].concat(args));
      }
    } catch(e){}
  }

  function runDiagnostic(){
    log("═══════════════════════════════");
    log("CONSENSUS DIAGNOSTIC v1.1");
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
             e.actorCountries && e.actorCountries.length > 0 &&
             (e.category === "militair" || e.category === "crime") &&
             e.countsForHeat !== false;
    });
    log("7. ★ ALLE voorwaarden: " + both.length);

    if(events.length > 0){
      var e = events[0];
      log("8. Sample #0:");
      log("   title: " + String(e.title || "").slice(0, 50));
      log("   cat: " + e.category + " | lat: " + e.lat + " | lng: " + e.lng);
      log("   iso3: " + e.countryISO3 + " | actors: " + JSON.stringify(e.actorCountries));
      log("   countsForHeat: " + e.countsForHeat);
    }

    if(withLatLng.length > 0 && window.ProvinceMapper){
      var e2 = withLatLng[0];
      try {
        var p = ProvinceMapper.getProvinceForPoint(e2.lat, e2.lng, e2.countryISO3);
        log("9. Point lookup: " + (p ? p.iso3 + "/" + (p.admin1 || "*") : "GEEN MATCH"));
      } catch(err){
        log("9. ERROR: " + err.message);
      }
    }

    var conflictEvents = events.filter(function(e){
      return ["SYR","UKR","YEM","ISR","LBN","PSE","SAU"].indexOf(e.countryISO3) !== -1;
    }).slice(0, 8);
    log("10. Random conflict-events (" + conflictEvents.length + "):");
    conflictEvents.forEach(function(e){
      try {
        var p = ProvinceMapper.getProvinceForPoint(e.lat, e.lng, e.countryISO3);
        log("   " + e.countryISO3 + " (" +
            Number(e.lat).toFixed(2) + "," + Number(e.lng).toFixed(2) +
            ") → " + (p ? p.iso3 + "/" + (p.admin1 || "*") : "GEEN MATCH"));
      } catch(err){
        log("   ERROR: " + err.message);
      }
    });

    try {
      var stats = ProvinceConsensus.getStats();
      log("11. Consensus: " + JSON.stringify(stats));
      var all = ProvinceConsensus.getAllConsensus();
      var keys = Object.keys(all);
      log("    GIDs: " + (keys.length > 0 ? keys.slice(0, 5).join(", ") : "(leeg)"));
    } catch(err){
      log("11. ERROR: " + err.message);
    }

    try {
      log("12. City → province:");
      ["aleppo","kyiv","gaza","sanaa","beirut"].forEach(function(c){
        var r = ProvinceMapper.getProvinceForCity(c);
        log("   " + c + " → " + (r ? r.iso3 + "/" + (r.admin1 || "*") : "GEEN MATCH"));
      });
    } catch(err){
      log("12. ERROR: " + err.message);
    }

    try {
      log("13. Actor resolution:");
      ["Assad forces","Russian Army","IDF","Houthi rebels"].forEach(function(a){
        log("   " + a + " → " + ProvinceMapper.resolveActor(a));
      });
    } catch(err){
      log("13. ERROR: " + err.message);
    }

    log("═══════════════════════════════");
    log("EINDE DIAGNOSTIC");
    log("═══════════════════════════════");
  }

  function waitForReady(attempt){
    attempt = attempt || 0;
    var pmReady = window.ProvinceMapper && ProvinceMapper.isReady();
    var caReady = window.ConflictAreas && window.ConflictAreas.state && window.ConflictAreas.state.isInitialized;

    if((pmReady && caReady) || attempt >= 20){
      log("Diagnostic start na " + (attempt*2) + "s (PM=" + pmReady + ", CA=" + caReady + ")");
      try { runDiagnostic(); } catch(e){
        log("FATAL: " + e.message);
      }
      return;
    }
    log("Wacht op init... (" + (attempt+1) + "/20, PM=" + pmReady + ", CA=" + caReady + ")");
    setTimeout(function(){ waitForReady(attempt + 1); }, 2000);
  }

  setTimeout(function(){ waitForReady(0); }, 5000);

  window.WDDiagnostic = { run: runDiagnostic };
})();