/* ============================================================
   WAR DESK — worldmap.js v2.6
   ------------------------------------------------------------
   - v2.6: grammatica fix (1 bron / 1 land)
   - v2.5: confidence in opacity + tooltip update
   - v2.4: Batch A — periode-filter positie + schalende drempels
   - v2.3: land-panel + confidence + periode-filter
   - v2.2: alleen countsForHeat events + REG-skip + compacte legenda
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[WM]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };

  var GEOJSON_URLS = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  ];
  var CACHE_KEY = "wardesk_countries_geojson";
  var CACHE_VERSION = "v6";
  var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  var WM = {
    layer: null,
    cityLayer: null,
    panel: null,
    targetHeatByCountry: {},
    actorHeatByCountry: {},
    countryConfidence: {},
    _allEvents: [],
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
    return p.NAME_NL || p.name_nl || p.NAME || p.name || p.ADMIN || p.admin || "?";
  }

  /* ============================================================
     DREMPELS SCHALEN MET PERIODE
     ============================================================ */
  function getPeriodScale(periodDays){
    if (periodDays <= 1) return 0.3;
    if (periodDays <= 7) return 1.0;
    if (periodDays <= 30) return 3.0;
    return 10.0;
  }

  /* ============================================================
     HITTE BEREKENEN
     ============================================================ */
  function calculateHeat(events){
    var now = Date.now();
    var thresholds = window.WORLDMAP_THRESHOLDS || {};
    var decayHalfLife = (thresholds.decay_half_life_days || 3) * 24 * 60 * 60 * 1000;
    var periodDays = thresholds.period_days || 7;
    var periodAgo = now - periodDays * 24 * 60 * 60 * 1000;
    var maxPerSource = thresholds.max_events_per_source_per_day || 3;
    var SKIP_PREFIX = "REG-";

    var targetByCountry = {};
    var actorByCountry = {};
    var countryMeta = {};

    var skippedNonPhysical = 0;
    var skippedReg = 0;
    var skippedOld = 0;

    var filtered = events.filter(function(ev){
      if (!ev) return false;
      if (ev.category !== "militair" && ev.category !== "crime") return false;
      if (ev.countsForHeat === false) { skippedNonPhysical++; return false; }
      var ts = new Date(ev.date).getTime();
      if (ts < periodAgo) { skippedOld++; return false; }
      return true;
    });

    filtered.forEach(function(ev){
      var ts = new Date(ev.date).getTime();
      var age = now - ts;
      var decayFactor = Math.pow(0.5, age / decayHalfLife);
      var tierWeight = window.WorldMapData ? window.WorldMapData.getTier(ev.source) : 0.5;
      var weight = decayFactor * tierWeight;

      var dayKey = new Date(ts).toISOString().slice(0, 10);
      var sourceKey = (ev.source || "?") + "|" + dayKey;

      var targetKey = ev.countryISO3 || ev.country;
      if (targetKey && targetKey.indexOf(SKIP_PREFIX) !== 0){
        if (!targetByCountry[targetKey]){
          targetByCountry[targetKey] = { total: 0, bySource: {}, count: 0 };
          countryMeta[targetKey] = { sources: {}, origins: {}, count: 0 };
        }
        if (!targetByCountry[targetKey].bySource[sourceKey]){
          targetByCountry[targetKey].bySource[sourceKey] = 0;
        }
        if (targetByCountry[targetKey].bySource[sourceKey] < maxPerSource){
          targetByCountry[targetKey].bySource[sourceKey]++;
          targetByCountry[targetKey].total += weight;
          targetByCountry[targetKey].count++;

          if (ev.source) countryMeta[targetKey].sources[ev.source] = true;
          try {
            if (window.WDEventDetector && window.WDEventDetector.getSourceCountry){
              var origin = window.WDEventDetector.getSourceCountry(ev.source);
              if (origin) countryMeta[targetKey].origins[origin] = true;
            }
          } catch(e){}
          countryMeta[targetKey].count++;
        }
      } else if (targetKey && targetKey.indexOf(SKIP_PREFIX) === 0){
        skippedReg++;
      }

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

    var confMap = {};
    Object.keys(countryMeta).forEach(function(iso3){
      var m = countryMeta[iso3];
      var sourceCount = Object.keys(m.sources).length;
      var originCount = Object.keys(m.origins).length;

      var sourceScore = Math.min(1, sourceCount / 8);
      var originScore = Math.min(1, originCount / 3);
      var score = (sourceScore * 0.6) + (originScore * 0.4);
      if (sourceCount >= 2 && originCount >= 2) score = Math.min(1, score + 0.05);

      confMap[iso3] = {
        confidence: Math.round(score * 100),
        sources: sourceCount,
        origins: originCount,
        count: m.count
      };
    });

    WM.targetHeatByCountry = targetHeatMap;
    WM.actorHeatByCountry = actorHeatMap;
    WM.countryConfidence = confMap;
    WM.lastHeatCalc = now;

    try {
      var sortedTargets = Object.keys(targetHeatMap).map(function(k){
        return { key: k, val: targetHeatMap[k] };
      }).sort(function(a, b){ return b.val - a.val; }).slice(0, 5);
      var targetStr = sortedTargets.map(function(x){ return x.key + ":" + x.val; }).join(" ");
      LOG("Heat top-5 doelwitten (" + periodDays + "d): " + (targetStr || "(leeg)"));

      var sortedActors = Object.keys(actorHeatMap).map(function(k){
        return { key: k, val: actorHeatMap[k] };
      }).sort(function(a, b){ return b.val - a.val; }).slice(0, 3);
      var actorStr = sortedActors.map(function(x){ return x.key + ":" + x.val; }).join(" ");
      LOG("Heat top-3 aanvallers: " + (actorStr || "(leeg)"));
    } catch(e){}

    LOG("Heat herberekend (" + periodDays + "d): " + Object.keys(targetHeatMap).length + " doelwitten, " +
        Object.keys(actorHeatMap).length + " aanvallers | skip niet-fysiek:" + skippedNonPhysical +
        " REG:" + skippedReg + " oud:" + skippedOld);
    return { targets: targetHeatMap, actors: actorHeatMap };
  }

  /* ============================================================
     CONFLICT-LEVEL (met periode-schaling)
     ============================================================ */
  function getConflictLevel(heat){
    var th = (window.WORLDMAP_THRESHOLDS || {}).heat || {};
    var periodDays = (window.WORLDMAP_THRESHOLDS || {}).period_days || 7;
    var scale = getPeriodScale(periodDays);

    var warm = (th.warm || 0.5) * scale;
    var hot = (th.hot || 1.5) * scale;
    var scorching = (th.scorching || 3) * scale;

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

  function getFillOpacity(level, confidence){
    var baseOpacity;
    if (level === "scorching") baseOpacity = 0.88;
    else if (level === "hot") baseOpacity = 0.78;
    else if (level === "warm") baseOpacity = 0.65;
    else return 0.30;

    if (typeof confidence === "number" && confidence >= 0){
      var confNorm = Math.max(0, Math.min(100, confidence));
      var factor = 0.55 + (confNorm / 100) * 0.45;
      return baseOpacity * factor;
    }
    return baseOpacity;
  }

  function styleCountry(feature){
    var iso3 = getISO3(feature);
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;
    var totalHeat = targetHeat + actorHeat;
    var cc = window.CONFLICT_COLORS || {};
    var conf = WM.countryConfidence[iso3];
    var confPct = conf ? conf.confidence : null;

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
    var fillOpacity = getFillOpacity(level, confPct);

    var periodDays = (window.WORLDMAP_THRESHOLDS || {}).period_days || 7;
    var scale = getPeriodScale(periodDays);

    var actorThreshold = ((window.WORLDMAP_THRESHOLDS || {}).actor_ring_min || 3) * scale;
    var actorHotThreshold = ((window.WORLDMAP_THRESHOLDS || {}).actor_ring_hot || 15) * scale;
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
     HELPERS — grammatica (v2.6)
     ============================================================ */
  function pluralize(count, singular, plural){
    return count + " " + (count === 1 ? singular : plural);
  }

  /* ============================================================
     TOOLTIP GENERATOR
     ============================================================ */
  function buildTooltipHtml(iso3, name){
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;
    var conf = WM.countryConfidence[iso3];

    var lines = ["<b>" + name + "</b>"];

    if (targetHeat > 0 || actorHeat > 0){
      if (targetHeat > 0){
        lines.push("🎯 Doelwit: " + targetHeat.toFixed(1) + " events");
      }
      if (actorHeat > 0){
        lines.push("⚔️ Aanvaller: " + actorHeat.toFixed(1) + " events");
      }
      if (conf){
        lines.push("📊 " + conf.confidence + "% confidence (" +
          pluralize(conf.sources, "bron", "bronnen") + ", " +
          pluralize(conf.origins, "land", "landen") + ")");
      }
    } else {
      lines.push("Rustig — geen fysieke militaire events");
    }

    return lines.join("<br>");
  }

  function onEachCountry(feature, layer){
    var iso3 = getISO3(feature);
    var name = getCountryName(feature);

    layer.bindTooltip(buildTooltipHtml(iso3, name), {
      sticky: true,
      direction: "top",
      className: "wm-tooltip"
    });

    layer.on({
      mouseover: function(e){
        var l = e.target;
        var targetHeat = WM.targetHeatByCountry[iso3] || 0;
        var level = getConflictLevel(targetHeat);
        var conf = WM.countryConfidence[iso3];
        var confPct = conf ? conf.confidence : null;
        var currentOpacity = getFillOpacity(level, confPct);
        l.setStyle({
          weight: 2.5,
          color: "#e0a857",
          fillOpacity: Math.min(0.9, currentOpacity + 0.15)
        });
      },
      mouseout: function(e){
        if (WM.layer) WM.layer.resetStyle(e.target);
      },
      click: function(e){
        if (L.DomEvent) L.DomEvent.stopPropagation(e);
        openCountryPanel(iso3, name);
      }
    });
  }

  function refreshTooltips(){
    if (!WM.layer) return;
    WM.layer.eachLayer(function(layer){
      if (!layer.feature) return;
      var iso3 = getISO3(layer.feature);
      var name = getCountryName(layer.feature);
      try {
        layer.unbindTooltip();
        layer.bindTooltip(buildTooltipHtml(iso3, name), {
          sticky: true,
          direction: "top",
          className: "wm-tooltip"
        });
      } catch(e){}
    });
  }

  /* ============================================================
     LAND-PANEL
     ============================================================ */
  function ensurePanel(){
    if (WM.panel) return WM.panel;
    var panel = document.createElement("div");
    panel.id = "wmCountryPanel";
    panel.className = "wm-country-panel";
    panel.innerHTML =
      '<div class="wm-panel-head">' +
        '<div class="wm-panel-title" id="wmPanelTitle">—</div>' +
        '<button class="wm-panel-close" id="wmPanelClose" aria-label="Sluiten">✕</button>' +
      '</div>' +
      '<div class="wm-panel-stats" id="wmPanelStats"></div>' +
      '<div class="wm-panel-events" id="wmPanelEvents"></div>';
    document.body.appendChild(panel);
    WM.panel = panel;

    panel.querySelector("#wmPanelClose").addEventListener("click", closeCountryPanel);
    panel.addEventListener("click", function(e){
      if (e.target === panel) closeCountryPanel();
    });

    return panel;
  }

  function openCountryPanel(iso3, countryName){
    if (!iso3) return;
    var panel = ensurePanel();

    var titleEl = panel.querySelector("#wmPanelTitle");
    titleEl.textContent = countryName || iso3;

    var conf = WM.countryConfidence[iso3];
    var targetHeat = WM.targetHeatByCountry[iso3] || 0;
    var actorHeat = WM.actorHeatByCountry[iso3] || 0;
    var statsEl = panel.querySelector("#wmPanelStats");

    if (!conf && targetHeat === 0 && actorHeat === 0){
      statsEl.innerHTML =
        '<div class="wm-panel-empty">Geen fysieke militaire events in de laatste ' +
        ((window.WORLDMAP_THRESHOLDS || {}).period_days || 7) + ' dagen</div>';
    } else {
      var confPct = conf ? conf.confidence : 0;
      var confClass = confPct >= 70 ? "conf-high" : (confPct >= 40 ? "conf-med" : "conf-low");
      /* v2.6: grammatica fix */
      var confDetail = "";
      if (conf){
        confDetail = '<div class="wm-panel-conf-detail">' +
          pluralize(conf.sources, "bron", "bronnen") + ' · ' +
          pluralize(conf.origins, "land", "landen") + ' van herkomst</div>';
      }
      statsEl.innerHTML =
        '<div class="wm-panel-stat">' +
          '<div class="wm-panel-stat-val">' + targetHeat.toFixed(1) + '</div>' +
          '<div class="wm-panel-stat-lbl">Doelwit</div>' +
        '</div>' +
        '<div class="wm-panel-stat">' +
          '<div class="wm-panel-stat-val">' + actorHeat.toFixed(1) + '</div>' +
          '<div class="wm-panel-stat-lbl">Aanvaller</div>' +
        '</div>' +
        '<div class="wm-panel-stat ' + confClass + '">' +
          '<div class="wm-panel-stat-val">' + confPct + '%</div>' +
          '<div class="wm-panel-stat-lbl">Confidence</div>' +
        '</div>' +
        confDetail;
    }

    var periodDays = (window.WORLDMAP_THRESHOLDS || {}).period_days || 7;
    var periodAgo = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    var myEvents = (WM._allEvents || []).filter(function(e){
      if (!e) return false;
      if (e.category !== "militair") return false;
      if (e.countryISO3 !== iso3) return false;
      var ts = new Date(e.date).getTime();
      return ts >= periodAgo;
    }).sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }).slice(0, 15);

    var evEl = panel.querySelector("#wmPanelEvents");
    if (!myEvents.length){
      evEl.innerHTML = '<div class="wm-panel-empty">Geen events in deze periode</div>';
    } else {
      evEl.innerHTML = myEvents.map(function(ev){
        var physical = ev.countsForHeat !== false;
        var actionTag = physical ? "Fysiek" : "Niet-fysiek";
        var actionClass = physical ? "wm-ev-physical" : "wm-ev-political";
        var subtype = ev.subtype || "—";
        return '<div class="wm-panel-event">' +
          '<div class="wm-panel-event-title">' + escapeHtml(ev.title) + '</div>' +
          '<div class="wm-panel-event-meta">' +
            '<span class="wm-panel-event-src">' + escapeHtml(ev.source || "?") + '</span>' +
            '<span class="wm-panel-event-dot">·</span>' +
            '<span>' + timeAgoShort(ev.date) + '</span>' +
            '<span class="' + actionClass + '">' + actionTag + '</span>' +
            '<span class="wm-panel-event-sub">' + escapeHtml(subtype) + '</span>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    requestAnimationFrame(function(){
      panel.classList.add("show");
    });
  }

  function closeCountryPanel(){
    if (WM.panel){
      WM.panel.classList.remove("show");
    }
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function timeAgoShort(d){
    var t = new Date(d).getTime();
    if (isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if (diff < 60) return "nu";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "u";
    return Math.floor(diff / 86400) + "d";
  }

  /* ============================================================
     PERIODE-FILTER
     ============================================================ */
  function ensurePeriodFilter(){
    var wrap = document.querySelector(".map-wrap");
    if (!wrap || wrap.querySelector(".wm-period-filter")) return;

    var currentPeriod = (window.WORLDMAP_THRESHOLDS || {}).period_days || 7;

    var div = document.createElement("div");
    div.className = "wm-period-filter";
    div.innerHTML =
      '<button data-days="1"' + (currentPeriod === 1 ? ' class="active"' : '') + '>24u</button>' +
      '<button data-days="7"' + (currentPeriod === 7 ? ' class="active"' : '') + '>7d</button>' +
      '<button data-days="30"' + (currentPeriod === 30 ? ' class="active"' : '') + '>30d</button>' +
      '<button data-days="365"' + (currentPeriod === 365 ? ' class="active"' : '') + '>Alles</button>';

    Array.prototype.forEach.call(div.querySelectorAll("button"), function(btn){
      btn.addEventListener("click", function(){
        var days = parseInt(btn.dataset.days, 10);
        if (isNaN(days)) return;
        if (window.WORLDMAP_THRESHOLDS){
          window.WORLDMAP_THRESHOLDS.period_days = days;
        }
        try {
          if (window.WDStorage) WDStorage.set("worldmap_period", String(days));
        } catch(e){}
        div.querySelectorAll("button").forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        LOG("Periode gewijzigd naar " + days + " dagen (scale=" + getPeriodScale(days) + ")");
        WM.lastHeatCalc = 0;
        if (WM._allEvents && WM._allEvents.length){
          refresh(WM._allEvents, true);
        }
      });
    });

    wrap.appendChild(div);
  }

  function restorePeriodFilter(){
    try {
      var saved = window.WDStorage ? WDStorage.get("worldmap_period") : null;
      if (saved){
        var days = parseInt(saved, 10);
        if (!isNaN(days) && window.WORLDMAP_THRESHOLDS){
          window.WORLDMAP_THRESHOLDS.period_days = days;
        }
      }
    } catch(e){}
  }

  /* ============================================================
     LEGENDA + TOGGLE
     ============================================================ */
  function ensureLegend(map){
    if (document.getElementById("wmLegend")) return;
    var legend = document.createElement("div");
    legend.id = "wmLegend";
    legend.className = "wm-legend";
    legend.innerHTML =
      '<div class="wm-legend-title">Conflictkaart</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#2f2f38"></span>Rustig</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#7a4040"></span>Licht</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#a52a2a"></span>Actief</div>' +
      '<div class="wm-legend-row"><span class="wm-legend-swatch" style="background:#d41919"></span>Extreem</div>' +
      '<div class="wm-legend-row wm-legend-row-ring"><span class="wm-legend-swatch wm-legend-swatch-ring"></span>Aanvaller</div>' +
      '<div class="wm-legend-hint">Klik op een land voor details</div>';

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
      ".wm-tooltip{background:rgba(13,21,34,.95);color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:8px;font-size:12px;padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:Inter,sans-serif;line-height:1.4;}" +
      ".wm-tooltip::before{border-top-color:rgba(224,168,87,.4)!important;}" +
      "html.light .wm-tooltip{background:rgba(255,255,255,.97);color:#131721;border-color:rgba(0,0,0,.15);}" +
      ".wm-legend{position:absolute;bottom:.6rem;right:.6rem;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:9px;padding:.4rem .5rem;font-size:.55rem;color:#e6ebf5;max-width:110px;z-index:400;box-shadow:0 4px 20px rgba(0,0,0,.5);line-height:1.3;}" +
      "html.light .wm-legend{background:rgba(255,255,255,.95);color:#131721;border-color:rgba(0,0,0,.12);}" +
      ".wm-legend-title{font-weight:800;font-size:.5rem;text-transform:uppercase;letter-spacing:.04em;color:#e0a857;margin-bottom:.2rem;padding-bottom:.2rem;border-bottom:1px solid rgba(224,168,87,.25);}" +
      ".wm-legend-row{display:flex;align-items:center;gap:.25rem;padding:.03rem 0;font-size:.52rem;}" +
      ".wm-legend-swatch{width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px currentColor;}" +
      ".wm-legend-row-ring{padding-top:.12rem;margin-top:.12rem;border-top:1px solid rgba(255,255,255,.08);}" +
      ".wm-legend-swatch-ring{background:transparent!important;border:2px solid #ff6666;box-sizing:border-box;border-radius:50%;}" +
      ".wm-legend-hint{margin-top:.2rem;padding-top:.2rem;border-top:1px solid rgba(255,255,255,.08);font-size:.48rem;opacity:.7;line-height:1.2;}" +
      ".wm-city-dot{background:transparent!important;border:none!important;}" +
      ".wm-legend-toggle{position:absolute;bottom:.6rem;right:.6rem;z-index:401;width:28px;height:28px;border-radius:8px;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.4);color:#e0a857;display:none;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:all .18s;padding:0;}" +
      ".wm-legend-toggle:hover{background:rgba(226,168,87,.2);}" +
      ".wm-legend-toggle.off{opacity:.5;color:#8a94a8;border-color:rgba(255,255,255,.15);}" +
      ".wm-legend-toggle svg{width:14px;height:14px;}" +
      ".map-wrap:has(#wmLegend[style*='display: none']) .wm-legend-toggle{display:grid;}" +
      "@supports not selector(:has(*)){.wm-legend-toggle{display:grid!important;bottom:.6rem;right:.6rem;}.wm-legend{right:2.7rem;}}" +
      ".wm-period-filter{position:absolute;top:3.4rem;left:.7rem;z-index:500;display:flex;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:9px;padding:2px;box-shadow:0 4px 14px rgba(0,0,0,.45);}" +
      "html.light .wm-period-filter{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.12);}" +
      ".wm-period-filter button{background:transparent;border:none;color:#e6ebf5;font-size:.65rem;font-weight:700;padding:.35rem .55rem;border-radius:7px;cursor:pointer;font-family:inherit;transition:all .15s;letter-spacing:.02em;}" +
      "html.light .wm-period-filter button{color:#131721;}" +
      ".wm-period-filter button:hover{color:#e0a857;}" +
      ".wm-period-filter button.active{background:rgba(224,168,87,.25);color:#e0a857;}" +
      ".wm-country-panel{position:fixed;left:0;right:0;bottom:0;background:var(--card,#111b2d);border-top:1px solid rgba(224,168,87,.35);border-top-left-radius:18px;border-top-right-radius:18px;max-height:75vh;overflow-y:auto;z-index:3500;transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.9,.3,1);padding-bottom:calc(.5rem + env(safe-area-inset-bottom,0));box-shadow:0 -10px 40px rgba(0,0,0,.6);}" +
      ".wm-country-panel.show{transform:translateY(0);}" +
      ".wm-panel-head{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem .7rem;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:var(--card,#111b2d);z-index:1;}" +
      ".wm-panel-title{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--ink,#e6ebf5);}" +
      ".wm-panel-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--ink-2,#8a94a8);font-size:.9rem;display:grid;place-items:center;cursor:pointer;font-family:inherit;padding:0;}" +
      ".wm-panel-close:hover{border-color:#e63950;color:#f87171;}" +
      ".wm-panel-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.08);}" +
      ".wm-panel-stat{text-align:center;padding:.5rem .3rem;background:rgba(255,255,255,.04);border-radius:8px;border:1px solid rgba(255,255,255,.06);}" +
      ".wm-panel-stat-val{font-size:1.2rem;font-weight:800;color:var(--amber,#e0a857);font-variant-numeric:tabular-nums;line-height:1;}" +
      ".wm-panel-stat-lbl{font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3,#6b7a93);margin-top:.2rem;font-weight:700;}" +
      ".wm-panel-stat.conf-high .wm-panel-stat-val{color:#10b981;}" +
      ".wm-panel-stat.conf-med .wm-panel-stat-val{color:#f59e0b;}" +
      ".wm-panel-stat.conf-low .wm-panel-stat-val{color:#f87171;}" +
      ".wm-panel-conf-detail{grid-column:1/-1;font-size:.7rem;color:var(--ink-3,#6b7a93);text-align:center;padding:.2rem 0 .1rem;}" +
      ".wm-panel-events{max-height:none;}" +
      ".wm-panel-event{padding:.7rem 1rem;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;transition:background .15s;}" +
      ".wm-panel-event:hover{background:rgba(255,255,255,.03);}" +
      ".wm-panel-event:last-child{border-bottom:none;}" +
      ".wm-panel-event-title{font-size:.78rem;font-weight:600;line-height:1.3;color:var(--ink,#e6ebf5);margin-bottom:.25rem;}" +
      ".wm-panel-event-meta{display:flex;gap:.4rem;align-items:center;font-size:.62rem;color:var(--ink-3,#6b7a93);flex-wrap:wrap;}" +
      ".wm-panel-event-src{color:var(--amber,#e0a857);font-weight:700;text-transform:uppercase;letter-spacing:.03em;}" +
      ".wm-panel-event-dot{opacity:.4;}" +
      ".wm-panel-event-sub{color:var(--ink-3,#6b7a93);opacity:.8;}" +
      ".wm-ev-physical{background:rgba(230,57,80,.15);color:#ff8090;padding:.1rem .4rem;border-radius:5px;font-weight:700;font-size:.58rem;text-transform:uppercase;letter-spacing:.03em;}" +
      ".wm-ev-political{background:rgba(107,122,147,.15);color:#a3adc0;padding:.1rem .4rem;border-radius:5px;font-weight:700;font-size:.58rem;text-transform:uppercase;letter-spacing:.03em;}" +
      ".wm-panel-empty{padding:1.5rem 1rem;text-align:center;color:var(--ink-3,#6b7a93);font-size:.78rem;}" +
      "@media (max-width:640px){" +
        ".wm-legend{max-width:100px!important;font-size:.5rem!important;padding:.35rem .45rem!important;}" +
        ".wm-legend-title{font-size:.5rem!important;margin-bottom:.2rem!important;padding-bottom:.2rem!important;}" +
        ".wm-legend-row{font-size:.5rem!important;padding:.02rem 0!important;}" +
        ".wm-legend-hint{font-size:.45rem!important;}" +
        ".wm-period-filter button{font-size:.58rem;padding:.28rem .42rem;}" +
        ".wm-period-filter{top:3rem;padding:1px;}" +
        ".wm-country-panel{max-height:80vh;}" +
        ".wm-panel-title{font-size:1rem;}" +
      "}" +
      "html.light .wm-country-panel,html.light .wm-country-panel .wm-panel-head{background:var(--card,#fff);}" +
      "html.light .wm-panel-stat{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.06);}" +
      "html.light .wm-panel-close{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.08);}" +
      "html.light .wm-panel-event{border-bottom-color:rgba(0,0,0,.04);}" +
      "html.light .wm-panel-event:hover{background:rgba(0,0,0,.02);}";
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

    if (window.MAP && window.MAP.cluster && window.MAP.cluster.bringToFront){
      window.MAP.cluster.bringToFront();
    }

    ensureLegend(map);
    ensureLegendToggle();
    ensurePeriodFilter();
    restoreLegendVisibility();
    restorePeriodFilter();

    WM.isLoaded = true;
    LOG("Wereldkaart v2.6 geladen — " + geo.features.length + " features");
  }

  function refresh(events, force){
    if (!WM.isLoaded) return;
    if (!WM.isEnabled) return;
    if (!Array.isArray(events)) return;

    WM._allEvents = events.slice();

    var now = Date.now();
    var recalc = (window.WORLDMAP_THRESHOLDS || {}).heat_recalc_interval_ms || (5 * 60 * 1000);
    if (!force && now - WM.lastHeatCalc < recalc && Object.keys(WM.targetHeatByCountry).length > 0){
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

    refreshTooltips();

    if (WM.map) renderCityDots(WM.map);
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
      WM.cityLayer.addLayer(marker);
    });
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
    var pf = document.querySelector(".wm-period-filter");
    if (pf) pf.style.display = WM.isEnabled ? "" : "none";
    closeCountryPanel();
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
    getConfidenceMap: function(){ return WM.countryConfidence; },
    _state: WM
  };

  LOG("worldmap.js v2.6 geladen (grammatica fix)");

})();