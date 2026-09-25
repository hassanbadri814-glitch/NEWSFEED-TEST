/* ============================================================
   WAR DESK v2.1 — Reactive State Store + EventBus
   - FIX v2.0: State wijzigingen zenden events uit
   - FIX v2.1: Event batching (minder bus.emit calls)
   AI-orchestratie gebeurt in ai-ui.js (aparte module)
   ============================================================ */

(function(){
  "use strict";

  var createStore = function(initialState) {
    var listeners = {};
    var bus = (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;

    var pendingEvents = [];
    var batchScheduled = false;

    function flushEvents() {
      batchScheduled = false;
      var events = pendingEvents.slice();
      pendingEvents = [];
      if (!bus || !events.length) return;

      var byKey = {};
      var order = [];
      events.forEach(function(e) {
        if (!byKey[e.key]) {
          byKey[e.key] = { key: e.key, value: e.value, prev: e.prev };
          order.push(e.key);
        } else {
          byKey[e.key].value = e.value;
        }
      });

      order.forEach(function(k) {
        try { bus.emit('state:' + k, byKey[k]); } catch(e){}
      });

      try { bus.emit('state:changed', events[events.length - 1]); } catch(e){}
    }

    function scheduleFlush() {
      if (batchScheduled) return;
      batchScheduled = true;
      if (typeof queueMicrotask === "function") {
        queueMicrotask(flushEvents);
      } else {
        Promise.resolve().then(flushEvents);
      }
    }

    var state = new Proxy(initialState, {
      set: function(target, key, value) {
        var prev = target[key];
        if (prev === value) return true;
        target[key] = value;

        if (listeners[key]) {
          listeners[key].forEach(function(fn) {
            try { fn(value); }
            catch(e) { wdLog.error("[Store] listener error:", e); }
          });
        }
        if (listeners['*']) {
          listeners['*'].forEach(function(fn) {
            try { fn(key, value); }
            catch(e) { wdLog.error("[Store] listener error:", e); }
          });
        }

        if (bus) {
          pendingEvents.push({ key: key, value: value, prev: prev });
          scheduleFlush();
        }

        return true;
      }
    });

    return {
      state: state,
      subscribe: function(key, fn) {
        if (!listeners[key]) listeners[key] = [];
        listeners[key].push(fn);
        return function() {
          var idx = listeners[key].indexOf(fn);
          if (idx >= 0) listeners[key].splice(idx, 1);
        };
      }
    };
  };

  var appStore = createStore({
    items: [],
    currentCat: "all",
    currentSort: "importance",
    currentSearch: "",
    loadedSources: 0,
    totalSources: 0,
    failedSources: [],
    disabled: {},
    health: {},
    readMap: {},
    favorites: {},
    notificationsEnabled: false,
    lastActivity: Date.now(),
    isScrolling: false,
    scrollTimer: null,
    refreshTimer: null,
    viewMode: "cards",
    breakingShownAt: 0,
    lastBreakingItem: null,
    loadSession: 0,
    db: null,
    _lastRenderHash: "",
    translateEnabled: false,
    translations: {},
    translationPending: {}
  });

  window.appStore = appStore;
  window.State = appStore.state;

  if (window.WarDesk) {
    window.WarDesk.store = appStore;
  }

  wdLog.info("[WAR DESK] store.js v2.1 geladen — State events + batching actief");

})();