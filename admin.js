/* ============================================================
   WAR DESK — admin.js v1.0
   - Admin-modus: klik op provincie → wijzig controller
   - Wijzigingen in localStorage (WDBaseline.set)
   - Toggle via menu-knop of dubbelklik op "Wereldkaart"-knop
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[ADMIN]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var isAdmin = false;
  var lastPanelArea = null;
  var lastPanelIso = null;

  function toast(msg){
    try { if (window.showToast) window.showToast(msg); } catch(e){}
  }

  function getConflicts(){
    return (window.ConflictAreas && ConflictAreas._conflicts) ? ConflictAreas._conflicts : {};
  }

  function getBaseline(iso3, admin1, provinceName){
    if (window.WDBaseline && window.WDBaseline.get){
      return window.WDBaseline.get(iso3, admin1, provinceName);
    }
    return null;
  }

  function setBaseline(iso3, admin1, controller){
    if (window.WDBaseline && window.WDBaseline.set){
      return window.WDBaseline.set(iso3, admin1, controller, null, "admin-UI");
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════
     Admin modus toggle
     ════════════════════════════════════════════════════════════ */
  function toggleAdmin(){
    isAdmin = !isAdmin;
    document.body.classList.toggle("wd-admin-mode", isAdmin);
    toast(isAdmin ? "🛠️ Admin modus AAN — klik op een provincie" : "Admin modus UIT");
    LOG("Admin modus:", isAdmin ? "AAN" : "UIT");
  }

  /* ════════════════════════════════════════════════════════════
     Menu-knop injecteren
     ════════════════════════════════════════════════════════════ */
  function injectMenuButton(){
    var sheetContent = document.querySelector("#sheet .sheet-content");
    if (!sheetContent || sheetContent.querySelector(".wd-admin-menu-btn")) return;

    var section = document.createElement("div");
    section.className = "sheet-section";
    section.innerHTML =
      '<div class="sheet-title">Beheer</div>' +
      '<div class="action-row">' +
        '<button class="sheet-item wd-admin-menu-btn" id="wdAdminToggle">🛠️ Admin modus aan/uit</button>' +
        '<button class="sheet-item" id="wdAdminExport">📄 Exporteer baseline</button>' +
        '<button class="sheet-item" id="wdAdminReset">♻️ Reset handmatige wijzigingen</button>' +
      '</div>' +
      '<div id="wdAdminStatus" style="font-size:.7rem;opacity:.6;padding:.4rem .25rem">Admin: uit</div>';

    var lastSection = sheetContent.querySelector(".sheet-section:last-of-type");
    if (lastSection) {
      sheetContent.insertBefore(section, lastSection);
    } else {
      sheetContent.appendChild(section);
    }

    document.getElementById("wdAdminToggle").addEventListener("click", function(){
      toggleAdmin();
      var status = document.getElementById("wdAdminStatus");
      if (status) status.textContent = "Admin: " + (isAdmin ? "AAN" : "uit");
    });

    document.getElementById("wdAdminExport").addEventListener("click", function(){
      exportBaseline();
    });

    document.getElementById("wdAdminReset").addEventListener("click", function(){
      if (!confirm("Alle handmatige wijzigingen wissen? De originele baseline wordt hersteld.")) return;
      resetAdminChanges();
    });

    LOG("Menu-knop geïnjecteerd");
  }

  /* ════════════════════════════════════════════════════════════
     Panel-hook — wordt aangeroepen door conflict-areas.js
     ════════════════════════════════════════════════════════════ */
  function onPanelOpen(area, conflictIso){
    lastPanelArea = area;
    lastPanelIso = conflictIso;

    var slot = document.getElementById("caPanelAdminSlot");
    if (!slot) return;

    if (!isAdmin){
      slot.innerHTML = "";
      return;
    }

    var conflicts = getConflicts();
    var conflict = conflicts[conflictIso];
    if (!conflict || !conflict.parties) {
      slot.innerHTML = "";
      return;
    }

    var current = getBaseline(conflictIso, area.name, area.provinceName);
    var currentCtrl = current ? current.controller : "Onbekend";

    var partyNames = Object.keys(conflict.parties);
    var optionsHtml = partyNames.map(function(p){
      var sel = (p === currentCtrl) ? ' selected' : '';
      return '<option value="' + escapeAttr(p) + '"' + sel + '>' + escapeHtml(p) + '</option>';
    }).join("");

    slot.innerHTML =
      '<div style="padding:.75rem 1rem;border-top:1px solid rgba(224,168,87,.3);background:rgba(224,168,87,.05)">' +
        '<div style="font-weight:700;font-size:.75rem;margin-bottom:.4rem;color:#e0a857">🛠️ Admin — wijzig controller</div>' +
        '<select id="wdAdminSelect" style="width:100%;padding:.5rem;background:#1a2438;color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:6px;font-family:inherit;font-size:.85rem">' +
          optionsHtml +
        '</select>' +
        '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
          '<button id="wdAdminSave" style="flex:1;padding:.5rem;background:#e0a857;color:#070c16;border:0;border-radius:6px;font-weight:700;font-family:inherit;cursor:pointer">Opslaan</button>' +
          '<button id="wdAdminClose" style="padding:.5rem 1rem;background:transparent;color:#8a94a8;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-family:inherit;cursor:pointer">Annuleer</button>' +
        '</div>' +
      '</div>';

    document.getElementById("wdAdminSave").addEventListener("click", function(){
      var sel = document.getElementById("wdAdminSelect");
      var newController = sel ? sel.value : null;
      if (!newController) return;
      saveChange(conflictIso, area, newController);
    });

    document.getElementById("wdAdminClose").addEventListener("click", function(){
      var panel = document.getElementById("caAreaPanel");
      if (panel) panel.classList.remove("show");
    });
  }

  function saveChange(iso3, area, newController){
    var admin1 = area.name;
    var provName = area.provinceName;
    var baselineKey = provName || admin1;

    setBaseline(iso3, baselineKey, newController);
    LOG("Admin wijziging: " + iso3 + "|" + baselineKey + " → " + newController);

    /* Ververs kaartlaag */
    try {
      if (window.ConflictAreas && ConflictAreas.refreshLayer){
        ConflictAreas.refreshLayer(iso3);
      }
    } catch(e){}

    toast("✅ " + admin1 + " → " + newController);

    var panel = document.getElementById("caAreaPanel");
    if (panel) setTimeout(function(){ panel.classList.remove("show"); }, 400);
  }

  /* ════════════════════════════════════════════════════════════
     Export + reset
     ════════════════════════════════════════════════════════════ */
  function exportBaseline(){
    var lines = [];
    var baseline = window.WDBaseline && WDBaseline._all ? WDBaseline._all : {};
    for (var k in baseline){
      if (!Object.prototype.hasOwnProperty.call(baseline, k)) continue;
      var b = baseline[k];
      lines.push('    "' + k + '": { controller: "' + b.controller + '", since: "' + (b.since || "") + '", source: "' + (b.source || "") + '" },');
    }
    var text = "var BASELINE = {\n" + lines.join("\n") + "\n  };";

    /* Probeer te kopiëren naar klembord */
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        toast("📋 Baseline gekopieerd naar klembord");
      }).catch(function(){
        showExportModal(text);
      });
    } else {
      showExportModal(text);
    }
  }

  function showExportModal(text){
    var existing = document.getElementById("wdAdminExportModal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = "wdAdminExportModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;padding:1rem;display:flex;flex-direction:column";
    modal.innerHTML =
      '<div style="color:#e0a857;font-weight:700;margin-bottom:.5rem">📄 Baseline export (kopieer alles)</div>' +
      '<textarea readonly style="flex:1;background:#0a1320;color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:6px;padding:.5rem;font-family:monospace;font-size:.7rem;width:100%"></textarea>' +
      '<button style="margin-top:.5rem;padding:.75rem;background:#e0a857;color:#070c16;border:0;border-radius:6px;font-weight:700;font-family:inherit;cursor:pointer">Sluiten</button>';

    document.body.appendChild(modal);
    var ta = modal.querySelector("textarea");
    ta.value = text;
    ta.select();
    modal.querySelector("button").addEventListener("click", function(){ modal.remove(); });
  }

  function resetAdminChanges(){
    var cleared = 0;
    try {
      var keys = Object.keys(localStorage);
      keys.forEach(function(k){
        if (k.indexOf("baseline_") === 0){
          localStorage.removeItem(k);
          cleared++;
        }
      });
    } catch(e){}
    toast("♻️ " + cleared + " wijzigingen gewist — herlaad de pagina");
    LOG("Reset: " + cleared + " wijzigingen gewist");
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  /* ════════════════════════════════════════════════════════════
     Init
     ════════════════════════════════════════════════════════════ */
  function init(){
    /* Wacht tot menu-sheet in DOM staat */
    var tries = 0;
    function tryInject(){
      tries++;
      var sheet = document.getElementById("sheet");
      if (sheet && sheet.querySelector(".sheet-content")){
        injectMenuButton();
        LOG("admin.js v1.0 actief — toggle via menu");
        return;
      }
      if (tries < 40) setTimeout(tryInject, 250);
    }
    tryInject();
  }

  window.WDAdmin = {
    version: "v1.0",
    onPanelOpen: onPanelOpen,
    toggle: toggleAdmin,
    isAdmin: function(){ return isAdmin; }
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 200);
  }

})();