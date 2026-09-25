/* ============================================================
   WAR DESK — ai-trending.js v1.4
   - v1.3: extra ruis-filters
   - v1.4: throttle reset bij significante groei (>50% meer items)
   ============================================================ */

(function(){
  "use strict";

  var THROTTLE_MS = 60000;
  var RETRY_MS = 5000;
  var WINDOW_HOURS = 6;
  var MAX_ARTICLES = 500;
  var lastRun = 0;
  var lastProducedTopics = 0;
  var lastArticleCount = 0;

  var STOP_WORDS = {};
  ["de","het","een","van","en","in","is","op","dat","voor","met","zijn","er","aan","om",
   "ook","als","maar","bij","of","uit","dan","naar","nog","wel","geen","kan","meer","wordt",
   "door","over","ze","zich","niet","heeft","hebben","worden","deze","dit","tot","je","u",
   "we","ik","hij","zij","jij","mijn","jouw","ons","onze","the","and","for","with","that",
   "this","from","have","has","are","was","were","will","been","they","their","you","your",
   "says","said","say","after","before","during","about","into","under","more","less",
   "just","also","new","two","three","first","last","next","back","against",
   "between","through","which","what","when","where","who","how","why","than","then","very",
   "much","many","some","only","even","still","being","does","did","done",
   "via","per","alweer","hadden","zullen","zou","kunnen","moet","moeten","mag","mogen",
   "laat","laten","gaat","gaan","komt","komen","weer","toch","want","omdat",
   "terwijl","tijdens","volgens","binnen","buiten","tussen","tegen","zonder",
   // v1.4: extra zwakke woorden
   "speech","handen","hand","thing","things","people","man","woman","day","days",
   "year","years","week","month","today","tomorrow","yesterday","time","times",
   "make","made","take","took","give","gave","come","came","look","looked",
   "think","thought","know","knew","want","wanted","need","needed","find","found",
   "video","videos","photo","photos","report","reports","update","updates",
   "nieuws","update","updates","video","foto","fotos","bericht","berichten"]
    .forEach(function(w){ STOP_WORDS[w] = true; });

  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function getTimestamp(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (v) {
        var t = (typeof v === "number") ? v : new Date(v).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
    }
    return 0;
  }

  function extractEntities(articles) {
    var counts = {};
    var now = Date.now();
    var cutoff = now - (WINDOW_HOURS * 60 * 60 * 1000);

    var recent = [];
    var skippedNoDate = 0;

    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (!a) continue;
      var ts = getTimestamp(a);
      if (ts === 0) {
        skippedNoDate++;
        recent.push({ art: a, ts: now });
      } else if (ts > cutoff) {
        recent.push({ art: a, ts: ts });
      }
    }

    recent.sort(function(x, y){ return y.ts - x.ts; });
    if (recent.length > MAX_ARTICLES) recent = recent.slice(0, MAX_ARTICLES);

    if (window.wdLog) wdLog.info("[Trending] Analyse: " + recent.length + "/" + articles.length + " (geen datum: " + skippedNoDate + ")");

    for (var j = 0; j < recent.length; j++) {
      var item = recent[j].art;
      var text = ((item.title || "") + " " + (item.description || item.summary || "")).toLowerCase();
      text = text.replace(/[^\w\s]/g, "");
      var words = text.split(/\s+/);

      var src = (item.source || "").toLowerCase();
      var sourceWeight = (src === "nos" || src === "telegraaf" || src === "ad") ? 1.5 : 1.0;
      var ageHours = (now - recent[j].ts) / 3600000;
      var timeWeight = Math.max(0.3, 1 - (ageHours / WINDOW_HOURS));
      var contribution = sourceWeight * timeWeight;

      for (var k = 0; k < words.length; k++) {
        var w = words[k];
        if (w.length <= 4 || STOP_WORDS[w]) continue;  // v1.4: min lengte 4 → 5
        if (!counts[w]) counts[w] = { score: 0, count: 0 };
        counts[w].score += contribution;
        counts[w].count += 1;
      }
    }

    var arr = [];
    for (var key in counts) {
      if (counts[key].count >= 3) {  // v1.4: drempel 2 → 3
        arr.push({ topic: key, score: counts[key].score, count: counts[key].count });
      }
    }
    arr.sort(function(a, b){ return b.score - a.score; });
    return arr.slice(0, 5);
  }

  function run(articles) {
    if (!articles || !articles.length) return;
    var now = Date.now();
    var count = articles.length;

    // v1.4: reset throttle als artikel-aantal significant groeide (>50%)
    var significantGrowth = lastArticleCount > 0 && (count > lastArticleCount * 1.5);
    if (significantGrowth && window.wdLog) {
      wdLog.info("[Trending] Significant growth: " + lastArticleCount + " → " + count + " (throttle reset)");
    }

    if (!significantGrowth) {
      var wait = lastProducedTopics === 0 ? RETRY_MS : THROTTLE_MS;
      if (now - lastRun < wait) return;
    }

    lastRun = now;
    lastArticleCount = count;

    var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };

    idle(function(){
      try {
        var trends = extractEntities(articles);
        lastProducedTopics = trends.length;
        var bus = getBus();
        if (bus && typeof bus.emit === "function") {
          bus.emit("trending:update", trends);
        }
        if (window.wdLog) wdLog.info("[Trending] " + trends.length + " topics berekend uit " + articles.length + " artikelen");
        if (trends.length > 0 && window.wdLog) {
          var names = trends.map(function(t){ return t.topic + "(" + t.count + ")"; }).join(", ");
          wdLog.info("[Trending] Top: " + names);
        }
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Trending] fout: " + (e && e.message));
      }
    }, { timeout: 2000 });
  }

  window.TrendingEngine = { run: run };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-trending.js v1.4 geladen");

})();