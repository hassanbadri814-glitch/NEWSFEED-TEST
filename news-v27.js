/* ============================================================
   WAR DESK v27.0 — Nieuws Logica (High Performance & Safe)
   - Geïntegreerd met appStore (Reactive)
   - Chunked Rendering (Performance)
   - Veilige DOM creatie (XSS preventie)
   ============================================================ */

import { appStore } from './store.js';

const $ = (id) => document.getElementById(id);
const MYMEMORY_EMAIL = "hassanbadri814@gmail.com";

// Hulpfuncties
const tm = (d) => { const x = new Date(d); return isNaN(x) ? 0 : x.getTime(); };
const ago = (d) => {
  const t = tm(d); if(!t) return "";
  const diff = (Date.now() - t) / 1000;
  if(diff < 60) return "nu";
  if(diff < 3600) return Math.floor(diff / 60) + "m";
  if(diff < 86400) return Math.floor(diff / 3600) + "u";
  return Math.floor(diff / 86400) + "d";
};
const rtime = (t) => Math.max(1, Math.round((t || "").split(/\s+/).length / 200));
const strip = (s) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function emitProgress(pct, done) {
  try {
    document.dispatchEvent(new CustomEvent("wardesk:feedprogress", {
      detail: { pct: Math.max(0, Math.min(100, Math.round(pct))), done: !!done }
    }));
  } catch(e) {}
}

// ... [extractTags, scoreArticle, titleKey, dedupe, parseRssXml, normalizeItem blijven exact hetzelfde als in v26, 
//      maar gebruiken nu appStore.state waar nodig. Voor beknoptheid hier de kernlogica:]

function extractTags(title, desc, sourceCat) {
  // (Plak hier je volledige extractTags functie uit v26)
  // Zorg dat je overal 'tags.push' gebruikt, de return is een array.
  var tags = [];
  var t = ((title || "") + " " + (desc || "")).toLowerCase();
  if(sourceCat === "nl") tags.push("nl");
  if(sourceCat === "be" || sourceCat === "de" || sourceCat === "fr" || sourceCat === "it" || sourceCat === "uk") tags.push("europe");
  if(sourceCat === "us") tags.push("vs");
  if(sourceCat === "maroc") tags.push("maroc");
  if(sourceCat === "eg" || sourceCat === "sa" || sourceCat === "ae" || sourceCat === "qa" || sourceCat === "il" || sourceCat === "mideast") tags.push("mideast");
  if(sourceCat === "ukraine" || sourceCat === "gaza" || sourceCat === "yemen" || sourceCat === "iran" || sourceCat === "sudan" || sourceCat === "war") tags.push("war");
  if(sourceCat === "sport") tags.push("sport");
  
  // ... (voeg hier de rest van je regex checks uit v26 toe) ...
  
  return tags.filter(function(v, i, a){ return a.indexOf(v) === i; });
}

function scoreArticle(it) {
  var score = 0;
  var sources = (it.sources || [it.source]).length;
  score += sources * 12;
  var t = (it.title + " " + (it.desc || "")).toLowerCase();
  for(var i = 0; i < window.KEYWORDS_HIGH.length; i++) if(t.indexOf(window.KEYWORDS_HIGH[i]) >= 0) score += 6;
  for(var j = 0; j < window.KEYWORDS_MED.length; j++) if(t.indexOf(window.KEYWORDS_MED[j]) >= 0) score += 3;
  if(window.HIGH_PRIORITY.indexOf(it.source) >= 0) score += 15;
  var ageMin = Math.max(0, (Date.now() - tm(it.date)) / 60000);
  score += Math.max(0, 40 - ageMin / 2);
  return score;
}

function titleKey(title) {
  return (title || "").toLowerCase().replace(/[^\w\s]/g, "")
    .split(/\s+/).filter(function(w){ return w.length > 3; })
    .slice(0, 8).sort().join(" ");
}

