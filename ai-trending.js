// ai-trending.js
import { EventBus } from './utils.js';

export const TrendingEngine = (() => {
  let lastRun = 0;
  const THROTTLE_MS = 60000; // 1 minuut
  const WINDOW_HOURS = 4;
  const MAX_ARTICLES = 500;

  const STOP_WORDS = new Set(['de', 'het', 'een', 'van', 'en', 'in', 'is', 'op', 'dat', 'voor', 'met', 'zijn', 'er', 'aan', 'om', 'ook', 'als', 'maar', 'bij', 'of', 'uit', 'dan', 'naar', 'nog', 'wel', 'geen', 'kan', 'meer', 'wordt', 'door', 'over', 'ze', 'zich', 'niet', 'heeft', 'hebben', 'worden', 'deze', 'dit', 'tot', 'je', 'u', 'we', 'ze', 'ik', 'hij', 'zij', 'jij', 'mijn', 'jouw', 'ons', 'onze']);

  function extractEntities(articles) {
    const counts = new Map();
    const now = Date.now();
    const cutoff = now - (WINDOW_HOURS * 60 * 60 * 1000);

    const recent = articles
      .filter(a => new Date(a.pubDate).getTime() > cutoff)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, MAX_ARTICLES);

    recent.forEach(article => {
      const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
      const words = text.replace(/[^\w\s]/g, '').split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));

      const sourceWeight = ['nos', 'telegraaf', 'ad'].includes(article.source?.toLowerCase()) ? 1.5 : 1.0;
      const ageHours = (now - new Date(article.pubDate).getTime()) / (1000 * 60 * 60);
      const timeWeight = Math.max(0.1, 1 - (ageHours / WINDOW_HOURS));

      words.forEach(word => {
        const current = counts.get(word) || { score: 0, count: 0 };
        counts.set(word, {
          score: current.score + (sourceWeight * timeWeight),
          count: current.count + 1
        });
      });
    });

    return Array.from(counts.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([word, data]) => ({ topic: word, score: data.score, count: data.count }));
  }

  function run(articles) {
    const now = Date.now();
    if (now - lastRun < THROTTLE_MS) return;
    lastRun = now;

    // Fallback voor Safari / oudere browsers
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    
    idle(() => {
      try {
        const trends = extractEntities(articles);
        EventBus.emit('trending:update', trends);
      } catch (e) {
        console.warn('[TrendingEngine] Fout bij berekenen:', e);
      }
    }, { timeout: 2000 });
  }

  return { run };
})();