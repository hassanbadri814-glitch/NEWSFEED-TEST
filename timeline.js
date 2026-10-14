/* ============================================================
   WAR DESK — timeline.js v1.0
   - Datumkiezer op de kaart voor historische baseline-weergave
   - Werkt via WDBaseline.setActiveDate(date)
   - Emit baseline:timeline-changed → layers hertekenen
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try { wdLog.info.apply(null, ["[TIMELINE]"].concat(Array.prototype.slice.call(arguments))); } catch(e){}
  };

  var VERSION = "v1.0";

  var TL = {
    container: null,
    dateInput: null,
    panel: null,
    isOpen: false,
    activeDate: null
  };

  function injectStyles(){
    if (document.getElementById("wdTimelineStyles")) return;
    var s = document.createElement("style");
    s.id = "wdTimelineStyles";
    s.textContent =
      ".ca-timeline{position:absolute;top:3.4rem;left:50%;transform:translateX(-50%);z-index:500;display:flex;align-items:center;gap:.4rem;background:rgba(13,21,34,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.3);border-radius:9px;padding:2px 4px;box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:Inter,sans-serif;}" +
      "html.light .ca-timeline{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.12);}" +
      ".ca-timeline-btn{background:transparent;border:none;color:#e6ebf5;font-size:.7rem;font-weight:700;padding:.35rem .55rem;border-radius:7px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:.35rem;transition:all .15s;}" +
      "html.light .ca-timeline-btn{color:#131721;}" +
      ".ca-timeline-btn:hover{color:#e0a857;}" +
      ".ca-timeline-btn.active{background:rgba(224,168,87,.25);color:#e0a857;}" +
      ".ca-timeline-btn svg{width:13px;height:13px;}" +
      ".ca-timeline-panel{position:absolute;top:calc(100% + .4rem);left:50%;transform:translateX(-50%);background:rgba(13,21,34,.98);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(224,168,87,.4);border-radius:10px;padding:.6rem;box-shadow:0 8px 24px rgba(0,0,0,.6);display:none;min-width:220px;}" +
      ".ca-timeline-panel.show{display:block;}" +
      "html.light .ca-timeline-panel{background:rgba(255,255,255,.98);border-color:rgba(0,0,0,.15);}" +
      ".ca-timeline-panel input[type='date']{width:100%;padding:.5rem .6rem;background:#0a1320;color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:6px;font-family:inherit;font-size:.8rem;margin-bottom:.5rem;}" +
      "html.light .ca-timeline-panel input[type='date']{background:#f5f5f7;color:#131721;}" +
      ".ca-timeline-panel .row{display:flex;gap:.4rem;}" +
      ".ca-timeline-panel .row button{flex:1;padding:.45rem;border-radius:6px;border:none;font-family:inherit;font-weight:700;font-size:.75rem;cursor:pointer;}" +
      ".ca-timeline-panel .now{background:linear-gradient(135deg,#e0a857,#f0c074);color:#070c16;}" +
      ".ca-timeline-panel .cancel{background:rgba(255,255,255,.06);color:#8a94a8;border:1px solid rgba(255,255,255,.15);}" +
      ".ca-timeline-badge{display:inline-flex;align-items:center;gap:.3rem;padding:.15rem .5rem;background:rgba(224,168,87,.9);color:#070c16;border-radius:6px;font-size:.6rem;font-weight:800;letter-spacing:.02em;margin-left:.4rem;}" +
      ".ca-timeline-info{position:absolute;top:6.4rem;left:50%;transform:translateX(-50%);z-index:499;padding:.35rem .7rem;background:rgba(224,168,87,.9);color:#070c16;border-radius:6px;font-size:.65rem;font-weight:700;font-family:Inter,sans-serif;pointer-events:none;opacity:0;transition:opacity .3s;max-width:260px;text-align:center;}" +
      ".ca-timeline-info.show{opacity:1;}" +
      "@media (max-width:640px){.ca-timeline{top:3rem;}.ca-timeline-btn{font-size:.6rem;padding:.28rem .45rem;}.ca-timeline-panel{min-width:200px;}}";
    document.head.appendChild(s);
  }

  function refreshAllLayers(){
    if (!window.ConflictAreas) return;
    try {
      var active = ConflictAreas._activeConflicts || [];
      active.forEach(function(iso){
        if (ConflictAreas.refreshLayer){
          ConflictAreas.refreshLayer(iso);
        }
      });
      LOG("Alle lagen hertekend na timeline-change");
    } catch(e){
      try { wdLog.warn("[TIMELINE] refresh faalde:", e.message); } catch(e2){}
    }
  }

  function formatDate(d){
    if (!d) return "Nu";
    try {
      var dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
    } catch(e){ return d; }
  }

  function updateButtonState(){
    if (!TL.dateInput) return;
    var active = !!TL.activeDate;
    TL.dateInput.classList.toggle("active", active);
    var labelEl = TL.dateInput.querySelector(".ca-timeline-label");
    if (labelEl){
      labelEl.textContent = active ? formatDate(TL.activeDate) : "Live";
    }
  }

  function showInfo(msg, duration){
    var info = document.querySelector(".ca-timeline-info");
    if (!info){
      info = document.createElement("div");
      info.className = "ca-timeline-info";
      var wrap = document.querySelector(".map-wrap");
      if (wrap) wrap.appendChild(info);
    }
    info.textContent = msg;
    info.classList.add("show");
    if (info._timer) clearTimeout(info._timer);
    info._timer = setTimeout(function(){
      info.classList.remove("show");
    }, duration || 3000);
  }

  function applyDate(dateStr){
    TL.activeDate = dateStr || null;

    if (!window.WDBaseline || !WDBaseline.setActiveDate){
      LOG("WDBaseline.setActiveDate niet beschikbaar");
      return;
    }

    WDBaseline.setActiveDate(TL.activeDate);

    updateButtonState();
    refreshAllLayers();

    if (TL.activeDate){
      showInfo("📅 Historische weergave: " + formatDate(TL.activeDate), 3500);
      LOG("Actieve datum:", TL.activeDate);
    } else {
      showInfo("↩ Terug naar live", 2000);
      LOG("Terug naar live");
    }
  }

  function closePanel(){
    if (TL.panel) TL.panel.classList.remove("show");
    TL.isOpen = false;
  }

  function openPanel(){
    if (!TL.panel) return;
    TL.panel.classList.add("show");
    TL.isOpen = true;
    var inp = TL.panel.querySelector("input[type='date']");
    if (inp){
      if (TL.activeDate) inp.value = TL.activeDate;
      else inp.value = new Date().toISOString().slice(0, 10);
    }
  }

  function buildTimeline(){
    var wrap = document.querySelector(".map-wrap");
    if (!wrap) return false;
    if (wrap.querySelector(".ca-timeline")) return true;

    var container = document.createElement("div");
    container.className = "ca-timeline";

    /* Hoofdknop */
    var btn = document.createElement("button");
    btn.className = "ca-timeline-btn";
    btn.type = "button";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
        '<line x1="16" y1="2" x2="16" y2="6"/>' +
        '<line x1="8" y1="2" x2="8" y2="6"/>' +
        '<line x1="3" y1="10" x2="21" y2="10"/>' +
      '</svg>' +
      '<span class="ca-timeline-label">Live</span>';
    container.appendChild(btn);

    /* Panel */
    var panel = document.createElement("div");
    panel.className = "ca-timeline-panel";
    panel.innerHTML =
      '<input type="date">' +
      '<div class="row">' +
        '<button class="cancel" type="button">Annuleer</button>' +
        '<button class="now" type="button">Toon op datum</button>' +
      '</div>';
    container.appendChild(panel);

    /* Info banner */
    var info = document.createElement("div");
    info.className = "ca-timeline-info";
    wrap.appendChild(info);

    wrap.appendChild(container);

    TL.container = container;
    TL.dateInput = btn;
    TL.panel = panel;

    /* Bind events */
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      if (TL.isOpen) closePanel();
      else openPanel();
    });

    panel.querySelector(".cancel").addEventListener("click", function(e){
      e.stopPropagation();
      closePanel();
    });

    panel.querySelector(".now").addEventListener("click", function(e){
      e.stopPropagation();
      var inp = panel.querySelector("input[type='date']");
      var val = inp ? inp.value : null;
      if (!val){
        showInfo("Kies eerst een datum", 2000);
        return;
      }
      applyDate(val);
      closePanel();
    });

    /* Als datum al actief, verwijder-knop tonen we niet — gebruiker kiest nieuw */
    document.addEventListener("click", function(e){
      if (!TL.isOpen) return;
      if (container.contains(e.target)) return;
      closePanel();
    });

    updateButtonState();
    LOG("Timeline UI geïnjecteerd");
    return true;
  }

  function init(){
    injectStyles();

    var tries = 0;
    function tryBuild(){
      tries++;
      if (buildTimeline()) return;
      if (tries < 40) setTimeout(tryBuild, 500);
    }
    tryBuild();

    /* Luisteren op baseline updates om button state te syncen */
    try {
      if (window.WarDesk && WarDesk.events && WarDesk.events.on){
        WarDesk.events.on("baseline:timeline-changed", function(data){
          TL.activeDate = data && data.date ? data.date : null;
          updateButtonState();
        });
      }
    } catch(e){}
  }

  window.WDTimeline = {
    version: VERSION,
    applyDate: applyDate,
    clearDate: function(){ applyDate(null); },
    getActiveDate: function(){ return TL.activeDate; }
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 800); });
  } else {
    setTimeout(init, 800);
  }

  try { wdLog.info("[Timeline] " + VERSION + " geladen"); } catch(e){}

})();