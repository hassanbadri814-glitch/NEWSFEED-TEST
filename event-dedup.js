/* ============================================================
   WAR DESK — event-dedup.js v1.0
   Cluster duplicaat-events op basis van:
   - Gedeelde significante woorden (Jaccard/containment)
   - Locatie-afstand (< 200km)
   - Tijdsverschil (< 2 uur)
   
   Bron-prioriteit bepaalt hoofd-event:
   Tier 1: Reuters, AP, AFP, Bloomberg
   Tier 2: BBC, Al Jazeera, NOS, NYT, WaPo, Times of Israel
   Tier 3: AD, Telegraaf, Nu.nl, RTL Nieuws, De Volkskrant
   Tier 4: Regionaal, gespecialiseerd
   Tier 5: Blogs, X/Twitter, Telegram
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";

  /* ============================================================
     CONFIG
     ============================================================ */
  var CONFIG = {
    MAX_SHARED_WORDS_MIN: 3,        // Minimaal 3 gedeelde significante woorden
    MAX_DISTANCE_KM: 200,           // Max afstand tussen duplicaat-events
    MAX_TIME_DIFF_MS: 2 * 60 * 60 * 1000,  // 2 uur
    MAX_CLUSTER_SIZE: 20,           // Max bronnen per cluster
    MIN_WORD_LENGTH: 4              // Woorden < 4 letters worden genegeerd
  };

  /* ============================================================
     STOPWOORDEN — uitgebreid
     ============================================================ */
  var STOP_WORDS = (function(){
    var s = {};
    [
      // Lidwoorden / voegwoorden NL
      "de","het","een","van","en","in","is","op","dat","voor","met","zijn",
      "er","aan","om","ook","als","maar","bij","of","uit","dan","naar",
      "nog","wel","geen","kan","meer","wordt","door","over","ze","zich",
      "niet","heeft","hebben","worden","deze","dit","tot","je","u","we",
      "ik","hij","zij","jij","mijn","jouw","ons","onze",
      // Voegwoorden EN
      "the","and","for","with","that","this","from","have","has","are",
      "was","were","will","been","they","their","you","your","its","our",
      "but","not","can","all","some","more","than","then","very","much",
      // Werkwoorden (media)
      "says","said","say","after","before","during","about","into",
      "under","more","less","just","also","new","two","three","first",
      "last","next","back","against","between","through","which","what",
      "when","where","who","how","why","could","should","would","may",
      "might","must","being","does","did","done","been",
      // Media-termen
      "report","reports","update","updates","breaking","news","video",
      "photo","photos","watch","live","direct","en","uit",
      // Rol-titels
      "minister","president","prime","premier","king","queen","leader",
      "chief","official","officials","spokesman","general","doctor",
      "mr","mrs","ms","lord","sir",
      // Journalistiek
      "told","called","asked","urged","warned","claimed","denied",
      "confirmed","announced","declared","stated","reported","added",
      // Frans
      "les","des","une","que","pour","avec","dans","sur","plus","sont",
      "être","cette","leur","très","tout","mais","son","ses","aux",
      // Duits
      "der","die","das","und","ein","eine","mit","für","auf","ist",
      "sind","wird","werden","von","dem","den","sich","nicht","auch",
      // Arabisch (spaarzaam)
      "على","في","من","إلى","هذا","هذه","التي","الذي"
    ].forEach(function(w){ s[w] = true; });
    return s;
  })();

  /* ============================================================
     BRON-PRIORITEIT
     ============================================================ */
  var SOURCE_TIERS = {
    /* Tier 5 (hoogste prioriteit) */
    5: [
      "reuters", "ap news", "ap-news", "associated press", "afp",
      "bloomberg", "reuters tg", "ap"
    ],
    /* Tier 4 */
    4: [
      "bbc", "bbc world", "bbc uk", "al jazeera", "nos", "nos.nl",
      "nytimes", "nyt", "washington post", "wapo", "the guardian",
      "times of israel", "jerusalem post", "kyiv independent",
      "france24", "al arabiya", "trt world", "deutsche welle", "dw",
      "sky news", "cnn", "abc news", "cbs news", "nbc news"
    ],
    /* Tier 3 */
    3: [
      "ad.nl", "ad", "de telegraaf", "telegraaf", "nu.nl", "rtl nieuws",
      "de volkskrant", "volkskrant", "trouw", "nrc", "het parool",
      "parool", "fd", "het financieele dagblad", "elsevier",
      "spiegel", "bild", "zeit", "faz", "sueddeutsche", "welt",
      "le monde", "lemonde", "liberation", "le figaro", "figaro",
      "corriere", "repubblica", "la stampa", "ansa"
    ],
    /* Tier 2 */
    2: [
      "hln", "nieuwsblad", "de standaard", "vrt", "demorgen",
      "de tijd", "arab news", "saudi gazette", "gulf news",
      "the national", "al monitor", "middle east eye", "middle east monitor",
      "ynet", "haaretz", "mintpress", "mondoweiss", "ahram",
      "egypt independent", "sudan tribune", "radio dabanga",
      "kyivpost", "ukrinform", "euromaidan press"
    ],
    /* Tier 1 (laagste) */
    1: [
      "osintdefender", "faytuks", "noelreports", "liveuamap",
      "geoconfirmed", "clash report", "clash-report", "isw",
      "war mapper", "war-mapper", "x/twitter", "telegram",
      "bloglivemap", "intel republic", "bellingcat"
    ]
  };

  function getSourceTier(sourceLower){
    for (var tier = 5; tier >= 1; tier--) {
      var arr = SOURCE_TIERS[tier];
      for (var i = 0; i < arr.length; i++) {
        if (sourceLower.indexOf(arr[i]) !== -1) return tier;
      }
    }
    return 2; /* default midden */
  }

  /* ============================================================
     TOKENIZE — significante woorden uit titel
     ============================================================ */
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

  /* ============================================================
     JACCARD + CONTAINMENT
     ============================================================ */
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

  /* ============================================================
     HAVERSINE — afstand in km
     ============================================================ */
  function distanceKm(lat1, lng1, lat2, lng2){
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ============================================================
     ZIJN TWEE EVENTS DUPLICATEN?
     ============================================================ */
  function areDuplicates(a, b){
    if (!a || !b) return false;

    /* Zelfde categorie? */
    if (a.category !== b.category) return false;

    /* Tijdsverschil < 2 uur */
    var ta = new Date(a.date).getTime();
    var tb = new Date(b.date).getTime();
    if (isNaN(ta) || isNaN(tb)) return false;
    if (Math.abs(ta - tb) > CONFIG.MAX_TIME_DIFF_MS) return false;

    /* Locatie-afstand < 200km */
    var dist = distanceKm(a.lat, a.lng, b.lat, b.lng);
    if (dist > CONFIG.MAX_DISTANCE_KM) return false;

    /* Gedeelde significante woorden in titel */
    var ta1 = toSet(tokenizeSignificant(a.title));
    var tb1 = toSet(tokenizeSignificant(b.title));
    var shared = countIntersection(ta1, tb1);

    if (shared >= CONFIG.MAX_SHARED_WORDS_MIN) return true;

    /* Fallback: Jaccard > 0.5 EN min 2 gedeelde woorden */
    var j = jaccard(ta1, tb1);
    if (j >= 0.5 && shared >= 2) return true;

    return false;
  }

  /* ============================================================
     CLUSTER-ALGORITME
     ============================================================ */
  function group(events){
    if (!Array.isArray(events) || events.length < 2) return events || [];

    /* Bouw union-find */
    var n = events.length;
    var parent = new Array(n);
    for (var i = 0; i < n; i++) parent[i] = i;

    function find(x){
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
    function union(a, b){
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }

    /* Vergelijk alle paren — O(n²) maar n is max ~400 */
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        if (areDuplicates(events[a], events[b])) {
          union(a, b);
        }
      }
    }

    /* Groepeer per cluster */
    var clusters = {};
    for (var k = 0; k < n; k++) {
      var root = find(k);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push(events[k]);
    }

    /* Bouw output: 1 event per cluster */
    var result = [];
    for (var r in clusters) {
      var cluster = clusters[r];
      if (cluster.length === 1) {
        var single = cluster[0];
        single.sources = single.sources || [single.source];
        single.isCluster = false;
        result.push(single);
      } else {
        result.push(buildClusterEvent(cluster));
      }
    }

    /* Sorteer op datum (nieuwste eerst) */
    result.sort(function(x, y){
      return new Date(y.date).getTime() - new Date(x.date).getTime();
    });

    return result;
  }

  /* ============================================================
     CLUSTER-EVENT BOUWEN
     ============================================================ */
  function buildClusterEvent(cluster){
    /* Sorteer op bron-tier (hoog eerst) */
    var sorted = cluster.slice().sort(function(a, b){
      var ta = getSourceTier(String(a.source || "").toLowerCase());
      var tb = getSourceTier(String(b.source || "").toLowerCase());
      if (tb !== ta) return tb - ta;
      /* Bij gelijke tier: nieuwste eerst */
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    var main = sorted[0];

    /* Verzamel unieke bronnen */
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

    /* Verzamel beste beschrijving */
    var bestDesc = main.description || "";
    for (var j = 0; j < sorted.length; j++) {
      var d = sorted[j].description || "";
      if (d.length > bestDesc.length) bestDesc = d;
    }

    /* Verzamel beste URL (hoofd) */
    var mainUrl = main.url || "";

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
      region: main.region,
      date: main.date,
      url: mainUrl,
      source: main.source,
      sources: sources,
      isMilitary: main.isMilitary,
      isCluster: true,
      clusterSize: cluster.length,
      tier: getSourceTier(String(main.source || "").toLowerCase())
    };
  }

  /* ============================================================
     STATS / DEBUG
     ============================================================ */
  function stats(original, grouped){
    if (!original || !grouped) return { in: 0, out: 0, dupes: 0 };
    return {
      in: original.length,
      out: grouped.length,
      dupes: original.length - grouped.length
    };
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.WDEventDedup = {
    version: VERSION,
    group: group,
    areDuplicates: areDuplicates,
    getSourceTier: getSourceTier,
    stats: stats,
    _config: CONFIG
  };

  try { if (window.wdLog) wdLog.info("[WAR DESK] event-dedup.js " + VERSION + " geladen"); } catch(e){}

})();