/* ============================================================
   WAR DESK — ai-ui.js v1.0
   AI Fase 1 Orchestrator
   - Luistert naar news:loaded + state:items
   - Polling fallback (bulletproof tegen event-timing)
   - Roept TrendingEngine + RankingEngine aan
   - Rendert trending-balk
   - Herordent feed (scroll-safe)
   - Trackt kliks
   ============================================================ */

(function(){
  "use strict";

  // ============ HELPERS ============
  function getBus() {
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  function getFeedContainer() {
    return document.getElementById("feedGrid")
        || document.getElementById("news-feed")
        || document.getElementById("newsList")
        || document.querySelector(".feed-grid")
        || document.querySelector(".news-list");
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function(c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  // ============ TRENDING BALK ============
  var trendingContainer = null;

  function renderTrending(trends) {
    var feed = getFeedContainer();
    if (!feed || !feed.parentNode) return;

    if (!trendingContainer || !document.body.contains(trendingContainer)) {
      trendingContainer = document.createElement("div");
      trendingContainer.id = "trending-container";
      trendingContainer.style.cssText =
        "display:flex;gap:8px;overflow-x:auto;padding:8px 12px;" +
        "background:rgba(0,0,0,0.2);border-radius:8px;margin:8px 0;" +
        "scrollbar-width:none;-ms-overflow-style:none;";
      feed.parentNode.insertBefore(trendingContainer, feed);
    }

    if (!trends || !trends.length) {
      trendingContainer.style.display = "none";
      return;
    }

    var html = "";
    for (var i = 0; i < trends.length; i++) {
      var t = trends[i];
      html += '<span style="background:linear-gradient(135deg,#ff4500,#ff6b35);' +
              'color:white;padding:4px 12px;border-radius:16px;font-size:12px;' +
              'white-space:nowrap;font-weight:600;flex-shrink:0;' +
              'box-shadow:0 2px 6px rgba(255,69,0,0.3);">' +
              '🔥 ' + escapeHtml(t.topic) +
              ' <span style="opacity:0.8">(' + t.count + ')</span>' +
              '</span>';
    }
    trendingContainer.innerHTML = html;
    trendingContainer.style.display = "flex";
  }

  // ============ FEED HERORDENEN (scroll-safe) ============
  var isScrolling = false;
  var scrollTimer = null;

  window.addEventListener("scroll", function(){
    isScrolling = true;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function(){ isScrolling = false; }, 200);
  }, { passive: true });

  function getArticleId(el) {
    if (!el || !el.getAttribute) return null;
    return el.getAttribute("data-article-id")
        || el.getAttribute("data-id")
        || el.getAttribute("data-link");
  }

  function reorderFeed(rankedArticles) {
    var feed = getFeedContainer();
    if (!feed || !rankedArticles || !rankedArticles.length) return;

    if (isScrolling) {
      setTimeout(function(){ reorderFeed(rankedArticles); }, 500);
      return;
    }

    var children = feed.children;
    if (!children.length) return;

    var byId = {};
    for (var i = 0; i < children.length; i++) {
      var id = getArticleId(children[i]);
      if (id) byId[id] = children[i];
    }

    if (!Object.keys(byId).length) {
      if (window.wdLog) wdLog.warn("[AI-UI] Geen data-article-id in feed — skip reorder");
      return;
    }

    var fragment = document.createDocumentFragment();
    var used = {};

    for (var j = 0; j < rankedArticles.length; j++) {
      var aid = String(rankedArticles[j].id || rankedArticles[j].link || "");
      if (aid && byId[aid] && !used[aid]) {
        fragment.appendChild(byId[aid]);
        used[aid] = true;
      }
    }
    for (var k = 0; k < children.length; k++) {
      var kid = getArticleId(children[k]);
      if (kid && !used[kid]) {
        fragment.appendChild(children[k]);
        used[kid] = true;
      }
    }

    while (feed.firstChild) feed.removeChild(feed.firstChild);
    feed.appendChild(fragment);
    if (window.wdLog) wdLog.info("[AI-UI] Feed herordend (" + used.length + " items)");
  }

  // ============ CLICK TRACKING ============
  document.addEventListener("click", function(e){
    var el = e.target.closest && e.target.closest("[data-article-id],[data-id]");
    if (!el) return;
    var id = el.getAttribute("data-article-id") || el.getAttribute("data-id");
    if (!id) return;
    try {
      var items = (window.State && window.State.items) || [];
      var article = null;
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === String(id)) { article = items[i]; break; }
      }
      if (article && window.RankingEngine) window.RankingEngine.trackClick(article);
    } catch(err){}
  }, true);

  // ============ ORCHESTRATIE ============
  function extractItems(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.articles)) return payload.articles;
    return null;
  }

  function onNewsLoaded(payload) {
    var articles = extractItems(payload);
    if (!articles || !articles.length) {
      if (window.State && Array.isArray(window.State.items) && window.State.items.length) {
        articles = window.State.items;
      }
    }
    if (!articles || !articles.length) return;

    if (window.wdLog) wdLog.info("[AI-UI] Trigger met " + articles.length + " artikelen");

    if (window.TrendingEngine) {
      window.TrendingEngine.run(articles);
    } else if (window.wdLog) {
      wdLog.warn("[AI-UI] TrendingEngine ontbreekt");
    }

    if (window.RankingEngine) {
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){
        var ranked = window.RankingEngine.rank(articles);
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            reorderFeed(ranked);
          });
        });
      }, { timeout: 2000 });
    } else if (window.wdLog) {
      wdLog.warn("[AI-UI] RankingEngine ontbreekt");
    }
  }

  // ============ INIT ============
  function init() {
    var bus = getBus();
    if (!bus) {
      if (window.wdLog) wdLog.warn("[AI-UI] EventBus niet gevonden — AI UI uit");
      return;
    }

    bus.on("trending:update", renderTrending);
    bus.on("news:loaded", onNewsLoaded);
    bus.on("state:items", function(evt){
      if (evt && evt.value && evt.value.length) onNewsLoaded({ items: evt.value });
    });

    if (window.wdLog) wdLog.info("[WAR DESK] ai-ui.js v1.0 geladen — trending + ranking + click tracking actief");

    // ============================================================
    // BULLETPROOF POLLING
    // Check elke 3 sec of State.items is gevuld/veranderd.
    // Werkt ongeacht event-timing of payload-structuur.
    // Stopt automatisch na 2 minuten.
    // ============================================================
    var lastCount = 0;
    var pollTimer = setInterval(function(){
      try {
        var items = (window.State && Array.isArray(window.State.items)) ? window.State.items : null;
        if (!items || !items.length) return;
        if (items.length !== lastCount) {
          lastCount = items.length;
          if (window.wdLog) wdLog.info("[AI-UI] Poll: " + items.length + " items in State");
          onNewsLoaded({ items: items });
        }
      } catch(e) {
        if (window.wdLog) wdLog.warn("[AI-UI] Poll fout: " + e.message);
      }
    }, 3000);

    setTimeout(function(){
      clearInterval(pollTimer);
      if (window.wdLog) wdLog.info("[AI-UI] Polling gestopt");
    }, 120000);

    // Direct eerste check (State kan al gevuld zijn)
    setTimeout(function(){
      if (window.State && Array.isArray(window.State.items) && window.State.items.length) {
        lastCount = window.State.items.length;
        onNewsLoaded({ items: window.State.items });
      }
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();