/* ============================================================
   WAR DESK v1.0 — AI Chat Module
   - Chat interface met Gemini via Cloudflare Worker
   - Gebruikt State.items als context
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ wdLog.info.apply(null, ["[AI]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.0 geladen");

  var WORKER_URL = "https://newsfeed2.hassanbadri814.workers.dev/ai";
  var MAX_ARTICLES = 15;

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

  function buildArticleContext(){
    try {
      if (!window.State || !State.items || !State.items.length) return [];
      var sorted = State.items.slice().sort(function(a, b){
        return (b._score || 0) - (a._score || 0);
      });
      return sorted.slice(0, MAX_ARTICLES).map(function(it){
        return {
          title: it.title || "",
          desc: (it.desc || "").slice(0, 250),
          source: it.source || "",
          cat: it.cat || "",
          date: it.date || ""
        };
      });
    } catch(e){
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
          '<div class="ai-welcome-text">Stel een vraag over het nieuws. Ik gebruik de nieuwste artikelen uit jouw feed om antwoord te geven.</div>' +
          '<div class="ai-suggestions">' +
            '<button class="ai-sugg" data-q="Wat is het belangrijkste nieuws vandaag?">Belangrijkste nieuws vandaag</button>' +
            '<button class="ai-sugg" data-q="Vat het nieuws over het Midden-Oosten samen">Midden-Oosten samenvatting</button>' +
            '<button class="ai-sugg" data-q="Wat gebeurt er in Nederland?">Nederland vandaag</button>' +
            '<button class="ai-sugg" data-q="Wat is er in Gaza gebeurd?">Gaza update</button>' +
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
      html += '<div class="ai-msg-text">' + esc(msg.text).replace(/\n/g, "<br>") + '</div>';
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
      var articles = buildArticleContext();
      LOG("Verstuur:", message.slice(0, 50) + "...", "met", articles.length, "artikelen");

      var r = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          articles: articles,
          history: AI.history.slice(-6)
        })
      });

      if (!r.ok){
        var errText = await r.text();
        throw new Error("HTTP " + r.status + ": " + errText.slice(0, 100));
      }

      var data = await r.json();
      if (data.error) throw new Error(data.error);

      var responseText = data.response || "(geen antwoord)";
      AI.history.push({ role: "ai", text: responseText });
      LOG("Antwoord ontvangen");

    } catch(e) {
      LOG("Fout:", e.message);
      AI.history.push({
        role: "ai",
        text: "⚠️ Er is een fout opgetreden: " + (e.message || "onbekende fout") + "\n\nControleer je internetverbinding en probeer opnieuw."
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

  wdLog.info("[WAR DESK] ai-chat.js v1.0 geladen");
})();