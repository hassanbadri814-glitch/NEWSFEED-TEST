/* ============================================================
   WAR DESK — AI UI Hooks (Fase 1)
   - Trending badges balk
   - Ranked feed herordenen (scroll-safe)
   - Click tracking voor personalisatie
   ============================================================ */

(function(){
  "use strict";

  function init() {
    var bus = (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
    if (!bus) {
      console.warn("[AI-UI] EventBus niet gevonden — AI UI wordt niet gestart");
      return;
    }

    var feedContainer = null;
    var trendingContainer = null;

    function getFeed() {
      if (feedContainer && document.body.contains(feedContainer)) return feedContainer;
      feedContainer = document.getElementById("news-feed") 
                    || document.getElementById("newsList") 
                    || document.querySelector(".news-list")
                    || document.querySelector("#viewNews .feed");
      return feedContainer;
    }

    // ============================================================
    // 1. TRENDING BALK
    // ============================================================
    bus.on('trending:update', function(trends) {
      var feed = getFeed();
      if (!feed) return;

      // Maak of hergebruik trending container
      if (!trendingContainer || !document.body.contains(trendingContainer)) {
        trendingContainer = document.createElement("div");
        trendingContainer.id = "trending-container";
        trendingContainer.style.cssText = 
          "display:flex;gap:8px;overflow-x:auto;padding:8px 12px;" +
          "background:rgba(0,0,0,0.25);border-radius:8px;margin:8px 0;" +
          "scrollbar-width:none;-ms-overflow-style:none;";
        feed.parentNode.insertBefore(trendingContainer, feed);
      }

      if (!trends || trends.length === 0) {
        trendingContainer.style.display = "none";
        return;
      }

      trendingContainer.style.display = "flex";
      
      var html = "";
      for (var i = 0; i < trends.length; i++) {
        var t = trends[i];
        // Sanitize topic
        var safeTopic = String(t.topic || "").replace(/[<>&"]/g, "");
        html += '<span style="background:linear-gradient(135deg,#ff4500,#ff6b35);' +
                'color:white;padding:4px 12px;border-radius:16px;font-size:12px;' +
                'white-space:nowrap;font-weight:600;flex-shrink:0;' +
                'box-shadow:0 2px 6px rgba(255,69,0,0.3);">' +
                '🔥 ' + safeTopic + ' <span style="opacity:0.8">(' + t.count + ')</span>' +
                '</span>';
      }
      trendingContainer.innerHTML = html;
    });

    // ============================================================
    // 2. RANKED FEED (scroll-safe herordenen)
    // ============================================================
    var isUserScrolling = false;
    var scrollResetTimer = null;

    // Detecteer scroll op window (niet alleen op feed)
    window.addEventListener("scroll", function() {
      isUserScrolling = true;
      if (scrollResetTimer) clearTimeout(scrollResetTimer);
      scrollResetTimer = setTimeout(function() {
        isUserScrolling = false;
      }, 200);
    }, { passive: true });

    bus.on('news:ranked', function(rankedArticles) {
      var feed = getFeed();
      if (!feed || !rankedArticles || !rankedArticles.length) return;

      // Voorkom herordenen tijdens scrollen
      if (isUserScrolling) {
        // Probeer later opnieuw
        setTimeout(function() {
          bus.emit('news:ranked', rankedArticles);
        }, 500);
        return;
      }

      // Verzamel bestaande DOM elementen
      var existingElements = {};
      var children = feed.children;
      for (var i = 0; i < children.length; i++) {
        var id = children[i].getAttribute("data-article-id");
        if (id) existingElements[id] = children[i];
      }

      // Bouw de nieuwe volgorde
      var fragment = document.createDocumentFragment();
      var usedIds = {};

      for (var j = 0; j < rankedArticles.length; j++) {
        var articleId = String(rankedArticles[j].id || "");
        if (existingElements[articleId] && !usedIds[articleId]) {
          fragment.appendChild(existingElements[articleId]);
          usedIds[articleId] = true;
        }
      }

      // Voeg resterende elementen toe (die niet in de ranking zaten)
      for (var k = 0; k < children.length; k++) {
        var childId = children[k].getAttribute("data-article-id");
        if (childId && !usedIds[childId]) {
          fragment.appendChild(children[k]);
          usedIds[childId] = true;
        }
      }

      // Vervang de feed-inhoud in één keer (atomic update)
      feed.innerHTML = "";
      feed.appendChild(fragment);
    });

    // ============================================================
    // 3. CLICK TRACKING (personalisatie)
    // ============================================================
    document.addEventListener("click", function(e) {
      var articleEl = e.target.closest("[data-article-id]");
      if (!articleEl) return;

      var articleId = articleEl.getAttribute("data-article-id");
      if (!articleId) return;

      try {
        var article = null;
        if (window.State && window.State.items) {
          for (var i = 0; i < window.State.items.length; i++) {
            if (String(window.State.items[i].id) === String(articleId)) {
              article = window.State.items[i];
              break;
            }
          }
        }
        if (article && window.RankingEngine) {
          window.RankingEngine.trackClick(article);
        }
      } catch(err) {
        console.warn("[AI-UI] Click tracking fout:", err);
      }
    }, true);

    console.log("[AI-UI] Actief — trending, ranking en click tracking gestart");
  }

  // Wacht tot de DOM klaar is
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();