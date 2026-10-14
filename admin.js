/* ============================================================
   WAR DESK — admin.js v2.2
   - v2.2: FAB alleen zichtbaar als admin modus AAN staat
   - v2.1: Menu-toggle terug + floating FAB
   - v2.0: Eigen klik-handler op kaart
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[ADMIN]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var isAdmin = false;
  var modal = null;
  var fab = null;
  var mapClickBound = false;

  function toast(msg){
    try { if (window.showToast) window.showToast(msg); } catch(e){}
  }

  /* ════════════════════════════════════════════════════════════
     Punt-in-polygoon
     ════════════════════════════════════════════════════════════ */
  function pointInRing(x, y, ring){
    var inside = false, len = ring.length;
    for (var i = 0, j = len - 1; i < len; j = i++){
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInFeature(x, y, feature){
    var geom = feature.geometry;
    if (!geom) return false;

    if (geom.type === "Polygon"){
      var rings = geom.coordinates;
      if (!rings || !rings.length) return false;
      if (!pointInRing(x, y, rings[0])) return false;
      for (var h = 1; h < rings.length; h++){
        if (pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }
    if (geom.type === "MultiPolygon"){
      var polys = geom.coordinates;
      for (var p = 0; p < polys.length; p++){
        var r = polys[p];
        if (!r || !r.length) continue;
        if (!pointInRing(x, y, r[0])) continue;
        var inHole = false;
        for (var h2 = 1; h2 < r.length; h2++){
          if (pointInRing(x, y, r[h2])){ inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  function findProvinceAt(lat, lng){
    if (!window.ConflictAreas) return null;
    var state = ConflictAreas.state;
    var geojsons = state.geojsons || {};

    for (var iso in geojsons){
      if (!Object.prototype.hasOwnProperty.call(geojsons, iso)) continue;
      var gj = geojsons[iso];
      if (!gj || !gj.features) continue;

      for (var i = 0; i < gj.features.length; i++){
        var f = gj.features[i];
        if (!f || !f.geometry) continue;
        if (pointInFeature(lng, lat, f)){
          return { feature: f, iso3: iso };
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════
     Styles
     ════════════════════════════════════════════════════════════ */
  function injectStyles(){
    if (document.getElementById("wdAdminStyles")) return;
    var s = document.createElement("style");
    s.id = "wdAdminStyles";
    s.textContent =
      /* FAB: verborgen by default, alleen zichtbaar met .on */
      "#wdAdminFab{display:none!important;}" +
      "#wdAdminFab.on{display:grid!important;position:fixed;right:12px;bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:99998;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#e0a857,#f0c074);color:#070c16;border:1px solid #f0c074;font-size:20px;cursor:pointer;box-shadow:0 4px 20px rgba(224,168,87,.6),0 0 0 3px rgba(224,168,87,.3);transition:all .2s;font-family:inherit;place-items:center;padding:0;}" +
      "#wdAdminFab.on:hover{transform:scale(1.05);}" +
      "body.wd-admin-mode .leaflet-container .ca-pane-province path{cursor:crosshair!important;}" +
      "#wdAdminFabHint{position:fixed;right:64px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:99998;background:rgba(224,168,87,.95);color:#070c16;padding:.4rem .7rem;border-radius:6px;font-size:.72rem;font-weight:700;pointer-events:none;opacity:0;transition:opacity .3s;max-width:200px;line-height:1.3;box-shadow:0 4px 12px rgba(0,0,0,.4);}" +
      "#wdAdminFabHint.show{opacity:1;}" +
      "#wdAdminOverlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100000;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s;}" +
      "#wdAdminOverlay.show{opacity:1;visibility:visible;}" +
      "#wdAdminBox{background:#111b2d;border:1px solid rgba(224,168,87,.4);border-radius:14px;padding:1.2rem;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.8);}" +
      "#wdAdminBox h3{margin:0 0 1rem;color:#e0a857;font-family:'Playfair Display',serif;font-size:1.1rem;}" +
      "#wdAdminBox label{display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7a93;font-weight:700;margin-bottom:.3rem;}" +
      "#wdAdminBox .val{background:rgba(255,255,255,.04);padding:.5rem .7rem;border-radius:6px;color:#e6ebf5;font-size:.85rem;margin-bottom:.8rem;border:1px solid rgba(255,255,255,.08);}" +
      "#wdAdminBox select{width:100%;padding:.6rem;background:#0a1320;color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:6px;font-family:inherit;font-size:.9rem;margin-bottom:1rem;}" +
      "#wdAdminBox .row{display:flex;gap:.5rem;}" +
      "#wdAdminBox .row button{flex:1;padding:.7rem;border-radius:8px;font-family:inherit;font-weight:700;font-size:.85rem;cursor:pointer;border:0;}" +
      "#wdAdminBox .btn-save{background:linear-gradient(135deg,#e0a857,#f0c074);color:#070c16;}" +
      "#wdAdminBox .btn-cancel{background:rgba(255,255,255,.06);color:#8a94a8;border:1px solid rgba(255,255,255,.15);}" +
      ".wd-admin-menu-btn.active{background:linear-gradient(135deg,#e0a857,#f0c074)!important;color:#070c16!important;}";
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════
     FAB
     ════════════════════════════════════════════════════════════ */
  function injectFab(){
    if (fab) return fab;
    fab = document.createElement("button");
    fab.id = "wdAdminFab";
    fab.title = "Admin modus";
    fab.innerHTML = "🛠️";
    document.body.appendChild(fab);
    fab.addEventListener("click", function(e){
      e.stopPropagation();
      toggleAdmin();
    });
    return fab;
  }

  function showHint(text, duration){
    var hint = document.getElementById("wdAdminFabHint");
    if (!hint){
      hint = document.createElement("div");
      hint.id = "wdAdminFabHint";
      document.body.appendChild(hint);
    }
    hint.textContent = text;
    hint.classList.add("show");
    if (hint._timer) clearTimeout(hint._timer);
    hint._timer = setTimeout(function(){ hint.classList.remove("show"); }, duration || 3500);
  }

  /* ════════════════════════════════════════════════════════════
     Menu-toggle in sheet
     ════════════════════════════════════════════════════════════ */
  function injectMenuButton(){
    var sheetContent = document.querySelector("#sheet .sheet-content");
    if (!sheetContent) return false;
    if (sheetContent.querySelector("#wdAdminMenuToggle")) return true;

    var section = document.createElement("div");
    section.className = "sheet-section";
    section.innerHTML =
      '<div class="sheet-title">Beheer</div>' +
      '<div class="toggle-row" id="wdAdminMenuRow">' +
        '<span class="toggle-icon" style="font-size:1.1rem;display:grid;place-items:center">🛠️</span>' +
        '<span class="toggle-label">Admin modus</span>' +
        '<div class="toggle-switch" id="wdAdminMenuToggle"></div>' +
      '</div>' +
      '<div class="action-row" style="margin-top:.5rem">' +
        '<button class="sheet-item" id="wdAdminExportBtn">📄 Exporteer baseline</button>' +
        '<button class="sheet-item" id="wdAdminResetBtn">♻️ Reset wijzigingen</button>' +
      '</div>' +
      '<div id="wdAdminMenuStatus" style="font-size:.7rem;opacity:.6;padding:.4rem .25rem">Admin: uit</div>';

    var sections = sheetContent.querySelectorAll(".sheet-section");
    var lastSection = sections[sections.length - 1];
    if (lastSection && lastSection.querySelector(".sheet-about")){
      sheetContent.insertBefore(section, lastSection);
    } else {
      sheetContent.appendChild(section);
    }

    var row = document.getElementById("wdAdminMenuRow");

    row.addEventListener("click", function(){
      toggleAdmin();
    });

    document.getElementById("wdAdminExportBtn").addEventListener("click", function(e){
      e.stopPropagation();
      exportBaseline();
    });
    document.getElementById("wdAdminResetBtn").addEventListener("click", function(e){
      e.stopPropagation();
      if (!confirm("Alle handmatige wijzigingen wissen?")) return;
      resetChanges();
    });

    syncMenuUI();
    LOG("Menu-knop geïnjecteerd");
    return true;
  }

  function syncMenuUI(){
    var toggle = document.getElementById("wdAdminMenuToggle");
    var row = document.getElementById("wdAdminMenuRow");
    var status = document.getElementById("wdAdminMenuStatus");
    if (toggle) toggle.classList.toggle("active", isAdmin);
    if (row) row.classList.toggle("active", isAdmin);
    if (status) status.textContent = "Admin: " + (isAdmin ? "AAN" : "uit");
  }

  /* ════════════════════════════════════════════════════════════
     Toggle
     ════════════════════════════════════════════════════════════ */
  function toggleAdmin(){
    isAdmin = !isAdmin;

    document.body.classList.toggle("wd-admin-mode", isAdmin);
    if (fab) fab.classList.toggle("on", isAdmin);
    syncMenuUI();

    if (isAdmin){
      toast("🛠️ Admin AAN — klik op een provincie");
      showHint("Klik op een provincie om controller te wijzigen", 4000);
      bindMapClick();
    } else {
      toast("Admin UIT");
      closeModal();
    }

    LOG("Admin modus:", isAdmin ? "AAN" : "UIT");
  }

  /* ════════════════════════════════════════════════════════════
     Map click
     ════════════════════════════════════════════════════════════ */
  function bindMapClick(){
    if (mapClickBound) return;
    var mapInstance = window.MAPAPI && MAPAPI.state && MAPAPI.state.instance;
    if (!mapInstance){
      setTimeout(bindMapClick, 1000);
      return;
    }

    mapInstance.on("click", function(e){
      if (!isAdmin) return;
      var found = findProvinceAt(e.latlng.lat, e.latlng.lng);
      if (!found){
        LOG("Geen provincie op lat=" + e.latlng.lat.toFixed(4) + " lng=" + e.latlng.lng.toFixed(4));
        return;
      }
      openModal(found.feature, found.iso3);
    });

    mapClickBound = true;
    LOG("Map click handler gebonden");
  }

  /* ════════════════════════════════════════════════════════════
     Modal
     ════════════════════════════════════════════════════════════ */
  function ensureModal(){
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "wdAdminOverlay";
    modal.innerHTML = '<div id="wdAdminBox"></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function(e){
      if (e.target === modal) closeModal();
    });
    return modal;
  }

  function closeModal(){
    if (modal) modal.classList.remove("show");
  }

  function openModal(feature, iso3){
    var props = feature.properties;
    var conflicts = (window.ConflictAreas && ConflictAreas._conflicts) || {};
    var conflict = conflicts[iso3];

    if (!conflict || !conflict.parties){
      toast("Geen partijen bekend voor " + iso3);
      return;
    }

    var baseline = window.WDBaseline ? WDBaseline.get(iso3, props.name, props.provinceName) : null;
    var currentCtrl = baseline ? baseline.controller : "Onbekend";

    var partyNames = Object.keys(conflict.parties);
    var optionsHtml = partyNames.map(function(p){
      var sel = (p === currentCtrl) ? ' selected' : '';
      return '<option value="' + escAttr(p) + '"' + sel + '>' + escHtml(p) + '</option>';
    }).join("");

    var box = modal.querySelector("#wdAdminBox");
    box.innerHTML =
      '<h3>🛠️ Wijzig controller</h3>' +
      '<label>Provincie / district</label>' +
      '<div class="val">' + escHtml(props.name || "?") +
        (props.provinceName ? ' <span style="opacity:.5">· ' + escHtml(props.provinceName) + '</span>' : '') +
        ' <span style="opacity:.5">· ' + iso3 + '</span>' +
      '</div>' +
      '<label>Huidige controller</label>' +
      '<div class="val">' + escHtml(currentCtrl) + '</div>' +
      '<label>Nieuwe controller</label>' +
      '<select id="wdAdminSelect">' + optionsHtml + '</select>' +
      '<div class="row">' +
        '<button class="btn-cancel" id="wdAdminCancel">Annuleer</button>' +
        '<button class="btn-save" id="wdAdminSave">Opslaan</button>' +
      '</div>';

    modal.classList.add("show");

    document.getElementById("wdAdminCancel").addEventListener("click", closeModal);
    document.getElementById("wdAdminSave").addEventListener("click", function(){
      var sel = document.getElementById("wdAdminSelect");
      var newController = sel ? sel.value : null;
      if (!newController) return;
      saveChange(iso3, props, newController);
    });
  }

  function saveChange(iso3, props, newController){
    var baselineKey = props.name || props.provinceName;
    if (!baselineKey){ toast("Kan provincie niet identificeren"); return; }
    if (!window.WDBaseline || !WDBaseline.set){ toast("Baseline module niet geladen"); return; }

    WDBaseline.set(iso3, baselineKey, newController, null, "admin-UI");
    LOG("Admin wijziging: " + iso3 + "|" + baselineKey + " → " + newController);

    try {
      if (window.ConflictAreas && ConflictAreas.refreshLayer){
        ConflictAreas.refreshLayer(iso3);
      }
    } catch(e){}

    toast("✅ " + props.name + " → " + newController);
    closeModal();
  }

  /* ════════════════════════════════════════════════════════════
     Export / reset
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

    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        toast("📋 Baseline gekopieerd");
      }).catch(function(){ showExportModal(text); });
    } else {
      showExportModal(text);
    }
  }

  function showExportModal(text){
    var existing = document.getElementById("wdAdminExportModal");
    if (existing) existing.remove();
    var m = document.createElement("div");
    m.id = "wdAdminExportModal";
    m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;padding:1rem;display:flex;flex-direction:column;";
    m.innerHTML =
      '<div style="color:#e0a857;font-weight:700;margin-bottom:.5rem">📄 Baseline export — kopieer alles</div>' +
      '<textarea readonly style="flex:1;background:#0a1320;color:#e6ebf5;border:1px solid rgba(224,168,87,.4);border-radius:6px;padding:.5rem;font-family:monospace;font-size:.7rem;width:100%"></textarea>' +
      '<button style="margin-top:.5rem;padding:.75rem;background:#e0a857;color:#070c16;border:0;border-radius:6px;font-weight:700;font-family:inherit;cursor:pointer">Sluiten</button>';
    document.body.appendChild(m);
    var ta = m.querySelector("textarea");
    ta.value = text; ta.select();
    m.querySelector("button").addEventListener("click", function(){ m.remove(); });
  }

  function resetChanges(){
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
    toast("♻️ " + cleared + " wijzigingen gewist — herlaad");
  }

  function escHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function escAttr(s){ return escHtml(s).replace(/"/g, "&quot;"); }

  /* ════════════════════════════════════════════════════════════
     Init
     ════════════════════════════════════════════════════════════ */
  function init(){
    injectStyles();
    injectFab();
    ensureModal();

    var tries = 0;
    function tryMenu(){
      tries++;
      if (injectMenuButton()) return;
      if (tries < 40) setTimeout(tryMenu, 250);
    }
    tryMenu();

    var triesMap = 0;
    function tryBind(){
      triesMap++;
      var mapInstance = window.MAPAPI && MAPAPI.state && MAPAPI.state.instance;
      if (mapInstance){ bindMapClick(); return; }
      if (triesMap < 60) setTimeout(tryBind, 500);
    }
    tryBind();

    LOG("admin.js v2.2 actief — FAB alleen bij admin AAN");
  }

  window.WDAdmin = {
    version: "v2.2",
    toggle: toggleAdmin,
    isAdmin: function(){ return isAdmin; },
    openModal: openModal
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

})();