/* ============================================================
   WAR DESK enhancements.js v1.0
   - Notifications voor breaking news
   - Share-knop voor AI berichten
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[ENH]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.0 geladen");

  /* ============================================================
     1. NOTIFICATIONS
     ============================================================ */

  var NOTIF_KEY = "wardesk_notifications_enabled";
  var lastNotifTitle = "";

  function isSupported(){
    return typeof window.Notification !== "undefined";
  }

  function getSavedEnabled(){
    try { return localStorage.getItem(NOTIF_KEY) === "1"; } catch(e){ return false; }
  }

  function saveEnabled(v){
    try { localStorage.setItem(NOTIF_KEY, v ? "1" : "0"); } catch(e){}
  }

  function updateToggleUI(){
    var on = getSavedEnabled() && (Notification.permission === "granted");
    var row = document.getElementById("toggleNotificationsRow");
    if (row) row.classList.toggle("active", on);
    if (window.State) State.notificationsEnabled = on;
  }

  async function setNotifications(enabled){
    if (!isSupported()){
      if (window.showToast) window.showToast("Notificaties niet ondersteund");
      return;
    }

    if (!enabled){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Breaking notificaties uit");
      LOG("Notificaties uit");
      return;
    }

    var perm = Notification.permission;
    if (perm === "default"){
      try { perm = await Notification.requestPermission(); }
      catch(e){ perm = "denied"; }
    }

    if (perm !== "granted"){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Notificaties geweigerd — check browserinstellingen");
      LOG("Permissie geweigerd");
      return;
    }

    saveEnabled(true);
    updateToggleUI();
    if (window.showToast) window.showToast("Breaking notificaties aan");
    LOG("Notificaties aan");

    /* Test notificatie */
    try {
      new Notification("WAR DESK", {
        body: "Notificaties zijn nu actief. Je krijgt een melding bij breaking news.",
        icon: "./icon.svg",
        badge: "./icon.svg",
        tag: "wardesk-test"
      });
    } catch(e){}
  }

  function showBreakingNotif(title, meta){
    if (!isSupported()) return;
    if (!getSavedEnabled()) return;
    if (Notification.permission !== "granted") return;
    if (!title || title === "—") return;
    if (title === lastNotifTitle) return;

    lastNotifTitle = title;

    try {
      var n = new Notification("⚠️ Breaking: " + title.slice(0, 80), {
        body: meta || "Nieuwe breaking news op WAR DESK",
        icon: "./icon.svg",
        badge: "./icon.svg",
        tag: "wardesk-breaking",
        requireInteraction: false,
        silent: false
      });
      n.onclick = function(){
        try { window.focus(); } catch(e){}
        n.close();
      };
      LOG("Breaking notif: " + title.slice(0, 40));
    } catch(e){
      LOG("Notif fout: " + e.message);
    }
  }

  function watchBreakingBanner(){
    var titleEl = document.getElementById("breakingTitle");
    var metaEl  = document.getElementById("breakingMeta");
    if (!titleEl) return;

    /* Initiele state onthouden zonder notif te sturen */
    lastNotifTitle = (titleEl.textContent || "").trim();

    var observer = new MutationObserver(function(mutations){
      for (var i = 0; i < mutations.length; i++){
        var m = mutations[i];
        if (m.type === "childList" || m.type === "characterData"){
          var txt = (titleEl.textContent || "").trim();
          if (txt && txt !== "—" && txt !== lastNotifTitle){
            var meta = metaEl ? (metaEl.textContent || "").trim() : "";
            showBreakingNotif(txt, meta);
          } else {
            lastNotifTitle = txt;
          }
        }
      }
    });

    observer.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true
    });
    LOG("Breaking banner watch actief");
  }

  function injectTestButton(){
    /* Voeg test-knop toe onder de notificatie-toggle in het menu */
    var notifRow = document.getElementById("toggleNotificationsRow");
    if (!notifRow) return;

    /* Voorkom dubbele injectie */
    if (document.getElementById("wdTestNotifBtn")) return;

    var btn = document.createElement("button");
    btn.id = "wdTestNotifBtn";
    btn.className = "sheet-item";
    btn.style.marginTop = ".4rem";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.textContent = "🔔 Test notificatie";
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      if (!isSupported()){
        if (window.showToast) window.showToast("Niet ondersteund");
        return;
      }
      if (Notification.permission !== "granted"){
        if (window.showToast) window.showToast("Zet eerst de toggle aan");
        return;
      }
      try {
        new Notification("WAR DESK — Test", {
          body: "Zo ziet een breaking news melding eruit.",
          icon: "./icon.svg",
          badge: "./icon.svg",
          tag: "wardesk-test"
        });
      } catch(err){}
    });

    notifRow.parentNode.insertBefore(btn, notifRow.nextSibling);
  }

  /* ============================================================
     2. SHARE-KNOP VOOR AI BERICHTEN
     ============================================================ */

  function injectShareButtons(){
    /* Loop door alle AI berichten en voeg share-knop toe als die er nog niet is */
    var actions = document.querySelectorAll(".ai-msg-actions");
    actions.forEach(function(row){
      if (row.querySelector('[data-action="share"]')) return;

      var copyBtn = row.querySelector('[data-action="copy"]');
      if (!copyBtn) return;

      var idx = copyBtn.getAttribute("data-idx");
      if (idx == null) return;

      var btn = document.createElement("button");
      btn.className = "ai-action-btn";
      btn.setAttribute("data-action", "share");
      btn.setAttribute("data-idx", idx);
      btn.setAttribute("title", "Delen");
      btn.textContent = "↗";

      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        shareMessage(parseInt(idx, 10), btn);
      });

      /* Plaats naast copy */
      copyBtn.parentNode.insertBefore(btn, copyBtn.nextSibling);
    });
  }

  async function shareMessage(idx, btn){
    if (!window.AIAPI || !window.AIAPI.state || !window.AIAPI.state.history) return;
    var msg = window.AIAPI.state.history[idx];
    if (!msg || !msg.text) return;

    var shareData = {
      title: "WAR DESK AI",
      text: msg.text.slice(0, 1200),
      url: location.origin + location.pathname
    };

    /* Web Share API — native share sheet */
    if (navigator.share){
      try {
        await navigator.share(shareData);
        LOG("Share gelukt");
        if (btn){
          var old = btn.textContent;
          btn.textContent = "✓";
          setTimeout(function(){ btn.textContent = old; }, 1200);
        }
        return;
      } catch(e){
        if (e.name === "AbortError") return;
        /* Val door naar fallback */
      }
    }

    /* Fallback: kopieer naar klembord */
    var text = shareData.text + "\n\n" + shareData.url;
    if (navigator.clipboard && navigator.clipboard.writeText){
      try {
        await navigator.clipboard.writeText(text);
        if (window.showToast) window.showToast("Gekopieerd — deel handmatig");
        return;
      } catch(e){}
    }

    /* Laatste fallback */
    if (window.showToast) window.showToast("Delen niet mogelijk");
  }

  /* Watch voor nieuwe AI berichten → injecteer share-knop */
  function watchAIMessages(){
    var container = document.getElementById("aiMessages");
    if (!container) return;

    var observer = new MutationObserver(function(){
      injectShareButtons();
    });
    observer.observe(container, { childList: true, subtree: true });
    injectShareButtons();
  }

  /* ============================================================
     3. INIT
     ============================================================ */

  function init(){
    /* Notifications */
    window.__setNotifications = setNotifications;
    updateToggleUI();
    watchBreakingBanner();
    injectTestButton();

    /* Share */
    watchAIMessages();

    LOG("Init klaar");
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(init, 800);
    });
  } else {
    setTimeout(init, 800);
  }

  wdLog.info("[WAR DESK] enhancements.js v1.0 geladen");
})();