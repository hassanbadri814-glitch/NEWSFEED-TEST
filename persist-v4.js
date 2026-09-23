/* ============================================================
   WAR DESK v4.2 — State persistentie
   - Start altijd op Nieuws (geen tab-herstel)
   - FIX v4.1: wdLog in plaats van console.log
   - FIX v4.2: WDStorage in plaats van localStorage (Fase 4 Deel 2)
   ============================================================ */

(function(){
  "use strict";

  var VALID_CATS = ["all","war","mideast","europe","nl","maroc","vs","sport","favorites"];
  var VALID_SORTS = ["importance","newest"];
  var VALID_VIEWS = ["cards","list"];

  function save(){
    try{
      if(!window.State || !window.WDStorage) return;
      WDStorage.setJSON("ui_state", {
        cat: State.currentCat,
        sort: State.currentSort,
        view: State.viewMode
      });
    }catch(e){}
  }

  function load(){
    try{
      if(!window.WDStorage) return null;
      return WDStorage.getJSON("ui_state", null);
    }catch(e){ return null; }
  }

  function saveView(viewName){
    if(!window.WDStorage) return;
    WDStorage.set("active_view", viewName);
  }

  function loadView(){
    if(!window.WDStorage) return "news";
    return WDStorage.get("active_view", "news");
  }

  function applyToUI(saved){
    if(!saved) return;
    var $ = function(id){ return document.getElementById(id); };

    document.querySelectorAll(".sheet-item[data-cat]").forEach(function(b){
      b.classList.toggle("active", b.dataset.cat === (saved.cat || "all"));
    });

    var imp = $("sortImportance"), nn = $("sortNewest");
    if(imp) imp.classList.toggle("active", (saved.sort || "importance") === "importance");
    if(nn) nn.classList.toggle("active", (saved.sort || "importance") === "newest");
    var vc = $("viewCards"), vl = $("viewList");
    if(vc) vc.classList.toggle("active", (saved.view || "cards") === "cards");
    if(vl) vl.classList.toggle("active", (saved.view || "cards") === "list");
  }

  function restore(){
    var saved = load();
    if(!saved || !window.State) return false;
    State.currentCat = VALID_CATS.indexOf(saved.cat) >= 0 ? saved.cat : "all";
    State.currentSort = VALID_SORTS.indexOf(saved.sort) >= 0 ? saved.sort : "importance";
    State.viewMode = VALID_VIEWS.indexOf(saved.view) >= 0 ? saved.view : "cards";
    return true;
  }

  function restoreActiveView(){
    return;
  }

  function initPersist(){
    var saved = load();
    if(saved){ restore(); applyToUI(saved); }

    document.addEventListener("click", function(e){
      var target = e.target.closest("[data-cat], #sortImportance, #sortNewest, #viewCards, #viewList");
      if(target){ setTimeout(save, 200); }
    }, true);

    document.querySelectorAll(".bottom-tabs .tab").forEach(function(tab){
      tab.addEventListener("click", function(){
        if(tab.dataset.view) saveView(tab.dataset.view);
      });
    });

    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", function(){
      if(document.hidden) save();
    });

    var attempts = 0;
    var waitInterval = setInterval(function(){
      attempts++;
      var ready = window.NewsAPI && window.State;
      var hasItems = ready && State.items && State.items.length > 0;
      var timedOut = attempts > 50;
      if((ready && hasItems) || (ready && timedOut)){
        clearInterval(waitInterval);
        restore();
        applyToUI(load());
        try{ if(NewsAPI.render) NewsAPI.render(); }catch(e){}
        wdLog.info("[WAR DESK] State hersteld (start altijd op Nieuws)");
      }
      if(attempts > 200) clearInterval(waitInterval);
    }, 100);
  }

  if(document.readyState !== "loading") initPersist();
  else document.addEventListener("DOMContentLoaded", initPersist);

  wdLog.info("[WAR DESK] persist-v4.js v4.2 geladen");
})();