function dedupe(items) {
  var map = new Map();
  items.forEach(function(it) {
    var key = titleKey(it.title);
    if(!key) { map.set("__" + Math.random(), it); return; }
    if(!map.has(key)) {
      var copy = {}; for(var k in it) copy[k] = it[k];
      copy.sources = [it.source];
      copy.tags = it.tags ? it.tags.slice() : [];
      map.set(key, copy);
    } else {
      var e = map.get(key);
      if(e.sources.indexOf(it.source) < 0) e.sources.push(it.source);
      if(it.tags) {
        it.tags.forEach(function(t) {
          if(e.tags.indexOf(t) === -1) e.tags.push(t);
        });
      }
    }
  });
  return Array.from(map.values());
}

function parseRssXml(xmlText) {
  try {
    var doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if(doc.getElementsByTagName("parsererror").length) return [];
    var nodes = doc.getElementsByTagName("item");
    if(!nodes.length) nodes = doc.getElementsByTagName("entry");
    var out = [];
    for(var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var gtxt = function(tag) {
        var els = node.getElementsByTagName(tag);
        return els.length ? (els[0].textContent || "").trim() : "";
      };
      var title = gtxt("title");
      var linkEl = node.getElementsByTagName("link")[0];
      var link = linkEl ? ((linkEl.textContent || "") || linkEl.getAttribute("href") || "").trim() : "";
      var desc = gtxt("description") || gtxt("content") || gtxt("summary") || gtxt("encoded");
      var date = gtxt("pubDate") || gtxt("published") || gtxt("updated") || gtxt("date");
      var encEl = node.getElementsByTagName("enclosure")[0];
      var encLink = encEl ? (encEl.getAttribute("url") || encEl.getAttribute("href") || "") : "";
      var mediaEl = node.getElementsByTagName("media:content")[0] || node.getElementsByTagName("media:thumbnail")[0];
      var thumb = mediaEl ? (mediaEl.getAttribute("url") || "") : "";
      out.push({ title: title, link: link, description: desc, pubDate: date, thumbnail: thumb, enclosure: encLink ? {link: encLink} : null });
    }
    return out;
  } catch(e) { return []; }
}

function normalizeItem(it) {
  if(it == null) return {title:"", link:"", description:"", pubDate:"", thumbnail:""};
  if(typeof it === "string") return {title: it, link:"", description:"", pubDate:"", thumbnail:""};
  if(typeof it !== "object") return {title: String(it), link:"", description:"", pubDate:"", thumbnail:""};
  if(it.fields) it = Object.assign({}, it, it.fields);
  if(it._source) it = Object.assign({}, it, it._source);
  var raw = it.description || it.content || it.summary || it["content:encoded"] || it.contentSnippet || "";
  var enc = it.enclosure && (it.enclosure.link || it.enclosure.url);
  var thumb = it.thumbnail || enc || it.image || "";
  if(!thumb && typeof raw === "string") {
    var m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
    if(m) thumb = m[1];
  }
  var link = it.link || it.url || it.id || (it.guid && (it.guid.$t || it.guid._ || it.guid)) || "";
  return {
    title: String(it.title || it.name || it.headline || ""),
    link: String(link),
    description: String(raw),
    pubDate: it.pubDate || it.published || it.updated || it.date || it.created || it.pubdate || "",
    thumbnail: String(thumb)
  };
}

// Proxy & Fetch Logica
if(!window.__proxyHealth) window.__proxyHealth = {};
const PROXY_COOLDOWN_MS = 30000;
const PROXY_FAIL_THRESHOLD = 5;
const googleNewsSem = { active: 0, max: 2, queue: [] };

