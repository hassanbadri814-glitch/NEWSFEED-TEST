/* ============================================================
   WAR DESK v2.0 — Reactive State Store + EventBus
   - FIX v2.0: State wijzigingen zenden nu events uit via WarDesk.events
   - Backwards compatible: window.State, appStore, subscribe() blijven werken
   - Nieuwe events: state:changed, state:<key> (bijv. state:items)
   ============================================================ */

(function(){
  "use strict";

  var createStore = function(initialState) {
    var listeners = {};

    // Probeer de EventBus te pakken (bestaat sinds utils.js v2.0)
    var bus = (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;

    var state = new Proxy(initialState, {
      set: function(target, key, value) {
        var prev = target[key];
        if (prev === value) return true;
        target[key] = value;

        // 1. Interne subscribers (bestaande functionaliteit)
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

        // 2. EventBus broadcast (nieuwe functionaliteit)
        if (bus) {
          try {
            // Specifiek event per key, bijv. 'state:items'
            bus.emit('state:' + String(key), { key: key, value: value, prev: prev });
            // Algemeen event
            bus.emit('state:changed', { key: key, value: value, prev: prev });
          } catch(e) {
            try{ wdLog.error("[Store] event emit error:", e); }catch(_){}
          }
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

  // Expose store ook via WarDesk namespace (voor toekomstig gebruik)
  if (window.WarDesk) {
    window.WarDesk.store = appStore;
  }

  wdLog.info("[WAR DESK] store.js v2.0 geladen — State events actief");

})();