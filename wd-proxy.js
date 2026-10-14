/* ============================================================
   WAR DESK — wd-proxy.js v1.1
   - v1.1: publieke proxies verwijderd (security + reliability)
           Alleen eigen Cloudflare Workers
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.1";

  var PROXIES = [
    { url: "https://newsfeed2.hassanbadri814.workers.dev/?url=", name: "worker1" },
    { url: "https://nieuwsproxy.hassanbadri814.workers.dev/?url=", name: "worker2" }
  ];

  var DEFAULT_TIMEOUT = 25000;
  var PROXY_TIMEOUT = 50000;

  function logProxy(name, ok, err){
    try {
      if (ok) wdLog.info("[WD-Proxy] " + name + " OK");
      else wdLog.warn("[WD-Proxy] " + name + " faalde: " + (err && err.message ? err.message : "?"));
    } catch(e){}
  }

  function fetchWithTimeout(url, timeoutMs, options){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs);
    var opts = Object.assign({}, options || {}, { signal: ctrl.signal });

    return fetch(url, opts).then(function(res){
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res;
    }).catch(function(e){
      clearTimeout(timer);
      throw e;
    });
  }

  function fetchText(url, options){
    if (!url) return Promise.reject(new Error("Geen URL"));

    var idx = 0;
    function tryNext(){
      if (idx >= PROXIES.length){
        return Promise.reject(new Error("Alle proxies faalden voor " + url));
      }
      var proxy = PROXIES[idx++];
      var full = proxy.url + encodeURIComponent(url);

      return fetchWithTimeout(full, PROXY_TIMEOUT, options)
        .then(function(res){
          logProxy(proxy.name, true);
          return res.text();
        })
        .catch(function(e){
          logProxy(proxy.name, false, e);
          return tryNext();
        });
    }
    return tryNext();
  }

  function fetchJSON(url, options){
    return fetchText(url, options).then(function(text){
      var trimmed = String(text).replace(/^\uFEFF/, "").replace(/^\s+/, "");
      if (trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "["){
        throw new Error("Geen JSON response");
      }
      try { return JSON.parse(text); }
      catch(e){ throw new Error("JSON parse fout: " + e.message); }
    });
  }

  function fetchRaw(url, timeoutMs, options){
    return fetchWithTimeout(url, timeoutMs || DEFAULT_TIMEOUT, options)
      .then(function(res){ return res.text(); });
  }

  function fetchRawJSON(url, timeoutMs, options){
    return fetchRaw(url, timeoutMs, options).then(function(text){
      return JSON.parse(text);
    });
  }

  function setProxies(list){
    if (Array.isArray(list) && list.length) PROXIES = list;
  }

  function getProxies(){
    return PROXIES.slice();
  }

  window.WDProxy = {
    version: VERSION,
    fetchText: fetchText,
    fetchJSON: fetchJSON,
    fetchRaw: fetchRaw,
    fetchRawJSON: fetchRawJSON,
    setProxies: setProxies,
    getProxies: getProxies
  };

  try { wdLog.info("[WD-Proxy] " + VERSION + " geladen — " + PROXIES.length + " eigen workers"); } catch(e){}

})();