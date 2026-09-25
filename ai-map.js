/* ============================================================
   WAR DESK — ai-map.js v1.1
   Military Event Classifier (wereldwijd)
   - v1.1: FIX — Unix timestamps in seconden + sanity check
   - 5 subtypes: aanval / offensief / defensief / voortgang / actief
   - Locatie-extractie uit artikel-tekst (streng)
   ============================================================ */

(function(){
  "use strict";

  var MAX_EVENTS = 100;
  var MIN_CONFIDENCE = 4;

  // ============ MILITAIRE KEYWORDS ============
  var MILITARY_KEYWORDS = {
    "raketaanval":1, "raket":1, "raketten":1, "drone":1, "drones":1, "bomaanslag":1,
    "bom":1, "bommen":1, "explosie":1, "ontploffing":1, "luchtaanval":1,
    "beschieting":1, "granaat":1, "granaten":1, "mortier":1, "artillerie":1,
    "aanval":1, "aanvallen":1, "offensief":1, "invasie":1, "opmars":1,
    "tegenoffensief":1, "operatie":1, "luchtafweer":1, "interceptie":1,
    "onderschept":1, "onderscheppen":1, "verdediging":1, "terugtrekking":1,
    "frontlinie":1, "veroverd":1, "heroverd":1, "bezet":1, "troepen":1,
    "militaire":1, "leger":1, "strijdkrachten":1, "gevechten":1, "gevecht":1,
    "oorlog":1, "conflict":1, "slachtoffers":1, "gedood":1, "gewonden":1,
    "vuurgevecht":1, "schietpartij":1, "zelfmoordaanslag":1, "aanslag":1,
    "missile":1, "missiles":1, "rocket":1, "rockets":1, "airstrike":1,
    "airstrikes":1, "bombing":1, "bomb":1, "bombs":1, "explosion":1,
    "shelling":1, "artillery":1, "attack":1, "attacks":1, "offensive":1,
    "invasion":1, "advance":1, "counteroffensive":1, "operation":1,
    "defense":1, "defence":1, "intercept":1, "intercepted":1, "withdrawal":1,
    "frontline":1, "captured":1, "recaptured":1, "occupied":1, "troops":1,
    "military":1, "army":1, "forces":1, "fighting":1, "war":1, "conflict":1,
    "casualties":1, "killed":1, "wounded":1, "gunfire":1, "shooting":1,
    "suicide":1, "repelled":1, "repel":1
  };

  // ============ ACTIE-KEYWORDS ============
  var ACTION_KEYWORDS = {
    "op":1, "in":1, "tegen":1, "bij":1, "naar":1, "vanuit":1, "rond":1,
    "raakt":1, "raakten":1, "treft":1, "troffen":1, "valt":1, "vallen":1,
    "bestookt":1, "bestoken":1, "beschiet":1, "beschoten":1, "bombardeert":1,
    "gebombardeerd":1, "lanceert":1, "gelanceerd":1, "start":1, "startte":1,
    "begon":1, "begonnen":1, "doodt":1, "doodden":1, "verwoest":1,
    "on":1, "at":1, "against":1, "near":1, "from":1,
    "hit":1, "hits":1, "strikes":1, "struck":1, "strike":1, "launched":1,
    "launches":1, "killed":1, "destroys":1, "destroyed":1, "began":1
  };

  // ============ LOCATIES (wereldwijd) ============
  var LOCATIONS = {
    // Oekraïne / Rusland
    "oekraïne":       { lat: 50.45, lng: 30.52, country: "Oekraïne", region: "Oost-Europa" },
    "ukraine":        { lat: 50.45, lng: 30.52, country: "Oekraïne", region: "Oost-Europa" },
    "kyiv":           { lat: 50.45, lng: 30.52, country: "Oekraïne", region: "Oost-Europa" },
    "kiev":           { lat: 50.45, lng: 30.52, country: "Oekraïne", region: "Oost-Europa" },
    "kharkiv":        { lat: 49.99, lng: 36.23, country: "Oekraïne", region: "Oost-Europa" },
    "odesa":          { lat: 46.48, lng: 30.73, country: "Oekraïne", region: "Oost-Europa" },
    "odessa":         { lat: 46.48, lng: 30.73, country: "Oekraïne", region: "Oost-Europa" },
    "donetsk":        { lat: 48.02, lng: 37.80, country: "Oekraïne", region: "Oost-Europa" },
    "donbas":         { lat: 48.50, lng: 38.00, country: "Oekraïne", region: "Oost-Europa" },
    "luhansk":        { lat: 48.57, lng: 39.31, country: "Oekraïne", region: "Oost-Europa" },
    "cherson":        { lat: 46.64, lng: 32.61, country: "Oekraïne", region: "Oost-Europa" },
    "kherson":        { lat: 46.64, lng: 32.61, country: "Oekraïne", region: "Oost-Europa" },
    "marioepol":      { lat: 47.10, lng: 37.55, country: "Oekraïne", region: "Oost-Europa" },
    "mariupol":       { lat: 47.10, lng: 37.55, country: "Oekraïne", region: "Oost-Europa" },
    "bachmoet":       { lat: 48.60, lng: 38.00, country: "Oekraïne", region: "Oost-Europa" },
    "bakhmut":        { lat: 48.60, lng: 38.00, country: "Oekraïne", region: "Oost-Europa" },
    "rusland":        { lat: 55.75, lng: 37.62, country: "Rusland", region: "Oost-Europa" },
    "russia":         { lat: 55.75, lng: 37.62, country: "Rusland", region: "Oost-Europa" },
    "moskou":         { lat: 55.75, lng: 37.62, country: "Rusland", region: "Oost-Europa" },
    "moscow":         { lat: 55.75, lng: 37.62, country: "Rusland", region: "Oost-Europa" },
    "belgorod":       { lat: 50.60, lng: 36.59, country: "Rusland", region: "Oost-Europa" },
    "koersk":         { lat: 51.73, lng: 36.19, country: "Rusland", region: "Oost-Europa" },
    "kursk":          { lat: 51.73, lng: 36.19, country: "Rusland", region: "Oost-Europa" },
    "krim":           { lat: 45.35, lng: 34.00, country: "Krim", region: "Oost-Europa" },
    "crimea":         { lat: 45.35, lng: 34.00, country: "Krim", region: "Oost-Europa" },

    // Midden-Oosten
    "israël":         { lat: 31.77, lng: 35.22, country: "Israël", region: "Midden-Oosten" },
    "israel":         { lat: 31.77, lng: 35.22, country: "Israël", region: "Midden-Oosten" },
    "tel aviv":       { lat: 32.08, lng: 34.78, country: "Israël", region: "Midden-Oosten" },
    "jeruzalem":      { lat: 31.78, lng: 35.22, country: "Israël", region: "Midden-Oosten" },
    "jerusalem":      { lat: 31.78, lng: 35.22, country: "Israël", region: "Midden-Oosten" },
    "gaza":           { lat: 31.35, lng: 34.31, country: "Gaza", region: "Midden-Oosten" },
    "rafah":          { lat: 31.29, lng: 34.25, country: "Gaza", region: "Midden-Oosten" },
    "khan younis":    { lat: 31.35, lng: 34.30, country: "Gaza", region: "Midden-Oosten" },
    "libanon":        { lat: 33.89, lng: 35.50, country: "Libanon", region: "Midden-Oosten" },
    "lebanon":        { lat: 33.89, lng: 35.50, country: "Libanon", region: "Midden-Oosten" },
    "beiroet":        { lat: 33.89, lng: 35.50, country: "Libanon", region: "Midden-Oosten" },
    "beirut":         { lat: 33.89, lng: 35.50, country: "Libanon", region: "Midden-Oosten" },
    "syrië":          { lat: 33.51, lng: 36.29, country: "Syrië", region: "Midden-Oosten" },
    "syria":          { lat: 33.51, lng: 36.29, country: "Syrië", region: "Midden-Oosten" },
    "damascus":       { lat: 33.51, lng: 36.29, country: "Syrië", region: "Midden-Oosten" },
    "aleppo":         { lat: 36.20, lng: 37.13, country: "Syrië", region: "Midden-Oosten" },
    "iran":           { lat: 35.69, lng: 51.39, country: "Iran", region: "Midden-Oosten" },
    "teheran":        { lat: 35.69, lng: 51.39, country: "Iran", region: "Midden-Oosten" },
    "tehran":         { lat: 35.69, lng: 51.39, country: "Iran", region: "Midden-Oosten" },
    "irak":           { lat: 33.31, lng: 44.36, country: "Irak", region: "Midden-Oosten" },
    "iraq":           { lat: 33.31, lng: 44.36, country: "Irak", region: "Midden-Oosten" },
    "bagdad":         { lat: 33.31, lng: 44.36, country: "Irak", region: "Midden-Oosten" },
    "baghdad":        { lat: 33.31, lng: 44.36, country: "Irak", region: "Midden-Oosten" },
    "jemen":          { lat: 15.37, lng: 44.19, country: "Jemen", region: "Midden-Oosten" },
    "yemen":          { lat: 15.37, lng: 44.19, country: "Jemen", region: "Midden-Oosten" },
    "sanaa":          { lat: 15.37, lng: 44.19, country: "Jemen", region: "Midden-Oosten" },
    "aden":           { lat: 12.78, lng: 45.03, country: "Jemen", region: "Midden-Oosten" },
    "houthi":         { lat: 15.37, lng: 44.19, country: "Jemen", region: "Midden-Oosten" },
    "houthis":        { lat: 15.37, lng: 44.19, country: "Jemen", region: "Midden-Oosten" },
    "saudi":          { lat: 24.71, lng: 46.68, country: "Saudi-Arabië", region: "Midden-Oosten" },
    "riyadh":         { lat: 24.71, lng: 46.68, country: "Saudi-Arabië", region: "Midden-Oosten" },
    "qatar":          { lat: 25.28, lng: 51.53, country: "Qatar", region: "Midden-Oosten" },
    "doha":           { lat: 25.28, lng: 51.53, country: "Qatar", region: "Midden-Oosten" },

    // Afrika
    "sudan":          { lat: 15.55, lng: 32.53, country: "Sudan", region: "Afrika" },
    "khartoum":       { lat: 15.55, lng: 32.53, country: "Sudan", region: "Afrika" },
    "darfur":         { lat: 13.00, lng: 25.00, country: "Sudan", region: "Afrika" },
    "mali":           { lat: 12.65, lng: -8.00, country: "Mali", region: "Sahel" },
    "bamako":         { lat: 12.65, lng: -8.00, country: "Mali", region: "Sahel" },
    "burkina faso":   { lat: 12.37, lng: -1.52, country: "Burkina Faso", region: "Sahel" },
    "niger":          { lat: 13.51, lng: 2.11, country: "Niger", region: "Sahel" },
    "niamey":         { lat: 13.51, lng: 2.11, country: "Niger", region: "Sahel" },
    "tsjaad":         { lat: 12.11, lng: 15.04, country: "Tsjaad", region: "Sahel" },
    "chad":           { lat: 12.11, lng: 15.04, country: "Tsjaad", region: "Sahel" },
    "nigeria":        { lat: 9.06, lng: 7.49, country: "Nigeria", region: "Afrika" },
    "abuja":          { lat: 9.06, lng: 7.49, country: "Nigeria", region: "Afrika" },
    "somalia":        { lat: 2.05, lng: 45.32, country: "Somalië", region: "Afrika" },
    "mogadishu":      { lat: 2.05, lng: 45.32, country: "Somalië", region: "Afrika" },
    "ethiopië":       { lat: 9.02, lng: 38.75, country: "Ethiopië", region: "Afrika" },
    "ethiopia":       { lat: 9.02, lng: 38.75, country: "Ethiopië", region: "Afrika" },
    "tigray":         { lat: 13.50, lng: 39.50, country: "Ethiopië", region: "Afrika" },
    "congo":          { lat: -4.44, lng: 15.27, country: "Congo", region: "Afrika" },
    "kinshasa":       { lat: -4.44, lng: 15.27, country: "Congo", region: "Afrika" },
    "mozambique":     { lat: -25.97, lng: 32.57, country: "Mozambique", region: "Afrika" },

    // Azië
    "afghanistan":    { lat: 34.53, lng: 69.17, country: "Afghanistan", region: "Azië" },
    "kabul":          { lat: 34.53, lng: 69.17, country: "Afghanistan", region: "Azië" },
    "kandahar":       { lat: 31.61, lng: 65.71, country: "Afghanistan", region: "Azië" },
    "pakistan":       { lat: 33.68, lng: 73.05, country: "Pakistan", region: "Azië" },
    "islamabad":      { lat: 33.68, lng: 73.05, country: "Pakistan", region: "Azië" },
    "karachi":        { lat: 24.86, lng: 67.01, country: "Pakistan", region: "Azië" },
    "india":          { lat: 28.61, lng: 77.21, country: "India", region: "Azië" },
    "kashmir":        { lat: 34.08, lng: 74.80, country: "Kashmir", region: "Azië" },
    "china":          { lat: 39.90, lng: 116.40, country: "China", region: "Azië" },
    "taiwan":         { lat: 25.03, lng: 121.56, country: "Taiwan", region: "Azië" },
    "taipei":         { lat: 25.03, lng: 121.56, country: "Taiwan", region: "Azië" },
    "noord-korea":    { lat: 39.03, lng: 125.75, country: "Noord-Korea", region: "Azië" },
    "north korea":    { lat: 39.03, lng: 125.75, country: "Noord-Korea", region: "Azië" },
    "pyongyang":      { lat: 39.03, lng: 125.75, country: "Noord-Korea", region: "Azië" },
    "myanmar":        { lat: 19.75, lng: 96.10, country: "Myanmar", region: "Azië" },
    "burma":          { lat: 19.75, lng: 96.10, country: "Myanmar", region: "Azië" }
  };

  // ============ SUBTYPE CLASSIFIER ============
  var SUBTYPE_KEYWORDS = {
    "aanval": {
      "raketaanval":2, "raket":2, "drone":2, "bomaanslag":3, "bom":2,
      "explosie":2, "ontploffing":2, "luchtaanval":2, "beschieting":2,
      "granaat":2, "mortier":2, "artillerie":2, "zelfmoordaanslag":3,
      "aanslag":3, "missile":2, "rocket":2, "airstrike":2, "bombing":2,
      "bomb":2, "explosion":2, "shelling":2, "artillery":2,
      "suicide":3
    },
    "offensief": {
      "offensief":3, "invasie":3, "opmars":2, "tegenoffensief":3,
      "militaire operatie":3, "operatie":1, "aanval":2, "aanvallen":2,
      "offensive":3, "invasion":3, "advance":2, "counteroffensive":3,
      "operation":1, "attack":2, "attacks":2
    },
    "defensief": {
      "luchtafweer":3, "interceptie":3, "onderschept":3, "onderscheppen":3,
      "verdediging":2, "terugtrekking":2, "defense":2, "defence":2,
      "intercept":3, "intercepted":3, "withdrawal":2, "repelled":3, "repel":2
    },
    "voortgang": {
      "veroverd":3, "heroverd":3, "bezet":2, "frontlinie":2, "controle":1,
      "captured":3, "recaptured":3, "occupied":2, "frontline":2
    },
    "actief": {
      "gevechten":2, "gevecht":2, "oorlog":2, "conflict":2, "troepen":2,
      "militaire":2, "leger":2, "strijdkrachten":2, "vuurgevecht":3,
      "schietpartij":3, "fighting":2, "war":2, "troops":2, "military":2,
      "army":2, "forces":2, "gunfire":3, "shooting":3
    }
  };

  // ============ HELPERS ============
  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  // v1.1: Robuuste timestamp parser
  function getTimestamp(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (!v) continue;
      var t;
      if (typeof v === "number") {
        // Unix seconds (< 10^11) of millis
        t = v < 100000000000 ? v * 1000 : v;
      } else {
        t = new Date(v).getTime();
      }
      // Sanity: moet tussen 2000-01-01 en morgen liggen
      if (!isNaN(t) && t > 946684800000 && t < Date.now() + 86400000) return t;
    }
    return 0;
  }

  function tokenize(text) {
    if (!text) return [];
    return String(text).toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ").split(/\s+/);
  }

  function countMatches(words, dict) {
    var hits = 0;
    for (var i = 0; i < words.length; i++) {
      if (dict[words[i]]) hits += dict[words[i]];
    }
    return hits;
  }

  // ============ LOCATIE-EXTRACTIE ============
  function extractLocation(text) {
    if (!text) return null;
    var lower = " " + String(text).toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ") + " ";
    var found = null;
    var foundLen = 0;

    for (var key in LOCATIONS) {
      var pattern = " " + key + " ";
      if (lower.indexOf(pattern) !== -1) {
        if (key.length > foundLen) {
          found = LOCATIONS[key];
          foundLen = key.length;
        }
      }
    }
    return found;
  }

  // ============ SUBTYPE ============
  function classifySubtype(words) {
    var bestType = "actief";
    var bestScore = 0;
    for (var type in SUBTYPE_KEYWORDS) {
      var score = countMatches(words, SUBTYPE_KEYWORDS[type]);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }
    return { type: bestType, score: bestScore };
  }

  // ============ CLASSIFY ARTICLE ============
  function classifyArticle(article) {
    if (!article) return null;

    var text = ((article.title || "") + " " + (article.description || article.summary || "")).trim();
    if (text.length < 15) return null;

    var words = tokenize(text);

    var milScore = countMatches(words, MILITARY_KEYWORDS);
    if (milScore < 2) return null;

    var actScore = countMatches(words, ACTION_KEYWORDS);
    var loc = extractLocation(text);
    if (!loc) return null;

    var subtype = classifySubtype(words);
    if (subtype.score < 1) return null;

    var confidence = milScore * 2 + actScore + 4;
    if (milScore >= 4) confidence += 1;

    if (confidence < MIN_CONFIDENCE) return null;

    var subtypeWords = SUBTYPE_KEYWORDS[subtype.type];
    var subtypeVerified = false;
    for (var i = 0; i < words.length; i++) {
      if (subtypeWords[words[i]]) { subtypeVerified = true; break; }
    }
    if (!subtypeVerified) return null;

    return {
      subtype: subtype.type,
      location: loc,
      confidence: confidence
    };
  }

  // ============ BUILD EVENTS ============
  var lastHash = "";

  function hashArticles(articles) {
    var h = articles.length;
    for (var i = 0; i < Math.min(articles.length, 20); i++) {
      var id = String(articles[i].id || articles[i].link || articles[i].url || "");
      for (var j = 0; j < Math.min(id.length, 30); j++) {
        h = ((h << 5) - h) + id.charCodeAt(j);
        h |= 0;
      }
    }
    return String(h);
  }

  function buildMilitaryEvents() {
    if (!window.State || !Array.isArray(window.State.items)) return [];

    var items = window.State.items;
    if (!items.length) return [];

    var hash = hashArticles(items);
    if (hash === lastHash) return null;
    lastHash = hash;

    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();

    var events = [];
    for (var i = 0; i < items.length; i++) {
      var article = items[i];
      var classification = classifyArticle(article);
      if (!classification) continue;

      var ts = getTimestamp(article) || Date.now();
      var subtype = classification.subtype;
      var loc = classification.location;

      events.push({
        id: "mil-" + i + "-" + subtype,
        lat: loc.lat,
        lng: loc.lng,
        title: article.title || "Onbekend",
        description: article.description || article.summary || "",
        fullDescription: loc.country + " · " + loc.region + "\n\n" + (article.description || article.summary || ""),
        subtype: subtype,
        type: subtype,
        country: loc.country,
        region: loc.region,
        date: new Date(ts).toISOString(),
        url: article.link || article.url || "",
        source: article.source || "",
        confidence: classification.confidence,
        isMilitary: true
      });
    }

    events.sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);

    var elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - startTime;
    if (window.wdLog) {
      wdLog.info("[Map-AI] " + events.length + " militaire events uit " + items.length + " artikelen (" + Math.round(elapsed) + "ms)");
    }

    return events;
  }

  // ============ HOTSPOTS ============
  function calculateHotspots(events) {
    if (!events || !events.length) return [];

    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;

    var byCountry = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var t = new Date(e.date).getTime();
      if (t < dayAgo) continue;

      var key = e.country || "Onbekend";
      if (!byCountry[key]) {
        byCountry[key] = {
          country: key,
          region: e.region || "",
          count: 0,
          lat: e.lat,
          lng: e.lng,
          subtypes: {}
        };
      }
      byCountry[key].count++;
      byCountry[key].subtypes[e.subtype] = (byCountry[key].subtypes[e.subtype] || 0) + 1;
    }

    var hotspots = [];
    for (var c in byCountry) {
      if (byCountry[c].count >= 2) hotspots.push(byCountry[c]);
    }

    hotspots.sort(function(a, b){ return b.count - a.count; });
    return hotspots.slice(0, 5);
  }

  // ============ ORCHESTRATIE ============
  function run() {
    var events = buildMilitaryEvents();
    if (events === null) return;

    var bus = getBus();
    if (!bus) return;

    bus.emit("map:military-events", events);
    bus.emit("map:hotspots", calculateHotspots(events));
  }

  function init() {
    var bus = getBus();
    if (!bus) {
      if (window.wdLog) wdLog.warn("[Map-AI] EventBus niet gevonden");
      return;
    }

    bus.on("news:loaded", function(){
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){ run(); }, { timeout: 3000 });
    });

    setTimeout(function(){
      if (window.State && window.State.items && window.State.items.length) {
        run();
      }
    }, 2000);

    if (window.wdLog) wdLog.info("[WAR DESK] ai-map.js v1.1 geladen");
  }

  window.MapAI = {
    run: run,
    calculateHotspots: function(){
      if (!window.State || !window.State.items) return [];
      var events = buildMilitaryEvents() || [];
      return calculateHotspots(events);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();