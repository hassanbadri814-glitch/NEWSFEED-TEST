/* ============================================================
   WAR DESK v2.0 — Gedeelde Utilities + EventBus
   - Behoudt bestaande WD.escapeHtml / getProxies / timeAgo
   - Nieuw: WarDesk namespace, EventBus, fetchJson, helpers
   - Geen breaking changes: alle bestaande calls blijven werken
   ============================================================ */

(function(){
  "use strict";

  var DEBUG = false;
  try{
    DEBUG = (typeof window.WD_DEBUG !== "undefined" && window.WD_DEBUG) ||
            (localStorage.getItem("wardesk_debug") === "1") ||
            /[?&]debug=1/.test(location.search);
  }catch(e){}

  /* ============================================================
     1. BESTAANDE UTILITIES (backwards compatible)
     ============================================================ */

  function escapeHtml(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function getProxies(){
    if(window.CONFIG && CONFIG.proxies && CONFIG.proxies.length){
      return CONFIG.proxies.slice();
    }
    return ["https://newsfeed2.hassanbadri814.workers.dev/?url="];
  }

  function timeAgo(d){
    var t = new Date(d).getTime();
    if(isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if(diff < 60) return "nu";
    if(diff < 3600) return Math.floor(diff / 60) + " min";
    if(diff < 86400) return Math.floor(diff / 3600) + " u";
    return Math.floor(diff / 86400) + " d";
  }

  /* ============================================================
     2. NIEUWE HELPERS
     ============================================================ */

  function debounce(fn, wait){
    var t = null;
    return function(){
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, wait || 250);
    };
  }

  function throttle(fn, wait){
    var last = 0;
    return function(){
      var now = Date.now();
      if(now - last >= (wait || 100)){
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  function haptic(ms){
    try{ if(navigator.vibrate) navigator.vibrate(ms || 10); }catch(e){}
  }

  function showToast(msg){
    // Gebruikt de bestaande DOM toast als die er is, anders fallback
    try{
      var t = document.getElementById("toast");
      if(!t) return;
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function(){ t.classList.remove("show"); }, 2200);
    }catch(e){}
  }

  /**
   * Universele fetch met JSON-respons.
   * - Probeert eerst een directe fetch (handig voor API's met CORS).
   * - Valt daarna terug op de geconfigureerde proxies.
   * - Retourneert altijd een Promise<JSON>.
   */
  function fetchJson(url, opts){
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || (window.CONFIG && CONFIG.fetchTimeoutMs) || 12000;
    var forceProxy = !!opts.forceProxy;

    function directFetch(){
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs);
      return fetch(url, { method: "GET", signal: ctrl.signal })
        .then(function(r){
          clearTimeout(timer);
          if(!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(function(e){
          clearTimeout(timer);
          throw e;
        });
    }

    function proxyFetch(){
      var proxies = getProxies();
      var lastErr = null;
      function tryProxy(idx){
        if(idx >= proxies.length) return Promise.reject(lastErr || new Error("Alle proxies faalden"));
        var proxy = proxies[idx];
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs + 3000);
        return fetch(proxy + encodeURIComponent(url), { method: "GET", signal: ctrl.signal })
          .then(function(r){
            clearTimeout(timer);
            if(!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
          })
          .catch(function(e){
            clearTimeout(timer);
            lastErr = e;
            if(DEBUG) console.warn("[WD.fetchJson] proxy " + (idx+1) + " faalde:", e.message);
            return tryProxy(idx + 1);
          });
      }
      return tryProxy(0);
    }

    if(forceProxy) return proxyFetch();
    return directFetch().catch(function(e){
      if(DEBUG) console.warn("[WD.fetchJson] direct faalde:", e.message, "- probeer proxy");
      return proxyFetch();
    });
  }

  /* ============================================================
     3. EVENTBUS
     ============================================================ */

  var EventBus = (function(){
    var listeners = Object.create(null);

    function on(event, fn){
      if(typeof event !== "string" || typeof fn !== "function") return function(){};
      if(!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return function off(){
        var arr = listeners[event];
        if(!arr) return;
        var i = arr.indexOf(fn);
        if(i >= 0) arr.splice(i, 1);
      };
    }

    function off(event, fn){
      var arr = listeners[event];
      if(!arr) return;
      if(!fn){ delete listeners[event]; return; }
      var i = arr.indexOf(fn);
      if(i >= 0) arr.splice(i, 1);
    }

    function once(event, fn){
      var unsub = on(event, function(){
        unsub();
        try{ fn.apply(null, arguments); }catch(e){}
      });
      return unsub;
    }

    function emit(event, payload){
      var arr = listeners[event];
      if(!arr || !arr.length) return;
      // Kopieer om mutaties tijdens emit te vermijden
      var snapshot = arr.slice();
      for(var i = 0; i < snapshot.length; i++){
        try{ snapshot[i](payload); }
        catch(e){
          if(DEBUG) console.error("[EventBus] listener error op '" + event + "':", e);
        }
      }
    }

    return { on: on, off: off, once: once, emit: emit,
             _listeners: listeners };
  })();

  /* ============================================================
     4. WAR DESK NAMESPACE (klaar voor volgende fasen)
     ============================================================ */

  window.WarDesk = window.WarDesk || {};
  window.WarDesk.events = EventBus;

  // Behoud bestaande WD namespace (backwards compatible)
  window.WD = window.WD || {};
  window.WD.escapeHtml = escapeHtml;
  window.WD.getProxies = getProxies;
  window.WD.timeAgo = timeAgo;
  window.WD.debounce = debounce;
  window.WD.throttle = throttle;
  window.WD.haptic = haptic;
  window.WD.showToast = showToast;
  window.WD.fetchJson = fetchJson;
  window.WD.version = "v2.0";

  if(DEBUG){
    try{ console.log("[WAR DESK] utils.js v2.0 geladen — EventBus + helpers actief"); }catch(e){}
  }
})();