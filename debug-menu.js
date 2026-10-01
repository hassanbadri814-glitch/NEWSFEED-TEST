/* ============================================================
   WAR DESK — debug-menu.js v1.0
   Voegt een Debug-toggle + Open/Wis-knoppen toe aan het menu.
   Zelfstandig — geen wijzigingen nodig in index.html behalve
   één <script>-tag.
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try {
      if (window.WD_DEBUG && window.wdLog && wdLog.info) {
        wdLog.info.apply(null, ["[DEBUG-MENU]"].concat(Array.prototype.slice.call(arguments)));
      }
    } catch(e){}
  };

  var LS_KEY = "wardesk_debug";

  function isDebugActive(){
    try { return localStorage.getItem(LS_KEY) === "1"; }
    catch(e){ return false; }
  }

  function setDebug(enabled){
    var on = !!enabled;
    try { localStorage.setItem(LS_KEY, on ? "1" : "0"); } catch(e){}

    if (window.showToast) {
      window.showToast(on ? "🐞 Debug aan — herladen…" : "Debug uit — herladen…");
    }

    setTimeout(function(){
      try { location.reload(); } catch(e){}
    }, 700);
  }

  function openDebugLog(){
    var panel = document.getElementById("wdDebugPanel");
    var btn = document.getElementById("wdDebugBtn");

    if (!panel || !btn) {
      if (window.showToast) window.showToast("Debug is uit — zet de toggle eerst aan");
      return;
    }

    /* Activeer debug-modus UI als dat nog niet actief is */
    if (!document.documentElement.classList.contains("wd-debug-on")) {
      document.documentElement.classList.add("wd-debug-on");
    }

    /* Open het paneel via de bestaande knop */
    try {
      btn.click();
    } catch(e){}

    /* Sluit het menu-sheet zodat de log niet eroverheen valt */
    try {
      var sheet = document.getElementById("sheet");
      var overlay = document.getElementById("sheetOverlay");
      if (sheet) sheet.classList.remove("open");
      if (overlay) overlay.classList.remove("open");
      document.body.style.overflow = "";
    } catch(e){}
  }

  function clearDebugLog(){
    try { window.__wdLog = []; } catch(e){}

    var el = document.getElementById("wdDebugLog");
    if (el) {
      el.innerHTML = '<div class="empty">Log gewist</div>';
    }

    if (window.showToast) window.showToast("🧹 Log gewist");
    LOG("Log gewist door gebruiker");
  }

  /* ============================================================
     HTML-injectie in het menu
     ============================================================ */
  function buildDebugSection(){
    var section = document.createElement("div");
    section.className = "sheet-section";
    section.id = "wdDebugMenuSection";
    section.innerHTML =
      '<div class="sheet-title">Ontwikkelaar</div>' +
      '<div class="toggle-row" id="toggleDebugRow" role="button" tabindex="0">' +
        '<svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="9"/>' +
          '<line x1="12" y1="8" x2="12" y2="12"/>' +
          '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
        '</svg>' +
        '<span class="toggle-label">Debug log (🐞-knop)</span>' +
        '<div class="toggle-switch" id="toggleDebug"></div>' +
      '</div>' +
      '<div class="action-row" style="margin-top:.5rem">' +
        '<button class="sheet-item" id="wdOpenDebugBtn" type="button">🐞 Open Debug Log</button>' +
        '<button class="sheet-item" id="wdClearDebugBtn" type="button">🧹 Wis Log</button>' +
      '</div>';

    return section;
  }

  function findInsertPoint(){
    /* We willen de debug-sectie NA "Meldingen" en VOOR "App" */
    var sheet = document.getElementById("sheet");
    if (!sheet) return null;

    var sections = sheet.querySelectorAll(".sheet-section");
    var appSection = null;
    var meldingenSection = null;

    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var titleEl = s.querySelector(".sheet-title");
      if (!titleEl) continue;
      var title = (titleEl.textContent || "").trim();
      if (title === "App" && !appSection) appSection = s;
      if (title === "Meldingen" && !meldingenSection) meldingenSection = s;
    }

    /* Voorkeur: voor "App" */
    if (appSection) {
      return { before: appSection };
    }

    /* Fallback: na "Meldingen" */
    if (meldingenSection && meldingenSection.nextSibling) {
      return { after: meldingenSection };
    }

    /* Laatste fallback: aan het einde van het sheet-content */
    var content = sheet.querySelector(".sheet-content");
    if (content) {
      return { append: content };
    }

    return null;
  }

  function injectDebugSection(){
    if (document.getElementById("wdDebugMenuSection")) return true;

    var point = findInsertPoint();
    if (!point) return false;

    var section = buildDebugSection();

    try {
      if (point.before && point.before.parentNode) {
        point.before.parentNode.insertBefore(section, point.before);
      } else if (point.after && point.after.parentNode) {
        point.after.parentNode.insertBefore(section, point.after.nextSibling);
      } else if (point.append) {
        point.append.appendChild(section);
      } else {
        return false;
      }
    } catch(e) {
      LOG("Injectie faalde:", e.message);
      return false;
    }

    bindDebugSectionEvents(section);
    syncDebugToggle();

    LOG("Debug-sectie geïnjecteerd in menu");
    return true;
  }

  /* ============================================================
     Event-binding
     ============================================================ */
  function bindDebugSectionEvents(section){
    var row = section.querySelector("#toggleDebugRow");
    var openBtn = section.querySelector("#wdOpenDebugBtn");
    var clearBtn = section.querySelector("#wdClearDebugBtn");

    if (row) {
      var onToggle = function(e){
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setDebug(!isDebugActive());
      };

      row.addEventListener("click", onToggle);
      row.addEventListener("keydown", function(e){
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(e);
        }
      });
    }

    if (openBtn) {
      openBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        openDebugLog();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        clearDebugLog();
      });
    }
  }

  /* ============================================================
     Sync toggle-state
     ============================================================ */
  function syncDebugToggle(){
    var row = document.getElementById("toggleDebugRow");
    if (!row) return;

    /* URL-parameter dwingt debug aan (handig voor snel testen) */
    try {
      if (/[?&]debug=1/.test(location.search)) {
        if (localStorage.getItem(LS_KEY) !== "1") {
          localStorage.setItem(LS_KEY, "1");
        }
      }
    } catch(e){}

    var active = isDebugActive();
    row.classList.toggle("active", active);
    row.setAttribute("aria-pressed", active ? "true" : "false");
  }

  /* ============================================================
     Observers — houd de sectie in sync
     ============================================================ */
  function observeSheet(){
    var sheet = document.getElementById("sheet");
    if (!sheet) return;

    try {
      var obs = new MutationObserver(function(){
        /* Als het menu opent, check of de sectie er is */
        if (sheet.classList.contains("open")) {
          if (!document.getElementById("wdDebugMenuSection")) {
            injectDebugSection();
          } else {
            syncDebugToggle();
          }
        }
      });
      obs.observe(sheet, { attributes: true, attributeFilter: ["class"] });
    } catch(e){}
  }

  /* ============================================================
     Exporteer globale functies voor gebruik elders
     ============================================================ */
  window.__isDebugActive = isDebugActive;
  window.__setDebug = setDebug;
  window.__openDebugLog = openDebugLog;
  window.__clearDebugLog = clearDebugLog;

  /* ============================================================
     Init — wacht tot DOM klaar is
     ============================================================ */
  function init(){
    /* Probeer direct (menu kan al bestaan) */
    if (injectDebugSection()) {
      observeSheet();
      return;
    }

    /* Retry — misschien is het menu nog niet gebouwd */
    var attempts = 0;
    var timer = setInterval(function(){
      attempts++;
      if (injectDebugSection()) {
        clearInterval(timer);
        observeSheet();
        return;
      }
      if (attempts >= 40) {
        clearInterval(timer);
        LOG("Kon debug-sectie niet injecteren na 20s — menu niet gevonden");
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(init, 600);
    });
  } else {
    setTimeout(init, 600);
  }

  /* Herinit bij page-show (PWA) */
  window.addEventListener("pageshow", function(){
    setTimeout(function(){
      if (!document.getElementById("wdDebugMenuSection")) {
        init();
      } else {
        syncDebugToggle();
      }
    }, 300);
  });

  LOG("debug-menu.js v1.0 geladen");

})();