/* ============================================================
   WAR DESK v13.2 — App Orchestration (Touch Gestures)
   - FIX v12.6: N1 clock stop pagehide
   - FIX v12.7: scroll restoration per tab, haptic feedback
   - FIX v13.0: Service Worker registratie toegevoegd
   - FIX v13.2: robuuste swipe-detectie — blokkeert tab-wissel
                als de touch begint in een horizontaal scrollbaar
                element (vod-sidebar, chips-row, iptv-pills, etc.)
   ============================================================ */

(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  const APP_VERSION = window.APP_VERSION || "v14.21";

  const ready = (fn) => {
    if(document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  };

  function haptic(ms){
    try{ if(navigator.vibrate) navigator.vibrate(ms || 10); }catch(e){}
  }

  ready(() => {
    if(document.documentElement.classList.contains("light")){
      document.body.classList.add("light");
    }

    /* ============================================================
       v13.0: Service Worker registratie
       ============================================================ */
    if("serviceWorker" in navigator){
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
          .then(reg => {
            try{ wdLog.info("[WAR DESK] Service Worker geregistreerd: " + (reg.scope || "")); }catch(e){}
          })
          .catch(err => {
            try{ wdLog.warn("[WAR DESK] Service Worker registratie mislukt: " + err.message); }catch(e){}
          });
      });
    }

    let clockTimer = null;

    const tick = () => {
      const el = $("clock");
      if(el) el.textContent = new Date().toLocaleTimeString("nl-NL", {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    };

    const startClock = () => {
      if(clockTimer) return;
      tick();
      clockTimer = setInterval(tick, 1000);
    };

    const stopClock = () => {
      if(clockTimer){
        clearInterval(clockTimer);
        clockTimer = null;
      }
    };

    document.addEventListener("visibilitychange", () => {
      if(document.hidden) stopClock();
      else startClock();
    });

    window.addEventListener("pagehide", stopClock);
    window.addEventListener("pageshow", startClock);

    startClock();

    const themeBtn = $("btnTheme");
    if(themeBtn){
      themeBtn.addEventListener("click", () => {
        const isLight = document.documentElement.classList.toggle("light");
        document.body.classList.toggle("light", isLight);
        if(window.WDStorage) WDStorage.set("theme", isLight ? "light" : "dark");
        haptic(10);
      });
    }

    const views = {
      news: $("viewNews"),
      map: $("viewMap"),
      iptv: $("viewIptv"),
      vod: $("viewVod")
    };

    let currentView = "news";

    const saveScroll = (viewName) => {
      try{ sessionStorage.setItem("wardesk_scroll_" + viewName, String(window.scrollY || 0)); }catch(e){}
    };

    const restoreScroll = (viewName) => {
      try{
        const y = parseInt(sessionStorage.getItem("wardesk_scroll_" + viewName) || "0", 10);
        if(y > 0) setTimeout(() => window.scrollTo(0, y), 50);
      }catch(e){}
    };

    const showView = (name) => {
      if(currentView !== name) saveScroll(currentView);
      currentView = name;
      Object.keys(views).forEach(k => {
        if(views[k]) views[k].hidden = (k !== name);
      });
      Array.from(document.querySelectorAll(".bottom-tabs .tab")).forEach(t => {
        t.classList.toggle("active", t.dataset.view === name);
      });
      restoreScroll(name);
    };

    Array.from(document.querySelectorAll(".bottom-tabs .tab")).forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        if (currentView !== view) haptic(10);
        showView(view);
      });
    });

    try{
      const params = new URLSearchParams(location.search);
      const requestedTab = params.get("tab");
      if(requestedTab && ["news","map","iptv","vod"].includes(requestedTab)){
        setTimeout(() => {
          const tabBtn = document.querySelector(`.bottom-tabs .tab[data-view="${requestedTab}"]`);
          if(tabBtn) tabBtn.click();
          try{
            const clean = location.pathname + (location.hash || "");
            history.replaceState(null, "", clean);
          }catch(e){}
        }, 500);
      }
    }catch(e){}

    const sheet = $("sheet");
    const overlay = $("sheetOverlay");

    const openSheet = () => {
      if(!sheet || !overlay) return;
      sheet.classList.add("open");
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      haptic(8);
    };
    const closeSheet = () => {
      if(!sheet || !overlay) return;
      sheet.classList.remove("open");
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    };

    const btnMenu = $("btnMenu");
    if(btnMenu) btnMenu.addEventListener("click", openSheet);
    const sheetClose = $("sheetClose");
    if(sheetClose) sheetClose.addEventListener("click", closeSheet);
    if(overlay) overlay.addEventListener("click", closeSheet);

    Array.from(document.querySelectorAll(".sheet-item[data-cat]")).forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        Array.from(document.querySelectorAll(".sheet-item[data-cat]")).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        try{ if(window.NewsAPI) NewsAPI.setCat(btn.dataset.cat); }catch(err){ wdLog.error("[WAR DESK] setCat fout:", err); }
      });
    });

    const bindSort = (id, sortValue) => {
      const btn = $(id);
      if(!btn) return;
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        const imp = $("sortImportance"); if(imp) imp.classList.remove("active");
        const nn = $("sortNewest"); if(nn) nn.classList.remove("active");
        btn.classList.add("active");
        try{ if(window.NewsAPI) NewsAPI.setSort(sortValue); }catch(err){}
      });
    };
    bindSort("sortImportance", "importance");
    bindSort("sortNewest", "newest");

    const bindView = (id, viewValue) => {
      const btn = $(id);
      if(!btn) return;
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        const c = $("viewCards"); if(c) c.classList.remove("active");
        const l = $("viewList"); if(l) l.classList.remove("active");
        btn.classList.add("active");
        try{ if(window.NewsAPI) NewsAPI.setView(viewValue); }catch(err){}
      });
    };
    bindView("viewCards", "cards");
    bindView("viewList", "list");

    const searchInput = $("searchInput");
    if(searchInput){
      let searchTimer;
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          try{ if(window.NewsAPI) NewsAPI.setSearch(searchInput.value); }catch(err){}
        }, 250);
      });
    }

    let startY = 0, currentY = 0, dragging = false, canSwipeClose = false;
    if(sheet){
      sheet.addEventListener("touchstart", e => {
        if(e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        dragging = true;
        canSwipeClose = (sheet.scrollTop <= 0);
      }, {passive: true});
      sheet.addEventListener("touchmove", e => {
        if(!dragging || e.touches.length !== 1) return;
        currentY = e.touches[0].clientY;
        const delta = currentY - startY;
        if(delta > 0 && canSwipeClose){
          if(e.cancelable) e.preventDefault();
          sheet.style.transform = `translateY(${delta}px)`;
        } else {
          if(delta < 0) canSwipeClose = false;
          dragging = false;
          sheet.style.transform = "";
        }
      }, {passive: false});
      sheet.addEventListener("touchend", () => {
        if(!dragging) return;
        dragging = false;
        if(canSwipeClose && currentY - startY > 100) closeSheet();
        sheet.style.transform = "";
        startY = currentY = 0;
        canSwipeClose = false;
      });
      sheet.addEventListener("touchcancel", () => {
        dragging = false;
        canSwipeClose = false;
        sheet.style.transform = "";
        startY = currentY = 0;
      });
    }

    document.addEventListener("keydown", e => {
      if(e.key !== "Escape") return;
      const vodModal = $("vodDetailModal");
      if(vodModal && vodModal.classList.contains("show")) return;
      const modal = $("wdDetailModal");
      if(modal && modal.classList.contains("show")) return;
      if(document.querySelector(".map-wrap.fullscreen")) return;
      closeSheet();
    });

    const bb = $("breakingClose");
    if(bb){
      bb.addEventListener("click", e => {
        e.stopPropagation();
        const banner = $("breakingBanner");
        if(banner) banner.classList.remove("show");
      });
    }
    const banner = $("breakingBanner");
    if(banner){
      banner.addEventListener("click", e => {
        if(e.target.closest(".breaking-close")) return;
        const item = window.State?.lastBreakingItem;
        if(item?.link){
          window.open(item.link, "_blank", "noopener");
          banner.classList.remove("show");
        }
      });
    }

    let toastTimer;
    window.showToast = (msg) => {
      const t = $("toast");
      if(!t) return;
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.classList.remove("show"); }, 2200);
    };

    /* ============================================================
       v13.2: Swipe-wissel tussen tabs
       - Dynamische detectie van horizontaal scrollbare voorouders
       - Als de touch begint in zo'n element → geen tab-wissel
       ============================================================ */
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartInScrollable = false;
    let touchStartValid = false;

    function findScrollableAncestor(el){
      while (el && el.nodeType === 1 && el !== document.body){
        try {
          var style = window.getComputedStyle(el);
          var overflowX = style.overflowX;
          if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1){
            return el;
          }
        } catch(e){}
        el = el.parentElement;
      }
      return null;
    }

    document.addEventListener("touchstart", e => {
      if(!e.touches || !e.touches.length) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartValid = true;
      touchStartInScrollable = !!findScrollableAncestor(e.target);
    }, { passive: true });

    document.addEventListener("touchend", e => {
      if (!touchStartValid) return;
      touchStartValid = false;

      if (touchStartInScrollable) {
        touchStartInScrollable = false;
        return;
      }

      if (!e.changedTouches || !e.changedTouches.length) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
        // Extra check: eindigde de touch ook niet in een scrollable?
        if (findScrollableAncestor(e.target)) return;

        const tabs = ['news', 'map', 'iptv', 'vod'];
        const currentTab = document.querySelector('.tab.active')?.dataset.view || 'news';
        const currentIndex = tabs.indexOf(currentTab);

        let newIndex;
        if (deltaX > 0 && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
          newIndex = currentIndex + 1;
        }

        if (newIndex !== undefined) {
          const tabBtn = document.querySelector(`.tab[data-view="${tabs[newIndex]}"]`);
          if (tabBtn) tabBtn.click();
        }
      }
    }, { passive: true });

    wdLog.info("[WAR DESK] app-v12.js " + APP_VERSION + " geladen");
  });
})();