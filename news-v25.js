/* ============================================================
   WAR DESK v25.0 — Nieuws logica
   - v25: Auto-refresh pauzeert op achtergrond (batterij)
   - titleHashKey collision-safe (2 hashes)
   - Notificatie icon + badge
   ============================================================ */

window.__newsVersion = "v25.0";

var MYMEMORY_EMAIL = "hassanbadri814@gmail.com";

window.State = {
  items: [],
  currentCat: "all",
  currentSort: "importance",
  currentSearch: "",
  loadedSources: 0,
  totalSources: 0,
  failedSources: [],
  disabled: {},
  health: {},
  readMap: {},
  favorites: {},
  notificationsEnabled: false,
  lastActivity: Date.now(),
  isScrolling: false,
  scrollTimer: null,
  refreshTimer: null,
  viewMode: "cards",
  breakingShownAt: 0,
  lastBreakingItem: null,
  loadSession: 0,
  db: null,
  _lastRenderHash: "",
  translateEnabled: false,
  translations: {},
  translationPending: {}
};

var NewsDB = (function(){
  var db = null;
  var DB_NAME = "wardesk_v19_news";
  var DB_VERSION = 2;

  function open(){
    return new Promise(function(resolve){
      try{
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains("items")) d.createObjectStore("items", {keyPath:"link"});
          if(!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", {keyPath:"k"});
          if(!d.objectStoreNames.contains("translations")) d.createObjectStore("translations", {keyPath:"k"});
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      }catch(e){ resolve(null); }
    });
  }
  function put(store, value){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try{
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      }catch(e){ res(false); }
    });
  }
  function del(store, key){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try{
        var tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      }catch(e){ res(false); }
    });
  }
  function get(store, key){
    if(!db) return Promise.resolve(null);
    return new Promise(function(res){
      try{
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      }catch(e){ res(null); }
    });
  }
  function getAll(store){
    if(!db) return Promise.resolve([]);
    return new Promise(function(res){
      try{
        var tx = db.transaction(store, "readonly");
        var r = tx.objectStore(store).getAll();
        r.onsuccess = function(){ res(r.result || []); };
        r.onerror = function(){ res([]); };
      }catch(e){ res([]); }
    });
  }
  function saveItems(items){
    if(!db) return Promise.resolve();
    return new Promise(function(res){
      try{
        var tx = db.transaction("items", "readwrite");
        var store = tx.objectStore("items");
        store.clear();
        var max = (window.CONFIG && CONFIG.maxCacheItems) ? CONFIG.maxCacheItems : 3000;
        items.slice(0, max).forEach(function(it){
          store.put({
            link: it.link, title: it.title, desc: it.desc, img: it.img,
            date: it.date, source: it.source, cat: it.cat, lang: it.lang,
            sources: it.sources, tags: it.tags || []
          });
        });
        tx.oncomplete = function(){ res(); };
        tx.onerror = function(){ res(); };
      }catch(e){ res(); }
    });
  }
  function pruneOldReads(){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try{
        var cutoffRead = Date.now() - 90 * 86400000;
        var cutoffFav = Date.now() - 365 * 86400000;
        var tx = db.transaction("meta", "readwrite");
        var store = tx.objectStore("meta");
        var req = store.openCursor();
        req.onsuccess = function(e){
          var cur = e.target.result;
          if(!cur) return;
          var rec = cur.value;
          var k = rec && rec.k || "";
          var v = rec && rec.v || 0;
          if(k.indexOf("read_") === 0 && v < cutoffRead){ cur.delete(); }
          else if(k.indexOf("fav_") === 0 && v < cutoffFav){ cur.delete(); }
          cur.continue();
        };
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      }catch(e){ res(false); }
    });
  }
  return {
    open: open, put: put, get: get, getAll: getAll, saveItems: saveItems,
    pruneOldReads: pruneOldReads,
    loadItems: function(){
      return getAll("items").then(function(items){
        return items.sort(function(a,b){ return tm(b.date) - tm(a.date); });
      });
    },
    saveRead: function(link){ return put("meta", {k:"read_" + link, v: Date.now()}); },
    loadReadMap: function(){
      return getAll("meta").then(function(all){
        var map = {};
        all.forEach(function(rec){
          if(rec.k && rec.k.indexOf("read_") === 0) map[rec.k.slice(5)] = rec.v;
        });
        return map;
      });
    },
    saveHealth: function(health){ return put("meta", {k:"health", v: health}); },
    loadHealth: function(){
      return get("meta", "health").then(function(rec){ return (rec && rec.v) ? rec.v : {}; });
    },
    saveTranslation: function(key, value){
      return put("translations", {k: key, v: value, t: Date.now()});
    },
    loadTranslation: function(key){
      return get("translations", key).then(function(rec){ return (rec && rec.v) ? rec.v : null; });
    },
    saveFavorite: function(link){ return put("meta", {k:"fav_" + link, v: Date.now()}); },
    removeFavorite: function(link){ return del("meta", "fav_" + link); },
    loadFavorites: function(){
      return getAll("meta").then(function(all){
        var map = {};
        all.forEach(function(rec){
          if(rec.k && rec.k.indexOf("fav_") === 0) map[rec.k.slice(4)] = rec.v;
        });
        return map;
      });
    }
  };
})();

