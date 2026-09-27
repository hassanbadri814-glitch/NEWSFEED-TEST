/* ============================================================
   WAR DESK — worldmap.js v2.0
   ------------------------------------------------------------
   - v2.0: conflict-kaart (grijs + rood + actor-ring)
         + legenda-toggle knop
   - v1.1: CDN mode
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[WM]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var GEOJSON_URLS = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  ];
  var CACHE_KEY = "wardesk_countries_geojson";
  var CACHE_VERSION = "v2";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  var WM = {
    layer: null,
    cityLayer: null,
    targetHeatByCountry: {},
    actorHeatByCountry: {},
    isLoaded: false,
    isEnabled: true,
    isLegendVisible: true,
    lastHeatCalc: 0,
    map: null
  };

  /* ============================================================
     GEOJSON LADEN
     ============================================================ */
  async function loadGeoJSON(){
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      var cachedTime = parseInt(localStorage.getItem(CACHE_KEY + "_t") || "0", 10);
      var cachedVer = localStorage.getItem(CACHE_KEY + "_ver");
      if (cached && cachedVer === CACHE_VERSION && (Date.now() - cachedTime) < CACHE_MAX_AGE_MS){
        var parsed = JSON.parse(cached);
        if (parsed && parsed.features && parsed.features.length > 100){
          LOG("GeoJSON uit cache: " + parsed.features.length + " features");
          return parsed;
        }
      }
    } catch(e){}

    for (var i = 0; i < GEOJSON_URLS.length; i++){
      try {
        LOG("GeoJSON laden van CDN " + (i+1) + "...");
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, 20000);
        var res = await fetch(GEOJSON_URLS[i], { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        var json = await res.json();
        if (!json.features || json.features.length < 50){
          throw new Error("Te weinig features");
        }
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json));
          localStorage.setItem(CACHE_KEY + "_t", String(Date.now()));
          localStorage.setItem(CACHE_KEY + "_ver", CACHE_VERSION);
        } catch(e){
          LOG("GeoJSON te groot voor cache");
        }
        LOG("GeoJSON geladen: " + json.features.length + " features");
        return json;
      } catch(e){
        LOG("CDN " + (i+1) + " faalde: " + e.message);
      }
    }
    return null;
  }

  function getISO3(feature){
    if (!feature || !feature.properties) return null;
    var p = feature.properties;
    return p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.adm0_a3 ||
           p.ISO_A3_EH || p.SOV_A3 || p.iso_a3_eh || null;
  }

  function getCountryName(feature){
    if (!feature || !feature.properties) return "?";
    var p = feature.properties;
    /* Nederlandse naam als beschikbaar */
    return p.NAME_NL || p.name_nl || p.NAME || p.name || p.ADMIN || p.admin || "?";
  }

  /* ============================================================
     HITTE BEREKENEN — per land, MET actor/target onderscheid
     ============================================================ */
  function calculateHeat(events){
    var now = Date.now();
    var thresholds = window.WORLDMAP_THRESHOLDS || {};
    var decayHalfLife = (thresholds.decay_half_life_days || 3) * 24 * 60 * 60 * 1000;
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    var maxPerSource = thresholds.max_events_per_source_per_day || 3;

    var targetByCountry = {};
    var actorByCountry = {};

    events.forEach(function(ev){
      if (!ev) return;
      if (ev.category !== "militair" && ev.category !== "crime") return;

      var ts = new Date(ev.date).getTime();
      if (ts < weekAgo) return;

      var age = now - ts;
      var decayFactor = Math.pow(0.5, age / decayHalfLife);
      var tierWeight = window.WorldMapData
        ? window.WorldMapData.getTier(ev.source)
        : 0.5;
      var weight = decayFactor * tierWeight;

      var dayKey = new Date(ts).toISOString().slice(0, 10);
      var sourceKey = (ev.source || "?") + "|" + dayKey;

      /* Target — het land waar het gebeurt (locatie van event) */
      if (ev.countryISO3 || ev.country){
        var targetKey = ev.countryISO3 || ev.country;
        if (!targetByCountry[targetKey]){
          targetByCountry[targetKey] = { total: 0, bySource: {}, count: 0 };
        }
        if (!targetByCountry[targetKey].bySource[sourceKey]){
          targetByCountry[targetKey].bySource[sourceKey] = 0;
        }
        if (targetByCountry[targetKey].bySource[sourceKey] < maxPerSource){
          targetByCountry[targetKey].bySource[sourceKey]++;
          targetByCountry[targetKey].total += weight;
          targetByCountry[targetKey].count++;
        }
      }

      /* Actor — wie valt aan? */
      var actors = ev.actorCountries || [];
      actors.forEach(function(actorCountry){
        if (!actorCountry) return;
        var actorKey = actorCountry;
        /* Skip als actor === target (binnenlandse conflicten) */
        if (actorKey === ev.countryISO3 || actorKey === ev.country) return;

        if (!actorByCountry[actorKey]){
          actorByCountry[actorKey] = { total: 0, bySource: {}, count: 0 };
        }
        if (!actorByCountry[actorKey].bySource[sourceKey]){
          actorByCountry[actorKey].bySource[sourceKey] = 0;
        }
        if (actorByCountry[actorKey].bySource[sourceKey] < maxPerSource){
          actorByCountry[actorKey].bySource[sourceKey]++;
          actorByCountry[actorKey].total += weight;
          actorByCountry[actorKey].count++;
        }
      });
    });

    var targetHeatMap = {};
    Object.keys(targetByCountry).forEach(function(c){
      targetHeatMap[c] = Math.round(targetByCountry[c].total * 10) / 10;
    });

    var actorHeatMap = {};
    Object.keys(actorByCountry).forEach(function(c){
      actorHeatMap[c] = Math.round(actorByCountry[c].total * 10) / 10;
    });

    WM.targetHeatByCountry = targetHeatMap;
    WM.actorHeatByCountry = actorHeatMap;
    WM.lastHeatCalc = now;

    LOG("Heat herberekend: " + Object.keys(targetHeatMap).length + " doelwit-landen, " +
        Object.keys(actorHeatMap).length + " aanvaller-landen");
    return { targets: targetHeatMap, actors: actorHeatMap };
  }

  /* ============================================================
     HITTE → CONFLICT-LEVEL
     ============================================================ */
  function getConflictLevel(heat){
    var th = (window.WORLDMAP_THRESHOLDS || {}).heat || {};
    var warm = th.warm || 5;
    var hot = th.hot || 15;
    var scorching = th.scorching || 40;

    if (heat >= scorching) return "scorching";
    if (heat >= hot) return "hot";
    if (heat >= warm) return "warm";
    return "cold";
  }

  function getFillColor(level){
    var c = window.CONFLICT_COLORS || {};
    if (level === "scorching") return c.scorching || "#d41919";
    if (level === "hot") return c.hot || "#a52a2a";
    if (level === "warm") return c.warm || "#7a4040";
    return c.cold || "#2f2f38";
  }

  function getFillOpacity(level){
    if (level === "scorching") return 0.85;
    if (level === "hot") return 0.72;
    if (level === "warm") return 0.55;
    return 0.20;
  }

  /* ============================================================
     STIJL PER LAND
     ============================================================ */
  function styleCountry(feature){
    var iso3 = getISO3(feature);
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;
    var totalHeat = targetHeat + actorHeat;
    var cc = window.CONFLICT_COLORS || {};

    /* Geen activiteit → grijs */
    if (totalHeat < 0.5 && actorHeat < 0.5){
      return {
        fillColor: cc.cold || "#2f2f38",
        fillOpacity: 0.20,
        color: cc.border || "rgba(255,255,255,0.12)",
        weight: 0.5
      };
    }

    var level = getConflictLevel(targetHeat);
    var fillColor = getFillColor(level);
    var fillOpacity = getFillOpacity(level);

    /* Rand = aanvaller-niveau */
    var actorThreshold = (window.WORLDMAP_THRESHOLDS || {}).actor_ring_min || 3;
    var actorHotThreshold = (window.WORLDMAP_THRESHOLDS || {}).actor_ring_hot || 15;
    var borderColor = cc.border || "rgba(255,255,255,0.12)";
    var borderWeight = 0.5;
    var dashArray = null;

    if (actorHeat >= actorHotThreshold){
      borderColor = cc.actorHot || "#ff2222";
      borderWeight = 2.5;
    } else if (actorHeat >= actorThreshold){
      borderColor = cc.actorRing || "#ff6666";
      borderWeight = 1.8;
    }

    if (level === "scorching"){
      borderColor = cc.borderHot || "#ff0000";
      borderWeight = Math.max(borderWeight, 2);
      dashArray = "4 2";
    }

    return {
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      color: borderColor,
      weight: borderWeight,
      dashArray: dashArray
    };
  }

  /* ============================================================
     HOVER TOOLTIP
     ============================================================ */
  function onEachCountry(feature, layer){
    var iso3 = getISO3(feature);
    var name = getCountryName(feature);
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;

    var lines = ["<b>" + name + "</b>"];

    if (targetHeat > 0 || actorHeat > 0){
      if (targetHeat > 0){
        lines.push("🎯 Doelwit: " + targetHeat.toFixed(1) + " events");
      }
      if (actorHeat > 0){
        lines.push("⚔️ Aanvaller: " + actorHeat.toFixed(1) + " events");
      }
    } else {
      lines.push("Rustig — geen militaire events");
    }

    layer.bindTooltip(lines.join("<br>"), {
      sticky: true,
      direction: "top",
      className: "wm-tooltip"
    });

    layer.on({
      mouseover: function(e){
        var l = e.target;
        var level = getConflictLevel(targetHeat);
        var currentOpacity = getFillOpacity(level);
        l.setStyle({
          weight: 2.5,
          color: "#e0a857",
          fillOpacity: Math.min(0.9, currentOpacity + 0.15)
        });
      },
      mouseout: function(e){
        if (WM.layer) WM.layer.resetStyle(e.target);
      }
    });
  }

  /* ============================================================
     CITY-STIPPEN
     ============================================================ */
  function renderCityDots(map){
    if (!window.CityStatus) return;
    if (WM.cityLayer){ WM.cityLayer.clearLayers(); }
    else { WM.cityLayer = L.layerGroup().addTo(map); }

    var cities = window.CityStatus.getAllCities();
    cities.forEach(function(c){
      if (!c || !c.city) return;
      var loc = null;
      if (window.__wm_locations && window.__wm_locations[c.city]){
        loc = window.__wm_locations[c.city];
      }
      if (!loc) return;

      var controller = c.controller;
      var alliance = window.WorldMapData
        ? window.WorldMapData.getAlliance(controller)
        : "neutral";
      var color = window.WorldMapData
        ? window.WorldMapData.getColor(alliance)
        : "#6b7280";
      var isClaim = c.confidence < 0.7 && c.claimedBy;

      var icon = L.divIcon({
        className: "wm-city-dot",
        html: '<div style="width:10px;height:10px;border-radius:50%;background:' + color +
              ';box-shadow:0 0 8px ' + color + ';' +
              (isClaim ? 'border:2px dashed rgba(255,255,255,0.7);' : '') + '"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });

      var marker = L.marker([loc.lat, loc.lng], { icon: icon });
      marker.bindTooltip(
        "<b>" + c.city + "</b><br>" +
        "Controller: " + (controller || "?") + "<br>" +
        "Claim: " + (c.claimedBy || "-") + "<br>" +
        "Confidence: " + (c.confidence * 100).toFixed(0) + "%",
        { direction: "top", className: "wm-tooltip" }
      );
      WM.cityLayer.addLayer(marker);
    });
  }

  /* ============================================================
     LEGENDA — met toggle-knop
     ============================================================ */
  function ensureLegend(map){
    if (document.getElementById("wmLegend")) return;
    var legend = document.createElement("div");
    legend.id = "wmLegend";
    legend.className = "wm-legend";
    legend.innerHTML =
      '<div class="wm-legend-title">Wereldkaart · Conflict</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#2f2f38"></span>Rustig</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#7a4040"></span>Lichte activiteit</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#a52a2a"></span>Actief conflict</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#d41919"></span>Extreem (scorching)</div>' +
      '<div class="wm-legend-row" style="margin-top:.35rem;padding-top:.35rem;border-top:1px solid rgba(255,255,255,.08)"><span class="wm-legend-swatch" style="background:transparent;border:2px solid #ff6666;box-sizing:border-box"></span>Aanvaller-rand</div>' +
      '<div class="wm-legend-hint">Kleur = militaire events (7 dagen)<br>Rand = wie valt aan</div>';

    var wrap = document.querySelector(".map-wrap");
    if (wrap) wrap.appendChild(legend);
  }

  /* Legenda-toggle knop */
  function ensureLegendToggle(){
    var wrap = document.querySelector(".map-wrap");
    if (!wrap || wrap.querySelector(".wm-legend-toggle")) return;
    var btn = document.createElement("button");
    btn.className = "wm-legend-toggle";
    btn.setAttribute("aria-label", "Legenda aan/uit");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>';
    btn.addEventListener("click", function(){
      WM.isLegendVisible = !WM.isLegendVisible;
      var leg = document.getElementById("wmLegend");
      if (leg) leg.style.display = WM.isLegendVisible ? "" : "none";
      btn.classList.toggle("off", !WM.isLegendVisible);
      try {
        if (window.WDStorage) WDStorage.set("worldmap_legend", WM.isLegendVisible ? "1" : "0");
      } catch(e){}
      LOG("Legenda " + (WM.isLegendVisible ? "aan" : "uit"));
    });
    wrap.appendChild(btn);
  }

  function restoreLegendVisibility(){
    try {
      var saved = window.WDStorage ? WDStorage.get("worldmap_legend") : null;
      if (saved === "0"){
        WM.isLegendVisible = false;
        var leg = document.getElementById("wmLegend");
        if (leg) leg.style.display = "none";
        var btn = document.querySelector(".wm-legend-toggle");
        if (btn) btn.classList.add("off");
      }
    } catch(e){}
  }

  /* ============================================================
     STYLES
     ============================================================ */
  function injectStyles(){
    if (document.getElementById("wmStyles")) return;
    var s = document.createElement("style");
    s.id = "wmStyles";
    s.textContent =
      /* Tooltip */
      ".wm-tooltip{background:rgba(13,21,34,.95);color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:8px;font-size:12px;padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:Inter,sans-serif;line-height:1.4;}" +
      ".wm-tooltip::before{border-top-color:rgba(224,168,87,.4)!important;}" +
      "html.light .wm-tooltip{background:rgba(255,255,255,.97);color:#131721;border-color:rgba(0,0,0,.15);}" +
      /* Legenda */
      ".wm-legend{position:absolute;bottom:.7rem;right:.7rem;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:10px;padding:.6rem .7rem;font-size:.68rem;color:#e6ebf5;max-width:180px;z-index:400;box-shadow:0 4px 20px rgba(0,0,0,.5);line-height:1.4;}" +
      "html.light .wm-legend{background:rgba(255,255,255,.95);color:#131721;border-color:rgba(0,0,0,.12);}" +
      ".wm-legend-title{font-weight:800;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:#e0a857;margin-bottom:.4rem;padding-bottom:.3rem;border-bottom:1px solid rgba(224,168,87,.25);}" +
      ".wm-legend-row{display:flex;align-items:center;gap:.35rem;padding:.1rem 0;}" +
      ".wm-legend-swatch{width:11px;height:11px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px currentColor;}" +
      ".wm-legend-hint{margin-top:.35rem;padding-top:.35rem;border-top:1px solid rgba(255,255,255,.08);font-size:.6rem;opacity:.75;line-height:1.3;}" +
      ".wm-city-dot{background:transparent!important;border:none!important;}" +
      /* Legenda-toggle knop */
      ".wm-legend-toggle{position:absolute;bottom:.7rem;right:.7rem;z-index:401;width:32px;height:32px;border-radius:8px;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.4);color:#e0a857;display:none;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:all .18s;padding:0;}" +
      ".wm-legend-toggle:hover{background:rgba(226,168,87,.2);}" +
      ".wm-legend-toggle.off{opacity:.5;color:#8a94a8;border-color:rgba(255,255,255,.15);}" +
      ".wm-legend-toggle svg{width:16px;height:16px;}" +
      ".map-wrap:has(#wmLegend[style*='display: none']) .wm-legend-toggle{display:grid;}" +
      ".map-wrap:has(#wmLegend[style='']) .wm-legend-toggle{display:none;}" +
      /* Simpelere fallback als :has niet werkt */
      "@supports not selector(:has(*)){.wm-legend-toggle{display:grid!important;bottom:.7rem;right:.7rem;}.wm-legend{right:3.2rem;}}" +
      "@media (max-width:640px){.wm-legend{font-size:.6rem;padding:.5rem .6rem;max-width:150px;}.wm-legend-row{font-size:.6rem;}}";
    document.head.appendChild(s);
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init(map){
    if (!map || WM.isLoaded) return;
    WM.map = map;
    injectStyles();

    var geo = await loadGeoJSON();
    if (!geo){
      LOG("Kon GeoJSON niet laden");
      return;
    }

    WM.layer = L.geoJSON(geo, {
      style: styleCountry,
      onEachFeature: onEachCountry,
      smoothFactor: 1,
      interactive: true
    });

    WM.layer.addTo(map);

    /* Zorg dat markers erboven blijven */
    if (window.MAP && window.MAP.cluster && window.MAP.cluster.bringToFront){
      window.MAP.cluster.bringToFront();
    }

    ensureLegend(map);
    ensureLegendToggle();
    restoreLegendVisibility();

    WM.isLoaded = true;
    LOG("Wereldkaart v2.0 geladen — " + geo.features.length + " features");
  }

  function refresh(events){
    if (!WM.isLoaded) return;
    if (!WM.isEnabled) return;
    if (!Array.isArray(events)) return;

    var now = Date.now();
    var recalc = (window.WORLDMAP_THRESHOLDS || {}).heat_recalc_interval_ms || (5 * 60 * 1000);
    if (now - WM.lastHeatCalc < recalc && Object.keys(WM.targetHeatByCountry).length > 0){
      return;
    }

    calculateHeat(events);

    if (WM.layer){
      WM.layer.eachLayer(function(layer){
        if (layer.feature){
          layer.setStyle(styleCountry(layer.feature));
        }
      });
    }

    if (WM.map) renderCityDots(WM.map);
  }

  function setEnabled(enabled){
    WM.isEnabled = !!enabled;
    if (!WM.map || !WM.layer) return;
    if (WM.isEnabled){
      if (!WM.map.hasLayer(WM.layer)) WM.layer.addTo(WM.map);
      if (WM.cityLayer && !WM.map.hasLayer(WM.cityLayer)) WM.cityLayer.addTo(WM.map);
    } else {
      if (WM.map.hasLayer(WM.layer)) WM.map.removeLayer(WM.layer);
      if (WM.cityLayer && WM.map.hasLayer(WM.cityLayer)) WM.map.removeLayer(WM.cityLayer);
    }
    var leg = document.getElementById("wmLegend");
    if (leg) leg.style.display = (WM.isEnabled && WM.isLegendVisible) ? "" : "none";
    var legBtn = document.querySelector(".wm-legend-toggle");
    if (legBtn) legBtn.style.display = WM.isEnabled ? "" : "none";
    LOG("Wereldkaart " + (WM.isEnabled ? "aan" : "uit"));
  }

  window.WorldMap = {
    init: init,
    refresh: refresh,
    setEnabled: setEnabled,
    isEnabled: function(){ return WM.isEnabled; },
    isLoaded: function(){ return WM.isLoaded; },
    calculateHeat: calculateHeat,
    getTargetHeatMap: function(){ return WM.targetHeatByCountry; },
    getActorHeatMap: function(){ return WM.actorHeatByCountry; },
    _state: WM
  };

  LOG("worldmap.js v2.0 geladen (conflict-modus)");

})();