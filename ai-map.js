/* ============================================================
   WAR DESK — ai-map.js v3.16.1
   - v3.16.1: PERFORMANCE — vertaalwachtrij 40→25, geen OSINT
              erin (te veel vertalingen per refresh)
   - v3.16: FIX locatie-fallback ("war"/"world" weg uit
            CAT_TO_REGION + GENERIC_TAGS filter + skipCountries
            doorgeven + _isCity niet muteren)
   - v3.15.3: OSINT-events samengevoegd met MAP-events
   ============================================================ */

(function(){
  "use strict";

  var MAX_EVENTS = 800;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var MAX_TRANSLATIONS_PER_RUN = 25;

  var STRONG_CIVIEL_PATTERN = /\b(aardbeving|earthquake|overstroming|flood|tsunami|orkaan|hurricane|tyfoon|typhoon|cycloon|tornado|windhoos|wervelstorm|bosbrand|wildfire|woningbrand|flatbrand|keukenbrand|brand|verkeersongeval|verkeersongeluk|vliegramp|vliegtuigongeluk|plane.crash|treinramp|treinongeluk|treinontsporing|helikoptercrash|helicopter.crash|gaslek|gasontploffing|lawine|aardverschuiving|modderstroom|vulkaan|vulkaanuitbarsting|instorting|ingestort|evacuatie|geëvacueerd|natuurramp|natural.disaster|scheepsramp|ontploffing|explosie|explosion|blast|botsing|aanrijding|noodweer|noodstorm|hittegolf|droogte|stroomuitval|blackout|stroomstoring|wateroverlast|brandweer|hulpdiensten|vermiste|vermist)\b/i;

  var WAR_CONTEXT_PATTERN = /\b(war|oorlog|conflict|attack|strike|military|troops|army|soldier|weapon|missile|drone|bomb|border|front|offensive|invasion|ceasefire|sanction|refugee|evacuation|shelling|artillery|airstrike|casualties|killed|wounded|strike|strikes|troepen|leger|soldaten|wapen|raketten|drone|bommen|grens|front|offensief|invasie|staakt-het-vuren|sanctie|vluchtelingen|beschieting|artillerie|luchtaanval|slachtoffers|gedood|gewond)\b/i;

  var POLITIEK_CONFLICT_PATTERN = /\b(sanctions?|sancties|ceasefire|staakt-het-vuren|wapenstilstand|nuclear|nucleair|invasion|invasie|troops|troepen|missile|raket|drone|airstrike|luchtaanval|casualties|slachtoffers|killed|gedood|wounded|gewond|declared war|oorlogsverklaring|mobilization|mobilisatie|military aid|militaire hulp|arms deal|wapendeal|weapons|wapens|peace plan|vredesplan|peace talks|vredesoverleg|negotiations|onderhandelingen|hostage|gijzelaar|prisoner|gevangene|genocide|war crime|oorlogsmisdaad)\b/i;

  var CONTEXT_AFTER = /^(war|oorlog|conflict|conflicts|crisis|deal|akkoord|agreement|sanctions|sancties|negotiations|onderhandelingen|talks|overleg|statement|verklaring|response|reactie|policy|beleid|trade|handel|economy|economie|threat|dreiging|warning|waarschuwing|live|update|updates|news|nieuws|situation|situatie|relations|betrekkingen|program|programma|nuclear|nucleair)\b/i;

  var CONTEXT_SUFFIX = /^[-\s]?(backed|led|supported|funded|linked|based|allied|sponsored|aligned|occupied|held|controlled|recognized|recognised|declared|designated|proposed|announced|reported|alleged|accused|suspected)\b/i;

  var POSITION_ACTION_PATTERNS = [
    /\b(struck|strikes|striking)\b/i, /\b(attacked|attacks|attacking)\b/i,
    /\b(bombed|bombing|bombardment|bombardments)\b/i, /\b(shelled|shelling)\b/i,
    /\b(fired|fires|launched|launches)\b/i, /\b(killed|kills|killing)\b/i,
    /\b(captured|seized|captures|overran)\b/i, /\b(invaded|invading|invasion)\b/i,
    /\b(shot down|shoots down|downed|intercepted)\b/i, /\b(exploded|explodes|explosion)\b/i,
    /\b(raakte|raakten|getroffen|treft)\b/i, /\b(aanviel|aanvielen|aanvalt)\b/i,
    /\b(bombardeerde|bombardeerden|gebombardeerd)\b/i, /\b(beschoot|beschoten|beschieting)\b/i,
    /\b(lanceerde|lanceerden|afgevuurd)\b/i, /\b(doodde|doodden|gedood)\b/i,
    /\b(veroverde|veroverden|ingenomen)\b/i, /\b(viel binnen|vielen binnen|binnengevallen)\b/i,
    /\b(neerschoot|neergeschoten|neergehaald|onderschept)\b/i,
    /\b(frappé|frappe|attaqué|attaques)\b/i, /\b(angegriffen|getroffen|bombardiert)\b/i,
    /قصف|غارة|هجوم|قتل|انفجار/
  ];

  var LOCATIONS = (window.WorldMapData && window.WorldMapData.LOCATIONS)
    ? window.WorldMapData.LOCATIONS
    : {};

  try { window.__wm_locations = LOCATIONS; } catch(e){}

  var _countryKeyCache = null;

  function isCountryKey(key){
    if (!_countryKeyCache) _countryKeyCache = {};
    if (_countryKeyCache[key] !== undefined) return _countryKeyCache[key];

    var isCountry = false;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        var iso = window.WorldMapData.getISO3(key);
        if (iso && iso.indexOf("REG-") !== 0) isCountry = true;
      }
    } catch(e){}
    _countryKeyCache[key] = isCountry;
    return isCountry;
  }

  var REGION_LOCATIONS = {
    "Oost-Europa":   { lat: 49.0, lng: 32.0,  country: "Oost-Europa", region: "Oost-Europa" },
    "Midden-Oosten": { lat: 31.5, lng: 35.0,  country: "Midden-Oosten", region: "Midden-Oosten" },
    "West-Europa":   { lat: 50.5, lng: 5.0,   country: "West-Europa", region: "West-Europa" },
    "Afrika":        { lat: 5.0,  lng: 20.0,  country: "Afrika", region: "Afrika" },
    "Sahel":         { lat: 14.0, lng: 0.0,   country: "Sahel", region: "Sahel" },
    "Azië":          { lat: 30.0, lng: 80.0,  country: "Azië", region: "Azië" },
    "Noord-Amerika": { lat: 40.0, lng: -100.0, country: "Noord-Amerika", region: "Noord-Amerika" },
    "Latijns-Amerika":{ lat: 0.0, lng: -70.0,  country: "Latijns-Amerika", region: "Latijns-Amerika" }
  };

  var CAT_TO_REGION = {
    "nl": "West-Europa", "be": "West-Europa", "de": "West-Europa", "fr": "West-Europa",
    "uk": "West-Europa", "europe": "West-Europa", "it": "West-Europa",
    "ua": "Oost-Europa", "ukraine": "Oost-Europa",
    "ru": "Oost-Europa", "russia": "Oost-Europa",
    "il": "Midden-Oosten", "gaza": "Midden-Oosten", "mideast": "Midden-Oosten",
    "qa": "Midden-Oosten", "sa": "Midden-Oosten", "ae": "Midden-Oosten",
    "eg": "Midden-Oosten", "iran": "Midden-Oosten", "iraq": "Midden-Oosten",
    "yemen": "Midden-Oosten",
    "sudan": "Afrika", "maroc": "Afrika",
    "us": "Noord-Amerika", "vs": "Noord-Amerika"
  };

  var GENERIC_TAGS = {
    "war": 1, "world": 1, "news": 1, "mideast": 1,
    "conflict": 1, "crisis": 1, "attack": 1, "middleeast": 1,
    "defense": 1, "military": 1
  };

  function getBus(){
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  var AS = window.AIShared || null;

  var getTimestamp = AS ? AS.getTimestamp : function(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    var candidates = [];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (!v) continue;
      var t;
      if (typeof v === "number") { t = v < 100000000000 ? v * 1000 : v; }
      else { t = new Date(v).getTime(); }
      if (!isNaN(t) && t > 946684800000 && t < Date.now() + 86400000) candidates.push(t);
    }
    if (!candidates.length) return 0;
    candidates.sort(function(x, y){ return y - x; });
    return candidates[0];
  };

  function findFirstActionPosition(title){
    if (!title) return -1;
    var lower = String(title).toLowerCase();
    var firstPos = -1;
    for (var i = 0; i < POSITION_ACTION_PATTERNS.length; i++){
      var m = lower.match(POSITION_ACTION_PATTERNS[i]);
      if (m && typeof m.index === "number" && m.index >= 0){
        if (firstPos === -1 || m.index < firstPos) firstPos = m.index;
      }
    }
    return firstPos;
  }

  function findTargetByPosition(title, actorCountries, skipCountries){
    if (!title) return null;
    var actionPos = findFirstActionPosition(title);
    if (actionPos < 0) return null;

    var skip = [];
    if (skipCountries){
      if (Array.isArray(skipCountries)) skip = skipCountries;
      else skip = [skipCountries];
    }

    var afterVerb = " " + title.slice(actionPos).toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";
    if (afterVerb.length < 3) return null;

    var bestCity = null, bestCityPos = -1;
    var bestCountry = null, bestCountryPos = -1;

    for (var key in LOCATIONS){
      if (!Object.prototype.hasOwnProperty.call(LOCATIONS, key)) continue;
      if (key.length < 4) continue;

      var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp("\\b" + escaped + "\\w*\\b", "i");
      var m = afterVerb.match(re);
      if (!m) continue;

      var idx = m.index;
      var loc = LOCATIONS[key];
      if (actorCountries && loc.country && actorCountries.indexOf(loc.country) !== -1) continue;
      if (skip.indexOf(loc.country) !== -1) continue;

      var afterIdx = idx + m[0].length;
      var nextChunk = afterVerb.slice(afterIdx, afterIdx + 20);
      if (CONTEXT_SUFFIX.test(nextChunk)) continue;

      var locCopy = {
        lat: loc.lat, lng: loc.lng,
        country: loc.country, region: loc.region,
        _isCity: isCountryKey(key) ? false : true
      };

      if (isCountryKey(key)){
        if (bestCountryPos === -1 || idx < bestCountryPos){
          bestCountry = locCopy; bestCountryPos = idx;
        }
      } else {
        if (bestCityPos === -1 || idx < bestCityPos){
          bestCity = locCopy; bestCityPos = idx;
        }
      }
    }

    if (bestCity) return bestCity;
    if (bestCountry) return bestCountry;
    return null;
  }

  function extractLocation(text, skipCountries){
    if (!text) return null;
    var skip = [];
    if (skipCountries){
      if (Array.isArray(skipCountries)) skip = skipCountries;
      else skip = [skipCountries];
    }
    var lower = " " + String(text).toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";

    var bestCity = null, bestCityLen = 0;
    var bestCountry = null, bestCountryLen = 0;

    for (var key in LOCATIONS) {
      var pattern = " " + key + " ";
      var idx = lower.indexOf(pattern);
      if (idx === -1) continue;

      var loc = LOCATIONS[key];
      if (loc.country && skip.indexOf(loc.country) !== -1) continue;

      var after = lower.slice(idx + pattern.length).trim();
      if (CONTEXT_AFTER.test(after)) continue;
      if (CONTEXT_SUFFIX.test(after)) continue;

      var locCopy = {
        lat: loc.lat, lng: loc.lng,
        country: loc.country, region: loc.region,
        _isCity: isCountryKey(key) ? false : true
      };

      if (isCountryKey(key)){
        if (key.length > bestCountryLen){ bestCountry = locCopy; bestCountryLen = key.length; }
      } else {
        if (key.length > bestCityLen){ bestCity = locCopy; bestCityLen = key.length; }
      }
    }

    if (bestCity) return bestCity;
    if (bestCountry) return bestCountry;
    return null;
  }

  function extractTargetLocation(title, actorCountries, skipCountries){
    var byPos = findTargetByPosition(title, actorCountries, skipCountries);
    if (byPos) return { loc: byPos, method: "position" };
    var byContext = extractLocation(title, skipCountries);
    if (byContext) return { loc: byContext, method: "context" };
    return { loc: null, method: "none" };
  }

  function extractRegionFallback(article, skipCountries){
    if (!article) return null;
    var skip = [];
    if (skipCountries){
      if (Array.isArray(skipCountries)) skip = skipCountries;
      else skip = [skipCountries];
    }
    var cat = (article.cat || "").toLowerCase();
    var tags = Array.isArray(article.tags) ? article.tags.map(function(t){ return String(t).toLowerCase(); }) : [];
    var all = [cat].concat(tags);
    for (var i = 0; i < all.length; i++) {
      var tag = all[i];
      if (GENERIC_TAGS[tag]) continue;
      var r = CAT_TO_REGION[tag];
      if (r && REGION_LOCATIONS[r]){
        var reg = REGION_LOCATIONS[r];
        if (reg.country && skip.indexOf(reg.country) !== -1) continue;
        return reg;
      }
    }
    return null;
  }

  function hashArticles(articles){
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

  function classifyItem(article){
    if (window.WDClassifier && window.WDClassifier.classify) {
      try {
        var r = window.WDClassifier.classify(
          article.title || "",
          article.description || article.desc || article.summary || "",
          article.source || ""
        );
        return { category: r.category, subtype: r.subtype, confidence: r.confidence, uncertain: r.uncertain, scores: r.scores, meta: r.meta };
      } catch(e){}
    }
    return { category: "civiel", subtype: "Overig", confidence: 50, uncertain: true, scores: {}, meta: {} };
  }

  function getTranslatedTitleFor(article){
    try { if (window.NewsAPI && window.NewsAPI.getTranslatedTitle) return window.NewsAPI.getTranslatedTitle(article); } catch(e){}
    return null;
  }

  function getTranslatedDescFor(article){
    try { if (window.NewsAPI && window.NewsAPI.getTranslatedDesc) return window.NewsAPI.getTranslatedDesc(article); } catch(e){}
    return null;
  }

  function getISO3For(countryName){
    try { if (window.WorldMapData && window.WorldMapData.getISO3) return window.WorldMapData.getISO3(countryName); } catch(e){}
    return null;
  }

  function detectActorCountries(title, desc){
    var text = (title || "") + " " + (desc || "");
    try { if (window.WorldMapData && window.WorldMapData.detectActorsInTitle) return window.WorldMapData.detectActorsInTitle(text); } catch(e){}
    return [];
  }

  function detectPhysicalEvent(title, desc){
    try { if (window.WDEventDetector && window.WDEventDetector.analyze) return window.WDEventDetector.analyze(title, desc); } catch(e){}
    return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reason: "no-detector" };
  }

  function getSourceCountry(sourceName){
    try { if (window.WDEventDetector && window.WDEventDetector.getSourceCountry) return window.WDEventDetector.getSourceCountry(sourceName); } catch(e){}
    return null;
  }

  var lastHash = "";

  function buildEvents(){
    if (!window.State || !Array.isArray(window.State.items)) return [];
    var items = window.State.items;
    if (!items.length) return [];

    var hash = hashArticles(items);
    if (hash === lastHash) return null;
    lastHash = hash;

    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
    var events = [];
    var skippedOld = 0, skippedSport = 0, skippedWeakCiviel = 0, skippedWeakPolitiek = 0;
    var skippedNoLocation = 0, skippedNonPhysical = 0;
    var controlCount = 0, attackCount = 0;
    var positionHits = 0, contextHits = 0;
    var cityHits = 0;

    for (var i = 0; i < items.length; i++) {
      var article = items[i];

      var ts = getTimestamp(article) || Date.now();
      if (Date.now() - ts > MAX_AGE_MS) { skippedOld++; continue; }

      var cls = classifyItem(article);
      if (cls.category === "sport") { skippedSport++; continue; }

      var titleStr = String(article.title || "");

      if (cls.category === "civiel") {
        if (!STRONG_CIVIEL_PATTERN.test(titleStr)) {
          if (!WAR_CONTEXT_PATTERN.test(titleStr)) { skippedWeakCiviel++; continue; }
        }
      }

      if (cls.category === "politiek") {
        var hasPolitiekConflictContext = POLITIEK_CONFLICT_PATTERN.test(titleStr) ||
                                         WAR_CONTEXT_PATTERN.test(titleStr);
        if (!hasPolitiekConflictContext) {
          skippedWeakPolitiek++;
          continue;
        }
      }

      var actorCountries = detectActorCountries(article.title, article.description || article.desc);
      var detection = detectPhysicalEvent(article.title, article.description || article.desc);
      var sourceCountry = getSourceCountry(article.source);
      var skipForLoc = detection.isPhysicalEvent ? null : sourceCountry;

      var targetResult = extractTargetLocation(article.title || "", actorCountries, skipForLoc);
      var loc = targetResult.loc;
      if (targetResult.method === "position") positionHits++;
      else if (targetResult.method === "context") contextHits++;

      if (loc && loc._isCity) cityHits++;

      if (!loc) loc = extractRegionFallback(article, skipForLoc);
      if (!loc) { skippedNoLocation++; continue; }

      var countsForHeat = detection.isPhysicalEvent;
      if (!countsForHeat && (cls.category === "militair" || cls.category === "crime")) skippedNonPhysical++;

      var iso3 = getISO3For(loc.country);

      if (detection.isPhysicalEvent && window.CityStatus && window.WDEventDetector &&
          window.WDEventDetector.extractCityEvent){
        try {
          var cityEvent = window.WDEventDetector.extractCityEvent(
            article.title,
            article.description || article.desc,
            actorCountries
          );
          if (cityEvent && cityEvent.city && cityEvent.actor){
            var originCountry = sourceCountry;
            if (cityEvent.type === "control" && window.CityStatus.recordControlClaim){
              controlCount++;
              window.CityStatus.recordControlClaim(
                cityEvent.city, cityEvent.actor, cityEvent.actorISO3,
                article.source, originCountry
              ).catch(function(){});
            } else if (cityEvent.type === "attack" && window.CityStatus.recordAttackClaim){
              attackCount++;
              window.CityStatus.recordAttackClaim(
                cityEvent.city, cityEvent.actor, cityEvent.actorISO3,
                article.source, originCountry
              ).catch(function(){});
            }
          }
        } catch(e){}
      }

      var translatedTitle = getTranslatedTitleFor(article);
      var translatedDesc = getTranslatedDescFor(article);
      var finalTitle = translatedTitle || article.title || "Onbekend";
      var finalDesc = translatedDesc || article.description || article.desc || article.summary || "";
      var subtype = cls.subtype || "Overig";
      var eventId = "ev-" + i + "-" + cls.category + "-" + subtype;

      events.push({
        id: eventId, lat: loc.lat, lng: loc.lng,
        title: finalTitle,
        originalTitle: translatedTitle ? (article.title || "") : null,
        isTranslated: !!translatedTitle,
        description: finalDesc,
        fullDescription: loc.country + " · " + loc.region + "\n\n" + finalDesc + (translatedTitle ? "\n\nOrigineel: " + (article.title || "") : ""),
        category: cls.category, subtype: subtype, type: cls.category,
        confidence: cls.confidence || 50, uncertain: !!cls.uncertain,
        scores: cls.scores || {}, meta: cls.meta || {},
        country: loc.country, countryISO3: iso3,
        actorCountries: actorCountries, region: loc.region,
        date: new Date(ts).toISOString(),
        url: article.link || article.url || "",
        source: article.source || "",
        isMilitary: cls.category === "militair",
        countsForHeat: countsForHeat,
        actionTypes: detection.actionTypes || [],
        actionReason: detection.reason,
        locationMethod: targetResult.method
      });
    }

    var beforeDedup = events.length;
    var grouped = events;
    if (window.WDEventDedup && window.WDEventDedup.group) {
      try { grouped = window.WDEventDedup.group(events); } catch(e){ if (window.wdLog) wdLog.warn("[Map-AI] Dedup faalde:", e.message); }
    }

    grouped.sort(function(a, b){ return new Date(b.date).getTime() - new Date(a.date).getTime(); });
    if (grouped.length > MAX_EVENTS) grouped = grouped.slice(0, MAX_EVENTS);

    /* v3.16.1: vertaalwachtrij 25 ipv 40, geen OSINT */
    try {
      if (window.NewsAPI && window.NewsAPI.ensureTranslations) {
        var TRANSLATABLE = { "ar": 1, "fr": 1, "ru": 1, "uk": 1, "he": 1 };
        var toTranslate = [];
        for (var k = 0; k < items.length; k++) {
          var it = items[k];
          if (it && it.lang && TRANSLATABLE[it.lang]) {
            toTranslate.push(it);
            if (toTranslate.length >= MAX_TRANSLATIONS_PER_RUN) break;
          }
        }
        if (toTranslate.length) window.NewsAPI.ensureTranslations(toTranslate);
      }
    } catch(e){}

    var elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - startTime;

    if (window.wdLog) {
      var counts = { militair:0, crime:0, politiek:0, protest:0, civiel:0 };
      grouped.forEach(function(e){ if(counts[e.category] !== undefined) counts[e.category]++; });
      wdLog.info("[Map-AI v3.16.1] " + grouped.length + " events (was " + beforeDedup + ", dedup -" + (beforeDedup - grouped.length) + ") | " +
        "MIL:" + counts.militair + " CRI:" + counts.crime +
        " POL:" + counts.politiek + " PRO:" + counts.protest +
        " CIV:" + counts.civiel +
        " | skip sport:" + skippedSport + " zwak-civiel:" + skippedWeakCiviel +
        " zwak-pol:" + skippedWeakPolitiek +
        " niet-fysiek:" + skippedNonPhysical +
        " control:" + controlCount + " attack:" + attackCount +
        " oud:" + skippedOld + " geen-loc:" + skippedNoLocation +
        " | loc-pos:" + positionHits + " loc-ctx:" + contextHits +
        " city-hits:" + cityHits +
        " | " + Math.round(elapsed) + "ms");
    }

    return grouped;
  }

  function getOsintEvents(){
    try {
      if (window.OSINTFeeds && typeof window.OSINTFeeds.getEvents === "function"){
        var osint = window.OSINTFeeds.getEvents();
        if (Array.isArray(osint) && osint.length) return osint;
      }
    } catch(e){
      if (window.wdLog) wdLog.warn("[Map-AI] OSINTFeeds.getEvents faalde: " + (e.message || "?"));
    }
    return [];
  }

  function mergeOsintEvents(events){
    var osint = getOsintEvents();
    if (!osint.length) return events;
    var seen = {};
    for (var i = 0; i < events.length; i++){
      if (events[i] && events[i].id) seen[events[i].id] = 1;
    }
    var added = 0;
    for (var j = 0; j < osint.length; j++){
      var e = osint[j];
      if (!e || !e.id) continue;
      if (seen[e.id]) continue;
      events.push(e);
      seen[e.id] = 1;
      added++;
    }
    if (added && window.wdLog){
      wdLog.info("[Map-AI] +" + added + " OSINT events samengevoegd (totaal " + events.length + ")");
    }
    return events;
  }

  function calculateHotspots(events){
    if (!events || !events.length) return [];
    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;
    var byCountry = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.category !== "militair") continue;
      if (e.countsForHeat === false) continue;
      var t = new Date(e.date).getTime();
      if (t < dayAgo) continue;
      var k = e.country || "Onbekend";
      if (!byCountry[k]) byCountry[k] = { country: k, region: e.region || "", count: 0, latSum: 0, lngSum: 0 };
      byCountry[k].count++;
      byCountry[k].latSum += e.lat;
      byCountry[k].lngSum += e.lng;
    }
    var out = [];
    for (var c in byCountry) {
      var item = byCountry[c];
      if (item.count >= 1) {
        out.push({ label: item.country, type: "country", count: item.count, lat: item.latSum / item.count, lng: item.lngSum / item.count, region: item.region });
      }
    }
    out.sort(function(a, b){ return b.count - a.count; });
    var seen = {}, result = [];
    for (var k = 0; k < out.length; k++) {
      if (seen[out[k].label]) continue;
      seen[out[k].label] = true;
      result.push(out[k]);
      if (result.length >= 5) break;
    }
    return result;
  }

  function run(){
    var events = buildEvents();
    if (events === null) return;
    if (!Array.isArray(events)) events = [];

    mergeOsintEvents(events);

    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);
    var bus = getBus();
    if (!bus) return;
    bus.emit("map:military-events", events);
    bus.emit("map:hotspots", calculateHotspots(events));
  }

  function forceRun(){ lastHash = ""; run(); }

  function init(){
    var bus = getBus();
    if (!bus) { if (window.wdLog) wdLog.warn("[Map-AI] EventBus niet gevonden"); return; }
    bus.on("news:loaded", function(){
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){ run(); }, { timeout: 3000 });
    });
    bus.on("translation:added", function(){
      try { var mapTab = document.querySelector('.tab[data-view="map"]'); if (mapTab && mapTab.classList.contains("active")) forceRun(); } catch(e){}
    });
    bus.on("translation:toggle", function(){
      try { var mapTab = document.querySelector('.tab[data-view="map"]'); if (mapTab && mapTab.classList.contains("active")) forceRun(); } catch(e){}
    });
    bus.on("osint:military-events", function(osintList){
      if (!Array.isArray(osintList) || !osintList.length) return;
      if (window.wdLog) wdLog.info("[Map-AI] OSINT update: " + osintList.length + " events → herrun");
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){ forceRun(); }, { timeout: 2000 });
    });
    setTimeout(function(){
      if (window.State && window.State.items && window.State.items.length) run();
    }, 2000);
    setTimeout(function(){
      var osint = getOsintEvents();
      if (osint.length > 0) {
        if (window.wdLog) wdLog.info("[Map-AI] Late OSINT poll: " + osint.length + " events → herrun");
        forceRun();
      }
    }, 15000);
    if (window.wdLog) wdLog.info("[WAR DESK] ai-map.js v3.16.1 geladen");
  }

  function getCountries(){
    var out = {};
    for (var key in LOCATIONS) {
      var loc = LOCATIONS[key];
      if (loc && loc.country) out[key] = loc.country;
    }
    return out;
  }

  window.MapAI = {
    run: run, forceRun: forceRun,
    getEventsSync: function(){
      try {
        lastHash = "";
        var ev = buildEvents();
        if (!Array.isArray(ev)) ev = [];
        mergeOsintEvents(ev);
        return ev;
      } catch(e){ return []; }
    },
    getCountries: getCountries,
    calculateHotspots: function(){
      if (!window.State || !window.State.items) return [];
      var ev = buildEvents() || [];
      mergeOsintEvents(ev);
      return calculateHotspots(ev);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();