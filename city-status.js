/* ============================================================
   WAR DESK — city-status.js v3.1
   - v3.1: recordLossClaim + transition-state
           Events: city:control-lost
           Transition vervalt na 7 dagen
           Transition gewist zodra sterke control-claim binnenkomt
   - v3.0: claim-levenscyclus + origin-dedup + events
   - v2.1: decay-fix + batch-writes
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[CITY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var DB_NAME = "wardesk_worldmap";
  var DB_VERSION = 4;
  var STORE_NAME = "city_status";
  var SNAPSHOT_STORE = "snapshots";

  var WRITE_DEBOUNCE_MS = 300;
  var CLAIM_EXPIRY_DAYS = 14;
  var CLAIM_STALE_DAYS  = 7;
  var CONTRADICTION_THRESHOLD = 0.25;
  var TRANSITION_EXPIRY_DAYS = 7;

  var db = null;
  var CITY_STATUS = {};

  var _writeQueue = {};
  var _writeTimer = null;
  var _flushing = false;

  var ORIGIN_PATTERNS = [
    /\bvia\s+([A-Z]{2,6})\b/,
    /\b(?:according to|volgens|bron|source):?\s*([A-Za-zÀ-ÿ]{2,20})/i,
    /\(([A-Z]{2,6})\)/,
    /\b(reuters|ap|afp|anadolu|apnews|bloomberg|interfax|tass|sputnik|kyodo|efe|dpa|epa|ansa)\b/i
  ];

  function extractOrigin(sourceName){
    if (sourceName){
      for (var i = 0; i < ORIGIN_PATTERNS.length; i++){
        var m = String(sourceName).match(ORIGIN_PATTERNS[i]);
        if (m && m[1]) return m[1].toLowerCase();
      }
    }
    return (sourceName || "").toLowerCase();
  }

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
          d.createObjectStore(STORE_NAME, { keyPath: "city" });
          if (!d.objectStoreNames.contains(SNAPSHOT_STORE)){
            d.createObjectStore(SNAPSHOT_STORE, { keyPath: "date" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
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

  if (typeof window !== "undefined"){
    window.addEventListener("pagehide", flushWrites);
    document.addEventListener("visibilitychange", function(){
      if (document.hidden) flushWrites();
    });
  }

  function makeCityRecord(cityKey, countryName){
    return {
      city: cityKey,
      country: countryName || null,
      conflict: null,
      controlClaims: {},
      attackClaims: {},
      controller: null,
      controllerConfidence: 0,
      controllerSources: 0,
      controllerOrigin: null,
      contested: false,
      contestedActors: null,
      dominantAttacker: null,
      attackIntensity: 0,
      attackCount: 0,
      /* v3.1 */
      transition: null,
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

  function calculateConfidence(claim){
    var sourceNames = Object.keys(claim.sources || {});
    var originNames = Object.keys(claim.origins || {});

    var uniqueOrigins = {};
    sourceNames.forEach(function(src){
      var o = extractOrigin(src);
      uniqueOrigins[o] = true;
    });
    var dedupedSourceCount = Object.keys(uniqueOrigins).length;

    var base;
    if (dedupedSourceCount >= 4) base = 0.90;
    else if (dedupedSourceCount >= 3) base = 0.80;
    else if (dedupedSourceCount >= 2) base = 0.60;
    else if (dedupedSourceCount >= 1) base = 0.33;
    else base = 0;

    if (originNames.length >= 3) base = Math.min(1, base + 0.08);
    else if (originNames.length >= 2) base = Math.min(1, base + 0.05);

    return Math.round(base * 100) / 100;
  }

  function ageOutClaims(record, now){
    var expiryMs = CLAIM_EXPIRY_DAYS * 86400000;

    ['controlClaims', 'attackClaims'].forEach(function(bucket){
      var claims = record[bucket];
      if (!claims) return;
      Object.keys(claims).forEach(function(actor){
        var c = claims[actor];
        var last = c.lastClaim || c.lastAttack || 0;
        if (last && (now - last) > expiryMs){
          delete claims[actor];
        }
      });
    });

    /* v3.1: transition laten verlopen */
    if (record.transition && record.transition.since){
      var transitionAgeDays = (now - record.transition.since) / 86400000;
      if (transitionAgeDays > TRANSITION_EXPIRY_DAYS){
        record.transition = null;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════
     CONTROL CLAIM — winnaar
     ════════════════════════════════════════════════════════════ */
  function recordControlClaim(cityKey, actorName, actorISO3, sourceName, originCountry, conflictIso){
    if (!cityKey || !actorName) return Promise.resolve(null);

    var record = ensureRecord(cityKey);
    var actor = actorName;

    if (conflictIso && !record.conflict){
      record.conflict = conflictIso;
    }

    var prevController = record.controller;
    var prevConfidence = record.controllerConfidence;
    var prevContested = record.contested;
    var hadTransition = !!record.transition;

    if (!record.controlClaims[actor]){
      record.controlClaims[actor] = {
        actor: actorName,
        actorISO3: actorISO3 || null,
        conflict: conflictIso || record.conflict || null,
        sources: {},
        origins: {},
        count: 0,
        firstClaim: 0,
        lastClaim: 0,
        confidence: 0
      };
    }

    var claim = record.controlClaims[actor];
    var now = Date.now();

    if (sourceName){
      claim.sources[sourceName] = now;
    }
    if (originCountry){
      claim.origins[originCountry] = now;
    }
    claim.count++;
    if (!claim.firstClaim) claim.firstClaim = now;
    claim.lastClaim = now;
    claim.confidence = calculateConfidence(claim);

    ageOutClaims(record, now);

    /* v3.1: control-claim wist transition — er is weer een duidelijke winnaar */
    if (record.transition && claim.confidence >= 0.4){
      LOG("Transition gewist voor " + cityKey + " — " + actorName + " claimt nu");
      record.transition = null;
    }

    recomputeCityState(record);
    record.lastUpdate = now;

    queueWrite(record);

    var changed = (record.controller !== prevController);
    var confidenceRose = (record.controllerConfidence > prevConfidence + 0.15);
    var contestedChanged = (record.contested !== prevContested);

    if (changed || confidenceRose || contestedChanged || hadTransition){
      emitCityEvent("city:control-changed", {
        city: cityKey,
        controller: record.controller,
        previous: prevController,
        confidence: record.controllerConfidence,
        sources: record.controllerSources,
        contested: record.contested,
        contestedActors: record.contestedActors,
        conflict: record.conflict,
        timestamp: now
      });
    }

    LOG("Control: " + cityKey + " → " + actorName +
        " (conf " + claim.confidence +
        ", bronnen " + Object.keys(claim.sources).length +
        (conflictIso ? ", conflict " + conflictIso : "") + ")");

    return Promise.resolve(record);
  }

  /* ════════════════════════════════════════════════════════════
     v3.1: LOSS CLAIM — verliezer markeert stad als transition
     ════════════════════════════════════════════════════════════ */
  function recordLossClaim(cityKey, actorName, actorISO3, sourceName, originCountry, conflictIso){
    if (!cityKey || !actorName) return Promise.resolve(null);

    var record = ensureRecord(cityKey);
    var now = Date.now();

    if (conflictIso && !record.conflict){
      record.conflict = conflictIso;
    }

    /* Kijk of de verliezende actor überhaupt controller is/was */
    var isCurrentController = (record.controller === actorName);
    var hadClaim = !!record.controlClaims[actorName];

    /* Alleen registreren als deze actor daadwerkelijk iets te verliezen had */
    if (!isCurrentController && !hadClaim){
      LOG("Loss genegeerd: " + cityKey + " — " + actorName + " was geen controller");
      return Promise.resolve(record);
    }

    record.transition = {
      from: actorName,
      fromISO3: actorISO3 || null,
      since: now,
      source: sourceName || null,
      origin: originCountry || null,
      conflict: conflictIso || record.conflict || null,
      count: (record.transition && record.transition.from === actorName
              ? (record.transition.count || 1) + 1
              : 1)
    };

    /* Verzwak de bestaande claim van de verliezende actor — decay zijn confidence */
    if (record.controlClaims[actorName]){
      record.controlClaims[actorName].confidence =
        Math.round(record.controlClaims[actorName].confidence * 0.5 * 100) / 100;
    }

    ageOutClaims(record, now);
    recomputeCityState(record);
    record.lastUpdate = now;

    queueWrite(record);

    emitCityEvent("city:control-lost", {
      city: cityKey,
      lostBy: actorName,
      conflict: record.conflict,
      transition: record.transition,
      timestamp: now
    });

    /* Ook control-changed emitten — dot moet herberekenen */
    emitCityEvent("city:control-changed", {
      city: cityKey,
      controller: record.controller,
      contested: record.contested,
      transition: record.transition,
      conflict: record.conflict,
      timestamp: now
    });

    LOG("Loss: " + cityKey + " ← " + actorName +
        " verliest (transition sinds " + new Date(now).toISOString().slice(11,19) + ")" +
        (conflictIso ? " · " + conflictIso : ""));

    return Promise.resolve(record);
  }

  /* ════════════════════════════════════════════════════════════
     ATTACK CLAIM
     ════════════════════════════════════════════════════════════ */
  function recordAttackClaim(cityKey, actorName, actorISO3, sourceName, originCountry, conflictIso){
    if (!cityKey || !actorName) return Promise.resolve(null);

    var record = ensureRecord(cityKey);
    var actor = actorName;
    var prevAttacker = record.dominantAttacker;
    var prevIntensity = record.attackIntensity;

    if (conflictIso && !record.conflict){
      record.conflict = conflictIso;
    }

    if (!record.attackClaims[actor]){
      record.attackClaims[actor] = {
        actor: actorName,
        actorISO3: actorISO3 || null,
        conflict: conflictIso || record.conflict || null,
        sources: {},
        origins: {},
        count: 0,
        firstAttack: 0,
        lastAttack: 0,
        intensity: 0
      };
    }

    var claim = record.attackClaims[actor];
    var now = Date.now();

    if (sourceName) claim.sources[sourceName] = now;
    if (originCountry) claim.origins[originCountry] = now;
    claim.count++;
    if (!claim.firstAttack) claim.firstAttack = now;
    claim.lastAttack = now;

    var baseIntensity = Math.min(1, claim.count / 10);
    var ageDays = (now - claim.firstAttack) / 86400000;
    var decay = Math.max(0.3, 1 - ageDays / 30);
    claim.intensity = Math.round(baseIntensity * decay * 100) / 100;

    ageOutClaims(record, now);
    recomputeCityState(record);
    record.lastUpdate = now;

    queueWrite(record);

    var attackerChanged = (record.dominantAttacker !== prevAttacker);
    var intensityJump = (record.attackIntensity - prevIntensity) > 0.15;

    if (attackerChanged || intensityJump){
      emitCityEvent("city:attack-changed", {
        city: cityKey,
        dominantAttacker: record.dominantAttacker,
        attackIntensity: record.attackIntensity,
        attackCount: record.attackCount,
        conflict: record.conflict,
        timestamp: now
      });
    }

    LOG("Attack: " + cityKey + " ← " + actorName +
        " (count " + claim.count + ", intensity " + claim.intensity + ")");

    return Promise.resolve(record);
  }

  function recomputeCityState(record){
    var ranked = Object.keys(record.controlClaims)
      .map(function(a){ return record.controlClaims[a]; })
      .sort(function(a, b){ return b.confidence - a.confidence; });

    var prevController = record.controller;
    var prevContested = record.contested;

    if (!ranked.length){
      record.controller = null;
      record.controllerConfidence = 0;
      record.controllerSources = 0;
      record.controllerOrigin = null;
      record.contested = false;
      record.contestedActors = null;
    } else {
      var best = ranked[0];
      record.controller = best.actor;
      record.controllerConfidence = best.confidence;
      record.controllerSources = Object.keys(best.sources).length;
      record.controllerOrigin = best.actorISO3 || null;

      var contestedActors = [];
      var threshold = best.confidence - CONTRADICTION_THRESHOLD;
      ranked.forEach(function(c){
        if (c.confidence >= threshold && c.confidence >= 0.30){
          contestedActors.push({
            actor: c.actor,
            confidence: c.confidence,
            sources: Object.keys(c.sources).length
          });
        }
      });
      record.contested = contestedActors.length >= 2;
      record.contestedActors = record.contested ? contestedActors.slice(0, 3) : null;
    }

    if (prevController && record.controller && prevController !== record.controller){
      record.history.push({
        at: Date.now(),
        from: prevController,
        to: record.controller,
        confidence: record.controllerConfidence,
        type: "controller-change"
      });
      if (record.history.length > 20) record.history = record.history.slice(-20);
      record.since = Date.now();
    } else if (!prevController && record.controller){
      record.since = Date.now();
    }

    var dominantAttacker = null;
    var highestIntensity = 0;
    var totalCount = 0;

    Object.keys(record.attackClaims).forEach(function(atk){
      var a = record.attackClaims[atk];
      totalCount += a.count;
      if (a.intensity > highestIntensity){
        highestIntensity = a.intensity;
        dominantAttacker = atk;
      }
    });

    record.dominantAttacker = dominantAttacker;
    record.attackIntensity = highestIntensity;
    record.attackCount = totalCount;

    return record;
  }

  function emitCityEvent(name, payload){
    try {
      if (window.WarDesk && WarDesk.events){
        WarDesk.events.emit(name, payload);
      }
    } catch(e){}
  }

  function getCity(cityKey){ return CITY_STATUS[cityKey] || null; }
  function getAllCities(){
    return Object.keys(CITY_STATUS).map(function(k){ return CITY_STATUS[k]; });
  }

  function saveSnapshot(){
    var dateKey = new Date().toISOString().slice(0, 10);
    var snapshot = {
      date: dateKey,
      timestamp: Date.now(),
      cities: JSON.parse(JSON.stringify(CITY_STATUS))
    };
    return put(SNAPSHOT_STORE, snapshot).then(function(){
      LOG("Snapshot opgeslagen: " + dateKey + " (" + Object.keys(CITY_STATUS).length + " steden)");
    });
  }

  function getSnapshot(dateKey){ return get(SNAPSHOT_STORE, dateKey); }
  function getAllSnapshots(){ return getAll(SNAPSHOT_STORE); }

  function init(){
    return openDB().then(function(){
      return getAll(STORE_NAME);
    }).then(function(all){
      all.forEach(function(c){
        if (c && c.city){
          if (!c.controlClaims) c.controlClaims = {};
          if (!c.attackClaims) c.attackClaims = {};
          if (c.conflict === undefined) c.conflict = null;
          /* v3.1: normaliseer transition */
          if (c.transition === undefined) c.transition = null;
          /* Verlopen transitions wissen bij load */
          if (c.transition && c.transition.since){
            var ageDays = (Date.now() - c.transition.since) / 86400000;
            if (ageDays > TRANSITION_EXPIRY_DAYS){
              c.transition = null;
            }
          }
          CITY_STATUS[c.city] = c;
        }
      });
      LOG("Init — " + Object.keys(CITY_STATUS).length + " steden uit cache");
      return true;
    });
  }

  function reset(){
    CITY_STATUS = {};
    if (db){
      try {
        var tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
      } catch(e){}
    }
    LOG("Reset — alle city-status gewist");
    return Promise.resolve(true);
  }

  function retractClaim(cityKey, actorName, reason){
    var record = CITY_STATUS[cityKey];
    if (!record) return Promise.resolve(false);
    var removed = false;
    if (record.controlClaims[actorName]){
      delete record.controlClaims[actorName];
      removed = true;
    }
    if (record.attackClaims[actorName]){
      delete record.attackClaims[actorName];
      removed = true;
    }
    if (removed){
      recomputeCityState(record);
      record.lastUpdate = Date.now();
      queueWrite(record);
      emitCityEvent("city:control-changed", {
        city: cityKey,
        controller: record.controller,
        contested: record.contested,
        conflict: record.conflict,
        retracted: actorName,
        reason: reason || "handmatig",
        timestamp: Date.now()
      });
      LOG("Retract: " + cityKey + " ← " + actorName + " (" + (reason || "?") + ")");
    }
    return Promise.resolve(removed);
  }

  /* v3.1: handmatig transition clearen (voor als het te lang duurt) */
  function clearTransition(cityKey){
    var record = CITY_STATUS[cityKey];
    if (!record || !record.transition) return Promise.resolve(false);
    record.transition = null;
    record.lastUpdate = Date.now();
    queueWrite(record);
    emitCityEvent("city:control-changed", {
      city: cityKey,
      controller: record.controller,
      transition: null,
      conflict: record.conflict,
      timestamp: Date.now()
    });
    LOG("Transition gewist: " + cityKey);
    return Promise.resolve(true);
  }

  window.CityStatus = {
    init: init,
    reset: reset,
    recordControlClaim: recordControlClaim,
    recordLossClaim: recordLossClaim,
    recordAttackClaim: recordAttackClaim,
    retractClaim: retractClaim,
    clearTransition: clearTransition,
    getCity: getCity,
    getAllCities: getAllCities,
    saveSnapshot: saveSnapshot,
    getSnapshot: getSnapshot,
    getAllSnapshots: getAllSnapshots,
    flush: flushWrites,
    _getState: function(){ return CITY_STATUS; },
    _version: "v3.1"
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

  LOG("city-status v3.1 geladen (loss-claims + transition-state)");

})();