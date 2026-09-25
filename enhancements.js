/* ============================================================
   WAR DESK enhancements.js v1.3
   - Notificaties 100% via ServiceWorkerRegistration (Android-proof)
   - GEEN new Notification() fallback (werkt niet op Android)
   - Share-knop voor AI berichten
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){ try{ wdLog.info.apply(null, ["[ENH]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.3 geladen");

  var NOTIF_KEY = "wardesk_notifications_enabled";
  var lastNotifTitle = "";

  function isSupported(){
    return typeof window.Notification !== "undefined" &&
           "serviceWorker" in navigator;
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

  /* v1.3: 100% via ServiceWorkerRegistration */
  async function sendNotification(title, options){
    if (!("serviceWorker" in navigator)){
      LOG("Geen serviceWorker — notificatie niet mogelijk");
      return { ok: false, error: "Geen Service Worker" };
    }

    try {
      var reg = await navigator.serviceWorker.ready;
      if (!reg){
        LOG("Geen SW registration");
        return { ok: false, error: "SW niet geregistreerd" };
      }
      if (typeof reg.showNotification !== "function"){
        LOG("reg.showNotification niet beschikbaar");
        return { ok: false, error: "showNotification niet beschikbaar" };
      }

      await reg.showNotification(title, options);
      LOG("Notif verzonden via SW:", title.slice(0, 40));
      return { ok: true };

    } catch(e){
      LOG("showNotification fout:", e.message);
      return { ok: false, error: e.message || "onbekend" };
    }
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

    if (perm === "denied"){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Meldingen geblokkeerd — reset in Chrome instellingen");
      return;
    }

    if (perm !== "granted"){
      saveEnabled(false);
      updateToggleUI();
      if (window.showToast) window.showToast("Notificaties niet toegestaan");
      return;
    }

    saveEnabled(true);
    updateToggleUI();
    if (window.showToast) window.showToast("Breaking notificaties aan");
    LOG("Notificaties aan — stuur test via SW");

    var result = await sendNotification("WAR DESK", {
      body: "Notificaties actief. Je krijgt een melding bij breaking news.",
      icon: "./icon.svg",
      badge: "./icon.svg",
      tag: "wardesk-test"
    });

    if (!result.ok){
      if (window.showToast) window.showToast("Test mislukt: " + result.error);
    }
  }

  async function showBreakingNotif(title, meta){
    if (!isSupported()) return;
    if (!getSavedEnabled()) return;
    if (Notification.permission !== "granted") return;
    if (!title || title === "—") return;
    if (title === lastNotifTitle) return;

    lastNotifTitle = title;

    await sendNotification("⚠️ Breaking: " + title.slice(0, 80), {
      body: meta || "Nieuwe breaking news op WAR DESK",
      icon: "./icon.svg",
      badge: "./icon.svg",
      tag: "wardesk-breaking",
      data: { url: location.href }
    });
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

  function bindNotificationToggle(){
    var row = document.getElementById("toggleNotificationsRow");
    if (!row){
      LOG("toggleNotificationsRow NIET gevonden");
      return;
    }
    row.onclick = null;
    row.removeAttribute("onclick");
    row.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      LOG("Toggle geklikt");
      var current = getSavedEnabled();
      setNotifications(!current);
    }, true);
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
    btn.addEventListener("click", async function(e){
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

      var result = await sendNotification("WAR DESK — Test", {
        body: "Zo ziet een breaking news melding eruit.",
        icon: "./icon.svg",
        badge: "./icon.svg",
        tag: "wardesk-test"
      });

      if (!result.ok){
        LOG("Test mislukt:", result.error);
        if (window.showToast) window.showToast("Fout: " + result.error);
      } else {
        if (window.showToast) window.showToast("Notificatie verzonden!");
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

  wdLog.info("[WAR DESK] enhancements.js v1.3 geladen");
})();