function googleNewsAcquire() {
  return new Promise(resolve => {
    if(googleNewsSem.active < googleNewsSem.max) { googleNewsSem.active++; resolve(); }
    else { googleNewsSem.queue.push(resolve); }
  });
}
function googleNewsRelease() {
  if(googleNewsSem.queue.length > 0) { const next = googleNewsSem.queue.shift(); next(); }
  else { googleNewsSem.active--; }
}
function markProxyFail(p) {
  if(!window.__proxyHealth[p]) window.__proxyHealth[p] = { fails: 0, disabledUntil: 0 };
  window.__proxyHealth[p].fails++;
  if(window.__proxyHealth[p].fails >= PROXY_FAIL_THRESHOLD) {
    window.__proxyHealth[p].disabledUntil = Date.now() + PROXY_COOLDOWN_MS;
    window.__proxyHealth[p].fails = 0;
  }
}
function markProxyOk(p) {
  if(!window.__proxyHealth[p]) window.__proxyHealth[p] = { fails: 0, disabledUntil: 0 };
  window.__proxyHealth[p].fails = 0;
  window.__proxyHealth[p].disabledUntil = 0;
}
function parseResponse(txt) {
  var trimmed = txt.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  if(trimmed.charAt(0) === "<") return { shape: "xml", items: parseRssXml(txt) };
  try {
    var data = JSON.parse(txt);
    var items = [];
    if(data.items && data.items.length) items = data.items;
    else if(data.entries && data.entries.length) items = data.entries;
    else if(data.data && data.data.items && data.data.items.length) items = data.data.items;
    else if(Array.isArray(data)) items = data;
    return { shape: "json", items: items };
  } catch(e) { return { shape: "?", items: [] }; }
}

async function fetchFeedWithFallback(feedUrl) {
  var isGoogleNews = /news\.google\.com/.test(feedUrl);
  if(isGoogleNews) await googleNewsAcquire();
  try {
    var proxies = isGoogleNews && window.CONFIG?.googleNewsProxies?.length ? window.CONFIG.googleNewsProxies : (window.CONFIG?.proxies?.length ? window.CONFIG.proxies : [window.CONFIG.proxies[0]]);
    var lastErr = null;
    for(var i = 0; i < proxies.length; i++) {
      var p = proxies[i];
      var health = window.__proxyHealth[p];
      if(health && health.disabledUntil && Date.now() < health.disabledUntil) continue;
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(() => ctrl.abort(), window.CONFIG.fetchTimeoutMs);
        var r = await fetch(p + encodeURIComponent(feedUrl), {signal: ctrl.signal});
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        var txt = await r.text();
        var parsed = parseResponse(txt);
        if(!parsed.items.length) throw new Error("0 items");
        markProxyOk(p);
        return { items: parsed.items, shape: parsed.shape, proxyIdx: i, viaGoogleNews: isGoogleNews };
      } catch(e) {
        lastErr = e;
        markProxyFail(p);
      }
    }
    throw lastErr || new Error("alle proxies faalden");
  } finally {
    if(isGoogleNews) googleNewsRelease();
  }
}

