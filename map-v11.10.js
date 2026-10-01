/* ============================================================
   WAR DESK v14.5.2 — Conflictkaart + Wereldkaart-integratie
   - v14.5.2: Live-list en detail-paneel halen vertaling op bij
             render-tijd (was: snapshot → geen NL bij OSINT)
   - v14.5.1: Zoeken + tijd-filter triggeren nu ook inzoomen
   - v14.5:   Zoekveld + tijdfilter (24u/7d/30d)
   - v14.4:   WorldMap init + refresh + toggle
   - v14.3:   "Alles"-filter
   - v14.2:   rerender bij translation:added
   - v14.1:   dedup-badge voor cluster-events
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){
    try{ wdLog.info.apply(null, ["[MAP]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  LOG("v14.5.2 geladen — wereldkaart + live-filters + vertaling");

  var CATEGORIES = {
    all:      { label: "Alles",    color: "#e0a857", icon: "ph-globe-hemisphere-west" },
    militair: { label: "Militair", color: "#e63950", icon: "ph-crosshair" },
    crime:    { label: "Crime",    color: "#a855f7", icon: "ph-handcuffs" },
    politiek: { label: "Politiek", color: "#3b82f6", icon: "ph-bank" },
    protest:  { label: "Protest",  color: "#f59e0b", icon: "ph-megaphone" },
    civiel:   { label: "Civiel",   color: "#6b7a93", icon: "ph-warning" }
  };

  var FILTER_ORDER = ["all", "militair", "crime", "politiek", "protest", "civiel"];

  var TIME_FILTERS = [
    { key: "24h", label: "24u", hours: 24 },
    { key: "7d",  label: "7d",  hours: 168 },
    { key: "30d", label: "30d", hours: 720 },
    { key: "all", label: "Alles", hours: 0 }
  ];

  function resolveColor(event){
    if(!event) return CATEGORIES.civiel.color;
    var cat = event.category || "civiel";
    var subtype = (event.subtype || "").toLowerCase();
    if(cat === "crime"){
      if(/cyber|fraude|phishing|hacking/.test(subtype)) return "#06b6d4";
      return CATEGORIES.crime.color;
    }
    return CATEGORIES[cat] ? CATEGORIES[cat].color : CATEGORIES.civiel.color;
  }

  var ICONS = {
    militair: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 21 L2 21 Z"/></svg>',
    crime:    '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>',
    politiek: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 8 L22 10 L2 10 L2 8 Z M4 12 L4 20 L8 20 L8 12 Z M10 12 L10 20 L14 20 L14 12 Z M16 12 L16 20 L20 20 L20 12 Z M2 20 L22 20 L22 22 L2 22 Z"/></svg>',
    protest:  '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"/></svg>',
    civiel:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>'
  };

  function iconFor(cat){ return ICONS[cat] || ICONS.civiel; }

  function resolveTypeConfig(e){
    if(!e) return { color: CATEGORIES.civiel.color, filter: "civiel", label: "Onbekend" };
    var cat = e.category || "civiel";
    var cfg = CATEGORIES[cat] || CATEGORIES.civiel;
    return { color: resolveColor(e), filter: cat, label: e.subtype || cfg.label };
  }

  var MAP = {
    instance: null, cluster: null, tileLayers: {}, events: [],
    militaryEvents: [], hotspots: [],
    currentFilter: "militair",
    refreshTimer: null, isFullscreen: false,
    currentTheme: "dark", themeObserver: null, _timeModeInterval: null,
    currentDetailEvent: null, _lastNewsCount: 0, _busBound: false,
    _lastRenderTime: 0,
    _lastZoomHash: "",
    _counters: { militair:0, crime:0, politiek:0, protest:0, civiel:0 },
    _worldMapEnabled: true,
    liveSearchQuery: "",
    liveTimeFilter: "7d"
  };

  var TILES = {
    dark: { style: "https://tiles.openfreemap.org/styles/dark", attribution: "© OpenFreeMap" },
    light: { style: "https://tiles.openfreemap.org/styles/positron", attribution: "© OpenFreeMap" }
  };

  function detectTheme(){ return document.body.classList.contains("light") ? "light" : "dark"; }

  function updateMetaTheme(){
    var meta = document.querySelector('meta[name="theme-color"]');
    if(!meta) return;
    var oled = document.documentElement.getAttribute("data-oled") === "true";
    var light = document.body.classList.contains("light");
    meta.setAttribute("content", oled ? "#000000" : (light ? "#f6f4ee" : "#070c16"));
  }

  function switchTile(theme){
    if(!MAP.instance) return;
    var cfg = TILES[theme] || TILES.dark;
    if(MAP.tileLayers.dark && MAP.instance.hasLayer(MAP.tileLayers.dark)) MAP.instance.removeLayer(MAP.tileLayers.dark);
    if(MAP.tileLayers.light && MAP.instance.hasLayer(MAP.tileLayers.light)) MAP.instance.removeLayer(MAP.tileLayers.light);
    if(!MAP.tileLayers[theme]){
      if(L.maplibreGL){
        MAP.tileLayers[theme] = L.maplibreGL({ style: cfg.style, attribution: cfg.attribution });
      } else {
        MAP.tileLayers[theme] = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
      }
    }
    MAP.tileLayers[theme].addTo(MAP.instance);
  }

  function observeThemeChanges(){
    if(MAP.themeObserver) return;
    MAP.themeObserver = new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if(m.attributeName === "class"){
          var newTheme = detectTheme();
          if(newTheme !== MAP.currentTheme){
            MAP.currentTheme = newTheme;
            switchTile(newTheme);
            updateMetaTheme();
            if (MAP.events.length && MAP.cluster) setTimeout(renderMarkers, 200);
          }
        }
      });
    });
    MAP.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function checkTimeMode(){
    if(document.hidden) return;
    if(!window.CONFIG || !CONFIG.themeAutoSwitch) return;
    var manualUntil = 0;
    try {
      var stored = window.WDStorage ? WDStorage.get("theme_manual_until", "0") : "0";
      manualUntil = parseInt(stored, 10) || 0;
    }catch(e){}
    if(Date.now() < manualUntil) return;
    var hour = new Date().getHours();
    var shouldBeLight = hour >= CONFIG.themeLightStart && hour < CONFIG.themeDarkStart;
    var isLight = document.body.classList.contains("light");
    if(shouldBeLight !== isLight){
      document.documentElement.classList.toggle("light", shouldBeLight);
      document.body.classList.toggle("light", shouldBeLight);
      if(window.WDStorage) WDStorage.set("theme", shouldBeLight ? "light" : "dark");
      updateMetaTheme();
    }
  }

  function markManualTheme(){
    try{
      var until = Date.now() + 8 * 3600 * 1000;
      if(window.WDStorage) WDStorage.set("theme_manual_until", until);
    }catch(e){}
  }

  function injectMapStyles(){
    if($("wdMapStyles")) return;
    var s = document.createElement("style");
    s.id = "wdMapStyles";
    s.textContent =
      ".leaflet-control-attribution{display:none!important}" +
      ".leaflet-container{background:#05080f!important}" +
      "body.light .leaflet-container{background:#f5f5f5!important}" +
      "html[data-oled='true'] .leaflet-container{background:#000000!important}" +
      ".wd-marker{background:transparent!important;border:none!important}" +
      ".wd-marker-inner{position:relative;width:12px;height:12px;display:grid;place-items:center}" +
      ".wd-marker-icon{width:10px;height:10px;display:grid;place-items:center;position:relative;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,.85)) drop-shadow(0 0 3px currentColor);}" +
      ".wd-marker-icon svg{width:100%;height:100%;display:block;stroke:#070c16;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round;}" +
      ".wd-marker-pulse{position:absolute;inset:0;border-radius:50%;background:currentColor;opacity:.22;z-index:1;animation:wdMarkerPulse 2.6s ease-out infinite}" +
      "@keyframes wdMarkerPulse{0%{transform:scale(.5);opacity:.35}100%{transform:scale(2);opacity:0}}" +
      "@media (prefers-reduced-motion: reduce){.wd-marker-pulse{animation:none!important;opacity:.15!important}}" +
      ".marker-cluster-small,.marker-cluster-medium,.marker-cluster-large{background:transparent!important}" +
      ".marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div{background:linear-gradient(135deg,#1e3a5f,#3b6ba8)!important;color:#ffffff!important;font-weight:800!important;border:1px solid rgba(255,255,255,.75)!important;box-shadow:0 1px 3px rgba(0,0,0,.55),0 0 6px rgba(59,130,246,.3)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:Inter,sans-serif!important;}" +
      ".marker-cluster-small, .marker-cluster-small div{width:14px!important;height:14px!important}" +
      ".marker-cluster-small{margin-left:-7px!important;margin-top:-7px!important}" +
      ".marker-cluster-medium, .marker-cluster-medium div{width:18px!important;height:18px!important}" +
      ".marker-cluster-medium{margin-left:-9px!important;margin-top:-9px!important}" +
      ".marker-cluster-large, .marker-cluster-large div{width:22px!important;height:22px!important}" +
      ".marker-cluster-large{margin-left:-11px!important;margin-top:-11px!important}" +
      ".marker-cluster div span{font-size:.5rem!important;line-height:1!important;letter-spacing:-.02em!important}" +
      ".map-wrap.fullscreen .map-legend{display:none!important}" +
      ".map-wrap.fullscreen .map-controls .map-ctrl[data-role='full']{display:none!important}" +
      ".wd-map-close{display:none!important;position:absolute;top:.8rem;right:.8rem;z-index:600;width:42px;height:42px;border-radius:50%;background:rgba(10,16,28,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);color:#e6ebf5;font-size:1.15rem;font-weight:400;line-height:1;place-items:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.6);transition:all .18s}" +
      ".wd-map-close:hover{background:rgba(20,28,44,.95);border-color:rgba(255,255,255,.25);transform:rotate(90deg)}" +
      ".map-wrap.fullscreen .wd-map-close{display:grid!important}" +
      ".map-wrap.fullscreen .map-controls{top:.8rem;left:.8rem;right:auto}" +
      ".wd-hotspot-strip{display:none!important}" +
      ".wd-detail-foot{flex-wrap:wrap!important}" +
      ".wd-detail-type{text-transform:uppercase;letter-spacing:.5px;font-size:10px;font-weight:800}" +
      ".live-event-mil{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;background:rgba(255,60,60,0.15);color:#ff5050;font-size:9.5px;font-weight:700;letter-spacing:0.5px}" +
      ".live-event-multi{display:inline-flex;align-items:center;gap:.2rem;padding:.05rem .4rem;border-radius:5px;background:rgba(96,165,250,.15);color:#93c5fd;border:1px solid rgba(96,165,250,.35);font-size:.58rem;font-weight:800;letter-spacing:.02em;margin-left:.25rem}" +
      ".live-event-original{font-size:.72rem;opacity:.55;margin-top:.2rem;line-height:1.35;font-style:italic}" +
      ".live-filter[data-cat='all']{border-color:rgba(224,168,87,.4)}" +
      ".live-filter[data-cat='all'].active{background:rgba(224,168,87,.15);color:#e0a857;border-color:#e0a857}" +
      ".pop-sources-list{margin-top:.4rem;font-size:.72rem;color:var(--ink-3);line-height:1.5}" +
      ".pop-sources-list strong{color:var(--ink);font-weight:700}" +
      ".wm-toggle{position:absolute;top:.7rem;left:.7rem;z-index:500;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(226,168,87,.4);color:#e0a857;font-size:.72rem;font-weight:700;padding:.5rem .75rem;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;transition:all .18s}" +
      ".wm-toggle:hover{background:rgba(226,168,87,.2);box-shadow:0 0 14px rgba(224,168,87,.4)}" +
      ".wm-toggle.off{opacity:.55;color:#8a94a8;border-color:rgba(255,255,255,.15)}" +
      ".wm-toggle svg{width:14px;height:14px}" +
      ".live-search-row{display:flex;gap:.4rem;padding:.4rem .6rem;border-bottom:1px solid var(--line);align-items:center;flex-wrap:wrap;}" +
      ".live-search-wrap{flex:1;min-width:140px;position:relative;}" +
      ".live-search-wrap input{width:100%;padding:.4rem .7rem .4rem 1.9rem;background:var(--bg-3);border:1px solid var(--line-2);color:var(--ink);border-radius:7px;font-size:.72rem;outline:none;font-family:inherit;}" +
      ".live-search-wrap input:focus{border-color:var(--amber);box-shadow:0 0 0 2px var(--accent-glow);}" +
      ".live-search-wrap .live-search-icon{position:absolute;left:.5rem;top:50%;transform:translateY(-50%);width:12px;height:12px;color:var(--ink-3);pointer-events:none;}" +
      ".live-search-clear{position:absolute;right:.3rem;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--ink-3);font-size:.9rem;cursor:pointer;padding:.2rem .4rem;border-radius:5px;font-family:inherit;line-height:1;display:none;}" +
      ".live-search-wrap.has-value .live-search-clear{display:block;}" +
      ".live-search-clear:hover{color:#f87171;}" +
      ".live-time-filter{display:inline-flex;background:var(--bg-3);border:1px solid var(--line-2);border-radius:7px;padding:1px;gap:1px;}" +
      ".live-time-filter button{background:transparent;border:none;color:var(--ink-2);font-size:.65rem;font-weight:700;padding:.32rem .55rem;border-radius:5px;cursor:pointer;font-family:inherit;transition:all .15s;letter-spacing:.02em;}" +
      ".live-time-filter button:hover{color:var(--amber);}" +
      ".live-time-filter button.active{background:rgba(224,168,87,.25);color:var(--amber);}" +
      ".live-empty-filter{padding:1rem;text-align:center;color:var(--ink-3);font-size:.75rem;}" +
      ".live-empty-filter button{background:var(--bg-3);border:1px solid var(--line-2);color:var(--amber);padding:.35rem .75rem;border-radius:6px;font-size:.7rem;font-weight:700;cursor:pointer;font-family:inherit;margin-top:.5rem;}";
    document.head.appendChild(s);
  }

  function enterFullscreen(){
    var wrap = document.querySelector(".map-wrap");
    if(!wrap || wrap.classList.contains("fullscreen")) return;
    wrap.classList.add("fullscreen");
    MAP.isFullscreen = true;
    if(MAP.instance) setTimeout(function(){ MAP.instance.invalidateSize(); }, 250);
  }
  function exitFullscreen(){
    var wrap = document.querySelector(".map-wrap");
    if(!wrap) return;
    wrap.classList.remove("fullscreen");
    MAP.isFullscreen = false;
    if(MAP.instance) setTimeout(function(){ MAP.instance.invalidateSize(); }, 250);
  }
  function ensureFullscreenClose(){
    var wrap = document.querySelector(".map-wrap");
    if(!wrap || wrap.querySelector(".wd-map-close")) return;
    var btn = document.createElement("button");
    btn.className = "wd-map-close";
    btn.setAttribute("aria-label", "Sluiten");
    btn.textContent = "✕";
    btn.addEventListener("click", function(e){ e.stopPropagation(); exitFullscreen(); });
    wrap.appendChild(btn);
  }

  function ensureWorldMapToggle(){
    var wrap = document.querySelector(".map-wrap");
    if(!wrap || wrap.querySelector(".wm-toggle")) return;
    var btn = document.createElement("button");
    btn.className = "wm-toggle" + (MAP._worldMapEnabled ? "" : " off");
    btn.setAttribute("aria-label", "Wereldkaart aan/uit");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Wereldkaart</span>';
    btn.addEventListener("click", function(){
      MAP._worldMapEnabled = !MAP._worldMapEnabled;
      btn.classList.toggle("off", !MAP._worldMapEnabled);
      try {
        if(window.WorldMap && window.WorldMap.setEnabled) window.WorldMap.setEnabled(MAP._worldMapEnabled);
      } catch(e){}
      try {
        if(window.WDStorage) WDStorage.set("worldmap_enabled", MAP._worldMapEnabled ? "1" : "0");
      } catch(e){}
      LOG("Wereldkaart toggle: " + (MAP._worldMapEnabled ? "aan" : "uit"));
    });
    wrap.appendChild(btn);
  }

  function restoreWorldMapToggle(){
    try {
      var saved = window.WDStorage ? WDStorage.get("worldmap_enabled") : null;
      if (saved !== null && saved !== undefined && saved !== ""){
        MAP._worldMapEnabled = saved === "1";
      }
    } catch(e){}
  }

  function ensureDetailModal(){
    if($("wdDetailModal")) return;
    var modal = document.createElement("div");
    modal.id = "wdDetailModal";
    modal.className = "wd-detail-modal";
    modal.innerHTML =
      '<div class="wd-detail-box">' +
        '<div class="wd-detail-head">' +
          '<span class="wd-detail-type" id="wdDetailType">—</span>' +
          '<button class="wd-detail-close" id="wdDetailClose" aria-label="Sluiten">✕</button>' +
        '</div>' +
        '<div class="wd-detail-body">' +
          '<div class="wd-detail-meta" id="wdDetailMeta">—</div>' +
          '<div class="wd-detail-text" id="wdDetailText">—</div>' +
          '<div class="pop-sources-list" id="wdDetailSources" style="display:none"></div>' +
        '</div>' +
        '<div class="wd-detail-foot">' +
          '<button type="button" id="wdDetailSource" style="display:none;order:-1;flex:1 1 100%;width:100%;padding:.8rem 1rem;background:linear-gradient(135deg,#f0c78a,#e0a857 50%,#8a5c26);color:#070c16;border:1px solid #e0a857;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer;align-items:center;justify-content:center;gap:.45rem;font-family:inherit">↗ Open bronartikel</button>' +
          '<button class="wd-detail-btn primary" id="wdDetailShowOnMap">Toon op kaart</button>' +
          '<button class="wd-detail-btn" id="wdDetailCloseBtn">Sluiten</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function(e){ if(e.target === modal) closeDetail(); });
    $("wdDetailClose").addEventListener("click", closeDetail);
    $("wdDetailCloseBtn").addEventListener("click", closeDetail);
    $("wdDetailShowOnMap").addEventListener("click", function(){
      if(MAP.currentDetailEvent) showEventOnMap(MAP.currentDetailEvent);
    });
  }

  function findArticleUrlForEvent(event){
    if(!event) return "";
    var url = String(event.url || event.link || "").trim();
    if(/^https?:\/\//i.test(url)) return url;
    try {
      var items = (window.State && window.State.items) || [];
      var title = String(event.title || "").toLowerCase().trim();
      if (title.length < 10) return "";
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it) continue;
        var itTitle = String(it.title || "").toLowerCase().trim();
        if (itTitle === title) {
          var link = String(it.link || it.url || "").trim();
          if (/^https?:\/\//i.test(link)) return link;
        }
      }
      var needle = title.slice(0, Math.max(20, Math.floor(title.length * 0.6)));
      for (var j = 0; j < items.length; j++) {
        var it2 = items[j];
        if (!it2) continue;
        var itTitle2 = String(it2.title || "").toLowerCase().trim();
        if (itTitle2.length < 10) continue;
        if (itTitle2.indexOf(needle) !== -1 || needle.indexOf(itTitle2.slice(0, 20)) !== -1) {
          var link2 = String(it2.link || it2.url || "").trim();
          if (/^https?:\/\//i.test(link2)) return link2;
        }
      }
    } catch(e){}
    return "";
  }

  /* ============================================================
     v14.5.2: openDetail — vertaling bij render-tijd
     ============================================================ */
  function openDetail(event){
    ensureDetailModal();
    MAP.currentDetailEvent = event;
    var typeConf = resolveTypeConfig(event);
    var catCfg = CATEGORIES[event.category] || CATEGORIES.civiel;

    var badge = $("wdDetailType");
    badge.textContent = catCfg.label + " · " + typeConf.label;
    badge.style.background = typeConf.color;

    var metaParts = [];
    if(event.country) metaParts.push(event.country);
    if(event.date) metaParts.push(timeAgo(event.date));
    if(event.source) metaParts.push(event.source);
    if(event.isCluster && event.sources && event.sources.length > 1){
      metaParts.push(event.sources.length + " bronnen");
    }
    $("wdDetailMeta").textContent = metaParts.join(" · ");

    /* v14.5.2: haal vertaalde titel + desc op bij openen */
    var detailText = event.fullDescription || event.title || "(geen beschrijving)";
    var translatedTitle = null;
    var translatedDesc = null;
    try {
      if (window.NewsAPI && window.NewsAPI.getTranslatedTitle){
        translatedTitle = window.NewsAPI.getTranslatedTitle(event);
      }
      if (window.NewsAPI && window.NewsAPI.getTranslatedDesc){
        translatedDesc = window.NewsAPI.getTranslatedDesc(event);
      }
    } catch(e){}

    if (translatedTitle){
      var parts = [];
      parts.push(translatedTitle);
      if (translatedDesc) parts.push(translatedDesc);
      if (event.title && event.title !== translatedTitle){
        parts.push("");
        parts.push("Origineel: " + event.title);
      }
      detailText = parts.join("\n\n");
    }

    $("wdDetailText").textContent = detailText;

    var srcList = $("wdDetailSources");
    if(srcList){
      if(event.isCluster && event.sources && event.sources.length > 1){
        var html = '<strong>Bronnen (' + event.sources.length + '):</strong><br>';
        event.sources.slice(0, 8).forEach(function(s){
          html += '• ' + escapeHtml(s.name) + '<br>';
        });
        if(event.sources.length > 8){
          html += '• ... en ' + (event.sources.length - 8) + ' meer';
        }
        srcList.innerHTML = html;
        srcList.style.display = 'block';
      } else {
        srcList.style.display = 'none';
      }
    }

    var srcBtn = $("wdDetailSource");
    if(srcBtn){
      var url = findArticleUrlForEvent(event);
      if(url){
        srcBtn.style.display = "inline-flex";
        srcBtn.onclick = function(e){
          e.preventDefault();
          e.stopPropagation();
          try{ window.open(url, "_blank", "noopener"); }
          catch(err){ if(window.showToast) window.showToast("Kon link niet openen"); }
        };
      } else {
        srcBtn.style.display = "none";
        srcBtn.onclick = null;
      }
    }

    $("wdDetailModal").classList.add("show");
  }

  function closeDetail(){
    var modal = $("wdDetailModal");
    if(modal) modal.classList.remove("show");
  }

  function showEventOnMap(event){
    if(!event || !MAP.instance) return;
    closeDetail();
    if(MAP.isFullscreen) exitFullscreen();
    setTimeout(function(){
      if(MAP.instance) MAP.instance.flyTo([event.lat, event.lng], 9, { duration: 0.8 });
    }, 300);
  }

  function updateCounters(){
    var counters = { all: MAP.events.length, militair:0, crime:0, politiek:0, protest:0, civiel:0 };
    for(var i = 0; i < MAP.events.length; i++){
      var c = MAP.events[i].category || "civiel";
      if(counters[c] !== undefined) counters[c]++;
    }
    MAP._counters = counters;
    Object.keys(counters).forEach(function(cat){
      var el = document.querySelector('.live-filter[data-cat="' + cat + '"] .lf-count');
      if(el) el.textContent = counters[cat];
    });
  }

  function renderLiveFilters(){
    var wrap = $("liveFilters");
    if(!wrap) return;
    var html = "";
    FILTER_ORDER.forEach(function(cat){
      var cfg = CATEGORIES[cat];
      var active = (MAP.currentFilter === cat) ? " active" : "";
      html += '<button class="live-filter' + active + '" data-cat="' + cat + '">' +
        '<i class="ph ph-bold ' + cfg.icon + ' lf-icon"></i>' +
        '<span class="lf-label">' + cfg.label + '</span>' +
        '<span class="lf-count">0</span>' +
      '</button>';
    });
    wrap.innerHTML = html;

    Array.prototype.forEach.call(wrap.querySelectorAll(".live-filter"), function(btn){
      btn.addEventListener("click", function(){
        var cat = btn.dataset.cat;
        if(cat === MAP.currentFilter) return;
        MAP.currentFilter = cat;
        if(window.WDStorage) WDStorage.set("map_filter_v3", cat);
        wrap.querySelectorAll(".live-filter").forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        renderMarkers();
        renderLiveList();
        setTimeout(fitToMarkers, 200);
      });
    });

    updateCounters();
  }

  function restoreFilter(){
    try {
      var saved = window.WDStorage ? WDStorage.get("map_filter_v3") : null;
      if(saved && CATEGORIES[saved]) MAP.currentFilter = saved;
    }catch(e){}
  }

  function getFilteredEvents(){
    var list = MAP.events.slice();

    if(MAP.currentFilter !== "all"){
      list = list.filter(function(e){
        return (e.category || "civiel") === MAP.currentFilter;
      });
    }

    var tf = TIME_FILTERS.find(function(t){ return t.key === MAP.liveTimeFilter; });
    if(tf && tf.hours > 0){
      var cutoff = Date.now() - tf.hours * 60 * 60 * 1000;
      list = list.filter(function(e){
        var t = new Date(e.date).getTime();
        return !isNaN(t) && t >= cutoff;
      });
    }

    var q = (MAP.liveSearchQuery || "").toLowerCase().trim();
    if(q.length >= 2){
      list = list.filter(function(e){
        var hay = ((e.title || "") + " " + (e.country || "") + " " + (e.source || "") + " " + (e.subtype || "")).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    return list;
  }

  function fitToMarkers(){
    if(!MAP.instance) return;
    var visible = getFilteredEvents();
    if (!visible.length) {
      MAP.instance.flyTo([29.5, 42.0], 3, { duration: 0.6 });
      return;
    }

    if (visible.length === 1) {
      MAP.instance.flyTo([visible[0].lat, visible[0].lng], 9, { duration: 0.6 });
      return;
    }

    if (visible.length === 2) {
      try {
        var b2 = L.latLngBounds(visible.map(function(e){ return [e.lat, e.lng]; }));
        MAP.instance.flyToBounds(b2, { padding: [80, 80], maxZoom: 8, duration: 0.6 });
      } catch(e){}
      return;
    }

    try {
      var bounds = L.latLngBounds(visible.map(function(e){ return [e.lat, e.lng]; }));
      MAP.instance.flyToBounds(bounds, { padding: [40, 40], maxZoom: 7, duration: 0.6 });
    } catch(e){}
  }

  function refreshFromNews(){
    var events;
    if (MAP.militaryEvents.length > 0) {
      events = MAP.militaryEvents.slice();
      LOG("Gebruik " + events.length + " events uit ai-map");
    } else {
      events = [];
    }

    if(!events.length){
      var list = $("liveList");
      if(list) list.innerHTML = '<div class="live-empty">Geen events op dit moment.</div>';
      MAP.events = [];
      var statEl = $("statEvents");
      if(statEl) statEl.textContent = "0";
      renderMarkers(); renderLiveList(); updateCounters();
      if (MAP.instance) MAP.instance.setView([29.5, 42.0], 3);
      return true;
    }

    MAP.events = events;
    var statEl2 = $("statEvents");
    if(statEl2) statEl2.textContent = events.length;

    renderMarkers();
    renderLiveList();
    updateCounters();

    try {
      if (window.WorldMap && window.WorldMap.refresh && MAP._worldMapEnabled){
        window.WorldMap.refresh(events);
      }
    } catch(e){
      LOG("WorldMap.refresh faalde: " + (e.message || "?"));
    }

    var zoomHash = MAP.events.map(function(e){ return e.id; }).join("|").slice(0, 200);
    if (zoomHash !== MAP._lastZoomHash) {
      MAP._lastZoomHash = zoomHash;
      setTimeout(fitToMarkers, 200);
    }
    LOG("✅ " + events.length + " events geladen (filter: " + MAP.currentFilter + ")");
    return true;
  }

  /* ============================================================
     v14.5.2: renderMarkers haalt vertaling op bij render-tijd
     ============================================================ */
  function renderMarkers(){
    if(!MAP.cluster) return;
    MAP.cluster.clearLayers();
    var filtered = getFilteredEvents();

    var markers = [];
    filtered.forEach(function(e){
      var cat = e.category || "civiel";
      var color = resolveColor(e);
      var glyph = iconFor(cat);

      var icon = L.divIcon({
        className: "wd-marker",
        html: '<div class="wd-marker-inner" style="color:' + color + '"><span class="wd-marker-pulse"></span><span class="wd-marker-icon">' + glyph + '</span></div>',
        iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -8]
      });
      var marker = L.marker([e.lat, e.lng], {icon: icon});

      var catCfg = CATEGORIES[cat] || CATEGORIES.civiel;

      /* v14.5.2: vertaling bij popup-render */
      var popupTitle = e.title;
      try {
        if (window.NewsAPI && window.NewsAPI.getTranslatedTitle){
          var tt = window.NewsAPI.getTranslatedTitle(e);
          if (tt) popupTitle = tt;
        }
      } catch(err){}

      var sourceLine = e.source ? '<div class="pop-meta">' + escapeHtml(e.source) + '</div>' : '';
      var clusterLine = (e.isCluster && e.sources && e.sources.length > 1)
        ? '<div class="pop-meta" style="color:#93c5fd">📰 ' + e.sources.length + ' bronnen</div>'
        : '';
      var originalLine = (e.isTranslated && e.originalTitle)
        ? '<div class="pop-meta" dir="rtl" style="opacity:.65;font-style:italic;margin-top:.2rem">' + escapeHtml(e.originalTitle) + '</div>'
        : '';

      var popupHtml =
        '<div class="pop-cat" style="--cat-color:' + color + '">' + escapeHtml(catCfg.label) + ' · ' + escapeHtml(e.subtype || "") + '</div>' +
        '<div class="pop-title">' + escapeHtml(popupTitle) + '</div>' +
        originalLine +
        '<div class="pop-meta">' + escapeHtml(e.country || "?") + (e.region ? " · " + escapeHtml(e.region) : "") + '</div>' +
        sourceLine +
        clusterLine +
        '<button class="pop-more" data-id="' + escapeHtml(String(e.id)) + '">Details →</button>';
      marker.bindPopup(popupHtml);
      marker.on("popupopen", function(){
        setTimeout(function(){
          var btn = document.querySelector('.pop-more[data-id="' + e.id + '"]');
          if(btn) btn.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); openDetail(e); };
        }, 50);
      });
      markers.push(marker);
    });
    MAP.cluster.addLayers(markers);
    LOG("Markers gerenderd: " + markers.length + " (filter: " + MAP.currentFilter + ")");
  }

  /* ============================================================
     v14.5.2: renderLiveList haalt vertaling op bij render-tijd
     ============================================================ */
  function renderLiveList(){
    var list = $("liveList");
    var countEl = $("liveCount");
    if(!list) return;
    var filtered = getFilteredEvents();
    if(countEl) countEl.textContent = filtered.length;

    if(!filtered.length){
      var hasFilters = MAP.currentFilter !== "all" || MAP.liveSearchQuery || (MAP.liveTimeFilter && MAP.liveTimeFilter !== "30d" && MAP.liveTimeFilter !== "all");
      if(hasFilters){
        list.innerHTML = '<div class="live-empty-filter">' +
          'Geen events met deze filters.<br>' +
          '<button type="button" id="liveResetFilters">Wis alle filters</button>' +
        '</div>';
        var resetBtn = $("liveResetFilters");
        if(resetBtn){
          resetBtn.addEventListener("click", function(){
            MAP.currentFilter = "all";
            MAP.liveSearchQuery = "";
            MAP.liveTimeFilter = "7d";
            var inp = $("liveSearch");
            if(inp){ inp.value = ""; }
            renderLiveFilters();
            updateTimeFilterUI();
            updateSearchClear();
            renderMarkers();
            renderLiveList();
            setTimeout(fitToMarkers, 200);
          });
        }
      } else {
        var catLabel = (CATEGORIES[MAP.currentFilter] || {}).label || "deze";
        list.innerHTML = '<div class="live-empty">Geen ' + catLabel + ' events op dit moment</div>';
      }
      return;
    }

    var shown = filtered.slice(0, 200);
    var overflow = filtered.length - shown.length;

    list.innerHTML = shown.map(function(e){
      var cat = e.category || "civiel";
      var catCfg = CATEGORIES[cat] || CATEGORIES.civiel;
      var color = resolveColor(e);
      var badgeClass = 'live-event-cat cat-' + cat;
      var multiBadge = (e.isCluster && e.sources && e.sources.length > 1)
        ? '<span class="live-event-multi">+' + (e.sources.length - 1) + ' bron' + (e.sources.length > 2 ? 'nen' : '') + '</span>'
        : '';

      /* v14.5.2: vertaling ophalen bij render-tijd (niet uit snapshot) */
      var displayTitle = e.title;
      var displayOriginal = null;
      try {
        if (window.NewsAPI && window.NewsAPI.getTranslatedTitle){
          var t = window.NewsAPI.getTranslatedTitle(e);
          if (t){
            displayTitle = t;
            displayOriginal = e.title;
          }
        }
      } catch(err){}

      var originalLine = displayOriginal
        ? '<div class="live-event-original" dir="rtl">' + escapeHtml(displayOriginal) + '</div>'
        : '';

      return '<div class="live-event" data-id="' + escapeHtml(String(e.id)) + '" style="--cat-color:' + color + '">' +
        '<div class="live-event-body">' +
          '<div class="live-event-title">' + escapeHtml(displayTitle) + multiBadge + '</div>' +
          originalLine +
          '<div class="live-event-meta">' +
            '<span class="live-event-loc">' + escapeHtml(e.country || "—") + '</span>' +
            '<span>·</span>' +
            '<span>' + timeAgo(e.date) + '</span>' +
            '<span class="' + badgeClass + '">' + escapeHtml(catCfg.label) + (e.subtype ? ' · ' + escapeHtml(e.subtype) : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("") + (overflow > 0
      ? '<div class="live-empty" style="opacity:.6">… en nog ' + overflow + ' meer events (filter om te verfijnen)</div>'
      : '');

    Array.prototype.forEach.call(list.querySelectorAll(".live-event"), function(el){
      el.addEventListener("click", function(){
        var id = el.dataset.id;
        var ev = MAP.events.find(function(x){ return String(x.id) === String(id); });
        if(ev) openDetail(ev);
      });
    });
  }

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function timeAgo(d){
    var t = new Date(d).getTime();
    if(isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if(diff < 60) return "nu";
    if(diff < 3600) return Math.floor(diff / 60) + " min";
    if(diff < 86400) return Math.floor(diff / 3600) + " u";
    return Math.floor(diff / 86400) + " d";
  }

  function ensureLiveSearch(){
    var feed = document.querySelector(".live-feed");
    if(!feed) return;
    if(feed.querySelector(".live-search-row")) return;

    var head = feed.querySelector(".live-head");
    var filters = feed.querySelector(".live-filters");
    if(!filters) return;

    var row = document.createElement("div");
    row.className = "live-search-row";
    row.innerHTML =
      '<div class="live-search-wrap" id="liveSearchWrap">' +
        '<svg class="live-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
        '<input type="search" id="liveSearch" placeholder="Zoek land, bron, subtype..." autocomplete="off" />' +
        '<button type="button" class="live-search-clear" id="liveSearchClear" aria-label="Wissen">✕</button>' +
      '</div>' +
      '<div class="live-time-filter" id="liveTimeFilter">' +
        TIME_FILTERS.map(function(t){
          var active = (MAP.liveTimeFilter === t.key) ? " active" : "";
          return '<button type="button" data-key="' + t.key + '" class="' + (active ? 'active' : '') + '">' + t.label + '</button>';
        }).join("") +
      '</div>';

    filters.parentNode.insertBefore(row, filters);

    var input = document.getElementById("liveSearch");
    var clear = document.getElementById("liveSearchClear");
    var wrap = document.getElementById("liveSearchWrap");
    var searchTimer = null;

    function updateClearVisibility(){
      if(!wrap || !input) return;
      if(input.value.length > 0) wrap.classList.add("has-value");
      else wrap.classList.remove("has-value");
    }

    if(input){
      input.addEventListener("input", function(){
        updateClearVisibility();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function(){
          MAP.liveSearchQuery = input.value;
          renderMarkers();
          renderLiveList();
          if(MAP.liveSearchQuery.length >= 2) setTimeout(fitToMarkers, 180);
        }, 220);
      });
    }

    if(clear){
      clear.addEventListener("click", function(){
        if(input){ input.value = ""; }
        updateClearVisibility();
        MAP.liveSearchQuery = "";
        renderMarkers();
        renderLiveList();
        setTimeout(fitToMarkers, 180);
        if(input) input.focus();
      });
    }

    var tf = document.getElementById("liveTimeFilter");
    if(tf){
      Array.prototype.forEach.call(tf.querySelectorAll("button"), function(btn){
        btn.addEventListener("click", function(){
          var key = btn.dataset.key;
          if(!key || key === MAP.liveTimeFilter) return;
          MAP.liveTimeFilter = key;
          updateTimeFilterUI();
          try {
            if(window.WDStorage) WDStorage.set("map_live_timefilter", key);
          } catch(e){}
          renderMarkers();
          renderLiveList();
          setTimeout(fitToMarkers, 200);
        });
      });
    }

    try {
      var savedTf = window.WDStorage ? WDStorage.get("map_live_timefilter") : null;
      if(savedTf && TIME_FILTERS.some(function(t){ return t.key === savedTf; })){
        MAP.liveTimeFilter = savedTf;
        updateTimeFilterUI();
      }
    } catch(e){}

    updateClearVisibility();
  }

  function updateTimeFilterUI(){
    var tf = document.getElementById("liveTimeFilter");
    if(!tf) return;
    Array.prototype.forEach.call(tf.querySelectorAll("button"), function(btn){
      btn.classList.toggle("active", btn.dataset.key === MAP.liveTimeFilter);
    });
  }

  function updateSearchClear(){
    var wrap = document.getElementById("liveSearchWrap");
    var inp = document.getElementById("liveSearch");
    if(!wrap) return;
    if(inp && inp.value.length > 0) wrap.classList.add("has-value");
    else wrap.classList.remove("has-value");
  }

  function initMap(){
    if(MAP.instance || typeof L === "undefined") return;
    var mapEl = $("map");
    if(!mapEl) return;
    MAP.instance = L.map("map", {
      center: [29.5, 42.0], zoom: 4, minZoom: 2, maxZoom: 18,
      worldCopyJump: true, zoomControl: false, attributionControl: false,
      preferCanvas: true
    });
    MAP.currentTheme = detectTheme();
    switchTile(MAP.currentTheme);
    MAP.cluster = L.markerClusterGroup({
      maxClusterRadius: 28,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 7,
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 40
    });
    MAP.instance.addLayer(MAP.cluster);
    observeThemeChanges();
    LOG("Map klaar");

    try {
      if (window.WorldMap && window.WorldMap.init){
        var initResult = window.WorldMap.init(MAP.instance);
        if (initResult && typeof initResult.then === "function"){
          initResult.then(function(){
            if (MAP._worldMapEnabled === false && window.WorldMap.setEnabled){
              window.WorldMap.setEnabled(false);
            }
          }).catch(function(e){
            LOG("WorldMap.init promise faalde: " + (e.message || "?"));
          });
        }
      } else {
        LOG("WorldMap niet beschikbaar — wereldkaart overgeslagen");
      }
    } catch(e){
      LOG("WorldMap.init faalde: " + (e.message || "?"));
    }
  }

  function bindControls(){
    var zi = $("mapZoomIn"), zo = $("mapZoomOut"), loc = $("mapLocate"), full = $("mapFull");
    if(zi) zi.addEventListener("click", function(){ MAP.instance && MAP.instance.zoomIn(); });
    if(zo) zo.addEventListener("click", function(){ MAP.instance && MAP.instance.zoomOut(); });
    if(full){
      full.setAttribute("data-role", "full");
      full.addEventListener("click", function(){
        if(MAP.isFullscreen) exitFullscreen(); else enterFullscreen();
      });
    }
    if(loc) loc.addEventListener("click", function(){
      if(!navigator.geolocation){ if(window.showToast) window.showToast("Locatie niet ondersteund"); return; }
      navigator.geolocation.getCurrentPosition(function(p){
        if(MAP.instance) MAP.instance.setView([p.coords.latitude, p.coords.longitude], 8);
      }, function(){ if(window.showToast) window.showToast("Locatie niet beschikbaar"); }, {timeout: 8000});
    });
  }

  function bindEventBus(){
    if(MAP._busBound) return;
    if(!window.WarDesk || !WarDesk.events || !WarDesk.events.on) return;
    MAP._busBound = true;

    WarDesk.events.on("map:military-events", function(events){
      if (MAP.militaryEvents && MAP.militaryEvents.length) {
        MAP.militaryEvents.length = 0;
      }
      MAP.militaryEvents = Array.isArray(events) ? events.slice(0, 1500) : [];
      LOG("Events ontvangen: " + MAP.militaryEvents.length);
      if (isMapActive()) refreshFromNews();
    });

    WarDesk.events.on("map:hotspots", function(hotspots){
      if (MAP.hotspots && MAP.hotspots.length) {
        MAP.hotspots.length = 0;
      }
      MAP.hotspots = Array.isArray(hotspots) ? hotspots.slice(0, 10) : [];
    });

    WarDesk.events.on("news:loaded", function(){
      if (isMapActive() && MAP.militaryEvents.length === 0) refreshFromNews();
    });

    WarDesk.events.on("translation:added", function(){
      if (!isMapActive()) return;
      setTimeout(function(){
        if (MAP.militaryEvents && MAP.militaryEvents.length) {
          MAP.events = MAP.militaryEvents.slice();
          renderMarkers();
          renderLiveList();
          updateCounters();
        }
      }, 400);
    });

    WarDesk.events.on("translation:toggle", function(){
      if (!isMapActive()) return;
      setTimeout(function(){
        if (window.MapAI && window.MapAI.forceRun) window.MapAI.forceRun();
        else if (window.MapAI && window.MapAI.run) window.MapAI.run();
      }, 300);
    });

    WarDesk.events.on("territory:confirmed", function(data){
      if (!data) return;
      if (data.fromCache) return;
      var confirmed = data.confirmed || [];
      var expired = data.expired || [];

      if (confirmed.length > 0 && window.showToast){
        var lines = confirmed.slice(0, 2).map(function(c){
          var label = c.admin1 || c.iso3;
          return label + " → " + c.actor;
        });
        var extra = confirmed.length > 2 ? " +" + (confirmed.length - 2) + " meer" : "";
        window.showToast("✅ AI-bevestigd: " + lines.join(", ") + extra);
        LOG("Territory toast: " + confirmed.length + " confirmations");
      }

      if (expired.length > 0 && window.showToast && confirmed.length === 0){
        window.showToast("⏳ " + expired.length + " override(s) verlopen");
        LOG("Territory toast: " + expired.length + " expired");
      }
    });

    LOG("EventBus listeners actief");
  }

  function isMapActive(){
    var mapTab = document.querySelector('.tab[data-view="map"]');
    return mapTab && mapTab.classList.contains("active");
  }

  window.__mapRefresh = function(){
    MAP._lastNewsCount = 0;
    MAP._lastZoomHash = "";
    if (window.MapAI) {
      if (window.MapAI.forceRun) window.MapAI.forceRun();
      else window.MapAI.run();
    }
  };
  window.__mapResetView = function(){ if(MAP.instance) MAP.instance.setView([29.5, 42.0], 4); };

  function activateMapView(){
    initMap();
    ensureFullscreenClose();
    ensureWorldMapToggle();
    ensureLiveSearch();
    if(MAP.instance) setTimeout(function(){ if(MAP.instance) MAP.instance.invalidateSize(); }, 350);
    if(window.State && State.items && State.items.length) refreshFromNews();
  }

  function hookViewSwitch(){
    document.querySelectorAll(".bottom-tabs .tab").forEach(function(tab){
      tab.addEventListener("click", function(){
        if(tab.dataset.view === "map") setTimeout(activateMapView, 200);
        else if(MAP.isFullscreen) exitFullscreen();
      });
    });
  }

  function initMapModule(){
    injectMapStyles();
    ensureDetailModal();
    ensureFullscreenClose();
    bindControls();
    hookViewSwitch();
    restoreFilter();
    restoreWorldMapToggle();
    renderLiveFilters();
    bindEventBus();

    var themeBtn = $("btnTheme");
    if(themeBtn) themeBtn.addEventListener("click", function(){ markManualTheme(); setTimeout(updateMetaTheme, 50); });

    observeThemeChanges();
    checkTimeMode();
    updateMetaTheme();
    if(!MAP._timeModeInterval){
      MAP._timeModeInterval = setInterval(function(){ if(!document.hidden) checkTimeMode(); }, 60000);
    }

    var mapTab = document.querySelector('.tab[data-view="map"]');
    var viewMap = document.getElementById("viewMap");
    var isMapTabActive = (mapTab && mapTab.classList.contains("active")) || (viewMap && !viewMap.hidden);
    if(isMapTabActive) setTimeout(activateMapView, 400);
  }

  if(document.readyState !== "loading") setTimeout(initMapModule, 600);
  else document.addEventListener("DOMContentLoaded", function(){ setTimeout(initMapModule, 600); });

  window.addEventListener("load", function(){
    setTimeout(function(){
      var mapTab = document.querySelector('.tab[data-view="map"]');
      if(mapTab && mapTab.classList.contains("active") && !MAP.instance) activateMapView();
    }, 1500);
  });

  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape") return;
    if(document.querySelector("#sheet.open")) return;
    var modal = $("wdDetailModal");
    if(modal && modal.classList.contains("show")) closeDetail();
    else if(MAP.isFullscreen) exitFullscreen();
  }, true);

  window.MAPAPI = { refresh: refreshFromNews, state: MAP };
  wdLog.info("[WAR DESK] map-v11.10.js v14.5.2 geladen");
})();