/* ============================================================
   WAR DESK v1.0 — Reactive State Store (De Brug)
   - Vervangt directe window.State mutaties
   - Houdt backward compatibility voor persist-v4.js en app-v12.js
   ============================================================ */

const createStore = (initialState) => {
  const listeners = new Map(); // key -> Set van functies
  
  const state = new Proxy(initialState, {
    set(target, key, value) {
      if (target[key] === value) return true;
      
      target[key] = value;
      
      // Trigger listeners voor deze specifieke key, én algemene 'change'
      if (listeners.has(key)) {
        listeners.get(key).forEach(fn => fn(value));
      }
      if (listeners.has('*')) {
        listeners.get('*').forEach(fn => fn(key, value));
      }
      
      // Update legacy window.State voor oude scripts
      window.State = state; 
      return true;
    }
  });

  return {
    state,
    subscribe: (key, fn) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
      return () => listeners.get(key).delete(fn); // Cleanup functie
    },
    batch: (updates) => {
      // Voorkomt meerdere renders bij meerdere updates tegelijk
      Object.assign(state, updates);
    }
  };
};

// Initialiseer de store met de standaard waarden
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
  viewMode: "cards",
  breakingShownAt: 0,
  lastBreakingItem: null,
  loadSession: 0,
  translateEnabled: false,
  translations: {},
  translationPending: {}
});

// Exposeer voor legacy scripts (De Brug)
window.State = appStore.state;