// Translatie Logica (Behouden uit v26, aangepast voor store)
const TRANSLATION_SEM = { active: 0, max: 3, queue: [] };
function titleHashKey(lang, title) {
  var str = (lang || "xx") + "|" + (title || "");
  var h1 = 5381, h2 = 52711;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    h1 = ((h1 << 5) + h1) ^ c;
    h2 = ((h2 << 5) + h2 + c) | 0;
  }
  return "tr_" + (h1 >>> 0).toString(36) + "_" + (h2 >>> 0).toString(36);
}
function translationAcquire() {
  return new Promise(resolve => {
    if(TRANSLATION_SEM.active < TRANSLATION_SEM.max) { TRANSLATION_SEM.active++; resolve(); }
    else { TRANSLATION_SEM.queue.push(resolve); }
  });
}
function translationRelease() {
  if(TRANSLATION_SEM.queue.length > 0) { const next = TRANSLATION_SEM.queue.shift(); next(); }
  else { TRANSLATION_SEM.active--; }
}
async function fetchTranslation(text, sourceLang) {
  if(!text) return null;
  var cleanText = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if(!cleanText) return null;
  try {
    var mmUrl = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(cleanText) + "&langpair=" + encodeURIComponent(sourceLang || "en") + "|nl&de=" + encodeURIComponent(MYMEMORY_EMAIL);
    var ctrl = new AbortController();
    var timer = setTimeout(() => ctrl.abort(), 8000);
    var r = await fetch(mmUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if(r.ok) {
      var data = await r.json();
      if(data?.responseData?.translatedText) {
        var out = data.responseData.translatedText;
        if(out && out.length > 1 && !out.includes("MYMEMORY WARNING") && !out.includes("QUERY LENGTH LIMIT") && out !== cleanText) return out;
      }
    }
  } catch(e) {}
  try {
    var proxy = window.CONFIG.proxies[0];
    var googleUrl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + encodeURIComponent(sourceLang || "auto") + "&tl=nl&dt=t&q=" + encodeURIComponent(cleanText);
    var ctrl2 = new AbortController();
    var timer2 = setTimeout(() => ctrl2.abort(), 8000);
    var r2 = await fetch(proxy + encodeURIComponent(googleUrl), { signal: ctrl2.signal });
    clearTimeout(timer2);
    if(r2.ok) {
      var data2 = await r2.json();
      if(data2 && Array.isArray(data2[0])) {
        var out2 = "";
        for(var i = 0; i < data2[0].length; i++) { var seg = data2[0][i]; if(seg && seg[0]) out2 += seg[0]; }
        if(out2 && out2.length > 1) return out2;
      }
    }
  } catch(e) {}
  return null;
}
async function translateItem(item) {
  if(!item || !item.title || !item.lang || item.lang === "nl" || !appStore.state.translateEnabled) return null;
  var key = titleHashKey(item.lang, item.title);
  if(appStore.state.translations[key]) return appStore.state.translations[key];
  
  // DB call zou hier moeten, voor nu houden we het bij memory voor de demo, 
  // maar je kunt je NewsDB.loadTranslation(key) hier weer inplakken.
  
  if(appStore.state.translationPending[key]) return null;
  appStore.state.translationPending[key] = true;
  await translationAcquire();
  try {
    var translated = await fetchTranslation(item.title, item.lang);
    if(translated) {
      appStore.state.translations[key] = translated;
      // NewsDB.saveTranslation(key, translated).catch(()=>{});
      return translated;
    }
  } finally {
    translationRelease();
    delete appStore.state.translationPending[key];
  }
  return null;
}
function updateCardTitle(item, translatedTitle) {
  var cards = document.querySelectorAll(".news-card[data-link]");
  for(var i = 0; i < cards.length; i++) {
    if(cards[i].getAttribute("data-link") === item.link) {
      var titleEl = cards[i].querySelector(".card-title");
      var origEl = cards[i].querySelector(".card-original");
      if(titleEl) { titleEl.textContent = translatedTitle; titleEl.setAttribute("dir", "ltr"); }
      if(!origEl && titleEl) {
        origEl = document.createElement("p");
        origEl.className = "card-original";
        origEl.setAttribute("dir", item.lang === "ar" ? "rtl" : "ltr");
        origEl.textContent = item.title;
        titleEl.parentNode.insertBefore(origEl, titleEl.nextSibling);
      }
      break;
    }
  }
}
async function translateVisibleItems(items) {
  if(!appStore.state.translateEnabled) return;
  var toTranslate = items.filter(it => {
    if(!it.lang || it.lang === "nl") return false;
    return !appStore.state.translations[titleHashKey(it.lang, it.title)];
  });
  if(!toTranslate.length) return;
  await Promise.all(toTranslate.map(async (it) => {
    var translated = await translateItem(it);
    if(translated) updateCardTitle(it, translated);
  }));
}

// Favorieten & Notificaties
function isFavorite(link) { return !!appStore.state.favorites[link]; }
function toggleFavorite(link, btnEl) {
  if(appStore.state.favorites[link]) {
    delete appStore.state.favorites[link];
    // NewsDB.removeFavorite(link);
    if(btnEl) { btnEl.classList.remove("active"); btnEl.textContent = "☆"; }
  } else {
    appStore.state.favorites[link] = Date.now();
    // NewsDB.saveFavorite(link);
    if(btnEl) { btnEl.classList.add("active"); btnEl.textContent = "★"; }
  }
  updateFavoritesCount();
  if(appStore.state.currentCat === "favorites") {
    // Triggert automatisch render via store subscribe
  }
}
function updateFavoritesCount() {
  var el = document.getElementById("favCount");
  if(el) el.textContent = Object.keys(appStore.state.favorites).length;
}

async function requestNotificationPermission() {
  if(!("Notification" in window)) return false;
  if(Notification.permission === "granted") return true;
  if(Notification.permission === "denied") return false;
  try { return (await Notification.requestPermission()) === "granted"; } catch(e) { return false; }
}

window.__setNotifications = async function(enabled) {
  if(enabled) {
    var ok = await requestNotificationPermission();
    if(!ok) { if(window.showToast) window.showToast("Notificaties geweigerd"); return; }
    appStore.state.notificationsEnabled = true;
    if(window.showToast) window.showToast("Breaking notificaties aan");
  } else {
    appStore.state.notificationsEnabled = false;
    if(window.showToast) window.showToast("Notificaties uit");
  }
};

window.__setTranslate = function(enabled) {
  appStore.state.translateEnabled = !!enabled;
  var btn = document.getElementById("toggleTranslate");
  if(btn) btn.classList.toggle("toggle-on", enabled);
  if(window.showToast) window.showToast(enabled ? "Vertaling aan" : "Vertaling uit");
  if(enabled) translateVisibleItems(filterItems().slice(0, 100));
};

// Core Logic: Load & Render
async function loadAllFeeds() {
  var session = ++appStore.state.loadSession;
  var itemsAtStart = appStore.state.items.slice();
  var minKeep = itemsAtStart.length;
  var active = window.FEEDS.filter(f => !appStore.state.disabled[f.n]);
  
  appStore.state.totalSources = active.length;
  appStore.state.failedSources = [];
  appStore.state.loadedSources = 0;
  
  var collected = [];
  var collectedLinks = {};
  var tried = 0;

  emitProgress(3);

  var progressiveTimer = setInterval(() => {
    if(session !== appStore.state.loadSession) { clearInterval(progressiveTimer); return; }
    if(collected.length === 0) return;
    var merged = dedupe(collected.concat(itemsAtStart));
    if(merged.length < minKeep) merged = itemsAtStart.slice();
    appStore.state.items = merged; // Triggert render!
  }, 1000);

  async function processOne(f) {
    if(session !== appStore.state.loadSession) return;
    tried++;
    try {
      var result = await fetchFeedWithFallback(f.url);
      var added = 0;
      result.items.slice(0, window.CONFIG.perFeed).forEach(rawIt => {
        var it = normalizeItem(rawIt);
        var titleClean = strip(it.title || "");
        var descClean = strip(it.description || "").slice(0, 300);
        var key = String(it.link || titleClean).toLowerCase().trim();
        if(key && !collectedLinks[key]) {
          collectedLinks[key] = 1;
          collected.push({
            title: titleClean, link: it.link || "#", desc: descClean, img: it.thumbnail || "",
            date: it.pubDate || "", source: f.n, cat: f.cat, tags: extractTags(titleClean, descClean, f.cat), lang: f.lang
          });
          added++;
        }
      });
      appStore.state.loadedSources++;
      if(appStore.state.health[f.n]) appStore.state.health[f.n].fails = 0;
    } catch(e) {
      appStore.state.failedSources.push(f.n);
      if(!appStore.state.health[f.n]) appStore.state.health[f.n] = {fails:0, last:0};
      appStore.state.health[f.n].fails++;
      appStore.state.health[f.n].last = Date.now();
      if(appStore.state.health[f.n].fails >= window.CONFIG.failThreshold) appStore.state.disabled[f.n] = true;
    }
    if(session === appStore.state.loadSession) {
      emitProgress(3 + Math.round((tried / Math.max(1, active.length)) * 92));
    }
  }

  var queue = active.slice();
  var workers = [];
  for(var i = 0; i < window.CONFIG.parallelWorkers; i++) {
    workers.push((async () => {
      while(queue.length && session === appStore.state.loadSession) {
        var f = queue.shift();
        if(f) await processOne(f);
      }
    })());
  }
  await Promise.all(workers);
  clearInterval(progressiveTimer);
  
  if(session !== appStore.state.loadSession) return;
  
  var finalItems = dedupe(collected.concat(itemsAtStart));
  if(finalItems.length < minKeep) finalItems = itemsAtStart.slice();
  
  appStore.state.items = finalItems; // EIND UPDATE: Triggert renderNews()
  
  emitProgress(100, true);
  detectBreaking();
  
  if(appStore.state.items.length === 0 && appStore.state.failedSources.length > 0) {
    if(window.showToast) window.showToast("Kon geen nieuws laden.");
  } else if(appStore.state.failedSources.length > 0) {
    if(window.showToast) window.showToast(appStore.state.failedSources.length + " bron(nen) faalden.");
  }
}

function detectBreaking() {
  if(Date.now() - appStore.state.breakingShownAt < 1800000) return;
  var now = Date.now();
  var recent = appStore.state.items.filter(it => {
    var age = now - tm(it.date);
    return age > 0 && age < 900000;
  }).slice(0, 40);
  if(recent.length < 3) return;
  
  var groups = [], used = {};
  recent.forEach((a, i) => {
    if(used[i]) return;
    var group = { items: [a], sources: [a.source] };
    used[i] = 1;
    var aText = (a.title + " " + a.desc).toLowerCase();
    var aKw = window.KEYWORDS_HIGH.filter(k => aText.indexOf(k) >= 0);
    recent.forEach((b, j) => {
      if(used[j] || i === j) return;
      var bText = (b.title + " " + b.desc).toLowerCase();
      if(aKw.filter(k => bText.indexOf(k) >= 0).length >= 2) {
        group.items.push(b);
        if(group.sources.indexOf(b.source) < 0) group.sources.push(b.source);
        used[j] = 1;
      }
    });
    if(group.sources.length >= 3) groups.push(group);
  });
  
  if(!groups.length) return;
  groups.sort((a, b) => b.sources.length - a.sources.length);
  var g = groups[0];
  appStore.state.breakingShownAt = Date.now();
  appStore.state.lastBreakingItem = g.items[0];
  
  var bcEl = document.getElementById("breakingCount");
  var btEl = document.getElementById("breakingTitle");
  var bmEl = document.getElementById("breakingMeta");
  if(bcEl) bcEl.textContent = g.sources.length;
  if(btEl) btEl.textContent = g.items[0].title.slice(0, 180);
  if(bmEl) bmEl.textContent = g.sources.slice(0, 4).join(" · ");
  
  var banner = document.getElementById("breakingBanner");
  if(banner) {
    banner.classList.add("show");
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => banner.classList.remove("show"), 30000);
  }
}

