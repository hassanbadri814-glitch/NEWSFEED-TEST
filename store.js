/* ============================================================
   WAR DESK v1.0 — Reactive State Store (De Brug)
   - Vervangt directe window.State mutaties
   - Houdt backward compatibility voor persist-v4.js en app-v12.js
   ============================================================ */

const createStore = (initialState) => {
  const listeners = new Map(); 
  
  const state = new Proxy(initialState, {
    set(target, key, value) {
      if (target[key] === value) return true;
      
      target[key] = value;
      
      // Trigger listeners voor deze specifieke key
      if (listeners.has(key)) {
        listeners.get(key).forEach(fn => fn(value));
      }
      // Trigger algemene 'change' listener
      if (listeners.has('*')) {
        listeners.get('*').forEach(fn => fn(key, value));
      }
      
      return true;
    }
  });

  return {
    state,
    subscribe: (key, fn) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
      return () => listeners.get(key).delete(fn); // Cleanup functie
    }
  };
};

// Initialiseer de store met exact dezelfde structuur als het oude window.State
export const appStore = createStore({
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

// DE BRUG: Exposeer voor legacy scripts zodat persist-v4.js etc. niet breken
window.State = appStore.state;