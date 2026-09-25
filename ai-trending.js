/* ============================================================
   WAR DESK — ai-trending.js v1.0
   Trending Topics Engine (Fase 1)
   - 100% lokaal, geen API
   - Throttled (1x per minuut)
   - Draait op requestIdleCallback (main thread vrij)
   ============================================================ */

(function(){
  "use strict";

  var THROTTLE_MS = 60000;
  var WINDOW_HOURS = 4;
  var MAX_ARTICLES = 500;
  var lastRun = 0;

  var STOP_WORDS = {};
  ["de","het","een","van","en","in","is","op","dat","voor","met","zijn","er","aan","om",
   "ook","als","maar","bij","of","uit","dan","naar","nog","wel","geen","kan","meer","wordt",
   "door","over","ze","zich","niet","heeft","hebben","worden","deze","dit","tot","je","u",
   "we","ik","hij","zij","jij","mijn","jouw","ons","onze","the","and","for","with","that",
   "this","from","have","has","are","was","were","will","been","they","their","you","your"]
    .forEach(function(w){ STOP_WORDS[w] = true; });

  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function extractEntities(articles) {
    var counts = {};
    var now = Date.now();
    var cutoff = now - (WINDOW_HOURS * 60 * 60 * 1000);

    var recent = [];
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (!a) continue;
      var ts = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      if (ts > cutoff) recent.push({ art: a, ts: ts });
    }
    recent.sort(function(x, y){ return y.ts - x.ts; });
    if (recent.length > MAX_ARTICLES) recent = recent.slice(0, MAX_ARTICLES);

    for (var j = 0; j < recent.length; j++) {
      var item = recent[j].art;
      var text = ((item.title || "") + " " + (item.description || "")).toLowerCase();
      text = text.replace(/[^\w\s]/g, "");
      var words = text.split(/\s+/);

      var src = (item.source || "").toLowerCase();
      var sourceWeight = (src === "nos" || src === "telegraaf" || src === "ad") ? 1.5 : 1.0;
      var ageHours = (now - recent[j].ts) / 3600000;
      var timeWeight = Math.max(0.1, 1 - (ageHours / WINDOW_HOURS));
      var contribution = sourceWeight * timeWeight;

      for (var k = 0; k < words.length; k++) {
        var w = words[k];
        if (w.length <= 3 || STOP_WORDS[w]) continue;
        if (!counts[w]) counts[w] = { score: 0, count: 0 };
        counts[w].score += contribution;
        counts[w].count += 1;
      }
    }

    var arr = [];
    for (var key in counts) {
      if (counts[key].count >= 3) {
        arr.push({ topic: key, score: counts[key].score, count: counts[key].count });
      }
    }
    arr.sort(function(a, b){ return b.score - a.score; });
    return arr.slice(0, 5);
  }

  function run(articles) {
    if (!articles || !articles.length) return;
    var now = Date.now();
    if (now - lastRun < THROTTLE_MS) return;
    lastRun = now;

    var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };

    idle(function(){
      try {
        var trends = extractEntities(articles);
        var bus = getBus();
        if (bus && typeof bus.emit === "function") {
          bus.emit("trending:update", trends);
        }
        if (window.wdLog) wdLog.info("[Trending] " + trends.length + " topics berekend");
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Trending] fout: " + (e && e.message));
      }
    }, { timeout: 2000 });
  }

  window.TrendingEngine = { run: run };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-trending.js v1.0 geladen");

})();