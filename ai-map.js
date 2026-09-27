/* ============================================================
   WAR DESK — ai-map.js v3.11
   - v3.11: prefix-match in findTargetByPosition (ukraine → ukrainian)
   - v3.10: actor/target onderscheid via positie
   - v3.9: context-filter + titel-only
   - v3.8: CityStatus integratie
   ============================================================ */

(function(){
  "use strict";

  var MAX_EVENTS = 800;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  var STRONG_CIVIEL_PATTERN = /\b(aardbeving|earthquake|overstroming|flood|tsunami|orkaan|hurricane|tyfoon|typhoon|cycloon|tornado|windhoos|wervelstorm|bosbrand|wildfire|woningbrand|flatbrand|keukenbrand|brand|verkeersongeval|verkeersongeluk|vliegramp|vliegtuigongeluk|plane.crash|treinramp|treinongeluk|treinontsporing|helikoptercrash|helicopter.crash|gaslek|gasontploffing|lawine|aardverschuiving|modderstroom|vulkaan|vulkaanuitbarsting|instorting|ingestort|evacuatie|geëvacueerd|natuurramp|natural.disaster|scheepsramp|ontploffing|explosie|explosion|blast|botsing|aanrijding|noodweer|noodstorm|hittegolf|droogte|stroomuitval|blackout|stroomstoring|wateroverlast|brandweer|hulpdiensten|vermiste|vermist)\b/i;

  var CONTEXT_AFTER = /^(war|oorlog|conflict|conflicts|crisis|deal|akkoord|agreement|sanctions|sancties|negotiations|onderhandelingen|talks|overleg|statement|verklaring|response|reactie|policy|beleid|trade|handel|economy|economie|threat|dreiging|warning|waarschuwing|live|update|updates|news|nieuws|situation|situatie|relations|betrekkingen|program|programma|nuclear|nucleair)\b/i;

  var POSITION_ACTION_PATTERNS = [
    /\b(struck|strikes|striking)\b/i,
    /\b(attacked|attacks|attacking)\b/i,
    /\b(bombed|bombing|bombardment|bombardments)\b/i,
    /\b(shelled|shelling)\b/i,
    /\b(fired|fires|launched|launches)\b/i,
    /\b(killed|kills|killing)\b/i,
    /\b(captured|seized|captures|overran)\b/i,
    /\b(invaded|invading|invasion)\b/i,
    /\b(shot down|shoots down|downed|intercepted)\b/i,
    /\b(exploded|explodes|explosion)\b/i,
    /\b(raakte|raakten|getroffen|treft)\b/i,
    /\b(aanviel|aanvielen|aanvalt)\b/i,
    /\b(bombardeerde|bombardeerden|gebombardeerd)\b/i,
    /\b(beschoot|beschoten|beschieting)\b/i,
    /\b(lanceerde|lanceerden|afgevuurd)\b/i,
    /\b(doodde|doodden|gedood)\b/i,
    /\b(veroverde|veroverden|ingenomen)\b/i,
    /\b(viel binnen|vielen binnen|binnengevallen)\b/i,
    /\b(neerschoot|neergeschoten|neergehaald|onderschept)\b/i,
    /\b(frappé|frappe|attaqué|attaques)\b/i,
    /\b(angegriffen|getroffen|bombardiert)\b/i,
    /قصف|غارة|هجوم|قتل|انفجار/
  ];

  var LOCATIONS = {
    "oekraïne":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "ukraine":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kyiv":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kiev":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kharkiv":{lat:49.99,lng:36.23,country:"Oekraïne",region:"Oost-Europa"},
    "odesa":{lat:46.48,lng:30.73,country:"Oekraïne",region:"Oost-Europa"},
    "donetsk":{lat:48.02,lng:37.80,country:"Oekraïne",region:"Oost-Europa"},
    "donbas":{lat:48.50,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "luhansk":{lat:48.57,lng:39.31,country:"Oekraïne",region:"Oost-Europa"},
    "cherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "kherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "zaporizhzhia":{lat:47.84,lng:35.14,country:"Oekraïne",region:"Oost-Europa"},
    "zaporozhye":{lat:47.84,lng:35.14,country:"Oekraïne",region:"Oost-Europa"},
    "marioepol":{lat:47.10,lng:37.55,country:"Oekraïne",region:"Oost-Europa"},
    "mariupol":{lat:47.10,lng:37.55,country:"Oekraïne",region:"Oost-Europa"},
    "bachmoet":{lat:48.60,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "bakhmut":{lat:48.60,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "avdiivka":{lat:48.13,lng:37.75,country:"Oekraïne",region:"Oost-Europa"},
    "kramatorsk":{lat:48.72,lng:37.56,country:"Oekraïne",region:"Oost-Europa"},
    "sloviansk":{lat:48.85,lng:37.62,country:"Oekraïne",region:"Oost-Europa"},
    "sumy":{lat:50.91,lng:34.80,country:"Oekraïne",region:"Oost-Europa"},
    "chernihiv":{lat:51.50,lng:31.29,country:"Oekraïne",region:"Oost-Europa"},
    "mykolaiv":{lat:46.97,lng:31.99,country:"Oekraïne",region:"Oost-Europa"},
    "dnipro":{lat:48.46,lng:35.05,country:"Oekraïne",region:"Oost-Europa"},
    "lviv":{lat:49.84,lng:24.03,country:"Oekraïne",region:"Oost-Europa"},

    "rusland":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "russia":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "moskou":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "moscow":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "belgorod":{lat:50.60,lng:36.59,country:"Rusland",region:"Oost-Europa"},
    "koersk":{lat:51.73,lng:36.19,country:"Rusland",region:"Oost-Europa"},
    "kursk":{lat:51.73,lng:36.19,country:"Rusland",region:"Oost-Europa"},
    "rostov":{lat:47.24,lng:39.71,country:"Rusland",region:"Oost-Europa"},
    "bryansk":{lat:53.25,lng:34.37,country:"Rusland",region:"Oost-Europa"},
    "saratov":{lat:51.53,lng:46.03,country:"Rusland",region:"Oost-Europa"},
    "voronezh":{lat:51.67,lng:39.21,country:"Rusland",region:"Oost-Europa"},
    "krim":{lat:45.35,lng:34.00,country:"Oekraïne",region:"Oost-Europa"},
    "crimea":{lat:45.35,lng:34.00,country:"Oekraïne",region:"Oost-Europa"},
    "sevastopol":{lat:44.62,lng:33.53,country:"Oekraïne",region:"Oost-Europa"},

    "israël":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "israel":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "tel aviv":{lat:32.08,lng:34.78,country:"Israël",region:"Midden-Oosten"},
    "jeruzalem":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "jerusalem":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "haifa":{lat:32.79,lng:34.99,country:"Israël",region:"Midden-Oosten"},
    "gaza":{lat:31.35,lng:34.31,country:"Gaza",region:"Midden-Oosten"},
    "rafah":{lat:31.29,lng:34.25,country:"Gaza",region:"Midden-Oosten"},
    "khan younis":{lat:31.35,lng:34.30,country:"Gaza",region:"Midden-Oosten"},
    "jabalia":{lat:31.53,lng:34.50,country:"Gaza",region:"Midden-Oosten"},
    "westelijke jordaanoever":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "west bank":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "ramallah":{lat:31.90,lng:35.20,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "jenin":{lat:32.46,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},

    "libanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "lebanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beiroet":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beirut":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "syrië":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "syria":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "damascus":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "aleppo":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},

    "iran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "teheran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "tehran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "isfahan":{lat:32.65,lng:51.67,country:"Iran",region:"Midden-Oosten"},
    "irak":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "iraq":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "bagdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "baghdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},

    "jemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "yemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "sanaa":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "aden":{lat:12.78,lng:45.03,country:"Jemen",region:"Midden-Oosten"},
    "saudi":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "riyadh":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "qatar":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "doha":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "koeweit":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "kuwait":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "dubai":{lat:25.20,lng:55.27,country:"VAE",region:"Midden-Oosten"},
    "abu dhabi":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},

    "sudan":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "khartoum":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "darfur":{lat:13.00,lng:25.00,country:"Sudan",region:"Afrika"},
    "mali":{lat:12.65,lng:-8.00,country:"Mali",region:"Sahel"},
    "bamako":{lat:12.65,lng:-8.00,country:"Mali",region:"Sahel"},
    "burkina faso":{lat:12.37,lng:-1.52,country:"Burkina Faso",region:"Sahel"},
    "niger":{lat:13.51,lng:2.11,country:"Niger",region:"Sahel"},
    "nigeria":{lat:9.06,lng:7.49,country:"Nigeria",region:"Afrika"},
    "somalia":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "somalië":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "mogadishu":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "ethiopië":{lat:9.02,lng:38.75,country:"Ethiopië",region:"Afrika"},
    "ethiopia":{lat:9.02,lng:38.75,country:"Ethiopië",region:"Afrika"},
    "tigray":{lat:13.50,lng:39.50,country:"Ethiopië",region:"Afrika"},
    "congo":{lat:-4.44,lng:15.27,country:"Congo",region:"Afrika"},
    "kinshasa":{lat:-4.44,lng:15.27,country:"Congo",region:"Afrika"},
    "goma":{lat:-1.68,lng:29.23,country:"Congo",region:"Afrika"},
    "mozambique":{lat:-25.97,lng:32.57,country:"Mozambique",region:"Afrika"},

    "afghanistan":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "kabul":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "pakistan":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "islamabad":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "karachi":{lat:24.86,lng:67.01,country:"Pakistan",region:"Azië"},
    "india":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "new delhi":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "kashmir":{lat:34.08,lng:74.80,country:"India",region:"Azië"},
    "china":{lat:39.90,lng:116.40,country:"China",region:"Azië"},
    "taiwan":{lat:25.03,lng:121.56,country:"Taiwan",region:"Azië"},
    "noord-korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "north korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "myanmar":{lat:19.75,lng:96.10,country:"Myanmar",region:"Azië"},

    "nederland":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "netherlands":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "amsterdam":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "rotterdam":{lat:51.92,lng:4.48,country:"Nederland",region:"West-Europa"},
    "den haag":{lat:52.08,lng:4.31,country:"Nederland",region:"West-Europa"},
    "utrecht":{lat:52.09,lng:5.12,country:"Nederland",region:"West-Europa"},
    "eindhoven":{lat:51.44,lng:5.47,country:"Nederland",region:"West-Europa"},
    "groningen":{lat:53.22,lng:6.57,country:"Nederland",region:"West-Europa"},
    "belgië":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "belgium":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "brussel":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "brussels":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "duitsland":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "germany":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "berlin":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "frankrijk":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "france":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "paris":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "parijs":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "verenigd koninkrijk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "uk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "london":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "londen":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "polen":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"},
    "poland":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"},
    "spanje":{lat:40.42,lng:-3.70,country:"Spanje",region:"West-Europa"},
    "spain":{lat:40.42,lng:-3.70,country:"Spanje",region:"West-Europa"},
    "italië":{lat:41.90,lng:12.50,country:"Italië",region:"West-Europa"},
    "italy":{lat:41.90,lng:12.50,country:"Italië",region:"West-Europa"},
    "zwitserland":{lat:46.95,lng:7.45,country:"Zwitserland",region:"West-Europa"},
    "oostenrijk":{lat:48.21,lng:16.37,country:"Oostenrijk",region:"West-Europa"},
    "zweden":{lat:59.33,lng:18.07,country:"Zweden",region:"West-Europa"},
    "noorwegen":{lat:59.91,lng:10.75,country:"Noorwegen",region:"West-Europa"},
    "denemarken":{lat:55.68,lng:12.57,country:"Denemarken",region:"West-Europa"},
    "finland":{lat:60.17,lng:24.94,country:"Finland",region:"West-Europa"},
    "ierland":{lat:53.35,lng:-6.26,country:"Ierland",region:"West-Europa"},
    "portugal":{lat:38.72,lng:-9.14,country:"Portugal",region:"West-Europa"},
    "griekenland":{lat:37.98,lng:23.73,country:"Griekenland",region:"West-Europa"},
    "athene":{lat:37.98,lng:23.73,country:"Griekenland",region:"West-Europa"},
    "marokko":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "morocco":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "rabat":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "casablanca":{lat:33.57,lng:-7.59,country:"Marokko",region:"Afrika"},
    "marrakech":{lat:31.63,lng:-7.99,country:"Marokko",region:"Afrika"},
    "vs":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "verenigde staten":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "usa":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "washington":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "new york":{lat:40.71,lng:-74.01,country:"VS",region:"Noord-Amerika"},
    "canada":{lat:45.42,lng:-75.70,country:"Canada",region:"Noord-Amerika"},
    "mexico":{lat:19.43,lng:-99.13,country:"Mexico",region:"Latijns-Amerika"},
    "brazil":{lat:-15.79,lng:-47.88,country:"Brazilië",region:"Latijns-Amerika"},
    "venezuela":{lat:10.48,lng:-66.90,country:"Venezuela",region:"Latijns-Amerika"},
    "colombia":{lat:4.71,lng:-74.07,country:"Colombia",region:"Latijns-Amerika"}
  };

  try { window.__wm_locations = LOCATIONS; } catch(e){}

  var REGION_LOCATIONS = {
    "Oost-Europa":   { lat: 49.0, lng: 32.0,  country: "Oost-Europa", region: "Oost-Europa" },
    "Midden-Oosten": { lat: 31.5, lng: 35.0,  country: "Midden-Oosten", region: "Midden-Oosten" },
    "West-Europa":   { lat: 50.5, lng: 5.0,   country: "West-Europa", region: "West-Europa" },
    "Afrika":        { lat: 5.0,  lng: 20.0,  country: "Afrika", region: "Afrika" },
    "Sahel":         { lat: 14.0, lng: 0.0,   country: "Sahel", region: "Sahel" },
    "Azië":          { lat: 30.0, lng: 80.0,  country: "Azië", region: "Azië" },
    "Noord-Amerika": { lat: 40.0, lng: -100.0, country: "Noord-Amerika", region: "Noord-Amerika" },
    "Latijns-Amerika":{ lat: 0.0, lng: -70.0,  country: "Latijns-Amerika", region: "Latijns-Amerika" }
  };

  var CAT_TO_REGION = {
    "nl": "West-Europa", "be": "West-Europa", "de": "West-Europa", "fr": "West-Europa",
    "uk": "West-Europa", "europe": "West-Europa", "it": "West-Europa",
    "ua": "Oost-Europa", "ukraine": "Oost-Europa", "war": "Oost-Europa",
    "ru": "Oost-Europa", "russia": "Oost-Europa",
    "il": "Midden-Oosten", "gaza": "Midden-Oosten", "mideast": "Midden-Oosten",
    "qa": "Midden-Oosten", "sa": "Midden-Oosten", "ae": "Midden-Oosten",
    "eg": "Midden-Oosten", "iran": "Midden-Oosten", "iraq": "Midden-Oosten",
    "yemen": "Midden-Oosten",
    "sudan": "Afrika", "maroc": "Afrika",
    "us": "Noord-Amerika", "vs": "Noord-Amerika", "world": "Azië"
  };

  function getBus(){
    return (window.WarDesk && window.WarDesk.events) ? window.WarDesk.events : null;
  }

  var AS = window.AIShared || null;

  var getTimestamp = AS ? AS.getTimestamp : function(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    var candidates = [];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (!v) continue;
      var t;
      if (typeof v === "number") { t = v < 100000000000 ? v * 1000 : v; }
      else { t = new Date(v).getTime(); }
      if (!isNaN(t) && t > 946684800000 && t < Date.now() + 86400000) candidates.push(t);
    }
    if (!candidates.length) return 0;
    candidates.sort(function(x, y){ return y - x; });
    return candidates[0];
  };

  function findFirstActionPosition(title){
    if (!title) return -1;
    var lower = String(title).toLowerCase();
    var firstPos = -1;
    for (var i = 0; i < POSITION_ACTION_PATTERNS.length; i++){
      var m = lower.match(POSITION_ACTION_PATTERNS[i]);
      if (m && typeof m.index === "number" && m.index >= 0){
        if (firstPos === -1 || m.index < firstPos) firstPos = m.index;
      }
    }
    return firstPos;
  }

  /* ============================================================
     v3.11: PREFIX-MATCH in findTargetByPosition
     ============================================================ */
  function findTargetByPosition(title, actorCountries){
    if (!title) return null;
    var actionPos = findFirstActionPosition(title);
    if (actionPos < 0) return null;

    var afterVerb = " " + title.slice(actionPos).toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";
    if (afterVerb.length < 3) return null;

    var best = null;
    var bestPos = -1;
    for (var key in LOCATIONS){
      if (!Object.prototype.hasOwnProperty.call(LOCATIONS, key)) continue;
      if (key.length < 4) continue;

      var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp("\\b" + escaped + "\\w*\\b", "i");
      var m = afterVerb.match(re);
      if (!m) continue;

      var idx = m.index;
      var loc = LOCATIONS[key];
      if (actorCountries && loc.country && actorCountries.indexOf(loc.country) !== -1) continue;
      if (bestPos === -1 || idx < bestPos){
        best = loc;
        bestPos = idx;
      }
    }
    return best;
  }

  function extractLocation(text, skipCountries){
    if (!text) return null;
    var skip = [];
    if (skipCountries){
      if (Array.isArray(skipCountries)) skip = skipCountries;
      else skip = [skipCountries];
    }
    var lower = " " + String(text).toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";
    var found = null, foundLen = 0;

    for (var key in LOCATIONS) {
      var pattern = " " + key + " ";
      var idx = lower.indexOf(pattern);
      if (idx !== -1) {
        var loc = LOCATIONS[key];
        if (loc.country && skip.indexOf(loc.country) !== -1) continue;
        var after = lower.slice(idx + pattern.length).trim();
        if (CONTEXT_AFTER.test(after)) continue;
        if (key.length > foundLen) { found = loc; foundLen = key.length; }
      }
    }
    return found;
  }

  function extractTargetLocation(title, actorCountries, skipCountries){
    var byPos = findTargetByPosition(title, actorCountries);
    if (byPos) return { loc: byPos, method: "position" };
    var byContext = extractLocation(title, skipCountries);
    if (byContext) return { loc: byContext, method: "context" };
    return { loc: null, method: "none" };
  }

  function extractRegionFallback(article, skipCountries){
    if (!article) return null;
    var skip = [];
    if (skipCountries){
      if (Array.isArray(skipCountries)) skip = skipCountries;
      else skip = [skipCountries];
    }
    var cat = (article.cat || "").toLowerCase();
    var tags = Array.isArray(article.tags) ? article.tags.map(function(t){ return String(t).toLowerCase(); }) : [];
    var all = [cat].concat(tags);
    for (var i = 0; i < all.length; i++) {
      var r = CAT_TO_REGION[all[i]];
      if (r && REGION_LOCATIONS[r]){
        var reg = REGION_LOCATIONS[r];
        if (reg.country && skip.indexOf(reg.country) !== -1) continue;
        return reg;
      }
    }
    return null;
  }

  function hashArticles(articles){
    var h = articles.length;
    for (var i = 0; i < Math.min(articles.length, 20); i++) {
      var id = String(articles[i].id || articles[i].link || articles[i].url || "");
      for (var j = 0; j < Math.min(id.length, 30); j++) {
        h = ((h << 5) - h) + id.charCodeAt(j);
        h |= 0;
      }
    }
    return String(h);
  }

  function classifyItem(article){
    if (window.WDClassifier && window.WDClassifier.classify) {
      try {
        var r = window.WDClassifier.classify(
          article.title || "",
          article.description || article.desc || article.summary || "",
          article.source || ""
        );
        return { category: r.category, subtype: r.subtype, confidence: r.confidence, uncertain: r.uncertain, scores: r.scores, meta: r.meta };
      } catch(e){}
    }
    return { category: "civiel", subtype: "Overig", confidence: 50, uncertain: true, scores: {}, meta: {} };
  }

  function getTranslatedTitleFor(article){
    try { if (window.NewsAPI && window.NewsAPI.getTranslatedTitle) return window.NewsAPI.getTranslatedTitle(article); } catch(e){}
    return null;
  }

  function getTranslatedDescFor(article){
    try { if (window.NewsAPI && window.NewsAPI.getTranslatedDesc) return window.NewsAPI.getTranslatedDesc(article); } catch(e){}
    return null;
  }

  function getISO3For(countryName){
    try { if (window.WorldMapData && window.WorldMapData.getISO3) return window.WorldMapData.getISO3(countryName); } catch(e){}
    return null;
  }

  function detectActorCountries(title, desc){
    var text = (title || "") + " " + (desc || "");
    try { if (window.WorldMapData && window.WorldMapData.detectActorsInTitle) return window.WorldMapData.detectActorsInTitle(text); } catch(e){}
    return [];
  }

  function detectPhysicalEvent(title, desc){
    try { if (window.WDEventDetector && window.WDEventDetector.analyze) return window.WDEventDetector.analyze(title, desc); } catch(e){}
    return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reason: "no-detector" };
  }

  function getSourceCountry(sourceName){
    try { if (window.WDEventDetector && window.WDEventDetector.getSourceCountry) return window.WDEventDetector.getSourceCountry(sourceName); } catch(e){}
    return null;
  }

  var lastHash = "";

  function buildEvents(){
    if (!window.State || !Array.isArray(window.State.items)) return [];
    var items = window.State.items;
    if (!items.length) return [];

    var hash = hashArticles(items);
    if (hash === lastHash) return null;
    lastHash = hash;

    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
    var events = [];
    var skippedOld = 0, skippedSport = 0, skippedWeakCiviel = 0;
    var skippedNoLocation = 0, skippedNonPhysical = 0, claimCount = 0;
    var positionHits = 0, contextHits = 0;

    for (var i = 0; i < items.length; i++) {
      var article = items[i];

      var ts = getTimestamp(article) || Date.now();
      if (Date.now() - ts > MAX_AGE_MS) { skippedOld++; continue; }

      var cls = classifyItem(article);
      if (cls.category === "sport") { skippedSport++; continue; }

      if (cls.category === "civiel") {
        var titleStr = String(article.title || "");
        if (!STRONG_CIVIEL_PATTERN.test(titleStr)) { skippedWeakCiviel++; continue; }
      }

      var actorCountries = detectActorCountries(article.title, article.description || article.desc);
      var detection = detectPhysicalEvent(article.title, article.description || article.desc);
      var sourceCountry = getSourceCountry(article.source);
      var skipForLoc = detection.isPhysicalEvent ? null : sourceCountry;

      var targetResult = extractTargetLocation(article.title || "", actorCountries, skipForLoc);
      var loc = targetResult.loc;
      if (targetResult.method === "position") positionHits++;
      else if (targetResult.method === "context") contextHits++;

      if (!loc) loc = extractRegionFallback(article, skipForLoc);
      if (!loc) { skippedNoLocation++; continue; }

      var countsForHeat = detection.isPhysicalEvent;
      if (!countsForHeat && (cls.category === "militair" || cls.category === "crime")) skippedNonPhysical++;

      var iso3 = getISO3For(loc.country);

      if (detection.isPhysicalEvent && window.CityStatus && window.WDEventDetector &&
          window.WDEventDetector.extractCityClaim){
        try {
          var claim = window.WDEventDetector.extractCityClaim(article.title, article.description || article.desc, actorCountries);
          if (claim && claim.city && claim.claimedBy){
            claimCount++;
            window.CityStatus.recordClaim(claim.city, claim.claimedBy, claim.claimedByISO3, article.source).catch(function(){});
          }
        } catch(e){}
      }

      var translatedTitle = getTranslatedTitleFor(article);
      var translatedDesc = getTranslatedDescFor(article);
      var finalTitle = translatedTitle || article.title || "Onbekend";
      var finalDesc = translatedDesc || article.description || article.desc || article.summary || "";
      var subtype = cls.subtype || "Overig";
      var eventId = "ev-" + i + "-" + cls.category + "-" + subtype;

      events.push({
        id: eventId, lat: loc.lat, lng: loc.lng,
        title: finalTitle,
        originalTitle: translatedTitle ? (article.title || "") : null,
        isTranslated: !!translatedTitle,
        description: finalDesc,
        fullDescription: loc.country + " · " + loc.region + "\n\n" + finalDesc + (translatedTitle ? "\n\nOrigineel: " + (article.title || "") : ""),
        category: cls.category, subtype: subtype, type: cls.category,
        confidence: cls.confidence || 50, uncertain: !!cls.uncertain,
        scores: cls.scores || {}, meta: cls.meta || {},
        country: loc.country, countryISO3: iso3,
        actorCountries: actorCountries, region: loc.region,
        date: new Date(ts).toISOString(),
        url: article.link || article.url || "",
        source: article.source || "",
        isMilitary: cls.category === "militair",
        countsForHeat: countsForHeat,
        actionTypes: detection.actionTypes || [],
        actionReason: detection.reason,
        locationMethod: targetResult.method
      });
    }

    var beforeDedup = events.length;
    var grouped = events;
    if (window.WDEventDedup && window.WDEventDedup.group) {
      try { grouped = window.WDEventDedup.group(events); } catch(e){ if (window.wdLog) wdLog.warn("[Map-AI] Dedup faalde:", e.message); }
    }

    grouped.sort(function(a, b){ return new Date(b.date).getTime() - new Date(a.date).getTime(); });
    if (grouped.length > MAX_EVENTS) grouped = grouped.slice(0, MAX_EVENTS);

    try {
      if (window.NewsAPI && window.NewsAPI.ensureTranslations) {
        var arItems = [];
        for (var k = 0; k < items.length; k++) {
          var it = items[k];
          if (it && (it.lang === "ar" || it.lang === "fr")) {
            arItems.push(it);
            if (arItems.length >= 30) break;
          }
        }
        if (arItems.length) window.NewsAPI.ensureTranslations(arItems);
      }
    } catch(e){}

    var elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - startTime;

    if (window.wdLog) {
      var counts = { militair:0, crime:0, politiek:0, protest:0, civiel:0 };
      grouped.forEach(function(e){ if(counts[e.category] !== undefined) counts[e.category]++; });
      wdLog.info("[Map-AI v3.11] " + grouped.length + " events (was " + beforeDedup + ", dedup -" + (beforeDedup - grouped.length) + ") | " +
        "MIL:" + counts.militair + " CRI:" + counts.crime +
        " POL:" + counts.politiek + " PRO:" + counts.protest +
        " CIV:" + counts.civiel +
        " | skip sport:" + skippedSport + " zwak-civiel:" + skippedWeakCiviel +
        " niet-fysiek:" + skippedNonPhysical + " claim:" + claimCount +
        " oud:" + skippedOld + " geen-loc:" + skippedNoLocation +
        " | loc-pos:" + positionHits + " loc-ctx:" + contextHits +
        " | " + Math.round(elapsed) + "ms");
    }

    return grouped;
  }

  function calculateHotspots(events){
    if (!events || !events.length) return [];
    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;
    var byCountry = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.category !== "militair") continue;
      if (e.countsForHeat === false) continue;
      var t = new Date(e.date).getTime();
      if (t < dayAgo) continue;
      var k = e.country || "Onbekend";
      if (!byCountry[k]) byCountry[k] = { country: k, region: e.region || "", count: 0, latSum: 0, lngSum: 0 };
      byCountry[k].count++;
      byCountry[k].latSum += e.lat;
      byCountry[k].lngSum += e.lng;
    }
    var out = [];
    for (var c in byCountry) {
      var item = byCountry[c];
      if (item.count >= 1) {
        out.push({ label: item.country, type: "country", count: item.count, lat: item.latSum / item.count, lng: item.lngSum / item.count, region: item.region });
      }
    }
    out.sort(function(a, b){ return b.count - a.count; });
    var seen = {}, result = [];
    for (var k = 0; k < out.length; k++) {
      if (seen[out[k].label]) continue;
      seen[out[k].label] = true;
      result.push(out[k]);
      if (result.length >= 5) break;
    }
    return result;
  }

  function run(){
    var events = buildEvents();
    if (events === null) return;
    if (!Array.isArray(events)) events = [];
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);
    var bus = getBus();
    if (!bus) return;
    bus.emit("map:military-events", events);
    bus.emit("map:hotspots", calculateHotspots(events));
  }

  function forceRun(){ lastHash = ""; run(); }

  function init(){
    var bus = getBus();
    if (!bus) { if (window.wdLog) wdLog.warn("[Map-AI] EventBus niet gevonden"); return; }
    bus.on("news:loaded", function(){
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){ run(); }, { timeout: 3000 });
    });
    bus.on("translation:added", function(){
      try { var mapTab = document.querySelector('.tab[data-view="map"]'); if (mapTab && mapTab.classList.contains("active")) forceRun(); } catch(e){}
    });
    bus.on("translation:toggle", function(){
      try { var mapTab = document.querySelector('.tab[data-view="map"]'); if (mapTab && mapTab.classList.contains("active")) forceRun(); } catch(e){}
    });
    setTimeout(function(){
      if (window.State && window.State.items && window.State.items.length) run();
    }, 2000);
    if (window.wdLog) wdLog.info("[WAR DESK] ai-map.js v3.11 geladen (prefix-match fix)");
  }

  function getCountries(){
    var out = {};
    for (var key in LOCATIONS) {
      var loc = LOCATIONS[key];
      if (loc && loc.country) out[key] = loc.country;
    }
    return out;
  }

  window.MapAI = {
    run: run, forceRun: forceRun,
    getEventsSync: function(){
      try { lastHash = ""; var ev = buildEvents(); return (Array.isArray(ev) && ev.length) ? ev : []; }
      catch(e){ return []; }
    },
    getCountries: getCountries,
    calculateHotspots: function(){
      if (!window.State || !window.State.items) return [];
      var ev = buildEvents() || [];
      return calculateHotspots(ev);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();