function filterItems() {
  var list = appStore.state.items.slice();
  if(appStore.state.currentCat === "favorites") {
    list = list.filter(it => !!appStore.state.favorites[it.link]);
  } else if(appStore.state.currentCat !== "all") {
    var cats = window.CAT_GROUPS?.[appStore.state.currentCat] ?? [appStore.state.currentCat];
    if(cats.length) list = list.filter(it => it.tags?.some(t => cats.includes(t)));
  }
  if(appStore.state.currentSearch) {
    var q = appStore.state.currentSearch;
    list = list.filter(it => (it.title + " " + it.desc + " " + it.source).toLowerCase().includes(q));
  }
  if(appStore.state.currentSort === "importance") {
    list.forEach(it => { if(it._score === undefined) it._score = scoreArticle(it); });
    list.sort((a, b) => b._score - a._score);
  } else {
    list.sort((a, b) => tm(b.date) - tm(a.date));
  }
  return list;
}

// PERFORMANCE: Chunked Rendering
function renderNews() {
  var list = filterItems();
  var grid = document.getElementById("feedGrid");
  var title = document.getElementById("newsTitle");
  var count = document.getElementById("newsCount");
  
  var titles = { all: "Laatste berichten", war: "Oorlog & conflict", mideast: "Midden-Oosten", europe: "Europa", nl: "Nederland", maroc: "Marokko", vs: "Verenigde Staten", sport: "Sport", favorites: "Favorieten" };
  var catLabel = titles[appStore.state.currentCat] || "Laatste berichten";
  if(title) title.textContent = catLabel;
  if(count) count.textContent = list.length + " artikelen";
  if(!grid) return;

  if(!list.length) {
    grid.innerHTML = appStore.state.items.length === 0 ? '<div class="empty-state"><div class="empty-icon">◌</div><div class="empty-msg">Laden...</div></div>' : '<div class="empty-state"><div class="empty-icon">◌</div><div class="empty-msg">Geen artikelen</div></div>';
    return;
  }

  var toShow = list.slice(0, 100);
  grid.classList.toggle("list-mode", appStore.state.viewMode === "list");
  grid.innerHTML = ""; // Clear voor chunking

  var index = 0;
  var chunkSize = 40;

  function renderNextChunk() {
    var fragment = document.createDocumentFragment();
    var end = Math.min(index + chunkSize, toShow.length);

    for(var i = index; i < end; i++) {
      var it = toShow[i];
      var isRead = !!appStore.state.readMap[it.link];
      var isFav = isFavorite(it.link);
      var sources = it.sources || [it.source];
      var multi = sources.length > 1;

      var article = document.createElement("article");
      article.className = "news-card " + (it.cat === "war" ? "war " : "") + (isRead ? "read" : "");
      article.dataset.link = it.link;
      article.dataset.idx = i;

      var html = "";
      if(it.img) html += '<div class="card-thumb"><img src="' + esc(it.img) + '" loading="lazy" onerror="this.parentNode.remove()"></div>';
      html += '<div class="card-body">';
      html += '<div class="card-meta"><span class="card-source">' + esc(it.source) + '</span><span class="card-sep">·</span><span>' + ago(it.date) + '</span>';
      if(multi) html += '<span class="card-multi">' + sources.length + ' bronnen</span>';
      html += '</div>';
      html += '<h3 class="card-title" dir="ltr">' + esc(it.title) + '</h3>';
      if(it.desc) html += '<p class="card-desc">' + esc(it.desc) + '</p>';
      html += '<div class="card-footer"><span>' + rtime(it.desc) + ' min</span><div class="card-actions">';
      html += '<button class="card-fav ' + (isFav ? "active" : "") + '" aria-label="Favoriet">' + (isFav ? "★" : "☆") + '</button>';
      html += '<button class="card-action card-share" aria-label="Delen">⇗</button>';
      html += '</div></div></div>';
      
      article.innerHTML = html;
      fragment.appendChild(article);
    }

    grid.appendChild(fragment);
    index = end;

    if(index < toShow.length) {
      requestAnimationFrame(renderNextChunk);
    } else {
      // Na volledige render, pas event listeners toe en vertaling
      applyCardListeners(toShow);
      if(appStore.state.translateEnabled) translateVisibleItems(toShow);
    }
  }

  requestAnimationFrame(renderNextChunk);
}

