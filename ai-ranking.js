/* ============================================================
   WAR DESK — ai-ranking.js v1.0
   Slimmere Ranking (Fase 1)
   - Leert van kliks (localStorage)
   - Decay na 7 dagen richting 1.0
   - Batched writes (5s)
   ============================================================ */

(function(){
  "use strict";

  var STORAGE_KEY = "war_desk_user_profile";
  var DECAY_INTERVAL = 24 * 60 * 60 * 1000;
  var profile = null;
  var writeTimeout = null;

  function loadProfile() {
    if (profile) return profile;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      profile = stored ? JSON.parse(stored) : { categories: {}, sources: {}, lastDecay: Date.now() };
    } catch(e) {
      profile = { categories: {}, sources: {}, lastDecay: Date.now() };
    }
    return profile;
  }

  function saveProfile() {
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(function(){
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch(e) {
        if (window.wdLog) wdLog.warn("[Ranking] opslaan mislukt: " + e.message);
      }
    }, 5000);
  }

  function applyDecay() {
    var p = loadProfile();
    var now = Date.now();
    if (now - p.lastDecay < DECAY_INTERVAL) return;

    var k;
    for (k in p.categories) {
      p.categories[k] = 1.0 + (p.categories[k] - 1.0) * 0.9;
    }
    for (k in p.sources) {
      p.sources[k] = 1.0 + (p.sources[k] - 1.0) * 0.9;
    }
    p.lastDecay = now;
    saveProfile();
  }

  function trackClick(article) {
    if (!article) return;
    var p = loadProfile();
    if (article.category) {
      p.categories[article.category] = (p.categories[article.category] || 1.0) + 0.1;
    }
    if (article.source) {
      p.sources[article.source] = (p.sources[article.source] || 1.0) + 0.05;
    }
    saveProfile();
  }

  function trackIgnore(article) {
    if (!article) return;
    var p = loadProfile();
    if (article.category) {
      p.categories[article.category] = Math.max(0.5, (p.categories[article.category] || 1.0) - 0.05);
    }
    saveProfile();
  }

  function rank(articles) {
    if (!articles || !articles.length) return articles || [];
    applyDecay();
    var p = loadProfile();
    var arr = articles.slice();
    arr.sort(function(a, b) {
      var sa = (p.categories[a.category] || 1.0) * (p.sources[a.source] || 1.0);
      var sb = (p.categories[b.category] || 1.0) * (p.sources[b.source] || 1.0);
      return sb - sa;
    });
    return arr;
  }

  window.RankingEngine = { trackClick: trackClick, trackIgnore: trackIgnore, rank: rank };

  if (window.wdLog) wdLog.info("[WAR DESK] ai-ranking.js v1.0 geladen");

})();