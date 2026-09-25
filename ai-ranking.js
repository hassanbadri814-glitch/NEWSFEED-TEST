// ai-ranking.js
export const RankingEngine = (() => {
  const STORAGE_KEY = 'war_desk_user_profile';
  const DECAY_INTERVAL = 24 * 60 * 60 * 1000; // 1 dag
  let profile = null;
  let writeTimeout = null;

  function loadProfile() {
    if (profile) return profile;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      profile = stored ? JSON.parse(stored) : { categories: {}, sources: {}, lastDecay: Date.now() };
    } catch {
      profile = { categories: {}, sources: {}, lastDecay: Date.now() };
    }
    return profile;
  }

  function saveProfile() {
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (e) {
        console.warn('[RankingEngine] Kon profiel niet opslaan:', e);
      }
    }, 5000); // Batch write na 5 seconden
  }

  function applyDecay() {
    const p = loadProfile();
    const now = Date.now();
    if (now - p.lastDecay < DECAY_INTERVAL) return;

    Object.keys(p.categories).forEach(k => {
      p.categories[k] = 1.0 + (p.categories[k] - 1.0) * 0.9;
    });
    Object.keys(p.sources).forEach(k => {
      p.sources[k] = 1.0 + (p.sources[k] - 1.0) * 0.9;
    });
    p.lastDecay = now;
    saveProfile();
  }

  function trackClick(article) {
    const p = loadProfile();
    if (article.category) p.categories[article.category] = (p.categories[article.category] || 1.0) + 0.1;
    if (article.source) p.sources[article.source] = (p.sources[article.source] || 1.0) + 0.05;
    saveProfile();
  }

  function trackIgnore(article) {
    const p = loadProfile();
    if (article.category) p.categories[article.category] = Math.max(0.5, (p.categories[article.category] || 1.0) - 0.05);
    saveProfile();
  }

  function rank(articles) {
    applyDecay();
    const p = loadProfile();
    
    // Kopieer en sorteer op basis van profielgewichten
    return [...articles].sort((a, b) => {
      const scoreA = (p.categories[a.category] || 1.0) * (p.sources[a.source] || 1.0);
      const scoreB = (p.categories[b.category] || 1.0) * (p.sources[b.source] || 1.0);
      return scoreB - scoreA;
    });
  }

  return { trackClick, trackIgnore, rank };
})();