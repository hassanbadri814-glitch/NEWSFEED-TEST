/* ============================================================
   WAR DESK — city-status.js v1.0
   ------------------------------------------------------------
   Per-stad bijhouden:
   - Wie controleert het (controller)
   - Wie claimt het (claimedBy)
   - Confidence (0-1)
   - Historische status
   - Persist via IndexedDB
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[CITY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var DB_NAME = "wardesk_worldmap";
  var DB_VERSION = 1;
  var STORE_NAME = "city_status";
  var SNAPSHOT_STORE = "snapshots";

  var db = null;

  function openDB(){
    return new Promise(function(resolve){
      try {
        if (!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME)){
            d.createObjectStore(STORE_NAME, { keyPath: "city" });
          }
          if (!d.objectStoreNames.contains(SNAPSHOT_STORE)){
            d.createObjectStore(SNAPSHOT_STORE, { keyPath: "date" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function put(store, value){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function get(store, key){
    if (!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function getAll(store){
    if (!db) return Promise.resolve([]);
    return new Promise(function(res){
      try {
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).getAll();
        r.onsuccess = function(){ res(r.result || []); };
        r.onerror = function(){ res([]); };
      } catch(e){ res([]); }
    });
  }

  /* ============================================================
     STATE — in-memory cache, geladen uit IndexedDB
     ============================================================ */
  var CITY_STATUS = {};

  /* ============================================================
     CITY UPDATE — hoofd functie
     ------------------------------------------------------------
     @param cityKey      - bv "kharkiv"
     @param claimedBy    - ISO3 van claimer (bv "RUS") of null
     @param controller   - ISO3 van huidige controller (bv "UKR")
     @param sourceName   - naam van de bron
     @param evidence     - optionele tekst/fragment
     ============================================================ */
  async function recordClaim(cityKey, claimedBy, controller, sourceName, evidence){
    if (!cityKey) return null;

    var existing = CITY_STATUS[cityKey] || {
      city: cityKey,
      controller: controller || null,
      claimedBy: null,
      confidence: 0,
      since: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      sources: [],
      claims: [],
      history: []
    };

    /* Voeg claim toe aan geschiedenis */
    var claim = {
      claimedBy: claimedBy,
      source: sourceName,
      weight: window.WorldMapData ? window.WorldMapData.getTier(sourceName) : 0.5,
      at: new Date().toISOString()
    };
    existing.claims.push(claim);

    /* Unieke bronnen bijhouden */
    if (sourceName && existing.sources.indexOf(sourceName) === -1){
      existing.sources.push(sourceName);
    }

    /* Herbereken consensus op basis van alle claims laatste 7 dagen */
    var now = Date.now();
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    var recentClaims = existing.claims.filter(function(c){
      return new Date(c.at).getTime() > weekAgo;
    });

    var votes = {};
    recentClaims.forEach(function(c){
      if (!c.claimedBy) return;
      var key = c.claimedBy;
      votes[key] = (votes[key] || 0) + c.weight;
    });

    var totalWeight = 0;
    Object.keys(votes).forEach(function(k){ totalWeight += votes[k]; });

    if (totalWeight === 0){
      existing.confidence = 0;
      existing.claimedBy = null;
    } else {
      /* Winnaar = hoogste gewicht */
      var best = null, bestWeight = 0;
      Object.keys(votes).forEach(function(k){
        if (votes[k] > bestWeight){ best = k; bestWeight = votes[k]; }
      });

      var consensus = bestWeight / totalWeight;
      var sources = existing.sources.length;
      var origins = countOrigins(existing.sources);

      /* Bepaal confidence op basis van thresholds */
      var th = window.WORLDMAP_THRESHOLDS || {};
      var minConsensus = th.consensus_min || 0.70;
      var minSources = th.confirm_min_sources || 3;
      var minOrigins = th.confirm_min_origins || 2;

      if (consensus >= minConsensus && sources >= minSources && origins >= minOrigins){
        existing.confidence = Math.min(1, consensus);
        existing.claimedBy = best;
      } else if (sources >= (th.claim_min_sources || 2)){
        /* Claim maar nog niet bevestigd */
        existing.confidence = consensus * 0.5;
        existing.claimedBy = best;
      } else {
        existing.confidence = consensus * 0.3;
        existing.claimedBy = best;
      }
    }

    /* Update controller als confidence hoog genoeg is */
    if (existing.confidence >= 0.7 && existing.claimedBy){
      if (existing.controller !== existing.claimedBy){
        /* Controller verandert */
        existing.history.push({
          from: existing.controller,
          to: existing.claimedBy,
          at: new Date().toISOString(),
          confidence: existing.confidence
        });
        existing.controller = existing.claimedBy;
        existing.since = new Date().toISOString();
      }
    }

    existing.lastUpdate = new Date().toISOString();
    CITY_STATUS[cityKey] = existing;

    /* Persist */
    await put(STORE_NAME, existing);

    LOG("City update: " + cityKey + " → controller=" + (existing.controller || "?") +
        " claim=" + (existing.claimedBy || "?") +
        " conf=" + existing.confidence.toFixed(2));

    return existing;
  }

  /* Aantal unieke landen dat claimt — ruwe benadering op basis van bron-naam */
  function countOrigins(sources){
    /* Bekende mapping van bron → land */
    var originMap = {
      "Al Jazeera": "QA", "Al Jazeera AR": "QA", "Al Jazeera AR TG": "QA",
      "Al Arabiya TG": "SA", "Arab News": "SA", "Saudi Gazette": "SA",
      "The National": "AE", "Gulf News": "AE", "WAM": "AE",
      "The Peninsula": "QA",
      "Anadolu AR": "TR", "TRT World": "TR",
      "SANA": "SY", "SABA Yemen": "YE",
      "RT Arabic": "RU", "RT News": "RU", "TASS": "RU",
      "Times of Israel": "IL", "Jerusalem Post": "IL", "Ynet": "IL",
      "Kyiv Independent": "UA", "Ukrinform": "UA",
      "Mehr News Iran": "IR", "IRNA": "IR", "Press TV": "IR",
      "BBC World": "GB", "BBC UK": "GB", "BBC Arabic": "GB",
      "Reuters": "GB", "Reuters TG": "GB", "AP News": "US",
      "France24 EN": "FR", "France24 AR": "FR",
      "NOS": "NL", "De Telegraaf": "NL", "AD.nl": "NL",
      "Spiegel": "DE", "Bild": "DE", "Zeit": "DE", "FAZ": "DE",
      "Le Monde": "FR", "Spiegel": "DE",
      "MAP": "MA", "Hespress": "MA", "Le360": "MA",
      "Xinhua": "CN",
      "CNN": "US", "NYT US": "US", "Washington Post": "US"
    };
    var origins = {};
    sources.forEach(function(s){
      var o = originMap[s];
      if (o) origins[o] = true;
    });
    return Object.keys(origins).length;
  }

  /* ============================================================
     GET — ophalen van stad-status
     ============================================================ */
  function getCity(cityKey){
    return CITY_STATUS[cityKey] || null;
  }

  function getAllCities(){
    return Object.keys(CITY_STATUS).map(function(k){ return CITY_STATUS[k]; });
  }

  /* ============================================================
     RETRACT — bron trekt terug
     ============================================================ */
  async function retractClaim(cityKey, sourceName){
    var existing = CITY_STATUS[cityKey];
    if (!existing) return null;
    existing.claims = existing.claims.filter(function(c){ return c.source !== sourceName; });
    CITY_STATUS[cityKey] = existing;
    await put(STORE_NAME, existing);
    LOG("Retracted: " + cityKey + " (bron " + sourceName + ")");
    return existing;
  }

  /* ============================================================
     SNAPSHOT — dagelijkse momentopname voor tijdlijn
     ============================================================ */
  async function saveSnapshot(){
    var dateKey = new Date().toISOString().slice(0, 10); /* YYYY-MM-DD */
    var snapshot = {
      date: dateKey,
      timestamp: Date.now(),
      cities: JSON.parse(JSON.stringify(CITY_STATUS))
    };
    await put(SNAPSHOT_STORE, snapshot);
    LOG("Snapshot opgeslagen: " + dateKey + " (" + Object.keys(CITY_STATUS).length + " steden)");
  }

  async function getSnapshot(dateKey){
    return await get(SNAPSHOT_STORE, dateKey);
  }

  async function getAllSnapshots(){
    return await getAll(SNAPSHOT_STORE);
  }

  /* ============================================================
     INIT — laad alles uit IndexedDB
     ============================================================ */
  async function init(){
    await openDB();
    var all = await getAll(STORE_NAME);
    all.forEach(function(c){
      if (c && c.city) CITY_STATUS[c.city] = c;
    });
    LOG("Init — " + Object.keys(CITY_STATUS).length + " steden uit cache");
  }

  /* ============================================================
     RESET — alles wissen (voor debug/test)
     ============================================================ */
  async function reset(){
    CITY_STATUS = {};
    if (db){
      try {
        var tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
      } catch(e){}
    }
    LOG("Reset — alle city-status gewist");
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.CityStatus = {
    init: init,
    reset: reset,
    recordClaim: recordClaim,
    retractClaim: retractClaim,
    getCity: getCity,
    getAllCities: getAllCities,
    saveSnapshot: saveSnapshot,
    getSnapshot: getSnapshot,
    getAllSnapshots: getAllSnapshots,
    _getState: function(){ return CITY_STATUS; }
  };

  /* Auto-init */
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

  wdLog.info("[WORLDMAP] city-status v1.0 geladen");

})();