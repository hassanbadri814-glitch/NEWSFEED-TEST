/* ============================================================
   WAR DESK — ai-ui.js v1.2
   - v1.2: news:loaded heeft prioriteit — polling is fallback
   - v1.2: STABLE_DELAY 4s → 8s (rustiger triggeren)
   ============================================================ */

(function(){
  "use strict";

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

  // ============ FEED HERORDENEN ============
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
      if (window.wdLog) wdLog.warn("[AI-UI] Geen data-article-id in DOM — skip reorder");
      return;
    }

    var fragment = document.createDocumentFragment();
    var used = {};
    var usedCount = 0;

    for (var j = 0; j < rankedArticles.length; j++) {
      var aid = String(rankedArticles[j].id || rankedArticles[j].link || "");
      if (aid && byId[aid] && !used[aid]) {
        fragment.appendChild(byId[aid]);
        used[aid] = true;
        usedCount++;
      }
    }
    for (var k = 0; k < children.length; k++) {
      var kid = getArticleId(children[k]);
      if (kid && !used[kid]) {
        fragment.appendChild(children[k]);
        used[kid] = true;
        usedCount++;
      }
    }

    while (feed.firstChild) feed.removeChild(feed.firstChild);
    feed.appendChild(fragment);
    if (window.wdLog) wdLog.info("[AI-UI] Feed herordend (" + usedCount + " items)");
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

  var lastTriggeredCount = 0;
  var hasReceivedNewsLoaded = false;

  function onNewsLoaded(payload) {
    var articles = extractItems(payload);
    if (!articles || !articles.length) {
      if (window.State && Array.isArray(window.State.items) && window.State.items.length) {
        articles = window.State.items;
      }
    }
    if (!articles || !articles.length) return;

    if (articles.length === lastTriggeredCount) return;
    lastTriggeredCount = articles.length;

    if (window.wdLog) wdLog.info("[AI-UI] Trigger met " + articles.length + " artikelen");

    if (window.TrendingEngine) {
      window.TrendingEngine.run(articles);
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
    }
  }

  // ============ INIT ============
  function init() {
    var bus = getBus();
    if (!bus) {
      if (window.wdLog) wdLog.warn("[AI-UI] EventBus niet gevonden");
      return;
    }

    bus.on("trending:update", renderTrending);

    // v1.2: news:loaded heeft prioriteit — dit vuurt 1x als alles klaar is
    bus.on("news:loaded", function(payload){
      hasReceivedNewsLoaded = true;
      if (window.wdLog) wdLog.info("[AI-UI] news:loaded ontvangen — trigger");
      onNewsLoaded(payload);
    });

    bus.on("state:items", function(evt){
      if (evt && evt.value && evt.value.length) onNewsLoaded({ items: evt.value });
    });

    if (window.wdLog) wdLog.info("[WAR DESK] ai-ui.js v1.2 geladen");

    // ============================================================
    // FALLBACK POLLING — alleen als news:loaded nooit komt
    // ============================================================
    var lastSeenCount = 0;
    var stableTimer = null;
    var STABLE_DELAY = 8000;

    var pollTimer = setInterval(function(){
      // Stop polling als news:loaded al is afgegaan
      if (hasReceivedNewsLoaded) {
        clearInterval(pollTimer);
        if (window.wdLog) wdLog.info("[AI-UI] Polling gestopt (news:loaded actief)");
        return;
      }
      try {
        var items = (window.State && Array.isArray(window.State.items)) ? window.State.items : null;
        if (!items || !items.length) return;

        if (items.length !== lastSeenCount) {
          lastSeenCount = items.length;
          if (stableTimer) clearTimeout(stableTimer);
          stableTimer = setTimeout(function(){
            if (window.wdLog) wdLog.info("[AI-UI] Feed stabiel op " + lastSeenCount + " items — trigger (fallback)");
            onNewsLoaded({ items: window.State.items });
          }, STABLE_DELAY);
        }
      } catch(e) {
        if (window.wdLog) wdLog.warn("[AI-UI] Poll fout: " + e.message);
      }
    }, 2000);

    setTimeout(function(){
      clearInterval(pollTimer);
    }, 120000);

    // Direct eerste check
    setTimeout(function(){
      if (window.State && Array.isArray(window.State.items) && window.State.items.length) {
        lastSeenCount = window.State.items.length;
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