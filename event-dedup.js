/* ============================================================
   WAR DESK — event-dedup.js v1.1
   - v1.1: Gebruikt WorldMapData.getTier() als enige bron van waarheid
   - v1.0: Cluster duplicaat-events
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.1";

  var CONFIG = {
    MAX_SHARED_WORDS_MIN: 3,
    MAX_DISTANCE_KM: 200,
    MAX_TIME_DIFF_MS: 2 * 60 * 60 * 1000,
    MAX_CLUSTER_SIZE: 20,
    MIN_WORD_LENGTH: 4
  };

  var STOP_WORDS = (function(){
    var s = {};
    [
      "de","het","een","van","en","in","is","op","dat","voor","met","zijn",
      "er","aan","om","ook","als","maar","bij","of","uit","dan","naar",
      "nog","wel","geen","kan","meer","wordt","door","over","ze","zich",
      "niet","heeft","hebben","worden","deze","dit","tot","je","u","we",
      "ik","hij","zij","jij","mijn","jouw","ons","onze",
      "the","and","for","with","that","this","from","have","has","are",
      "was","were","will","been","they","their","you","your","its","our",
      "but","not","can","all","some","more","than","then","very","much",
      "says","said","say","after","before","during","about","into",
      "under","more","less","just","also","new","two","three","first",
      "last","next","back","against","between","through","which","what",
      "when","where","who","how","why","could","should","would","may",
      "might","must","being","does","did","done","been",
      "report","reports","update","updates","breaking","news","video",
      "photo","photos","watch","live","direct","en","uit",
      "minister","president","prime","premier","king","queen","leader",
      "chief","official","officials","spokesman","general","doctor",
      "mr","mrs","ms","lord","sir",
      "told","called","asked","urged","warned","claimed","denied",
      "confirmed","announced","declared","stated","reported","added",
      "les","des","une","que","pour","avec","dans","sur","plus","sont",
      "être","cette","leur","très","tout","mais","son","ses","aux",
      "der","die","das","und","ein","eine","mit","für","auf","ist",
      "sind","wird","werden","von","dem","den","sich","nicht","auch",
      "على","في","من","إلى","this","هذا","هذه","التي","الذي"
    ].forEach(function(w){ s[w] = true; });
    return s;
  })();

  /* ============================================================
     v1.1: Gebruik WorldMapData.getTier() als canonieke bron
     ============================================================ */
  function getSourceRank(sourceName){
    if (window.WorldMapData && window.WorldMapData.getTier){
      try {
        return window.WorldMapData.getTier(sourceName);  /* 0.3 - 1.0 */
      } catch(e){}
    }
    return 0.5;
  }

  function tokenizeSignificant(text){
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^\w\sÀ-ÿ\u0600-\u06FF]/g, " ")
      .split(/\s+/)
      .filter(function(w){
        return w.length >= CONFIG.MIN_WORD_LENGTH && !STOP_WORDS[w];
      });
  }

  function toSet(tokens){
    var s = {};
    for (var i = 0; i < tokens.length; i++) s[tokens[i]] = 1;
    return s;
  }

  function countIntersection(a, b){
    var n = 0;
    for (var k in a) if (b[k]) n++;
    return n;
  }

  function jaccard(a, b){
    var inter = countIntersection(a, b);
    var union = 0;
    for (var k in a) union++;
    for (var k2 in b) if (!a[k2]) union++;
    return union === 0 ? 0 : inter / union;
  }

  function distanceKm(lat1, lng1, lat2, lng2){
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function areDuplicates(a, b){
    if (!a || !b) return false;
    if (a.category !== b.category) return false;

    var ta = new Date(a.date).getTime();
    var tb = new Date(b.date).getTime();
    if (isNaN(ta) || isNaN(tb)) return false;
    if (Math.abs(ta - tb) > CONFIG.MAX_TIME_DIFF_MS) return false;

    var dist = distanceKm(a.lat, a.lng, b.lat, b.lng);
    if (dist > CONFIG.MAX_DISTANCE_KM) return false;

    var ta1 = toSet(tokenizeSignificant(a.title));
    var tb1 = toSet(tokenizeSignificant(b.title));
    var shared = countIntersection(ta1, tb1);

    if (shared >= CONFIG.MAX_SHARED_WORDS_MIN) return true;

    var j = jaccard(ta1, tb1);
    if (j >= 0.5 && shared >= 2) return true;

    return false;
  }

  function group(events){
    if (!Array.isArray(events) || events.length < 2) return events || [];

    var n = events.length;
    var parent = new Array(n);
    for (var i = 0; i < n; i++) parent[i] = i;

    function find(x){
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    function union(a, b){
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }

    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        if (areDuplicates(events[a], events[b])) union(a, b);
      }
    }

    var clusters = {};
    for (var k = 0; k < n; k++) {
      var root = find(k);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push(events[k]);
    }

    var result = [];
    for (var r in clusters) {
      var cluster = clusters[r];
      if (cluster.length === 1) {
        var single = cluster[0];
        single.sources = single.sources || [{ name: single.source, url: single.url, date: single.date }];
        single.isCluster = false;
        result.push(single);
      } else {
        result.push(buildClusterEvent(cluster));
      }
    }

    result.sort(function(x, y){
      return new Date(y.date).getTime() - new Date(x.date).getTime();
    });

    return result;
  }

  function buildClusterEvent(cluster){
    var sorted = cluster.slice().sort(function(a, b){
      var ta = getSourceRank(String(a.source || ""));
      var tb = getSourceRank(String(b.source || ""));
      if (tb !== ta) return tb - ta;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    var main = sorted[0];

    var sources = [];
    var seenSources = {};
    for (var i = 0; i < sorted.length; i++) {
      var src = sorted[i].source || "Onbekend";
      if (!seenSources[src]) {
        seenSources[src] = 1;
        sources.push({
          name: src,
          url: sorted[i].url || "",
          date: sorted[i].date
        });
      }
      if (sources.length >= CONFIG.MAX_CLUSTER_SIZE) break;
    }

    var bestDesc = main.description || "";
    for (var j = 0; j < sorted.length; j++) {
      var d = sorted[j].description || "";
      if (d.length > bestDesc.length) bestDesc = d;
    }

    return {
      id: main.id + "-cluster-" + cluster.length,
      lat: main.lat,
      lng: main.lng,
      title: main.title,
      description: bestDesc,
      fullDescription: main.fullDescription || bestDesc,
      category: main.category,
      subtype: main.subtype,
      type: main.category,
      confidence: main.confidence,
      uncertain: main.uncertain,
      scores: main.scores || {},
      meta: main.meta || {},
      country: main.country,
      countryISO3: main.countryISO3,
      region: main.region,
      date: main.date,
      url: main.url || "",
      source: main.source,
      sources: sources,
      isMilitary: main.isMilitary,
      isCluster: true,
      clusterSize: cluster.length,
      tier: getSourceRank(main.source),
      countsForHeat: main.countsForHeat
    };
  }

  function stats(original, grouped){
    if (!original || !grouped) return { in: 0, out: 0, dupes: 0 };
    return {
      in: original.length,
      out: grouped.length,
      dupes: original.length - grouped.length
    };
  }

  window.WDEventDedup = {
    version: VERSION,
    group: group,
    areDuplicates: areDuplicates,
    getSourceRank: getSourceRank,
    stats: stats,
    _config: CONFIG
  };

  try { if (window.wdLog) wdLog.info("[WAR DESK] event-dedup.js " + VERSION + " geladen (WorldMapData tier)"); } catch(e){}

})();