/* ============================================================
   WAR DESK — ai-ui.js v2.1
   - v2.1: MutationObserver ipv setInterval voor summary-knop
   - v2.0: Extractive samenvattingen
   - v1.9: Dedup visuele main
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

  function getTimestamp(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (v) {
        var t = (typeof v === "number") ? v : new Date(v).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
    }
    return 0;
  }

  function injectStyles() {
    if (document.getElementById("wd-trending-styles")) return;
    var style = document.createElement("style");
    style.id = "wd-trending-styles";
    style.textContent = `
      #trending-container {
        display: flex; align-items: center; gap: 8px;
        overflow-x: auto; overflow-y: hidden;
        padding: 10px 0 12px; margin: 0 0 2px;
        scrollbar-width: none; -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
        position: relative;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      #trending-container::-webkit-scrollbar { display: none; }
      #trending-container.wd-hidden { display: none; }
      #trending-container::after {
        content: ''; position: sticky; right: 0; flex-shrink: 0;
        width: 24px; height: 100%;
        background: linear-gradient(to right, transparent, var(--bg-1, #070c16) 90%);
        pointer-events: none; margin-left: -24px;
      }
      .wd-trend-label {
        position: sticky; left: 0; z-index: 2; flex-shrink: 0;
        display: inline-flex; align-items: center; gap: 4px;
        padding: 6px 12px 6px 0; margin-right: 2px;
        font-size: 9.5px; font-weight: 800; letter-spacing: 1.3px;
        text-transform: uppercase; color: rgba(224,168,87,0.85);
        background: var(--bg-1, #070c16); user-select: none; white-space: nowrap;
        border-right: 1px solid rgba(224,168,87,0.15);
      }
      .wd-trend-label svg { width: 10px; height: 10px; fill: currentColor; opacity: 0.85; }
      .wd-trend-pill {
        flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 10px 6px 12px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        color: var(--ink-1, #e8e8e8);
        border-radius: 18px; font-size: 12.5px; font-weight: 500;
        white-space: nowrap; cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: inherit;
      }
      .wd-trend-pill:hover {
        border-color: rgba(224,168,87,0.35);
        background: rgba(224,168,87,0.06);
        transform: translateY(-1px);
      }
      .wd-trend-pill.active {
        background: linear-gradient(135deg, #e8b366 0%, #c4913f 100%);
        border-color: #e8b366; color: #0d1420;
        box-shadow: 0 3px 14px rgba(224,168,87,0.3); font-weight: 600;
      }
      .wd-trend-count {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 16px; padding: 0 5px;
        background: rgba(255,255,255,0.05); border-radius: 8px;
        font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.5);
      }
      .wd-trend-pill.active .wd-trend-count {
        background: rgba(13,20,32,0.2); color: rgba(13,20,32,0.85);
      }

      .wd-dedup-hidden { display: none !important; }
      .wd-dedup-badge {
        display: inline-flex; align-items: center; gap: 4px;
        margin-top: 8px; padding: 5px 10px;
        background: rgba(224,168,87,0.08);
        border: 1px solid rgba(224,168,87,0.22);
        border-radius: 14px; color: rgba(224,168,87,0.9);
        font-size: 11px; font-weight: 600; cursor: pointer;
        transition: all 0.15s;
        -webkit-tap-highlight-color: transparent;
        font-family: inherit;
      }
      .wd-dedup-badge:hover {
        background: rgba(224,168,87,0.15);
        border-color: rgba(224,168,87,0.4);
      }
      .wd-dedup-badge svg {
        width: 11px; height: 11px;
        fill: none; stroke: currentColor;
        stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
      }

      .wd-summary-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 12px; margin-right: 8px;
        background: linear-gradient(135deg, rgba(224,168,87,0.12), rgba(224,168,87,0.04));
        border: 1px solid rgba(224,168,87,0.3);
        color: var(--accent, #e0a857);
        border-radius: 14px;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.4px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .wd-summary-btn:hover {
        background: linear-gradient(135deg, rgba(224,168,87,0.22), rgba(224,168,87,0.08));
        border-color: rgba(224,168,87,0.5);
        transform: translateY(-1px);
      }
      .wd-summary-btn:active { transform: translateY(0); }

      .wd-summary-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.75);
        z-index: 99999998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s;
        display: flex; align-items: flex-end; justify-content: center;
      }
      .wd-summary-overlay.show { opacity: 1; pointer-events: auto; }
      .wd-summary-box {
        background: var(--bg-2, #0b1220);
        border-top-left-radius: 22px;
        border-top-right-radius: 22px;
        border-top: 1px solid rgba(224,168,87,0.15);
        padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        width: 100%;
        max-height: 82vh;
        overflow-y: auto;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
        -webkit-overflow-scrolling: touch;
      }
      .wd-summary-overlay.show .wd-summary-box { transform: translateY(0); }
      .wd-summary-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 6px;
      }
      .wd-summary-head h3 {
        font-size: 18px; font-weight: 700;
        color: var(--ink-1, #f0f0f0);
        margin: 0;
        font-family: 'Playfair Display', Georgia, serif;
      }
      .wd-summary-close {
        background: rgba(255,255,255,0.05);
        border: none;
        width: 34px; height: 34px;
        border-radius: 50%;
        color: rgba(255,255,255,0.6);
        font-size: 16px;
        cursor: pointer;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
      }
      .wd-summary-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .wd-summary-meta {
        font-size: 11.5px;
        color: rgba(255,255,255,0.45);
        margin-bottom: 16px;
        letter-spacing: 0.3px;
      }
      .wd-summary-list {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 10px;
      }
      .wd-summary-list li {
        position: relative;
        padding: 14px 16px 14px 34px;
        background: rgba(255,255,255,0.03);
        border-left: 2px solid rgba(224,168,87,0.5);
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--ink-2, #d0d0d0);
        cursor: pointer;
        transition: all 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .wd-summary-list li:hover {
        background: rgba(224,168,87,0.06);
        border-left-color: var(--accent, #e0a857);
        transform: translateX(2px);
      }
      .wd-summary-list li::before {
        content: '';
        position: absolute;
        left: 14px;
        top: 20px;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--accent, #e0a857);
        box-shadow: 0 0 8px rgba(224,168,87,0.5);
      }
      .wd-summary-source {
        display: block;
        margin-top: 6px;
        font-size: 10.5px;
        color: rgba(255,255,255,0.4);
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .wd-summary-empty {
        padding: 24px;
        text-align: center;
        color: rgba(255,255,255,0.4);
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  var trendingContainer = null;
  var activeTrendTopic = null;

  function applyTrendFilter(topic, pillEl) {
    var searchInput = document.getElementById("searchInput");
    if (activeTrendTopic === topic) {
      activeTrendTopic = null;
      if (pillEl) pillEl.classList.remove("active");
      if (searchInput) searchInput.value = "";
      if (window.NewsAPI && window.NewsAPI.setSearch) window.NewsAPI.setSearch("");
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

    var flameSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.8 3.6-1.5 5.6-2.4 8.4-.4 1.3-.3 2.6.4 3.6.6-.6 1-1.6 1-2.8 1.4 1 2.2 2.8 2.2 4.6 0 1.7-1.1 3.1-2.6 3.7.9.3 1.9.5 2.9.5 3.9 0 6.5-2.6 6.5-6.5 0-4.5-4.6-6.4-5.2-10.9-1.2.4-2.3 1-2.8 1.4zM12 23c-3.9 0-7-3.1-7-7 0-2.5 1.5-4.3 2.5-6.2C8.5 8 9 6.5 9 4.5 6 6 3 9.5 3 14c0 5 4 9 9 9z"/></svg>';
    var html = '<div class="wd-trend-label">' + flameSvg + '<span>Trending</span></div>';
    for (var i = 0; i < trends.length; i++) {
      var t = trends[i];
      var isActive = (activeTrendTopic === t.topic);
      html += '<button class="wd-trend-pill' + (isActive ? ' active' : '') + '"' +
              ' data-topic="' + escapeHtml(t.topic) + '" type="button">' +
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
        applyTrendFilter(this.getAttribute("data-topic"), this);
      });
    }
  }

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
    if (!Object.keys(byId).length) return;
    var fragment = document.createDocumentFragment();
    var used = {};
    var usedCount = 0;
    for (var j = 0; j < rankedArticles.length; j++) {
      var a = rankedArticles[j];
      var aid = String(a.id || a.link || a.url || a.guid || "");
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
  }

  var refTitleMap = {};

  function findArticleElByTitle(feed, title) {
    if (!feed || !title) return null;
    var needle = String(title).toLowerCase()
      .replace(/[^\w\sÀ-ÿ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    if (needle.length < 10) return null;
    var children = feed.children;
    for (var i = 0; i < children.length; i++) {
      var text = (children[i].textContent || "").toLowerCase()
        .replace(/[^\w\sÀ-ÿ]/g, " ")
        .replace(/\s+/g, " ");
      if (text.indexOf(needle) !== -1) return children[i];
    }
    return null;
  }

  function findArticleEl(feed, ref) {
    if (!feed || !ref) return null;
    var r = String(ref).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var el = feed.querySelector(
      '[data-article-id="' + r + '"],' +
      '[data-id="' + r + '"],' +
      '[data-link="' + r + '"]'
    );
    if (el) return el;
    var title = refTitleMap[ref];
    if (title) {
      el = findArticleElByTitle(feed, title);
      if (el) return el;
    }
    try {
      var refPath = String(ref).replace(/^https?:\/\//, "").replace(/[?#].*$/, "").toLowerCase();
      if (refPath.length > 20) {
        for (var i = 0; i < feed.children.length; i++) {
          var child = feed.children[i];
          var childLink = (child.getAttribute("data-link") || "").toLowerCase();
          if (childLink) {
            var childPath = childLink.replace(/^https?:\/\//, "").replace(/[?#].*$/, "");
            if (childPath === refPath ||
                childPath.indexOf(refPath) !== -1 ||
                refPath.indexOf(childPath) !== -1) {
              return child;
            }
          }
        }
      }
    } catch(e) {}
    return null;
  }

  function applyDedup(clusters) {
    var feed = getFeedContainer();
    if (!feed) return;

    refTitleMap = {};
    try {
      var items = (window.State && window.State.items) || [];
      for (var m = 0; m < items.length; m++) {
        var it = items[m];
        var ref = String(it.id || it.link || it.url || it.guid || "");
        if (ref && it.title) refTitleMap[ref] = it.title;
      }
    } catch(e) {}

    var oldHidden = feed.querySelectorAll(".wd-dedup-hidden");
    for (var r = 0; r < oldHidden.length; r++) oldHidden[r].classList.remove("wd-dedup-hidden");
    var oldBadges = feed.querySelectorAll(".wd-dedup-badge");
    for (var b = 0; b < oldBadges.length; b++) oldBadges[b].remove();

    if (!clusters || !clusters.length) return;

    var chevronSvg = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
    var matched = 0;

    for (var i = 0; i < clusters.length; i++) {
      var c = clusters[i];
      if (!c.mainId) continue;

      var inDom = [];
      var mainEl = findArticleEl(feed, c.mainId);
      if (mainEl) inDom.push({ el: mainEl, ref: c.mainId });

      for (var j = 0; j < c.duplicateIds.length; j++) {
        var dupEl = findArticleEl(feed, c.duplicateIds[j]);
        if (dupEl) inDom.push({ el: dupEl, ref: c.duplicateIds[j] });
      }
      if (inDom.length < 2) continue;
      matched++;

      var visualMain = inDom[0].el;
      var toHide = [];
      for (var k = 1; k < inDom.length; k++) {
        inDom[k].el.classList.add("wd-dedup-hidden");
        toHide.push(inDom[k].ref);
      }

      var badge = document.createElement("button");
      badge.type = "button";
      badge.className = "wd-dedup-badge";
      badge.innerHTML = chevronSvg + '<span>+' + toHide.length + ' bron' + (toHide.length > 1 ? 'nen' : '') + '</span>';
      badge.setAttribute("data-expanded", "false");
      badge.setAttribute("data-dups", JSON.stringify(toHide));

      badge.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var expanded = this.getAttribute("data-expanded") === "true";
        var dupRefs = JSON.parse(this.getAttribute("data-dups") || "[]");
        for (var d = 0; d < dupRefs.length; d++) {
          var dEl = findArticleEl(feed, dupRefs[d]);
          if (dEl) {
            if (expanded) dEl.classList.add("wd-dedup-hidden");
            else dEl.classList.remove("wd-dedup-hidden");
          }
        }
        this.setAttribute("data-expanded", expanded ? "false" : "true");
        this.querySelector("span").textContent = expanded
          ? "+" + dupRefs.length + " bron" + (dupRefs.length > 1 ? "nen" : "")
          : "−" + dupRefs.length + " verberg";
      });

      visualMain.appendChild(badge);
    }

    if (window.wdLog) wdLog.info("[AI-UI] Dedup: " + matched + "/" + clusters.length + " clusters gematcht in DOM");
  }

  var summaryOverlay = null;

  function injectSummaryButton() {
    var actions = document.querySelector("#viewNews .section-head-actions");
    if (!actions) return;
    if (actions.querySelector(".wd-summary-btn")) return;

    var btn = document.createElement("button");
    btn.className = "wd-summary-btn";
    btn.type = "button";
    btn.innerHTML = '✨ Vat samen';
    btn.addEventListener("click", onClickSummary);
    actions.insertBefore(btn, actions.firstChild);
  }

  function onClickSummary() {
    if (!window.SummaryEngine) {
      if (window.showToast) window.showToast("Samenvatting engine niet geladen");
      return;
    }
    var category = (window.State && window.State.currentCat) || "all";
    var result = window.SummaryEngine.generate(category);
    showSummaryOverlay(result);
  }

  function showSummaryOverlay(result) {
    if (!summaryOverlay) {
      summaryOverlay = document.createElement("div");
      summaryOverlay.className = "wd-summary-overlay";
      summaryOverlay.innerHTML = ''
        + '<div class="wd-summary-box">'
        +   '<div class="wd-summary-head">'
        +     '<h3 id="wdSummaryTitle">Samenvatting</h3>'
        +     '<button class="wd-summary-close" aria-label="Sluiten">✕</button>'
        +   '</div>'
        +   '<div class="wd-summary-meta" id="wdSummaryMeta"></div>'
        +   '<ul class="wd-summary-list" id="wdSummaryList"></ul>'
        + '</div>';
      document.body.appendChild(summaryOverlay);

      summaryOverlay.querySelector(".wd-summary-close").addEventListener("click", hideSummaryOverlay);
      summaryOverlay.addEventListener("click", function(e){
        if (e.target === summaryOverlay) hideSummaryOverlay();
      });
      document.addEventListener("keydown", function(e){
        if (e.key === "Escape" && summaryOverlay.classList.contains("show")) hideSummaryOverlay();
      });
    }

    var catNames = {
      all: "Alles", war: "Oorlog", mideast: "Midden-Oosten",
      europe: "Europa", nl: "Nederland", maroc: "Marokko",
      vs: "VS", sport: "Sport", favorites: "Favorieten"
    };
    var catName = catNames[result.category] || result.category;

    document.getElementById("wdSummaryTitle").textContent = "📝 " + catName;
    document.getElementById("wdSummaryMeta").textContent =
      result.count + " artikelen · " + result.bullets.length + " kernpunten";

    var listEl = document.getElementById("wdSummaryList");
    listEl.innerHTML = "";

    if (!result.bullets.length) {
      listEl.innerHTML = '<div class="wd-summary-empty">Geen samenvatting beschikbaar voor deze categorie.</div>';
    } else {
      for (var i = 0; i < result.bullets.length; i++) {
        (function(b){
          var li = document.createElement("li");
          var source = (b.article && (b.article.source || "")) || "";
          var time = "";
          var ts = getTimestamp(b.article);
          if (ts) {
            var hours = Math.round((Date.now() - ts) / 3600000);
            time = hours < 1 ? "net" : (hours < 24 ? hours + "u" : Math.round(hours / 24) + "d");
          }
          li.innerHTML = escapeHtml(b.text) +
            '<span class="wd-summary-source">' + escapeHtml(source) + (time ? " · " + time : "") + '</span>';

          li.addEventListener("click", function(){
            hideSummaryOverlay();
            var feed = getFeedContainer();
            if (!feed || !b.article) return;
            var ref = String(b.article.id || b.article.link || b.article.url || b.article.guid || "");
            if (!ref) return;
            var el = findArticleEl(feed, ref);
            if (!el) return;
            setTimeout(function(){
              try { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
              catch(e){ el.scrollIntoView(); }
              var prevBox = el.style.boxShadow;
              el.style.transition = "box-shadow 0.3s";
              el.style.boxShadow = "0 0 0 2px rgba(224,168,87,0.8)";
              setTimeout(function(){ el.style.boxShadow = prevBox || ""; }, 1600);
            }, 400);
          });

          listEl.appendChild(li);
        })(result.bullets[i]);
      }
    }

    setTimeout(function(){ summaryOverlay.classList.add("show"); }, 20);
  }

  function hideSummaryOverlay() {
    if (summaryOverlay) summaryOverlay.classList.remove("show");
  }

  document.addEventListener("click", function(e){
    if (e.target.closest && (e.target.closest("#trending-container") || e.target.closest(".wd-dedup-badge"))) return;
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
            if (window.DedupEngine) {
              var idle2 = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
              idle2(function(){ window.DedupEngine.process(articles); }, { timeout: 3000 });
            }
            setTimeout(injectSummaryButton, 200);
          });
        });
      }, { timeout: 2000 });
    }
  }

  // v2.1: MutationObserver ipv setInterval
  var summaryObserver = null;
  var summaryObserverTimer = null;

  function setupSummaryObserver() {
    if (summaryObserver) return;
    var target = document.getElementById("viewNews");
    if (!target) {
      // Probeer later opnieuw
      setTimeout(setupSummaryObserver, 1000);
      return;
    }
    summaryObserver = new MutationObserver(function(){
      if (summaryObserverTimer) return;
      summaryObserverTimer = setTimeout(function(){
        summaryObserverTimer = null;
        if (!document.querySelector(".wd-summary-btn")) {
          injectSummaryButton();
        }
      }, 500);
    });
    summaryObserver.observe(target, { childList: true, subtree: true });
  }

  function init() {
    var bus = getBus();
    if (!bus) return;
    injectStyles();

    // v2.1: eenmalige init + observer
    injectSummaryButton();
    setupSummaryObserver();

    bus.on("trending:update", renderTrending);
    bus.on("dedup:clusters", applyDedup);

    bus.on("news:loaded", function(payload){
      hasReceivedNewsLoaded = true;
      onNewsLoaded(payload);
    });

    bus.on("state:items", function(evt){
      if (evt && evt.value && evt.value.length) onNewsLoaded({ items: evt.value });
    });

    if (window.wdLog) wdLog.info("[WAR DESK] ai-ui.js v2.1 geladen");

    var lastSeenCount = 0;
    var stableTimer = null;
    var STABLE_DELAY = 8000;

    var pollTimer = setInterval(function(){
      if (hasReceivedNewsLoaded) {
        clearInterval(pollTimer);
        return;
      }
      try {
        var items = (window.State && Array.isArray(window.State.items)) ? window.State.items : null;
        if (!items || !items.length) return;
        if (items.length !== lastSeenCount) {
          lastSeenCount = items.length;
          if (stableTimer) clearTimeout(stableTimer);
          stableTimer = setTimeout(function(){
            onNewsLoaded({ items: window.State.items });
          }, STABLE_DELAY);
        }
      } catch(e){}
    }, 2000);

    setTimeout(function(){ clearInterval(pollTimer); }, 120000);

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