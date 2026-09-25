/* ============================================================
   WAR DESK v13.3 — Conflictkaart (OpenFreeMap) + Military Events
   - v13.3: versie-bump voor cache-busting
   - v13.2: Legend klikbaar (subfilter) + auto-zoom
   - v13.1: typeConfig fallback
   - v13.0: Militaire events + hotspot strip
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[MAP]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  LOG("v13.3 geladen — subfilter + auto-zoom");

  var LOCATIONS = {
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
    "sudan":   { lat: 15.55, lng: 32.53, country: "Sudan" }
  };

  var CATEGORY_FILTER = {
    "mideast": "conflict","gaza": "conflict","il": "conflict","iran": "conflict",
    "iraq": "conflict","yemen": "conflict","sudan": "conflict",
    "qa": "political","sa": "political","ae": "political","eg": "political"
  };

  var TYPES = {
    "conflict":  { color: "#e63950", filter: "conflict",  label: "Conflict" },
    "political": { color: "#3b82f6", filter: "political", label: "Politiek" },
    "other":     { color: "#6b7a93", filter: "other",     label: "Overig" },
    "aanval":     { color: "#ff2e3e", filter: "military", label: "Aanval" },
    "offensief":  { color: "#ff7a1a", filter: "military", label: "Offensief" },
    "defensief":  { color: "#22c55e", filter: "military", label: "Defensief" },
    "voortgang":  { color: "#a855f7", filter: "military", label: "Voortgang" },
    "actief":     { color: "#facc15", filter: "military", label: "Actief conflict" }
  };

  var ICONS = {
    conflict:  '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 21 L2 21 Z"/></svg>',
    political: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 8 L22 10 L2 10 L2 8 Z M4 12 L4 20 L8 20 L8 12 Z M10 12 L10 20 L14 20 L14 12 Z M16 12 L16 20 L20 20 L20 12 Z M2 20 L22 20 L22 22 L2 22 Z"/></svg>',
    other:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L22 12 L12 22 L2 12 Z"/></svg>',
    aanval:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 C 12 2 6 8 6 13 A 6 6 0 0 0 18 13 C 18 8 12 2 12 2 Z M12 5 C 14 8 16 11 16 13 A 4 4 0 0 1 8 13 C 8 11 10 8 12 5 Z"/></svg>',
    offensief: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M5 3 L7 5 L19 17 L21 19 L19 21 L17 19 L5 7 L3 5 L5 3 Z M17 3 L21 3 L21 7 L19 5 Z M3 17 L7 21 L5 21 L3 19 Z"/></svg>',
    defensief: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L4 5 L4 12 C 4 17 8 21 12 22 C 16 21 20 17 20 12 L20 5 Z M12 5 L17 7 L17 12 C 17 15.5 14.5 18.5 12 19.5 C 9.5 18.5 7 15.5 7 12 L7 7 Z"/></svg>',
    voortgang: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 C 8.7 2 6 4.7 6 8 C 6 12 12 22 12 22 C 12 22 18 12 18 8 C 18 4.7 15.3 2 12 2 Z M12 5 A 3 3 0 1 1 12 11 A 3 3 0 0 1 12 5 Z"/></svg>',
    actief:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"/></svg>'
  };

  function iconFor(filter, subtype){
    if (subtype && ICONS[subtype]) return ICONS[subtype];
    if(filter === "conflict") return ICONS.conflict;
    if(filter === "political") return ICONS.political;
    return ICONS.other;
  }

  function resolveTypeConfig(e){
    if (!e) return TYPES.other;
    if (e.typeConfig && e.typeConfig.color) return e.typeConfig;
    if (e.subtype && TYPES[e.subtype]) return TYPES[e.subtype];
    if (e.type && TYPES[e.type]) return TYPES[e.type];
    return TYPES.other;
  }

  var MAP = {
    instance: null, cluster: null, tileLayers: {}, events: [],
    militaryEvents: [], hotspots: [],
    currentFilter: "all", currentSubtype: null,
    refreshTimer: null, isFullscreen: false,
    currentTheme: "dark", themeObserver: null, _timeModeInterval: null,
    currentDetailEvent: null, _lastNewsCount: 0, _busBound: false,
    _lastRenderTime: 0,
    _lastZoomHash: ""
  };

  var TILES = {
    dark: { style: "https://tiles.openfreemap.org/styles/dark", attribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap" },
    light: { style: "https://tiles.openfreemap.org/styles/positron", attribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap" }
  };

  function detectTheme(){ return document.body.classList.contains("light") ? "light" : "dark"; }

  function updateMetaTheme(){
    var meta = document.querySelector('meta[name="theme-color"]');
    if(!meta) return;
    var oled = document.documentElement.getAttribute("data-oled") === "true";
    var light = document.body.classList.contains("light");
    var color;
    if(oled) color = "#000000";
    else if(light) color = "#f6f4ee";
    else color = "#070c16";
    meta.setAttribute("content", color);
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
        MAP.tileLayers[theme] = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          { maxZoom: 19, attribution: "© OpenStreetMap" }
        );
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
            if (MAP.events.length && MAP.cluster) {
              setTimeout(function(){ renderMarkers(); }, 200);
            }
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
      ".wd-marker-inner{position:relative;width:16px;height:16px;display:grid;place-items:center}" +
      ".wd-marker-icon{width:14px;height:14px;display:grid;place-items:center;position:relative;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,.85)) drop-shadow(0 0 3px currentColor);}" +
      ".wd-marker-icon svg{width:100%;height:100%;display:block;stroke:#070c16;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round;}" +
      ".wd-marker-pulse{position:absolute;inset:0;border-radius:50%;background:currentColor;opacity:.22;z-index:1;animation:wdMarkerPulse 2.6s ease-out infinite}" +
      "@keyframes wdMarkerPulse{0%{transform:scale(.5);opacity:.35}100%{transform:scale(2.2);opacity:0}}" +
      "@media (prefers-reduced-motion: reduce){.wd-marker-pulse{animation:none!important;opacity:.15!important}}" +
      ".marker-cluster-small,.marker-cluster-medium,.marker-cluster-large{background:transparent!important}" +
      ".marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div{background:linear-gradient(135deg,#1e3a5f,#3b6ba8)!important;color:#ffffff!important;font-weight:800!important;border:1px solid rgba(255,255,255,.75)!important;box-shadow:0 1px 3px rgba(0,0,0,.55),0 0 6px rgba(59,130,246,.3)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:Inter,sans-serif!important;}" +
      ".marker-cluster-small, .marker-cluster-small div{width:18px!important;height:18px!important}" +
      ".marker-cluster-small{margin-left:-9px!important;margin-top:-9px!important}" +
      ".marker-cluster-medium, .marker-cluster-medium div{width:22px!important;height:22px!important}" +
      ".marker-cluster-medium{margin-left:-11px!important;margin-top:-11px!important}" +
      ".marker-cluster-large, .marker-cluster-large div{width:26px!important;height:26px!important}" +
      ".marker-cluster-large{margin-left:-13px!important;margin-top:-13px!important}" +
      ".marker-cluster div span{font-size:.56rem!important;line-height:1!important;letter-spacing:-.02em!important}" +
      ".map-wrap.fullscreen .map-legend{display:none!important}" +
      ".map-wrap.fullscreen .map-controls .map-ctrl[data-role='full']{display:none!important}" +
      ".wd-map-close{display:none!important;position:absolute;top:.8rem;right:.8rem;z-index:600;width:42px;height:42px;border-radius:50%;background:rgba(10,16,28,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);color:#e6ebf5;font-size:1.15rem;font-weight:400;line-height:1;place-items:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.6);transition:all .18s}" +
      ".wd-map-close:hover{background:rgba(20,28,44,.95);border-color:rgba(255,255,255,.25);transform:rotate(90deg)}" +
      ".map-wrap.fullscreen .wd-map-close{display:grid!important}" +
      ".map-wrap.fullscreen .map-controls{top:.8rem;left:.8rem;right:auto}" +
      "@media (prefers-reduced-motion: reduce){.wd-marker-pulse,.wd-map-close,.map-ctrl{transition:none!important;animation:none!important}}" +

      ".wd-hotspot-strip{display:none;align-items:center;gap:8px;overflow-x:auto;overflow-y:hidden;padding:10px 14px;margin:0;background:rgba(0,0,0,0.25);border-bottom:1px solid rgba(255,255,255,0.05);scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;position:relative;z-index:5}" +
      ".wd-hotspot-strip::-webkit-scrollbar{display:none}" +
      ".wd-hotspot-strip.show{display:flex}" +
      "body.light .wd-hotspot-strip{background:rgba(0,0,0,0.04);border-bottom-color:rgba(0,0,0,0.08)}" +
      ".wd-hotspot-label{position:sticky;left:0;flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:6px 12px 6px 0;margin-right:2px;font-size:9.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:rgba(255,80,80,0.85);background:var(--bg-1,#070c16);white-space:nowrap;border-right:1px solid rgba(255,80,80,0.15);z-index:2}" +
      "body.light .wd-hotspot-label{background:#f5f5f7;color:rgba(200,40,40,0.9)}" +
      ".wd-hotspot-label svg{width:10px;height:10px;fill:currentColor;opacity:0.85}" +
      ".wd-hotspot-pill{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:18px;border:1px solid transparent;color:#fff;font-size:12.5px;font-weight:600;white-space:nowrap;cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);-webkit-tap-highlight-color:transparent;font-family:inherit;position:relative;overflow:hidden}" +
      ".wd-hotspot-pill:hover{transform:translateY(-1px);filter:brightness(1.1)}" +
      ".wd-hotspot-pill:active{transform:translateY(0)}" +
      ".wd-hotspot-pill .wd-hs-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:16px;padding:0 5px;background:rgba(0,0,0,0.25);border-radius:8px;font-size:10px;font-weight:700}" +
      ".wd-hotspot-pill[data-type='region'] .wd-hs-count{background:rgba(0,0,0,0.35)}" +
      ".wd-hotspot-pill[data-intensity='1']{background:linear-gradient(135deg,rgba(255,122,26,0.7),rgba(230,90,26,0.85));border-color:rgba(255,140,60,0.5)}" +
      ".wd-hotspot-pill[data-intensity='2']{background:linear-gradient(135deg,rgba(255,60,60,0.85),rgba(220,40,40,0.95));border-color:rgba(255,80,80,0.6)}" +
      ".wd-hotspot-pill[data-intensity='3']{background:linear-gradient(135deg,rgba(255,40,40,1),rgba(200,20,20,1));border-color:rgba(255,60,60,0.7);box-shadow:0 0 12px rgba(255,40,40,0.5)}" +
      ".wd-hotspot-pill[data-intensity='4']{background:linear-gradient(135deg,rgba(255,20,20,1),rgba(180,0,0,1));border-color:rgba(255,0,0,0.8);box-shadow:0 0 16px rgba(255,0,0,0.7);animation:wdPulse 1.6s ease-in-out infinite}" +
      "@keyframes wdPulse{0%,100%{box-shadow:0 0 16px rgba(255,0,0,0.7)}50%{box-shadow:0 0 24px rgba(255,0,0,0.9)}}" +
      "@media (prefers-reduced-motion: reduce){.wd-hotspot-pill[data-intensity='4']{animation:none}}" +

      ".wd-map-legend .legend-item{cursor:pointer;transition:all 0.15s;border-radius:6px;padding:3px 6px;margin:0 -6px;-webkit-tap-highlight-color:transparent}" +
      ".wd-map-legend .legend-item:hover{background:rgba(255,255,255,0.05)}" +
      ".wd-map-legend .legend-item.active{background:rgba(224,168,87,0.15);box-shadow:inset 0 0 0 1px rgba(224,168,87,0.4)}" +
      ".wd-map-legend .legend-item.active .legend-num{color:#e0a857;font-weight:800}" +
      "body.light .wd-map-legend .legend-item.active{background:rgba(200,140,40,0.15)}" +

      ".wd-detail-type{text-transform:uppercase;letter-spacing:.5px;font-size:10px;font-weight:800}" +
      ".live-event-mil{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;background:rgba(255,60,60,0.15);color:#ff5050;font-size:9.5px;font-weight:700;letter-spacing:0.5px}" +
      ".live-filter[data-cat='military']{color:#ff5050}" +
      ".live-filter[data-cat='military'].active{background:rgba(255,60,60,0.15);color:#ff5050;border-color:rgba(255,60,60,0.4)}";

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
    if(!wrap) return;
    if(wrap.querySelector(".wd-map-close")) return;
    var btn = document.createElement("button");
    btn.className = "wd-map-close";
    btn.setAttribute("aria-label", "Sluiten");
    btn.textContent = "✕";
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      exitFullscreen();
    });
    wrap.appendChild(btn);
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
        '</div>' +
        '<div class="wd-detail-foot">' +
          '<button class="wd-detail-btn primary" id="wdDetailShowOnMap">Toon op kaart</button>' +
          '<button class="wd-detail-btn" id="wdDetailCloseBtn">Sluiten</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function(e){
      if(e.target === modal) closeDetail();
    });
    $("wdDetailClose").addEventListener("click", closeDetail);
    $("wdDetailCloseBtn").addEventListener("click", closeDetail);
    $("wdDetailShowOnMap").addEventListener("click", function(){
      if(MAP.currentDetailEvent) showEventOnMap(MAP.currentDetailEvent);
    });
  }

  function openDetail(event){
    ensureDetailModal();
    MAP.currentDetailEvent = event;
    var typeConf = resolveTypeConfig(event);
    var color = typeConf.color;
    $("wdDetailType").textContent = typeConf.label;
    $("wdDetailType").style.background = color;
    $("wdDetailMeta").textContent = (event.country || "Onbekend") + " · " + timeAgo(event.date) + (event.source ? " · " + event.source : "");
    $("wdDetailText").textContent = event.fullDescription || event.title || "(geen beschrijving)";
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

  function buildFallbackEvents(){
    if(!window.State || !State.items || !State.items.length) return [];
    var byCat = {};
    State.items.forEach(function(it){
      var cat = it.cat || "";
      if(!LOCATIONS[cat]) return;
      if(!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(it);
    });
    var events = [];
    Object.keys(byCat).forEach(function(cat){
      var loc = LOCATIONS[cat];
      var filter = CATEGORY_FILTER[cat] || "other";
      var typeConfig = TYPES[filter];
      var items = byCat[cat].sort(function(a, b){
        return (new Date(b.date).getTime()||0) - (new Date(a.date).getTime()||0);
      }).slice(0, 2);
      items.forEach(function(it, i){
        var off = i * 0.15;
        events.push({
          id: "fb-" + cat + "-" + i,
          lat: loc.lat + off, lng: loc.lng + off,
          title: it.title || "Geen titel",
          fullDescription: loc.country + "\n\n" + (it.title || "") + "\n\n" + (it.description || ""),
          type: cat, typeConfig: typeConfig, country: loc.country,
          date: it.date || new Date().toISOString(),
          url: it.link || "", source: it.source || "",
          isMilitary: false
        });
      });
    });
    if (events.length > 500) events = events.slice(0, 500);
    return events;
  }

  function fitToMarkers(){
    if(!MAP.instance) return;
    var visible = MAP.events.filter(function(e){
      if(MAP.currentFilter === "all") return true;
      if(MAP.currentFilter === "military") return e.isMilitary === true;
      return !e.isMilitary && resolveTypeConfig(e).filter === MAP.currentFilter;
    });
    if (MAP.currentSubtype) {
      visible = visible.filter(function(e){ return e.subtype === MAP.currentSubtype; });
    }
    if (!visible.length) {
      MAP.instance.setView([29.5, 42.0], 4);
      return;
    }
    if (visible.length === 1) {
      MAP.instance.setView([visible[0].lat, visible[0].lng], 6);
      return;
    }
    try {
      var bounds = L.latLngBounds(visible.map(function(e){ return [e.lat, e.lng]; }));
      MAP.instance.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
      LOG("Auto-zoom naar " + visible.length + " markers");
    } catch(e){}
  }

  function refreshFromNews(){
    var events;
    var militaryCount = MAP.militaryEvents.length;

    if (militaryCount > 0) {
      events = MAP.militaryEvents.slice();
      LOG("Gebruik " + militaryCount + " militaire events");
    } else {
      events = buildFallbackEvents();
      LOG("Fallback: " + events.length + " standaard events");
    }

    if(!events.length){
      var list = $("liveList");
      if(list) list.innerHTML = '<div class="live-empty">Geen militaire events op dit moment.</div>';
      MAP.events = [];
      var statEl = $("statEvents");
      if(statEl) statEl.textContent = "0";
      renderMarkers();
      renderLegend();
      renderLiveList();
      renderHotspots();
      if (MAP.instance) MAP.instance.setView([29.5, 42.0], 4);
      return true;
    }

    MAP.events = events;
    var statEl2 = $("statEvents");
    if(statEl2) statEl2.textContent = events.length;
    renderMarkers();
    renderLegend();
    renderLiveList();
    renderHotspots();

    var zoomHash = MAP.events.map(function(e){ return e.id; }).join("|").slice(0, 200);
    if (zoomHash !== MAP._lastZoomHash) {
      MAP._lastZoomHash = zoomHash;
      setTimeout(fitToMarkers, 200);
    }

    LOG("✅ " + events.length + " events op kaart");
    return true;
  }

  function renderHotspots(){
    var strip = $("wdHotspotStrip");
    var wrap = document.querySelector(".map-wrap");
    if (!wrap) return;

    if (!strip) {
      strip = document.createElement("div");
      strip.id = "wdHotspotStrip";
      strip.className = "wd-hotspot-strip";
      wrap.insertBefore(strip, wrap.firstChild);
    }

    var hotspots = MAP.hotspots || [];
    if (!hotspots.length) {
      strip.classList.remove("show");
      return;
    }

    var flameSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.8 3.6-1.5 5.6-2.4 8.4-.4 1.3-.3 2.6.4 3.6.6-.6 1-1.6 1-2.8 1.4 1 2.2 2.8 2.2 4.6 0 1.7-1.1 3.1-2.6 3.7.9.3 1.9.5 2.9.5 3.9 0 6.5-2.6 6.5-6.5 0-4.5-4.6-6.4-5.2-10.9-1.2.4-2.3 1-2.8 1.4zM12 23c-3.9 0-7-3.1-7-7 0-2.5 1.5-4.3 2.5-6.2C8.5 8 9 6.5 9 4.5 6 6 3 9.5 3 14c0 5 4 9 9 9z"/></svg>';

    var html = '<div class="wd-hotspot-label">' + flameSvg + '<span>Hotspots</span></div>';
    for (var i = 0; i < hotspots.length; i++) {
      var h = hotspots[i];
      var intensity = h.count >= 15 ? 4 : (h.count >= 8 ? 3 : (h.count >= 4 ? 2 : 1));
      var label = h.label || h.country || h.region || "?";
      html += '<button class="wd-hotspot-pill" data-intensity="' + intensity + '" ' +
              'data-type="' + (h.type || "country") + '" ' +
              'data-lat="' + h.lat + '" data-lng="' + h.lng + '" type="button">' +
              escapeHtml(label) +
              '<span class="wd-hs-count">' + h.count + '</span>' +
              '</button>';
    }
    strip.innerHTML = html;
    strip.classList.add("show");

    var pills = strip.querySelectorAll(".wd-hotspot-pill");
    for (var j = 0; j < pills.length; j++) {
      pills[j].addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var lat = parseFloat(this.getAttribute("data-lat"));
        var lng = parseFloat(this.getAttribute("data-lng"));
        if (MAP.instance && !isNaN(lat) && !isNaN(lng)) {
          MAP.instance.setView([lat, lng], 6);
          if (window.showToast) window.showToast("Zoom naar hotspot");
        }
      });
    }
  }

  function renderMarkers(){
    if(!MAP.cluster) return;
    MAP.cluster.clearLayers();
    var filtered = MAP.events.filter(function(e){
      if(MAP.currentFilter === "all") return true;
      if(MAP.currentFilter === "military") return e.isMilitary === true;
      if(MAP.currentFilter === "conflict") return !e.isMilitary && resolveTypeConfig(e).filter === "conflict";
      if(MAP.currentFilter === "political") return !e.isMilitary && resolveTypeConfig(e).filter === "political";
      if(MAP.currentFilter === "other") return !e.isMilitary && resolveTypeConfig(e).filter === "other";
      return true;
    });

    if (MAP.currentSubtype) {
      filtered = filtered.filter(function(e){ return e.subtype === MAP.currentSubtype; });
    }

    var markers = [];
    filtered.forEach(function(e){
      var typeConf = resolveTypeConfig(e);
      var color = typeConf.color;
      var glyph = iconFor(typeConf.filter, e.subtype);
      var icon = L.divIcon({
        className: "wd-marker",
        html: '<div class="wd-marker-inner" style="color:' + color + '">' +
              '<span class="wd-marker-pulse"></span>' +
              '<span class="wd-marker-icon">' + glyph + '</span>' +
              '</div>',
        iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10]
      });
      var marker = L.marker([e.lat, e.lng], {icon: icon});

      var sourceLine = "";
      if (e.source) sourceLine = '<div class="pop-meta">' + escapeHtml(e.source) + '</div>';

      var popupHtml =
        '<div class="pop-cat" style="--cat-color:' + color + '">' + typeConf.label + '</div>' +
        '<div class="pop-title">' + escapeHtml(e.title) + '</div>' +
        '<div class="pop-meta">' + escapeHtml(e.country || "?") + (e.region ? " · " + escapeHtml(e.region) : "") + '</div>' +
        sourceLine +
        '<button class="pop-more" data-id="' + escapeHtml(String(e.id)) + '">Details →</button>';
      marker.bindPopup(popupHtml);
      marker.on("popupopen", function(){
        setTimeout(function(){
          var btn = document.querySelector('.pop-more[data-id="' + e.id + '"]');
          if(btn){
            btn.onclick = function(ev){
              ev.preventDefault();
              ev.stopPropagation();
              openDetail(e);
            };
          }
        }, 50);
      });
      markers.push(marker);
    });
    MAP.cluster.addLayers(markers);
    LOG("Markers gerenderd: " + markers.length);
  }

  function renderLegend(){
    var el = $("legendItems");
    if(!el) return;
    var counts = { aanval: 0, offensief: 0, defensief: 0, voortgang: 0, actief: 0, conflict: 0, political: 0, other: 0 };
    MAP.events.forEach(function(e){
      var k = e.subtype || resolveTypeConfig(e).filter || "other";
      if(counts[k] !== undefined) counts[k]++;
    });

    var rows = [
      { key: "aanval",    color: "#ff2e3e", label: "Aanval" },
      { key: "offensief", color: "#ff7a1a", label: "Offensief" },
      { key: "defensief", color: "#22c55e", label: "Defensief" },
      { key: "voortgang", color: "#a855f7", label: "Voortgang" },
      { key: "actief",    color: "#facc15", label: "Actief" },
      { key: "conflict",  color: "#e63950", label: "Conflict" },
      { key: "political", color: "#3b82f6", label: "Politiek" },
      { key: "other",     color: "#6b7a93", label: "Overig" }
    ].filter(function(r){ return counts[r.key] > 0; });

    if(!rows.length){ el.innerHTML = '<div class="legend-item">Geen data</div>'; return; }

    el.innerHTML = rows.map(function(r){
      var active = (MAP.currentSubtype === r.key) ? " active" : "";
      return '<div class="legend-item' + active + '" data-subtype="' + r.key + '">' +
        '<span class="legend-dot" style="background:' + r.color + '"></span>' +
        '<span>' + r.label + '</span>' +
        '<span class="legend-num">' + counts[r.key] + '</span></div>';
    }).join("");

    Array.prototype.forEach.call(el.querySelectorAll(".legend-item"), function(item){
      item.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var subtype = this.getAttribute("data-subtype");
        if (!subtype) return;

        if (MAP.currentSubtype === subtype) {
          MAP.currentSubtype = null;
          if (window.showToast) window.showToast("Subfilter gewist");
        } else {
          MAP.currentSubtype = subtype;
          if (window.showToast) window.showToast("Filter: " + subtype);
        }
        renderMarkers();
        renderLegend();
        if (MAP.currentSubtype) setTimeout(fitToMarkers, 200);
      });
    });
  }

  function renderLiveList(){
    var list = $("liveList");
    var countEl = $("liveCount");
    if(!list) return;
    var filtered = MAP.events.filter(function(e){
      if(MAP.currentFilter === "all") return true;
      if(MAP.currentFilter === "military") return e.isMilitary === true;
      if(MAP.currentFilter === "conflict") return !e.isMilitary && resolveTypeConfig(e).filter === "conflict";
      if(MAP.currentFilter === "political") return !e.isMilitary && resolveTypeConfig(e).filter === "political";
      if(MAP.currentFilter === "other") return !e.isMilitary && resolveTypeConfig(e).filter === "other";
      return true;
    });

    if (MAP.currentSubtype) {
      filtered = filtered.filter(function(e){ return e.subtype === MAP.currentSubtype; });
    }

    if(countEl) countEl.textContent = filtered.length;
    if(!filtered.length){
      list.innerHTML = '<div class="live-empty">Geen events in deze categorie</div>';
      return;
    }
    list.innerHTML = filtered.map(function(e){
      var typeConf = resolveTypeConfig(e);
      var color = typeConf.color;
      var milBadge = e.isMilitary ? '<span class="live-event-mil">MIL</span>' : '';
      return '<div class="live-event" data-id="' + escapeHtml(String(e.id)) + '" style="--cat-color:' + color + '">' +
        '<div class="live-event-body">' +
        '<div class="live-event-title">' + escapeHtml(e.title) + milBadge + '</div>' +
        '<div class="live-event-meta">' +
        '<span class="live-event-loc">' + escapeHtml(e.country || "—") + '</span>' +
        '<span>·</span>' +
        '<span>' + timeAgo(e.date) + '</span>' +
        '<span class="live-event-cat" style="--cat-color:' + color + '">' + typeConf.label + '</span>' +
        '</div></div></div>';
    }).join("");
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

  function initMap(){
    if(MAP.instance || typeof L === "undefined") return;
    var mapEl = $("map");
    if(!mapEl) return;
    LOG("Init Leaflet map (OpenFreeMap)");
    MAP.instance = L.map("map", {
      center: [29.5, 42.0], zoom: 4, minZoom: 2, maxZoom: 18,
      worldCopyJump: true, zoomControl: false, attributionControl: false,
      preferCanvas: true
    });
    MAP.currentTheme = detectTheme();
    switchTile(MAP.currentTheme);
    MAP.cluster = L.markerClusterGroup({
      maxClusterRadius: 45, spiderfyOnMaxZoom: true, showCoverageOnHover: false,
      zoomToBoundsOnClick: true, disableClusteringAtZoom: 11,
      chunkedLoading: true, chunkInterval: 100, chunkDelay: 50
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
        if(MAP.isFullscreen) exitFullscreen();
        else enterFullscreen();
      });
    }
    if(loc) loc.addEventListener("click", function(){
      if(!navigator.geolocation){ if(window.showToast) window.showToast("Locatie niet ondersteund"); return; }
      navigator.geolocation.getCurrentPosition(function(p){
        if(MAP.instance) MAP.instance.setView([p.coords.latitude, p.coords.longitude], 8);
      }, function(){
        if(window.showToast) window.showToast("Locatie niet beschikbaar");
      }, {timeout: 8000});
    });
  }

  function bindFilters(){
    document.querySelectorAll(".live-filter").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.querySelectorAll(".live-filter").forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        MAP.currentFilter = btn.dataset.cat;
        MAP.currentSubtype = null;
        if(window.WDStorage) WDStorage.set("map_filter", MAP.currentFilter);
        renderMarkers();
        renderLiveList();
        renderLegend();
        setTimeout(fitToMarkers, 200);
      });
    });
  }

  function restoreFilter(){
    try {
      var saved = window.WDStorage ? WDStorage.get("map_filter") : null;
      if(saved && ["all","conflict","political","other","military"].indexOf(saved) >= 0){
        MAP.currentFilter = saved;
        document.querySelectorAll(".live-filter").forEach(function(b){
          b.classList.toggle("active", b.dataset.cat === saved);
        });
      }
    }catch(e){}
  }

  window.__mapRefresh = function(){
    LOG("Handmatige refresh");
    MAP._lastNewsCount = 0;
    MAP._lastZoomHash = "";
    if (window.MapAI) window.MapAI.run();
  };
  window.__mapResetView = function(){ if(MAP.instance) MAP.instance.setView([29.5, 42.0], 4); };

  function activateMapView(){
    LOG("activateMapView");
    initMap();
    ensureFullscreenClose();
    if(MAP.instance) setTimeout(function(){ if(MAP.instance) MAP.instance.invalidateSize(); }, 350);
    if(window.State && State.items && State.items.length){
      refreshFromNews();
    }
  }

  function hookViewSwitch(){
    document.querySelectorAll(".bottom-tabs .tab").forEach(function(tab){
      tab.addEventListener("click", function(){
        if(tab.dataset.view === "map"){
          setTimeout(activateMapView, 200);
        } else {
          if(MAP.isFullscreen) exitFullscreen();
        }
      });
    });
  }

  function bindEventBus(){
    if(MAP._busBound) return;
    if(!window.WarDesk || !WarDesk.events || !WarDesk.events.on){
      LOG("⚠️ EventBus niet beschikbaar");
      return;
    }
    MAP._busBound = true;

    WarDesk.events.on("map:military-events", function(events){
      MAP.militaryEvents = events || [];
      LOG("Militaire events ontvangen: " + MAP.militaryEvents.length);
      if (isMapActive()) refreshFromNews();
    });

    WarDesk.events.on("map:hotspots", function(hotspots){
      MAP.hotspots = hotspots || [];
      LOG("Hotspots ontvangen: " + MAP.hotspots.length);
      renderHotspots();
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

  function initMapModule(){
    LOG("initMapModule");
    injectMapStyles();
    ensureDetailModal();
    ensureFullscreenClose();
    bindControls();
    bindFilters();
    hookViewSwitch();
    restoreFilter();
    bindEventBus();

    var themeBtn = $("btnTheme");
    if(themeBtn){
      themeBtn.addEventListener("click", function(){
        markManualTheme();
        setTimeout(updateMetaTheme, 50);
      });
    }

    observeThemeChanges();
    checkTimeMode();
    updateMetaTheme();

    if(!MAP._timeModeInterval){
      MAP._timeModeInterval = setInterval(function(){
        if(document.hidden) return;
        checkTimeMode();
      }, 60000);
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
    if(modal && modal.classList.contains("show")){
      closeDetail();
    } else if(MAP.isFullscreen){
      exitFullscreen();
    }
  }, true);

  window.MAPAPI = { refresh: refreshFromNews, state: MAP };

  wdLog.info("[WAR DESK] map-v11.10.js v13.3 geladen");
})();