/* ============================================================
   WAR DESK — ai-map.js v2.0
   - v2.0: VEEL meer events
     * Region-fallback (cat → regio) als geen stad gevonden
     * MIN_CONFIDENCE van 4 → 2
     * MilScore drempel van 2 → 1 (met locatie)
     * Subtype optioneel als OSINT/region-match
     * MAX_EVENTS van 150 → 400
     * Extra steden + regio-mappings
   ============================================================ */

(function(){
  "use strict";

  var MAX_EVENTS = 400;
  var MIN_CONFIDENCE = 2;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  var MILITARY_KEYWORDS = {
    "raketaanval":1, "raket":1, "raketten":1, "drone":1, "drones":1, "bomaanslag":1,
    "bom":1, "bommen":1, "explosie":1, "ontploffing":1, "luchtaanval":1,
    "beschieting":1, "granaat":1, "granaten":1, "mortier":1, "artillerie":1,
    "aanval":1, "aanvallen":1, "offensief":1, "invasie":1, "opmars":1,
    "tegenoffensief":1, "operatie":1, "luchtafweer":1, "interceptie":1,
    "onderschept":1, "onderscheppen":1, "verdediging":1, "terugtrekking":1,
    "frontlinie":1, "veroverd":1, "heroverd":1, "bezet":1, "troepen":1,
    "militaire":1, "leger":1, "strijdkrachten":1, "gevechten":1, "gevecht":1,
    "oorlog":1, "conflict":1, "slachtoffers":1, "gedood":1, "gewonden":1,
    "vuurgevecht":1, "schietpartij":1, "zelfmoordaanslag":1, "aanslag":1,
    "missile":1, "missiles":1, "rocket":1, "rockets":1, "airstrike":1,
    "airstrikes":1, "bombing":1, "bomb":1, "bombs":1, "explosion":1,
    "shelling":1, "artillery":1, "attack":1, "attacks":1, "offensive":1,
    "invasion":1, "advance":1, "counteroffensive":1, "operation":1,
    "defense":1, "defence":1, "intercept":1, "intercepted":1, "withdrawal":1,
    "frontline":1, "captured":1, "recaptured":1, "occupied":1, "troops":1,
    "military":1, "army":1, "forces":1, "fighting":1, "war":1, "conflict":1,
    "casualties":1, "killed":1, "wounded":1, "gunfire":1, "shooting":1,
    "suicide":1, "repelled":1, "repel":1,

    /* OSINT-specifiek */
    "uav":2, "uas":2, "fvp":2, "fpv":2, "loitering":2, "munition":2,
    "shahed":3, "kalibr":3, "iskander":3, "kinzhal":3, "kh-101":3, "kh-555":3,
    "himars":2, "atacms":2, "storm shadow":2, "scalp":2, "patriot":2,
    "s-300":2, "s-400":2, "s-500":2, "sam":1, "mlrs":2, "spg":2, "bmp":2,
    "btr":2, "t-72":2, "t-90":2, "t-64":2, "abrams":2, "leopard":2, "challenger":2,
    "su-34":2, "su-35":2, "su-57":2, "mig-29":2, "mig-31":2, "f-16":2, "f-35":2,
    "ka-52":2, "mi-24":2, "mi-28":2, "tu-95":2, "tu-160":2, "tu-22":2,
    "intercepted":2, "downed":2, "shot down":2, "shotdown":2,
    "detected":1, "identified":1, "spotted":1, "observed":1, "tracked":1,
    "confirmed":1, "unconfirmed":1, "verified":1, "geolocated":2, "geolocation":2,
    "footage":1, "video shows":1, "photos show":1, "imagery":1,
    "coordinates":2, "lat":1, "lon":1,
    "reconnaissance":2, "recon":1, "surveillance":1,
    "artillery strike":2, "artillery shelling":2, "artillery fire":1,
    "air defense":2, "airdefense":2, "electronic warfare":2, "ew":1,
    "strike":1, "strikes":1, "struck":1, "hit":1, "hits":1,
    "advancing":1, "advanced":1, "assault":2, "assaults":2,
    "encirclement":2, "encircled":2, "pocket":1,
    "airbase":2, "air base":2, "airfield":2, "refinery":1,
    "depot":1, "ammunition depot":2, "warehouse":1,
    "warship":2, "frigate":2, "destroyer":2, "submarine":2,
    "tanker":1, "convoy":1, "column":1, "vehicle":1,
    "brigade":2, "battalion":2, "regiment":2, "division":1,
    "general":1, "colonel":1, "commander":1, "officer":1,
    "soldier":1, "soldiers":1, "servicemen":1, "personnel":1
  };

  var ACTION_KEYWORDS = {
    "op":1, "in":1, "tegen":1, "bij":1, "naar":1, "vanuit":1, "rond":1,
    "raakt":1, "raakten":1, "treft":1, "troffen":1, "valt":1, "vallen":1,
    "bestookt":1, "bestoken":1, "beschiet":1, "beschoten":1, "bombardeert":1,
    "gebombardeerd":1, "lanceert":1, "gelanceerd":1, "start":1, "startte":1,
    "begon":1, "begonnen":1, "doodt":1, "doodden":1, "verwoest":1,
    "on":1, "at":1, "against":1, "near":1, "from":1,
    "hit":1, "hits":1, "strikes":1, "struck":1, "strike":1, "launched":1,
    "launches":1, "killed":1, "destroys":1, "destroyed":1, "began":1
  };

  var LOCATIONS = {
    /* OEKRAÏNE */
    "oekraïne":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "ukraine":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kyiv":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kiev":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kharkiv":{lat:49.99,lng:36.23,country:"Oekraïne",region:"Oost-Europa"},
    "odesa":{lat:46.48,lng:30.73,country:"Oekraïne",region:"Oost-Europa"},
    "odessa":{lat:46.48,lng:30.73,country:"Oekraïne",region:"Oost-Europa"},
    "donetsk":{lat:48.02,lng:37.80,country:"Oekraïne",region:"Oost-Europa"},
    "donbas":{lat:48.50,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "luhansk":{lat:48.57,lng:39.31,country:"Oekraïne",region:"Oost-Europa"},
    "cherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "kherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "zaporizhzhia":{lat:47.84,lng:35.14,country:"Oekraïne",region:"Oost-Europa"},
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

    /* RUSLAND */
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
    "krim":{lat:45.35,lng:34.00,country:"Krim",region:"Oost-Europa"},
    "crimea":{lat:45.35,lng:34.00,country:"Krim",region:"Oost-Europa"},
    "sevastopol":{lat:44.62,lng:33.53,country:"Krim",region:"Oost-Europa"},

    /* ISRAËL / PALESTINA */
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

    /* LIBANON / SYRIË */
    "libanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "lebanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beiroet":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beirut":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "syrië":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "syria":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "damascus":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "aleppo":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},

    /* IRAN / IRAK */
    "iran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "teheran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "tehran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "isfahan":{lat:32.65,lng:51.67,country:"Iran",region:"Midden-Oosten"},
    "irak":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "iraq":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "bagdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "baghdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},

    /* JEMEN / SAUDI */
    "jemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "yemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "sanaa":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "aden":{lat:12.78,lng:45.03,country:"Jemen",region:"Midden-Oosten"},
    "houthi":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "houthis":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "saudi":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "riyadh":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "qatar":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "doha":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "koeweit":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "kuwait":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "dubai":{lat:25.20,lng:55.27,country:"VAE",region:"Midden-Oosten"},
    "abu dhabi":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},

    /* AFRIKA */
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

    /* AZIË */
    "afghanistan":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "kabul":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "pakistan":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "islamabad":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "karachi":{lat:24.86,lng:67.01,country:"Pakistan",region:"Azië"},
    "india":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "new delhi":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "kashmir":{lat:34.08,lng:74.80,country:"Kashmir",region:"Azië"},
    "china":{lat:39.90,lng:116.40,country:"China",region:"Azië"},
    "taiwan":{lat:25.03,lng:121.56,country:"Taiwan",region:"Azië"},
    "noord-korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "north korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "myanmar":{lat:19.75,lng:96.10,country:"Myanmar",region:"Azië"},

    /* EUROPA */
    "nederland":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "netherlands":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "belgië":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "belgium":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "duitsland":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "germany":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "frankrijk":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "france":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "verenigd koninkrijk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "uk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "london":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "polen":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"},
    "poland":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"}
  };

  /* ============================================================
     v2.0: REGIO-FALLBACK
     Als een artikel geen specifieke stad noemt, kijk dan naar de
     "cat" / "tags" van het artikel en gebruik een regio-punt.
     ============================================================ */
  var REGION_LOCATIONS = {
    "Oost-Europa":       { lat: 49.0, lng: 32.0, country: "Oost-Europa", region: "Oost-Europa" },
    "Midden-Oosten":     { lat: 31.5, lng: 35.0, country: "Midden-Oosten", region: "Midden-Oosten" },
    "West-Europa":       { lat: 50.5, lng: 5.0,  country: "West-Europa", region: "West-Europa" },
    "Afrika":            { lat: 5.0,  lng: 20.0, country: "Afrika", region: "Afrika" },
    "Sahel":             { lat: 14.0, lng: 0.0,  country: "Sahel", region: "Sahel" },
    "Azië":              { lat: 30.0, lng: 80.0, country: "Azië", region: "Azië" },
    "Noord-Amerika":     { lat: 40.0, lng: -100.0, country: "Noord-Amerika", region: "Noord-Amerika" },
    "Latijns-Amerika":   { lat: 0.0,  lng: -70.0, country: "Latijns-Amerika", region: "Latijns-Amerika" }
  };

  /* cat → regio mapping (voor artikelen zonder specifieke stad) */
  var CAT_TO_REGION = {
    "nl": "West-Europa", "be": "West-Europa", "de": "West-Europa", "fr": "West-Europa",
    "uk": "West-Europa", "europe": "West-Europa",
    "ua": "Oost-Europa", "ukraine": "Oost-Europa", "war": "Oost-Europa",
    "ru": "Oost-Europa", "russia": "Oost-Europa",
    "il": "Midden-Oosten", "gaza": "Midden-Oosten", "mideast": "Midden-Oosten",
    "qa": "Midden-Oosten", "sa": "Midden-Oosten", "ae": "Midden-Oosten",
    "eg": "Midden-Oosten", "iran": "Midden-Oosten", "iraq": "Midden-Oosten",
    "yemen": "Midden-Oosten",
    "sudan": "Afrika", "maroc": "Afrika", "eg2": "Afrika",
    "us": "Noord-Amerika", "vs": "Noord-Amerika", "world": "Azië",
    "sport": "West-Europa", "favorites": "West-Europa"
  };

  var SUBTYPE_KEYWORDS = {
    "aanval": {
      "raketaanval":2, "raket":2, "drone":2, "bomaanslag":3, "bom":2,
      "explosie":2, "ontploffing":2, "luchtaanval":2, "beschieting":2,
      "granaat":2, "mortier":2, "artillerie":2, "zelfmoordaanslag":3,
      "aanslag":3, "missile":2, "rocket":2, "airstrike":2, "bombing":2,
      "bomb":2, "explosion":2, "shelling":2, "artillery":2, "suicide":3,
      "shahed":2, "kalibr":2, "iskander":2, "kinzhal":2, "uav":2,
      "fpv":2, "loitering":2, "intercepted":2, "downed":2, "shot down":2,
      "artillery strike":2, "artillery shelling":2, "strike":2, "strikes":2
    },
    "offensief": {
      "offensief":3, "invasie":3, "opmars":2, "tegenoffensief":3,
      "militaire operatie":3, "operatie":1, "aanval":2, "aanvallen":2,
      "offensive":3, "invasion":3, "advance":2, "counteroffensive":3,
      "operation":1, "attack":2, "attacks":2, "assault":2, "advancing":2,
      "advanced":2
    },
    "defensief": {
      "luchtafweer":3, "interceptie":3, "onderschept":3, "onderscheppen":3,
      "verdediging":2, "terugtrekking":2, "defense":2, "defence":2,
      "intercept":3, "intercepted":3, "withdrawal":2, "repelled":3, "repel":2,
      "air defense":2, "airdefense":2, "electronic warfare":2
    },
    "voortgang": {
      "veroverd":3, "heroverd":3, "bezet":2, "frontlinie":2, "controle":1,
      "captured":3, "recaptured":3, "occupied":2, "frontline":2,
      "encirclement":3, "encircled":3, "pocket":2
    },
    "actief": {
      "gevechten":2, "gevecht":2, "oorlog":2, "conflict":2, "troepen":2,
      "militaire":2, "leger":2, "strijdkrachten":2, "vuurgevecht":3,
      "schietpartij":3, "fighting":2, "war":2, "troops":2, "military":2,
      "army":2, "forces":2, "gunfire":3, "shooting":3,
      "brigade":2, "battalion":2, "regiment":2, "convoy":1, "column":1
    }
  };

  function getBus() {
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

  function tokenize(text) {
    if (!text) return [];
    return String(text).toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ").split(/\s+/);
  }

  function countMatches(words, dict) {
    var hits = 0;
    for (var i = 0; i < words.length; i++) {
      if (dict[words[i]]) hits += dict[words[i]];
    }
    return hits;
  }

  function extractLocation(text) {
    if (!text) return null;
    var lower = " " + String(text).toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";
    var found = null;
    var foundLen = 0;
    for (var key in LOCATIONS) {
      var pattern = " " + key + " ";
      if (lower.indexOf(pattern) !== -1) {
        if (key.length > foundLen) {
          found = LOCATIONS[key];
          foundLen = key.length;
        }
      }
    }
    return found;
  }

  /* v2.0: fallback op basis van artikel.cat / tags */
  function extractRegionFallback(article) {
    if (!article) return null;
    var cat = (article.cat || "").toLowerCase();
    var tags = Array.isArray(article.tags) ? article.tags.map(function(t){ return String(t).toLowerCase(); }) : [];
    var allCats = [cat].concat(tags);
    for (var i = 0; i < allCats.length; i++) {
      var regionName = CAT_TO_REGION[allCats[i]];
      if (regionName && REGION_LOCATIONS[regionName]) {
        return REGION_LOCATIONS[regionName];
      }
    }
    return null;
  }

  function classifySubtype(words) {
    var bestType = "actief";
    var bestScore = 0;
    for (var type in SUBTYPE_KEYWORDS) {
      var score = countMatches(words, SUBTYPE_KEYWORDS[type]);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }
    return { type: bestType, score: bestScore };
  }

  function classifyArticle(article) {
    if (!article) return null;
    var text = ((article.title || "") + " " + (article.description || article.summary || "")).trim();
    if (text.length < 15) return null;

    var words = tokenize(text);
    var milScore = countMatches(words, MILITARY_KEYWORDS);
    var actScore = countMatches(words, ACTION_KEYWORDS);

    /* v2.0: locatie — eerst specifieke stad, dan regio-fallback */
    var loc = extractLocation(text);
    var usedFallback = false;
    if (!loc) {
      loc = extractRegionFallback(article);
      usedFallback = !!loc;
    }
    if (!loc) return null;

    /* v2.0: verlaagde drempel — 1 militaire keyword volstaat als er locatie is */
    if (milScore < 1) return null;

    var subtype = classifySubtype(words);

    /* v2.0: subtype niet verplicht als we een locatie hebben */
    /* v2.0: als fallback, geef het subtype "actief" default */
    if (subtype.score < 1) {
      subtype = { type: "actief", score: 1 };
    }

    var confidence = milScore * 2 + actScore + 2;

    /* OSINT of fallback bonus — verlaag drempel nog verder */
    if (usedFallback) confidence += 1;

    if (confidence < MIN_CONFIDENCE) return null;

    return { subtype: subtype.type, location: loc, confidence: confidence, isFallback: usedFallback };
  }

  var lastHash = "";

  function hashArticles(articles) {
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

  function buildMilitaryEvents() {
    if (!window.State || !Array.isArray(window.State.items)) return [];
    var items = window.State.items;
    if (!items.length) return [];

    var hash = hashArticles(items);
    if (hash === lastHash) return null;
    lastHash = hash;

    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
    var events = [];
    var skippedOld = 0;

    for (var i = 0; i < items.length; i++) {
      var article = items[i];
      var classification = classifyArticle(article);
      if (!classification) continue;

      var ts = getTimestamp(article) || Date.now();
      if (Date.now() - ts > MAX_AGE_MS) { skippedOld++; continue; }

      var subtype = classification.subtype;
      var loc = classification.location;

      events.push({
        id: "mil-" + i + "-" + subtype,
        lat: loc.lat,
        lng: loc.lng,
        title: article.title || "Onbekend",
        description: article.description || article.summary || "",
        fullDescription: loc.country + " · " + loc.region + "\n\n" + (article.description || article.summary || ""),
        subtype: subtype,
        type: subtype,
        country: loc.country,
        region: loc.region,
        date: new Date(ts).toISOString(),
        url: article.link || article.url || "",
        source: article.source || "",
        confidence: classification.confidence,
        isMilitary: true,
        _fallback: !!classification.isFallback
      });
    }

    events.sort(function(a, b){
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);

    var elapsed = ((window.performance && performance.now) ? performance.now() : Date.now()) - startTime;
    if (window.wdLog) {
      wdLog.info("[Map-AI v2] " + events.length + " militaire events uit " + items.length + " artikelen (skip oud: " + skippedOld + ", " + Math.round(elapsed) + "ms)");
    }
    return events;
  }

  function calculateHotspots(events) {
    if (!events || !events.length) return [];
    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;
    var byCountry = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var t = new Date(e.date).getTime();
      if (t < dayAgo) continue;
      var cKey = e.country || "Onbekend";
      if (!byCountry[cKey]) byCountry[cKey] = { country: cKey, region: e.region || "", count: 0, latSum: 0, lngSum: 0 };
      byCountry[cKey].count++;
      byCountry[cKey].latSum += e.lat;
      byCountry[cKey].lngSum += e.lng;
    }
    var landHotspots = [];
    for (var c in byCountry) {
      var item = byCountry[c];
      if (item.count >= 1) {
        landHotspots.push({
          label: item.country,
          type: "country",
          count: item.count,
          lat: item.latSum / item.count,
          lng: item.lngSum / item.count,
          region: item.region
        });
      }
    }
    landHotspots.sort(function(a, b){ return b.count - a.count; });
    var seen = {};
    var result = [];
    for (var k = 0; k < landHotspots.length; k++) {
      if (seen[landHotspots[k].label]) continue;
      seen[landHotspots[k].label] = true;
      result.push(landHotspots[k]);
      if (result.length >= 5) break;
    }
    return result;
  }

  function run() {
    var events = buildMilitaryEvents();
    if (events === null) return;
    if (!Array.isArray(events)) events = [];
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);

    var bus = getBus();
    if (!bus) return;

    bus.emit("map:military-events", events);
    bus.emit("map:hotspots", calculateHotspots(events));
  }

  function init() {
    var bus = getBus();
    if (!bus) {
      if (window.wdLog) wdLog.warn("[Map-AI] EventBus niet gevonden");
      return;
    }
    bus.on("news:loaded", function(){
      var idle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
      idle(function(){ run(); }, { timeout: 3000 });
    });
    setTimeout(function(){
      if (window.State && window.State.items && window.State.items.length) run();
    }, 2000);
    if (window.wdLog) wdLog.info("[WAR DESK] ai-map.js v2.0 geladen (meer events)");
  }

  function getCountries() {
    var out = {};
    for (var key in LOCATIONS) {
      var loc = LOCATIONS[key];
      if (loc && loc.country) out[key] = loc.country;
    }
    return out;
  }

  window.MapAI = {
    run: run,
    getEventsSync: function(){
      try {
        lastHash = "";
        var events = buildMilitaryEvents();
        return (Array.isArray(events) && events.length) ? events : [];
      } catch(e){ return []; }
    },
    getCountries: getCountries,
    calculateHotspots: function(){
      if (!window.State || !window.State.items) return [];
      var events = buildMilitaryEvents() || [];
      return calculateHotspots(events);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();