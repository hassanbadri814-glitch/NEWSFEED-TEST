/* ============================================================
   WAR DESK — ai-trending.js v1.10
   - v1.10: Uitgebreide blocklist (30+ woorden) + drempel verhoogd
   - v1.9: filtert op conflict-relevante categorieën
   - v1.8: gebruikt AIShared
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

  /* v1.10: minimum aantal mentions per topic */
  var MIN_PROPER_NOUN_COUNT = 3;   /* was 2 */
  var MIN_BIGRAM_COUNT = 5;        /* was 3 */
  var MIN_UNIGRAM_COUNT = 8;       /* was 5 */

  /* ============================================================
     v1.10: UITGEBREIDE BLOCKLIST
     Alle woorden die NOOIT een trending topic mogen zijn.
     ============================================================ */
  var BLOCKLIST = (function(){
    var s = {};
    [
      /* Luchtvaart / transport */
      "flydubai", "emirates", "ryanair", "easyjet", "klm", "lufthansa",
      "boeing", "airbus", "flight", "airline", "airport",
      /* Entertainment */
      "warner", "paramount", "netflix", "disney", "hbo", "amazon",
      "spotify", "hollywood", "oscar", "grammy", "emmy", "bafta",
      "celebrity", "kardashian", "taylor", "swift", "bieber",
      /* Sport */
      "voetbal", "eredivisie", "champions", "ajax", "psv", "feyenoord",
      "premier", "nba", "nfl", "mlb", "nhl", "formule",
      "olympische", "wimbledon", "roland", "garros",
      /* Financieel / crypto */
      "bitcoin", "crypto", "ethereum", "blockchain", "beurs",
      "aandeel", "nasdaq", "dow", "jones", "fed", "rente",
      /* Bekende personen / rechtbank */
      "trump", "biden", "obama", "clinton", "musk", "bezos",
      "christa", "pike", "ghislaine", "maxwell", "epstein",
      /* Algemeen entertainment/rechtbank */
      "rechtbank", "jury", "veroordeling", "proces", "hof",
      /* Overig */
      "weegschaal", "horoscoop", "loterij", "recept", "mode",
      "parfum", "makeup", "kerst", "sinterklaas"
    ].forEach(function(w){ s[w] = true; });
    return s;
  })();

  function isBlocked(topic){
    if(!topic) return true;
    var lower = String(topic).toLowerCase().trim();
    if(lower.length < 3) return true;
    /* Exact match */
    if(BLOCKLIST[lower]) return true;
    /* Woord-voor-woord check (bijv. "Warner Bros" → "warner" is blocked) */
    var words = lower.split(/\s+/);
    for(var i = 0; i < words.length; i++){
      if(BLOCKLIST[words[i]]) return true;
    }
    return false;
  }

  var AS = window.AIShared || null;

  var STOP_WORDS = AS ? AS.STOP_WORDS : (function(){
    var s = {};
    ["de","het","een","van","en","in","is","op","dat","voor","met","zijn","er","aan","om",
     "ook","als","maar","bij","of","uit","dan","naar","nog","wel","geen","kan","meer","wordt",
     "door","over","ze","zich","niet","heeft","hebben","worden","deze","dit","tot","je","u",
     "we","ik","hij","zij","jij","mijn","jouw","ons","onze","the","and","for","with","that",
     "this","from","have","has","are","was","were","will","been","they","their","you","your",
     "says","said","say","after","before","during","about","into","under","more","less",
     "just","also","new","two","three","first","last","next","back","against",
     "between","through","which","what","when","where","who","how","why","than","then","very",
     "much","many","some","only","even","still","being","does","did","done"]
      .forEach(function(w){ s[w] = true; });
    return s;
  })();

  var getTimestamp = AS ? AS.getTimestamp : function(a){
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    var candidates = [];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (!v) continue;
      var t;
      if (typeof v === "number") t = v < 100000000000 ? v * 1000 : v;
      else t = new Date(v).getTime();
      if (!isNaN(t) && t > 946684800000 && t < Date.now() + 86400000) candidates.push(t);
    }
    if (!candidates.length) return 0;
    candidates.sort(function(x, y){ return y - x; });
    return candidates[0];
  };

  var jaccard = AS ? AS.jaccard : function(setA, setB){
    var inter = 0;
    for (var k in setA) if (setB[k]) inter++;
    var union = 0;
    for (var k2 in setA) union++;
    for (var k3 in setB) if (!setA[k3]) union++;
    return union === 0 ? 0 : inter / union;
  };

  var containment = AS ? AS.containment : function(small, big){
    var total = 0, found = 0;
    for (var k in small) { total++; if (big[k]) found++; }
    return total === 0 ? 0 : found / total;
  };

  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function tokenize(title) {
    if (!title) return [];
    var t = title.toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ");
    return t.split(/\s+/).filter(function(w) { return w.length > 3 && !STOP_WORDS[w]; });
  }

  function bump(store, key, displayForm, weight, isProperNoun) {
    if (!store[key]) store[key] = { topic: displayForm, score: 0, count: 0, proper: false };
    store[key].score += weight;
    store[key].count += 1;
    if (isProperNoun && !store[key].proper) { store[key].topic = displayForm; store[key].proper = true; }
    else if (!store[key].proper && displayForm.length > store[key].topic.length) { store[key].topic = displayForm; }
  }

  var RELEVANT_CATS = {
    war: 1, mideast: 1, ukraine: 1, gaza: 1, israel: 1, iran: 1,
    iraq: 1, yemen: 1, syria: 1, libanon: 1, sudan: 1, europe: 1,
    nl: 1, vs: 1, world: 1, crime: 1, terror: 1
  };

  function isRelevantForTrending(article) {
    if (!article) return false;
    var tags = Array.isArray(article.tags) ? article.tags : [];
    var cat = String(article.cat || "").toLowerCase();
    for (var i = 0; i < tags.length; i++) {
      if (RELEVANT_CATS[String(tags[i]).toLowerCase()]) return true;
    }
    if (RELEVANT_CATS[cat]) return true;
    return false;
  }

  function extractEntities(articles) {
    var properStore = {};
    var bigramStore = {};
    var unigramStore = {};
    var now = Date.now();
    var cutoff = now - (WINDOW_HOURS * 60 * 60 * 1000);

    var pnRegex = /\b[A-ZÀ-Ý][a-zà-ÿ]{3,}(?:[\s\-][A-ZÀ-Ý][a-zà-ÿ]{3,}){0,2}\b/g;
    var processed = 0;

    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (!a) continue;
      if (!isRelevantForTrending(a)) continue;

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

      var seenProper = {};
      pnRegex.lastIndex = 0;
      var m;
      while ((m = pnRegex.exec(text)) !== null) {
        var entity = m[0];
        var lower = entity.toLowerCase();
        if (STOP_WORDS[lower]) continue;
        if (isBlocked(entity)) continue;   /* v1.10 blocklist check */
        if (seenProper[lower]) continue;
        seenProper[lower] = true;
        bump(properStore, lower, entity, c, true);
      }

      var lowerText = text.toLowerCase().replace(/[^\w\s]/g, " ");
      var words = lowerText.split(/\s+/).filter(function(w) {
        return w.length > 3 && !STOP_WORDS[w] && !BLOCKLIST[w];
      });

      var seenBi = {};
      for (var k = 0; k < words.length - 1; k++) {
        var bg = words[k] + " " + words[k + 1];
        if (isBlocked(bg)) continue;   /* v1.10 blocklist check */
        if (seenBi[bg]) continue;
        seenBi[bg] = true;
        bump(bigramStore, bg, bg, c, false);
      }

      var seenUni = {};
      for (var k2 = 0; k2 < words.length; k2++) {
        var w = words[k2];
        if (isBlocked(w)) continue;   /* v1.10 blocklist check */
        if (seenUni[w]) continue;
        seenUni[w] = true;
        bump(unigramStore, w, w, c, false);
      }
    }

    if (window.wdLog) wdLog.info("[Trending] Analyse: " + processed + "/" + articles.length + " relevante artikelen");

    var merged = {};

    function mergeInto(store, multiplier, minCount, isProper) {
      for (var k in store) {
        var e = store[k];
        if (e.count < minCount) continue;
        if (!merged[k]) merged[k] = { topic: e.topic, score: 0, count: 0, proper: false };
        merged[k].score += e.score * multiplier;
        merged[k].count += e.count;
        if (isProper) { merged[k].topic = e.topic; merged[k].proper = true; }
      }
    }

    /* v1.10: drempels verhoogd */
    mergeInto(properStore, 2.5, MIN_PROPER_NOUN_COUNT, true);
    mergeInto(bigramStore, 1.5, MIN_BIGRAM_COUNT, false);
    mergeInto(unigramStore, 1.0, MIN_UNIGRAM_COUNT, false);

    var pool = [];
    for (var mk in merged) {
      /* v1.10: blocklist nog een keer checken */
      if (isBlocked(merged[mk].topic)) continue;
      pool.push({ topic: merged[mk].topic, score: merged[mk].score, count: merged[mk].count });
    }
    pool.sort(function(a, b){ return b.score - a.score; });

    var result = [];
    var usedWords = {};

    for (var pi = 0; pi < pool.length && result.length < 5; pi++) {
      var item = pool[pi];
      var wordsArr = item.topic.toLowerCase().split(/\s+/);
      var overlap = 0;
      for (var wi = 0; wi < wordsArr.length; wi++) {
        if (usedWords[wordsArr[wi]]) overlap++;
      }
      if (overlap > 0 && overlap >= wordsArr.length / 2) continue;
      for (var wi2 = 0; wi2 < wordsArr.length; wi2++) usedWords[wordsArr[wi2]] = true;
      result.push(item);
    }

    return result;
  }

  function run(articles) {
    if (!articles || !articles.length) return;
    var now = Date.now();
    var count = articles.length;

    var significantGrowth = lastArticleCount > 0 && (count > lastArticleCount * 1.5);
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
        if (bus && typeof bus.emit === "function") bus.emit("trending:update", trends);
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

  function forceRun(articles) {
    lastRun = 0;
    lastProducedTopics = 0;
    if (articles && articles.length) run(articles);
    else if (window.State && window.State.items && window.State.items.length) run(window.State.items);
  }

  function init() {
    var bus = getBus();
    if (!bus) return;

    bus.on("news:loaded", function(){
      var items = window.State && window.State.items;
      if (items && items.length) run(items);
    });

    bus.on("news:reload:done", function(){
      var items = window.State && window.State.items;
      if (items && items.length) forceRun(items);
    });

    setTimeout(function(){
      if (window.State && window.State.items && window.State.items.length) run(window.State.items);
    }, 2000);

    if (window.wdLog) {
      wdLog.info("[WAR DESK] ai-trending.js v1.10 geladen (blocklist + hogere drempel)");
    }
  }

  window.TrendingEngine = { run: run, forceRun: forceRun };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();