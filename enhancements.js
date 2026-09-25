/* ============================================================
   WAR DESK enhancements.js v1.1
   - Notifications voor breaking news (robuuste binding)
   - Share-knop voor AI berichten
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[ENH]"].concat(Array.prototype.slice.call(arguments))); }catch(e){ console.log("[ENH]", arguments); } };
  LOG("v1.1 geladen");

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
    var on = getSavedEnabled() && isSupported() && Notification.permission === "granted";
    var row = document.getElementById("toggleNotificationsRow");
    if (row) row.classList.toggle("active", on);
    if (window.State) window.State.notificationsEnabled = on;
    LOG("UI update — on:", on, "perm:", isSupported() ? Notification.permission : "?");
  }

  async function setNotifications(enabled){
    LOG("setNotifications aangeroepen met:", enabled);

    if (!isSupported()){
      if (window.showToast) window.showToast("Notificaties niet ondersteund");
      return;
    }

    if (!enabled){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Breaking notificaties uit");
      return;
    }

    var perm = Notification.permission;
    LOG("Permissie voor request:", perm);

    if (perm === "default"){
      try {
        perm = await Notification.requestPermission();
        LOG("Permissie na request:", perm);
      } catch(e){
        LOG("Permissie request fout:", e.message);
        perm = "denied";
      }
    }

    if (perm !== "granted"){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Notificaties geweigerd — check browserinstellingen");
      return;
    }

    saveEnabled(true);
    updateToggleUI();
    if (window.showToast) window.showToast("Breaking notificaties aan");
    LOG("Notificaties aan — stuur test");

    try {
      new Notification("WAR DESK", {
        body: "Notificaties actief. Je krijgt een melding bij breaking news.",
        icon: "./icon.svg",
        badge: "./icon.svg",
        tag: "wardesk-test"
      });
    } catch(e){
      LOG("Test notif fout:", e.message);
    }
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
        tag: "wardesk-breaking"
      });
      n.onclick = function(){
        try { window.focus(); } catch(e){}
        n.close();
      };
      LOG("Breaking notif verzonden:", title.slice(0, 40));
    } catch(e){
      LOG("Breaking notif fout:", e.message);
    }
  }

  function watchBreakingBanner(){
    var titleEl = document.getElementById("breakingTitle");
    var metaEl  = document.getElementById("breakingMeta");
    if (!titleEl) return;

    lastNotifTitle = (titleEl.textContent || "").trim();

    var observer = new MutationObserver(function(mutations){
      for (var i = 0; i < mutations.length; i++){
        var m = mutations[i];
        if (m.type === "childList" || m.type === "characterData"){
          var txt = (titleEl.textContent || "").trim();
          if (txt && txt !== "—" && txt !== lastNotifTitle){
            var meta = metaEl ? (metaEl.textContent || "").trim() : "";
            showBreakingNotif(txt, meta);
            lastNotifTitle = txt;
          } else if (txt === "—" || !txt){
            lastNotifTitle = txt;
          }
        }
      }
    });

    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    LOG("Breaking watcher actief");
  }

  /* ===== ROBUUSTE TOGGLE BINDING ===== */

  function bindNotificationToggle(){
    var row = document.getElementById("toggleNotificationsRow");
    if (!row){
      LOG("toggleNotificationsRow NIET gevonden");
      return;
    }

    /* Verwijder inline onclick volledig */
    row.onclick = null;
    row.removeAttribute("onclick");

    /* Koppel eigen handler */
    row.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      LOG("Toggle geklikt");
      var current = getSavedEnabled();
      setNotifications(!current);
    }, true); // capture fase

    LOG("Toggle gebonden");
  }

  function injectTestButton(){
    var notifRow = document.getElementById("toggleNotificationsRow");
    if (!notifRow) return;
    if (document.getElementById("wdTestNotifBtn")) return;

    var btn = document.createElement("button");
    btn.id = "wdTestNotifBtn";
    btn.type = "button";
    btn.className = "sheet-item";
    btn.style.marginTop = ".4rem";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.textContent = "🔔 Test notificatie";
    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      LOG("Test knop geklikt");
      if (!isSupported()){
        if (window.showToast) window.showToast("Niet ondersteund");
        return;
      }
      if (Notification.permission !== "granted"){
        if (window.showToast) window.showToast("Zet eerst de toggle aan");
        LOG("Geen permissie:", Notification.permission);
        return;
      }
      try {
        new Notification("WAR DESK — Test", {
          body: "Zo ziet een breaking news melding eruit.",
          icon: "./icon.svg",
          badge: "./icon.svg",
          tag: "wardesk-test"
        });
        LOG("Test notif verzonden");
      } catch(err){
        LOG("Test notif fout:", err.message);
        if (window.showToast) window.showToast("Notif fout: " + err.message);
      }
    });

    notifRow.parentNode.insertBefore(btn, notifRow.nextSibling);
    LOG("Test knop geïnjecteerd");
  }

  /* ===== SHARE ===== */

  function injectShareButtons(){
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

      copyBtn.parentNode.insertBefore(btn, copyBtn.nextSibling);
    });
  }

  async function shareMessage(idx, btn){
    if (!window.AIAPI || !window.AIAPI.state) return;
    var msg = window.AIAPI.state.history[idx];
    if (!msg || !msg.text) return;

    var shareData = {
      title: "WAR DESK AI",
      text: msg.text.slice(0, 1200),
      url: location.origin + location.pathname
    };

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
      }
    }

    var text = shareData.text + "\n\n" + shareData.url;
    if (navigator.clipboard && navigator.clipboard.writeText){
      try {
        await navigator.clipboard.writeText(text);
        if (window.showToast) window.showToast("Gekopieerd — deel handmatig");
        return;
      } catch(e){}
    }
    if (window.showToast) window.showToast("Delen niet mogelijk");
  }

  function watchAIMessages(){
    var container = document.getElementById("aiMessages");
    if (!container) return;
    var observer = new MutationObserver(function(){ injectShareButtons(); });
    observer.observe(container, { childList: true, subtree: true });
    injectShareButtons();
  }

  /* ===== INIT ===== */

  function init(){
    LOG("init start");
    window.__setNotifications = setNotifications;
    bindNotificationToggle();
    injectTestButton();
    watchBreakingBanner();
    watchAIMessages();
    updateToggleUI();
    LOG("init klaar");
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(init, 1500);
    });
  } else {
    setTimeout(init, 1500);
  }

  wdLog.info("[WAR DESK] enhancements.js v1.1 geladen");
})();