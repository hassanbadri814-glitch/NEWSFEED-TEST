/* ============================================================
   WAR DESK v1.2 — AI Chat Module
   - v1.1 basis (slimme artikel-selectie, markdown)
   - v1.2: Client-side retry + betere foutmeldingen
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ wdLog.info.apply(null, ["[AI]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.2 geladen");

  var WORKER_URL = "https://newsfeed2.hassanbadri814.workers.dev/ai";
  var MAX_ARTICLES = 10;
  var CLIENT_RETRIES = 2;

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

  function extractKeywords(text){
    if (!text) return [];
    var words = String(text).toLowerCase()
      .replace(/[^\w\sàáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/gi, " ")
      .split(/\s+/)
      .filter(function(w){
        return w.length >= 3 && !STOPWORDS[w];
      });
    var seen = {};
    var out = [];
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
        return {
          item: it,
          relevance: scoreArticleForQuery(it, keywords)
        };
      });

      scored.sort(function(a, b){
        return b.relevance - a.relevance;
      });

      var selected = scored.slice(0, MAX_ARTICLES).map(function(s){
        return s.item;
      });

      return selected.map(function(it){
        return {
          title: it.title || "",
          desc: (it.desc || "").slice(0, 600),
          source: it.source || "",
          cat: it.cat || "",
          date: it.date || ""
        };
      });
    } catch(e){
      LOG("buildArticleContext fout:", e.message);
      return [];
    }
  }

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
    AI.history.forEach(function(msg){
      var roleClass = msg.role === "user" ? "ai-msg-user" : "ai-msg-ai";
      var roleLabel = msg.role === "user" ? "Jij" : "AI";
      html += '<div class="ai-msg ' + roleClass + '">';
      html += '<div class="ai-msg-label">' + roleLabel + '</div>';
      html += '<div class="ai-msg-text">' + renderMarkdown(msg.text) + '</div>';
      html += '</div>';
    });

    if (AI.sending){
      html += '<div class="ai-msg ai-msg-ai ai-msg-loading">';
      html += '<div class="ai-msg-label">AI</div>';
      html += '<div class="ai-typing"><span></span><span></span><span></span></div>';
      html += '</div>';
    }

    container.innerHTML = html;
    scrollToBottom();
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

  /* Client-side fetch met retry */
  async function fetchWithRetry(url, options){
    var lastStatus = 0;
    var lastText = "";

    for (var i = 0; i < CLIENT_RETRIES; i++){
      try {
        var r = await fetch(url, options);

        // Succes
        if (r.ok) return r;

        lastStatus = r.status;
        lastText = await r.text();

        // 502/503/429 = tijdelijk → wacht en probeer opnieuw
        if ((r.status === 502 || r.status === 503 || r.status === 429) && i < CLIENT_RETRIES - 1){
          var wait = 2500 * (i + 1);
          LOG("Poging " + (i+1) + " faalde (" + r.status + "), opnieuw in " + wait + "ms");
          await new Promise(function(res){ setTimeout(res, wait); });
          continue;
        }

        // Andere fout → stop
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

  async function sendMessage(text){
    if (AI.sending) return;
    if (!text || !text.trim()) return;

    var message = text.trim();
    AI.history.push({ role: "user", text: message });

    if (AI.history.length > 40){
      AI.history = AI.history.slice(-40);
    }

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
      AI.history.push({ role: "ai", text: responseText });
      LOG("Antwoord via", data.provider || "?", "/", data.model || "?");

    } catch(e) {
      LOG("Fout:", e.message);
      AI.history.push({
        role: "ai",
        text: "⚠️ " + (e.message || "Er is een fout opgetreden.") + "\n\nProbeer het over 30 seconden opnieuw."
      });
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

    if (clearBtn){
      clearBtn.addEventListener("click", clearChat);
    }
  }

  function init(){
    if (AI.initialized) return;
    AI.initialized = true;
    LOG("init");
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

  wdLog.info("[WAR DESK] ai-chat.js v1.2 geladen");
})();