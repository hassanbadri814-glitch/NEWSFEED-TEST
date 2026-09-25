/* ============================================================
   WAR DESK v1.10 — AI Chat Module
   - v1.10: betere error-handling (toon exacte worker-fout + attempts)
   - v1.9: Militaire vragen → worker MET militaire context
   - v1.8: Lokale militaire fallback
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ wdLog.info.apply(null, ["[AI]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.10 geladen");

  var WORKER_URL = "https://newsfeed2.hassanbadri814.workers.dev/ai";
  var MAX_ARTICLES = 8;
  var MAX_MILITARY = 30;
  var CLIENT_RETRIES = 1;
  var STORAGE_KEY = "wardesk_ai_history_v1";
  var STORAGE_MAX_MSGS = 40;

  var AI = {
    initialized: false,
    sending: false,
    history: []
  };

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  var STOPWORDS = {
    "de":1,"het":1,"een":1,"en":1,"of":1,"maar":1,"dus":1,"want":1,"omdat":1,
    "als":1,"dan":1,"ook":1,"nog":1,"al":1,"wel":1,"niet":1,"geen":1,
    "wat":1,"wie":1,"waar":1,"wanneer":1,"waarom":1,"hoe":1,"welke":1,
    "is":1,"was":1,"zijn":1,"wordt":1,"worden":1,"kan":1,"kunnen":1,"zal":1,
    "heeft":1,"hebben":1,"had":1,"hadden":1,"doet":1,"doen":1,"deed":1,
    "er":1,"daar":1,"hier":1,"dit":1,"dat":1,"deze":1,"die":1,
    "ik":1,"jij":1,"je":1,"hij":1,"zij":1,"ze":1,"wij":1,"we":1,"jullie":1,
    "mij":1,"mijn":1,"jouw":1,"uw":1,"ons":1,"onze":1,
    "in":1,"op":1,"aan":1,"bij":1,"van":1,"voor":1,"met":1,"naar":1,"uit":1,
    "over":1,"onder":1,"tussen":1,"tegen":1,"zonder":1,"tijdens":1,"na":1,
    "the":1,"a":1,"an":1,"is":1,"are":1,"was":1,"were":1,"and":1,"or":1,"but":1,
    "what":1,"who":1,"where":1,"when":1,"why":1,"how":1,"which":1,
    "this":1,"that":1,"these":1,"those":1,"i":1,"you":1,"he":1,"she":1,"we":1,"they":1
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

  function buildArticleContext(userQuestion){
    try {
      if (!window.State || !State.items || !State.items.length) return [];
      var keywords = extractKeywords(userQuestion);
      var scored = State.items.map(function(it){
        return { item: it, relevance: scoreArticleForQuery(it, keywords) };
      });
      scored.sort(function(a, b){ return b.relevance - a.relevance; });
      var sourceCount = {};
      var selected = [];
      for (var i = 0; i < scored.length && selected.length < MAX_ARTICLES; i++){
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

  /* ============================================================
     MILITARY INTENT DETECTION
     ============================================================ */
  var MILITARY_INTENT_KEYWORDS = {
    "militair": 1, "militaire": 1, "leger": 1, "troepen": 1, "strijdkrachten": 1,
    "oorlog": 1, "conflict": 1, "gevecht": 1, "gevechten": 1, "strijd": 1,
    "aanval": 1, "aanvallen": 1, "raketaanval": 1, "bombardement": 1,
    "aanslag": 1, "offensief": 1, "defensief": 1, "voortgang": 1,
    "drone": 1, "raket": 1, "raketten": 1, "luchtafweer": 1, "interceptie": 1,
    "hotspot": 1, "hotspots": 1, "frontlinie": 1, "escalatie": 1
  };

  var MILITARY_COUNTRIES = {
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

  var SUBTYPE_TRIGGERS = {
    "aanval":     ["aanval", "aanvallen", "raketaanval", "bombardement", "aanslag", "luchtaanval", "drone-aanval"],
    "offensief":  ["offensief", "invasie", "opmars", "tegenoffensief"],
    "defensief":  ["defensief", "luchtafweer", "onderschept", "interceptie", "verdediging"],
    "voortgang":  ["voortgang", "veroverd", "heroverd", "frontlinie"],
    "actief":     ["actief", "oorlog", "conflict", "gevecht", "gevechten"]
  };

  function detectMilitaryIntent(question){
    var q = String(question || "").toLowerCase();
    var country = null;
    for (var key in MILITARY_COUNTRIES) {
      if (q.indexOf(key) !== -1) { country = MILITARY_COUNTRIES[key]; break; }
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
      if (window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)) {
        return window.MAPAPI.state.events.filter(function(e){ return e && e.isMilitary; });
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

  /* ============================================================
     LOKALE FALLBACK
     ============================================================ */
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

  /* ============================================================
     Rendering
     ============================================================ */
  function renderMessages(){
    var container = $("aiMessages");
    if (!container) return;

    if (!AI.history.length){
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

    if (AI.sending){
      html += '<div class="ai-msg ai-msg-ai ai-msg-loading">';
      html += '<div class="ai-msg-label">AI</div>';
      html += '<div class="ai-typing"><span></span><span></span><span></span></div>';
      html += '</div>';
    }

    container.innerHTML = html;
    bindMessageActions();
    scrollToBottom();
  }

  function renderSources(sources){
    var seen = {};
    var unique = [];
    sources.forEach(function(s){
      if (!s.link || seen[s.link]) return;
      seen[s.link] = 1;
      unique.push(s);
    });
    if (!unique.length) return "";
    var html = '<details class="ai-sources">';
    html += '<summary class="ai-sources-toggle">📚 Bronnen (' + unique.length + ')</summary>';
    html += '<div class="ai-sources-list">';
    unique.forEach(function(s){
      var title = s.title || "?";
      var source = s.source || "";
      var link = s.link || "";
      if (link){
        html += '<a class="ai-source-item" href="' + esc(link) + '" target="_blank" rel="noopener">';
      } else {
        html += '<div class="ai-source-item">';
      }
      html += '<span class="ai-source-name">' + esc(source) + '</span>';
      html += '<span class="ai-source-title">' + esc(title) + '</span>';
      html += (link ? '</a>' : '</div>');
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

  async function fetchWithRetry(url, options){
    for (var i = 0; i < CLIENT_RETRIES; i++){
      try {
        var r = await fetch(url, options);
        return r;
      } catch(e){
        LOG("Fetch fout:", e.message);
        if (i < CLIENT_RETRIES - 1){
          await new Promise(function(res){ setTimeout(res, 2000); });
          continue;
        }
        throw e;
      }
    }
  }

  async function sendMessage(text){
    if (AI.sending) return;
    if (!text || !text.trim()) return;

    var message = text.trim();
    AI.history.push({ role: "user", text: message });
    if (AI.history.length > 80) AI.history = AI.history.slice(-80);
    saveHistory();

    AI.sending = true;
    renderMessages();

    var input = $("aiInput");
    if (input){ input.value = ""; input.style.height = "auto"; }
    var sendBtn = $("aiSendBtn");
    if (sendBtn) sendBtn.disabled = true;

    try {
      var militaryCtx = null;
      try { militaryCtx = buildMilitaryContext(message); } catch(e){ LOG("buildMilitaryContext fout:", e.message); }

      var articles = buildArticleContext(message);
      LOG("Verstuur met", articles.length, "artikelen" + (militaryCtx && militaryCtx.events.length ? " + " + militaryCtx.events.length + " militaire events" : ""));

      var payload = {
        message: message,
        articles: articles,
        history: AI.history.slice(-6),
        clientDate: new Date().toISOString()
      };

      if (militaryCtx && militaryCtx.events.length) {
        payload.militaryEvents = militaryCtx.events;
        payload.militaryFocus = militaryCtx.intent.country || null;
        payload.militarySubtype = (militaryCtx.intent.subtype && militaryCtx.intent.subtype !== "actief") ? militaryCtx.intent.subtype : null;
      }

      var r = await fetchWithRetry(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // v1.10: betere error-handling
      if (!r.ok){
        var errText = await r.text();
        var friendly = "Worker HTTP " + r.status;
        try {
          var errData = JSON.parse(errText);
          if (errData.error) friendly = errData.error;
          if (errData.attempts && errData.attempts.length) {
            friendly += " | " + errData.attempts.join(" | ");
          }
        } catch(e) {
          friendly += " — " + errText.slice(0, 200);
        }
        throw new Error(friendly);
      }

      var data = await r.json();
      if (data.error) throw new Error(data.error);

      var responseText = data.response || "(geen antwoord)";
      var sources = articles.slice(0, 5).map(function(a){
        return { title: a.title, link: a.link, source: a.source };
      });

      AI.history.push({
        role: "ai",
        text: responseText,
        sources: sources,
        provider: data.provider || "",
        model: data.model || ""
      });
      if (AI.history.length > 80) AI.history = AI.history.slice(-80);
      saveHistory();
      LOG("Antwoord via", data.provider || "?", "/", data.model || "?");

    } catch(e) {
      LOG("Worker faalde:", e.message);

      var fallback = null;
      try { fallback = buildLocalMilitaryFallback(message); } catch(err){ LOG("Fallback fout:", err.message); }

      if (fallback) {
        LOG("Fallback: lokaal militaire antwoord");
        AI.history.push({
          role: "ai",
          text: fallback.text,
          sources: fallback.sources || [],
          provider: "local-military"
        });
      } else {
        AI.history.push({
          role: "ai",
          text: "⚠️ " + (e.message || "Er is een fout opgetreden.") + "\n\nProbeer het over 30 seconden opnieuw.",
          error: true
        });
      }
      saveHistory();
    } finally {
      AI.sending = false;
      if (sendBtn) sendBtn.disabled = false;
      renderMessages();
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
        sendMessage(input ? input.value : "");
      });
    }

    if (input){
      input.addEventListener("keydown", function(e){
        if (e.key === "Enter" && !e.shiftKey){
          e.preventDefault();
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
    bindUI();
    renderMessages();
  }

  window.AIAPI = {
    init: init,
    send: sendMessage,
    clear: clearChat,
    state: AI,
    _extractKeywords: extractKeywords,
    _buildArticleContext: buildArticleContext,
    _buildMilitaryContext: buildMilitaryContext
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

  wdLog.info("[WAR DESK] ai-chat.js v1.10 geladen");
})();