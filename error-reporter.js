/* ============================================================
   WAR DESK — error-reporter.js v1.0
   Lichtgewicht error tracking zonder externe dependency.
   - Vangt window.onerror + unhandledrejection + fetch-fouten
   - Bewaart laatste 50 errors in localStorage
   - Toont aantal in debug-menu
   - Kan optioneel naar een eigen endpoint sturen
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";
  var STORAGE_KEY = "wardesk_error_log";
  var MAX_ERRORS = 50;
  var REPORT_ENDPOINT = "";          /* Optioneel: je eigen Cloudflare Worker */
  var REPORT_THROTTLE_MS = 60000;    /* Max 1 rapport per minuut */

  var lastReportAt = 0;
  var sessionId = null;

  function generateSessionId(){
    try {
      return "s-" + Date.now().toString(36) + "-" +
             Math.random().toString(36).slice(2, 8);
    } catch(e){ return "s-unknown"; }
  }

  sessionId = generateSessionId();

  function getLog(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch(e){ return []; }
  }

  function saveLog(arr){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_ERRORS)));
    } catch(e){}
  }

  function getContext(){
    return {
      session: sessionId,
      url: location.href,
      ua: navigator.userAgent,
      lang: navigator.language,
      online: navigator.onLine,
      appVersion: window.APP_VERSION || "?",
      theme: document.documentElement.classList.contains("light") ? "light" : "dark",
      accent: document.documentElement.getAttribute("data-accent") || "goud",
      tab: (function(){
        var t = document.querySelector(".bottom-tabs .tab.active");
        return t ? t.dataset.view : "?";
      })(),
      ts: Date.now()
    };
  }

  function record(type, message, extra){
    var entry = {
      t: new Date().toISOString(),
      type: type,
      msg: String(message || "").slice(0, 500),
      ctx: getContext(),
      extra: extra || null
    };
    var log = getLog();
    log.push(entry);
    saveLog(log);

    /* Naar server als endpoint is ingesteld en throttle is OK */
    if (REPORT_ENDPOINT){
      var now = Date.now();
      if (now - lastReportAt > REPORT_THROTTLE_MS){
        lastReportAt = now;
        try {
          fetch(REPORT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
            keepalive: true
          }).catch(function(){});
        } catch(e){}
      }
    }

    /* Ook naar wdLog als die bestaat */
    try {
      if (window.wdLog && window.wdLog.warn){
        window.wdLog.warn("[ERROR-REPORTER]", type, entry.msg);
      }
    } catch(e){}
  }

  function installHandlers(){
    if (window._wdErrorReporterInstalled) return;
    window._wdErrorReporterInstalled = true;

    window.addEventListener("error", function(e){
      var msg = (e.error && e.error.message) || e.message || "onbekende error";
      var stack = (e.error && e.error.stack) ? String(e.error.stack).slice(0, 400) : "";
      var src = e.filename ? (e.filename.split("/").pop() + ":" + e.lineno) : "";
      record("error", msg, { stack: stack, src: src });
    });

    window.addEventListener("unhandledrejection", function(e){
      var r = e.reason;
      var msg = (r && r.message) ? r.message : String(r || "onbekende promise-rejection");
      var stack = (r && r.stack) ? String(r.stack).slice(0, 400) : "";
      record("promise", msg, { stack: stack });
    });

    /* Fetch-fouten (alleen eigen domeinen en de worker) */
    var origFetch = window.fetch;
    if (origFetch && !origFetch._wdWrapped){
      var wrapped = function(){
        var args = arguments;
        return origFetch.apply(window, args).catch(function(err){
          try {
            var url = "";
            if (args[0] && typeof args[0] === "string") url = args[0];
            else if (args[0] && args[0].url) url = args[0].url;
            /* Alleen melden voor eigen infrastructuur */
            if (url.indexOf("hassanbadri814.workers.dev") !== -1 ||
                url.indexOf(location.origin) === 0){
              record("fetch", "Fetch faalde: " + url + " — " + (err.message || "?"), {
                url: url
              });
            }
          } catch(e){}
          throw err;
        });
      };
      wrapped._wdWrapped = true;
      window.fetch = wrapped;
    }
  }

  function getStats(){
    var log = getLog();
    var byType = {};
    log.forEach(function(e){
      var t = e.type || "?";
      byType[t] = (byType[t] || 0) + 1;
    });
    return {
      total: log.length,
      byType: byType,
      first: log.length ? log[0].t : null,
      last: log.length ? log[log.length - 1].t : null
    };
  }

  function clear(){
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
  }

  function dump(){
    return getLog();
  }

  function setEndpoint(url){
    REPORT_ENDPOINT = String(url || "");
  }

  function getSessionId(){
    return sessionId;
  }

  /* Install direct — nog voor DOMContentLoaded */
  installHandlers();

  window.WDErrorReporter = {
    version: VERSION,
    record: record,
    getStats: getStats,
    getLog: getLog,
    dump: dump,
    clear: clear,
    setEndpoint: setEndpoint,
    getSessionId: getSessionId
  };

  try {
    if (window.wdLog && window.wdLog.info){
      window.wdLog.info("[ErrorReporter] " + VERSION + " actief — session " + sessionId);
    }
  } catch(e){}

})();