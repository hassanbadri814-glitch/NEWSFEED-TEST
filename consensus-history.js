/* ============================================================
   WAR DESK — consensus-history.js v1.0 (NIEUW)
   ------------------------------------------------------------
   - Houdt per dag de consensus bij (IndexedDB)
   - Berekent terreinwinst en -verlies t.o.v. vorige periode
   - Emit "territory:changes" event met gain/loss per provincie
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[HISTORY]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var DB_NAME = "wardesk_consensus_history";
  var DB_VERSION = 1;
  var STORE = "daily";

  var db = null;
  var currentChanges = {};
  var lastComparison = 0;

  function openDB(){
    return new Promise(function(resolve){
      try {
        if (!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if (!d.objectStoreNames.contains(STORE)){
            d.createObjectStore(STORE, { keyPath: "date" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function put(record){
    if (!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(record);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }

  function get(dateKey){
    if (!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE, "readonly");
        var r = tx.objectStore(STORE).get(dateKey);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function getAll(){
    if (!db) return Promise.resolve([]);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE, "readonly");
        var r = tx.objectStore(STORE).getAll();
        r.onsuccess = function(){ res(r.result || []); };
        r.onerror = function(){ res([]); };
      } catch(e){ res([]); }
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

  function weekAgoKey(){
    var d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }

  /* ============================================================
     Sla de huidige consensus op per dag
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
    return put(record).then(function(){
      LOG("Snapshot opgeslagen voor " + key + " (" + Object.keys(minimal).length + " provincies)");
    });
  }

  /* ============================================================
     Vergelijk huidige consensus met vorige dag
     ============================================================ */
  function compareWithPrevious(byGid){
    if (!byGid) return Promise.resolve({});
    var prevKey = yesterdayKey();
    return get(prevKey).then(function(prevRec){
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

  /* ============================================================
     Koppel veranderingen aan leesbare info
     ============================================================ */
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
        enriched.label = (admin1 || iso1) + ": gestabiliseerd onder " + c.actor;
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

      return snapshotConsensus(byGid).then(function(){
        return enriched;
      });
    });
  }

  function getChanges(){ return currentChanges; }
  function getLastComparison(){ return lastComparison; }

  function cleanupOldSnapshots(){
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    var cutoffKey = cutoff.toISOString().slice(0, 10);
    return getAll().then(function(all){
      var toDelete = all.filter(function(r){ return r.date < cutoffKey; });
      if (!toDelete.length) return;
      return new Promise(function(res){
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        toDelete.forEach(function(r){ store.delete(r.date); });
        tx.oncomplete = function(){ LOG("Cleanup: " + toDelete.length + " oude snapshots verwijderd"); res(); };
        tx.onerror = function(){ res(); };
      });
    });
  }

  function init(){
    return openDB().then(function(){
      LOG("Init klaar");
      return cleanupOldSnapshots();
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
    cleanup: cleanupOldSnapshots,
    _version: "v1.0"
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 2500); });
  } else {
    setTimeout(init, 2500);
  }

  LOG("consensus-history.js v1.0 geladen");

})();