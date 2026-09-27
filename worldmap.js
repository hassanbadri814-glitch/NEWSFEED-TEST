/* ============================================================
   WAR DESK — worldmap.js v1.1
   ------------------------------------------------------------
   - v1.1: GeoJSON van CDN ipv lokaal bestand
   - Leaflet GeoJSON laag voor landen
   - Kleur op basis van alliantie + hitte-overlay
   - Stad-stippen voor controller-status
   - Legenda
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[WM]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  /* CDN URLs — jsdelivr is primair, github raw is fallback */
  var GEOJSON_URLS = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  ];
  var CACHE_KEY = "wardesk_countries_geojson";
  var CACHE_VERSION = "v1";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; /* 30 dagen */

  var WM = {
    layer: null,
    cityLayer: null,
    heatByCountry: {},
    isLoaded: false,
    isEnabled: true,
    lastHeatCalc: 0,
    map: null
  };

  /* ============================================================
     GEOJSON LADEN — cache eerst, dan CDN
     ============================================================ */
  async function loadGeoJSON(){
    /* Probeer cache eerst */
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

    /* Fetch van CDN — probeer URL voor URL */
    for (var i = 0; i < GEOJSON_URLS.length; i++){
      try {
        LOG("GeoJSON laden van: " + GEOJSON_URLS[i].slice(0, 60) + "...");
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, 20000);
        var res = await fetch(GEOJSON_URLS[i], { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        var json = await res.json();
        if (!json.features || json.features.length < 50){
          throw new Error("Te weinig features");
        }

        /* Cache opslaan — sommige browsers weigeren bij > 5MB */
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json));
          localStorage.setItem(CACHE_KEY + "_t", String(Date.now()));
          localStorage.setItem(CACHE_KEY + "_ver", CACHE_VERSION);
        } catch(e){
          LOG("GeoJSON te groot voor localStorage — werk zonder cache");
        }

        LOG("GeoJSON geladen: " + json.features.length + " features");
        return json;
      } catch(e){
        LOG("URL " + i + " faalde: " + e.message);
      }
    }

    LOG("Kon GeoJSON niet laden van enige CDN");
    return null;
  }

  /* ============================================================
     ISO3 OPHALEN
     ============================================================ */
  function getISO3(feature){
    if (!feature || !feature.properties) return null;
    var p = feature.properties;
    return p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.adm0_a3 ||
           p.ISO_A3_EH || p.SOV_A3 || p.iso_a3_eh || null;
  }

  /* ============================================================
     HITTE BEREKENEN
     ============================================================ */
  function calculateHeat(events){
    var now = Date.now();
    var thresholds = window.WORLDMAP_THRESHOLDS || {};
    var decayHalfLife = (thresholds.decay_half_life_days || 3) * 24 * 60 * 60 * 1000;
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    var maxPerSource = thresholds.max_events_per_source_per_day || 3;

    var byCountry = {};

    events.forEach(function(ev){
      if (!ev || !ev.country) return;
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

      if (!byCountry[ev.country]){
        byCountry[ev.country] = { total: 0, bySource: {}, count: 0 };
      }
      if (!byCountry[ev.country].bySource[sourceKey]){
        byCountry[ev.country].bySource[sourceKey] = 0;
      }
      if (byCountry[ev.country].bySource[sourceKey] >= maxPerSource) return;

      byCountry[ev.country].bySource[sourceKey]++;
      byCountry[ev.country].total += weight;
      byCountry[ev.country].count++;
    });

    var heatMap = {};
    Object.keys(byCountry).forEach(function(c){
      heatMap[c] = Math.round(byCountry[c].total * 10) / 10;
    });

    WM.heatByCountry = heatMap;
    WM.lastHeatCalc = now;

    LOG("Heat herberekend: " + Object.keys(heatMap).length + " landen");
    return heatMap;
  }

  function getHeatOpacity(heat){
    var th = (window.WORLDMAP_THRESHOLDS || {}).heat || {};
    var cold = th.cold || 0;
    var warm = th.warm || 5;
    var hot = th.hot || 15;
    var scorching = th.scorching || 40;

    if (heat <= cold) return 0.30;
    if (heat < warm) return 0.30 + (heat - cold) / (warm - cold) * 0.20;
    if (heat < hot) return 0.50 + (heat - warm) / (hot - warm) * 0.20;
    if (heat < scorching) return 0.70 + (heat - hot) / (scorching - hot) * 0.15;
    return 0.85;
  }

  function isScorching(heat){
    var th = (window.WORLDMAP_THRESHOLDS || {}).heat || {};
    return heat >= (th.scorching || 40);
  }

  /* ============================================================
     STIJL per land
     ============================================================ */
  function styleCountry(feature){
    var iso3 = getISO3(feature);
    var alliance = window.WorldMapData
      ? window.WorldMapData.getAlliance(iso3)
      : "neutral";
    var baseColor = window.WorldMapData
      ? window.WorldMapData.getColor(alliance)
      : "#6b7280";
    var heat = WM.heatByCountry[iso3] || 0;
    var opacity = getHeatOpacity(heat);
    var scorching = isScorching(heat);

    return {
      fillColor: baseColor,
      weight: scorching ? 2 : 1,
      opacity: 0.9,
      color: scorching ? "#ff2e3e" : "rgba(255,255,255,0.15)",
      fillOpacity: opacity,
      dashArray: scorching ? "4 2" : null
    };
  }

  /* ============================================================
     HOVER
     ============================================================ */
  function onEachCountry(feature, layer){
    var iso3 = getISO3(feature);
    var props = feature.properties || {};
    var name = props.NAME || props.name || props.ADMIN || iso3 || "?";
    var alliance = window.WorldMapData
      ? window.WorldMapData.getAlliance(iso3)
      : "neutral";
    var heat = WM.heatByCountry[iso3] || 0;
    var allianceLabel = { west: "West", east: "Oost", neutral: "Neutraal" }[alliance] || alliance;

    layer.bindTooltip(
      "<b>" + name + "</b><br>" +
      "Positie: " + allianceLabel + "<br>" +
      "Militaire events (7d): " + heat.toFixed(1),
      { sticky: true, direction: "top", className: "wm-tooltip" }
    );

    layer.on({
      mouseover: function(e){
        var l = e.target;
        l.setStyle({
          weight: 2,
          color: "#e0a857",
          fillOpacity: Math.min(0.9, getHeatOpacity(heat) + 0.15)
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
     LEGENDA
     ============================================================ */
  function ensureLegend(map){
    if (document.getElementById("wmLegend")) return;
    var legend = document.createElement("div");
    legend.id = "wmLegend";
    legend.className = "wm-legend";
    legend.innerHTML =
      '<div class="wm-legend-title">Wereldkaart</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#3b82f6"></span>West-georiënteerd</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#e63946"></span>Oost-georiënteerd</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#6b7280"></span>Neutraal</div>' +
      '<div class="wm-legend-row wm-legend-hint">Intensiteit = militaire activiteit (7 dagen)</div>';

    var wrap = document.querySelector(".map-wrap");
    if (wrap) wrap.appendChild(legend);
  }

  /* ============================================================
     STYLES
     ============================================================ */
  function injectStyles(){
    if (document.getElementById("wmStyles")) return;
    var s = document.createElement("style");
    s.id = "wmStyles";
    s.textContent =
      ".wm-tooltip{background:rgba(13,21,34,.95);color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:8px;font-size:12px;padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:Inter,sans-serif;}" +
      ".wm-tooltip::before{border-top-color:rgba(224,168,87,.4)!important;}" +
      "html.light .wm-tooltip{background:rgba(255,255,255,.97);color:#131721;border-color:rgba(0,0,0,.15);}" +
      ".wm-legend{position:absolute;bottom:.7rem;right:.7rem;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:10px;padding:.6rem .7rem;font-size:.68rem;color:#e6ebf5;max-width:170px;z-index:400;box-shadow:0 4px 20px rgba(0,0,0,.5);line-height:1.4;}" +
      "html.light .wm-legend{background:rgba(255,255,255,.95);color:#131721;border-color:rgba(0,0,0,.12);}" +
      ".wm-legend-title{font-weight:800;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:#e0a857;margin-bottom:.4rem;padding-bottom:.3rem;border-bottom:1px solid rgba(224,168,87,.25);}" +
      ".wm-legend-row{display:flex;align-items:center;gap:.35rem;padding:.1rem 0;}" +
      ".wm-legend-swatch{width:11px;height:11px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px currentColor;}" +
      ".wm-legend-hint{margin-top:.35rem;padding-top:.35rem;border-top:1px solid rgba(255,255,255,.08);font-size:.6rem;opacity:.75;line-height:1.3;}" +
      ".wm-city-dot{background:transparent!important;border:none!important;}" +
      "@media (max-width:640px){.wm-legend{font-size:.6rem;padding:.5rem .6rem;max-width:140px;}.wm-legend-row{font-size:.6rem;}}";
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
      LOG("Kon GeoJSON niet laden — wereldkaart uitgeschakeld");
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

    WM.isLoaded = true;
    LOG("Wereldkaart geladen — " + geo.features.length + " features");
  }

  /* ============================================================
     REFRESH
     ============================================================ */
  function refresh(events){
    if (!WM.isLoaded) return;
    if (!WM.isEnabled) return;
    if (!Array.isArray(events)) return;

    var now = Date.now();
    var recalc = (window.WORLDMAP_THRESHOLDS || {}).heat_recalc_interval_ms || (30 * 60 * 1000);
    if (now - WM.lastHeatCalc < recalc && Object.keys(WM.heatByCountry).length > 0){
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

  /* ============================================================
     TOGGLE
     ============================================================ */
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
    if (leg) leg.style.display = WM.isEnabled ? "" : "none";
    LOG("Wereldkaart " + (WM.isEnabled ? "aan" : "uit"));
  }

  window.WorldMap = {
    init: init,
    refresh: refresh,
    setEnabled: setEnabled,
    isEnabled: function(){ return WM.isEnabled; },
    isLoaded: function(){ return WM.isLoaded; },
    calculateHeat: calculateHeat,
    getHeatMap: function(){ return WM.heatByCountry; },
    _state: WM
  };

  LOG("worldmap.js v1.1 geladen (CDN mode)");

})();