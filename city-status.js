/* ============================================================
   WAR DESK — city-status.js v2.0
   ------------------------------------------------------------
   - v2.0: 2-laags systeem (control + attack)
         + confidence berekening
         + contested detectie
         + historie tracking
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[CITY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var DB_NAME = "wardesk_worldmap";
  var DB_VERSION = 2; /* v2.0: nieuw schema */
  var STORE_NAME = "city_status";
  var SNAPSHOT_STORE = "snapshots";

  var db = null;
  var CITY_STATUS = {};

  /* ============================================================
     INDEXEDDB
     ============================================================ */
  function openDB(){
    return new Promise(function(resolve){
      try {
        if (!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          /* Verwijder oude store (schema change) */
          if (d.objectStoreNames.contains(STORE_NAME)){
            d.deleteObjectStore(STORE_NAME);
          }
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
     STAD RECORD — lege template
     ============================================================ */
  function makeCityRecord(cityKey, countryName){
    return {
      city: cityKey,
      country: countryName || null,

      /* Control claims — wie zegt dat ze stad controleren */
      controlClaims: {},

      /* Attack claims — wie valt stad aan */
      attackClaims: {},

      /* Afgeleide velden (herberekend bij elke update) */
      controller: null,
      controllerConfidence: 0,
      controllerSources: 0,
      contested: false,

      dominantAttacker: null,
      attackIntensity: 0,
      attackCount: 0,

      since: null,
      history: [],
      lastUpdate: null
    };
  }

  function ensureRecord(cityKey, countryName){
    if (!CITY_STATUS[cityKey]){
      CITY_STATUS[cityKey] = makeCityRecord(cityKey, countryName);
    } else if (countryName && !CITY_STATUS[cityKey].country){
      CITY_STATUS[cityKey].country = countryName;
    }
    return CITY_STATUS[cityKey];
  }

  /* ============================================================
     CONFIDENCE BEREKENING
     ============================================================ */
  function calculateConfidence(sourcesMap, originsMap){
    var sourceCount = Object.keys(sourcesMap || {}).length;
    var originCount = Object.keys(originsMap || {}).length;

    var base;
    if (sourceCount >= 3) base = 0.85;
    else if (sourceCount >= 2) base = 0.60;
    else if (sourceCount >= 1) base = 0.33;
    else base = 0;

    if (originCount >= 2) base = Math.min(1, base + 0.10);
    if (sourceCount >= 5) base = Math.min(1, base + 0.05);

    return Math.round(base * 100) / 100;
  }

  /* ============================================================
     v2.0: RECORD CONTROL CLAIM
     ------------------------------------------------------------
     Wordt aangeroepen bij "captured/liberated/seized" events.
     ============================================================ */
  async function recordControlClaim(cityKey, actorName, actorISO3, sourceName, originCountry){
    if (!cityKey || !actorName) return null;
    var record = ensureRecord(cityKey);
    var actor = actorISO3 || actorName;

    if (!record.controlClaims[actor]){
      record.controlClaims[actor] = {
        actor: actorName,
        actorISO3: actorISO3 || null,
        sources: {},
        origins: {},
        count: 0,
        lastClaim: 0,
        confidence: 0
      };
    }

    var claim = record.controlClaims[actor];
    var now = Date.now();

    if (sourceName && !claim.sources[sourceName]){
      claim.sources[sourceName] = now;
    }
    if (originCountry && !claim.origins[originCountry]){
      claim.origins[originCountry] = now;
    }
    claim.count++;
    claim.lastClaim = now;
    claim.confidence = calculateConfidence(claim.sources, claim.origins);

    /* Herbereken afgeleide velden */
    recomputeCityState(record);

    record.lastUpdate = now;

    await put(STORE_NAME, record);

    LOG("Control: " + cityKey + " → " + actorName + " (conf " + claim.confidence + ", bronnen " + Object.keys(claim.sources).length + ")");
    return record;
  }

  /* ============================================================
     v2.0: RECORD ATTACK CLAIM
     ------------------------------------------------------------
     Wordt aangeroepen bij "attacked/shelled/bombed" events.
     ============================================================ */
  async function recordAttackClaim(cityKey, actorName, actorISO3, sourceName, originCountry){
    if (!cityKey || !actorName) return null;
    var record = ensureRecord(cityKey);
    var actor = actorISO3 || actorName;

    if (!record.attackClaims[actor]){
      record.attackClaims[actor] = {
        actor: actorName,
        actorISO3: actorISO3 || null,
        sources: {},
        origins: {},
        count: 0,
        lastAttack: 0,
        intensity: 0
      };
    }

    var claim = record.attackClaims[actor];
    var now = Date.now();

    if (sourceName && !claim.sources[sourceName]){
      claim.sources[sourceName] = now;
    }
    if (originCountry && !claim.origins[originCountry]){
      claim.origins[originCountry] = now;
    }
    claim.count++;
    claim.lastAttack = now;

    /* Intensity: count/10, decay over 7 dagen */
    var baseIntensity = Math.min(1, claim.count / 10);
    var ageDays = 0; /* net binnengekomen */
    var decay = Math.max(0.3, 1 - ageDays / 30);
    claim.intensity = Math.round(baseIntensity * decay * 100) / 100;

    /* Herbereken afgeleide velden */
    recomputeCityState(record);

    record.lastUpdate = now;

    await put(STORE_NAME, record);

    LOG("Attack: " + cityKey + " ← " + actorName + " (count " + claim.count + ", intensity " + claim.intensity + ")");
    return record;
  }

  /* ============================================================
     HERBEREKEN AFGELEIDE VELDEN
     ============================================================ */
  function recomputeCityState(record){
    /* ==== Controller (hoogste control claim) ==== */
    var bestActor = null;
    var bestScore = 0;
    var contestedActors = 0;

    for (var actor in record.controlClaims){
      if (!Object.prototype.hasOwnProperty.call(record.controlClaims, actor)) continue;
      var claim = record.controlClaims[actor];
      var score = claim.confidence;

      if (score >= 0.4) contestedActors++;
      if (score > bestScore){
        bestScore = score;
        bestActor = actor;
      }
    }

    var prevController = record.controller;
    record.controller = bestActor;
    record.controllerConfidence = bestScore;
    record.controllerSources = bestActor ? Object.keys(record.controlClaims[bestActor].sources).length : 0;

    /* Contested: 2+ actoren met >= 40% confidence */
    record.contested = contestedActors >= 2;

    /* Controller-wissel → historie */
    if (prevController && bestActor && prevController !== bestActor){
      record.history.push({
        at: Date.now(),
        from: prevController,
        to: bestActor,
        confidence: bestScore,
        type: "controller-change"
      });
      record.since = Date.now();
    } else if (!prevController && bestActor){
      record.since = Date.now();
    }

    /* ==== Attack intensity (hoogste attacker) ==== */
    var dominantAttacker = null;
    var highestIntensity = 0;
    var totalCount = 0;

    for (var atk in record.attackClaims){
      if (!Object.prototype.hasOwnProperty.call(record.attackClaims, atk)) continue;
      var aClaim = record.attackClaims[atk];
      totalCount += aClaim.count;
      if (aClaim.intensity > highestIntensity){
        highestIntensity = aClaim.intensity;
        dominantAttacker = atk;
      }
    }

    record.dominantAttacker = dominantAttacker;
    record.attackIntensity = highestIntensity;
    record.attackCount = totalCount;

    return record;
  }

  /* ============================================================
     GETTERS
     ============================================================ */
  function getCity(cityKey){
    return CITY_STATUS[cityKey] || null;
  }

  function getAllCities(){
    return Object.keys(CITY_STATUS).map(function(k){ return CITY_STATUS[k]; });
  }

  /* ============================================================
     SNAPSHOTS — dagelijkse momentopname
     ============================================================ */
  async function saveSnapshot(){
    var dateKey = new Date().toISOString().slice(0, 10);
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
     INIT
     ============================================================ */
  async function init(){
    await openDB();
    var all = await getAll(STORE_NAME);
    all.forEach(function(c){
      if (c && c.city) CITY_STATUS[c.city] = c;
    });
    LOG("Init — " + Object.keys(CITY_STATUS).length + " steden uit cache");

    /* Migratie-check: als oude structuur (zonder controlClaims) → reset */
    var needsMigration = false;
    for (var city in CITY_STATUS){
      if (!Object.prototype.hasOwnProperty.call(CITY_STATUS, city)) continue;
      if (!CITY_STATUS[city].controlClaims){
        needsMigration = true;
        break;
      }
    }
    if (needsMigration){
      LOG("Oude structuur gedetecteerd — alle city-data gewist voor v2.0");
      CITY_STATUS = {};
      if (db){
        try {
          var tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).clear();
        } catch(e){}
      }
    }
  }

  /* ============================================================
     RESET (voor debug)
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
    recordControlClaim: recordControlClaim,
    recordAttackClaim: recordAttackClaim,
    getCity: getCity,
    getAllCities: getAllCities,
    saveSnapshot: saveSnapshot,
    getSnapshot: getSnapshot,
    getAllSnapshots: getAllSnapshots,
    _getState: function(){ return CITY_STATUS; },
    _version: "v2.0"
  };

  /* Auto-init */
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

  LOG("city-status v2.0 geladen (2-laags: control + attack)");

})();