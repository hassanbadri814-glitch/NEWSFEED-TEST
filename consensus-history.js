/* ============================================================
   WAR DESK — consensus-history.js v2.0
   - v2.0: Stability-tracking voor landen zonder DeepState
           Een actor moet 3 opeenvolgende dagen dominant zijn
           voordat hij als "confirmed" wordt beschouwd en de
           fill-kleur van de provincie mag overriden.
           UKR wordt geskipt (DeepState is de bron van waarheid).
   - v1.0: Eerste versie — dagelijkse snapshots + territory changes
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[HISTORY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var DB_NAME = "wardesk_consensus_history";
  var DB_VERSION = 2; /* v2.0: nieuwe store "stability" */
  var STORE_DAILY = "daily";
  var STORE_STABILITY = "stability";

  /* v2.0: stabiliteits-drempel */
  var CONFIRMED_DAYS = 3;  /* 3 opeenvolgende dagen = 72u */
  var MAX_STABILITY_DAYS = 14; /* na 14 dagen geen update → vergeten */

  var db = null;
  var currentChanges = {};
  var lastComparison = 0;
  var confirmedOverrides = {};  /* {gid: actor} — in-memory cache */

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

  function todayKey(){
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayKey(){
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function dayDiff(dayKeyA, dayKeyB){
    /* Verschil in dagen tussen twee YYYY-MM-DD strings */
    var a = new Date(dayKeyA + "T00:00:00Z").getTime();
    var b = new Date(dayKeyB + "T00:00:00Z").getTime();
    return Math.round((a - b) / 86400000);
  }

  /* ============================================================
     Snapshot (bestaande functionaliteit)
     ============================================================ */
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

  /* ============================================================
     Stability tracking (v2.0)
     ============================================================ */

  /*
   * Bepaalt of een gid in een land valt dat DeepState/ISW heeft.
   * Voor die landen skippen we stability tracking.
   */
  function hasExternalControlSource(iso3){
    return iso3 === "UKR";
  }

  function processStability(byGid){
    if (!byGid || typeof byGid !== "object") return Promise.resolve({});

    var today = todayKey();
    var newConfirmed = [];

    /* Haal alle bestaande stability records op */
    return getAll(STORE_STABILITY).then(function(existingRecords){
      var existing = {};
      existingRecords.forEach(function(r){ existing[r.gid] = r; });

      var promises = [];

      Object.keys(byGid).forEach(function(gid){
        var cons = byGid[gid];
        var parts = gid.split("|");
        var iso3 = parts[0];
        var admin1 = parts[1] || null;

        /* Skip landen met DeepState */
        if (hasExternalControlSource(iso3)) return;

        var actor = cons.dominantActor;
        if (!actor) return;

        var rec = existing[gid] || {
          gid: gid,
          iso3: iso3,
          admin1: admin1,
          currentActor: null,
          consecutiveDays: 0,
          lastDayKey: null,
          firstSeenAt: null,
          confirmed: false,
          confirmedAt: null,
          previousActor: null,
          history: []
        };

        var sameActor = (rec.currentActor === actor);
        var lastDay = rec.lastDayKey;

        /* Is het een nieuwe dag sinds laatste update? */
        var isNewDay = !lastDay || dayDiff(today, lastDay) >= 1;
        var isTooOld = lastDay && dayDiff(today, lastDay) > MAX_STABILITY_DAYS;

        if (isTooOld) {
          /* Te oud → reset volledig */
          rec.currentActor = actor;
          rec.consecutiveDays = 1;
          rec.firstSeenAt = Date.now();
          rec.confirmed = false;
          rec.confirmedAt = null;
          rec.previousActor = null;
          rec.history = [];
        } else if (!sameActor) {
          /* Actor gewisseld → reset teller */
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
          /* Zelfde actor, nieuwe dag → increment */
          rec.consecutiveDays += 1;
        }
        /* Anders: zelfde actor, zelfde dag → niks doen */

        /* Update lastDayKey als het een nieuwe dag is */
        if (isNewDay) rec.lastDayKey = today;

        /* Check of hij nu confirmed moet worden */
        if (!rec.confirmed && rec.consecutiveDays >= CONFIRMED_DAYS) {
          rec.confirmed = true;
          rec.confirmedAt = Date.now();

          /* v2.0: alleen een "change" emitteren als de override ECHT
             anders is dan de vorige bevestigde actor. Eerste keer
             confirm is ook een change. */
          newConfirmed.push({
            gid: gid,
            iso3: iso3,
            admin1: admin1,
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

        promises.push(put(STORE_STABILITY, rec));
      });

      return Promise.all(promises).then(function(){
        /* Update in-memory cache */
        confirmedOverrides = {};
        existingRecords.forEach(function(r){ /* placeholder */ });
        return getAll(STORE_STABILITY).then(function(allRecords){
          allRecords.forEach(function(r){
            if (r.confirmed && r.currentActor) {
              confirmedOverrides[r.gid] = r.currentActor;
            }
          });

          /* Emit territory:confirmed voor nieuwe confirmaties */
          if (newConfirmed.length > 0) {
            LOG("Territory confirmed: " + newConfirmed.length + " provincies (≥" + CONFIRMED_DAYS + " dagen)");
            newConfirmed.forEach(function(c){
              LOG("  ✓ " + c.gid + " → " + c.actor + " (" + c.consecutiveDays + " dagen" +
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

          return {
            newConfirmed: newConfirmed,
            overrides: confirmedOverrides
          };
        });
      });
    });
  }

  /* ============================================================
     Bestaande change-detectie (dagelijkse verschillen)
     ============================================================ */
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
            from: old.dominantActor,
            to: cur.dominantActor,
            fromConfidence: old.confidence,
            toConfidence: cur.confidence,
            lossFor: old.dominantActor,
            gainFor: cur.dominantActor
          };
          return;
        }
        if (!old.contested && cur.contested){
          changes[gid] = {
            type: "became-contested",
            actor: cur.dominantActor,
            contestedActors: cur.contestedActors
          };
          return;
        }
        if (old.contested && !cur.contested){
          changes[gid] = {
            type: "resolved",
            actor: cur.dominantActor
          };
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
      var enriched = {
        gid: gid, iso3: iso3, admin1: admin1,
        type: c.type
      };
      if (c.type === "control-change"){
        enriched.from = c.from;
        enriched.to = c.to;
        enriched.fromConfidence = c.fromConfidence;
        enriched.toConfidence = c.toConfidence;
        enriched.gainFor = c.gainFor;
        enriched.lossFor = c.lossFor;
        enriched.label = (admin1 || iso3) + ": " + c.from + " → " + c.to;
      } else if (c.type === "became-contested"){
        enriched.actor = c.actor;
        enriched.contestedActors = c.contestedActors;
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

  /* ============================================================
     Hoofd-functie — combineert snapshot + compare + stability
     ============================================================ */
  function processConsensus(byGid){
    if (!byGid || !Object.keys(byGid).length) return Promise.resolve({});

    return compareWithPrevious(byGid).then(function(changes){
      var enriched = enrichChanges(changes);
      currentChanges = enriched;
      lastComparison = Date.now();

      var changeCount = Object.keys(enriched).length;
      if (changeCount > 0){
        LOG("Vergelijking met gisteren: " + changeCount + " wijzigingen");
      }

      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("territory:changes", {
            changes: enriched,
            count: changeCount,
            timestamp: lastComparison
          });
        }
      } catch(e){}

      /* Stability tracking NA de daily-change compare */
      return processStability(byGid).then(function(stabilityResult){
        return snapshotConsensus(byGid).then(function(){
          return Object.assign({}, enriched, {
            __stability: stabilityResult
          });
        });
      });
    });
  }

  function getChanges(){ return currentChanges; }
  function getLastComparison(){ return lastComparison; }
  function getConfirmedOverrides(){ return confirmedOverrides; }

  /* ============================================================
     Reset (handmatig)
     ============================================================ */
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
      LOG("Init klaar (v2.0, stabiliteit " + CONFIRMED_DAYS + " dagen)");

      /* Laad bestaande confirmed-overrides in memory */
      return getAll(STORE_STABILITY).then(function(records){
        confirmedOverrides = {};
        var count = 0;
        records.forEach(function(r){
          if (r.confirmed && r.currentActor) {
            confirmedOverrides[r.gid] = r.currentActor;
            count++;
          }
        });
        if (count > 0) LOG("Geladen uit cache: " + count + " confirmed overrides");

        /* Emit direct de bestaande overrides zodat kaart kan laden */
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
    _version: "v2.0"
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 2500); });
  } else {
    setTimeout(init, 2500);
  }

  LOG("consensus-history.js v2.0 geladen (" + CONFIRMED_DAYS + "-dagen stabiliteit)");

})();