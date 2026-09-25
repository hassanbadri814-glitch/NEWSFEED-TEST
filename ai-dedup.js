/* ============================================================
   WAR DESK — ai-dedup.js v1.0
   Semantische dedup orchestrator (main thread)
   ============================================================ */

(function(){
  "use strict";

  var SIMILARITY_THRESHOLD = 0.75;
  var MAX_ARTICLES_TO_EMBED = 200;
  var STORAGE_KEY = "war_desk_embedding_cache_v1";
  var CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  var worker = null;
  var isProcessing = false;
  var embeddingCache = {};

  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function loadCache() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      var now = Date.now();
      for (var k in parsed) {
        if (now - parsed[k].t < CACHE_MAX_AGE) {
          embeddingCache[k] = parsed[k];
        }
      }
    } catch(e){}
  }

  var saveTimer = null;
  function saveCache() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      try {
        var keys = Object.keys(embeddingCache);
        if (keys.length > 500) {
          keys.sort(function(a, b){ return embeddingCache[b].t - embeddingCache[a].t; });
          var toKeep = {};
          for (var i = 0; i < 500; i++) toKeep[keys[i]] = embeddingCache[keys[i]];
          embeddingCache = toKeep;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(embeddingCache));
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Dedup] Cache opslaan mislukt: " + e.message);
      }
    }, 5000);
  }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  }

  function articleKey(a) {
    var text = ((a.title || "") + "|" + (a.description || "")).slice(0, 200);
    return hashCode(text);
  }

  function getWorker() {
    if (worker) return worker;
    try {
      worker = new Worker("dedup-worker.js");
      worker.onmessage = onWorkerMessage;
      worker.onerror = function(e) {
        if (window.wdLog) wdLog.warn("[Dedup] Worker error: " + (e.message || "onbekend"));
      };
      return worker;
    } catch(e) {
      if (window.wdLog) wdLog.warn("[Dedup] Worker niet beschikbaar: " + e.message);
      return null;
    }
  }

  var pendingArticles = null;
  var pendingCached = null;

  function onWorkerMessage(e) {
    var msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === "log") {
      if (window.wdLog) wdLog.info("[Dedup-Worker] " + msg.message);
      return;
    }

    if (msg.type === "progress") {
      if (window.wdLog && msg.stage === "embedding" && msg.current % 25 === 0) {
        wdLog.info("[Dedup] Embedding " + msg.current + "/" + msg.total);
      }
      return;
    }

    if (msg.type === "embeddings") {
      isProcessing = false;
      var newData = msg.data;
      var cached = pendingCached || [];
      var toEmbed = pendingArticles || [];

      // Sla nieuwe embeddings op in cache
      var now = Date.now();
      for (var i = 0; i < newData.length; i++) {
        if (!newData[i].vector || !toEmbed[i]) continue;
        var key = articleKey(toEmbed[i]);
        embeddingCache[key] = { v: newData[i].vector, t: now };
      }
      saveCache();

      // Merge cached + new
      var all = cached.slice();
      for (var j = 0; j < newData.length; j++) {
        if (newData[j].vector && toEmbed[j]) {
          all.push({ vector: newData[j].vector, article: toEmbed[j] });
        }
      }

      pendingArticles = null;
      pendingCached = null;

      if (all.length < 2) {
        if (window.wdLog) wdLog.info("[Dedup] Te weinig vectors voor clustering");
        return;
      }

      var clusters = clusterArticles(all);
      var bus = getBus();
      if (bus) bus.emit("dedup:clusters", clusters);
      if (window.wdLog) wdLog.info("[Dedup] " + clusters.length + " clusters uit " + all.length + " artikelen");
      return;
    }

    if (msg.type === "error") {
      if (window.wdLog) wdLog.warn("[Dedup] Worker error: " + msg.message);
      isProcessing = false;
      pendingArticles = null;
      pendingCached = null;
    }
  }

  function cosineSimilarity(a, b) {
    var dot = 0, ma = 0, mb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      ma += a[i] * a[i];
      mb += b[i] * b[i];
    }
    var denom = Math.sqrt(ma) * Math.sqrt(mb);
    return denom === 0 ? 0 : dot / denom;
  }

  function clusterArticles(items) {
    var n = items.length;
    var vectors = new Array(n);
    var articles = new Array(n);
    for (var i = 0; i < n; i++) {
      vectors[i] = items[i].vector;
      articles[i] = items[i].article;
    }

    var parent = new Array(n);
    for (var i2 = 0; i2 < n; i2++) parent[i2] = i2;

    function find(x) {
      var root = x;
      while (parent[root] !== root) root = parent[root];
      while (parent[x] !== root) {
        var next = parent[x];
        parent[x] = root;
        x = next;
      }
      return root;
    }

    for (var i3 = 0; i3 < n; i3++) {
      for (var j3 = i3 + 1; j3 < n; j3++) {
        var sim = cosineSimilarity(vectors[i3], vectors[j3]);
        if (sim >= SIMILARITY_THRESHOLD) {
          var ri = find(i3), rj = find(j3);
          if (ri !== rj) parent[ri] = rj;
        }
      }
    }

    var groups = {};
    for (var k = 0; k < n; k++) {
      var root = find(k);
      if (!groups[root]) groups[root] = [];
      groups[root].push(k);
    }

    var clusters = [];
    for (var r in groups) {
      var idxs = groups[r];
      if (idxs.length < 2) continue;
      var mainIdx = idxs[0];
      var mainLen = (articles[mainIdx].title || "").length;
      for (var m = 1; m < idxs.length; m++) {
        var len = (articles[idxs[m]].title || "").length;
        if (len > mainLen) { mainIdx = idxs[m]; mainLen = len; }
      }
      var dupes = [];
      for (var d = 0; d < idxs.length; d++) {
        if (idxs[d] !== mainIdx) dupes.push(articles[idxs[d]].id);
      }
      clusters.push({
        mainId: articles[mainIdx].id,
        duplicateIds: dupes,
        size: idxs.length
      });
    }
    return clusters;
  }

  function process(articles) {
    if (!articles || articles.length < 2) return;
    if (isProcessing) {
      if (window.wdLog) wdLog.info("[Dedup] Skip — al bezig");
      return;
    }

    var sorted = articles.slice().sort(function(a, b){
      var ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      var tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return tb - ta;
    }).slice(0, MAX_ARTICLES_TO_EMBED);

    var toEmbed = [];
    var cached = [];
    for (var i = 0; i < sorted.length; i++) {
      var key = articleKey(sorted[i]);
      if (embeddingCache[key]) {
        cached.push({ vector: embeddingCache[key].v, article: sorted[i] });
      } else {
        toEmbed.push(sorted[i]);
      }
    }

    if (toEmbed.length === 0) {
      if (window.wdLog) wdLog.info("[Dedup] Alle " + cached.length + " uit cache");
      if (cached.length < 2) return;
      var clusters = clusterArticles(cached);
      var bus = getBus();
      if (bus) bus.emit("dedup:clusters", clusters);
      if (window.wdLog) wdLog.info("[Dedup] " + clusters.length + " clusters (cache)");
      return;
    }

    var w = getWorker();
    if (!w) {
      if (window.wdLog) wdLog.info("[Dedup] Geen worker — skip");
      return;
    }

    isProcessing = true;
    pendingArticles = toEmbed;
    pendingCached = cached;
    if (window.wdLog) wdLog.info("[Dedup] " + toEmbed.length + " nieuw, " + cached.length + " uit cache");

    w.postMessage({ type: "embed", articles: toEmbed });
  }

  loadCache();

  window.DedupEngine = {
    process: process,
    isReady: function(){ return !!worker; }
  };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-dedup.js v1.0 geladen");

})();