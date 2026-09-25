/* ============================================================
   WAR DESK — ai-trending.js v1.5
   - v1.5: Named Entity Recognition
     * Proper nouns (namen, plaatsen) krijgen 2.5x bonus
     * Bigrams ("white house") als één topic
     * Unigrams alleen bij hoge frequentie (5+)
     * Betere dedupe (geen "trump" als "donald trump" al staat)
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
   "speech","handen","hand","thing","things","people","man","woman","day","days",
   "year","years","week","month","today","tomorrow","yesterday","time","times",
   "make","made","take","took","give","gave","come","came","look","looked",
   "think","thought","know","knew","want","wanted","need","needed","find","found",
   "video","videos","photo","photos","report","reports","update","updates",
   "nieuws","video","foto","fotos","bericht","berichten",
   // v1.5: generieke rollen/titels
   "minister","president","prime","premier","king","queen","leader","chief",
   "official","officials","spokesman","spokesperson","general","doctor","dr",
   "mr","mrs","ms","lord","sir","uncle","aunt","brother","sister",
   // v1.5: generieke werkwoorden
   "says","told","called","asked","urged","warned","claimed","denied",
   "confirmed","announced","declared","stated","reported","added"]
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
    var properNounCounts = {};
    var bigramCounts = {};
    var unigramCounts = {};
    var now = Date.now();
    var cutoff = now - (WINDOW_HOURS * 60 * 60 * 1000);

    var pnRegex = /\b[A-ZÀ-Ý][a-zà-ÿ]{3,}(?:[\s\-][A-ZÀ-Ý][a-zà-ÿ]{3,}){0,2}\b/g;
    var processed = 0;

    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (!a) continue;
      var ts = getTimestamp(a);
      if (ts === 0) ts = now;
      else if (ts < cutoff) continue;
      processed++;

      var title = a.title || "";
      var desc = a.description || a.summary || "";
      var text = title + " " + desc;

      var src = (a.source || "").toLowerCase();
      var sw = (src === "nos" || src === "telegraaf" || src === "ad") ? 1.5 : 1.0;
      var ageHours = (now - ts) / 3600000;
      var tw = Math.max(0.3, 1 - ageHours / WINDOW_HOURS);
      var c = sw * tw;

      // 1. PROPER NOUNS (namen, plaatsen)
      var seenProper = {};
      pnRegex.lastIndex = 0;
      var m;
      while ((m = pnRegex.exec(text)) !== null) {
        var entity = m[0];
        var lower = entity.toLowerCase();
        if (STOP_WORDS[lower]) continue;
        if (seenProper[lower]) continue;
        seenProper[lower] = true;

        if (!properNounCounts[lower]) {
          properNounCounts[lower] = { topic: entity, score: 0, count: 0 };
        }
        properNounCounts[lower].score += c;
        properNounCounts[lower].count += 1;
      }

      // 2. LOWERCASE TOKENS
      var lowerText = text.toLowerCase().replace(/[^\w\s]/g, " ");
      var words = lowerText.split(/\s+/).filter(function(w) {
        return w.length > 3 && !STOP_WORDS[w];
      });

      // Bigrams
      var seenBi = {};
      for (var k = 0; k < words.length - 1; k++) {
        var bg = words[k] + " " + words[k + 1];
        if (seenBi[bg]) continue;
        seenBi[bg] = true;
        if (!bigramCounts[bg]) bigramCounts[bg] = { topic: bg, score: 0, count: 0 };
        bigramCounts[bg].score += c;
        bigramCounts[bg].count += 1;
      }

      // Unigrams
      var seenUni = {};
      for (var k2 = 0; k2 < words.length; k2++) {
        var w = words[k2];
        if (seenUni[w]) continue;
        seenUni[w] = true;
        if (!unigramCounts[w]) unigramCounts[w] = { topic: w, score: 0, count: 0 };
        unigramCounts[w].score += c;
        unigramCounts[w].count += 1;
      }
    }

    if (window.wdLog) wdLog.info("[Trending] Analyse: " + processed + "/" + articles.length + " artikelen");

    // ============ MERGE + SCORE ============
    var pool = [];

    // Proper nouns: 2.5x bonus, min 2 mentions
    for (var pk in properNounCounts) {
      if (properNounCounts[pk].count >= 2) {
        pool.push({
          topic: properNounCounts[pk].topic,
          score: properNounCounts[pk].score * 2.5,
          count: properNounCounts[pk].count
        });
      }
    }

    // Bigrams: 1.5x bonus, min 3 mentions
    for (var bk in bigramCounts) {
      if (bigramCounts[bk].count >= 3) {
        pool.push({
          topic: bigramCounts[bk].topic,
          score: bigramCounts[bk].score * 1.5,
          count: bigramCounts[bk].count
        });
      }
    }

    // Unigrams: 1x, min 5 mentions
    for (var uk in unigramCounts) {
      if (unigramCounts[uk].count >= 5) {
        pool.push({
          topic: unigramCounts[uk].topic,
          score: unigramCounts[uk].score,
          count: unigramCounts[uk].count
        });
      }
    }

    // ============ SORT + DEDUPE ============
    pool.sort(function(a, b){ return b.score - a.score; });

    var result = [];
    var usedWords = {};

    for (var pi = 0; pi < pool.length && result.length < 5; pi++) {
      var item = pool[pi];
      var wordsArr = item.topic.split(/\s+/);
      var overlap = 0;
      for (var wi = 0; wi < wordsArr.length; wi++) {
        if (usedWords[wordsArr[wi]]) overlap++;
      }
      // Skip als meer dan helft overlapt met eerder gekozen topic
      if (overlap > 0 && overlap >= wordsArr.length / 2) continue;

      for (var wi2 = 0; wi2 < wordsArr.length; wi2++) {
        usedWords[wordsArr[wi2]] = true;
      }
      result.push(item);
    }

    return result;
  }

  function run(articles) {
    if (!articles || !articles.length) return;
    var now = Date.now();
    var count = articles.length;

    var significantGrowth = lastArticleCount > 0 && (count > lastArticleCount * 1.5);
    if (significantGrowth && window.wdLog) {
      wdLog.info("[Trending] Growth: " + lastArticleCount + " → " + count + " (reset)");
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
        if (window.wdLog) {
          wdLog.info("[Trending] " + trends.length + " topics uit " + articles.length + " artikelen");
          if (trends.length > 0) {
            var names = trends.map(function(t){ return t.topic + "(" + t.count + ")"; }).join(", ");
            wdLog.info("[Trending] Top: " + names);
          }
        }
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Trending] fout: " + (e && e.message));
      }
    }, { timeout: 2000 });
  }

  window.TrendingEngine = { run: run };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-trending.js v1.5 geladen");

})();