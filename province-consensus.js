/* ============================================================
   WAR DESK — province-consensus.js v1.16
   - v1.16: Verwijderd: ensureTranslations-aanroep in collectEvents
            (ai-map.js doet dit al met 30-min throttle; hier was
            een bypass die quota opmaakte)
   - v1.15: MIN_ACTOR_SOURCES 1→2 + MIN_DOMINANT_CONFIDENCE 0.5
   - v1.14: ID-dedup in collectEvents
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
  var THROTTLE_MS = 60 * 60 * 1000;
  var OSINT_THROTTLE_MS = 30 * 1000;
  var DECAY_HALF_LIFE_DAYS = 3;
  var MAX_AGE_DAYS = 30;

  var MIN_ACTOR_SHARE = 0.30;
  var MIN_ACTOR_SOURCES = 2;
  var MIN_DOMINANT_CONFIDENCE = 0.50;

  var COUNTRY_DEFAULT_ACTOR = {
    "SYR": "Regering", "UKR": "Oekraïne", "RUS": "Rusland",
    "YEM": "Regering", "ISR": "Israël", "LBN": "Libanese staat",
    "PSE": "Palestina", "SAU": "Saoedi-Arabië",
    "IRQ": "Regering", "IRN": "Iran",
    "SDN": "Regering", "ETH": "Federale regering",
    "MLI": "Junta (Regering)", "BFA": "Junta (Regering)",
    "NER": "Junta (Regering)", "COD": "Regering (FARDC)",
    "MMR": "Militaire junta", "PAK": "Pakistan (Regering)"
  };

  var CONFLICT_ISO3 = [
    "SYR", "UKR", "RUS", "YEM", "ISR", "LBN", "PSE", "SAU", "IRQ", "IRN",
    "SDN", "ETH", "MLI", "BFA", "NER", "COD", "MMR", "PAK"
  ];

  var db = null;
  var lastRun = 0;
  var lastEvents = [];
  var osintEvents = [];
  var consensusByGid = {};
  var isRunning = false;
  var _runTimer = null;

  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "gid" });
          if(!d.objectStoreNames.contains(META_STORE)) d.createObjectStore(META_STORE, { keyPath: "k" });
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
     v1.16: collectEvents zonder vertaal-bypass
     ============================================================ */
  function collectEvents(){
    var combined = [];
    var seen = {};
    var addedFromMap = 0, addedFromLast = 0, addedFromOsint = 0, skippedDup = 0;

    function eventKey(ev){
      if(!ev) return null;
      if(ev.id) return String(ev.id);
      var s = String(ev.source || "");
      var d = String(ev.date || "");
      var t = String(ev.title || "").slice(0, 80);
      return s + "|" + d + "|" + t;
    }

    function add(ev){
      if(!ev) return;
      var k = eventKey(ev);
      if(!k){ return; }
      if(seen[k]){ skippedDup++; return; }
      seen[k] = 1;
      combined.push(ev);
    }

    var state = window.MAPAPI && window.MAPAPI.state;

    if(state){
      if(Array.isArray(state.militaryEvents) && state.militaryEvents.length > 0){
        state.militaryEvents.forEach(function(ev){ add(ev); addedFromMap++; });
      } else if(Array.isArray(state.events) && state.events.length > 0){
        state.events.forEach(function(ev){ add(ev); addedFromMap++; });
      }
    }

    if(!combined.length && Array.isArray(lastEvents) && lastEvents.length > 0){
      lastEvents.forEach(function(ev){ add(ev); addedFromLast++; });
    }

    if(Array.isArray(osintEvents) && osintEvents.length > 0){
      osintEvents.forEach(function(ev){ add(ev); addedFromOsint++; });
      /* v1.16: vertaal-aanroep verwijderd — gebeurt al in ai-map.js */
    }

    if(window.wdLog && skippedDup > 0){
      wdLog.info("[CONSENSUS] collectEvents — map:" + addedFromMap +
        " last:" + addedFromLast + " osint:" + addedFromOsint +
        " | dup geskipt:" + skippedDup + " | totaal:" + combined.length);
    }

    return combined;
  }

  function ensureProvinceMapper(){
    if(!window.ProvinceMapper) return false;
    if(ProvinceMapper.isReady()) return true;
    try {
      var geojsons = null;
      if(window.ConflictAreas && window.ConflictAreas.state){
        geojsons = window.ConflictAreas.state.geojsons;
      }
      if(geojsons && Object.keys(geojsons).length > 0){
        var ok = ProvinceMapper.init(geojsons);
        LOG("Auto-init ProvinceMapper: " + (ok ? "OK" : "faalde"));
        return ok;
      }
    } catch(e){
      LOG("Auto-init error: " + e.message);
    }
    return false;
  }

  function getActors(ev, prov){
    if(ev.actorCountries && ev.actorCountries.length > 0) return ev.actorCountries;
    try {
      if(window.WorldMapData && window.WorldMapData.detectActorsInTitle){
        var text = (ev.title || "") + " " + (ev.description || "");
        var detected = window.WorldMapData.detectActorsInTitle(text);
        if(detected && detected.length > 0) return detected;
      }
    } catch(e){}
    if(prov && prov.iso3 && COUNTRY_DEFAULT_ACTOR[prov.iso3]){
      return [COUNTRY_DEFAULT_ACTOR[prov.iso3]];
    }
    return [];
  }

  function getCategoryBoost(category){
    if(category === "militair" || category === "crime") return 1.0;
    if(category === "politiek") return 0.4;
    if(category === "protest") return 0.3;
    if(category === "civiel") return 0.2;
    return 0;
  }

  function getAllSources(ev){
    var all = [];
    if(ev.source) all.push(ev.source);
    if(ev.isCluster && Array.isArray(ev.sources)){
      ev.sources.forEach(function(s){
        if(s && s.name && all.indexOf(s.name) === -1) all.push(s.name);
      });
    }
    return all;
  }

  function getFallbackActor(ev, prov){
    if(ev.actorCountries && ev.actorCountries.length > 0){
      return "Onbekende " + ev.actorCountries[0];
    }
    if(prov && prov.iso3 && COUNTRY_DEFAULT_ACTOR[prov.iso3]){
      return "Onbekende " + COUNTRY_DEFAULT_ACTOR[prov.iso3];
    }
    return "Onbekende actor";
  }

  function processEvent(ev, aggregator){
    if(!ev) return;

    var categoryBoost = getCategoryBoost(ev.category);
    if(categoryBoost === 0) return;

    var physicalBoost = 1.0;
    if(ev.countsForHeat === false) physicalBoost = 0.3;

    if(CONFLICT_ISO3.indexOf(ev.countryISO3) === -1) return;

    var ts = new Date(ev.date).getTime();
    if(isNaN(ts)) return;
    var ageDays = (Date.now() - ts) / 86400000;
    if(ageDays > MAX_AGE_DAYS) return;

    var tier = getTier(ev.source || "");
    var decay = Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
    var weight = tier * decay * physicalBoost * categoryBoost;
    if(weight < 0.01) return;

    var prov = null;
    if(typeof ev.lat === "number" && typeof ev.lng === "number"){
      prov = ProvinceMapper.getProvinceForPoint(ev.lat, ev.lng, ev.countryISO3);
    }
    if(!prov){
      var cityKey = null;
      var t = String(ev.title || "").toLowerCase();
      var locs = (window.WorldMapData && window.WorldMapData.LOCATIONS) || {};
      var bestLen = 0;
      for(var key in locs){
        if(key.length < 4) continue;
        if(t.indexOf(key) !== -1 && key.length > bestLen){ cityKey = key; bestLen = key.length; }
      }
      if(cityKey) prov = ProvinceMapper.getProvinceForCity(cityKey);
    }
    if(!prov || !prov.iso3) return;

    var actors = getActors(ev, prov);
    if(!actors || !actors.length){
      actors = [getFallbackActor(ev, prov)];
    }

    var gid = prov.iso3 + "|" + (prov.admin1 || "*");
    if(!aggregator[gid]){
      aggregator[gid] = {
        gid: gid, iso3: prov.iso3, admin1: prov.admin1 || null,
        actors: {}, rawClaimCount: 0
      };
    }
    var bucket = aggregator[gid];
    bucket.rawClaimCount++;

    actors.forEach(function(actorRaw){
      var actor = ProvinceMapper.resolveActor(actorRaw);
      if(!actor || actor === "Onbekend"){
        actor = getFallbackActor(ev, prov);
      }
      if(!actor) return;

      if(!bucket.actors[actor]){
        bucket.actors[actor] = {
          actor: actor, score: 0,
          sources: {}, origins: {}, count: 0, lastClaim: 0
        };
      }
      var ab = bucket.actors[actor];
      ab.score += weight;
      ab.count++;
      ab.lastClaim = Math.max(ab.lastClaim, ts);

      getAllSources(ev).forEach(function(src){
        if(!src) return;
        ab.sources[src] = 1;
        var origin = getOrigin(src);
        if(origin) ab.origins[origin] = 1;
      });
    });
  }

  function computeConsensus(aggregator){
    var results = [];
    Object.keys(aggregator).forEach(function(gid){
      var bucket = aggregator[gid];
      var actorKeys = Object.keys(bucket.actors);
      if(!actorKeys.length) return;

      var ranked = actorKeys.map(function(k){ return bucket.actors[k]; })
        .sort(function(a, b){ return b.score - a.score; });

      var totalScore = ranked.reduce(function(s, a){ return s + a.score; }, 0);
      if(totalScore < 0.01) return;

      var best = null;
      for(var i = 0; i < ranked.length; i++){
        var a = ranked[i];
        var srcCount = Object.keys(a.sources).length;
        var orgCount = Object.keys(a.origins).length;
        var conf = calculateConfidence(srcCount, orgCount);
        if(srcCount >= MIN_ACTOR_SOURCES && conf >= MIN_DOMINANT_CONFIDENCE){
          best = a;
          break;
        }
      }

      if(!best) return;

      var bestShare = best.score / totalScore;
      var bestSourceCount = Object.keys(best.sources).length;
      var bestOriginCount = Object.keys(best.origins).length;
      var confidence = calculateConfidence(bestSourceCount, bestOriginCount);

      var contestedActors = [];
      for(var j = 0; j < ranked.length && j < 3; j++){
        var c = ranked[j];
        var share = c.score / totalScore;
        var srcCount2 = Object.keys(c.sources).length;
        if(share >= MIN_ACTOR_SHARE && srcCount2 >= MIN_ACTOR_SOURCES){
          contestedActors.push({ actor: c.actor, share: Math.round(share * 100) });
        }
      }
      var contested = contestedActors.length >= 2;

      results.push({
        gid: gid, iso3: bucket.iso3, admin1: bucket.admin1,
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

  function runNow(opts){
    opts = opts || {};
    if(isRunning && !opts.force) return Promise.resolve(consensusByGid);
    isRunning = true;

    var startTime = Date.now();

    if(!ensureProvinceMapper()){
      var retries = (opts._retries || 0);
      if(retries < 8){
        isRunning = false;
        LOG("PM niet ready — retry " + (retries+1) + "/8");
        return new Promise(function(resolve){
          setTimeout(function(){
            runNow({ force: true, _retries: retries + 1 }).then(resolve);
          }, 2000);
        });
      }
      isRunning = false;
      LOG("PM definitief niet ready — skip");
      return Promise.resolve(consensusByGid);
    }

    var events = collectEvents();
    if(!events.length){
      isRunning = false;
      LOG("Geen events");
      return Promise.resolve(consensusByGid);
    }

    LOG("Verwerken " + events.length + " events (MAP + OSINT)...");

    var aggregator = {};
    events.forEach(function(ev){
      try { processEvent(ev, aggregator); } catch(e){}
    });

    var results = computeConsensus(aggregator);
    consensusByGid = {};
    results.forEach(function(r){ consensusByGid[r.gid] = r; });
    lastRun = Date.now();

    var elapsed = Date.now() - startTime;
    var contestedCount = results.filter(function(r){ return r.contested; }).length;
    LOG("Run klaar — " + results.length + " provincies | " +
        contestedCount + " contested | " + events.length + " events | " + elapsed + "ms");

    return dbPutAll(results).then(function(){
      return dbPutMeta("lastRun", lastRun);
    }).catch(function(){}).then(function(){
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

  function getConsensus(gid){ return consensusByGid[gid] || null; }
  function getConsensusForArea(iso3, admin1){
    return consensusByGid[iso3 + "|" + (admin1 || "*")] || null;
  }
  function getAllConsensus(){ return consensusByGid; }
  function getStats(){
    var arr = Object.keys(consensusByGid).map(function(k){ return consensusByGid[k]; });
    return {
      total: arr.length,
      contested: arr.filter(function(r){ return r.contested; }).length,
      avgConfidence: arr.length
        ? Math.round(arr.reduce(function(s, r){ return s + r.confidence; }, 0) / arr.length * 100)
        : 0,
      lastRun: lastRun,
      osintCount: osintEvents.length
    };
  }

  function init(){
    return openDB().then(function(){
      return dbGetAll().then(function(rows){
        rows.forEach(function(r){ consensusByGid[r.gid] = r; });
        LOG("Init klaar — " + rows.length + " provincies uit cache");
        return dbGetMeta("lastRun");
      }).then(function(last){
        if(last) lastRun = last;
        return true;
      });
    }).then(function(){
      if(window.WarDesk && WarDesk.events && WarDesk.events.on){
        WarDesk.events.on("map:military-events", function(events){
          lastEvents = Array.isArray(events) ? events : [];
          var sinceLast = Date.now() - lastRun;
          if(sinceLast > THROTTLE_MS) scheduleRun(3000);
          else LOG("Throttle — " + Math.round((THROTTLE_MS - sinceLast) / 60000) + " min");
        });
        WarDesk.events.on("osint:military-events", function(events){
          osintEvents = Array.isArray(events) ? events : [];
          LOG("OSINT events ontvangen: " + osintEvents.length);
          var sinceLast = Date.now() - lastRun;
          if(sinceLast > OSINT_THROTTLE_MS){
            LOG("OSINT run direct (throttle OK)");
            scheduleRun(2000);
          } else {
            LOG("OSINT throttle — wacht " + Math.round((OSINT_THROTTLE_MS - sinceLast) / 1000) + " sec");
          }
        });
        LOG("EventBus listeners actief (MAP + OSINT)");
      }
      setInterval(function(){
        if(document.hidden) return;
        if(Date.now() - lastRun > 65 * 60 * 1000) scheduleRun(1000);
      }, 5 * 60 * 1000);
      return true;
    });
  }

  window.ProvinceConsensus = {
    init: init, runNow: runNow,
    getConsensus: getConsensus,
    getConsensusForArea: getConsensusForArea,
    getAllConsensus: getAllConsensus,
    getStats: getStats,
    _version: "v1.16"
  };

  LOG("province-consensus.js v1.16 geladen (geen vertaal-bypass)");
})();