/* ============================================================
   WAR DESK — classifier-bridge.js v1.0
   Regelt communicatie met classifier-worker.js.
   - Lazy init van de worker
   - Batch-verwerking met Promise
   - Automatische fallback naar sync classify bij:
     * worker niet beschikbaar
     * worker crash
     * timeout (3s per batch)
   - Eén worker instance, hergebruikt
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";
  var WORKER_URL = "./classifier-worker.js?v=1.0";
  var TIMEOUT_MS = 5000;
  var MAX_BATCH = 500;

  var worker = null;
  var workerReady = false;
  var workerFailed = false;
  var pending = {};
  var nextId = 1;

  function log(){
    try {
      if (window.wdLog && window.wdLog.info) {
        window.wdLog.info.apply(null, ["[ClassifierBridge]"].concat(Array.prototype.slice.call(arguments)));
      }
    } catch(e){}
  }

  function logWarn(){
    try {
      if (window.wdLog && window.wdLog.warn) {
        window.wdLog.warn.apply(null, ["[ClassifierBridge]"].concat(Array.prototype.slice.call(arguments)));
      }
    } catch(e){}
  }

  function isWorkerSupported(){
    return typeof Worker !== "undefined" &&
           typeof URL !== "undefined" &&
           typeof URL.createObjectURL === "function";
  }

  function handleMessage(e){
    var msg = e.data || {};
    var id = msg.id;
    if (!id || !pending[id]) return;

    var p = pending[id];
    delete pending[id;

    if (p.timer) { clearTimeout(p.timer); p.timer = null; }

    if (msg.type === "result") {
      if (Array.isArray(msg.results)) {
        p.resolve(msg.results);
      } else {
        p.reject(new Error("Worker gaf geen results-array"));
      }
    } else if (msg.type === "cancelled") {
      p.reject(new Error("Geannuleerd"));
    } else if (msg.type === "error") {
      p.reject(new Error(msg.error || "Worker error"));
    } else {
      p.reject(new Error("Onbekend bericht: " + msg.type));
    }
  }

  function ensureWorker(){
    if (workerFailed) return null;
    if (worker) return worker;
    if (!isWorkerSupported()) {
      workerFailed = true;
      logWarn("Worker niet ondersteund — fallback naar sync");
      return null;
    }

    try {
      worker = new Worker(WORKER_URL);
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", function(e){
        logWarn("Worker error:", e.message || "onbekend");
        workerFailed = true;
        /* Alle pending promises rejecten */
        Object.keys(pending).forEach(function(id){
          var p = pending[id];
          if (p && p.timer) clearTimeout(p.timer);
          if (p && p.reject) p.reject(new Error("Worker crash"));
          delete pending[id];
        });
      });
      worker.addEventListener("messageerror", function(){
        logWarn("Worker messageerror");
      });
      workerReady = true;
      log("Worker gestart —", WORKER_URL);
      return worker;
    } catch(e) {
      workerFailed = true;
      logWarn("Kon worker niet starten:", e.message);
      return null;
    }
  }

  function syncFallback(items){
    var C = window.WDClassifier;
    if (!C) {
      logWarn("Geen WDClassifier beschikbaar voor fallback");
      return items.map(function(it, i){
        return {
          index: typeof it.index === "number" ? it.index : i,
          category: "civiel",
          subtype: "Overig",
          confidence: 0,
          uncertain: true
        };
      });
    }
    return items.map(function(it, i){
      var r;
      try {
        r = C.classify(it.title || "", it.desc || "", it.source || "", it.url || "");
      } catch(e) {
        r = { category: "civiel", subtype: "Overig", confidence: 0, uncertain: true };
      }
      return {
        index: typeof it.index === "number" ? it.index : i,
        category: r.category,
        subtype: r.subtype,
        confidence: r.confidence,
        uncertain: r.uncertain,
        lang: r.lang,
        isSport: r.isSport,
        isFiltered: r.isFiltered
      };
    });
  }

  /**
   * Classificeer een array van artikelen.
   * @param {Array} items - [{ title, desc, source, url, index }]
   * @returns {Promise<Array>} - [{ index, category, subtype, confidence, ... }]
   */
  function classifyBatch(items){
    if (!Array.isArray(items) || items.length === 0) {
      return Promise.resolve([]);
    }

    /* Cap de batch-grootte om memory-issues te voorkomen */
    if (items.length > MAX_BATCH) {
      var chunks = [];
      for (var i = 0; i < items.length; i += MAX_BATCH) {
        chunks.push(items.slice(i, i + MAX_BATCH));
      }
      return Promise.all(chunks.map(classifyBatch)).then(function(results){
        var flat = [];
        results.forEach(function(r){ flat = flat.concat(r); });
        return flat;
      });
    }

    var w = ensureWorker();
    if (!w) {
      return Promise.resolve(syncFallback(items));
    }

    return new Promise(function(resolve, reject){
      var id = nextId++;
      var timer = setTimeout(function(){
        if (pending[id]) {
          delete pending[id];
          logWarn("Worker timeout na " + TIMEOUT_MS + "ms — fallback sync voor " + items.length + " items");
          try { resolve(syncFallback(items)); } catch(e){ reject(e); }
        }
      }, TIMEOUT_MS);

      pending[id] = { resolve: resolve, reject: reject, timer: timer };

      try {
        w.postMessage({ type: "classify", id: id, items: items });
      } catch(e) {
        clearTimeout(timer);
        delete pending[id];
        logWarn("postMessage faalde:", e.message);
        resolve(syncFallback(items));
      }
    });
  }

  function ping(){
    var w = ensureWorker();
    if (!w) return Promise.resolve({ ok: false, reason: "no-worker" });
    return new Promise(function(resolve){
      var id = nextId++;
      var timer = setTimeout(function(){
        if (pending[id]) {
          delete pending[id];
          resolve({ ok: false, reason: "timeout" });
        }
      }, 2000);
      pending[id] = {
        resolve: function(r){ resolve({ ok: true, version: r }); },
        reject: function(e){ resolve({ ok: false, reason: e.message }); },
        timer: timer
      };
      try { w.postMessage({ type: "ping" }); } catch(e){ resolve({ ok: false, reason: e.message }); }
    });
  }

  function getStatus(){
    return {
      version: VERSION,
      supported: isWorkerSupported(),
      ready: workerReady,
      failed: workerFailed,
      pendingCount: Object.keys(pending).length,
      workerExists: !!worker
    };
  }

  function terminate(){
    if (worker) {
      try { worker.terminate(); } catch(e){}
      worker = null;
      workerReady = false;
    }
    Object.keys(pending).forEach(function(id){
      var p = pending[id];
      if (p && p.timer) clearTimeout(p.timer);
      if (p && p.reject) p.reject(new Error("Bridge terminated"));
    });
    pending = {};
    log("Bridge getermineerd");
  }

  window.ClassifierBridge = {
    version: VERSION,
    classifyBatch: classifyBatch,
    ping: ping,
    getStatus: getStatus,
    terminate: terminate
  };

  log(VERSION + " geladen — worker URL: " + WORKER_URL);

})();