/* ============================================================
   WAR DESK — cache-manager.js v1.0
   - Periodieke IndexedDB opruiming (6u interval)
   - Agressieve prune als totale grootte > 40MB
   - Storage quota monitoring
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";
  var CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  var MAX_TOTAL_BYTES = 40 * 1024 * 1024;

  var REGISTRY = [
    { db: "wardesk_conflict_areas",   store: "geojson",   maxAge: 30 * 86400000 },
    { db: "wardesk_worldmap",         store: "city_status", maxAge: 180 * 86400000 },
    { db: "wardesk_worldmap",         store: "snapshots", maxAge: 30 * 86400000 },
    { db: "wardesk_province_consensus", store: "consensus", maxAge: 30 * 86400000 },
    { db: "wardesk_province_consensus", store: "meta",     maxAge: 30 * 86400000 },
    { db: "wardesk_consensus_history", store: "daily",    maxAge: 30 * 86400000 },
    { db: "wardesk_consensus_history", store: "stability", maxAge: 90 * 86400000 }
  ];

  function openDB(name, version){
    return new Promise(function(resolve){
      try {
        var req = indexedDB.open(name, version || 1);
        req.onsuccess = function(e){ resolve(e.target.result); };
        req.onerror = function(){ resolve(null); };
        req.onblocked = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }

  function getAllFromStore(db, storeName){
    if (!db || !db.objectStoreNames.contains(storeName)) return Promise.resolve([]);
    return new Promise(function(resolve){
      try {
        var tx = db.transaction(storeName, "readonly");
        var store = tx.objectStore(storeName);
        var r = store.getAll();
        r.onsuccess = function(){ resolve(r.result || []); };
        r.onerror = function(){ resolve([]); };
      } catch(e){ resolve([]); }
    });
  }

  function deleteFromStore(db, storeName, keys){
    if (!db || !keys.length) return Promise.resolve(0);
    return new Promise(function(resolve){
      try {
        var tx = db.transaction(storeName, "readwrite");
        var store = tx.objectStore(storeName);
        keys.forEach(function(k){ store.delete(k); });
        tx.oncomplete = function(){ resolve(keys.length); };
        tx.onerror = function(){ resolve(0); };
      } catch(e){ resolve(0); }
    });
  }

  function estimateSize(obj){
    try { return JSON.stringify(obj).length; }
    catch(e){ return 0; }
  }

  function getKey(row){
    return row.k || row.city || row.gid || row.date || row.key || null;
  }

  function getTimestamp(row){
    if (row.t) return row.t;
    if (row.timestamp) return row.timestamp;
    if (row.date){
      var d = new Date(row.date).getTime();
      if (!isNaN(d)) return d;
    }
    return 0;
  }

  function pruneEntry(entry){
    return openDB(entry.db).then(function(db){
      if (!db) return { db: entry.db, store: entry.store, pruned: 0, size: 0 };

      return getAllFromStore(db, entry.store).then(function(rows){
        var now = Date.now();
        var toDelete = [];
        var totalSize = 0;

        rows.forEach(function(row){
          totalSize += estimateSize(row);
          var ts = getTimestamp(row);
          if (ts && (now - ts) > entry.maxAge){
            var key = getKey(row);
            if (key) toDelete.push(key);
          }
        });

        return deleteFromStore(db, entry.store, toDelete).then(function(){
          try { db.close(); } catch(e){}
          return { db: entry.db, store: entry.store, pruned: toDelete.length, size: totalSize };
        });
      });
    });
  }

  function aggressivePrune(){
    return Promise.all(REGISTRY.map(function(entry){
      return openDB(entry.db).then(function(db){
        if (!db) return 0;
        return getAllFromStore(db, entry.store).then(function(rows){
          if (rows.length < 2){
            try { db.close(); } catch(e){}
            return 0;
          }
          rows.sort(function(a, b){
            return getTimestamp(a) - getTimestamp(b);
          });
          var half = rows.slice(0, Math.floor(rows.length / 2));
          var keys = half.map(getKey).filter(Boolean);
          return deleteFromStore(db, entry.store, keys).then(function(n){
            try { db.close(); } catch(e){}
            return n;
          });
        });
      });
    })).then(function(counts){
      var total = counts.reduce(function(a, b){ return a + b; }, 0);
      try { wdLog.warn("[Cache] Agressieve prune: " + total + " entries verwijderd"); } catch(e){}
      return { pruned: total, size: 0, aggressive: true };
    });
  }

  function prune(){
    var start = Date.now();
    return Promise.all(REGISTRY.map(pruneEntry)).then(function(results){
      var totalPruned = 0, totalSize = 0;
      results.forEach(function(r){
        totalPruned += r.pruned || 0;
        totalSize += r.size || 0;
      });

      var sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      var elapsed = Date.now() - start;

      try {
        wdLog.info("[Cache] Prune klaar — " + totalPruned + " entries verwijderd, " +
          sizeMB + "MB totaal, " + elapsed + "ms");
      } catch(e){}

      if (totalSize > MAX_TOTAL_BYTES){
        try { wdLog.warn("[Cache] " + sizeMB + "MB > 40MB — agressief prunen"); } catch(e){}
        return aggressivePrune();
      }

      return { pruned: totalPruned, size: totalSize };
    }).catch(function(e){
      try { wdLog.warn("[Cache] Prune faalde: " + (e && e.message)); } catch(err){}
      return { pruned: 0, size: 0 };
    });
  }

  function stats(){
    return Promise.all(REGISTRY.map(function(entry){
      return openDB(entry.db).then(function(db){
        if (!db) return { db: entry.db, store: entry.store, count: 0, size: 0 };
        return getAllFromStore(db, entry.store).then(function(rows){
          var size = rows.reduce(function(acc, r){ return acc + estimateSize(r); }, 0);
          try { db.close(); } catch(e){}
          return { db: entry.db, store: entry.store, count: rows.length, size: size };
        });
      });
    })).then(function(results){
      var total = results.reduce(function(a, r){ return a + r.size; }, 0);
      return {
        entries: results,
        totalBytes: total,
        totalMB: (total / (1024 * 1024)).toFixed(2)
      };
    });
  }

  function getStorageEstimate(){
    if (navigator.storage && navigator.storage.estimate){
      return navigator.storage.estimate().then(function(est){
        return {
          usedMB: (est.usage / (1024 * 1024)).toFixed(1),
          quotaMB: (est.quota / (1024 * 1024)).toFixed(1),
          percent: Math.round((est.usage / est.quota) * 100)
        };
      }).catch(function(){ return null; });
    }
    return Promise.resolve(null);
  }

  function schedulePeriodicPrune(){
    setTimeout(function(){
      prune().then(function(){
        getStorageEstimate().then(function(est){
          if (est){
            try {
              wdLog.info("[Cache] Storage: " + est.usedMB + "/" + est.quotaMB +
                "MB (" + est.percent + "%)");
            } catch(e){}
          }
        });
      });
    }, 15000);

    setInterval(function(){
      if (document.hidden) return;
      prune();
    }, CHECK_INTERVAL_MS);
  }

  function init(){
    schedulePeriodicPrune();
    try { wdLog.info("[Cache] Manager " + VERSION + " actief — " + REGISTRY.length + " stores"); } catch(e){}
  }

  window.WDCache = {
    version: VERSION,
    init: init,
    prune: prune,
    aggressivePrune: aggressivePrune,
    stats: stats,
    getStorageEstimate: getStorageEstimate,
    register: function(db, store, maxAge){
      REGISTRY.push({ db: db, store: store, maxAge: maxAge });
    },
    _registry: REGISTRY
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

})();