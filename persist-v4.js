/* ============================================================
   WAR DESK v5.1 — State persistentie + EventBus
   - Start altijd op Nieuws (geen tab-herstel)
   - FIX v4.1: wdLog
   - FIX v4.2: WDStorage
   - FIX v4.3: dead code weg (B8) + currentSearch bewaren (B9)
   - FIX v5.0: polling verwijderd → EventBus listener (news:loaded)
   - FIX v5.1: timeout verwijderd, direct herstellen bij start
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
        view: State.viewMode,
        search: State.currentSearch || ""
      });
    }catch(e){}
  }

  function load(){
    try{
      if(!window.WDStorage) return null;
      return WDStorage.getJSON("ui_state", null);
    }catch(e){ return null; }
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

    // B9: herstel zoekterm in UI
    if(saved.search){
      var sInput = $("searchInput");
      if(sInput) sInput.value = saved.search;
    }
  }

  function restore(){
    var saved = load();
    if(!saved || !window.State) return false;
    State.currentCat = VALID_CATS.indexOf(saved.cat) >= 0 ? saved.cat : "all";
    State.currentSort = VALID_SORTS.indexOf(saved.sort) >= 0 ? saved.sort : "importance";
    State.viewMode = VALID_VIEWS.indexOf(saved.view) >= 0 ? saved.view : "cards";
    State.currentSearch = typeof saved.search === "string" ? saved.search : "";
    return true;
  }

  function initPersist(){
    // Stap 1: Direct herstellen bij opstart (geen wachten nodig)
    var saved = load();
    if(saved){ restore(); applyToUI(saved); }
    wdLog.info("[WAR DESK] State hersteld (start altijd op Nieuws)");

    // Stap 2: Save-triggers
    document.addEventListener("click", function(e){
      var target = e.target.closest("[data-cat], #sortImportance, #sortNewest, #viewCards, #viewList");
      if(target){ setTimeout(save, 200); }
    }, true);

    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", function(){
      if(document.hidden) save();
    });

    // Stap 3: Als het nieuws klaar is, één keer opnieuw renderen
    //         zodat de restored state zichtbaar wordt in de feed
    if(window.WarDesk && WarDesk.events && WarDesk.events.once){
      WarDesk.events.once("news:loaded", function(){
        wdLog.info("[WAR DESK] persist-v4: news:loaded ontvangen → feed opnieuw renderen");
        try{ if(window.NewsAPI && NewsAPI.render) NewsAPI.render(); }catch(e){}
      });
    } else {
      // Fallback zonder EventBus: korte polling (blijft werken)
      wdLog.warn("[WAR DESK] persist-v4: EventBus niet beschikbaar — val terug op polling");
      var attempts = 0;
      var waitInterval = setInterval(function(){
        attempts++;
        if(window.NewsAPI && window.State && State.items && State.items.length > 0){
          clearInterval(waitInterval);
          try{ if(NewsAPI.render) NewsAPI.render(); }catch(e){}
          wdLog.info("[WAR DESK] persist-v4: feed gerenderd na polling");
        }
        if(attempts > 200) clearInterval(waitInterval);
      }, 100);
    }
  }

  if(document.readyState !== "loading") initPersist();
  else document.addEventListener("DOMContentLoaded", initPersist);

  wdLog.info("[WAR DESK] persist-v4.js v5.1 geladen");
})();