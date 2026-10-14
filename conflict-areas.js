/* ============================================================
   WAR DESK — conflict-areas.js v15.0
   - v15.0: Gesplitst in 3 modules (data, fetch, orchestrator)
           + Loading/error/empty states op de kaart
   - v14.1: WDGeo + WDProxy + safeCatch
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var D = window.WDCAData;
  var F = window.WDCAFetch;

  if (!D || !F){
    try { wdLog.error("[AREA] WDCAData of WDCAFetch niet geladen — conflict-areas werkt niet"); } catch(e){}
    return;
  }

  var CONFLICTS = D.conflicts;
  var ACTIVE_CONFLICTS = D.activeConflicts;
  var PANES = D.panes;
  var COLORS = D.colors;
  var THRESHOLDS = D.thresholds;

  var FILL_OPACITY = THRESHOLDS.fillOpacity;
  var UNKNOWN_FILL_OPACITY = THRESHOLDS.unknownFillOpacity;
  var ATTACK_RING_THRESHOLD = THRESHOLDS.attackRing;
  var ATTACK_RING_THRESHOLD_HIGH = THRESHOLDS.attackRingHigh;

  var CA = {
    map: null,
    layers: {},
    countryLayers: {},
    geojsons: {},
    countryGeojsons: {},
    isLoaded: false,
    isInitialized: false,
    panel: null,
    isMapActive: true,
    _currentConflictIso: null,
    _currentConflict: null,
    _status: "idle",
    _statusEl: null,
    _error: null
  };

  var _initPromise = null;

  function getConflict(iso){ return D.getConflict(iso); }

  /* ─── Geo helpers via WDGeo ─── */
  var G = window.WDGeo || {};
  function featureContainsPoint(f, x, y){
    return G.featureContainsPoint ? G.featureContainsPoint(f, x, y) : false;
  }
  function getCentroid(f){
    return G.getCentroid ? G.getCentroid(f) : null;
  }

  /* ════════════════════════════════════════════════════════════
     P2-2: Status indicator (loading / error / ready)
     ════════════════════════════════════════════════════════════ */
  function ensureStatusEl(){
    if (CA._statusEl) return CA._statusEl;
    var wrap = document.querySelector(".map-wrap");
    if (!wrap) return null;

    var el = document.createElement("div");
    el.id = "caMapStatus";
    el.className = "ca-map-status";
    wrap.appendChild(el);
    CA._statusEl = el;
    return el;
  }

  function injectStatusStyles(){
    if (document.getElementById("caMapStatusStyles")) return;
    var s = document.createElement("style");
    s.id = "caMapStatusStyles";
    s.textContent =
      ".ca-map-status{position:absolute;bottom:.6rem;left:.6rem;z-index:450;padding:.4rem .75rem;border-radius:8px;font-size:.65rem;font-weight:700;font-family:Inter,sans-serif;letter-spacing:.02em;box-shadow:0 4px 14px rgba(0,0,0,.5);transition:opacity .3s,transform .3s;opacity:0;transform:translateY(6px);pointer-events:none;max-width:260px;line-height:1.3;}" +
      ".ca-map-status.show{opacity:1;transform:translateY(0);}" +
      ".ca-map-status.loading{background:rgba(224,168,87,.92);color:#070c16;}" +
      ".ca-map-status.loading::before{content:'⏳ ';}" +
      ".ca-map-status.ready{background:rgba(16,185,129,.92);color:#fff;}" +
      ".ca-map-status.ready::before{content:'✓ ';}" +
      ".ca-map-status.partial{background:rgba(245,158,11,.92);color:#070c16;}" +
      ".ca-map-status.partial::before{content:'⚠ ';}" +
      ".ca-map-status.error{background:rgba(220,38,38,.95);color:#fff;pointer-events:auto;}" +
      ".ca-map-status.error::before{content:'✕ ';}" +
      "@media (max-width:640px){.ca-map-status{font-size:.58rem;padding:.35rem .55rem;max-width:180px;}}";
    document.head.appendChild(s);
  }

  function setStatus(status, message){
    CA._status = status;
    var el = ensureStatusEl();
    if (!el) return;

    el.classList.remove("loading", "ready", "partial", "error");

    if (status === "idle"){
      el.classList.remove("show");
      return;
    }

    el.classList.add(status, "show");
    el.textContent = message || "";

    /* Auto-hide na 3s voor ready */
    if (el._hideTimer) clearTimeout(el._hideTimer);
    if (status === "ready"){
      el._hideTimer = setTimeout(function(){
        el.classList.remove("show");
      }, 3000);
    }
  }

  /* ════════════════════════════════════════════════════════════
     Attack intensity berekening (per land)
     ════════════════════════════════════════════════════════════ */
  function calculateAttackIntensity(conflictIso){
    var geojson = CA.geojsons[conflictIso];
    if (!geojson || !geojson.features) return;

    var events = [];
    try {
      if (window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){
      try { wdLog.warn("[AREA] events ophalen faalde:", e.message); } catch(err){}
    }

    geojson.features.forEach(function(f){
      if (f.properties){
        f.properties.attack_intensity = 0;
        f.properties.attack_count = 0;
      }
    });

    if (!events.length) return;

    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var countByArea = {};

    events.forEach(function(ev){
      if (!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      if (ev.category !== "militair" && ev.category !== "crime") return;
      if (ev.countsForHeat === false) return;
      if (new Date(ev.date).getTime() < periodAgo) return;
      for (var i = 0; i < geojson.features.length; i++){
        var f = geojson.features[i];
        if (featureContainsPoint(f, ev.lng, ev.lat)){
          var id = f.properties.id;
          countByArea[id] = (countByArea[id] || 0) + 1;
          break;
        }
      }
    });

    geojson.features.forEach(function(f){
      if (!f.properties) return;
      var count = countByArea[f.properties.id] || 0;
      var intensity = Math.min(1, Math.log(1 + count) / Math.log(21));
      f.properties.attack_intensity = Math.round(intensity * 100) / 100;
      f.properties.attack_count = count;
    });
  }

  /* ════════════════════════════════════════════════════════════
     Styling
     ════════════════════════════════════════════════════════════ */
  function styleProvince(feature){
    var props = (feature && feature.properties) || {};
    var conflict = CA._currentConflict;
    var z = CA.map ? CA.map.getZoom() : 6;
    var baseWeight = D.provinceWeight(z);
    var baseOpacity = D.provinceOpacity(z);

    var baseline = null;
    if (window.WDBaseline && CA._currentConflictIso){
      baseline = window.WDBaseline.get(
        CA._currentConflictIso,
        props.name,
        props.provinceName
      );
    }

    var fillActor = baseline ? baseline.controller : null;
    var fillColor = COLORS.unknownFill;
    var hasKnown = false;

    if (fillActor && conflict && conflict.parties && conflict.parties[fillActor]){
      fillColor = conflict.parties[fillActor].fill;
      hasKnown = true;
    }

    var result = {
      fillColor: fillColor,
      fillOpacity: hasKnown ? FILL_OPACITY : UNKNOWN_FILL_OPACITY,
      color: COLORS.provinceBorder,
      weight: baseWeight,
      opacity: baseOpacity,
      dashArray: null,
      lineCap: "round",
      lineJoin: "round",
      interactive: true
    };

    if (hasKnown){
      result.weight = Math.max(baseWeight, 1.3);
      result.opacity = Math.max(baseOpacity, 0.55);
    }

    var attackIntensity = props.attack_intensity || 0;
    if (attackIntensity >= ATTACK_RING_THRESHOLD_HIGH){
      result.color = COLORS.underAttack;
      result.weight = Math.max(baseWeight, THRESHOLDS.attackRingHighWeight);
      result.opacity = 1.0;
      result.dashArray = "3 2";
    } else if (attackIntensity >= ATTACK_RING_THRESHOLD){
      result.color = COLORS.underAttack;
      result.weight = Math.max(baseWeight, THRESHOLDS.attackRingWeight);
      result.opacity = 0.85;
      result.dashArray = "5 3";
    }

    return result;
  }

  /* ════════════════════════════════════════════════════════════
     Rendering
     ════════════════════════════════════════════════════════════ */
  function renderLayer(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if (!CA.map || !geojson || !conflict) return;

    ensurePanes(CA.map);
    CA._currentConflictIso = conflictIso;
    CA._currentConflict = conflict;

    if (CA.layers[conflictIso]){
      try { CA.map.removeLayer(CA.layers[conflictIso]); } catch(e){}
    }

    CA.layers[conflictIso] = L.geoJSON(geojson, {
      style: styleProvince,
      pane: PANES.province.name,
      smoothFactor: 1.5,
      onEachFeature: function(feature, layer){
        layer.on({
          click: function(e){
            try {
              if (L.DomEvent) L.DomEvent.stopPropagation(e);
              var area = {
                id: feature.properties.id,
                name: feature.properties.name,
                provinceName: feature.properties.provinceName,
                feature: feature,
                iso3: conflictIso
              };
              openPanel(area, conflictIso);
            } catch(err){
              try { wdLog.warn("[AREA] click handler faalde:", err.message); } catch(e2){}
            }
          }
        });
      }
    });
    CA.layers[conflictIso].addTo(CA.map);

    var countryJson = CA.countryGeojsons[conflictIso];
    if (countryJson && countryJson.features && countryJson.features.length){
      if (CA.countryLayers[conflictIso]){
        try { CA.map.removeLayer(CA.countryLayers[conflictIso]); } catch(e){}
      }
      CA.countryLayers[conflictIso] = L.geoJSON(countryJson, {
        style: function(){
          return {
            fillColor: "transparent",
            fillOpacity: 0,
            color: COLORS.countryBorder,
            weight: 1.0,
            opacity: 0.85,
            interactive: false
          };
        },
        pane: PANES.country.name,
        smoothFactor: 1.5,
        interactive: false
      });
      CA.countryLayers[conflictIso].addTo(CA.map);
    }
  }

  function ensurePanes(map){
    Object.keys(PANES).forEach(function(key){
      var p = PANES[key];
      if (map.getPane(p.name)) return;
      map.createPane(p.name);
      map.getPane(p.name).style.zIndex = p.z;
      map.getPane(p.name).style.pointerEvents = "auto";
    });
  }

  /* ════════════════════════════════════════════════════════════
     Panel
     ════════════════════════════════════════════════════════════ */
  function ensurePanel(){
    if (CA.panel) return CA.panel;
    var panel = document.createElement("div");
    panel.id = "caAreaPanel";
    panel.className = "wm-country-panel";
    panel.innerHTML =
      '<div class="wm-panel-head"><div class="wm-panel-title" id="caPanelTitle">—</div>' +
      '<button class="wm-panel-close" id="caPanelClose" aria-label="Sluiten">✕</button></div>' +
      '<div class="wm-panel-stats" id="caPanelStats"></div>' +
      '<div id="caPanelAdminSlot"></div>';
    document.body.appendChild(panel);
    CA.panel = panel;
    panel.querySelector("#caPanelClose").addEventListener("click", function(){
      panel.classList.remove("show");
    });
    return panel;
  }

  var _esc = function(s){
    if (window.WD && WD.escapeHtml) return WD.escapeHtml(s);
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  };

  function openPanel(area, conflictIso){
    try {
      var panel = ensurePanel();
      var props = area.feature.properties;

      var baseline = null;
      if (window.WDBaseline){
        baseline = window.WDBaseline.get(conflictIso, props.name, props.provinceName);
      }

      panel.querySelector("#caPanelTitle").textContent = props.name || "?";

      var ctrlLabel = baseline ? baseline.controller : "Onbekend";
      var sinceLabel = baseline && baseline.since ? "sinds " + baseline.since : "";

      var attackIntensity = props.attack_intensity || 0;
      var attackLine = "";
      if (attackIntensity >= ATTACK_RING_THRESHOLD_HIGH){
        attackLine = '<div class="wm-panel-conf-detail" style="color:#e63950;font-weight:700">💥 ZWAAR ONDER VUUR — intensiteit ' +
          Math.round(attackIntensity * 100) + '% (' + (props.attack_count || 0) + ' events)</div>';
      } else if (attackIntensity >= ATTACK_RING_THRESHOLD){
        attackLine = '<div class="wm-panel-conf-detail" style="color:#e63950;font-weight:700">💥 Onder vuur — intensiteit ' +
          Math.round(attackIntensity * 100) + '% (' + (props.attack_count || 0) + ' events)</div>';
      }

      /* Empty state: geen baseline */
      var unknownLine = "";
      if (!baseline){
        unknownLine = '<div class="wm-panel-conf-detail" style="color:#6b7a93;font-style:italic">' +
          '⚠ Geen baseline-data voor deze provincie — voeg toe via Admin</div>';
      }

      var statsEl = panel.querySelector("#caPanelStats");
      var confClass = baseline ? "conf-high" : "conf-low";
      statsEl.innerHTML =
        '<div class="wm-panel-stat ' + confClass + '"><div class="wm-panel-stat-val">' +
          _esc(ctrlLabel) + '</div><div class="wm-panel-stat-lbl">Controller</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' +
          (props.attack_count || 0) + '</div><div class="wm-panel-stat-lbl">Events (7d)</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' +
          Math.round(attackIntensity * 100) + '%</div><div class="wm-panel-stat-lbl">Intensiteit</div></div>' +
        unknownLine +
        attackLine +
        '<div class="wm-panel-conf-detail">' + _esc(sinceLabel) +
          (baseline && baseline.source ? ' · bron: ' + _esc(baseline.source) : '') + '</div>';

      if (window.WDAdmin && window.WDAdmin.onPanelOpen){
        try { window.WDAdmin.onPanelOpen(area, conflictIso); } catch(e){
          try { wdLog.warn("[AREA] WDAdmin.onPanelOpen faalde:", e.message); } catch(e2){}
        }
      }

      requestAnimationFrame(function(){ panel.classList.add("show"); });
    } catch(err){
      try { wdLog.warn("[AREA] openPanel faalde:", err.message); } catch(e){}
    }
  }

  /* ════════════════════════════════════════════════════════════
     Debug logging van GADM feature-namen (tijdelijk)
     ════════════════════════════════════════════════════════════ */
  function logFeatureNames(conflictIso, oblastsJson){
    try {
      if (!oblastsJson || !oblastsJson.features) return;
      var names = oblastsJson.features.map(function(f){
        if (!f || !f.properties) return "?";
        return f.properties.name || "?";
      });
      var chunks = [];
      for (var i = 0; i < names.length; i += 8){
        chunks.push(names.slice(i, i + 8).join(" | "));
      }
      wdLog.info("[GADM " + conflictIso + "] " + names.length + " features:");
      chunks.forEach(function(chunk){
        wdLog.info("[GADM " + conflictIso + "]   " + chunk);
      });
    } catch(e){
      try { wdLog.warn("[AREA] logFeatureNames faalde:", e.message); } catch(e2){}
    }
  }

  /* ════════════════════════════════════════════════════════════
     Init flow
     ════════════════════════════════════════════════════════════ */
  function initOneConflict(conflictIso){
    var conflict = getConflict(conflictIso);
    if (!conflict) return Promise.resolve({ ok: false, iso: conflictIso, reason: "no-config" });

    return F.loadOblasts(conflictIso, conflict).then(function(oblastsJson){
      logFeatureNames(conflictIso, oblastsJson);
      CA.geojsons[conflictIso] = oblastsJson;

      return F.loadCountry(conflictIso, conflict).then(function(countryJson){
        CA.countryGeojsons[conflictIso] = countryJson;
        calculateAttackIntensity(conflictIso);
        renderLayer(conflictIso);
        return { ok: true, iso: conflictIso };
      });
    }).catch(function(e){
      LOG("[" + conflictIso + "] Init faalde: " + (e.message || "?"));
      return { ok: false, iso: conflictIso, reason: e.message || "unknown" };
    });
  }

  function _doInit(){
    setStatus("loading", "Kaart laden…");

    return F.openDB().then(function(){
      var results = [];
      var batches = [];
      for (var i = 0; i < ACTIVE_CONFLICTS.length; i += 4){
        batches.push(ACTIVE_CONFLICTS.slice(i, i + 4));
      }
      return batches.reduce(function(chain, batch){
        return chain.then(function(){
          return Promise.all(batch.map(function(iso){
            return initOneConflict(iso);
          })).then(function(batchResults){
            results = results.concat(batchResults);
          });
        });
      }, Promise.resolve()).then(function(){ return results; });
    }).then(function(results){
      CA.isInitialized = true;
      CA.isLoaded = true;

      var okCount = results.filter(function(r){ return r.ok; }).length;
      var failCount = results.length - okCount;

      if (failCount === 0){
        setStatus("ready", "Kaart klaar · " + okCount + " landen");
      } else if (okCount > 0){
        setStatus("partial", "Kaart deels geladen · " + okCount + "/" + results.length + " landen");
      } else {
        setStatus("error", "Kaart kon niet laden — check verbinding");
      }

      LOG("Init klaar — " + okCount + "/" + results.length + " conflicten (v15.0)");

      try {
        if (window.WarDesk && WarDesk.events){
          WarDesk.events.emit("conflictareas:ready", {
            count: okCount,
            total: results.length,
            failed: results.filter(function(r){ return !r.ok; })
          });
        }
      } catch(e){}

      return true;
    }).catch(function(e){
      setStatus("error", "Kaart fout: " + (e.message || "?"));
      try { wdLog.error("[AREA] Init flow faalde:", e.message); } catch(err){}
      return false;
    });
  }

  function init(mapInstance){
    if (CA.isInitialized) return Promise.resolve();
    if (_initPromise) return _initPromise;
    if (!mapInstance) return Promise.reject(new Error("Geen map instance"));

    CA.map = mapInstance;

    injectStatusStyles();
    ensureStatusEl();

    _initPromise = _doInit();
    return _initPromise;
  }

  function refreshLayerForIso(iso3){
    if (!CA.layers[iso3]) return;
    CA._currentConflictIso = iso3;
    CA._currentConflict = getConflict(iso3);
    CA.layers[iso3].eachLayer(function(l){
      if (l.feature){
        try { l.setStyle(styleProvince(l.feature)); } catch(e){}
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     Public API
     ════════════════════════════════════════════════════════════ */
  window.ConflictAreas = {
    init: init,
    state: CA,
    _version: "v15.0",
    _conflicts: CONFLICTS,
    _activeConflicts: ACTIVE_CONFLICTS,
    refreshLayer: refreshLayerForIso,
    setStatus: setStatus
  };

  /* ════════════════════════════════════════════════════════════
     Auto-init probe
     ════════════════════════════════════════════════════════════ */
  var tries = 0, MAX = 240;
  function tryInit(){
    if (CA.isInitialized) return;
    tries++;
    var m = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
    if (m){
      init(m).catch(function(e){ LOG("Init FAALDE: " + (e.message || "?")); });
      return;
    }
    if (tries >= MAX) return;
    setTimeout(tryInit, 500);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(tryInit, 1500); });
  } else {
    setTimeout(tryInit, 1500);
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if (tab) setTimeout(tryInit, 1200);
  });

  /* ════════════════════════════════════════════════════════════
     Attack intensity herberekenen bij nieuwe events
     ════════════════════════════════════════════════════════════ */
  var _intensityTimer = null;
  try {
    if (window.WarDesk && window.WarDesk.events){
      window.WarDesk.events.on("map:military-events", function(){
        if (!CA.isInitialized) return;
        if (_intensityTimer) clearTimeout(_intensityTimer);
        _intensityTimer = setTimeout(function(){
          _intensityTimer = null;
          ACTIVE_CONFLICTS.forEach(function(iso){
            calculateAttackIntensity(iso);
            if (CA.layers[iso]){
              CA.layers[iso].eachLayer(function(l){
                if (l.feature){
                  try { l.setStyle(styleProvince(l.feature)); } catch(e){}
                }
              });
            }
          });
        }, 800);
      });
    }
  } catch(e){}

  LOG("conflict-areas.js v15.0 geladen (split: data + fetch + orchestrator)");

})();