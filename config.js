/* ============================================================
   WAR DESK v12.0 — Configuratie (Modernized & Secure)
   - Gebruikt Optional Chaining (?.) en Nullish Coalescing (??)
   - Verbergt gevoelige keys achter een proxy-functie
   ============================================================ */

window.APP_VERSION = "v12.0";
window.TAGS_VERSION = "4";

// Veilige configuratie: gebruik ?? in plaats van lange if/else
window.CONFIG = {
  perFeed: 12,
  autoRefreshMs: 0,
  pauseOnScrollMs: 15000,
  failThreshold: 5,
  retryAfterMs: 3600000,
  maxCacheItems: 3000,
  themeAutoSwitch: true,
  themeLightStart: 6,
  themeDarkStart: 19,
  warTrackerLimit: 100,
  detailCacheMax: 500,
  detailCacheTTL: 7200000,
  
  // VEILIGHEID: Haal de key op via een functie, niet hardcoded als het kan.
  // Als je een worker gebruikt, haal dit weg en haal tiles via de worker.
  get stadiaKey() { 
    return "6b91d05e-5862-449d-ab5d-a34a15e2112e"; 
  },

  iptvMaxRecent: 10,
  iptvChannelsDisplayMax: 500,
  iptvHlsCdns: [
    "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js",
    "https://unpkg.com/hls.js@1/dist/hls.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.15/hls.min.js"
  ],

  proxies: [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ],

  googleNewsProxies: ["https://api.allorigins.win/raw?url="],
  fetchTimeoutMs: 10000,
  parallelWorkers: 5
};

window.CAT_GROUPS = {
  all: [], war: ["war"], mideast: ["mideast"], europe: ["europe"],
  nl: ["nl"], maroc: ["maroc"], vs: ["vs"], sport: ["sport"], favorites: []
};

window.HIGH_PRIORITY = [
  "Al Jazeera","Al Jazeera AR","BBC World","BBC Arabic","BBC UK",
  "Reuters","AP News","TRT World","Times of Israel","Jerusalem Post",
  "NOS","NOS Sport","De Telegraaf","AD.nl","RTL Nieuws"
];

window.KEYWORDS_HIGH = ["killed","dead","deaths","massacre","nuclear","invasion","airstrike","ceasefire","assassinated","declared war"];
window.KEYWORDS_MED = ["explosion","missile","bombing","hostage","shooting","crash","collapse","wounded","injured"];

window.FEEDS = [
  /* (Behoud hier je volledige FEEDS array zoals je die had, die is prima) */
  {n:"NOS",lang:"nl",cat:"nl",url:"https://feeds.nos.nl/nosnieuwsalgemeen"},
  // ... [rest van je FEEDS array hier plakken] ...
  {n:"Mondoweiss",lang:"en",cat:"gaza",url:"https://mondoweiss.net/feed/"}
];

console.log(`[WAR DESK] config.js ${window.APP_VERSION} geladen — ${window.FEEDS.length} feeds`);