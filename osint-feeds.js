/* ============================================================
   WAR DESK — osint-feeds.js v1.4
   - v1.4: Meerdere proxies (3 in sequence) + URL-encoding fix
   - v1.3: Proxy fallback bij elke fetch-error
   - v1.2: Direct fetch eerst (GDELT CORS), proxy fallback
   - v1.1: Rate-limit fix
   - v1.0: GDELT integratie
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[OSINT]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var REFRESH_MS = 15 * 60 * 1000;
  var MAX_EVENTS = 200;
  var TIMESPAN = "24h";
  var MAX_PER_QUERY = 50;
  var STAGGER_MS = 20000;
  var RETRY_429_MS = 30000;

  var PROXIES_LIST = [
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url=",
    "https://newsfeed2.hassanbadri814.workers.dev/?url="
  ];

  var QUERIES = [
    { q: "(ukraine OR kyiv OR kharkiv OR donetsk) (attack OR strike OR shell OR bomb)",
      hint: { country: "Oekraïne", region: "Oost-Europa" } },
    { q: "(gaza OR rafah OR israel OR idf) (strike OR attack OR bomb)",
      hint: { country: "Gaza", region: "Midden-Oosten" } },
    { q: "(syria OR aleppo OR lebanon OR beirut) (attack OR strike OR bomb)",
      hint: { country: "Syrië", region: "Midden-Oosten" } }
  ];

  var lastRun = 0;
  var osintEvents = [];
  var isRunning = false;
  var _timer = null;

  function hashCode(str){
    var h = 0;
    str = String(str || "");
    for (var i = 0; i < str.length; i++){
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  /* v1.4: geen + conversie, encodeURIComponent doet de rest */
  function buildGdeltUrl(query){
    var encoded = query.trim();
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
    try {
      var y = s.slice(0, 4), m = s.slice(4, 6), d = s.slice(6, 8);
      var hh = s.slice(9, 11), mm = s.slice(11, 13), ss = s.slice(13, 15);
      return new Date(y + "-" + m + "-" + d + "T" + hh + ":" + mm + ":" + ss + "Z").toISOString();
    } catch(e){
      return new Date().toISOString();
    }
  }

  function extractLocation(title, hint){
    if (!window.WorldMapData) return null;
    var locs = window.WorldMapData.LOCATIONS || {};
    var text = String(title || "").toLowerCase();
    var bestKey = null, bestLen = 0;
    for (var key in locs){
      if (!Object.prototype.hasOwnProperty.call(locs, key)) continue;
      if (key.length < 4) continue;
      if (key.length <= bestLen) continue;
      if (text.indexOf(key) !== -1){ bestKey = key; bestLen = key.length; }
    }
    if (bestKey) return locs[bestKey];
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
     v1.4: DIRECT + 3 proxies in sequence
     ============================================================ */
  function fetchWithRetry(url, attempt){
    attempt = attempt || 0;
    var MAX_ATTEMPTS = 2;

    function tryDirect(){
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, 20000);
      return fetch(url, { signal: ctrl.signal, mode: "cors" })
        .then(function(r){
          clearTimeout(timer);
          return r;
        })
        .catch(function(e){
          clearTimeout(timer);
          throw e;
        });
    }

    function tryProxy(){
      var idx = 0;
      function tryNext(){
        if (idx >= PROXIES_LIST.length){
          return Promise.reject(new Error("Alle proxies faalden"));
        }
        var proxy = PROXIES_LIST[idx];
        var fullUrl = proxy + encodeURIComponent(url);
        idx++;
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, 25000);
        return fetch(fullUrl, { signal: ctrl.signal })
          .then(function(r){
            clearTimeout(timer);
            if (r.status === 429) throw new Error("429");
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r;
          })
          .catch(function(e){
            clearTimeout(timer);
            LOG("Proxy " + idx + " faalde: " + (e.message || "?"));
            return tryNext();
          });
      }
      return tryNext();
    }

    return tryDirect()
      .then(function(r){
        if (r.status === 429){
          LOG("429 op direct — probeer proxy");
          return tryProxy().then(function(r2){ return r2.text(); });
        }
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .catch(function(e){
        if (e && e.code !== 429 && e.message !== "Geen JSON"){
          LOG("Direct faalde (" + (e.message || "network") + ") — probeer proxies");
          return tryProxy().then(function(r2){ return r2.text(); });
        }
        throw e;
      })
      .then(function(text){
        var trimmed = String(text).replace(/^\uFEFF/, "").trim();
        if (trimmed.charAt(0) !== "{") throw new Error("Geen JSON");
        return JSON.parse(trimmed);
      })
      .catch(function(e){
        if (e && e.code === 429 && attempt < MAX_ATTEMPTS){
          LOG("429 — retry " + (attempt+1) + "/" + MAX_ATTEMPTS + " over " + (RETRY_429_MS/1000) + "s");
          return new Promise(function(resolve){
            setTimeout(function(){
              resolve(fetchWithRetry(url, attempt + 1));
            }, RETRY_429_MS);
          });
        }
        throw e;
      });
  }

  function fetchQuery(cfg){
    var url = buildGdeltUrl(cfg.q);
    return fetchWithRetry(url, 0)
      .then(function(data){
        return { query: cfg, articles: data.articles || [] };
      })
      .catch(function(e){
        LOG("Query definitief gefaald: " + (e.message || e.code || "?"));
        return { query: cfg, articles: [] };
      });
  }

  function articleToEvent(art, cfg){
    if (!art || !art.title) return null;
    var title = String(art.title).trim();
    if (title.length < 15) return null;

    var cls = classifyArticle(title);
    if (cls.category === "sport") return null;
    if (cls.category !== "militair" && cls.category !== "crime") return null;

    var loc = extractLocation(title, cfg.hint);
    if (!loc) return null;

    var actors = detectActors(title);
    var iso3 = null;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        iso3 = window.WorldMapData.getISO3(loc.country);
      }
    } catch(e){}

    return {
      id: "gdelt-" + hashCode(art.url || title),
      lat: loc.lat, lng: loc.lng,
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

  function fetchAllQueries(){
    var results = [];
    var chain = Promise.resolve();

    QUERIES.forEach(function(cfg, idx){
      chain = chain.then(function(){
        return new Promise(function(resolve){
          setTimeout(resolve, idx === 0 ? 500 : STAGGER_MS);
        }).then(function(){ return fetchQuery(cfg); });
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
    LOG("GDELT fetch gestart (" + QUERIES.length + " queries, " + (STAGGER_MS/1000) + "s stagger, direct + " + PROXIES_LIST.length + " proxies)");

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

      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("osint:military-events", osintEvents);
        }
      } catch(e){}

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
    _version: "v1.4",
    _queries: QUERIES,
    _proxies: PROXIES_LIST
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("osint-feeds.js v1.4 geladen (3 proxies in sequence)");
})();