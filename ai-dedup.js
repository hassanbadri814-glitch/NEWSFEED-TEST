/* ============================================================
   WAR DESK — ai-dedup.js v2.1
   Fuzzy-match dedup — geen worker, geen model, geen CDN
   - Jaccard similarity op titel-woorden
   - Union-Find clustering
   - v2.1: DEBOUNCE — wacht 3s tot feed stabiel is
   ============================================================ */

(function(){
  "use strict";

  var SIMILARITY_THRESHOLD = 0.55;
  var CONTAINMENT_THRESHOLD = 0.85;
  var MIN_WORDS_FOR_MATCH = 3;
  var MAX_ARTICLES = 250;
  var DEBOUNCE_MS = 3000;

  var STOP_WORDS = {};
  ["de","het","een","van","en","in","is","op","dat","voor","met","zijn","er","aan","om",
   "ook","als","maar","bij","of","uit","dan","naar","nog","wel","geen","kan","meer","wordt",
   "door","over","ze","zich","niet","heeft","hebben","worden","deze","dit","tot","je","u",
   "we","ik","hij","zij","jij","mijn","jouw","ons","onze",
   "the","and","for","with","that","this","from","have","has","are","was","were","will",
   "been","they","their","you","your","says","said","say","after","before","during","about",
   "into","under","more","less","just","also","new","two","three","first","last","next",
   "back","against","between","through","which","what","when","where","who","how","why",
   "than","then","very","much","many","some","only","even","still","being","does","did","done"]
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

  function tokenize(title) {
    if (!title) return [];
    var t = title.toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ");
    return t.split(/\s+/).filter(function(w) {
      return w.length > 3 && !STOP_WORDS[w];
    });
  }

  function jaccard(setA, setB) {
    var inter = 0;
    for (var k in setA) if (setB[k]) inter++;
    var union = 0;
    for (var k2 in setA) union++;
    for (var k3 in setB) if (!setA[k3]) union++;
    return union === 0 ? 0 : inter / union;
  }

  function containment(small, big) {
    var total = 0, found = 0;
    for (var k in small) {
      total++;
      if (big[k]) found++;
    }
    return total === 0 ? 0 : found / total;
  }

  function clusterArticles(articles) {
    var n = articles.length;
    if (n < 2) return [];

    var tokens = new Array(n);
    var sets = new Array(n);
    for (var i = 0; i < n; i++) {
      var toks = tokenize(articles[i].title || "");
      tokens[i] = toks;
      var s = {};
      for (var t = 0; t < toks.length; t++) s[toks[t]] = 1;
      sets[i] = s;
    }

    var parent = new Array(n);
    for (var u = 0; u < n; u++) parent[u] = u;

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

    function union(a, b) {
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }

    for (var x = 0; x < n; x++) {
      if (tokens[x].length < 2) continue;
      for (var y = x + 1; y < n; y++) {
        if (tokens[y].length < 2) continue;

        var lenA = tokens[x].length;
        var lenB = tokens[y].length;
        var ratio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
        if (ratio < 0.4) continue;

        var jSim = jaccard(sets[x], sets[y]);
        var cSim = 0;
        if (lenA <= lenB) cSim = containment(sets[x], sets[y]);
        else cSim = containment(sets[y], sets[x]);

        var score = Math.max(jSim, cSim * 0.85);

        var shared = 0;
        for (var k in sets[x]) if (sets[y][k]) shared++;

        if (score >= SIMILARITY_THRESHOLD && shared >= MIN_WORDS_FOR_MATCH) {
          union(x, y);
        } else if (cSim >= CONTAINMENT_THRESHOLD && shared >= MIN_WORDS_FOR_MATCH) {
          union(x, y);
        }
      }
    }

    var groups = {};
    for (var g = 0; g < n; g++) {
      var root = find(g);
      if (!groups[root]) groups[root] = [];
      groups[root].push(g);
    }

    var clusters = [];
    for (var r in groups) {
      var idxs = groups[r];
      if (idxs.length < 2) continue;

      var mainIdx = idxs[0];
      var mainLen = (articles[mainIdx].title || "").length;
      for (var m = 1; m < idxs.length; m++) {
        var len = (articles[idxs[m]].title || "").length;
        if (len > mainLen) {
          mainIdx = idxs[m];
          mainLen = len;
        }
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

  var lastRunHash = "";

  function hashArticles(articles) {
    var h = articles.length;
    for (var i = 0; i < Math.min(articles.length, 10); i++) {
      var id = String(articles[i].id || articles[i].link || "");
      for (var j = 0; j < id.length; j++) {
        h = ((h << 5) - h) + id.charCodeAt(j);
        h |= 0;
      }
    }
    return String(h);
  }

  // v2.1: DEBOUNCE — wacht tot feed stabiel is
  var debounceTimer = null;

  function process(articles) {
    if (!articles || articles.length < 2) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function(){
      runDedup(articles);
    }, DEBOUNCE_MS);
  }

  function runDedup(articles) {
    debounceTimer = null;
    if (!articles || articles.length < 2) return;

    var hash = hashArticles(articles);
    if (hash === lastRunHash) return;
    lastRunHash = hash;

    var sorted = articles.slice().sort(function(a, b) {
      return getTimestamp(b) - getTimestamp(a);
    }).slice(0, MAX_ARTICLES);

    var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
    idle(function(){
      try {
        var startTime = performance.now ? performance.now() : Date.now();
        var clusters = clusterArticles(sorted);
        var elapsed = (performance.now ? performance.now() : Date.now()) - startTime;

        var bus = getBus();
        if (bus) bus.emit("dedup:clusters", clusters);

        if (window.wdLog) {
          wdLog.info("[Dedup] " + clusters.length + " clusters uit " + sorted.length + " artikelen (" + Math.round(elapsed) + "ms)");
          if (clusters.length > 0) {
            var largest = clusters.reduce(function(max, c){ return c.size > max.size ? c : max; }, clusters[0]);
            wdLog.info("[Dedup] Grootste cluster: " + largest.size + " artikelen");
          }
        }
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Dedup] fout: " + (e && e.message));
      }
    }, { timeout: 3000 });
  }

  window.DedupEngine = {
    process: process,
    isReady: function(){ return true; }
  };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-dedup.js v2.1 geladen (fuzzy-match + debounce)");

})();