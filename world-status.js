/* ============================================================
   WAR DESK — world-status.js v1.0
   Professionele militaire druk-indicator in de header
   - Leest events via EventBus (map:military-events)
   - Fallback naar window.MAPAPI.state.events
   - Klik = naar Kaart tab + Militair filter
   - 4 niveaus: Rustig / Verhoogd / Hoog / Kritiek
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[WORLD]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  /* ===== Drempelwaarden (aanpasbaar) =====
     Rustig:   0-2   conflicten
     Verhoogd: 3-7   conflicten
     Hoog:     8-14  conflicten
     Kritiek:  15+   conflicten */
  var THRESHOLDS = {
    1: { max: 2,       label: "Rustig"    },
    2: { max: 7,       label: "Verhoogd"  },
    3: { max: 14,      label: "Hoog"      },
    4: { max: Infinity,label: "Kritiek"   }
  };

  var _el = null;
  var _dotEl = null;
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

    /* Reset level classes */
    for(var i = 1; i <= 4; i++) _el.classList.remove("ws-level-" + i);
    _el.classList.add("ws-level-" + level);

    if(_countEl) _countEl.textContent = count;

    /* Accessibility */
    var aria = "Wereldstatus: " + info.label + " — " + count + " militaire events actief";
    _el.setAttribute("aria-label", aria);
    _el.setAttribute("title", info.label + " · " + count + " militaire events actief");

    /* Flash animatie alleen bij échte verandering (niet eerste render) */
    if(_hasRendered && _lastCount !== -1 && _lastCount !== count){
      flashUpdate();
    }
    _lastCount = count;
    _currentLevel = level;
    _hasRendered = true;

    LOG("Status:", info.label, "(" + count + ")");
  }

  function goToMap(){
    /* Sluit eventuele open modals */
    var wdModal = document.getElementById("wdDetailModal");
    if(wdModal && wdModal.classList.contains("show")) wdModal.classList.remove("show");
    var vodModal = document.getElementById("vodDetailModal");
    if(vodModal && vodModal.classList.contains("show")) vodModal.classList.remove("show");

    /* Klik op Kaart-tab */
    var mapTab = document.querySelector('.bottom-tabs .tab[data-view="map"]');
    if(mapTab){
      mapTab.click();
    } else {
      LOG("Kaart-tab niet gevonden");
      return;
    }

    /* Na view-switch: filter op militair */
    setTimeout(function(){
      var milFilter = document.querySelector('.live-filter[data-cat="military"]');
      if(milFilter){
        milFilter.click();
      } else {
        LOG("Militair-filter niet gevonden");
      }
    }, 350);

    /* Haptische feedback */
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
  }

  function bindUI(){
    _el = document.getElementById("worldStatus");
    if(!_el){
      LOG("Element #worldStatus niet gevonden");
      return false;
    }
    _dotEl = _el.querySelector(".ws-dot");
    _countEl = _el.querySelector(".ws-count");

    _el.addEventListener("click", function(e){
      e.preventDefault();
      goToMap();
    });

    _el.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        goToMap();
      }
    });

    return true;
  }

  function updateFromMapAPI(){
    try{
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        render(window.MAPAPI.state.events.length);
        return true;
      }
    }catch(e){}
    return false;
  }

  function bindBus(){
    if(_busBound) return;
    if(!window.WarDesk || !WarDesk.events || !WarDesk.events.on){
      LOG("EventBus niet beschikbaar");
      return;
    }
    _busBound = true;

    WarDesk.events.on("map:military-events", function(events){
      var count = Array.isArray(events) ? events.length : 0;
      render(count);
    });

    LOG("EventBus listener actief");
  }

  function init(){
    if(!bindUI()) return;
    bindBus();

    /* Directe poging via MapAPI */
    if(!updateFromMapAPI()){
      render(0);
      /* Fallback: check na 3s alsnog MapAPI, want die init soms later */
      setTimeout(function(){
        if(!_hasRendered || _lastCount === 0){
          updateFromMapAPI();
        }
      }, 3000);
    }

    LOG("v1.0 geïnitialiseerd");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(init, 400);
    });
  } else {
    setTimeout(init, 400);
  }

  wdLog.info("[WAR DESK] world-status.js v1.0 geladen");
})();