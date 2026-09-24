/* ============================================================
   WAR DESK v1.3 — AI Chat Module
   - v1.2 basis (slimme selectie, markdown, retry)
   - v1.3: Geschiedenis opslaan (localStorage)
           Bronlinks tonen per AI-antwoord
           Kopieer + Opnieuw knoppen
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ wdLog.info.apply(null, ["[AI]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.3 geladen");

  var WORKER_URL = "https://newsfeed2.hassanbadri814.workers.dev/ai";
  var MAX_ARTICLES = 10;
  var CLIENT_RETRIES = 2;
  var STORAGE_KEY = "wardesk_ai_history_v1";
  var STORAGE_MAX_MSGS = 40;

  var AI = {
    initialized: false,
    sending: false,
    history: []
  };

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

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  /* ============================================================
     Geschiedenis opslaan / laden
     ============================================================ */
  function saveHistory(){
    try {
      var toSave = AI.history.slice(-STORAGE_MAX_MSGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch(e){
      LOG("Kon geschiedenis niet opslaan:", e.message);
    }
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
    } catch(e){
      LOG("Kon geschiedenis niet laden:", e.message);
    }
  }

  function clearHistoryStorage(){
    try { localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  /* ============================================================
     Artikel-selectie
     ============================================================ */
  function extractKeywords(text){
    if (!text) return [];
    var words = String(text).toLowerCase()
      .replace(/[^\w\sàáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/gi, " ")
      .split(/\s+/)
      .filter(function(w){ return w.length >= 3 && !STOPWORDS[w]; });
    var seen = {}, out = [];
    words.forEach(function(w){
      if (!seen[w]){ seen[w] = 1; out.push(w); }
    });
    return out;
  }

  function scoreArticleForQuery(article, keywords){
    if (!keywords.length) return article._score || 0;
    var title = (article.title || "").toLowerCase();
    var desc = (article.desc || "").toLowerCase();
    var cat = (article.cat || "").toLowerCase();
    var score = 0;
    keywords.forEach(function(kw){
      if (title.indexOf(kw) >= 0) score += 15;
      if (desc.indexOf(kw) >= 0) score += 5;
      if (cat.indexOf(kw) >= 0) score += 8;
    });
    score += Math.min(article._score || 0, 50) * 0.3;
    return score;
  }

  function buildArticleContext(userQuestion){
    try {
      if (!window.State || !State.items || !State.items.length) return [];
      var keywords = extractKeywords(userQuestion);
      LOG("Keywords:", keywords.slice(0, 8).join(", "));
      var scored = State.items.map(function(it){
        return { item: it, relevance: scoreArticleForQuery(it, keywords) };
      });
      scored.sort(function(a, b){ return b.relevance - a.relevance; });
      var selected = scored.slice(0, MAX_ARTICLES).map(function(s){ return s.item; });
      return selected.map(function(it){
        return {
          title: it.title || "",
          desc: (it.desc || "").slice(0, 600),
          source: it.source || "",
          cat: it.cat || "",
          date: it.date || "",
          link: it.link || ""
        };
      });
    } catch(e){
      LOG("buildArticleContext fout:", e.message);
      return [];
    }
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
          '<div class="ai-welcome-text">Stel een vraag over het nieuws, of vraag om uitleg over een onderwerp.</div>' +
          '<div class="ai-suggestions">' +
            '<button class="ai-sugg" data-q="Wat is het belangrijkste nieuws vandaag?">Belangrijkste nieuws vandaag</button>' +
            '<button class="ai-sugg" data-q="Vat het nieuws over het Midden-Oosten samen">Midden-Oosten samenvatting</button>' +
            '<button class="ai-sugg" data-q="Wat gebeurt er in Nederland?">Nederland vandaag</button>' +
            '<button class="ai-sugg" data-q="Wat is de Straat van Hormuz en waarom is het belangrijk?">Wat is de Straat van Hormuz?</button>' +
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
      var roleLabel = msg.role === "user" ? "Jij" : "AI";
      html += '<div class="ai-msg ' + roleClass + '" data-idx="' + idx + '">';
      html += '<div class="ai-msg-label">' + roleLabel + '</div>';
      html += '<div class="ai-msg-text">' + renderMarkdown(msg.text) + '</div>';

      // Bronnen (alleen voor AI-antwoorden die niet error zijn)
      if (msg.role === "ai" && msg.sources && msg.sources.length){
        html += renderSources(msg.sources);
      }

      // Actieknoppen (alleen voor AI-antwoorden)
      if (msg.role === "ai" && !msg.error){
        html += '<div class="ai-msg-actions">';
        html += '<button class="ai-action-btn" data-action="copy" data-idx="' + idx + '" title="Kopieer">📋</button>';
        if (idx === lastAiIndex && !AI.sending){
          html += '<button class="ai-action-btn" data-action="regenerate" data-idx="' + idx + '" title="Opnieuw genereren">🔄</button>';
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
    // Verwijder dubbele (zelfde link)
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
    html += '</div>';
    html += '</details>';
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
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function scrollToBottom(){
    var container = $("aiMessages");
    if (!container) return;
    setTimeout(function(){
      container.scrollTop = container.scrollHeight;
    }, 50);
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

  /* ============================================================
     Copy + Regenerate
     ============================================================ */
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
      // Fallback voor oudere browsers
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
    // Zoek de user message vóór deze AI message
    var userIdx = -1;
    for (var i = aiIdx - 1; i >= 0; i--){
      if (AI.history[i].role === "user"){ userIdx = i; break; }
    }
    if (userIdx < 0) return;

    var userText = AI.history[userIdx].text;
    // Verwijder alles vanaf de user message (inclusief oude AI antwoord)
    AI.history = AI.history.slice(0, userIdx);
    renderMessages();

    // Verstuur opnieuw (sendMessage voegt user + AI opnieuw toe)
    setTimeout(function(){ sendMessage(userText); }, 50);
  }

  /* ============================================================
     Fetch met retry
     ============================================================ */
  async function fetchWithRetry(url, options){
    var lastStatus = 0;
    var lastText = "";
    for (var i = 0; i < CLIENT_RETRIES; i++){
      try {
        var r = await fetch(url, options);
        if (r.ok) return r;
        lastStatus = r.status;
        lastText = await r.text();
        if ((r.status === 502 || r.status === 503 || r.status === 429) && i < CLIENT_RETRIES - 1){
          var wait = 2500 * (i + 1);
          LOG("Poging " + (i+1) + " faalde (" + r.status + "), opnieuw in " + wait + "ms");
          await new Promise(function(res){ setTimeout(res, wait); });
          continue;
        }
        return new Response(lastText, { status: lastStatus });
      } catch(e){
        LOG("Fetch fout (poging " + (i+1) + "):", e.message);
        if (i < CLIENT_RETRIES - 1){
          await new Promise(function(res){ setTimeout(res, 2500 * (i + 1)); });
          continue;
        }
        throw e;
      }
    }
    return new Response(lastText, { status: lastStatus });
  }

  /* ============================================================
     Bericht sturen
     ============================================================ */
  async function sendMessage(text){
    if (AI.sending) return;
    if (!text || !text.trim()) return;

    var message = text.trim();
    AI.history.push({ role: "user", text: message });
    if (AI.history.length > 80){
      AI.history = AI.history.slice(-80);
    }
    saveHistory();

    AI.sending = true;
    renderMessages();

    var input = $("aiInput");
    if (input){
      input.value = "";
      input.style.height = "auto";
    }
    var sendBtn = $("aiSendBtn");
    if (sendBtn) sendBtn.disabled = true;

    try {
      var articles = buildArticleContext(message);
      LOG("Verstuur met", articles.length, "artikelen");

      var r = await fetchWithRetry(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          articles: articles,
          history: AI.history.slice(-6),
          clientDate: new Date().toISOString()
        })
      });

      if (!r.ok){
        var errText = await r.text();
        var friendly = "Er ging iets mis bij de AI.";
        try {
          var errData = JSON.parse(errText);
          if (errData.error) friendly = errData.error;
        } catch(e){}
        throw new Error(friendly);
      }

      var data = await r.json();
      if (data.error) throw new Error(data.error);

      var responseText = data.response || "(geen antwoord)";

      // Bewaar top 5 bronnen die relevant zijn
      var sources = articles.slice(0, 5).map(function(a){
        return {
          title: a.title,
          link: a.link,
          source: a.source
        };
      });

      AI.history.push({
        role: "ai",
        text: responseText,
        sources: sources,
        provider: data.provider || "",
        model: data.model || ""
      });

      if (AI.history.length > 80){
        AI.history = AI.history.slice(-80);
      }
      saveHistory();
      LOG("Antwoord via", data.provider || "?", "/", data.model || "?");

    } catch(e) {
      LOG("Fout:", e.message);
      AI.history.push({
        role: "ai",
        text: "⚠️ " + (e.message || "Er is een fout opgetreden.") + "\n\nProbeer het over 30 seconden opnieuw.",
        error: true
      });
      saveHistory();
    } finally {
      AI.sending = false;
      if (sendBtn) sendBtn.disabled = false;
      renderMessages();
    }
  }

  /* ============================================================
     Wissen
     ============================================================ */
  function clearChat(){
    if (!AI.history.length) return;
    if (!confirm("Gesprek wissen?")) return;
    AI.history = [];
    clearHistoryStorage();
    renderMessages();
  }

  /* ============================================================
     UI
     ============================================================ */
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

    if (clearBtn){
      clearBtn.addEventListener("click", clearChat);
    }
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
    state: AI
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

  wdLog.info("[WAR DESK] ai-chat.js v1.3 geladen");
})();