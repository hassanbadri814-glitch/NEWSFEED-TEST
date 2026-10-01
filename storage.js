/* ============================================================
   WAR DESK v1.2 — Centrale Storage Module
   - v1.2: 5 map-keys toegevoegd (map_filter_v3, worldmap_*)
           + verify() functie om alle keys te testen
           + audit() functie voor debugging
   - v1.1: eigen debug check (draait vóór config.js)
   ============================================================ */

window.WDStorage = (function(){
  "use strict";

  var KEYS = {
    /* Thema & weergave */
    theme:               "wardesk_theme",
    font_size:           "wardesk_font_size",
    accent_color:        "wardesk_accent_color",
    oled_mode:           "wardesk_oled_mode",
    theme_manual_until:  "wardesk_theme_manual_until",
    translate:           "wardesk_translate",
    notifications:       "wardesk_notifications",
    ui_state:            "wardesk_ui_state_v1",
    active_view:         "wardesk_active_view_v1",
    active_tab:          "wardesk_active_tab",
    debug:               "wardesk_debug",

    /* IPTV */
    iptv_volume:         "wardesk_iptv_volume",
    iptv_mute:           "wardesk_iptv_mute",
    iptv_view:           "wardesk_iptv_view",
    iptv_working:        "wardesk_iptv_working",

    /* Tags */
    tags_version:        "wardesk_tags_version",

    /* Map — legacy */
    map_filter:          "wardesk_map_filter",

    /* Map — v1.2 nieuw */
    map_filter_v3:       "wardesk_map_filter_v3",
    worldmap_period:     "wardesk_worldmap_period",
    worldmap_legend:     "wardesk_worldmap_legend",
    worldmap_enabled:    "wardesk_worldmap_enabled",
    worldmap_initialised:"wardesk_worldmap_initialised"
  };

  function get(key, fallback){
    try{
      var v = localStorage.getItem(KEYS[key] || key);
      return v === null ? (fallback !== undefined ? fallback : null) : v;
    }catch(e){ return fallback !== undefined ? fallback : null; }
  }
  function set(key, value){
    try{ localStorage.setItem(KEYS[key] || key, String(value)); return true; }
    catch(e){ return false; }
  }
  function remove(key){
    try{ localStorage.removeItem(KEYS[key] || key); return true; }
    catch(e){ return false; }
  }
  function getJSON(key, fallback){
    try{
      var v = localStorage.getItem(KEYS[key] || key);
      if(v === null) return fallback !== undefined ? fallback : null;
      return JSON.parse(v);
    }catch(e){ return fallback !== undefined ? fallback : null; }
  }
  function setJSON(key, value){
    try{ localStorage.setItem(KEYS[key] || key, JSON.stringify(value)); return true; }
    catch(e){ return false; }
  }
  function sget(key, fallback){
    try{
      var v = sessionStorage.getItem(KEYS[key] || key);
      return v === null ? (fallback !== undefined ? fallback : null) : v;
    }catch(e){ return fallback !== undefined ? fallback : null; }
  }
  function sset(key, value){
    try{ sessionStorage.setItem(KEYS[key] || key, String(value)); return true; }
    catch(e){ return false; }
  }
  function sremove(key){
    try{ sessionStorage.removeItem(KEYS[key] || key); return true; }
    catch(e){ return false; }
  }

  function clearAll(){
    try{
      Object.keys(KEYS).forEach(function(k){
        try{ localStorage.removeItem(KEYS[k]); }catch(e){}
        try{ sessionStorage.removeItem(KEYS[k]); }catch(e){}
      });
      return true;
    }catch(e){ return false; }
  }

  function dump(){
    var out = {};
    Object.keys(KEYS).forEach(function(k){
      try{
        var v = localStorage.getItem(KEYS[k]);
        if(v !== null) out[k] = v;
      }catch(e){}
    });
    return out;
  }

  /* ============================================================
     v1.2: VERIFY — test alle keys in KEYS
     Retourneert: { ok: [], fail: [], total: N }
     ============================================================ */
  function verify(){
    var ok = [];
    var fail = [];

    Object.keys(KEYS).forEach(function(k){
      var testKey = KEYS[k];
      var testValue = "__verify_" + Date.now() + "__";

      try{
        /* Test localStorage */
        localStorage.setItem(testKey, testValue);
        var readBack = localStorage.getItem(testKey);
        if(readBack === testValue){
          ok.push(k);
        } else {
          fail.push({ key: k, reason: "read-back mismatch" });
        }
        localStorage.removeItem(testKey);

        /* Test sessionStorage (alleen als active_tab of scroll) */
        if(k === "active_tab" || k.indexOf("scroll_") === 0){
          sessionStorage.setItem(testKey, testValue);
          var sReadBack = sessionStorage.getItem(testKey);
          if(sReadBack !== testValue){
            fail.push({ key: k + " (session)", reason: "session read-back mismatch" });
          }
          sessionStorage.removeItem(testKey);
        }
      } catch(e){
        fail.push({ key: k, reason: e.message || "unknown" });
      }
    });

    return {
      ok: ok,
      fail: fail,
      total: Object.keys(KEYS).length,
      okCount: ok.length,
      failCount: fail.length
    };
  }

  /* ============================================================
     v1.2: AUDIT — check welke keys in KEYS niet gebruikt worden
     EN welke keys in de app wel gebruikt worden
     (handmatige lijst uit codebase-inventarisatie)
     ============================================================ */
  var KNOWN_USAGE = {
    /* keys die overal gebruikt worden */
    used: [
      "theme", "font_size", "accent_color", "oled_mode", "theme_manual_until",
      "translate", "notifications", "ui_state", "active_tab",
      "iptv_volume", "iptv_mute", "iptv_view", "iptv_working",
      "tags_version",
      "map_filter_v3", "worldmap_period", "worldmap_legend", "worldmap_enabled"
    ],
    /* keys die in KEYS staan maar zelden gebruikt */
    legacy: [
      "active_view", "map_filter", "debug"
    ]
  };

  function audit(){
    var defined = Object.keys(KEYS);
    var used = KNOWN_USAGE.used;
    var legacy = KNOWN_USAGE.legacy;

    var missing = used.filter(function(k){ return defined.indexOf(k) === -1; });
    var orphan = defined.filter(function(k){
      return used.indexOf(k) === -1 && legacy.indexOf(k) === -1;
    });

    return {
      defined: defined.length,
      used: used.length,
      legacy: legacy.length,
      missing: missing,   // ← keys die gebruikt worden maar ontbreken (BUG!)
      orphan: orphan,     // ← keys die gedefinieerd zijn maar nergens gebruikt
      total: defined.length
    };
  }

  /* ============================================================
     v1.2: selfTest — roep in console: WDStorage.selfTest()
     ============================================================ */
  function selfTest(){
    console.log("═══════════════════════════════════════");
    console.log("WDStorage v1.2 — ZELFTEST");
    console.log("═══════════════════════════════════════");
    console.log("");

    var v = verify();
    console.log("📦 Storage verificatie:");
    console.log("   Totaal keys:  " + v.total);
    console.log("   Werkt:        " + v.okCount);
    console.log("   Faalt:        " + v.failCount);
    if(v.failCount > 0){
      console.log("   ❌ MISLUKT:");
      v.fail.forEach(function(f){ console.log("      - " + f.key + ": " + f.reason); });
    } else {
      console.log("   ✅ Alle keys werken correct");
    }

    console.log("");
    var a = audit();
    console.log("🔍 Usage audit:");
    console.log("   Gedefinieerd: " + a.defined);
    console.log("   In gebruik:   " + a.used);
    console.log("   Legacy:       " + a.legacy);
    console.log("");
    if(a.missing.length > 0){
      console.log("   ❌ ONTBREKEND (wordt gebruikt in code maar niet in KEYS):");
      a.missing.forEach(function(k){ console.log("      - " + k); });
    } else {
      console.log("   ✅ Geen ontbrekende keys");
    }
    if(a.orphan.length > 0){
      console.log("   ⚠️  Ongebruikt (in KEYS maar nooit in code):");
      a.orphan.forEach(function(k){ console.log("      - " + k); });
    }

    console.log("");
    console.log("═══════════════════════════════════════");

    return { verify: v, audit: a };
  }

  return {
    KEYS: KEYS,
    get: get,
    set: set,
    remove: remove,
    getJSON: getJSON,
    setJSON: setJSON,
    session: {
      get: sget,
      set: sset,
      remove: sremove
    },
    clearAll: clearAll,
    dump: dump,
    /* v1.2 nieuw */
    verify: verify,
    audit: audit,
    selfTest: selfTest
  };
})();

// FIX v1.1: eigen debug check — draait vóór config.js
(function(){
  var DEBUG = false;
  try{
    DEBUG = (localStorage.getItem("wardesk_debug") === "1") || /[?&]debug=1/.test(location.search);
  }catch(e){}
  if(DEBUG){
    try{
      console.log("[WAR DESK] storage.js v1.2 geladen — " + Object.keys(window.WDStorage.KEYS).length + " keys");
      console.log("[WAR DESK] Typ WDStorage.selfTest() in console voor volledige verificatie");
    }catch(e){}
  }
})();