function applyCardListeners(toShow) {
  var grid = document.getElementById("feedGrid");
  if(!grid) return;
  Array.prototype.forEach.call(grid.querySelectorAll("article"), (art, i) => {
    var it = toShow[i];
    if(!it) return;
    art.addEventListener("click", function(e) {
      if(e.target.closest(".card-action") || e.target.closest(".card-fav")) return;
      if(!appStore.state.readMap[it.link]) {
        appStore.state.readMap[it.link] = Date.now();
        art.classList.add("read");
      }
      window.open(it.link, "_blank", "noopener");
    });

    var favBtn = art.querySelector(".card-fav");
    if(favBtn) favBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleFavorite(it.link, favBtn);
    });

    var share = art.querySelector(".card-share");
    if(share) share.addEventListener("click", function(e) {
      e.stopPropagation();
      if(navigator.share) navigator.share({ title: it.title, url: it.link }).catch(()=>{});
      else if(navigator.clipboard) {
        navigator.clipboard.writeText(it.link).then(() => { if(window.showToast) window.showToast("Link gekopieerd"); });
      }
    });

    var multi = art.querySelector(".card-multi");
    if(multi) multi.addEventListener("click", function(e) {
      e.stopPropagation();
      if(window.showToast) window.showToast(it.sources.join(", "));
    });
  });
}

