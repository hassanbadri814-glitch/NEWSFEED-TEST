/* ============================================================
   WAR DESK — worldmap.js v2.2
   ------------------------------------------------------------
   - v2.2: alleen countsForHeat events + REG-skip
   - v2.1: lagere heat-drempels + debug log
   - v2.0: conflict-kaart + legenda-toggle
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[WM]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var GEOJSON_URLS = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  ];
  var CACHE_KEY = "wardesk_countries_geojson";
  var CACHE_VERSION = "v4";
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
    return p.NAME_NL || p.name_nl || p.NAME || p.name || p.ADMIN || p.admin || "?";
  }

  /* ============================================================
     HEAT BEREKENEN
     ============================================================ */
  function calculateHeat(events){
    var now = Date.now();
    var thresholds = window.WORLDMAP_THRESHOLDS || {};
    var decayHalfLife = (thresholds.decay_half_life_days || 3) * 24 * 60 * 60 * 1000;
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    var maxPerSource = thresholds.max_events_per_source_per_day || 3;
    var SKIP_PREFIX = "REG-";

    var targetByCountry = {};
    var actorByCountry = {};
    var skippedNonPhysical = 0;
    var skippedReg = 0;

    events.forEach(function(ev){
      if (!ev) return;
      if (ev.category !== "militair" && ev.category !== "crime") return;

      /* v2.2: alleen fysieke events meetellen */
      if (ev.countsForHeat === false) { skippedNonPhysical++; return; }

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

      /* Target */
      var targetKey = ev.countryISO3 || ev.country;
      if (targetKey && targetKey.indexOf(SKIP_PREFIX) !== 0){
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
      } else if (targetKey && targetKey.indexOf(SKIP_PREFIX) === 0){
        skippedReg++;
      }

      /* Actor */
      var actors = ev.actorCountries || [];
      actors.forEach(function(actorCountry){
        if (!actorCountry) return;
        var actorIso = null;
        try {
          if (window.WorldMapData && window.WorldMapData.getISO3){
            actorIso = window.WorldMapData.getISO3(actorCountry);
          }
        } catch(e){}
        var actorKey = actorIso || actorCountry;
        if (actorKey.indexOf(SKIP_PREFIX) === 0) return;
        if (actorKey === targetKey) return;

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

    try {
      var sortedTargets = Object.keys(targetHeatMap).map(function(k){
        return { key: k, val: targetHeatMap[k] };
      }).sort(function(a, b){ return b.val - a.val; }).slice(0, 5);
      var targetStr = sortedTargets.map(function(x){ return x.key + ":" + x.val; }).join(" ");
      LOG("Heat top-5 doelwitten: " + (targetStr || "(leeg)"));

      var sortedActors = Object.keys(actorHeatMap).map(function(k){
        return { key: k, val: actorHeatMap[k] };
      }).sort(function(a, b){ return b.val - a.val; }).slice(0, 3);
      var actorStr = sortedActors.map(function(x){ return x.key + ":" + x.val; }).join(" ");
      LOG("Heat top-3 aanvallers: " + (actorStr || "(leeg)"));
    } catch(e){}

    LOG("Heat herberekend: " + Object.keys(targetHeatMap).length + " doelwit-landen, " +
        Object.keys(actorHeatMap).length + " aanvaller-landen | " +
        "skip niet-fysiek:" + skippedNonPhysical + " REG:" + skippedReg);
    return { targets: targetHeatMap, actors: actorHeatMap };
  }

  function getConflictLevel(heat){
    var th = (window.WORLDMAP_THRESHOLDS || {}).heat || {};
    var warm = th.warm || 0.5;
    var hot = th.hot || 1.5;
    var scorching = th.scorching || 3;

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
    if (level === "scorching") return 0.88;
    if (level === "hot") return 0.78;
    if (level === "warm") return 0.65;
    return 0.30;
  }

  function styleCountry(feature){
    var iso3 = getISO3(feature);
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;
    var totalHeat = targetHeat + actorHeat;
    var cc = window.CONFLICT_COLORS || {};

    if (totalHeat < 0.1){
      return {
        fillColor: cc.cold || "#2f2f38",
        fillOpacity: 0.30,
        color: cc.border || "rgba(255,255,255,0.12)",
        weight: 0.5
      };
    }

    var level = getConflictLevel(targetHeat);
    var fillColor = getFillColor(level);
    var fillOpacity = getFillOpacity(level);

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
      lines.push("Rustig — geen fysieke militaire events");
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

  function ensureLegend(map){
    if (document.getElementById("wmLegend")) return;
    var legend = document.createElement("div");
    legend.id = "wmLegend";
    legend.className = "wm-legend";
    legend.innerHTML =
      '<div class="wm-legend-title">Conflictkaart</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#2f2f38"></span>Rustig</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#7a4040"></span>Lichte activiteit</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#a52a2a"></span>Actief conflict</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#d41919"></span>Extreem</div>' +
      '<div class="wm-legend-row wm-legend-row-ring"><span class="wm-legend-swatch wm-legend-swatch-ring"></span>Aanvaller</div>' +
      '<div class="wm-legend-hint">Alleen fysieke militaire acties</div>';

    var wrap = document.querySelector(".map-wrap");
    if (wrap) wrap.appendChild(legend);
  }

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

  function injectStyles(){
    if (document.getElementById("wmStyles")) return;
    var s = document.createElement("style");
    s.id = "wmStyles";
    s.textContent =
      ".wm-tooltip{background:rgba(13,21,34,.95);color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:8px;font-size:12px;padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:Inter,sans-serif;line-height:1.4;}" +
      ".wm-tooltip::before{border-top-color:rgba(224,168,87,.4)!important;}" +
      "html.light .wm-tooltip{background:rgba(255,255,255,.97);color:#131721;border-color:rgba(0,0,0,.15);}" +
      ".wm-legend{position:absolute;bottom:.6rem;right:.6rem;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:9px;padding:.5rem .6rem;font-size:.6rem;color:#e6ebf5;max-width:135px;z-index:400;box-shadow:0 4px 20px rgba(0,0,0,.5);line-height:1.35;}" +
      "html.light .wm-legend{background:rgba(255,255,255,.95);color:#131721;border-color:rgba(0,0,0,.12);}" +
      ".wm-legend-title{font-weight:800;font-size:.58rem;text-transform:uppercase;letter-spacing:.05em;color:#e0a857;margin-bottom:.3rem;padding-bottom:.25rem;border-bottom:1px solid rgba(224,168,87,.25);}" +
      ".wm-legend-row{display:flex;align-items:center;gap:.3rem;padding:.05rem 0;font-size:.58rem;}" +
      ".wm-legend-swatch{width:10px;height:10px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px currentColor;}" +
      ".wm-legend-row-ring{padding-top:.15rem;margin-top:.15rem;border-top:1px solid rgba(255,255,255,.08);}" +
      ".wm-legend-swatch-ring{background:transparent!important;border:2px solid #ff6666;box-sizing:border-box;border-radius:50%;}" +
      ".wm-legend-hint{margin-top:.3rem;padding-top:.3rem;border-top:1px solid rgba(255,255,255,.08);font-size:.55rem;opacity:.75;line-height:1.25;}" +
      ".wm-city-dot{background:transparent!important;border:none!important;}" +
      ".wm-legend-toggle{position:absolute;bottom:.6rem;right:.6rem;z-index:401;width:30px;height:30px;border-radius:8px;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.4);color:#e0a857;display:none;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:all .18s;padding:0;}" +
      ".wm-legend-toggle:hover{background:rgba(226,168,87,.2);}" +
      ".wm-legend-toggle.off{opacity:.5;color:#8a94a8;border-color:rgba(255,255,255,.15);}" +
      ".wm-legend-toggle svg{width:15px;height:15px;}" +
      ".map-wrap:has(#wmLegend[style*='display: none']) .wm-legend-toggle{display:grid;}" +
      "@supports not selector(:has(*)){.wm-legend-toggle{display:grid!important;bottom:.6rem;right:.6rem;}.wm-legend{right:2.9rem;}}" +
      "@media (max-width:640px){.wm-legend{font-size:.55rem;padding:.4rem .5rem;max-width:125px;}.wm-legend-row{font-size:.55rem;}.wm-legend-title{font-size:.55rem;}.wm-legend-hint{font-size:.5rem;}}";
    document.head.appendChild(s);
  }

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

    if (window.MAP && window.MAP.cluster && window.MAP.cluster.bringToFront){
      window.MAP.cluster.bringToFront();
    }

    ensureLegend(map);
    ensureLegendToggle();
    restoreLegendVisibility();

    WM.isLoaded = true;
    LOG("Wereldkaart v2.2 geladen — " + geo.features.length + " features");
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

  LOG("worldmap.js v2.2 geladen (alleen fysieke events)");

})();