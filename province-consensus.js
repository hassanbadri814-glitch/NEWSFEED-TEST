/* ============================================================
   WAR DESK — province-consensus.js v1.0
   ------------------------------------------------------------
   Aggregeert map:military-events per provincie en berekent
   een consensus: wie controleert wat, met welke zekerheid?

   Output: emit "province:consensus" → { byGid: {...}, stats }

   - Weegt source-tier × tijdsverval × unieke-bronnen
   - Detecteert contested (2-3 actoren ≥35%)
   - Cache in IndexedDB `wardesk_province_consensus`
   - Throttle 60 min (trigger via news:loaded)
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[CONSENSUS]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var DB_NAME = "wardesk_province_consensus";
  var DB_VERSION = 1;
  var STORE = "consensus";
  var META_STORE = "meta";
  var THROTTLE_MS = 60 * 60 * 1000;      /* 1 uur */
  var DECAY_HALF_LIFE_DAYS = 3;
  var MAX_AGE_DAYS = 30;
  var MIN_ACTOR_SHARE = 0.35;             /* contested-drempel */
  var MIN_ACTOR_SOURCES = 2;              /* min bronnen voor contested */

  var db = null;
  var lastRun = 0;
  var lastEvents = [];
  var consensusByGid = {};                /* { gid: consensus } */
  var isRunning = false;
  var _runTimer = null;

  /* ============================================================
     IndexedDB
     ============================================================ */
  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains(STORE)){
            d.createObjectStore(STORE, { keyPath: "gid" });
          }
          if(!d.objectStoreNames.contains(META_STORE)){
            d.createObjectStore(META_STORE, { keyPath: "k" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function dbPutAll(items){
    if(!db || !items.length) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        store.clear();
        items.forEach(function(it){ store.put(it); });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function dbGetAll(){
    if(!db) return Promise.resolve([]);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE, "readonly");
        var r = tx.objectStore(STORE).getAll();
        r.onsuccess = function(){ res(r.result || []); };
        r.onerror = function(){ res([]); };
      } catch(e){ res([]); }
    });
  }

  function dbPutMeta(key, value){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).put({ k: key, v: value, t: Date.now() });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function dbGetMeta(key){
    if(!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(META_STORE, "readonly");
        var r = tx.objectStore(META_STORE).get(key);
        r.onsuccess = function(){ res(r.result ? r.result.v : null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  /* ============================================================
     HULPFUNCTIES
     ============================================================ */
  function getTier(source){
    try {
      if(window.WorldMapData && window.WorldMapData.getTier){
        return window.WorldMapData.getTier(source);
      }
    } catch(e){}
    return 0.5;
  }

  function calculateConfidence(sourcesCount, originsCount){
    var base;
    if(sourcesCount >= 3) base = 0.85;
    else if(sourcesCount >= 2) base = 0.60;
    else if(sourcesCount >= 1) base = 0.33;
    else base = 0;
    if(originsCount >= 2) base = Math.min(1, base + 0.10);
    if(sourcesCount >= 5) base = Math.min(1, base + 0.05);
    return Math.round(base * 100) / 100;
  }

  function getOrigin(source){
    try {
      if(window.WDEventDetector && window.WDEventDetector.getSourceCountry){
        var c = window.WDEventDetector.getSourceCountry(source);
        if(c) return c;
      }
    } catch(e){}
    return null;
  }

  /* ============================================================
     CLAIM VERWERKEN
     ============================================================ */
  function processEvent(ev, aggregator){
    if(!ev) return;
    if(ev.category !== "militair" && ev.category !== "crime") return;
    if(ev.countsForHeat === false) return;
    if(!ev.actorCountries || !ev.actorCountries.length) return;

    var ts = new Date(ev.date).getTime();
    if(isNaN(ts)) return;
    var ageDays = (Date.now() - ts) / 86400000;
    if(ageDays > MAX_AGE_DAYS) return;

    var tier = getTier(ev.source || "");
    var decay = Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
    var weight = tier * decay;
    if(weight < 0.01) return;

    /* Bepaal provincie via lat/lng (meest betrouwbaar) */
    var prov = null;
    if(typeof ev.lat === "number" && typeof ev.lng === "number"){
      prov = ProvinceMapper.getProvinceForPoint(ev.lat, ev.lng, ev.countryISO3);
    }
    /* Fallback: via stad-key uit titel */
    if(!prov){
      var cityKey = null;
      var t = String(ev.title || "").toLowerCase();
      var locs = (window.WorldMapData && window.WorldMapData.LOCATIONS) || {};
      var bestLen = 0;
      for(var key in locs){
        if(key.length < 4) continue;
        if(t.indexOf(key) !== -1 && key.length > bestLen){
          cityKey = key; bestLen = key.length;
        }
      }
      if(cityKey){
        prov = ProvinceMapper.getProvinceForCity(cityKey);
      }
    }
    if(!prov || !prov.iso3) return;

    /* Bepaal GID-key: admin1 als bekend, anders iso3 */
    var gid = prov.iso3 + "|" + (prov.admin1 || "*");

    if(!aggregator[gid]){
      aggregator[gid] = {
        gid: gid,
        iso3: prov.iso3,
        admin1: prov.admin1 || null,
        actors: {},
        rawClaimCount: 0
      };
    }

    var bucket = aggregator[gid];
    bucket.rawClaimCount++;

    /* Actor normaliseren */
    var actor = ProvinceMapper.resolveActor(ev.actorCountries[0]);
    if(!actor || actor === "Onbekend") return;

    if(!bucket.actors[actor]){
      bucket.actors[actor] = {
        actor: actor, score: 0,
        sources: {}, origins: {},
        count: 0, lastClaim: 0
      };
    }

    var ab = bucket.actors[actor];
    ab.score += weight;
    ab.count++;
    ab.lastClaim = Math.max(ab.lastClaim, ts);
    if(ev.source) ab.sources[ev.source] = 1;
    var origin = getOrigin(ev.source);
    if(origin) ab.origins[origin] = 1;
  }

  /* ============================================================
     CONSENSUS BEREKENEN
     ============================================================ */
  function computeConsensus(aggregator){
    var results = [];
    Object.keys(aggregator).forEach(function(gid){
      var bucket = aggregator[gid];
      var actorKeys = Object.keys(bucket.actors);
      if(!actorKeys.length) return;

      /* Sorteer op score */
      var ranked = actorKeys.map(function(k){ return bucket.actors[k]; })
        .sort(function(a, b){ return b.score - a.score; });

      var totalScore = ranked.reduce(function(s, a){ return s + a.score; }, 0);
      if(totalScore < 0.01) return;

      var best = ranked[0];
      var bestShare = best.score / totalScore;
      var bestSourceCount = Object.keys(best.sources).length;
      var bestOriginCount = Object.keys(best.origins).length;
      var confidence = calculateConfidence(bestSourceCount, bestOriginCount);

      /* Contested: 2-3 actoren met share ≥ MIN_ACTOR_SHARE en confidence ≥0.4 */
      var contestedActors = [];
      for(var i = 0; i < ranked.length && i < 3; i++){
        var a = ranked[i];
        var share = a.score / totalScore;
        var srcCount = Object.keys(a.sources).length;
        if(share >= MIN_ACTOR_SHARE && srcCount >= MIN_ACTOR_SOURCES){
          contestedActors.push({ actor: a.actor, share: Math.round(share * 100) });
        }
      }
      var contested = contestedActors.length >= 2;

      results.push({
        gid: gid,
        iso3: bucket.iso3,
        admin1: bucket.admin1,
        dominantActor: best.actor,
        consensusStrength: Math.round(bestShare * 100) / 100,
        confidence: confidence,
        sourceCount: bestSourceCount,
        originCount: bestOriginCount,
        contested: contested,
        contestedActors: contested ? contestedActors : null,
        actors: bucket.actors,
        rawClaimCount: bucket.rawClaimCount,
        updatedAt: Date.now()
      });
    });
    return results;
  }

  /* ============================================================
     RUN
     ============================================================ */
  function runNow(opts){
    opts = opts || {};
    if(isRunning && !opts.force) return Promise.resolve(consensusByGid);
    isRunning = true;

    var startTime = Date.now();
    var events = (window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events))
      ? window.MAPAPI.state.events
      : lastEvents;

    if(!events || !events.length){
      isRunning = false;
      LOG("Geen events om te verwerken");
      return Promise.resolve(consensusByGid);
    }

    if(!ProvinceMapper.isReady()){
      isRunning = false;
      LOG("ProvinceMapper niet klaar — skip run");
      return Promise.resolve(consensusByGid);
    }

    var aggregator = {};
    var processed = 0;
    events.forEach(function(ev){
      try {
        var before = Object.keys(aggregator).length;
        processEvent(ev, aggregator);
        if(Object.keys(aggregator).length > before) processed++;
      } catch(e){}
    });

    var results = computeConsensus(aggregator);

    /* Cache + state */
    consensusByGid = {};
    results.forEach(function(r){ consensusByGid[r.gid] = r; });
    lastRun = Date.now();

    var elapsed = Date.now() - startTime;
    var contestedCount = results.filter(function(r){ return r.contested; }).length;
    LOG("Run klaar — " + results.length + " provincies | " +
        contestedCount + " contested | " + elapsed + "ms");

    /* Persist naar DB */
    var savePromise = dbPutAll(results).then(function(){
      return dbPutMeta("lastRun", lastRun);
    }).catch(function(){});

    /* Emit event */
    return savePromise.then(function(){
      try {
        if(window.WarDesk && WarDesk.events){
          WarDesk.events.emit("province:consensus", {
            byGid: consensusByGid,
            count: results.length,
            contestedCount: contestedCount,
            timestamp: lastRun
          });
        }
      } catch(e){}
      isRunning = false;
      return consensusByGid;
    });
  }

  function scheduleRun(delayMs){
    if(_runTimer) clearTimeout(_runTimer);
    _runTimer = setTimeout(function(){
      _runTimer = null;
      runNow();
    }, delayMs || 2000);
  }

  /* ============================================================
     GETTERS
     ============================================================ */
  function getConsensus(gid){
    return consensusByGid[gid] || null;
  }

  function getConsensusForArea(iso3, admin1){
    var gid = iso3 + "|" + (admin1 || "*");
    return consensusByGid[gid] || null;
  }

  function getAllConsensus(){
    return consensusByGid;
  }

  function getStats(){
    var arr = Object.keys(consensusByGid).map(function(k){ return consensusByGid[k]; });
    return {
      total: arr.length,
      contested: arr.filter(function(r){ return r.contested; }).length,
      avgConfidence: arr.length
        ? Math.round(arr.reduce(function(s, r){ return s + r.confidence; }, 0) / arr.length * 100)
        : 0,
      lastRun: lastRun
    };
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    return openDB().then(function(){
      /* Laad bestaande consensus uit DB */
      return dbGetAll().then(function(rows){
        rows.forEach(function(r){ consensusByGid[r.gid] = r; });
        LOG("Init klaar — " + rows.length + " provincies uit cache");
        return dbGetMeta("lastRun");
      }).then(function(last){
        if(last) lastRun = last;
        return true;
      });
    }).then(function(){
      /* Luister naar events */
      if(window.WarDesk && WarDesk.events && WarDesk.events.on){
        WarDesk.events.on("map:military-events", function(events){
          lastEvents = Array.isArray(events) ? events : [];
          /* Throttle: als laatste run >60 min geleden → direct
             anders: schedule met delay */
          var sinceLast = Date.now() - lastRun;
          if(sinceLast > THROTTLE_MS){
            scheduleRun(3000);
          } else {
            LOG("Throttle actief — nog " +
                Math.round((THROTTLE_MS - sinceLast) / 60000) + " min tot volgende run");
          }
        });
        LOG("EventBus listener actief");
      } else {
        LOG("EventBus niet beschikbaar");
      }

      /* Fallback: elke 5 min checken of 1 uur voorbij is */
      setInterval(function(){
        if(document.hidden) return;
        if(Date.now() - lastRun > 65 * 60 * 1000){
          scheduleRun(1000);
        }
      }, 5 * 60 * 1000);

      return true;
    });
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.ProvinceConsensus = {
    init: init,
    runNow: runNow,
    getConsensus: getConsensus,
    getConsensusForArea: getConsensusForArea,
    getAllConsensus: getAllConsensus,
    getStats: getStats,
    _version: "v1.0"
  };

  LOG("province-consensus.js v1.0 geladen (throttle 60 min, decay 3d)");
})();