function tm(d){ var x = new Date(d); return isNaN(x) ? 0 : x.getTime(); }
function ago(d){
  var t = tm(d); if(!t) return "";
  var diff = (Date.now() - t) / 1000;
  if(diff < 60) return "nu";
  if(diff < 3600) return Math.floor(diff / 60) + "m";
  if(diff < 86400) return Math.floor(diff / 3600) + "u";
  return Math.floor(diff / 86400) + "d";
}
function rtime(t){ return Math.max(1, Math.round((t || "").split(/\s+/).length / 200)); }
function strip(s){ return (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

function emitProgress(pct, done){
  try{
    document.dispatchEvent(new CustomEvent("wardesk:feedprogress", {
      detail: { pct: Math.max(0, Math.min(100, Math.round(pct))), done: !!done }
    }));
  }catch(e){}
}

/* ============================================================
   TAGS — content-based + bron-categorie
   ============================================================ */
function extractTags(title, desc, sourceCat){
  var tags = [];
  var t = ((title || "") + " " + (desc || "")).toLowerCase();

  if(sourceCat === "nl") tags.push("nl");
  if(sourceCat === "be" || sourceCat === "de" || sourceCat === "fr" || sourceCat === "it" || sourceCat === "uk") tags.push("europe");
  if(sourceCat === "us") tags.push("vs");
  if(sourceCat === "maroc") tags.push("maroc");
  if(sourceCat === "eg" || sourceCat === "sa" || sourceCat === "ae" || sourceCat === "qa" || sourceCat === "il" || sourceCat === "mideast") tags.push("mideast");
  if(sourceCat === "ukraine" || sourceCat === "gaza" || sourceCat === "yemen" || sourceCat === "iran" || sourceCat === "sudan" || sourceCat === "war") tags.push("war");
  if(sourceCat === "sport") tags.push("sport");

  var sportStrong = /\b(eredivisie|eerste divisie|knvb|johan cruijff schaal|champions league|europa league|conference league|wk voetbal|ek voetbal|formule 1|grand prix|motogp|tour de france|giro d'italia|vuelta|wimbledon|roland garros|us open tennis|australian open|olympische spelen|glory kickboxing|ufc|nba|nfl|nhl|mlb)\b/.test(t);
  var sportTeam = /\b(ajax|psv|feyenoord|az alkmaar|fc utrecht|fc twente|vitesse|sc heerenveen|sparta rotterdam|willem ii|go ahead eagles|pec zwolle|rkc waalwijk|fortuna sittard|excelsior|almere city|heracles|n\.e\.c\.|real madrid|barcelona|atletico madrid|manchester united|manchester city|liverpool|chelsea|arsenal|tottenham|juventus|inter milan|ac milan|bayern münchen|borussia dortmund|paris saint-germain|psg)\b/.test(t);
  var warBlock = /\b(airstrike|raketaanval|invasion|invasie|massacre|bloedbad|shelling|beschieting|offensief|oorlog|war)\b/.test(t);
  if((sportStrong || sportTeam) && !warBlock && tags.indexOf("sport") === -1){
    tags.push("sport");
  }

  var mideastContent = /\b(gaza|rafah|khan younis|hamas|hezbollah|idf|netanyahu|westelijke jordaanoever|palestijn|palestinian|israelisch|israeli|iran|irgc|tehran|khamenei|syrië|syria|damascus|assad|libanon|lebanon|beirut|jemen|yemen|houthi|irak|iraq|bagdad|saudi-arabië|riyadh|qatar|doha|aboe dhabi|dubai|jordanië|amman|jeruzalem|jerusalem|tel aviv|beiroet)\b/.test(t);
  if(mideastContent && tags.indexOf("mideast") === -1) tags.push("mideast");

  var warScore = 0;
  if(/\b(airstrike|air strike|raketaanval|missile strike|drone strike|luchtaanval|invasion|invaded|invasie|massacre|bloedbad|genocide|ceasefire|staakt-het-vuren|offensive|offensief|bombing|bombardement|shelling|beschieting|artillery|artillerie|war crime|oorlogsmisdaad|chemical attack|gifgasaanval)\b/.test(t)) warScore += 3;
  if(/\b(killed|gedood|doden|slachtoffers|gewonden|troops|troepen|soldiers|soldaat|militairen|military|combat|gevecht|tank|tanks|frontlinie|frontline)\b/.test(t)) warScore += 1;
  if(/\b(oekraïne|ukraine|zelensky|zelenski|kyiv|kiev|kharkiv|odesa|donbas|crimea|donetsk|luhansk|marioepol|mariupol|poetin|putin|kremlin|moskou)\b/.test(t)) warScore += 2;
  if(warScore >= 2 && tags.indexOf("war") === -1) tags.push("war");

  var nlContent = /\b(nederland|nederlands|dutch|holland|amsterdam|rotterdam|den haag|the hague|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|haarlem|arnhem|apeldoorn|enschede|amersfoort|zwolle|leeuwarden|maastricht|tweede kamer|eerste kamer|kabinet|minister-president|premier rutte|mark rutte|geert wilders|d66|vvd|cda|pvda|groenlinks|forum voor democratie|sp partij|christenunie|sgr|bbb|nieuw sociaal contract|gemeente|provincie|randstad|noord-holland|zuid-holland|flevoland|gelderland|overijssel|drenthe|friesland|zeeland|limburg|noord-brabant)\b/.test(t);
  if(nlContent && tags.indexOf("nl") === -1) tags.push("nl");

  if(/\b(marokko|morocco|maroc|rabat|casablanca|marrakech|agadir|fes|tanger|sahara|marokkaans|marokkaanse)\b/.test(t) && tags.indexOf("maroc") === -1){
    tags.push("maroc");
  }

  var europeStrong = /\b(europese unie|european union|europese commissie|european commission|europese parlement|european parliament|brussel|brussels|nato|europese raad|eurozone|schengen|europese centrale bank|europese verkiezing)\b/.test(t);
  var europeCountry = /\b(duitsland|germany|frankrijk|france|spanje|spain|españa|italië|italy|verenigd koninkrijk|united kingdom|engeland|england|polen|poland|oostenrijk|austria|zwitserland|switzerland|zweden|sweden|noorwegen|norway|denemarken|denmark|finland|ierland|ireland|portugal|griekenland|greece|tsjechië|czech|hongarije|hungary|roemenië|romania|bulgarije|bulgaria|belgië|belgium)\b/.test(t);
  if((europeStrong || europeCountry) && tags.indexOf("europe") === -1 && tags.indexOf("nl") === -1){
    tags.push("europe");
  }

  return tags.filter(function(v, i, a){ return a.indexOf(v) === i; });
}

function ensureTags(items){
  return items.map(function(it){
    it.tags = extractTags(it.title, it.desc || "", it.cat);
    return it;
  });
}

function scoreArticle(it){
  var score = 0;
  var sources = (it.sources || [it.source]).length;
  score += sources * 12;
  var t = (it.title + " " + (it.desc || "")).toLowerCase();
  for(var i = 0; i < KEYWORDS_HIGH.length; i++) if(t.indexOf(KEYWORDS_HIGH[i]) >= 0) score += 6;
  for(var j = 0; j < KEYWORDS_MED.length; j++) if(t.indexOf(KEYWORDS_MED[j]) >= 0) score += 3;
  if(HIGH_PRIORITY.indexOf(it.source) >= 0) score += 15;
  var ageMin = Math.max(0, (Date.now() - tm(it.date)) / 60000);
  score += Math.max(0, 40 - ageMin / 2);
  return score;
}

function titleKey(title){
  return (title || "").toLowerCase().replace(/[^\w\s]/g, "")
    .split(/\s+/).filter(function(w){ return w.length > 3; })
    .slice(0, 8).sort().join(" ");
}
function dedupe(items){
  var map = new Map();
  items.forEach(function(it){
    var key = titleKey(it.title);
    if(!key){ map.set("__" + Math.random(), it); return; }
    if(!map.has(key)){
      var copy = {}; for(var k in it) copy[k] = it[k];
      copy.sources = [it.source];
      copy.tags = it.tags ? it.tags.slice() : [];
      map.set(key, copy);
    } else {
      var e = map.get(key);
      if(e.sources.indexOf(it.source) < 0) e.sources.push(it.source);
      if(it.tags){
        it.tags.forEach(function(t){
          if(e.tags.indexOf(t) === -1) e.tags.push(t);
        });
      }
    }
  });
  return Array.from(map.values());
}

function parseRssXml(xmlText){
  try{
    var doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if(doc.getElementsByTagName("parsererror").length) return [];
    var nodes = doc.getElementsByTagName("item");
    if(!nodes.length) nodes = doc.getElementsByTagName("entry");
    var out = [];
    for(var i = 0; i < nodes.length; i++){
      var node = nodes[i];
      var gtxt = function(tag){
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
      out.push({
        title: title, link: link, description: desc, pubDate: date,
        thumbnail: thumb, enclosure: encLink ? {link: encLink} : null
      });
    }
    return out;
  }catch(e){ return []; }
}

function normalizeItem(it){
  if(it == null) return {title:"", link:"", description:"", pubDate:"", thumbnail:""};
  if(typeof it === "string") return {title: it, link:"", description:"", pubDate:"", thumbnail:""};
  if(typeof it !== "object") return {title: String(it), link:"", description:"", pubDate:"", thumbnail:""};
  if(it.fields) it = Object.assign({}, it, it.fields);
  if(it._source) it = Object.assign({}, it, it._source);
  var raw = it.description || it.content || it.summary || it["content:encoded"] || it.contentSnippet || "";
  var enc = it.enclosure && (it.enclosure.link || it.enclosure.url);
  var thumb = it.thumbnail || enc || it.image || "";
  if(!thumb && typeof raw === "string"){
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

if(!window.__proxyHealth) window.__proxyHealth = {};
var PROXY_COOLDOWN_MS = 30000;
var PROXY_FAIL_THRESHOLD = 5;
var googleNewsSem = { active: 0, max: 2, queue: [] };

function googleNewsAcquire(){
  return new Promise(function(resolve){
    if(googleNewsSem.active < googleNewsSem.max){ googleNewsSem.active++; resolve(); }
    else { googleNewsSem.queue.push(resolve); }
  });
}
function googleNewsRelease(){
  if(googleNewsSem.queue.length > 0){ var next = googleNewsSem.queue.shift(); next(); }
  else { googleNewsSem.active--; }
}
function markProxyFail(p){
  if(!window.__proxyHealth[p]) window.__proxyHealth[p] = { fails: 0, disabledUntil: 0 };
  window.__proxyHealth[p].fails++;
  if(window.__proxyHealth[p].fails >= PROXY_FAIL_THRESHOLD){
    window.__proxyHealth[p].disabledUntil = Date.now() + PROXY_COOLDOWN_MS;
    window.__proxyHealth[p].fails = 0;
  }
}
function markProxyOk(p){
  if(!window.__proxyHealth[p]) window.__proxyHealth[p] = { fails: 0, disabledUntil: 0 };
  window.__proxyHealth[p].fails = 0;
  window.__proxyHealth[p].disabledUntil = 0;
}
function parseResponse(txt){
  var trimmed = txt.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  if(trimmed.charAt(0) === "<") return { shape: "xml", items: parseRssXml(txt) };
  try{
    var data = JSON.parse(txt);
    var items = [];
    if(data.items && data.items.length) items = data.items;
    else if(data.entries && data.entries.length) items = data.entries;
    else if(data.data && data.data.items && data.data.items.length) items = data.data.items;
    else if(Array.isArray(data)) items = data;
    return { shape: "json", items: items };
  }catch(e){ return { shape: "?", items: [] }; }
}

async function fetchFeedWithFallback(feedUrl){
  var isGoogleNews = /news\.google\.com/.test(feedUrl);
  if(isGoogleNews) await googleNewsAcquire();
  try {
    var proxies;
    if(isGoogleNews && CONFIG.googleNewsProxies && CONFIG.googleNewsProxies.length) proxies = CONFIG.googleNewsProxies;
    else if(CONFIG.proxies && CONFIG.proxies.length) proxies = CONFIG.proxies;
    else proxies = [CONFIG.proxies[0]];
    var lastErr = null;
    for(var i = 0; i < proxies.length; i++){
      var p = proxies[i];
      var health = window.__proxyHealth[p];
      if(health && health.disabledUntil && Date.now() < health.disabledUntil) continue;
      try{
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, CONFIG.fetchTimeoutMs);
        var r = await fetch(p + encodeURIComponent(feedUrl), {signal: ctrl.signal});
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        var txt = await r.text();
        var parsed = parseResponse(txt);
        if(!parsed.items.length) throw new Error("0 items");
        markProxyOk(p);
        return { items: parsed.items, shape: parsed.shape, proxyIdx: i, viaGoogleNews: isGoogleNews };
      }catch(e){
        lastErr = e;
        markProxyFail(p);
      }
    }
    throw lastErr || new Error("alle proxies faalden");
  } finally {
    if(isGoogleNews) googleNewsRelease();
  }
}

var TRANSLATION_SEM = { active: 0, max: 3, queue: [] };

function titleHashKey(lang, title) {
  var str = (lang || "xx") + "|" + (title || "");
  var h1 = 5381;
  var h2 = 52711;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    h1 = ((h1 << 5) + h1) ^ c;
    h2 = ((h2 << 5) + h2 + c) | 0;
  }
  var a = (h1 >>>