/* ============================================================
   WAR DESK — dedup-worker.js v1.1
   - v1.1: FIX — correcte CDN URL naar transformers.min.js
   ============================================================ */

var pipelineInstance = null;
var TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";
var MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
var loadFailed = false;

function log(msg) {
  self.postMessage({ type: "log", message: msg });
}

async function initPipeline() {
  if (pipelineInstance) return pipelineInstance;
  if (loadFailed) throw new Error("Vorige laadpoging mislukt");

  try {
    importScripts(TRANSFORMERS_URL);
  } catch (e) {
    loadFailed = true;
    throw new Error("Transformers.js laden mislukt: " + e.message);
  }

  var T = self.Transformers;
  if (!T || !T.pipeline) {
    loadFailed = true;
    throw new Error("Transformers global niet gevonden na importScripts");
  }

  T.env.allowLocalModels = false;
  T.env.useBrowserCache = true;
  if (T.env.backends && T.env.backends.onnx && T.env.backends.onnx.wasm) {
    T.env.backends.onnx.wasm.numThreads = 1;
  }

  log("Model wordt geladen (eerste keer ~20s)...");
  pipelineInstance = await T.pipeline("feature-extraction", MODEL_NAME, {
    quantized: true,
    progress_callback: function(p) {
      if (p.status === "progress" && p.progress) {
        self.postMessage({
          type: "progress",
          stage: "download",
          current: Math.round(p.progress),
          total: 100
        });
      }
    }
  });
  log("Model geladen");
  return pipelineInstance;
}

async function embedBatch(articles) {
  var pipe = await initPipeline();
  var out = [];

  for (var i = 0; i < articles.length; i++) {
    var a = articles[i];
    var text = ((a.title || "") + ". " + (a.description || a.summary || "")).slice(0, 512);
    if (!text.trim()) {
      out.push({ id: a.id, vector: null });
      continue;
    }
    try {
      var result = await pipe(text, { pooling: "mean", normalize: true });
      out.push({ id: a.id, vector: Array.from(result.data) });
    } catch (e) {
      out.push({ id: a.id, vector: null });
    }

    if (i % 5 === 0 || i === articles.length - 1) {
      self.postMessage({
        type: "progress",
        stage: "embedding",
        current: i + 1,
        total: articles.length
      });
    }
  }

  return out;
}

self.onmessage = async function(e) {
  var msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === "embed") {
    try {
      var data = await embedBatch(msg.articles || []);
      self.postMessage({ type: "embeddings", data: data });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message || String(err), fatal: loadFailed });
    }
    return;
  }

  if (msg.type === "ping") {
    self.postMessage({ type: "pong" });
  }
};