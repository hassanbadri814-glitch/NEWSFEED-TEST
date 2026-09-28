/* ============================================================
   WAR DESK — world-status.js v2.1
   - v2.1: filter op countsForHeat (alleen fysieke events)
   - v2.0: militaire druk-indicator
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[WORLD]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var THRESHOLDS = {
    1: { max: 2,        label: "Rustig"   },
    2: { max: 7,        label: "Verhoogd" },
    3: { max: 14,       label: "Hoog"     },
    4: { max: Infinity, label: "Kritiek"  }
  };

  var _el = null;
  var _countEl = null;
  var _currentLevel = 1;
  var _lastCount = -1;
  var _hasRendered = false;
  var _busBound = false;

  function classify(count){
    for(var i = 1; i <= 4; i++){
      if(count <= THRESHOLDS[i].max) return i;
    }
    return 4;
  }

  function flashUpdate(){
    if(!_el) return;
    _el.classList.remove("ws-updated");
    void _el.offsetWidth;
    _el.classList.add("ws-updated");
    setTimeout(function(){ _el.classList.remove("ws-updated"); }, 700);
  }

  function render(count){
    if(!_el) return;
    count = Math.max(0, parseInt(count, 10) || 0);

    var level = classify(count);
    var info = THRESHOLDS[level];

    for(var i = 1; i <= 4; i++) _el.classList.remove("ws-level-" + i);
    _el.classList.add("ws-level-" + level);

    if(_countEl) _countEl.textContent = count;

    var aria = "Wereldstatus: " + info.label + " — " + count + " fysieke militaire events actief";
    _el.setAttribute("aria-label", aria);
    _el.setAttribute("title", info.label + " · " + count + " fysieke events");

    if(_hasRendered && _lastCount !== -1 && _lastCount !== count){
      flashUpdate();
    }
    _lastCount = count;
    _currentLevel = level;
    _hasRendered = true;

    LOG("Status:", info.label, "(" + count + ")");
  }

  function goToMap(){
    var wdModal = document.getElementById("wdDetailModal");
    if(wdModal && wdModal.classList.contains("show")) wdModal.classList.remove("show");
    var vodModal = document.getElementById("vodDetailModal");
    if(vodModal && vodModal.classList.contains("show")) vodModal.classList.remove("show");

    var mapTab = document.querySelector('.bottom-tabs .tab[data-view="map"]');
    if(mapTab) mapTab.click();
    else return;

    setTimeout(function(){
      var milFilter = document.querySelector('.live-filter[data-cat="militair"]');
      if(milFilter) milFilter.click();
    }, 350);

    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
  }

  function bindUI(){
    _el = document.getElementById("worldStatus");
    if(!_el){ LOG("Element #worldStatus niet gevonden"); return false; }
    _countEl = _el.querySelector(".ws-count");

    _el.addEventListener("click", function(e){ e.preventDefault(); goToMap(); });
    _el.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); goToMap(); }
    });
    return true;
  }

  /* v2.1: telt alleen events met countsForHeat !== false */
  function countMilitary(events){
    if(!Array.isArray(events)) return 0;
    var n = 0;
    for(var i = 0; i < events.length; i++){
      var e = events[i];
      if(!e) continue;
      if(e.category !== "militair") continue;
      if(e.countsForHeat === false) continue;
      n++;
    }
    return n;
  }

  function updateFromMapAPI(){
    try{
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        render(countMilitary(window.MAPAPI.state.events));
        return true;
      }
    }catch(e){}
    return false;
  }

  function bindBus(){
    if(_busBound) return;
    if(!window.WarDesk || !WarDesk.events || !WarDesk.events.on){ LOG("EventBus niet beschikbaar"); return; }
    _busBound = true;

    WarDesk.events.on("map:military-events", function(events){
      render(countMilitary(events));
    });

    LOG("EventBus listener actief");
  }

  function init(){
    if(!bindUI()) return;
    bindBus();

    if(!updateFromMapAPI()){
      render(0);
      setTimeout(function(){
        if(!_hasRendered || _lastCount === 0) updateFromMapAPI();
      }, 3000);
    }

    LOG("v2.1 geïnitialiseerd — telt alleen fysieke events");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 400); });
  } else {
    setTimeout(init, 400);
  }

  wdLog.info("[WAR DESK] world-status.js v2.1 geladen");
})();