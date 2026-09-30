/* ============================================================
   WAR DESK — osint-feeds.js v2.0
   - v2.0: TELEGRAM (6 kanalen) + SOHR RSS
           * Telegram web previews via Cloudflare Worker
           * HTML parser voor posts
           * Taaldetectie uk/ru/ar/en
           * SOHR RSS feed voor Syrië
   - v1.4: (verwijderd) GDELT werkte niet
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[OSINT]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var REFRESH_MS = 20 * 60 * 1000;      /* 20 min cyclus (90s werk + pauze) */
  var MAX_EVENTS = 250;
  var STAGGER_MS = 15000;                /* 15s tussen fetches */
  var TG_FETCH_TIMEOUT = 25000;
  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  /* ============================================================
     BRONNEN
     ============================================================ */
  var TELEGRAM_CHANNELS = [
    { channel: "DeepStateUA",    label: "DeepState UA",   region: "Oost-Europa",   country: "Oekraïne" },
    { channel: "sentdefender",   label: "SentDefender",   region: "Midden-Oosten", country: null },
    { channel: "rybar",          label: "Rybar",          region: "Oost-Europa",   country: "Rusland" },
    { channel: "Faytuks",        label: "Faytuks",        region: "Midden-Oosten", country: null },
    { channel: "GeoConfirmed",   label: "GeoConfirmed",   region: "Midden-Oosten", country: null },
    { channel: "OSINTtechnical", label: "OSINTtechnical", region: "Midden-Oosten", country: null }
  ];

  var SOHR_RSS = "https://www.syriahr.com/en/feed/";

  /* ============================================================
     UTILITIES
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

  function decodeHtmlEntities(s){
    if (!s) return "";
    return String(s)
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '\u2014')
      .replace(/&ndash;/g, '\u2013')
      .replace(/&hellip;/g, '\u2026')
      .replace(/&#(\d+);/g, function(m, n){ return String.fromCharCode(parseInt(n, 10)); });
  }

  function stripHtmlTags(html){
    if (!html) return "";
    return String(html)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ============================================================
     TAALDETECTIE
     ============================================================ */
  function detectLang(text){
    if (!text) return "unknown";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";           /* Arabisch */
    if (/[їєіґЇЄІҐ]/.test(text)) return "uk";                 /* Oekraïens */
    if (/[\u0400-\u04FF]/.test(text)) return "ru";            /* Russisch */
    if (/[\u0590-\u05FF]/.test(text)) return "he";            /* Hebreeuws */
    return "en";
  }

  /* ============================================================
     LOCATIE EXTRACTOR (zelfde logica als province-mapper)
     ============================================================ */
  function extractLocationFromText(text, hint){
    if (!text) return null;
    if (!window.WorldMapData) return null;
    var locs = window.WorldMapData.LOCATIONS || {};
    var lower = " " + String(text).toLowerCase().replace(/[^\w\sÀ-ÿ\u0400-\u04FF\u0600-\u06FF]/g, " ").replace(/\s+/g, " ").trim() + " ";

    /* Probeer specifieke steden eerst (langste match) */
    var bestCity = null, bestCityLen = 0;
    var bestCountry = null, bestCountryLen = 0;

    for (var key in locs){
      if (!Object.prototype.hasOwnProperty.call(locs, key)) continue;
      if (key.length < 4) continue;
      if (lower.indexOf(" " + key + " ") === -1) continue;

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

    /* Fallback hint */
    if (hint && hint.country && locs[hint.country.toLowerCase()]){
      return locs[hint.country.toLowerCase()];
    }
    return null;
  }

  /* ============================================================
     ACTOR DETECTION
     ============================================================ */
  function detectActors(text){
    try {
      if (window.WorldMapData && window.WorldMapData.detectActorsInTitle){
        return window.WorldMapData.detectActorsInTitle(text);
      }
    } catch(e){}
    return [];
  }

  /* ============================================================
     CLASSIFICATIE
     ============================================================ */
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

  /* ============================================================
     FETCH VIA PROXIES (sequentiële fallback)
     ============================================================ */
  async function fetchViaProxies(targetUrl, timeoutMs){
    timeoutMs = timeoutMs || TG_FETCH_TIMEOUT;
    for (var i = 0; i < PROXIES.length; i++){
      var fullUrl = PROXIES[i] + encodeURIComponent(targetUrl);
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs);
        var r = await fetch(fullUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        var text = await r.text();
        if (!text || text.length < 100) throw new Error("Te kort");
        return { ok: true, text: text, proxy: i };
      } catch(e){
        /* stil falen, probeer volgende */
      }
    }
    return { ok: false };
  }

  /* ============================================================
     TELEGRAM PARSER
     ============================================================ */
  function parseTelegramHtml(html, channel){
    var posts = [];
    var wrappers = html.split('tgme_widget_message_wrap');
    if (wrappers.length < 2) return posts;

    var textRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    var dateRegex = /<time[^>]*datetime="([^"]+)"/;

    for (var i = 1; i < wrappers.length; i++){
      var w = wrappers[i];

      /* Extract text block */
      var textMatch = w.match(textRegex);
      if (!textMatch) continue;

      var raw = textMatch[1];
      var decoded = decodeHtmlEntities(raw);
      var text = stripHtmlTags(decoded);
      if (!text || text.length < 20) continue;

      /* Extract date */
      var dateMatch = w.match(dateRegex);
      var date = dateMatch ? dateMatch[1] : new Date().toISOString();

      posts.push({
        channel: channel,
        text: text,
        date: date,
        lang: detectLang(text)
      });
    }

    return posts;
  }

  /* ============================================================
     SOHR RSS PARSER
     ============================================================ */
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
          channel: "SOHR",
          text: fullText,
          title: decodeHtmlEntities(title),
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          link: link,
          lang: "en"
        });
      }
    } catch(e){}
    return items;
  }

  /* ============================================================
     ITEM → EVENT
     ============================================================ */
  function itemToEvent(item, hint){
    if (!item || !item.text) return null;

    /* Classificatie */
    var cls = classifyText(item.text);
    if (cls.category === "sport") return null;
    if (cls.category !== "militair" && cls.category !== "crime") return null;

    /* Fysiek? */
    var phys = detectPhysical(item.text);

    /* Locatie */
    var loc = extractLocationFromText(item.text, hint);
    if (!loc) return null;

    /* Actors */
    var actors = detectActors(item.text);

    /* ISO3 */
    var iso3 = null;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        iso3 = window.WorldMapData.getISO3(loc.country);
      }
    } catch(e){}

    /* Source label */
    var sourceLabel = item.channel === "SOHR" ? "SOHR" : "@" + item.channel;

    return {
      id: "osint-" + item.channel + "-" + hashCode(item.text.slice(0, 200)),
      lat: loc.lat,
      lng: loc.lng,
      title: item.title || item.text.slice(0, 120),
      originalTitle: item.text.slice(0, 500),
      isTranslated: false,
      description: item.text.slice(0, 500),
      fullDescription: loc.country + " · " + loc.region + "\n\n" + item.text,
      category: cls.category,
      subtype: cls.subtype,
      type: cls.category,
      confidence: 55,
      country: loc.country,
      countryISO3: iso3,
      actorCountries: actors,
      region: loc.region,
      date: item.date || new Date().toISOString(),
      url: item.link || ("https://t.me/" + item.channel),
      source: sourceLabel,
      sourceDomain: item.channel === "SOHR" ? "syriahr.com" : "t.me",
      countsForHeat: phys.isPhysicalEvent,
      actionTypes: phys.actionTypes || [],
      lang: item.lang || "unknown",
      _source: "osint"
    };
  }

  /* ============================================================
     STATE
     ============================================================ */
  var lastRun = 0;
  var osintEvents = [];
  var isRunning = false;
  var _timer = null;
  var _abortControllers = [];

  /* ============================================================
     RUN
     ============================================================ */
  async function runNow(opts){
    opts = opts || {};
    if (isRunning && !opts.force) return osintEvents;
    isRunning = true;

    var startTime = Date.now();
    LOG("Run start — " + TELEGRAM_CHANNELS.length + " TG + SOHR");

    var allItems = [];
    var successCount = 0;
    var failCount = 0;

    /* ==== Telegram kanalen ==== */
    for (var i = 0; i < TELEGRAM_CHANNELS.length; i++){
      var ch = TELEGRAM_CHANNELS[i];
      if (i > 0){
        await new Promise(function(r){ setTimeout(r, STAGGER_MS); });
      }
      try {
        var res = await fetchViaProxies("https://t.me/s/" + ch.channel);
        if (!res.ok){
          LOG("@" + ch.channel + " — alle proxies faalden");
          failCount++;
          continue;
        }
        var posts = parseTelegramHtml(res.text, ch.channel);
        posts.forEach(function(p){ p.hint = ch; });
        allItems = allItems.concat(posts);
        successCount++;
        LOG("@" + ch.channel + " — " + posts.length + " posts");
      } catch(e){
        LOG("@" + ch.channel + " faalde: " + (e.message || "?"));
        failCount++;
      }
    }

    /* ==== SOHR RSS ==== */
    try {
      await new Promise(function(r){ setTimeout(r, STAGGER_MS); });
      var sohrRes = await fetchViaProxies(SOHR_RSS);
      if (sohrRes.ok){
        var sohrItems = parseSohrRss(sohrRes.text);
        sohrItems.forEach(function(p){ p.hint = { country: "Syrië", region: "Midden-Oosten" }; });
        allItems = allItems.concat(sohrItems);
        successCount++;
        LOG("SOHR — " + sohrItems.length + " items");
      } else {
        LOG("SOHR — alle proxies faalden");
        failCount++;
      }
    } catch(e){
      LOG("SOHR faalde: " + (e.message || "?"));
      failCount++;
    }

    /* ==== Omzetten naar events ==== */
    var seen = {};
    var events = [];
    allItems.forEach(function(item){
      var ev = itemToEvent(item, item.hint);
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
    LOG("Klaar — " + events.length + " events uit " + allItems.length +
        " raw items | " + successCount + " bronnen OK, " + failCount + " faalden | " + elapsed + "ms");

    /* Emit */
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

    /* Start na 15 sec (laat andere modules laden) */
    setTimeout(function(){
      runNow();
      scheduleNext();
    }, 15000);

    LOG("Init klaar — " + TELEGRAM_CHANNELS.length + " TG kanalen + SOHR, refresh elke " + (REFRESH_MS/60000) + " min");
  }

  window.OSINTFeeds = {
    init: init,
    runNow: runNow,
    getEvents: function(){ return osintEvents; },
    getLastRun: function(){ return lastRun; },
    _version: "v2.0",
    _channels: TELEGRAM_CHANNELS,
    _sohr: SOHR_RSS
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  LOG("osint-feeds.js v2.0 geladen (Telegram + SOHR)");
})();