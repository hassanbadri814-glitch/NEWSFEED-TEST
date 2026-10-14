/* ============================================================
   WAR DESK — wd-utils.js v1.0
   Centrale utilities: versie, escaping, safe catches.
   Laadt vroeg — alle andere modules kunnen hierop bouwen.
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";

  function getVersion(){
    return window.APP_VERSION || "unknown";
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function escapeAttr(s){
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  /* Geeft een catch-handler terug die logt en null retourneert */
  function safeCatch(context){
    return function(err){
      var msg = err && err.message ? err.message : String(err || "onbekend");
      try { wdLog.warn("[" + context + "]", msg); } catch(e){}
      return null;
    };
  }

  /* Wrap een promise zodat fouten worden gelogd */
  function safePromise(promise, context){
    if (!promise || !promise.catch) return promise;
    return promise.catch(safeCatch(context));
  }

  /* Gestandaardiseerde toast (met fallback) */
  function toast(msg){
    try {
      if (window.showToast) window.showToast(msg);
    } catch(e){}
  }

  /* Formatteer tijd kort */
  function timeAgo(date){
    var t = new Date(date).getTime();
    if (isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if (diff < 60) return "nu";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "u";
    return Math.floor(diff / 86400) + "d";
  }

  window.WD = window.WD || {};
  WD.version = getVersion;
  WD.escapeHtml = escapeHtml;
  WD.escapeAttr = escapeAttr;
  WD.safeCatch = safeCatch;
  WD.safePromise = safePromise;
  WD.toast = toast;
  WD.timeAgo = timeAgo;
  WD._v = VERSION;

  try { wdLog.info("[WD-Utils] " + VERSION + " geladen (app " + getVersion() + ")"); } catch(e){}

})();