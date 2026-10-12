/* ============================================================
   WAR DESK — capture-tracker.js v2.0
   - v2.0: Drempel versoepeld 3 → 1 bron. Trigger bij elke
           capture-claim. Voorkomt eindeloos wachten.
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[CAPTURE]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var CAPTURE_THRESHOLD = 1;   /* v2.0: versoepeld — 1 bron genoeg */
  var HISTORY_KEY = "wardesk_capture_history";

  var _pending = {};

  function getBus(){
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function recordCapture(ev){
    if (!ev) return;
    var city = ev.city;
    var actor = ev.actor;
    var conflict = ev.conflict;
    var source = ev.source || "?";

    if (!city || !actor || !conflict) return;

    var key = conflict + "|" + city + "|" + actor;
    if (!_pending[key]){
      _pending[key] = {
        conflict: conflict,
        city: city,
        actor: actor,
        sources: {},
        count: 0,
        firstSeen: Date.now()
      };
    }
    var p = _pending[key];
    p.sources[source] = 1;
    p.count = Object.keys(p.sources).length;

    if (p.count >= CAPTURE_THRESHOLD){
      applyCapture(p);
      delete _pending[key];
    }
  }

  function applyCapture(p){
    var iso3 = p.conflict;
    var admin1 = p.city;
    var controller = p.actor;

    /* Alleen updaten als de controller daadwerkelijk bestaat in CONFLICTS[iso3].parties */
    var conflict = window.ConflictAreas && ConflictAreas._conflicts ? ConflictAreas._conflicts[iso3] : null;
    if (conflict && conflict.parties && !conflict.parties[controller]){
      LOG("Capture genegeerd — partij bestaat niet: " + iso3 + " · " + controller);
      return;
    }

    var existing = window.WDBaseline ? window.WDBaseline.get(iso3, admin1, null) : null;

    if (existing && existing.controller === controller){
      LOG("Capture bevestigd (baseline al correct): " + iso3 + "|" + admin1 + " = " + controller);
      return;
    }

    if (window.WDBaseline){
      window.WDBaseline.set(iso3, admin1, controller, null, "capture (" + p.count + " bron)");
    }

    var entry = {
      timestamp: Date.now(),
      iso3: iso3,
      admin1: admin1,
      from: existing ? existing.controller : "onbekend",
      to: controller,
      sources: Object.keys(p.sources),
      sourceCount: p.count
    };

    try {
      var hist = localStorage.getItem(HISTORY_KEY);
      var arr = hist ? JSON.parse(hist) : [];
      arr.push(entry);
      if (arr.length > 200) arr = arr.slice(-200);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch(e){}

    LOG("BASELINE UPDATE: " + iso3 + "|" + admin1 + " → " + controller +
        " (was " + (existing ? existing.controller : "?") + ")");

    /* Ververs de kaartlaag voor dit land */
    try {
      if (window.ConflictAreas && ConflictAreas.refreshLayer){
        ConflictAreas.refreshLayer(iso3);
      }
    } catch(e){}

    try {
      if (window.WarDesk && WarDesk.events){
        WarDesk.events.emit("baseline:updated", entry);
      }
    } catch(e){}
  }

  function init(){
    var bus = getBus();
    if (!bus){
      LOG("EventBus niet gevonden");
      return;
    }

    bus.on("city:control-changed", function(data){
      if (!data) return;
      if (data.type !== "capture" && data.action !== "capture") return;
      recordCapture({
        city: data.city,
        actor: data.controller,
        conflict: data.conflict,
        source: data.source
      });
    });

    LOG("Capture-tracker actief — drempel " + CAPTURE_THRESHOLD + " bron");
  }

  window.WDCaptureTracker = {
    version: "v2.0",
    init: init,
    record: recordCapture,
    getHistory: function(){
      try {
        var hist = localStorage.getItem(HISTORY_KEY);
        return hist ? JSON.parse(hist) : [];
      } catch(e){ return []; }
    }
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("capture-tracker.js v2.0 geladen (drempel 1 bron)");

})();