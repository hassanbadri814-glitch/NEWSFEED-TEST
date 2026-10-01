/* ============================================================
   WAR DESK — city-status.js v2.1
   - v2.1: Decay-fix (ageDays berekend ipv hardcoded 0)
           + Batch-writes: IDB-transacties verzameld ipv per event
   - v2.0: 2-laags systeem (control + attack)
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[CITY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var DB_NAME = "wardesk_worldmap";
  var DB_VERSION = 2;
  var STORE_NAME = "city_status";
  var SNAPSHOT_STORE = "snapshots";

  var WRITE_DEBOUNCE_MS = 300;

  var db = null;
  var CITY_STATUS = {};

  /* v2.1: write-queue */
  var _writeQueue = {};
  var _writeTimer = null;
  var _flushing = false;

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
     v2.1: BATCH-WRITE queue
     ============================================================ */
  function queueWrite(record){
    if (!record || !record.city) return;
    _writeQueue[record.city] = record;
    if (_writeTimer) clearTimeout(_writeTimer);
    _writeTimer = setTimeout(flushWrites, WRITE_DEBOUNCE_MS);
  }

  function flushWrites(){
    if (_writeTimer){ clearTimeout(_writeTimer); _writeTimer = null; }
    if (_flushing) return;
    var records = Object.keys(_writeQueue).map(function(k){ return _writeQueue[k]; });
    if (!records.length) return;
    _writeQueue = {};
    if (!db) return;

    _flushing = true;
    try {
      var tx = db.transaction(STORE_NAME, "readwrite");
      var store = tx.objectStore(STORE_NAME);
      records.forEach(function(r){ store.put(r); });
      tx.oncomplete = function(){
        _flushing = false;
        if (window.wdLog && records.length > 1){
          wdLog.info("[CITY] Batch-write: " + records.length + " records");
        }
      };
      tx.onerror = function(){ _flushing = false; };
    } catch(e){
      _flushing = false;
    }
  }

  /* Flush bij verlaten pagina / verbergen tab */
  if (typeof window !== "undefined"){
    window.addEventListener("pagehide", flushWrites);
    document.addEventListener("visibilitychange", function(){
      if (document.hidden) flushWrites();
    });
  }

  /* ============================================================
     STAD RECORD — lege template
     ============================================================ */
  function makeCityRecord(cityKey, countryName){
    return {
      city: cityKey,
      country: countryName || null,
      controlClaims: {},
      attackClaims: {},
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
     v2.1: RECORD CONTROL CLAIM
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

    recomputeCityState(record);
    record.lastUpdate = now;

    queueWrite(record);

    LOG("Control: " + cityKey + " → " + actorName + " (conf " + claim.confidence + ", bronnen " + Object.keys(claim.sources).length + ")");
    return record;
  }

  /* ============================================================
     v2.1: RECORD ATTACK CLAIM — decay-fix
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

    /* v2.1: decay op basis van tijd sinds laatste aanval */
    var baseIntensity = Math.min(1, claim.count / 10);
    var ageDays = claim.lastAttack ? (now - claim.lastAttack) / 86400000 : 0;
    var decay = Math.max(0.3, 1 - ageDays / 30);
    claim.intensity = Math.round(baseIntensity * decay * 100) / 100;

    recomputeCityState(record);
    record.lastUpdate = now;

    queueWrite(record);

    LOG("Attack: " + cityKey + " ← " + actorName + " (count " + claim.count + ", intensity " + claim.intensity + ")");
    return record;
  }

  /* ============================================================
     HERBEREKEN AFGELEIDE VELDEN
     ============================================================ */
  function recomputeCityState(record){
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
    record.contested = contestedActors >= 2;

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

  function getCity(cityKey){ return CITY_STATUS[cityKey] || null; }
  function getAllCities(){ return Object.keys(CITY_STATUS).map(function(k){ return CITY_STATUS[k]; }); }

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

  async function getSnapshot(dateKey){ return await get(SNAPSHOT_STORE, dateKey); }
  async function getAllSnapshots(){ return await getAll(SNAPSHOT_STORE); }

  async function init(){
    await openDB();
    var all = await getAll(STORE_NAME);
    all.forEach(function(c){
      if (c && c.city) CITY_STATUS[c.city] = c;
    });
    LOG("Init — " + Object.keys(CITY_STATUS).length + " steden uit cache");

    var needsMigration = false;
    for (var city in CITY_STATUS){
      if (!Object.prototype.hasOwnProperty.call(CITY_STATUS, city)) continue;
      if (!CITY_STATUS[city].controlClaims){
        needsMigration = true;
        break;
      }
    }
    if (needsMigration){
      LOG("Oude structuur gedetecteerd — alle city-data gewist voor v2.1");
      CITY_STATUS = {};
      if (db){
        try {
          var tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).clear();
        } catch(e){}
      }
    }
  }

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
    flush: flushWrites,
    _getState: function(){ return CITY_STATUS; },
    _version: "v2.1"
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

  LOG("city-status v2.1 geladen (decay-fix + batch-writes)");

})();