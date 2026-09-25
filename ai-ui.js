/* ============================================================
   WAR DESK — ai-ui.js v1.4
   - v1.4: Professionele trending pills
     * Verfijnd design, gradient, betere iconen
     * Klikbaar filter (behouden)
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

  // ============ STYLES ============
  function injectStyles() {
    if (document.getElementById("wd-trending-styles")) return;
    var style = document.createElement("style");
    style.id = "wd-trending-styles";
    style.textContent = `
      #trending-container {
        display: flex;
        align-items: center;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 14px 4px 16px;
        margin: 0 0 4px;
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
        position: relative;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      #trending-container::-webkit-scrollbar { display: none; }
      #trending-container.wd-hidden { display: none; }

      .wd-trend-label {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding-right: 12px;
        margin-right: 2px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        color: rgba(224,168,87,0.7);
        border-right: 1px solid rgba(224,168,87,0.15);
        user-select: none;
        white-space: nowrap;
      }
      .wd-trend-label svg {
        width: 11px;
        height: 11px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .wd-trend-pill {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 12px 7px 14px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        color: var(--ink-1, #e8e8e8);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.1px;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      .wd-trend-pill::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(224,168,87,0.08), transparent 60%);
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      .wd-trend-pill:hover {
        border-color: rgba(224,168,87,0.35);
        background: rgba(224,168,87,0.06);
        transform: translateY(-1px);
      }
      .wd-trend-pill:hover::before { opacity: 1; }
      .wd-trend-pill:active {
        transform: translateY(0);
        transition: transform 0.08s;
      }
      .wd-trend-pill.active {
        background: linear-gradient(135deg, #e8b366 0%, #c4913f 100%);
        border-color: #e8b366;
        color: #0d1420;
        box-shadow: 0 3px 14px rgba(224,168,87,0.3);
        font-weight: 600;
      }
      .wd-trend-pill.active::before { opacity: 0; }

      .wd-trend-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 18px;
        padding: 0 5px;
        background: rgba(255,255,255,0.05);
        border-radius: 9px;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0;
        color: rgba(255,255,255,0.5);
        transition: all 0.2s;
      }
      .wd-trend-pill:hover .wd-trend-count {
        background: rgba(224,168,87,0.15);
        color: rgba(255,255,255,0.8);
      }
      .wd-trend-pill.active .wd-trend-count {
        background: rgba(13,20,32,0.2);
        color: rgba(13,20,32,0.85);
      }
    `;
    document.head.appendChild(style);
  }

  // ============ TRENDING BALK ============
  var trendingContainer = null;
  var activeTrendTopic = null;

  function applyTrendFilter(topic, pillEl) {
    var searchInput = document.getElementById("searchInput");

    if (activeTrendTopic === topic) {
      activeTrendTopic = null;
      if (pillEl) pillEl.classList.remove("active");
      if (searchInput) searchInput.value = "";
      if (window.NewsAPI && window.NewsAPI.setSearch) window.NewsAPI.setSearch("");
      if (window.wdLog) wdLog.info("[AI-UI] Trend filter gewist");
      return;
    }

    activeTrendTopic = topic;
    if (trendingContainer) {
      var pills = trendingContainer.querySelectorAll(".wd-trend-pill");
      for (var i = 0; i < pills.length; i++) pills[i].classList.remove("active");
    }
    if (pillEl) pillEl.classList.add("active");
    if (searchInput) searchInput.value = topic;
    if (window.NewsAPI && window.NewsAPI.setSearch) window.NewsAPI.setSearch(topic);
    if (window.wdLog) wdLog.info("[AI-UI] Trend filter: " + topic);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch(e){ window.scrollTo(0,0); }
  }

  function renderTrending(trends) {
    var feed = getFeedContainer();
    if (!feed || !feed.parentNode) return;

    injectStyles();

    if (!trendingContainer || !document.body.contains(trendingContainer)) {
      trendingContainer = document.createElement("div");
      trendingContainer.id = "trending-container";
      feed.parentNode.insertBefore(trendingContainer, feed);
    }

    if (!trends || !trends.length) {
      trendingContainer.classList.add("wd-hidden");
      return;
    }

    trendingContainer.classList.remove("wd-hidden");

    var iconSvg = '<svg viewBox="0 0 24 24"><path d="M12 2c1 4-2 6-2 9a4 4 0 0 0 8 0c0-1-.5-2-1-3 2 1 3 3 3 5a6 6 0 0 1-12 0c0-5 4-7 4-11z"/></svg>';

    var html = '<div class="wd-trend-label">' + iconSvg + 'Trending</div>';
    for (var i = 0; i < trends.length; i++) {
      var t = trends[i];
      var isActive = (activeTrendTopic === t.topic);
      html += '<button class="wd-trend-pill' + (isActive ? ' active' : '') + '"' +
              ' data-topic="' + escapeHtml(t.topic) + '"' +
              ' type="button" aria-label="Filter op ' + escapeHtml(t.topic) + '">' +
              '<span>' + escapeHtml(t.topic) + '</span>' +
              '<span class="wd-trend-count">' + t.count + '</span>' +
              '</button>';
    }
    trendingContainer.innerHTML = html;

    var pills = trendingContainer.querySelectorAll(".wd-trend-pill");
    for (var j = 0; j < pills.length; j++) {
      pills[j].addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var topic = this.getAttribute("data-topic");
        applyTrendFilter(topic, this);
      });
    }
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
    if (e.target.closest && e.target.closest("#trending-container")) return;

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

    if (window.TrendingEngine) window.TrendingEngine.run(articles);

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

    injectStyles();

    bus.on("trending:update", renderTrending);

    bus.on("news:loaded", function(payload){
      hasReceivedNewsLoaded = true;
      if (window.wdLog) wdLog.info("[AI-UI] news:loaded ontvangen — trigger");
      onNewsLoaded(payload);
    });

    bus.on("state:items", function(evt){
      if (evt && evt.value && evt.value.length) onNewsLoaded({ items: evt.value });
    });

    if (window.wdLog) wdLog.info("[WAR DESK] ai-ui.js v1.4 geladen");

    var lastSeenCount = 0;
    var stableTimer = null;
    var STABLE_DELAY = 8000;

    var pollTimer = setInterval(function(){
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