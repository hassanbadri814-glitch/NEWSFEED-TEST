/* ============================================================
   WAR DESK — ai-summary.js v1.0
   Extractive samenvattingen — geen AI API, geen kosten
   - Pakt top artikelen van een categorie
   - Extraheert kernzinnen (titel + lead)
   - Scoort op entiteiten, cijfers, actiewoorden
   - Dedupliceert overlappende zinnen
   ============================================================ */

(function(){
  "use strict";

  var MIN_SENTENCE_LEN = 35;
  var MAX_SENTENCE_LEN = 220;
  var MAX_BULLETS = 5;
  var MAX_ARTICLES = 20;

  function tokenize(s) {
    return String(s || "").toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ")
      .split(/\s+/).filter(function(w){ return w.length > 3; });
  }

  function similarity(a, b) {
    var ta = tokenize(a), tb = tokenize(b);
    if (!ta.length || !tb.length) return 0;
    var setB = {};
    for (var i = 0; i < tb.length; i++) setB[tb[i]] = 1;
    var inter = 0;
    for (var j = 0; j < ta.length; j++) if (setB[ta[j]]) inter++;
    var union = ta.length + tb.length - inter;
    return union === 0 ? 0 : inter / union;
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

  function scoreSentence(s, title) {
    var score = 0;

    // Lengte: niet te kort, niet te lang
    if (s.length > 60 && s.length < 180) score += 2;
    else if (s.length > 40) score += 1;

    // Proper nouns (namen, plaatsen)
    var pn = s.match(/\b[A-ZÀ-Ý][a-zà-ÿ]{2,}(?:\s+[A-ZÀ-Ý][a-zà-ÿ]{2,})+/g);
    if (pn) score += pn.length * 1.5;

    // Cijfers / data
    if (/\d/.test(s)) score += 1.5;

    // Overlap met titel
    var sim = similarity(s, title);
    if (sim > 0.3 && sim < 0.7) score += 1;

    // Vaag openend → straf
    if (/^(Het|De|Dit|Dat|Er|We|Ik|U)\s/i.test(s)) score -= 0.5;

    // Actiewoorden
    if (/\b(zei|zegt|kondigde|aangekondigd|bevestigd|ontkend|besloot|waarschuwde|verklaarde|start|lanceerde|verhoogde|verlaagde|verbiedt|eist|dreigt|ondertekende)\b/i.test(s)) score += 1;

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

      // Titel als kandidaat (bonus want meest kernachtig)
      if (title.length >= MIN_SENTENCE_LEN && title.length <= MAX_SENTENCE_LEN) {
        candidates.push({
          text: title,
          article: a,
          score: scoreSentence(title, title) + 3,
          isTitle: true
        });
      }

      // Zinnen uit beschrijving (max 2 per artikel)
      var sents = extractSentences(desc);
      for (var j = 0; j < sents.length && j < 2; j++) {
        candidates.push({
          text: sents[j],
          article: a,
          score: scoreSentence(sents[j], title),
          isTitle: false
        });
      }
    }

    if (!candidates.length) {
      return { category: category, count: items.length, bullets: [], error: "Geen zinnen gevonden" };
    }

    candidates.sort(function(a, b){ return b.score - a.score; });

    // Dedup + top N
    var bullets = [];
    for (var k = 0; k < candidates.length && bullets.length < MAX_BULLETS; k++) {
      var c = candidates[k];
      var isDup = false;
      for (var m = 0; m < bullets.length; m++) {
        if (similarity(c.text, bullets[m].text) > 0.6) {
          isDup = true;
          break;
        }
      }
      if (isDup) continue;
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

  if (window.wdLog) wdLog.info("[WAR DESK] ai-summary.js v1.0 geladen");

})();