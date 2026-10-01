/* ============================================================
   WAR DESK — maplibre-labels.js v1.2
   - v1.2: Poll-interval 800ms → 2000ms, MAX_ATTEMPTS 60 → 30
           (zelfde totale tijd, minder tikken, minder CPU)
   - v1.1: reset poll bij Map-tab klik
   - v1.0: eerste versie
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[LABELS]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var LABEL_FIELD = [
    "coalesce",
    ["get", "name:en"],
    ["get", "name:latin"],
    ["get", "name"]
  ];

  var LABEL_COLOR = "rgba(240, 240, 240, 0.95)";
  var LABEL_HALO_COLOR = "rgba(0, 0, 0, 0.9)";
  var LABEL_HALO_WIDTH = 1.5;

  /* v1.2: poll-tuning */
  var POLL_INTERVAL_MS = 2000;
  var MAX_ATTEMPTS = 30;

  var appliedFor = {};

  function customizeMapLabels(glMap, theme){
    if(!glMap) return;
    try {
      var style = glMap.getStyle();
      if(!style || !style.layers){
        return;
      }

      var count = 0;
      style.layers.forEach(function(layer){
        if(layer.type !== "symbol") return;
        try { glMap.setLayoutProperty(layer.id, "text-field", LABEL_FIELD); count++; } catch(e){}
        try { glMap.setPaintProperty(layer.id, "text-color", LABEL_COLOR); } catch(e){}
        try { glMap.setPaintProperty(layer.id, "text-halo-color", LABEL_HALO_COLOR); } catch(e){}
        try { glMap.setPaintProperty(layer.id, "text-halo-width", LABEL_HALO_WIDTH); } catch(e){}
      });

      if(count > 0){
        LOG("Labels aangepast — " + count + " symbol layers (" + theme + ")");
        appliedFor[theme] = true;
      }
    } catch(e){
      LOG("Fout bij aanpassen labels: " + e.message);
    }
  }

  function findGlMapForTheme(theme){
    try {
      if(!window.MAPAPI || !window.MAPAPI.state || !window.MAPAPI.state.tileLayers) return null;
      var layer = window.MAPAPI.state.tileLayers[theme];
      if(!layer) return null;

      if(typeof layer.getMaplibreMap === "function"){
        var m1 = layer.getMaplibreMap();
        if(m1) return m1;
      }
      if(layer._glMap) return layer._glMap;
      if(layer._map && layer._map._glMap) return layer._map._glMap;
    } catch(e){}
    return null;
  }

  function tryApplyForCurrentTheme(){
    var theme = document.body.classList.contains("light") ? "light" : "dark";
    if(appliedFor[theme]) return true;

    var glMap = findGlMapForTheme(theme);
    if(!glMap) return false;

    try {
      if(glMap.isStyleLoaded && glMap.isStyleLoaded()){
        customizeMapLabels(glMap, theme);
        return true;
      } else {
        glMap.once("styledata", function(){ customizeMapLabels(glMap, theme); });
        return true;
      }
    } catch(e){
      LOG("Apply fout: " + e.message);
      return false;
    }
  }

  /* v1.2: rustigere poll */
  var pollTimer = null;
  var attempts = 0;

  function startPoll(reason){
    if(pollTimer){ clearTimeout(pollTimer); pollTimer = null; }
    attempts = 0;
    LOG("Poll gestart (" + reason + ")");
    poll();
  }

  function poll(){
    if(attempts >= MAX_ATTEMPTS){
      LOG("Poll opgegeven na " + MAX_ATTEMPTS + " pogingen");
      return;
    }
    attempts++;

    if(tryApplyForCurrentTheme()){
      if(appliedFor.dark && appliedFor.light){
        LOG("Beide themes klaar — poll gestopt");
        return;
      }
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab){
      appliedFor = {};
      setTimeout(function(){ startPoll("Map-tab klik"); }, 1500);
    }
  });

  try {
    var themeObserver = new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.attributeName === "class"){
          var theme = document.body.classList.contains("light") ? "light" : "dark";
          if(!appliedFor[theme]){
            setTimeout(function(){
              if(tryApplyForCurrentTheme()) LOG("Labels toegepast na theme-wissel (" + theme + ")");
            }, 500);
          }
        }
      });
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  } catch(e){}

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(function(){ startPoll("init"); }, 3000); });
  } else {
    setTimeout(function(){ startPoll("init"); }, 3000);
  }

  LOG("maplibre-labels.js v1.2 geladen");

})();