/* ============================================================
   WAR DESK — conflict-areas.js v11.12
   - v11.12: openPanel sluit eerst #wmCountryPanel (voorkomt
             dubbele bottom-sheets met worldmap.js)
   - v11.11: FIX init timeout (30s → 120s) + parallel batching
             + betere logging van init-progress
   - v11.10: BFA/ETH/NER/COD robuustere matching
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var UNIVERSAL_COLORS = [
    { label: "Regering / staat", color: "#2A6FDB" },
    { label: "Tegenstander / bezetter", color: "#C62828" },
    { label: "Hezbollah", color: "#FBC02D" },
    { label: "Druze (Syrië)", color: "#9333EA" },
    { label: "RSF (Soedan)", color: "#C62828" },
    { label: "Jihadisten (Sahel)", color: "#16A34A" },
    { label: "TPLF (Ethiopië)", color: "#F59E0B" },
    { label: "Arakan Army (Myanmar)", color: "#F59E0B" },
    { label: "M23 (DRC)", color: "#C62828" },
    { label: "Contested", color: "#a855f7" }
  ];

  /* ... (alle hulp-functies, PROXIES, DB, styleNeighbor, loadNeighbor,
         renderNeighbors, updateNeighborTheme, extractDeepStateGeometry,
         loadDeepState, loadISW, calculateControllers, calculateAttackIntensity,
         hasActiveAreas, hashColor, ensureContestedPattern, getConsensusForFeature,
         applyConsensusToMap, applyContestedPatternToLayer, styleProvince,
         styleCountryShadow, styleCountry, updateBorderWeights, bindZoomListener,
         unbindZoomListener, ensurePanes, renderOverlayPolygons,
         renderTerritoryChanges, startPulse, stopPulse,
         injectPanelStyles, ensurePanel, getEventsForArea, escapeHtml,
         timeAgoShort zijn IDENTIEK aan v11.11) ... */

  /* ============================================================
     v11.12: openPanel — sluit eerst wereldkaart-paneel
     ============================================================ */
  function openPanel(area, conflictIso){
    if (CA._lastOpenPanelTime && Date.now() - CA._lastOpenPanelTime < 500) return;
    CA._lastOpenPanelTime = Date.now();

    /* v11.12: sluit #wmCountryPanel (worldmap.js) om dubbele sheets te voorkomen */
    try {
      var wmPanel = document.getElementById("wmCountryPanel");
      if (wmPanel && wmPanel.classList.contains("show")){
        wmPanel.classList.remove("show");
      }
    } catch(e){}

    LOG("openPanel aangeroepen voor: " + (area && area.feature && area.feature.properties && area.feature.properties.name));
    try {
      var panel = ensurePanel();
      var props = area.feature.properties;
      panel.querySelector("#caPanelTitle").textContent = props.name || "?";

      var statsEl = panel.querySelector("#caPanelStats");
      var ctrlLabel = props.controller || "Onbekend";
      var ctrlClass = "conf-med";
      if(props.controller === "Rusland" || props.controller === "Israël" || props.controller === "Houthi's" || props.controller === "RSF" || props.controller === "JNIM (Jihadisten)" || props.controller === "M23/AFC") ctrlClass = "conf-low";
      else if(props.controller === "Oekraïne" || props.controller === "Regering" || props.controller === "Libanese staat" || props.controller === "Saoedi-Arabië" || props.controller === "Palestina" || props.controller === "Federale regering" || props.controller === "Junta (Regering)" || props.controller === "Pakistan (Regering)") ctrlClass = "conf-high";

      var events = getEventsForArea(area);
      var physicalCount = 0;
      for(var i = 0; i < events.length; i++){
        if(events[i].countsForHeat !== false) physicalCount++;
      }

      var provinceLine = "";
      if(props.provinceName){
        provinceLine = '<div class="wm-panel-conf-detail">Provincie: ' + escapeHtml(props.provinceName) + '</div>';
      }

      var consensusLine = "";
      var consensus = getConsensusForFeature(area.feature, conflictIso);
      if(consensus){
        var pct = Math.round((consensus.consensusStrength || 0) * 100);
        var conf = Math.round((consensus.confidence || 0) * 100);
        var contested = consensus.contested ? " · ⚔️ CONTESTED" : "";
        consensusLine = '<div class="wm-panel-conf-detail" style="color:#a855f7;font-weight:700">' +
          '🤖 AI: ' + escapeHtml(consensus.dominantActor) + ' (' + pct + '%' + contested + ')' +
          '<br><span style="font-weight:400;opacity:.8">' +
          conf + '% confidence · ' + consensus.sourceCount + ' bronnen · ' +
          consensus.originCount + ' landen</span></div>';
      }

      var territoryLine = "";
      var change = CA._territoryChanges[conflictIso + "|" + (props.provinceName || props.name || "*")];
      if (change){
        var icon = change.type === "control-change" ? (change.gainFor ? "🟢" : "🔴") :
                   change.type === "became-contested" ? "🟣" :
                   change.type === "resolved" ? "✅" : "🔵";
        territoryLine = '<div class="wm-panel-conf-detail" style="color:#e0a857;font-weight:700">' + icon + ' ' + escapeHtml(change.label || change.type) + '</div>';
      }

      statsEl.innerHTML =
        '<div class="wm-panel-stat ' + ctrlClass + '"><div class="wm-panel-stat-val">' + escapeHtml(ctrlLabel) + '</div><div class="wm-panel-stat-lbl">Controller</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + events.length + '</div><div class="wm-panel-stat-lbl">Events (7d)</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + physicalCount + '</div><div class="wm-panel-stat-lbl">Fysiek</div></div>' +
        consensusLine + territoryLine +
        '<div class="wm-panel-conf-detail">Bron: ' + escapeHtml(props.control_source || "—") +
          ' · Confidence: ' + Math.round((props.control_confidence || 0) * 100) + '%</div>' +
        provinceLine;

      var evEl = panel.querySelector("#caPanelEvents");
      if(!events.length){
        evEl.innerHTML = '<div class="wm-panel-empty">Geen militaire events in dit gebied</div>';
      } else {
        evEl.innerHTML = events.map(function(ev){
          var physical = ev.countsForHeat !== false;
          var actionTag = physical ? "Fysiek" : "Niet-fysiek";
          var actionClass = physical ? "wm-ev-physical" : "wm-ev-political";
          return '<div class="wm-panel-event">' +
            '<div class="wm-panel-event-title">' + escapeHtml(ev.title || "?") + '</div>' +
            '<div class="wm-panel-event-meta">' +
              '<span class="wm-panel-event-src">' + escapeHtml(ev.source || "?") + '</span>' +
              '<span class="wm-panel-event-dot">·</span>' +
              '<span>' + timeAgoShort(ev.date) + '</span>' +
              '<span class="' + actionClass + '">' + actionTag + '</span>' +
              '<span class="wm-panel-event-sub">' + escapeHtml(ev.subtype || "—") + '</span>' +
            '</div>' +
          '</div>';
        }).join("");
      }

      CA.selectedId = props.id;
      requestAnimationFrame(function(){ panel.classList.add("show"); });
      LOG("Panel getoond voor " + (props.name || "?"));
    } catch(err) {
      LOG("FOUT in openPanel: " + (err.message || "?"));
      try { console.error("[openPanel]", err); } catch(e){}
    }
  }

  /* ... rest van v11.11 identiek ... */

  window.ConflictAreas = {
    /* ... */
    _version: "v11.12",
    /* ... */
  };

  LOG("conflict-areas.js v11.12 geladen (panel-conflict fix)");

})();