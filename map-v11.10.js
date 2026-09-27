/* ============================================================
   WAR DESK v14.0 — Conflictkaart met 5 categorieën
   - v14.0: 5 filters (Militair/Crime/Politiek/Protest/Civiel)
            met live tellers, default = Militair
   - v13.8: bron-knop met fallback-zoek in State.items
   - v13.7: "Open bron" knop in event-detail modal
   - v13.6: legenda uit, kleinere markers, meer events (1000)
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){
    try{ wdLog.info.apply(null, ["[MAP]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  LOG("v14.0 geladen — 5 categorieën + tellers");

  /* ============================================================
     CATEGORIEËN + KLEUREN + LABELS
     ============================================================ */
  var CATEGORIES = {
    militair: {
      label: "Militair",
      color: "#e63950",
      icon: "ph-crosshair"
    },
    crime: {
      label: "Crime",
      color: "#a855f7",
      icon: "ph-handcuffs"
    },
    politiek: {
      label: "Politiek",
      color: "#3b82f6",
      icon: "ph-bank"
    },
    protest: {
      label: "Protest",
      color: "#f59e0b",
      icon: "ph-megaphone"
    },
    civiel: {
      label: "Civiel",
      color: "#6b7a93",
      icon: "ph-warning"
    }
  };

  /* Sub-kleur voor cyber/fraude binnen Crime */
  function resolveColor(event){
    if(!event) return CATEGORIES.civiel.color;
    var cat = event.category || "civiel";
    var subtype = (event.subtype || "").toLowerCase();

    /* Crime: cyber/fraude = cyaan, anders paars */
    if(cat === "crime"){
      if(/cyber|fraude|phishing|hacking/.test(subtype)) return "#06b6d4";
      return CATEGORIES.crime.color;
    }
    return CATEGORIES[cat] ? CATEGORIES[cat].color : CATEGORIES.civiel.color;
  }

  function resolveIcon(event){
    if(!event) return "";
    var cat = event.category || "civiel";
    var catCfg = CATEGORIES[cat] || CATEGORIES.civiel;

    /* Subtype-iconen voor militaire events */
    if(cat === "militair"){
      var st = (event.subtype || "").toLowerCase();
      if(st.indexOf("raketaanval") !== -1) return "▲"; /* driehoek */
      if(st.indexOf("drone") !== -1) return "◆";
      if(st.indexOf("bombardement") !== -1) return "●";
      if(st.indexOf("luchtaanval") !== -1) return "▲";
      if(st.indexOf("beschieting") !== -1) return "■";
      if(st.indexOf("luchtafweer") !== -1) return "◈";
      if(st.indexOf("offensief") !== -1 || st.indexOf("invasie") !== -1) return "▶";
      if(st.indexOf("gevecht") !== -1) return "⚔";
      return "▲";
    }
    return "";
  }

  /* ============================================================
     ICONEN (SVG fallback voor markers)
     ============================================================ */
  var ICONS = {
    militair: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 21 L2 21 Z"/></svg>',
    crime:    '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>',
    politiek: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 8 L22 10 L2 10 L2 8 Z M4 12 L4 20 L8 20 L8 12 Z M10 12 L10 20 L14 20 L14 12 Z M16 12 L16 20 L20 20 L20 12 Z M2 20 L22 20 L22 22 L2 22 Z"/></svg>',
    protest:  '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"/></svg>',
    civiel:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>'
  };

  function iconFor(cat){
    return ICONS[cat] || ICONS.civiel;
  }

  function resolveTypeConfig(e){
    if(!e) return { color: CATEGORIES.civiel.color, filter: "civiel", label: "Onbekend" };
    var cat = e.category || "civiel";
    var cfg = CATEGORIES[cat] || CATEGORIES.civiel;
    return {
      color: resolveColor(e),
      filter: cat,
      label: e.subtype || cfg.label
    };
  }

  /* ============================================================
     MAP STATE
     ============================================================ */
  var MAP = {
    instance: null, cluster: null, tileLayers: {}, events: [],
    militaryEvents: [], hotspots: [],
    currentFilter: "militair",           /* default = militair */
    refreshTimer: null, isFullscreen: false,
    currentTheme: "dark", themeObserver: null, _timeModeInterval: null,
    currentDetailEvent: null, _lastNewsCount: 0, _busBound: false,
    _lastRenderTime: 0,
    _lastZoomHash: "",
    _counters: { militair:0, crime:0, politiek:0, protest:0, civiel:0 }
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

  /* ============================================================
     CSS INJECTIE
     ============================================================ */
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
      ".live-event-mil{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;background:rgba(255,60,60,0.15);color:#ff5050;font-size:9.5px;font-weight:700;letter-spacing:0.5px}";
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

  /* ============================================================
     DETAIL MODAL
     ============================================================ */
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

      var shortNeedle = title.slice(0, Math.max(20, Math.floor(title.length * 0.6)));
      for (var j = 0; j < items.length; j++) {
        var it2 = items[j];
        if (!it2) continue;
        var itTitle2 = String(it2.title || "").toLowerCase().trim();
        if (itTitle2.length < 10) continue;
        if (itTitle2.indexOf(shortNeedle) !== -1 || shortNeedle.indexOf(itTitle2.slice(0, 20)) !== -1) {
          var link2 = String(it2.link || it2.url || "").trim();
          if (/^https?:\/\//i.test(link2)) return link2;
        }
      }
    } catch(e){}

    return "";
  }

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
    $("wdDetailMeta").textContent = metaParts.join(" · ");

    $("wdDetailText").textContent = event.fullDescription || event.title || "(geen beschrijving)";

    var srcBtn = $("wdDetailSource");
    if(srcBtn){
      var url = findArticleUrlForEvent(event);
      LOG("Source URL voor event:", url || "(geen)");
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
      if(MAP.instance) MAP.instance.setView([event.lat, event.lng], 7);
    }, 300);
  }

  /* ============================================================
     COUNTERS + FILTERS
     ============================================================ */
  function updateCounters(){
    var counters = { militair:0, crime:0, politiek:0, protest:0, civiel:0 };
    for(var i = 0; i < MAP.events.length; i++){
      var c = MAP.events[i].category || "civiel";
      if(counters[c] !== undefined) counters[c]++;
    }
    MAP._counters = counters;

    /* Update DOM knoppen */
    Object.keys(counters).forEach(function(cat){
      var el = document.querySelector('.live-filter[data-cat="' + cat + '"] .lf-count');
      if(el) el.textContent = counters[cat];
    });
  }

  function renderLiveFilters(){
    var wrap = $("liveFilters");
    if(!wrap) return;
    var order = ["militair","crime","politiek","protest","civiel"];
    var html = "";
    order.forEach(function(cat){
      var cfg = CATEGORIES[cat];
      var active = (MAP.currentFilter === cat) ? " active" : "";
      html += '<button class="live-filter' + active + '" data-cat="' + cat + '">' +
        '<i class="ph ph-bold ' + cfg.icon + ' lf-icon"></i>' +
        '<span class="lf-label">' + cfg.label + '</span>' +
        '<span class="lf-count">0</span>' +
      '</button>';
    });
    wrap.innerHTML = html;

    /* Bind clicks */
    Array.prototype.forEach.call(wrap.querySelectorAll(".live-filter"), function(btn){
      btn.addEventListener("click", function(){
        var cat = btn.dataset.cat;
        if(cat === MAP.currentFilter) return;

        MAP.currentFilter = cat;
        if(window.WDStorage) WDStorage.set("map_filter_v2", cat);

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
      var saved = window.WDStorage ? WDStorage.get("map_filter_v2") : null;
      if(saved && CATEGORIES[saved]){
        MAP.currentFilter = saved;
      }
    }catch(e){}
  }

  /* ============================================================
     FALLBACK EVENTS (als ai-map geen data stuurt)
     ============================================================ */
  function buildFallbackEvents(){
    if(!window.State || !State.items || !State.items.length) return [];
    var events = [];
    var byCat = {};
    State.items.forEach(function(it){
      var cat = it.cat || "";
      if(!LOCATIONS_MINI[cat]) return;
      if(!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(it);
    });
    Object.keys(byCat).forEach(function(cat){
      var loc = LOCATIONS_MINI[cat];
      var items = byCat[cat].sort(function(a,b){
        return (new Date(b.date).getTime()||0) - (new Date(a.date).getTime()||0);
      }).slice(0, 3);
      items.forEach(function(it, i){
        var off = i * 0.15;
        events.push({
          id: "fb-" + cat + "-" + i,
          lat: loc.lat + off, lng: loc.lng + off,
          title: it.title || "Geen titel",
          fullDescription: (it.description || it.desc || "") || (it.title || ""),
          category: (cat === "war" || cat === "ukraine") ? "militair" : "politiek",
          subtype: "Conflict",
          type: "conflict",
          country: loc.country,
          date: it.date || new Date().toISOString(),
          url: it.link || it.url || "", source: it.source || "",
          isMilitary: (cat === "war")
        });
      });
    });
    if (events.length > 1000) events = events.slice(0, 1000);
    return events;
  }

  var LOCATIONS_MINI = {
    "mideast": { lat: 31.77, lng: 35.22, country: "Midden-Oosten" },
    "gaza":    { lat: 31.35, lng: 34.31, country: "Gaza" },
    "il":      { lat: 31.77, lng: 35.22, country: "Israël" },
    "iran":    { lat: 35.69, lng: 51.39, country: "Iran" },
    "iraq":    { lat: 33.31, lng: 44.36, country: "Irak" },
    "yemen":   { lat: 15.37, lng: 44.19, country: "Jemen" },
    "qa":      { lat: 25.28, lng: 51.53, country: "Qatar" },
    "sa":      { lat: 24.71, lng: 46.68, country: "Saudi-Arabië" },
    "ae":      { lat: 24.47, lng: 54.37, country: "V.A.E." },
    "eg":      { lat: 30.04, lng: 31.24, country: "Egypte" },
    "sudan":   { lat: 15.55, lng: 32.53, country: "Sudan" },
    "ukraine": { lat: 50.45, lng: 30.52, country: "Oekraïne" },
    "war":     { lat: 50.45, lng: 30.52, country: "Conflictgebied" }
  };

  /* ============================================================
     MARKERS
     ============================================================ */
  function fitToMarkers(){
    if(!MAP.instance) return;
    var visible = getFilteredEvents();
    if (!visible.length) { MAP.instance.setView([29.5, 42.0], 3); return; }
    if (visible.length === 1) { MAP.instance.setView([visible[0].lat, visible[0].lng], 6); return; }
    try {
      var bounds = L.latLngBounds(visible.map(function(e){ return [e.lat, e.lng]; }));
      MAP.instance.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    } catch(e){}
  }

  function getFilteredEvents(){
    if(MAP.currentFilter === "all") return MAP.events.slice();
    return MAP.events.filter(function(e){
      return (e.category || "civiel") === MAP.currentFilter;
    });
  }

  function refreshFromNews(){
    var events;
    if (MAP.militaryEvents.length > 0) {
      events = MAP.militaryEvents.slice();
      LOG("Gebruik " + events.length + " events uit ai-map");
    } else {
      events = buildFallbackEvents();
      LOG("Fallback: " + events.length + " standaard events");
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

    var zoomHash = MAP.events.map(function(e){ return e.id; }).join("|").slice(0, 200);
    if (zoomHash !== MAP._lastZoomHash) {
      MAP._lastZoomHash = zoomHash;
      setTimeout(fitToMarkers, 200);
    }
    LOG("✅ " + events.length + " events geladen (filter: " + MAP.currentFilter + ")");
    return true;
  }

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
      var sourceLine = e.source ? '<div class="pop-meta">' + escapeHtml(e.source) + '</div>' : '';
      var popupHtml =
        '<div class="pop-cat" style="--cat-color:' + color + '">' + escapeHtml(catCfg.label) + ' · ' + escapeHtml(e.subtype || "") + '</div>' +
        '<div class="pop-title">' + escapeHtml(e.title) + '</div>' +
        '<div class="pop-meta">' + escapeHtml(e.country || "?") + (e.region ? " · " + escapeHtml(e.region) : "") + '</div>' +
        sourceLine +
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
     LIVE LIST
     ============================================================ */
  function renderLiveList(){
    var list = $("liveList");
    var countEl = $("liveCount");
    if(!list) return;
    var filtered = getFilteredEvents();
    if(countEl) countEl.textContent = filtered.length;

    if(!filtered.length){
      var catLabel = (CATEGORIES[MAP.currentFilter] || {}).label || "deze";
      list.innerHTML = '<div class="live-empty">Geen ' + catLabel + ' events op dit moment</div>';
      return;
    }

    list.innerHTML = filtered.map(function(e){
      var cat = e.category || "civiel";
      var catCfg = CATEGORIES[cat] || CATEGORIES.civiel;
      var color = resolveColor(e);
      var badgeClass = 'live-event-cat cat-' + cat;
      return '<div class="live-event" data-id="' + escapeHtml(String(e.id)) + '" style="--cat-color:' + color + '">' +
        '<div class="live-event-body">' +
          '<div class="live-event-title">' + escapeHtml(e.title) + '</div>' +
          '<div class="live-event-meta">' +
            '<span class="live-event-loc">' + escapeHtml(e.country || "—") + '</span>' +
            '<span>·</span>' +
            '<span>' + timeAgo(e.date) + '</span>' +
            '<span class="' + badgeClass + '">' + escapeHtml(catCfg.label) + (e.subtype ? ' · ' + escapeHtml(e.subtype) : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    Array.prototype.forEach.call(list.querySelectorAll(".live-event"), function(el){
      el.addEventListener("click", function(){
        var id = el.dataset.id;
        var ev = MAP.events.find(function(x){ return String(x.id) === String(id); });
        if(ev) openDetail(ev);
      });
    });
  }

  /* ============================================================
     HELPERS
     ============================================================ */
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

  /* ============================================================
     INIT MAP
     ============================================================ */
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

  /* ============================================================
     EVENTBUS
     ============================================================ */
  function bindEventBus(){
    if(MAP._busBound) return;
    if(!window.WarDesk || !WarDesk.events || !WarDesk.events.on) return;
    MAP._busBound = true;

    WarDesk.events.on("map:military-events", function(events){
      if (MAP.militaryEvents && MAP.militaryEvents.length) {
        MAP.militaryEvents.length = 0;
      }
      MAP.militaryEvents = Array.isArray(events) ? events.slice(0, 1000) : [];
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
    LOG("EventBus listeners actief");
  }

  function isMapActive(){
    var mapTab = document.querySelector('.tab[data-view="map"]');
    return mapTab && mapTab.classList.contains("active");
  }

  /* ============================================================
     MODULE INIT
     ============================================================ */
  window.__mapRefresh = function(){
    MAP._lastNewsCount = 0;
    MAP._lastZoomHash = "";
    if (window.MapAI) window.MapAI.run();
  };
  window.__mapResetView = function(){ if(MAP.instance) MAP.instance.setView([29.5, 42.0], 4); };

  function activateMapView(){
    initMap();
    ensureFullscreenClose();
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
  wdLog.info("[WAR DESK] map-v11.10.js v14.0 geladen (5 categorieën)");
})();