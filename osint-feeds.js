/* ============================================================
   WAR DESK — osint-feeds.js v2.6
   - v2.6: +10 nieuwe kanalen voor Afrika/Azië/Oekraïne
   - v2.5: countsForHeat fix + Arabic min-3
   - v2.4: Arabic-aware locatie-extractie
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[OSINT]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var REFRESH_MS = 20 * 60 * 1000;
  var MAX_EVENTS = 300;
  var STAGGER_MS = 4000;
  var PARALLEL_BATCH = 3;
  var FETCH_TIMEOUT = 25000;

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  var TELEGRAM_CHANNELS = [
    /* === Bestaande OSINT kanalen === */
    { channel: "DeepStateUA",    region: "Oost-Europa",   country: "Oekraïne" },
    { channel: "sentdefender",   region: "Midden-Oosten", country: null },
    { channel: "rybar",          region: "Oost-Europa",   country: "Rusland" },
    { channel: "Faytuks",        region: "Midden-Oosten", country: null },
    { channel: "GeoConfirmed",   region: "Midden-Oosten", country: null },
    { channel: "OSINTtechnical", region: "Midden-Oosten", country: null },

    /* === Bestaande Arabische kanalen === */
    { channel: "HalabTodayTV",    region: "Midden-Oosten", country: "Syrië" },
    { channel: "damscuce",        region: "Midden-Oosten", country: "Syrië" },
    { channel: "ya_topa",         region: "Midden-Oosten", country: "Syrië" },
    { channel: "NWSYEME",         region: "Midden-Oosten", country: "Jemen" },
    { channel: "naya_foriraq",    region: "Midden-Oosten", country: "Irak" },
    { channel: "sadadahiechannel", region: "Midden-Oosten", country: "Libanon" },
    { channel: "alshamii011",     region: "Midden-Oosten", country: null },

    /* === v2.6: NIEUWE KANALEN === */

    /* Oekraïne */
    { channel: "dniproofficial",  region: "Oost-Europa",   country: "Oekraïne" },
    { channel: "Militarylandnet", region: "Oost-Europa",   country: "Oekraïne" },

    /* Syrië */
    { channel: "Suriyakmaps",     region: "Midden-Oosten", country: "Syrië" },

    /* Ethiopië */
    { channel: "ASCENTIG",        region: "Afrika",        country: "Ethiopië" },

    /* Sahel */
    { channel: "aesinfos",        region: "Afrika",        country: "Mali" },

    /* Soedan */
    { channel: "RSFSudan",        region: "Afrika",        country: "Sudan" },

    /* DR Congo + Pakistan */
    { channel: "WarNoir",         region: "Afrika",        country: "DR Congo" },

    /* Myanmar */
    { channel: "bni_mmpeacemonitor", region: "Azië",       country: "Myanmar" },

    /* Jemen + Saoedi-Arabië */
    { channel: "global_observers", region: "Midden-Oosten", country: "Jemen" },

    /* Palestina */
    { channel: "qassam1brigades", region: "Midden-Oosten", country: "Palestina" },

    /* Pakistan + Afghanistan */
    { channel: "ResonantNews",    region: "Azië",          country: "Pakistan" }
  ];

  var OSINT_MILITARY_SOURCES = [
    /* Bestaand */
    "DeepStateUA", "sentdefender", "rybar",
    "Faytuks", "GeoConfirmed", "OSINTtechnical",
    "SOHR",
    "HalabTodayTV", "damscuce", "ya_topa",
    "NWSYEME", "naya_foriraq", "sadadahiechannel", "alshamii011",

    /* v2.6 — nieuwe kanalen */
    "dniproofficial", "Militarylandnet", "Suriyakmaps",
    "ASCENTIG", "aesinfos", "RSFSudan", "WarNoir",
    "bni_mmpeacemonitor", "global_observers",
    "qassam1brigades", "ResonantNews"
  ];

  var SOHR_RSS = "https://www.syriahr.com/en/feed/";

  function hashCode(str){
    var h = 0;
    str = String(str || "");
    for (var i = 0; i < str.length; i++){
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  function decodeHtmlEntities(s){
    if (!s) return "";
    return String(s)
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
      .replace(/&hellip;/g, '\u2026')
      .replace(/&#(\d+);/g, function(m, n){ return String.fromCharCode(parseInt(n, 10)); });
  }

  function stripHtmlTags(html){
    if (!html) return "";
    return String(html)
      .replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function detectLang(text){
    if (!text) return "unknown";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/[їєіґЇЄІҐ]/.test(text)) return "uk";
    if (/[\u0400-\u04FF]/.test(text)) return "ru";
    if (/[\u0590-\u05FF]/.test(text)) return "he";
    return "en";
  }

  function extractLocationFromText(text, hint){
    if (!text) return null;
    if (!window.WorldMapData) return null;
    var locs = window.WorldMapData.LOCATIONS || {};
    var lower = " " + String(text).toLowerCase()
      .replace(/[^\w\sÀ-ÿ\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF]/g, " ")
      .replace(/\s+/g, " ").trim() + " ";
    var bestCity = null, bestCityLen = 0;
    var bestCountry = null, bestCountryLen = 0;

    for (var key in locs){
      if (!Object.prototype.hasOwnProperty.call(locs, key)) continue;
      var isArabicKey = /[\u0600-\u06FF\u0590-\u05FF]/.test(key);
      var minLen = isArabicKey ? 3 : 4;
      if (key.length < minLen) continue;
      var found = false;
      if (isArabicKey){
        if (lower.indexOf(key) !== -1) found = true;
      } else {
        if (lower.indexOf(" " + key + " ") !== -1) found = true;
      }
      if (!found) continue;
      var loc = locs[key];
      var isCountry = false;
      try {
        if (window.WorldMapData.getISO3){
          var iso = window.WorldMapData.getISO3(key);
          if (iso && iso.indexOf("REG-") !== 0) isCountry = true;
        }
      } catch(e){}
      if (isCountry){
        if (key.length > bestCountryLen){ bestCountry = loc; bestCountryLen = key.length; }
      } else {
        if (key.length > bestCityLen){ bestCity = loc; bestCityLen = key.length; }
      }
    }
    if (bestCity) return bestCity;
    if (bestCountry) return bestCountry;
    if (hint && hint.country && locs[hint.country.toLowerCase()]) return locs[hint.country.toLowerCase()];
    return null;
  }

  function detectActors(text){
    try {
      if (window.WorldMapData && window.WorldMapData.detectActorsInTitle){
        return window.WorldMapData.detectActorsInTitle(text);
      }
    } catch(e){}
    return [];
  }

  function classifyText(text){
    try {
      if (window.WDClassifier && window.WDClassifier.classify){
        var r = window.WDClassifier.classify(text, "", "");
        return { category: r.category, subtype: r.subtype || "Conflict" };
      }
    } catch(e){}
    return { category: "civiel", subtype: "Overig" };
  }

  function detectPhysical(text){
    try {
      if (window.WDEventDetector && window.WDEventDetector.analyze){
        return window.WDEventDetector.analyze(text, "");
      }
    } catch(e){}
    return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reason: "no-detector" };
  }

  async function fetchViaProxies(targetUrl){
    for (var i = 0; i < PROXIES.length; i++){
      var fullUrl = PROXIES[i] + encodeURIComponent(targetUrl);
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, FETCH_TIMEOUT);
        var r = await fetch(fullUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        var text = await r.text();
        if (!text || text.length < 100) throw new Error("Te kort");
        return { ok: true, text: text, proxy: i };
      } catch(e){}
    }
    return { ok: false };
  }

  function parseTelegramHtml(html, channel){
    var posts = [];
    var wrappers = html.split('tgme_widget_message_wrap');
    if (wrappers.length < 2) return posts;
    var textRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    var dateRegex = /<time[^>]*datetime="([^"]+)"/;
    for (var i = 1; i < wrappers.length; i++){
      var w = wrappers[i];
      var textMatch = w.match(textRegex);
      if (!textMatch) continue;
      var raw = textMatch[1];
      var decoded = decodeHtmlEntities(raw);
      var text = stripHtmlTags(decoded);
      if (!text || text.length < 20) continue;
      var dateMatch = w.match(dateRegex);
      var date = dateMatch ? dateMatch[1] : new Date().toISOString();
      posts.push({ channel: channel, text: text, date: date, lang: detectLang(text) });
    }
    return posts;
  }

  function parseSohrRss(xmlText){
    var items = [];
    try {
      var doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (doc.getElementsByTagName("parsererror").length) return items;
      var nodes = doc.getElementsByTagName("item");
      for (var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        var title = (node.getElementsByTagName("title")[0] || {}).textContent || "";
        var desc = (node.getElementsByTagName("description")[0] || {}).textContent || "";
        var date = (node.getElementsByTagName("pubDate")[0] || {}).textContent || "";
        var link = (node.getElementsByTagName("link")[0] || {}).textContent || "";
        if (!title) continue;
        var fullText = decodeHtmlEntities(stripHtmlTags(title + " " + desc));
        items.push({
          channel: "SOHR", text: fullText,
          title: decodeHtmlEntities(title),
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          link: link, lang: "en"
        });
      }
    } catch(e){}
    return items;
  }

  function itemToEvent(item, hint){
    if (!item || !item.text) return null;
    var isOsintMilitary = OSINT_MILITARY_SOURCES.indexOf(item.channel) !== -1;
    var cls = classifyText(item.text);
    if (cls.category === "sport") return null;
    if (isOsintMilitary){
      if (cls.category !== "militair" && cls.category !== "crime"){
        cls = { category: "militair", subtype: cls.subtype || "Conflict" };
      }
    } else {
      if (cls.category !== "militair" && cls.category !== "crime") return null;
    }
    var phys = detectPhysical(item.text);
    var loc = extractLocationFromText(item.text, hint);
    if (!loc) return null;
    var actors = detectActors(item.text);
    var iso3 = null;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        iso3 = window.WorldMapData.getISO3(loc.country);
      }
    } catch(e){}
    var sourceLabel = item.channel === "SOHR" ? "SOHR" : "@" + item.channel;
    var countsForHeat = !!phys.isPhysicalEvent;
    return {
      id: "osint-" + item.channel + "-" + hashCode(item.text.slice(0, 200)),
      lat: loc.lat, lng: loc.lng,
      title: item.title || item.text.slice(0, 120),
      originalTitle: item.text.slice(0, 500),
      isTranslated: false,
      description: item.text.slice(0, 500),
      fullDescription: loc.country + " · " + loc.region + "\n\n" + item.text,
      category: cls.category, subtype: cls.subtype, type: cls.category,
      confidence: 55,
      country: loc.country, countryISO3: iso3,
      actorCountries: actors, region: loc.region,
      date: item.date || new Date().toISOString(),
      url: item.link || ("https://t.me/" + item.channel),
      source: sourceLabel,
      sourceDomain: item.channel === "SOHR" ? "syriahr.com" : "t.me",
      countsForHeat: countsForHeat,
      actionTypes: phys.actionTypes || [],
      lang: item.lang || "unknown",
      _source: "osint"
    };
  }

  var lastRun = 0;
  var osintEvents = [];
  var isRunning = false;
  var _timer = null;

  async function fetchOneChannel(ch){
    try {
      var res = await fetchViaProxies("https://t.me/s/" + ch.channel);
      if (!res.ok){ LOG("@" + ch.channel + " — alle proxies faalden"); return { ok: false, items: [] }; }
      var posts = parseTelegramHtml(res.text, ch.channel);
      posts.forEach(function(p){ p.hint = ch; });
      LOG("@" + ch.channel + " — " + posts.length + " posts");
      return { ok: true, items: posts };
    } catch(e){
      LOG("@" + ch.channel + " faalde: " + (e.message || "?"));
      return { ok: false, items: [] };
    }
  }

  async function fetchOneSohr(){
    try {
      var res = await fetchViaProxies(SOHR_RSS);
      if (!res.ok){ LOG("SOHR — alle proxies faalden"); return { ok: false, items: [] }; }
      var items = parseSohrRss(res.text);
      items.forEach(function(p){ p.hint = { country: "Syrië", region: "Midden-Oosten" }; });
      LOG("SOHR — " + items.length + " items");
      return { ok: true, items: items };
    } catch(e){
      LOG("SOHR faalde: " + (e.message || "?"));
      return { ok: false, items: [] };
    }
  }

  async function fetchAllSources(){
    var allItems = [];
    var okCount = 0;
    var failCount = 0;
    for (var i = 0; i < TELEGRAM_CHANNELS.length; i += PARALLEL_BATCH){
      var batch = TELEGRAM_CHANNELS.slice(i, i + PARALLEL_BATCH);
      var results = await Promise.all(batch.map(fetchOneChannel));
      results.forEach(function(r){
        if (r.ok){ okCount++; allItems = allItems.concat(r.items); }
        else failCount++;
      });
      if (i + PARALLEL_BATCH < TELEGRAM_CHANNELS.length){
        await new Promise(function(r){ setTimeout(r, STAGGER_MS); });
      }
    }
    await new Promise(function(r){ setTimeout(r, STAGGER_MS); });
    var sohr = await fetchOneSohr();
    if (sohr.ok){ okCount++; allItems = allItems.concat(sohr.items); }
    else failCount++;
    return { allItems: allItems, okCount: okCount, failCount: failCount };
  }

  async function runNow(opts){
    opts = opts || {};
    if (isRunning && !opts.force) return osintEvents;
    isRunning = true;
    var startTime = Date.now();
    LOG("Run start — " + TELEGRAM_CHANNELS.length + " TG + SOHR (parallel " + PARALLEL_BATCH + ")");
    var result = await fetchAllSources();
    var seen = {};
    var events = [];
    result.allItems.forEach(function(item){
      var ev = itemToEvent(item, item.hint);
      if (!ev) return;
      if (seen[ev.id]) return;
      seen[ev.id] = 1;
      events.push(ev);
    });
    events.sort(function(a, b){ return new Date(b.date).getTime() - new Date(a.date).getTime(); });
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);
    osintEvents = events;
    lastRun = Date.now();
    isRunning = false;
    var elapsed = Date.now() - startTime;
    LOG("Klaar — " + events.length + " events uit " + result.allItems.length +
        " raw items | " + result.okCount + " bronnen OK, " + result.failCount + " faalden | " + elapsed + "ms");
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
    LOG("Init klaar — refresh elke " + (REFRESH_MS/60000) + " min, parallel " + PARALLEL_BATCH);
  }

  window.OSINTFeeds = {
    init: init, runNow: runNow,
    getEvents: function(){ return osintEvents; },
    getLastRun: function(){ return lastRun; },
    _version: "v2.6",
    _channels: TELEGRAM_CHANNELS,
    _militarySources: OSINT_MILITARY_SOURCES
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("osint-feeds.js v2.6 geladen (" + TELEGRAM_CHANNELS.length + " kanalen)");
})();