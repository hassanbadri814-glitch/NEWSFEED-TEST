/* ============================================================
   WAR DESK — classifier-worker.js v1.0
   Web Worker die classifier.js laadt en artikelen in batches
   classificeert zonder de main thread te blokkeren.

   Protocol:
   - Main → Worker: { type: "classify", id: number, items: [{title, desc, source, index}] }
   - Worker → Main: { type: "result", id: number, results: [{index, category, subtype, confidence, ...}] }
   - Main → Worker: { type: "cancel", id: number }   (annuleert batch)
   - Main → Worker: { type: "ping" }
   - Worker → Main: { type: "pong", version: string }
   ============================================================ */

/* Laad classifier.js in de worker-context.
   classifier.js detecteert zelf dat window niet bestaat
   en schrijft naar self.WDClassifier. */
try {
  importScripts("./classifier.js?v=6.0");
} catch(e) {
  try { console.error("[classifier-worker] importScripts faalde:", e.message); } catch(_){}
}

var WORKER_VERSION = "v1.0";
var BATCH_SIZE = 25;               /* Aantal items per binnengekomen bericht */
var CHUNK_INTERVAL_MS = 0;         /* Eventueel vertragen tussen chunks */
var cancelledIds = {};

function log(){
  try { console.info.apply(console, ["[classifier-worker]"].concat(Array.prototype.slice.call(arguments))); } catch(e){}
}

function getClassifier(){
  if (typeof self !== "undefined" && self.WDClassifier) return self.WDClassifier;
  if (typeof WDClassifier !== "undefined") return WDClassifier;
  return null;
}

function classifyItems(id, items){
  var C = getClassifier();
  if (!C) {
    self.postMessage({
      type: "error",
      id: id,
      error: "WDClassifier niet geladen in worker"
    });
    return;
  }

  var results = [];
  for (var i = 0; i < items.length; i++) {
    if (cancelledIds[id]) {
      delete cancelledIds[id];
      self.postMessage({ type: "cancelled", id: id });
      return;
    }

    var it = items[i];
    var r;
    try {
      r = C.classify(it.title || "", it.desc || "", it.source || "", it.url || "");
    } catch(e) {
      r = {
        category: "civiel", subtype: "Overig", confidence: 0,
        uncertain: true, scores: {}, signals: {},
        meta: { error: e.message || "classify-fout" }
      };
    }

    results.push({
      index: typeof it.index === "number" ? it.index : i,
      category: r.category,
      subtype: r.subtype,
      confidence: r.confidence,
      uncertain: r.uncertain,
      lang: r.lang,
      isSport: r.isSport,
      isFiltered: r.isFiltered
    });
  }

  self.postMessage({
    type: "result",
    id: id,
    results: results,
    version: WORKER_VERSION
  });
}

self.addEventListener("message", function(e){
  var msg = e.data || {};
  var type = msg.type;

  if (type === "ping") {
    self.postMessage({ type: "pong", version: WORKER_VERSION, classifierVersion: getClassifier() ? getClassifier().version : null });
    return;
  }

  if (type === "cancel") {
    if (msg.id != null) cancelledIds[msg.id] = true;
    return;
  }

  if (type === "classify") {
    var id = msg.id;
    var items = msg.items || [];
    if (!id) {
      self.postMessage({ type: "error", error: "Geen id meegegeven" });
      return;
    }

    /* Verwerk in chunks zodat we kunnen annuleren */
    var offset = 0;
    var total = items.length;

    function processChunk(){
      if (cancelledIds[id]) {
        delete cancelledIds[id];
        self.postMessage({ type: "cancelled", id: id });
        return;
      }

      var end = Math.min(offset + BATCH_SIZE, total);
      var chunk = items.slice(offset, end);
      classifyItems(id, chunk);

      offset = end;
      if (offset < total) {
        if (CHUNK_INTERVAL_MS > 0) {
          setTimeout(processChunk, CHUNK_INTERVAL_MS);
        } else {
          processChunk();
        }
      }
    }

    if (total === 0) {
      self.postMessage({ type: "result", id: id, results: [], version: WORKER_VERSION });
      return;
    }

    processChunk();
    return;
  }

  /* Onbekend type — negeer stil */
});

log("Worker " + WORKER_VERSION + " geladen — classifier beschikbaar:", !!getClassifier());