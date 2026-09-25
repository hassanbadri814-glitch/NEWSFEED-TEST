/* ============================================================
   WAR DESK — ai-summary.js v1.2
   - v1.2: gebruikt AIShared voor gedeelde functies/dicts
   - v1.1: Taalprioriteit + bron-diversiteit
   - v1.0: Extractive samenvattingen
   ============================================================ */

(function(){
  "use strict";

  var MIN_SENTENCE_LEN = 35;
  var MAX_SENTENCE_LEN = 220;
  var MAX_BULLETS = 5;
  var MAX_ARTICLES = 20;

  /* v1.2: gebruik AIShared waar beschikbaar */
  var AS = window.AIShared || null;

  // similarity — via AIShared, anders eigen
  var similarity = AS ? AS.similarity : function(a, b){
    function tok(s){
      return String(s || "").toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ")
        .split(/\s+/).filter(function(w){ return w.length > 3; });
    }
    var ta = tok(a), tb = tok(b);
    if (!ta.length || !tb.length) return 0;
    var setB = {};
    for (var i = 0; i < tb.length; i++) setB[tb[i]] = 1;
    var inter = 0;
    for (var j = 0; j < ta.length; j++) if (setB[ta[j]]) inter++;
    var union = ta.length + tb.length - inter;
    return union === 0 ? 0 : inter / union;
  };

  // getTimestamp — via AIShared, anders eigen
  var getTimestamp = AS ? AS.getTimestamp : function(a){
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
  };

  // isNLSource — via AIShared, anders eigen
  var isNLSource = AS ? AS.isNLSource : function(source){
    var FALLBACK = { "nos":1,"nu.nl":1,"ad.nl":1,"de telegraaf":1,"volkskrant":1,"nrc":1,"trouw":1,"parool":1,"fd":1,"rtl nieuws":1,"bnr":1 };
    var s = String(source || "").toLowerCase().trim();
    if (!s) return false;
    for (var k in FALLBACK) if (s === k || s.indexOf(k) !== -1) return true;
    return false;
  };

  // detectDutch — via AIShared, anders eigen
  var detectDutch = AS ? AS.detectDutch : function(text){
    var FALLBACK = { "de":1,"het":1,"een":1,"van":1,"en":1,"op":1,"dat":1,"voor":1,"met":1,"zijn":1,"er":1,"aan":1,"om":1,"ook":1,"als":1,"maar":1,"bij":1,"of":1,"uit":1,"dan":1,"naar":1,"nog":1,"wel":1,"geen":1,"kan":1,"meer":1,"wordt":1,"door":1,"over":1,"niet":1,"heeft":1,"hebben":1,"worden":1,"deze":1,"dit":1,"tot":1,"zal":1,"kon":1,"kunnen":1 };
    var words = String(text || "").toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ").split(/\s+/);
    if (!words.length) return 0;
    var hits = 0;
    for (var i = 0; i < words.length; i++) if (FALLBACK[words[i]]) hits++;
    return hits / words.length;
  };

  /* ============================================================
     Eigen helpers (niet in AIShared)
     ============================================================ */
  function getCategoryItems(category) {
    var items = (window.State && window.State.items) || [];
    if (!category || category === "all") return items.slice();
    if (category === "favorites") {
      var favs = (window.State && window.State.favorites) || {};
      return items.filter(function(a){
        var ref = String(a.id || a.link || a.url || a.guid || "");
        return favs[ref];
      });
    }
    var needle = String(category).toLowerCase();
    return items.filter(function(a){
      var cats = [];
      if (a.category) cats.push(String(a.category).toLowerCase());
      if (a.cat) cats.push(String(a.cat).toLowerCase());
      if (Array.isArray(a.tags)) {
        cats = cats.concat(a.tags.map(function(t){ return String(t).toLowerCase(); }));
      }
      if (Array.isArray(a.categories)) {
        cats = cats.concat(a.categories.map(function(t){ return String(t).toLowerCase(); }));
      }
      for (var i = 0; i < cats.length; i++) {
        if (cats[i] === needle || cats[i].indexOf(needle) !== -1) return true;
      }
      return false;
    });
  }

  function extractSentences(text) {
    if (!text) return [];
    return String(text)
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map(function(s){ return s.trim(); })
      .filter(function(s){ return s.length >= MIN_SENTENCE_LEN && s.length <= MAX_SENTENCE_LEN; });
  }

  function scoreSentence(s, title, source) {
    var score = 0;

    // Lengte
    if (s.length > 60 && s.length < 180) score += 2;
    else if (s.length > 40) score += 1;

    // Proper nouns
    var pn = s.match(/\b[A-ZÀ-Ý][a-zà-ÿ]{2,}(?:\s+[A-ZÀ-Ý][a-zà-ÿ]{2,})+/g);
    if (pn) score += pn.length * 1.5;

    // Cijfers
    if (/\d/.test(s)) score += 1.5;

    // Overlap met titel
    var sim = similarity(s, title);
    if (sim > 0.3 && sim < 0.7) score += 1;

    // Vaag openend
    if (/^(Het|De|Dit|Dat|Er|We|Ik|U)\s/i.test(s)) score -= 0.5;

    // Actiewoorden
    if (/\b(zei|zegt|kondigde|aangekondigd|bevestigd|ontkend|besloot|waarschuwde|verklaarde|start|lanceerde|verhoogde|verlaagde|verbiedt|eist|dreigt|ondertekende)\b/i.test(s)) score += 1;

    // Taalprioriteit
    if (isNLSource(source)) score += 3;
    var nlRatio = detectDutch(s);
    if (nlRatio > 0.15) score += 1.5;
    else if (nlRatio > 0.08) score += 0.5;

    return score;
  }

  function generate(category) {
    var startTime = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

    var items = getCategoryItems(category);
    if (items.length < 2) {
      return { category: category, count: 0, bullets: [], error: "Niet genoeg artikelen" };
    }

    items = items.slice().sort(function(a, b){ return getTimestamp(b) - getTimestamp(a); });
    items = items.slice(0, MAX_ARTICLES);

    var candidates = [];
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var title = String(a.title || "").trim();
      var desc = String(a.description || a.summary || "").trim();
      var source = String(a.source || "").trim();

      if (title.length >= MIN_SENTENCE_LEN && title.length <= MAX_SENTENCE_LEN) {
        candidates.push({
          text: title,
          article: a,
          source: source,
          score: scoreSentence(title, title, source) + 3,
          isTitle: true
        });
      }

      var sents = extractSentences(desc);
      for (var j = 0; j < sents.length && j < 2; j++) {
        candidates.push({
          text: sents[j],
          article: a,
          source: source,
          score: scoreSentence(sents[j], title, source),
          isTitle: false
        });
      }
    }

    if (!candidates.length) {
      return { category: category, count: items.length, bullets: [], error: "Geen zinnen gevonden" };
    }

    candidates.sort(function(a, b){ return b.score - a.score; });

    // Dedup + max 1 bullet per bron
    var bullets = [];
    var usedSources = {};
    for (var k = 0; k < candidates.length && bullets.length < MAX_BULLETS; k++) {
      var c = candidates[k];

      var srcKey = String(c.source || "").toLowerCase().trim();
      if (srcKey && usedSources[srcKey]) continue;

      var isDup = false;
      for (var m = 0; m < bullets.length; m++) {
        if (similarity(c.text, bullets[m].text) > 0.6) {
          isDup = true;
          break;
        }
      }
      if (isDup) continue;

      if (srcKey) usedSources[srcKey] = 1;
      bullets.push(c);
    }

    var elapsed = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - startTime;

    if (window.wdLog) {
      wdLog.info("[Summary] " + bullets.length + " bullets uit " + items.length + " artikelen (" + Math.round(elapsed) + "ms)");
    }

    return {
      category: category,
      count: items.length,
      bullets: bullets
    };
  }

  window.SummaryEngine = { generate: generate };

  if (window.wdLog) {
    wdLog.info("[WAR DESK] ai-summary.js v1.2 geladen" + (AS ? " (met AIShared)" : " (standalone)"));
  }

})();