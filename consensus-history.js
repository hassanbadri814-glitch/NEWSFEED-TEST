/* ============================================================
   WAR DESK — consensus-history.js v2.2
   - v2.2: Batch-write voor stability records (1 transactie
           ipv 27 per run)
   - v2.1: Override vervalt na 7 dagen
   - v2.0: Stability-tracking voor landen zonder DeepState
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[HISTORY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var DB_NAME = "wardesk_consensus_history";
  var DB_VERSION = 2;
  var STORE_DAILY = "daily";
  var STORE_STABILITY = "stability";

  var CONFIRMED_DAYS = 3;
  var MAX_STABILITY_DAYS = 7;
  var MAX_STABILITY_RESET = 14;

  var db = null;
  var currentChanges = {};
  var lastComparison = 0;
  var confirmedOverrides = {};

  function openDB(){
    return new Promise(function(resolve){
      try {
        if (!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_DAILY)){
            d.createObjectStore(STORE_DAILY, { keyPath: "date" });
          }
          if (!d.objectStoreNames.contains(STORE_STABILITY)){
            d.createObjectStore(STORE_STABILITY, { keyPath: "gid" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function put(storeName, record){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(record);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  /* v2.2: batch-write van N records in 1 transactie */
  function putMany(storeName, records){
    if (!db || !records || !records.length) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(storeName, "readwrite");
        var store = tx.objectStore(storeName);
        records.forEach(function(r){ store.put(r); });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function get(storeName, key){
    if (!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(storeName, "readonly");
        var r = tx.objectStore(storeName).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function getAll(storeName){
    if (!db) return Promise.resolve([]);
    return new Promise(function(res){
      try {
        var tx = db.transaction(storeName, "readonly");
        var r = tx.objectStore(storeName).getAll();
        r.onsuccess = function(){ res(r.result || []); };
        r.onerror = function(){ res([]); };
      } catch(e){ res([]); }
    });
  }

  function del(storeName, key){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function todayKey(){ return new Date().toISOString().slice(0, 10); }

  function yesterdayKey(){
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function dayDiff(dayKeyA, dayKeyB){
    if (!dayKeyA || !dayKeyB) return 0;
    var a = new Date(dayKeyA + "T00:00:00Z").getTime();
    var b = new Date(dayKeyB + "T00:00:00Z").getTime();
    return Math.round((a - b) / 86400000);
  }

  function snapshotConsensus(byGid){
    if (!byGid || typeof byGid !== "object") return Promise.resolve();
    var key = todayKey();
    var minimal = {};
    Object.keys(byGid).forEach(function(gid){
      var c = byGid[gid];
      minimal[gid] = {
        dominantActor: c.dominantActor,
        confidence: c.confidence,
        contested: c.contested,
        contestedActors: c.contestedActors || null
      };
    });
    var record = { date: key, timestamp: Date.now(), byGid: minimal };
    return put(STORE_DAILY, record).then(function(){
      LOG("Snapshot opgeslagen voor " + key + " (" + Object.keys(minimal).length + " provincies)");
    });
  }

  function hasExternalControlSource(iso3){
    return iso3 === "UKR";
  }

  /* ============================================================
     v2.2: processStability met batch-write
     ============================================================ */
  function processStability(byGid){
    if (!byGid || typeof byGid !== "object") return Promise.resolve({});

    var today = todayKey();
    var newConfirmed = [];
    var expiredOverrides = [];

    return getAll(STORE_STABILITY).then(function(existingRecords){
      var existing = {};
      existingRecords.forEach(function(r){ existing[r.gid] = r; });

      var toWrite = [];

      Object.keys(byGid).forEach(function(gid){
        var cons = byGid[gid];
        var parts = gid.split("|");
        var iso3 = parts[0];
        var admin1 = parts[1] || null;

        if (hasExternalControlSource(iso3)) return;

        var actor = cons.dominantActor;
        if (!actor) return;

        var rec = existing[gid] || {
          gid: gid, iso3: iso3, admin1: admin1,
          currentActor: null, consecutiveDays: 0,
          lastDayKey: null, firstSeenAt: null,
          confirmed: false, confirmedAt: null,
          previousActor: null, history: []
        };

        if (rec.confirmed && rec.lastDayKey) {
          var overrideAge = dayDiff(today, rec.lastDayKey);
          if (overrideAge > MAX_STABILITY_DAYS) {
            rec.confirmed = false;
            rec.confirmedAt = null;
            rec.consecutiveDays = 0;
            expiredOverrides.push(gid);
          }
        }

        var sameActor = (rec.currentActor === actor);
        var lastDay = rec.lastDayKey;
        var isNewDay = !lastDay || dayDiff(today, lastDay) >= 1;
        var isTooOld = lastDay && dayDiff(today, lastDay) > MAX_STABILITY_RESET;

        if (isTooOld) {
          rec.currentActor = actor;
          rec.consecutiveDays = 1;
          rec.firstSeenAt = Date.now();
          rec.confirmed = false;
          rec.confirmedAt = null;
          rec.previousActor = null;
          rec.history = [];
        } else if (!sameActor) {
          var wasConfirmed = rec.confirmed;
          rec.previousActor = rec.currentActor;
          rec.currentActor = actor;
          rec.consecutiveDays = 1;
          rec.firstSeenAt = Date.now();
          rec.confirmed = false;
          rec.confirmedAt = null;
          rec.history.push({
            at: Date.now(),
            from: wasConfirmed ? rec.previousActor : null,
            to: actor,
            type: "actor-changed"
          });
          if (rec.history.length > 10) rec.history = rec.history.slice(-10);
        } else if (isNewDay) {
          rec.consecutiveDays += 1;
        }

        if (isNewDay) rec.lastDayKey = today;

        if (!rec.confirmed && rec.consecutiveDays >= CONFIRMED_DAYS) {
          rec.confirmed = true;
          rec.confirmedAt = Date.now();
          newConfirmed.push({
            gid: gid, iso3: iso3, admin1: admin1,
            actor: actor,
            previousActor: rec.previousActor,
            confidence: cons.confidence,
            consecutiveDays: rec.consecutiveDays
          });
          rec.history.push({
            at: Date.now(),
            type: "confirmed",
            actor: actor,
            days: rec.consecutiveDays
          });
          if (rec.history.length > 10) rec.history = rec.history.slice(-10);
        }

        toWrite.push(rec);
      });

      /* v2.2: alles in 1 transactie */
      return putMany(STORE_STABILITY, toWrite).then(function(){
        return getAll(STORE_STABILITY).then(function(allRecords){
          confirmedOverrides = {};
          allRecords.forEach(function(r){
            if (r.confirmed && r.currentActor) {
              confirmedOverrides[r.gid] = r.currentActor;
            }
          });

          if (toWrite.length > 1){
            LOG("Stability batch-write: " + toWrite.length + " records");
          }

          if (newConfirmed.length > 0) {
            LOG("Territory confirmed: " + newConfirmed.length + " provincies");
            newConfirmed.forEach(function(c){
              LOG("  ✓ " + c.gid + " → " + c.actor + " (" + c.consecutiveDays + "d" +
                  (c.previousActor ? ", was " + c.previousActor : "") + ")");
            });
            try {
              if (window.WarDesk && WarDesk.events) {
                WarDesk.events.emit("territory:confirmed", {
                  confirmed: newConfirmed,
                  overrides: confirmedOverrides,
                  timestamp: Date.now()
                });
              }
            } catch(e){}
          }

          if (expiredOverrides.length > 0) {
            LOG("Overrides vervallen: " + expiredOverrides.length + " provincies");
            try {
              if (window.WarDesk && WarDesk.events) {
                WarDesk.events.emit("territory:confirmed", {
                  confirmed: [],
                  expired: expiredOverrides,
                  overrides: confirmedOverrides,
                  timestamp: Date.now()
                });
              }
            } catch(e){}
          }

          return { newConfirmed: newConfirmed, overrides: confirmedOverrides, expired: expiredOverrides };
        });
      });
    });
  }

  function compareWithPrevious(byGid){
    if (!byGid) return Promise.resolve({});
    var prevKey = yesterdayKey();
    return get(STORE_DAILY, prevKey).then(function(prevRec){
      if (!prevRec || !prevRec.byGid) {
        LOG("Geen vorige snapshot voor " + prevKey + " — geen vergelijking");
        return {};
      }
      var prev = prevRec.byGid;
      var changes = {};
      Object.keys(byGid).forEach(function(gid){
        var cur = byGid[gid];
        var old = prev[gid];
        if (!old) {
          changes[gid] = { type: "new", actor: cur.dominantActor, confidence: cur.confidence };
          return;
        }
        if (old.dominantActor !== cur.dominantActor){
          changes[gid] = {
            type: "control-change",
            from: old.dominantActor, to: cur.dominantActor,
            fromConfidence: old.confidence, toConfidence: cur.confidence,
            lossFor: old.dominantActor, gainFor: cur.dominantActor
          };
          return;
        }
        if (!old.contested && cur.contested){
          changes[gid] = { type: "became-contested", actor: cur.dominantActor, contestedActors: cur.contestedActors };
          return;
        }
        if (old.contested && !cur.contested){
          changes[gid] = { type: "resolved", actor: cur.dominantActor };
        }
      });
      return changes;
    });
  }

  function enrichChanges(changes){
    var out = {};
    Object.keys(changes).forEach(function(gid){
      var c = changes[gid];
      var parts = gid.split("|");
      var iso3 = parts[0];
      var admin1 = parts[1] || null;
      var enriched = { gid: gid, iso3: iso3, admin1: admin1, type: c.type, timestamp: Date.now() };
      if (c.type === "control-change"){
        enriched.from = c.from; enriched.to = c.to;
        enriched.fromConfidence = c.fromConfidence; enriched.toConfidence = c.toConfidence;
        enriched.gainFor = c.gainFor; enriched.lossFor = c.lossFor;
        enriched.label = (admin1 || iso3) + ": " + c.from + " → " + c.to;
      } else if (c.type === "became-contested"){
        enriched.actor = c.actor; enriched.contestedActors = c.contestedActors;
        enriched.label = (admin1 || iso3) + ": betwist (" + (c.contestedActors || []).map(function(a){ return a.actor; }).join(" vs ") + ")";
      } else if (c.type === "resolved"){
        enriched.actor = c.actor;
        enriched.label = (admin1 || iso3) + ": gestabiliseerd onder " + c.actor;
      } else if (c.type === "new"){
        enriched.actor = c.actor;
        enriched.label = (admin1 || iso3) + ": nieuw event voor " + c.actor;
      }
      out[gid] = enriched;
    });
    return out;
  }

  function processConsensus(byGid){
    if (!byGid || !Object.keys(byGid).length) return Promise.resolve({});

    return compareWithPrevious(byGid).then(function(changes){
      var enriched = enrichChanges(changes);
      currentChanges = enriched;
      lastComparison = Date.now();

      if (Object.keys(enriched).length > 0){
        LOG("Vergelijking met gisteren: " + Object.keys(enriched).length + " wijzigingen");
      }

      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("territory:changes", {
            changes: enriched,
            count: Object.keys(enriched).length,
            timestamp: lastComparison
          });
        }
      } catch(e){}

      return processStability(byGid).then(function(stabilityResult){
        return snapshotConsensus(byGid).then(function(){
          return Object.assign({}, enriched, { __stability: stabilityResult });
        });
      });
    });
  }

  function getChanges(){ return currentChanges; }
  function getLastComparison(){ return lastComparison; }
  function getConfirmedOverrides(){ return confirmedOverrides; }

  function resetStability(){
    return getAll(STORE_STABILITY).then(function(records){
      return Promise.all(records.map(function(r){ return del(STORE_STABILITY, r.gid); }));
    }).then(function(){
      confirmedOverrides = {};
      LOG("Stability tracking volledig gereset");
      return true;
    });
  }

  function cleanupOldSnapshots(){
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    var cutoffKey = cutoff.toISOString().slice(0, 10);
    return getAll(STORE_DAILY).then(function(all){
      var toDelete = all.filter(function(r){ return r.date < cutoffKey; });
      if (!toDelete.length) return;
      return new Promise(function(res){
        var tx = db.transaction(STORE_DAILY, "readwrite");
        var store = tx.objectStore(STORE_DAILY);
        toDelete.forEach(function(r){ store.delete(r.date); });
        tx.oncomplete = function(){ LOG("Cleanup: " + toDelete.length + " oude snapshots verwijderd"); res(); };
        tx.onerror = function(){ res(); };
      });
    });
  }

  function init(){
    return openDB().then(function(){
      LOG("Init klaar (v2.2, stabiliteit " + CONFIRMED_DAYS + " dagen, override-verval " + MAX_STABILITY_DAYS + " dagen)");

      return getAll(STORE_STABILITY).then(function(records){
        confirmedOverrides = {};
        var count = 0;
        var today = todayKey();
        records.forEach(function(r){
          if (r.confirmed && r.currentActor) {
            if (r.lastDayKey) {
              var age = dayDiff(today, r.lastDayKey);
              if (age > MAX_STABILITY_DAYS) {
                LOG("Verlopen override genegeerd bij load: " + r.gid + " (" + age + "d)");
                return;
              }
            }
            confirmedOverrides[r.gid] = r.currentActor;
            count++;
          }
        });
        if (count > 0) LOG("Geladen uit cache: " + count + " geldige confirmed overrides");

        try {
          if (window.WarDesk && WarDesk.events && count > 0) {
            setTimeout(function(){
              WarDesk.events.emit("territory:confirmed", {
                confirmed: [],
                overrides: confirmedOverrides,
                timestamp: Date.now(),
                fromCache: true
              });
            }, 800);
          }
        } catch(e){}

        return cleanupOldSnapshots();
      });
    }).then(function(){
      if (window.WarDesk && WarDesk.events && WarDesk.events.on){
        WarDesk.events.on("province:consensus", function(data){
          if (data && data.byGid) processConsensus(data.byGid);
        });
        LOG("EventBus listener actief");
      }
    });
  }

  window.ConsensusHistory = {
    init: init,
    snapshot: snapshotConsensus,
    compare: compareWithPrevious,
    process: processConsensus,
    getChanges: getChanges,
    getLastComparison: getLastComparison,
    getConfirmedOverrides: getConfirmedOverrides,
    resetStability: resetStability,
    cleanup: cleanupOldSnapshots,
    _version: "v2.2"
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 2500); });
  } else {
    setTimeout(init, 2500);
  }

  LOG("consensus-history.js v2.2 geladen (batch-writes)");

})();