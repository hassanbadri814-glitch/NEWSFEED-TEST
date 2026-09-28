/* ============================================================
   WAR DESK — osint-feeds.js v1.0
   ------------------------------------------------------------
   Fetcht GDELT DOC 2.0 API (gratis, geen key).
   Normaliseert artikelen naar event-formaat.
   Emit "osint:military-events" naar EventBus.
   Province-consensus pikt ze op.
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[OSINT]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var REFRESH_MS = 15 * 60 * 1000;      /* GDELT update elke 15 min */
  var MAX_EVENTS = 250;                  /* cap totaal */
  var TIMESPAN = "24h";                  /* laatste 24 uur */
  var MAX_PER_QUERY = 60;                /* GDELT max 250, wij doen 60 */
  var STAGGER_MS = 2000;                 /* 2 sec tussen queries */

  /* Query configuratie — focus op conflict-landen */
  var QUERIES = [
    { q: "(ukraine OR kyiv OR kharkiv OR donetsk OR bakhmut) (attack OR strike OR shell OR bomb OR killed)",
      hint: { country: "Oekraïne", region: "Oost-Europa" } },
    { q: "(russia OR russian) (ukraine OR kursk OR belgorod) (attack OR strike OR drone OR missile)",
      hint: { country: "Rusland", region: "Oost-Europa" } },
    { q: "(syria OR damascus OR aleppo OR idlib) (attack OR strike OR bomb OR killed)",
      hint: { country: "Syrië", region: "Midden-Oosten" } },
    { q: "(gaza OR rafah OR khan younis) (strike OR attack OR bomb OR killed)",
      hint: { country: "Gaza", region: "Midden-Oosten" } },
    { q: "(israel OR idf OR tel aviv OR jerusalem) (strike OR attack OR missile OR rocket)",
      hint: { country: "Israël", region: "Midden-Oosten" } },
    { q: "(hezbollah OR lebanon OR beirut) (attack OR strike OR shell)",
      hint: { country: "Libanon", region: "Midden-Oosten" } },
    { q: "(yemen OR houthi OR sanaa OR hodeidah) (attack OR strike OR missile OR drone)",
      hint: { country: "Jemen", region: "Midden-Oosten" } },
    { q: "(iran OR tehran OR irgc) (strike OR missile OR nuclear OR attack)",
      hint: { country: "Iran", region: "Midden-Oosten" } }
  ];

  var lastRun = 0;
  var osintEvents = [];
  var isRunning = false;
  var _timer = null;

  /* ============================================================
     Helpers
     ============================================================ */
  function hashCode(str){
    var h = 0;
    str = String(str || "");
    for (var i = 0; i < str.length; i++){
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  function buildGdeltUrl(query){
    var encoded = query.trim().replace(/\s+/g, "+");
    return "https://api.gdeltproject.org/api/v2/doc/doc"
      + "?query=" + encoded
      + "&mode=artlist"
      + "&maxrecords=" + MAX_PER_QUERY
      + "&format=json"
      + "&timespan=" + TIMESPAN
      + "&sort=DateDesc";
  }

  function parseGdeltDate(s){
    if (!s) return new Date().toISOString();
    /* Format: 20240115T143000Z */
    try {
      var y = s.slice(0, 4);
      var m = s.slice(4, 6);
      var d = s.slice(6, 8);
      var hh = s.slice(9, 11);
      var mm = s.slice(11, 13);
      var ss = s.slice(13, 15);
      return new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "Z").toISOString();
    } catch(e){
      return new Date().toISOString();
    }
  }

  function extractLocation(title, hint){
    if (!window.WorldMapData) return null;
    var locs = window.WorldMapData.LOCATIONS || {};
    var text = String(title || "").toLowerCase();

    /* Zoek langste LOCATIONS-match in titel */
    var bestKey = null, bestLen = 0;
    for (var key in locs){
      if (!Object.prototype.hasOwnProperty.call(locs, key)) continue;
      if (key.length < 4) continue;
      if (key.length <= bestLen) continue;
      if (text.indexOf(key) !== -1){
        bestKey = key;
        bestLen = key.length;
      }
    }
    if (bestKey) return locs[bestKey];

    /* Fallback: hint country */
    if (hint && hint.country){
      var hk = hint.country.toLowerCase();
      if (locs[hk]) return locs[hk];
    }
    return null;
  }

  function detectActors(title){
    try {
      if (window.WorldMapData && window.WorldMapData.detectActorsInTitle){
        return window.WorldMapData.detectActorsInTitle(title);
      }
    } catch(e){}
    return [];
  }

  function classifyArticle(title){
    try {
      if (window.WDClassifier && window.WDClassifier.classify){
        var r = window.WDClassifier.classify(title, "", "");
        return { category: r.category, subtype: r.subtype || "Conflict" };
      }
    } catch(e){}
    return { category: "militair", subtype: "Conflict" };
  }

  /* ============================================================
     Fetch één query via proxy (CORS-safe)
     ============================================================ */
  function fetchQuery(cfg){
    var url = buildGdeltUrl(cfg.q);
    var proxy = "https://newsfeed2.hassanbadri814.workers.dev/?url=";
    var fullUrl = proxy + encodeURIComponent(url);

    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 20000);

    return fetch(fullUrl, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function(text){
        var trimmed = String(text).replace(/^\uFEFF/, "").trim();
        if (trimmed.charAt(0) !== "{") throw new Error("Geen JSON");
        var data = JSON.parse(trimmed);
        return { query: cfg, articles: data.articles || [] };
      })
      .catch(function(e){
        clearTimeout(timer);
        LOG("Query faalde: " + e.message);
        return { query: cfg, articles: [] };
      });
  }

  /* ============================================================
     Converteer GDELT artikel → event
     ============================================================ */
  function articleToEvent(art, cfg){
    if (!art || !art.title) return null;

    var title = String(art.title).trim();
    if (title.length < 15) return null;

    /* Skip sport/pure politiek nieuws */
    var cls = classifyArticle(title);
    if (cls.category === "sport") return null;
    /* Alleen militair of crime relevant voor consensus */
    if (cls.category !== "militair" && cls.category !== "crime") return null;

    /* Locatie */
    var loc = extractLocation(title, cfg.hint);
    if (!loc) return null;

    /* Actors */
    var actors = detectActors(title);

    /* ISO3 */
    var iso3 = null;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        iso3 = window.WorldMapData.getISO3(loc.country);
      }
    } catch(e){}

    return {
      id: "gdelt-" + hashCode(art.url || title),
      lat: loc.lat,
      lng: loc.lng,
      title: title,
      description: "",
      fullDescription: loc.country + " · " + loc.region + "\n\n" + title,
      category: cls.category,
      subtype: cls.subtype,
      confidence: 45,
      country: loc.country,
      countryISO3: iso3,
      actorCountries: actors,
      region: loc.region,
      date: parseGdeltDate(art.seendate),
      url: art.url || "",
      source: "GDELT",
      sourceDomain: art.domain || "",
      countsForHeat: (cls.category === "militair"),
      _source: "gdelt"
    };
  }

  /* ============================================================
     Fetch cycle — stagger queries om GDELT niet te overbelasten
     ============================================================ */
  function fetchAllQueries(){
    var results = [];
    var chain = Promise.resolve();

    QUERIES.forEach(function(cfg, idx){
      chain = chain.then(function(){
        if (idx > 0){
          return new Promise(function(resolve){
            setTimeout(resolve, STAGGER_MS);
          }).then(function(){ return fetchQuery(cfg); });
        }
        return fetchQuery(cfg);
      }).then(function(res){
        results = results.concat(res.articles.map(function(a){
          return { art: a, cfg: res.query };
        }));
      });
    });

    return chain.then(function(){ return results; });
  }

  function runNow(opts){
    opts = opts || {};
    if (isRunning && !opts.force) return Promise.resolve(osintEvents);
    isRunning = true;

    var startTime = Date.now();
    LOG("GDELT fetch gestart (" + QUERIES.length + " queries)");

    return fetchAllQueries().then(function(raw){
      var seen = {};
      var events = [];

      raw.forEach(function(item){
        var ev = articleToEvent(item.art, item.cfg);
        if (!ev) return;
        if (seen[ev.id]) return;
        seen[ev.id] = 1;
        events.push(ev);
      });

      /* Sorteer op datum, cap op MAX_EVENTS */
      events.sort(function(a, b){
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);

      osintEvents = events;
      lastRun = Date.now();
      isRunning = false;

      var elapsed = Date.now() - startTime;
      LOG("Klaar — " + events.length + " events uit " + raw.length +
          " artikelen | " + elapsed + "ms");

      /* Emit naar EventBus */
      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("osint:military-events", osintEvents);
        }
      } catch(e){}

      /* Persist meta */
      try {
        localStorage.setItem("wardesk_osint_lastRun", String(lastRun));
        localStorage.setItem("wardesk_osint_count", String(events.length));
      } catch(e){}

      return osintEvents;
    }).catch(function(e){
      isRunning = false;
      LOG("Run faalde: " + (e.message || "?"));
      return osintEvents;
    });
  }

  function scheduleNext(){
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function(){
      _timer = null;
      runNow();
      scheduleNext();
    }, REFRESH_MS);
  }

  function init(){
    try {
      var saved = parseInt(localStorage.getItem("wardesk_osint_lastRun") || "0", 10);
      if (saved) lastRun = saved;
    } catch(e){}

    /* Direct draaien bij start (na 8s zodat andere modules klaar zijn) */
    setTimeout(function(){
      runNow();
      scheduleNext();
    }, 8000);

    LOG("Init klaar — refresh elke " + (REFRESH_MS / 60000) + " min");
  }

  window.OSINTFeeds = {
    init: init,
    runNow: runNow,
    getEvents: function(){ return osintEvents; },
    getLastRun: function(){ return lastRun; },
    _version: "v1.0",
    _queries: QUERIES
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("osint-feeds.js v1.0 geladen");
})();