function startAutoRefresh() {
  clearInterval(appStore.state.refreshTimer);
  if(!window.CONFIG.autoRefreshMs || window.CONFIG.autoRefreshMs <= 0) return;
  appStore.state.refreshTimer = setInterval(() => {
    if(document.hidden || appStore.state.isScrolling || (Date.now() - appStore.state.lastActivity) < window.CONFIG.pauseOnScrollMs) return;
    appStore.state.disabled = {};
    loadAllFeeds();
  }, window.CONFIG.autoRefreshMs);
}

async function initNews() {
  // NewsDB.open() zou hier moeten, voor nu direct laden
  var cached = []; // Vervang dit door: await NewsDB.loadItems(); indien gewenst
  if(cached.length) {
    appStore.state.items = cached;
  }
  
  updateFavoritesCount();
  renderNews();
  await loadAllFeeds();
  startAutoRefresh();
  
  window.addEventListener("scroll", () => {
    appStore.state.lastActivity = Date.now();
    appStore.state.isScrolling = true;
    clearTimeout(appStore.state.scrollTimer);
    appStore.state.scrollTimer = setTimeout(() => { appStore.state.isScrolling = false; }, 1500);
  }, {passive:true});
  
  ["touchstart", "mousedown", "keydown", "click"].forEach(ev => {
    window.addEventListener(ev, () => { appStore.state.lastActivity = Date.now(); }, {passive:true});
  });
}

