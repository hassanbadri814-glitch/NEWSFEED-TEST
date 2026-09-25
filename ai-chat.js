/* ============================================================
   WAR DESK v1.17 — AI Chat Module
   - v1.17: Cache warming (3 populaire vragen bij AI-tab open)
   - v1.16: Retry met exponentiële backoff (1s/2s/4s) + jitter
   - v1.15: SSE streaming + stop-knop + graceful JSON fallback
   - v1.14: MILITARY_COUNTRIES uit MapAI.getCountries() met fallback
   ============================================================ */

(function(){
  "use strict";

  /* ===== v1.15: Streaming CSS auto-inject ===== */
  (function injectStreamCss(){
    if (document.getElementById("wd-ai-stream-css")) return;
    var style = document.createElement("style");
    style.id = "wd-ai-stream-css";
    style.textContent = [
      ".ai-cursor{display:inline-block;margin-left:2px;color:var(--amber,#e0a857);",
      "animation:wdBlink 1s steps(2,start) infinite;font-weight:400;font-size:.9em}",
      "@keyframes wdBlink{0%,50%{opacity:1}51%,100%{opacity:0}}",
      ".ai-send-btn.ai-stop-mode{background:#e57373!important;color:#fff!important}",
      ".ai-streaming .ai-msg-text{white-space:pre-wrap;word-break:break-word}",
      ".ai-msg-actions .ai-action-btn[data-action='stop']{color:#e57373}"
    ].join("");
    document.head.appendChild(style);
  })();

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ wdLog.info.apply(null, ["[AI]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.17 geladen (cache warming)");

  var WORKER_URL = "https://newsfeed2.hassanbadri814.workers.dev/ai";
  var AUTH_TOKEN = "wardesk-2026-soft-auth";
  var MAX_ARTICLES = 12;
  var MAX_ARTICLES_MILITARY = 4;
  var MAX_MILITARY = 30;
  var STORAGE_KEY = "wardesk_ai_history_v1";
  var CACHE_KEY = "wardesk_ai_cache_v1";
  var STORAGE_MAX_MSGS = 40;
  var MIN_REQUEST_INTERVAL = 2000;
  var CACHE_MAX_AGE = 10 * 60 * 1000;
  var CACHE_MAX_ITEMS = 20;
  var STREAM_TIMEOUT_MS = 60000;

  /* v1.16: Retry-config */
  var RETRY_MAX_ATTEMPTS = 3;
  var RETRY_BASE_DELAY_MS = 1000;
  var RETRY_JITTER_RATIO = 0.2;

  /* v1.17: Cache warming config */
  var WARMUP_START_DELAY_MS = 3000;
  var WARMUP_BETWEEN_DELAY_MS = 4000;
  var WARMUP_TIMEOUT_MS = 30000;
  var WARMUP_QUESTIONS = [
    "Wat is het belangrijkste nieuws vandaag?",
    "Geef een militaire overzicht",
    "Wat gebeurt er in Oekraïne?"
  ];

  var AI = {
    initialized: false,
    sending: false,
    history: [],
    streaming: null,
    abortController: null
  };

  /* v1.17: Warmup state */
  var warmupState = {
    scheduled: false,
    started: false,
    aborted: false,
    completed: [],
    currentAbort: null
  };

  var lastRequestTime = 0;
  var responseCache = {};

  /* ===== HULPFUNCTIES ===== */

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function safeUrl(url){
    if (!url) return "";
    var s = String(url).trim();
    if (/^(https?:)?\/\//i.test(s)) return esc(s);
    if (/^\/[^\/]/i.test(s)) return esc(s);
    return "";
  }

  function hashMessage(msg){
    var h = 0;
    var s = String(msg || "").toLowerCase().trim();
    for (var i = 0; i < s.length; i++){
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  }

  function sleep(ms){
    return new Promise(function(res){ setTimeout(res, ms); });
  }

  function isAbortError(e){
    return e && (e.name === "AbortError" || /aborted/i.test(String(e.message || "")));
  }

  function isNonRetryableError(e){
    if (!e || !e.message) return false;
    var m = String(e.message);
    if (/HTTP 40[0-4]/.test(m)) return true;
    if (/HTTP 413/.test(m)) return true;
    if (/Unauthorized/i.test(m)) return true;
    return false;
  }

  function hasReceivedTokens(){
    return !!(AI.streaming && AI.streaming.text && AI.streaming.text.length > 0);
  }

  function loadCache(){
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      var now = Date.now();
      Object.keys(parsed).forEach(function(k){
        if (parsed[k] && (now - parsed[k].t) < CACHE_MAX_AGE) {
          responseCache[k] = parsed[k];
        }
      });
    } catch(e){}
  }

  var cacheSaveTimer = null;
  function saveCache(){
    if (cacheSaveTimer) clearTimeout(cacheSaveTimer);
    cacheSaveTimer = setTimeout(function(){
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(responseCache));
      } catch(e){}
    }, 2000);
  }

  function cleanupCache(){
    var keys = Object.keys(responseCache);
    if (keys.length <= CACHE_MAX_ITEMS) return;
    keys.sort(function(a, b){ return responseCache[b].t - responseCache[a].t; });
    for (var i = CACHE_MAX_ITEMS; i < keys.length; i++){
      delete responseCache[keys[i]];
    }
    saveCache();
  }

  var STOPWORDS = (window.AIShared && window.AIShared.STOP_WORDS) || {
    "de":1,"het":1,"een":1,"en":1,"of":1,"maar":1,"dus":1,"want":1,"omdat":1,
    "als":1,"dan":1,"ook":1,"nog":1,"al":1,"wel":1,"niet":1,"geen":1,
    "wat":1,"wie":1,"waar":1,"wanneer":1,"waarom":1,"hoe":1,"welke":1,
    "is":1,"was":1,"zijn":1,"wordt":1,"worden":1,"kan":1,"kunnen":1,"zal":1,
    "heeft":1,"hebben":1,"had":1,"hadden":1,"doet":1,"doen":1,"deed":1,
    "er":1,"daar":1,"hier":1,"dit":1,"dat":1,"deze":1,"die":1,
    "ik":1,"jij":1,"je":1,"hij":1,"zij":1,"ze":1,"wij":1,"we":1,"jullie":1,
    "mij":1,"mijn":1,"jouw":1,"uw":1,"ons":1,"onze":1,
    "in":1,"op":1,"aan":1,"bij":1,"van":1,"voor":1,"met":1,"naar":1,"uit":1,
    "over":1,"onder":1,"tussen":1,"tegen":1,"zonder":1,"tijdens":1,"na":1
  };

  var SYNONYMS = {
    "nl": ["nederland","nederlands","dutch","holland","amsterdam","rotterdam","den haag"],
    "nederland": ["nederland","nederlands","dutch","holland"],
    "marokko": ["marokko","marokkaans","marokkaanse","morocco","maroc","rabat","casablanca"],
    "vs": ["vs","verenigde staten","amerika","amerikaans","usa","washington","trump","biden"],
    "amerika": ["vs","verenigde staten","amerika","usa","washington"],
    "israel": ["israel","israelisch","israeli","jeruzalem","tel aviv","netanyahu"],
    "palestina": ["palestijn","palestijns","palestinian","westelijke jordaanoever"],
    "iran": ["iran","iraans","tehran","khamenei"],
    "oekraine": ["oekraine","oekraïne","ukraine","kyiv","kiev","zelensky"],
    "rusland": ["rusland","russisch","russia","moskou","poetin","putin","kremlin"],
    "gaza": ["gaza","rafah","hamas","palestijn"],
    "conflict": ["conflict","oorlog","strijd","geweld","aanval"],
    "oorlog": ["oorlog","conflict","strijd","geweld","aanval"],
    "aanval": ["aanval","aanslag","raketaanval","bombardement","luchtaanval"],
    "nieuws": ["nieuws","actualiteit","bericht"],
    "belangrijk": ["belangrijk","groot","ernstig"],
    "sport": ["sport","voetbal","eredivisie","ajax","psv","feyenoord"]
  };

  function stem(word){
    var w = word.toLowerCase();
    if (w.length <= 4) return w;
    if (w.endsWith("en") && w.length > 5) w = w.slice(0, -2);
    else if (w.endsWith("s") && w.length > 4) w = w.slice(0, -1);
    else if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
    return w;
  }

  function extractKeywords(text){
    if (!text) return [];
    var words = String(text).toLowerCase()
      .replace(/[^\w\sàáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/gi, " ")
      .split(/\s+/)
      .filter(function(w){ return w.length >= 3 && !STOPWORDS[w]; });
    var expanded = new Set();
    words.forEach(function(w){
      expanded.add(w);
      var stemmed = stem(w);
      expanded.add(stemmed);
      if (SYNONYMS[w]) SYNONYMS[w].forEach(function(s){ expanded.add(s); });
      if (SYNONYMS[stemmed]) SYNONYMS[stemmed].forEach(function(s){ expanded.add(s); });
    });
    return Array.from(expanded);
  }

  function scoreArticleForQuery(article, keywords){
    if (!keywords.length) return article._score || 0;
    var title = (article.title || "").toLowerCase();
    var desc = (article.desc || "").toLowerCase();
    var cat = (article.cat || "").toLowerCase();
    var score = 0, matches = 0;
    keywords.forEach(function(kw){
      if (!kw || kw.length < 3) return;
      if (title.indexOf(kw) >= 0) { score += 25; matches++; }
      else if (desc.indexOf(kw) >= 0) { score += 8; matches++; }
      else if (cat.indexOf(kw) >= 0) { score += 15; matches++; }
    });
    if (matches >= 3) score += 20;
    else if (matches >= 2) score += 10;
    score += Math.min(article._score || 0, 50) * 0.3;
    return score;
  }

  function buildArticleContext(userQuestion, maxArticles){
    try {
      if (!window.State || !State.items || !State.items.length) return [];
      var limit = maxArticles || MAX_ARTICLES;
      var keywords = extractKeywords(userQuestion);
      var scored = State.items.map(function(it){
        return { item: it, relevance: scoreArticleForQuery(it, keywords) };
      });
      scored.sort(function(a, b){ return b.relevance - a.relevance; });
      var sourceCount = {};
      var selected = [];
      for (var i = 0; i < scored.length && selected.length < limit; i++){
        var item = scored[i].item;
        var src = item.source || "?";
        sourceCount[src] = (sourceCount[src] || 0);
        if (sourceCount[src] < 2){ sourceCount[src]++; selected.push(item); }
      }
      return selected.map(function(it){
        return {
          title: it.title || "",
          desc: (it.desc || "").slice(0, 400),
          source: it.source || "",
          cat: it.cat || "",
          date: it.date || "",
          link: it.link || ""
        };
      });
    } catch(e){ LOG("buildArticleContext fout:", e.message); return []; }
  }

  var MILITARY_INTENT_KEYWORDS = {
    "militair": 1, "militaire": 1, "leger": 1, "troepen": 1, "strijdkrachten": 1,
    "oorlog": 1, "conflict": 1, "gevecht": 1, "gevechten": 1, "strijd": 1,
    "aanval": 1, "aanvallen": 1, "raketaanval": 1, "bombardement": 1,
    "aanslag": 1, "offensief": 1, "defensief": 1, "voortgang": 1,
    "drone": 1, "raket": 1, "raketten": 1, "luchtafweer": 1, "interceptie": 1,
    "hotspot": 1, "hotspots": 1, "frontlinie": 1, "escalatie": 1
  };

  var MILITARY_COUNTRIES = null;
  var MILITARY_COUNTRIES_FALLBACK = {
    "oekraïne": "Oekraïne", "oekraine": "Oekraïne", "ukraine": "Oekraïne", "kyiv": "Oekraïne", "kiev": "Oekraïne",
    "rusland": "Rusland", "russia": "Rusland", "moskou": "Rusland", "moscow": "Rusland",
    "iran": "Iran", "teheran": "Iran", "tehran": "Iran",
    "israël": "Israël", "israel": "Israël",
    "gaza": "Gaza", "rafah": "Gaza",
    "libanon": "Libanon", "lebanon": "Libanon", "beiroet": "Libanon",
    "syrië": "Syrië", "syria": "Syrië", "damascus": "Syrië",
    "irak": "Irak", "iraq": "Irak", "bagdad": "Irak",
    "jemen": "Jemen", "yemen": "Jemen", "houthi": "Jemen",
    "saudi": "Saudi-Arabië", "riyadh": "Saudi-Arabië",
    "qatar": "Qatar",
    "sudan": "Sudan", "khartoum": "Sudan", "darfur": "Sudan",
    "mali": "Mali", "burkina faso": "Burkina Faso", "niger": "Niger",
    "nigeria": "Nigeria", "somalia": "Somalië", "somalië": "Somalië",
    "ethiopië": "Ethiopië", "ethiopia": "Ethiopië", "tigray": "Ethiopië",
    "congo": "Congo", "mozambique": "Mozambique",
    "afghanistan": "Afghanistan", "kabul": "Afghanistan",
    "pakistan": "Pakistan", "kashmir": "Kashmir",
    "india": "India", "china": "China", "taiwan": "Taiwan",
    "noord-korea": "Noord-Korea", "north korea": "Noord-Korea",
    "myanmar": "Myanmar", "burma": "Myanmar",
    "krim": "Krim", "crimea": "Krim"
  };

  function getMilitaryCountries(){
    if (MILITARY_COUNTRIES) return MILITARY_COUNTRIES;
    try {
      if (window.MapAI && typeof window.MapAI.getCountries === "function") {
        var fromMap = window.MapAI.getCountries();
        if (fromMap && Object.keys(fromMap).length > 10) {
          MILITARY_COUNTRIES = fromMap;
          LOG("MILITARY_COUNTRIES uit MapAI: " + Object.keys(fromMap).length + " entries");
          return MILITARY_COUNTRIES;
        }
      }
    } catch(e){ LOG("MapAI.getCountries faalde:", e.message); }
    MILITARY_COUNTRIES = MILITARY_COUNTRIES_FALLBACK;
    LOG("MILITARY_COUNTRIES fallback: " + Object.keys(MILITARY_COUNTRIES).length + " entries");
    return MILITARY_COUNTRIES;
  }

  var SUBTYPE_TRIGGERS = {
    "aanval":     ["aanval", "aanvallen", "raketaanval", "bombardement", "aanslag", "luchtaanval", "drone-aanval"],
    "offensief":  ["offensief", "invasie", "opmars", "tegenoffensief"],
    "defensief":  ["defensief", "luchtafweer", "onderschept", "interceptie", "verdediging"],
    "voortgang":  ["voortgang", "veroverd", "heroverd", "frontlinie"],
    "actief":     ["actief", "oorlog", "conflict", "gevecht", "gevechten"]
  };

  function detectMilitaryIntent(question){
    var q = String(question || "").toLowerCase();
    var countries = getMilitaryCountries();
    var country = null;
    for (var key in countries) {
      if (q.indexOf(key) !== -1) { country = countries[key]; break; }
    }
    var subtype = null;
    for (var st in SUBTYPE_TRIGGERS) {
      var words = SUBTYPE_TRIGGERS[st];
      for (var i = 0; i < words.length; i++) {
        if (q.indexOf(words[i]) !== -1) { subtype = st; break; }
      }
      if (subtype) break;
    }
    var milScore = 0;
    var tokens = q.replace(/[^\w\sà-ÿ]/g, " ").split(/\s+/);
    for (var j = 0; j < tokens.length; j++) {
      if (MILITARY_INTENT_KEYWORDS[tokens[j]]) milScore++;
    }
    var actionScore = 0;
    if (q.indexOf("wat gebeurt") !== -1 || q.indexOf("wat is er") !== -1) actionScore++;
    if (q.indexOf("hoeveel") !== -1) actionScore++;
    if (q.indexOf("waar") !== -1) actionScore++;
    if (q.indexOf("toon") !== -1) actionScore++;
    if (q.indexOf("overzicht") !== -1) actionScore++;
    if (q.indexOf("samenvatting") !== -1) actionScore++;
    if (q.indexOf("vat ") !== -1) actionScore++;
    if (q.indexOf("vergelijk") !== -1) actionScore++;
    if (q.indexOf("waarom") !== -1) actionScore++;
    if (q.indexOf("trend") !== -1) actionScore++;

    var isMilitary = false;
    if ((country || subtype) && milScore >= 1) isMilitary = true;
    if (milScore >= 2 && actionScore >= 1) isMilitary = true;
    if (q.indexOf("hotspot") !== -1 || q.indexOf("hotspots") !== -1) isMilitary = true;
    if (q.indexOf("militaire") !== -1 || q.indexOf("militair") !== -1) isMilitary = true;

    return { isMilitary: isMilitary, country: country, subtype: subtype };
  }

  function getMilitaryEvents(){
    try {
      if (window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events) && window.MAPAPI.state.events.length) {
        var mil = window.MAPAPI.state.events.filter(function(e){ return e && e.isMilitary; });
        if (mil.length) return mil;
      }
      if (window.MapAI && typeof window.MapAI.getEventsSync === "function") {
        var events = window.MapAI.getEventsSync();
        if (Array.isArray(events)) {
          return events.filter(function(e){ return e && e.isMilitary; });
        }
      }
    } catch(e){}
    return [];
  }

  function buildMilitaryContext(question){
    var intent = detectMilitaryIntent(question);
    if (!intent.isMilitary) return null;
    var all = getMilitaryEvents();
    if (!all.length) return { intent: intent, events: [] };
    var filtered = all.slice();
    if (intent.country) {
      filtered = filtered.filter(function(e){ return e.country === intent.country; });
    }
    if (intent.subtype && intent.subtype !== "actief") {
      filtered = filtered.filter(function(e){ return e.subtype === intent.subtype; });
    }
    if (!filtered.length && (intent.country || intent.subtype)) {
      filtered = all.slice();
    }
    filtered.sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    filtered = filtered.slice(0, MAX_MILITARY);
    return {
      intent: intent,
      events: filtered.map(function(e){
        return {
          country: e.country || "",
          region: e.region || "",
          subtype: e.subtype || "actief",
          title: (e.title || "").slice(0, 200),
          date: e.date,
          source: e.source || "",
          url: e.url || ""
        };
      })
    };
  }

  var SUBTYPE_META = {
    aanval:    { emoji: "🔴", label: "Aanval" },
    offensief: { emoji: "🟠", label: "Offensief" },
    defensief: { emoji: "🟢", label: "Defensief" },
    voortgang: { emoji: "🟣", label: "Voortgang" },
    actief:    { emoji: "🟡", label: "Actief conflict" }
  };

  function milTimeAgo(d){
    var t = new Date(d).getTime();
    if (isNaN(t)) return "?";
    var diff = (Date.now() - t) / 1000;
    if (diff < 60) return "nu";
    if (diff < 3600) return Math.floor(diff / 60) + " min";
    if (diff < 86400) return Math.floor(diff / 3600) + " u";
    return Math.floor(diff / 86400) + " d";
  }

  function buildLocalMilitaryFallback(question){
    var intent = detectMilitaryIntent(question);
    if (!intent.isMilitary) return null;
    var all = getMilitaryEvents();
    if (!all.length) {
      return {
        text: "⚔️ **Geen militaire events**\n\nOp dit moment zijn er geen militaire activiteiten in de nieuwsfeed. Probeer het later opnieuw.",
        sources: []
      };
    }
    var dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    var recent = all.filter(function(e){
      var t = new Date(e.date).getTime();
      return t >= dayAgo;
    });
    var pool = recent.length ? recent : all;
    var period = recent.length ? "24u" : "totaal";

    if (intent.country) {
      var countryEvents = pool.filter(function(e){ return e.country === intent.country; });
      if (!countryEvents.length) {
        return {
          text: "📍 **" + intent.country + "**\n\nGeen militaire events in de laatste " + period + " voor dit land.",
          sources: []
        };
      }
      return buildCountryAnswer(intent.country, countryEvents, period);
    }
    if (intent.subtype && intent.subtype !== "actief") {
      var subtypeEvents = pool.filter(function(e){ return e.subtype === intent.subtype; });
      if (!subtypeEvents.length) {
        return {
          text: SUBTYPE_META[intent.subtype].emoji + " **Geen events van type " + SUBTYPE_META[intent.subtype].label + "** in de laatste " + period + ".",
          sources: []
        };
      }
      return buildSubtypeAnswer(intent.subtype, subtypeEvents, period);
    }
    return buildOverviewAnswer(pool, period);
  }

  function buildCountryAnswer(country, events, period){
    var bySubtype = {};
    events.forEach(function(e){
      if (!bySubtype[e.subtype]) bySubtype[e.subtype] = [];
      bySubtype[e.subtype].push(e);
    });
    var lines = ["📍 **" + country + "** — " + events.length + " militaire events (" + period + ")", ""];
    var order = ["aanval", "offensief", "defensief", "voortgang", "actief"];
    order.forEach(function(st){
      if (!bySubtype[st]) return;
      var meta = SUBTYPE_META[st];
      lines.push(meta.emoji + " **" + meta.label + "** (" + bySubtype[st].length + ")");
      bySubtype[st].slice(0, 3).forEach(function(e){
        var t = milTimeAgo(e.date);
        var src = e.source ? " · " + e.source : "";
        lines.push("• " + (e.title || "").slice(0, 100) + " (" + t + src + ")");
      });
      lines.push("");
    });
    var sources = events.slice(0, 5).map(function(e){
      return { title: e.title, link: e.url, source: e.source };
    });
    return { text: lines.join("\n").trim(), sources: sources };
  }

  function buildSubtypeAnswer(subtype, events, period){
    var meta = SUBTYPE_META[subtype];
    var lines = [meta.emoji + " **" + meta.label + "** — " + events.length + " events (" + period + ")", ""];
    events.slice(0, 8).forEach(function(e){
      var t = milTimeAgo(e.date);
      var src = e.source ? " · " + e.source : "";
      lines.push("• **" + (e.country || "?") + "** — " + (e.title || "").slice(0, 90) + " (" + t + src + ")");
    });
    var sources = events.slice(0, 5).map(function(e){
      return { title: e.title, link: e.url, source: e.source };
    });
    return { text: lines.join("\n").trim(), sources: sources };
  }

  function buildOverviewAnswer(events, period){
    var byCountry = {};
    var bySubtype = {};
    events.forEach(function(e){
      var c = e.country || "?";
      byCountry[c] = (byCountry[c] || 0) + 1;
      var st = e.subtype || "actief";
      bySubtype[st] = (bySubtype[st] || 0) + 1;
    });
    var countries = Object.keys(byCountry).map(function(c){
      return { name: c, count: byCountry[c] };
    }).sort(function(a, b){ return b.count - a.count; });
    var lines = ["⚔️ **Militaire overzicht** — " + events.length + " events (" + period + ")", ""];
    lines.push("**Per type:**");
    ["aanval", "offensief", "defensief", "voortgang", "actief"].forEach(function(st){
      if (bySubtype[st]) lines.push(SUBTYPE_META[st].emoji + " " + SUBTYPE_META[st].label + ": " + bySubtype[st]);
    });
    lines.push("");
    lines.push("**Top landen:**");
    countries.slice(0, 5).forEach(function(c){
      lines.push("• " + c.name + " — " + c.count + " events");
    });
    var sources = events.slice(0, 5).map(function(e){
      return { title: e.title, link: e.url, source: e.source };
    });
    return { text: lines.join("\n").trim(), sources: sources };
  }

  /* ===== STREAMING RENDERER ===== */

  function renderStreamingMsg(){
    if (!AI.streaming) return "";
    var text = AI.streaming.text || "";
    var html = '<div class="ai-msg ai-msg-ai ai-streaming" data-streaming="1">';
    html += '<div class="ai-msg-label">AI</div>';
    if (!text.length) {
      html += '<div class="ai-typing"><span></span><span></span><span></span></div>';
    } else {
      html += '<div class="ai-msg-text">' + renderMarkdown(text) + '<span class="ai-cursor">▋</span></div>';
    }
    html += '</div>';
    return html;
  }

  function updateStreamingDom(text){
    if (!AI.streaming) return;
    AI.streaming.text = text;
    var node = document.querySelector('[data-streaming="1"] .ai-msg-text');
    if (!node) {
      renderMessages();
      return;
    }
    node.innerHTML = renderMarkdown(text) + '<span class="ai-cursor">▋</span>';
    scrollToBottom();
  }

  function updateSendButtonState(){
    var sendBtn = $("aiSendBtn");
    if (!sendBtn) return;
    if (AI.sending) {
      sendBtn.classList.add("ai-stop-mode");
      sendBtn.textContent = "■";
      sendBtn.setAttribute("aria-label", "Stop generatie");
      sendBtn.disabled = false;
    } else {
      sendBtn.classList.remove("ai-stop-mode");
      sendBtn.textContent = "➤";
      sendBtn.setAttribute("aria-label", "Versturen");
      sendBtn.disabled = false;
    }
  }

  /* ===== RENDER MESSAGES ===== */

  function renderMessages(){
    var container = $("aiMessages");
    if (!container) return;

    if (!AI.history.length && !AI.streaming){
      container.innerHTML =
        '<div class="ai-welcome">' +
          '<div class="ai-welcome-icon">🤖</div>' +
          '<div class="ai-welcome-title">WAR DESK AI</div>' +
          '<div class="ai-welcome-text">Stel een vraag over het nieuws, militaire conflicten of vraag om uitleg.</div>' +
          '<div class="ai-suggestions">' +
            '<button class="ai-sugg" data-q="Wat is het belangrijkste nieuws vandaag?">Belangrijkste nieuws</button>' +
            '<button class="ai-sugg" data-q="Geef een militaire overzicht">⚔️ Militair overzicht</button>' +
            '<button class="ai-sugg" data-q="Wat gebeurt er in Oekraïne?">Wat gebeurt in Oekraïne?</button>' +
            '<button class="ai-sugg" data-q="Toon alle aanvallen van vandaag">Toon alle aanvallen</button>' +
            '<button class="ai-sugg" data-q="Wat gebeurt er in Gaza en waarom?">Gaza — wat en waarom?</button>' +
          '</div>' +
        '</div>';
      bindSuggestions();
      updateSendButtonState();
      return;
    }

    var html = "";
    var lastAiIndex = -1;
    for (var i = AI.history.length - 1; i >= 0; i--){
      if (AI.history[i].role === "ai" && !AI.history[i].error){
        lastAiIndex = i;
        break;
      }
    }

    AI.history.forEach(function(msg, idx){
      var roleClass = msg.role === "user" ? "ai-msg-user" : "ai-msg-ai";
      var roleLabel = msg.role === "user" ? "Jij" : (msg.provider === "local-military" ? "⚔️ Militair" : "AI");
      html += '<div class="ai-msg ' + roleClass + '" data-idx="' + idx + '">';
      html += '<div class="ai-msg-label">' + roleLabel + '</div>';
      html += '<div class="ai-msg-text">' + renderMarkdown(msg.text) + '</div>';
      if (msg.role === "ai" && msg.sources && msg.sources.length){
        html += renderSources(msg.sources);
      }
      if (msg.role === "ai" && !msg.error){
        html += '<div class="ai-msg-actions">';
        html += '<button class="ai-action-btn" data-action="copy" data-idx="' + idx + '" title="Kopieer">📋</button>';
        if (idx === lastAiIndex && !AI.sending){
          html += '<button class="ai-action-btn" data-action="regenerate" data-idx="' + idx + '" title="Opnieuw">🔄</button>';
        }
        html += '</div>';
      }
      html += '</div>';
    });

    if (AI.streaming){
      html += renderStreamingMsg();
    } else if (AI.sending){
      html += '<div class="ai-msg ai-msg-ai ai-msg-loading">';
      html += '<div class="ai-msg-label">AI</div>';
      html += '<div class="ai-typing"><span></span><span></span><span></span></div>';
      html += '</div>';
    }

    container.innerHTML = html;
    bindMessageActions();
    updateSendButtonState();
    scrollToBottom();
  }

  function renderSources(sources){
    var seen = {};
    var unique = [];
    sources.forEach(function(s){
      var link = safeUrl(s.link);
      if (!link || seen[link]) return;
      seen[link] = 1;
      unique.push({ title: s.title, source: s.source, link: link });
    });
    if (!unique.length) return "";
    var html = '<details class="ai-sources">';
    html += '<summary class="ai-sources-toggle">📚 Bronnen (' + unique.length + ')</summary>';
    html += '<div class="ai-sources-list">';
    unique.forEach(function(s){
      html += '<a class="ai-source-item" href="' + s.link + '" target="_blank" rel="noopener">';
      html += '<span class="ai-source-name">' + esc(s.source || "") + '</span>';
      html += '<span class="ai-source-title">' + esc(s.title || "?") + '</span>';
      html += '</a>';
    });
    html += '</div></details>';
    return html;
  }

  function renderMarkdown(text){
    var s = esc(text || "");
    s = s.replace(/```([\s\S]*?)```/g, '<code>$1</code>');
    s = s.replace(/^### (.+)$/gm, '<strong style="display:block;margin:.5rem 0 .25rem;color:var(--amber)">$1</strong>');
    s = s.replace(/^## (.+)$/gm, '<strong style="display:block;margin:.5rem 0 .25rem;color:var(--amber);font-size:1.05em">$1</strong>');
    s = s.replace(/^# (.+)$/gm, '<strong style="display:block;margin:.5rem 0 .25rem;color:var(--amber);font-size:1.1em">$1</strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/^\s*[-*]\s+(.+)$/gm, '<span style="display:block;padding-left:1rem;text-indent:-1rem">• $1</span>');
    s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function scrollToBottom(){
    var container = $("aiMessages");
    if (!container) return;
    setTimeout(function(){ container.scrollTop = container.scrollHeight; }, 50);
  }

  function bindSuggestions(){
    document.querySelectorAll(".ai-sugg").forEach(function(btn){
      btn.addEventListener("click", function(){
        var q = btn.getAttribute("data-q");
        if (q) sendMessage(q);
      });
    });
  }

  function bindMessageActions(){
    document.querySelectorAll(".ai-action-btn").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var action = btn.dataset.action;
        var idx = parseInt(btn.dataset.idx, 10);
        if (isNaN(idx)) return;
        if (action === "copy") copyMessage(idx, btn);
        else if (action === "regenerate") regenerateMessage(idx);
      });
    });
  }

  function copyMessage(idx, btn){
    var msg = AI.history[idx];
    if (!msg || !msg.text) return;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(msg.text).then(function(){
        if (window.showToast) window.showToast("Gekopieerd!");
        if (btn){
          var old = btn.textContent;
          btn.textContent = "✓";
          setTimeout(function(){ btn.textContent = old; }, 1200);
        }
      }).catch(function(){
        if (window.showToast) window.showToast("Kopiëren mislukt");
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = msg.text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); if (window.showToast) window.showToast("Gekopieerd!"); }catch(e){}
      document.body.removeChild(ta);
    }
  }

  function regenerateMessage(aiIdx){
    if (AI.sending) return;
    var userIdx = -1;
    for (var i = aiIdx - 1; i >= 0; i--){
      if (AI.history[i].role === "user"){ userIdx = i; break; }
    }
    if (userIdx < 0) return;
    var userText = AI.history[userIdx].text;
    AI.history = AI.history.slice(0, userIdx);
    renderMessages();
    setTimeout(function(){ sendMessage(userText); }, 50);
  }

  function saveHistory(){
    try {
      var toSave = AI.history.slice(-STORAGE_MAX_MSGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch(e){ LOG("Kon geschiedenis niet opslaan:", e.message); }
  }

  function loadHistory(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length){
        AI.history = parsed.slice(-STORAGE_MAX_MSGS);
        LOG("Geschiedenis hersteld:", AI.history.length, "berichten");
      }
    } catch(e){ LOG("Kon geschiedenis niet laden:", e.message); }
  }

  function clearHistoryStorage(){
    try { localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  /* ===== SSE STREAMING ===== */

  function extractTokenFromEvent(evt){
    if (evt == null) return null;
    if (typeof evt === "string") return evt;
    if (evt.token != null) return String(evt.token);
    if (evt.delta != null && typeof evt.delta === "string") return evt.delta;
    if (evt.text != null) return String(evt.text);
    if (evt.content != null) return String(evt.content);
    if (evt.choices && evt.choices[0]){
      var c = evt.choices[0];
      if (c.delta && c.delta.content != null) return String(c.delta.content);
      if (c.text != null) return String(c.text);
      if (c.message && c.message.content != null) return String(c.message.content);
    }
    return null;
  }

  function extractMetaFromEvent(evt){
    var meta = {};
    if (!evt || typeof evt !== "object") return meta;
    if (evt.provider) meta.provider = evt.provider;
    if (evt.model) meta.model = evt.model;
    if (evt.sources && Array.isArray(evt.sources)) meta.sources = evt.sources;
    return meta;
  }

  async function tryStreamingFetch(payload, onMeta){
    var controller = new AbortController();
    AI.abortController = controller;

    var timeoutId = setTimeout(function(){
      try { controller.abort(); } catch(e){}
    }, STREAM_TIMEOUT_MS);

    var r;
    try {
      r = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": AUTH_TOKEN,
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch(e){
      clearTimeout(timeoutId);
      throw e;
    }

    if (!r.ok){
      clearTimeout(timeoutId);
      var errText = await r.text().catch(function(){ return ""; });
      var friendly = "Worker HTTP " + r.status;
      try {
        var errData = JSON.parse(errText);
        if (errData.error) friendly = errData.error;
      } catch(e){}
      var httpErr = new Error(friendly);
      httpErr._httpStatus = r.status;
      throw httpErr;
    }

    var ct = (r.headers.get("content-type") || "").toLowerCase();

    if (ct.indexOf("text/event-stream") < 0 && ct.indexOf("application/x-ndjson") < 0) {
      clearTimeout(timeoutId);
      var data = await r.json();
      return { mode: "json", data: data };
    }

    var reader = r.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var fullText = "";

    try {
      while (true){
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        var lines = buffer.split("\n");
        buffer = lines.pop();

        for (var i = 0; i < lines.length; i++){
          var line = lines[i];
          if (!line) continue;
          if (line.charAt(0) === ":") continue;

          var trimmed = line.replace(/^\s+/, "");
          if (trimmed.indexOf("data:") !== 0) continue;
          var payloadStr = trimmed.slice(5).replace(/^\s+/, "");

          if (payloadStr === "[DONE]") {
            clearTimeout(timeoutId);
            return { mode: "stream", text: fullText };
          }

          var evt;
          try { evt = JSON.parse(payloadStr); }
          catch(e){ continue; }

          if (evt.error) {
            clearTimeout(timeoutId);
            throw new Error(evt.error);
          }

          var meta = extractMetaFromEvent(evt);
          if (Object.keys(meta).length && typeof onMeta === "function") onMeta(meta);

          var tok = extractTokenFromEvent(evt);
          if (tok != null && tok.length){
            fullText += tok;
            updateStreamingDom(fullText);
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return { mode: "stream", text: fullText };
  }

  /* ===== RETRY MET EXPONENTIËLE BACKOFF ===== */

  async function streamWithRetry(payload, onMeta){
    var lastError = null;

    for (var attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++){
      if (attempt > 0 && AI.streaming){
        AI.streaming.text = "";
        updateStreamingDom("");
      }

      try {
        var result = await tryStreamingFetch(payload, onMeta);
        if (attempt > 0){
          LOG("Retry geslaagd na " + attempt + " " + (attempt === 1 ? "poging" : "pogingen"));
        }
        return result;

      } catch(e){
        lastError = e;

        if (isAbortError(e)){
          LOG("Abort tijdens poging " + (attempt + 1) + " — stop retry");
          throw e;
        }
        if (hasReceivedTokens()){
          LOG("Stream brak na tokens — partial bewaard, geen retry");
          throw e;
        }
        if (isNonRetryableError(e)){
          LOG("Niet-retryable fout: " + e.message);
          throw e;
        }
        if (attempt >= RETRY_MAX_ATTEMPTS - 1){
          LOG("Alle " + RETRY_MAX_ATTEMPTS + " pogingen faalden");
          throw e;
        }

        var baseDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        var jitter = baseDelay * RETRY_JITTER_RATIO * (Math.random() * 2 - 1);
        var totalDelay = Math.max(500, Math.round(baseDelay + jitter));

        LOG("Poging " + (attempt + 1) + "/" + RETRY_MAX_ATTEMPTS +
            " faalde (" + (e.message || "onbekend") + ") — retry in " + totalDelay + "ms");

        await sleep(totalDelay);
      }
    }

    throw lastError || new Error("Onbekende fout");
  }

  /* ============================================================
     v1.17: CACHE WARMING
     ============================================================ */

  function scheduleWarmup(){
    if (warmupState.scheduled) return;
    warmupState.scheduled = true;

    if (!navigator.onLine){
      LOG("Warmup overgeslagen: offline");
      warmupState.aborted = true;
      return;
    }
    if (AI.history.length > 0){
      LOG("Warmup overgeslagen: geschiedenis bestaat al (" + AI.history.length + ")");
      warmupState.aborted = true;
      return;
    }

    LOG("Warmup gepland over " + WARMUP_START_DELAY_MS + "ms");

    setTimeout(function(){
      if (warmupState.aborted){
        LOG("Warmup geannuleerd (gebruiker was eerder)");
        return;
      }
      if (AI.sending){
        LOG("Warmup uitgesteld: AI bezig");
        return;
      }
      if (AI.history.length > 0){
        LOG("Warmup overgeslagen: geschiedenis verscheen");
        return;
      }
      startWarmup();
    }, WARMUP_START_DELAY_MS);
  }

  function startWarmup(){
    if (warmupState.started || warmupState.aborted) return;
    warmupState.started = true;
    LOG("Warmup gestart (" + WARMUP_QUESTIONS.length + " vragen)");

    var idx = 0;

    function next(){
      if (warmupState.aborted){
        LOG("Warmup afgebroken na " + warmupState.completed.length + "/" + WARMUP_QUESTIONS.length);
        return;
      }
      if (AI.sending){
        LOG("Warmup gestopt: AI is bezig");
        warmupState.aborted = true;
        return;
      }
      if (AI.history.length > 0){
        LOG("Warmup gestopt: gebruiker heeft geschiedenis");
        warmupState.aborted = true;
        return;
      }
      if (idx >= WARMUP_QUESTIONS.length){
        LOG("Warmup klaar: " + warmupState.completed.length + "/" + WARMUP_QUESTIONS.length + " gecached");
        return;
      }

      var q = WARMUP_QUESTIONS[idx++];
      var cacheKey = hashMessage(q);

      if (responseCache[cacheKey] && (Date.now() - responseCache[cacheKey].t) < CACHE_MAX_AGE){
        LOG("Warmup skip (al gecached): " + q.slice(0, 45));
        warmupState.completed.push(q);
        setTimeout(next, 300);
        return;
      }

      warmupFetch(q).then(function(ok){
        if (ok) warmupState.completed.push(q);
        setTimeout(next, WARMUP_BETWEEN_DELAY_MS);
      });
    }

    setTimeout(next, 200);
  }

  async function warmupFetch(question){
    try {
      var militaryCtx = null;
      try { militaryCtx = buildMilitaryContext(question); } catch(e){}
      var articleLimit = (militaryCtx && militaryCtx.events.length > 0) ? MAX_ARTICLES_MILITARY : MAX_ARTICLES;
      var articles = buildArticleContext(question, articleLimit);

      var payload = {
        message: question,
        articles: articles,
        history: [],
        clientDate: new Date().toISOString(),
        stream: true
      };
      if (militaryCtx && militaryCtx.events.length){
        payload.militaryEvents = militaryCtx.events;
        payload.militaryFocus = militaryCtx.intent.country || null;
        payload.militarySubtype = (militaryCtx.intent.subtype && militaryCtx.intent.subtype !== "actief") ? militaryCtx.intent.subtype : null;
      }

      var controller = new AbortController();
      warmupState.currentAbort = controller;

      var timeoutId = setTimeout(function(){
        try { controller.abort(); } catch(e){}
      }, WARMUP_TIMEOUT_MS);

      var r = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": AUTH_TOKEN,
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!r.ok){
        clearTimeout(timeoutId);
        warmupState.currentAbort = null;
        LOG("Warmup HTTP " + r.status + " voor: " + question.slice(0, 30));
        return false;
      }

      var ct = (r.headers.get("content-type") || "").toLowerCase();
      var fullText = "";
      var provider = "";
      var model = "";

      if (ct.indexOf("text/event-stream") < 0 && ct.indexOf("application/x-ndjson") < 0){
        var data = await r.json();
        clearTimeout(timeoutId);
        warmupState.currentAbort = null;
        if (data.error) return false;
        fullText = data.response || "";
        provider = data.provider || "";
        model = data.model || "";
      } else {
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        while (true){
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split("\n");
          buffer = lines.pop();

          for (var i = 0; i < lines.length; i++){
            var line = lines[i];
            if (!line || line.charAt(0) === ":") continue;
            var trimmed = line.replace(/^\s+/, "");
            if (trimmed.indexOf("data:") !== 0) continue;
            var payloadStr = trimmed.slice(5).replace(/^\s+/, "");
            if (payloadStr === "[DONE]") continue;

            var evt;
            try { evt = JSON.parse(payloadStr); } catch(e){ continue; }
            if (evt.error) continue;
            if (evt.provider) provider = evt.provider;
            if (evt.model) model = evt.model;
            var tok = extractTokenFromEvent(evt);
            if (tok) fullText += tok;
          }
        }

        clearTimeout(timeoutId);
        warmupState.currentAbort = null;
      }

      if (!fullText || !fullText.trim()){
        LOG("Warmup leeg antwoord voor: " + question.slice(0, 30));
        return false;
      }

      responseCache[hashMessage(question)] = {
        text: fullText.trim(),
        sources: articles.slice(0, 5).map(function(a){
          return { title: a.title, link: a.link, source: a.source };
        }),
        provider: provider || "",
        t: Date.now()
      };
      cleanupCache();
      saveCache();

      LOG("Warmup OK: " + question.slice(0, 40) + " (" + fullText.length + " chars, " + (provider || "?") + ")");
      return true;

    } catch(e){
      warmupState.currentAbort = null;
      if (isAbortError(e)){
        LOG("Warmup abort: " + question.slice(0, 30));
      } else {
        LOG("Warmup faalde: " + question.slice(0, 30) + " — " + (e.message || "onbekend"));
      }
      return false;
    }
  }

  function abortWarmup(){
    if (warmupState.aborted) return;
    warmupState.aborted = true;

    if (warmupState.currentAbort){
      try { warmupState.currentAbort.abort(); } catch(e){}
    }
    if (warmupState.started){
      LOG("Warmup geannuleerd (" + warmupState.completed.length + " waren al klaar)");
    }
  }

  /* ===== SEND ===== */

  async function sendMessage(text){
    if (AI.sending) return;
    if (!text || !text.trim()) return;

    /* v1.17: Als gebruiker iets stuurt, stop warmup */
    abortWarmup();

    var now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL){
      var wait = Math.ceil((MIN_REQUEST_INTERVAL - (now - lastRequestTime)) / 1000);
      if (window.showToast) window.showToast("Even wachten (" + wait + "s)");
      return;
    }
    lastRequestTime = now;

    var message = text.trim();
    AI.history.push({ role: "user", text: message });
    if (AI.history.length > 80) AI.history = AI.history.slice(-80);
    saveHistory();

    AI.sending = true;
    AI.streaming = { text: "", sources: [], provider: "", model: "" };
    renderMessages();

    var input = $("aiInput");
    if (input){ input.value = ""; input.style.height = "auto"; }

    var cacheKey = hashMessage(message);
    var cached = responseCache[cacheKey];

    try {
      if (cached && (Date.now() - cached.t) < CACHE_MAX_AGE){
        LOG("Cache hit voor query: " + message.slice(0, 40));
        AI.streaming.text = cached.text;
        updateStreamingDom(cached.text);
        await sleep(200);
        AI.history.push({
          role: "ai",
          text: cached.text,
          sources: cached.sources,
          provider: (cached.provider || "") + " (cache)"
        });
        if (AI.history.length > 80) AI.history = AI.history.slice(-80);
        saveHistory();
        return;
      }

      var militaryCtx = null;
      try { militaryCtx = buildMilitaryContext(message); } catch(e){ LOG("buildMilitaryContext fout:", e.message); }

      var articleLimit = (militaryCtx && militaryCtx.events.length > 0) ? MAX_ARTICLES_MILITARY : MAX_ARTICLES;
      var articles = buildArticleContext(message, articleLimit);

      LOG("Verstuur met", articles.length, "artikelen" +
        (militaryCtx && militaryCtx.events.length ? " + " + militaryCtx.events.length + " militaire events" : "") +
        " (streaming)");

      var payload = {
        message: message,
        articles: articles,
        history: AI.history.slice(-6),
        clientDate: new Date().toISOString(),
        stream: true
      };

      if (militaryCtx && militaryCtx.events.length) {
        payload.militaryEvents = militaryCtx.events;
        payload.militaryFocus = militaryCtx.intent.country || null;
        payload.militarySubtype = (militaryCtx.intent.subtype && militaryCtx.intent.subtype !== "actief") ? militaryCtx.intent.subtype : null;
      }

      var onMeta = function(meta){
        if (!AI.streaming) return;
        if (meta.provider) AI.streaming.provider = meta.provider;
        if (meta.model) AI.streaming.model = meta.model;
      };

      var result = await streamWithRetry(payload, onMeta);

      if (result.mode === "json"){
        LOG("Worker streamt niet — JSON fallback");
        var data = result.data;
        if (data.error) throw new Error(data.error);
        var responseText = data.response || "(geen antwoord)";
        AI.streaming.text = responseText;
        updateStreamingDom(responseText);
        await sleep(150);
        AI.streaming.provider = data.provider || "";
        AI.streaming.model = data.model || "";
        result.text = responseText;
      }

      var finalText = result.text || AI.streaming.text || "(geen antwoord)";
      var sources = (AI.streaming.sources && AI.streaming.sources.length)
        ? AI.streaming.sources
        : articles.slice(0, 5).map(function(a){
            return { title: a.title, link: a.link, source: a.source };
          });

      AI.history.push({
        role: "ai",
        text: finalText,
        sources: sources,
        provider: AI.streaming.provider || "",
        model: AI.streaming.model || ""
      });
      if (AI.history.length > 80) AI.history = AI.history.slice(-80);
      saveHistory();

      responseCache[cacheKey] = {
        text: finalText,
        sources: sources,
        provider: AI.streaming.provider || "",
        t: Date.now()
      };
      cleanupCache();
      saveCache();

      LOG("Stream afgerond via", AI.streaming.provider || "?", "/", AI.streaming.model || "?");

    } catch(e){
      var isAbort = isAbortError(e);

      if (isAbort){
        LOG("Stream gestopt door gebruiker");
        var partial = AI.streaming && AI.streaming.text ? AI.streaming.text : "";
        if (partial.length){
          AI.history.push({
            role: "ai",
            text: partial + "\n\n_(gestopt)_",
            sources: [],
            provider: "local-partial"
          });
        } else {
          AI.history.push({
            role: "ai",
            text: "_(gestopt)_",
            error: false
          });
        }
        saveHistory();
        if (window.showToast) window.showToast("Gestopt");
      } else {
        LOG("Stream faalde:", e.message);

        var fallback = null;
        try { fallback = buildLocalMilitaryFallback(message); } catch(err){ LOG("Fallback fout:", err.message); }

        if (fallback){
          LOG("Fallback: lokaal militaire antwoord");
          AI.streaming.text = fallback.text;
          updateStreamingDom(fallback.text);
          await sleep(150);
          AI.history.push({
            role: "ai",
            text: fallback.text,
            sources: fallback.sources || [],
            provider: "local-military"
          });
        } else if (AI.streaming && AI.streaming.text){
          AI.history.push({
            role: "ai",
            text: AI.streaming.text + "\n\n_(onvolledig — verbinding verbroken)_",
            sources: [],
            provider: "local-partial"
          });
        } else {
          AI.history.push({
            role: "ai",
            text: "⚠️ " + (e.message || "Er is een fout opgetreden.") + "\n\nProbeer het over 30 seconden opnieuw.",
            error: true
          });
        }
        saveHistory();
      }
    } finally {
      AI.sending = false;
      AI.streaming = null;
      AI.abortController = null;
      renderMessages();
    }
  }

  function stopStreaming(){
    if (AI.abortController){
      try { AI.abortController.abort(); } catch(e){}
    }
  }

  function clearChat(){
    if (!AI.history.length) return;
    if (!confirm("Gesprek wissen?")) return;
    AI.history = [];
    clearHistoryStorage();
    renderMessages();
  }

  function bindUI(){
    var input = $("aiInput");
    var sendBtn = $("aiSendBtn");
    var clearBtn = $("aiClearBtn");

    if (sendBtn){
      sendBtn.addEventListener("click", function(){
        if (AI.sending){
          stopStreaming();
          return;
        }
        sendMessage(input ? input.value : "");
      });
    }

    if (input){
      input.addEventListener("keydown", function(e){
        if (e.key === "Enter" && !e.shiftKey){
          e.preventDefault();
          if (AI.sending) return;
          sendMessage(input.value);
        }
      });
      input.addEventListener("input", function(){
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 100) + "px";
      });
    }

    if (clearBtn) clearBtn.addEventListener("click", clearChat);
  }

  function init(){
    if (AI.initialized) return;
    AI.initialized = true;
    LOG("init");
    loadHistory();
    loadCache();
    bindUI();
    renderMessages();
    getMilitaryCountries();

    /* v1.17: Plan warmup */
    scheduleWarmup();
  }

  window.AIAPI = {
    init: init,
    send: sendMessage,
    stop: stopStreaming,
    clear: clearChat,
    warmup: startWarmup,
    abortWarmup: abortWarmup,
    state: AI,
    _warmupState: warmupState,
    _extractKeywords: extractKeywords,
    _buildArticleContext: buildArticleContext,
    _buildMilitaryContext: buildMilitaryContext,
    _hashMessage: hashMessage
  };

  function setupWatcher(){
    var aiView = document.getElementById("viewAi");
    if (!aiView) return;

    if (!aiView.hidden && getComputedStyle(aiView).display !== "none"){
      init();
    }

    document.querySelectorAll(".bottom-tabs .tab").forEach(function(tab){
      tab.addEventListener("click", function(){
        if (tab.dataset.view === "ai"){
          setTimeout(function(){
            if (!AI.initialized) init();
          }, 200);
        }
      });
    });
  }

  if (document.readyState !== "loading"){
    setTimeout(setupWatcher, 500);
  } else {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(setupWatcher, 500);
    });
  }

  wdLog.info("[WAR DESK] ai-chat.js v1.17 geladen (cache warming)");
})();