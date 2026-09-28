/* ============================================================
   WAR DESK — maplibre-labels.js v1.0
   Past MapLibre kaart-labels aan:
   - Alleen Latijns schrift (geen Cyrillisch/Arabisch)
   - Betere kleur en leesbaarheid
   - Fallback: name:en → name:latin → name
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

  var applied = false;

  function customizeMapLabels(glMap){
    if(!glMap || applied) return;
    try {
      var style = glMap.getStyle();
      if(!style || !style.layers){
        LOG("Geen style layers gevonden");
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

      LOG("Labels aangepast — " + count + " symbol layers");
      applied = true;
    } catch(e){
      LOG("Fout: " + e.message);
    }
  }

  function findGlMap(){
    try {
      if(!window.MAPAPI || !window.MAPAPI.state) return null;
      var tileLayers = window.MAPAPI.state.tileLayers;
      if(!tileLayers) return null;
      var themes = Object.keys(tileLayers);
      for(var i = 0; i < themes.length; i++){
        var layer = tileLayers[themes[i]];
        if(!layer) continue;
        if(layer._glMap) return layer._glMap;
        if(layer.getMaplibreMap) return layer.getMaplibreMap();
      }
    } catch(e){}
    return null;
  }

  function tryApply(){
    if(applied) return;
    var glMap = findGlMap();
    if(!glMap) return;

    try {
      if(glMap.isStyleLoaded && glMap.isStyleLoaded()){
        customizeMapLabels(glMap);
      } else {
        glMap.once("styledata", function(){ customizeMapLabels(glMap); });
      }
    } catch(e){
      LOG("Apply fout: " + e.message);
    }
  }

  var tries = 0;
  var MAX = 60;
  function poll(){
    if(applied) return;
    tries++;
    tryApply();
    if(!applied && tries < MAX){
      setTimeout(poll, 500);
    } else if(!applied){
      LOG("Kon MapLibre instance niet vinden na " + MAX + " pogingen");
    }
  }

  /* Reset bij theme-wissel of terugkeren naar kaart-tab */
  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab){
      applied = false;
      tries = 0;
      setTimeout(poll, 2000);
    }
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(poll, 3000); });
  } else {
    setTimeout(poll, 3000);
  }

  LOG("maplibre-labels.js v1.0 geladen");
})();