window.__hardRefresh = async function() {
  if(!confirm('Verversen? Alle bronnen worden opnieuw geladen.')) return;
  try {
    if(window.showToast) window.showToast("Verversen gestart...");
    appStore.state.disabled = {};
    appStore.state.health = {};
    appStore.state.loadedSources = 0;
    appStore.state.totalSources = 0;
    appStore.state.failedSources = [];
    await loadAllFeeds();
    if(window.showToast) window.showToast("Verversen klaar");
  } catch(e) {
    if(window.showToast) window.showToast("Verversen mislukt");
  }
};

// DE BRUG: Legacy API voor app-v12.js, persist-v4.js, refresh-v12.js
window.NewsAPI = {
  init: initNews,
  reload: loadAllFeeds,
  setCat: (cat) => { appStore.state.currentCat = cat; }, // Triggert automatisch renderNews!
  setSort: (s) => { appStore.state.currentSort = s; },
  setSearch: (s) => { appStore.state.currentSearch = s.toLowerCase().trim(); },
  setView: (v) => { appStore.state.viewMode = v; },
  render: renderNews
};

// Subscribe de render functie aan state veranderingen
appStore.subscribe('items', renderNews);
appStore.subscribe('currentCat', renderNews);
appStore.subscribe('currentSort', renderNews);
appStore.subscribe('currentSearch', renderNews);
appStore.subscribe('viewMode', () => {
  var grid = document.getElementById("feedGrid");
  if(grid) grid.classList.toggle("list-mode", appStore.state.viewMode === "list");
});
appStore.subscribe('favorites', updateFavoritesCount);

console.log("[WAR DESK] news-v27.js geladen");