/* ============================================================
   WAR DESK — province-mapper.js v1.0
   ------------------------------------------------------------
   Brug tussen stad-claims (uit ai-map) en provincie-areas
   (uit conflict-areas GADM geojsons).

   Interface:
     init(gadmGeojsons)                → van ConflictAreas
     getProvinceForCity(key)           → "aleppo" → {iso3, admin1}
     getProvinceForPoint(lat,lng,iso3) → reverse geocoding
     getAreasForProvince(iso3,admin1)  → [areaId, ...]
     resolveActor(name)                → "Assad" → "Regering"
     debugTest()                       → console test
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[PROVMAP]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  /* ============================================================
     CITY → (iso3, admin1) — admin1 matcht GADM NAME_1 (na normalize)
     ============================================================ */
  var CITY_TO_PROVINCE = {
    /* OEKRAÏNE */
    "kyiv":{"iso3":"UKR","admin1":"Kyiv"},"kiev":{"iso3":"UKR","admin1":"Kyiv"},
    "kharkiv":{"iso3":"UKR","admin1":"Kharkiv"},"odesa":{"iso3":"UKR","admin1":"Odesa"},
    "donetsk":{"iso3":"UKR","admin1":"Donetsk"},"donbas":{"iso3":"UKR","admin1":"Donetsk"},
    "luhansk":{"iso3":"UKR","admin1":"Luhansk"},
    "marioepol":{"iso3":"UKR","admin1":"Donetsk"},"mariupol":{"iso3":"UKR","admin1":"Donetsk"},
    "bachmoet":{"iso3":"UKR","admin1":"Donetsk"},"bakhmut":{"iso3":"UKR","admin1":"Donetsk"},
    "avdiivka":{"iso3":"UKR","admin1":"Donetsk"},"kramatorsk":{"iso3":"UKR","admin1":"Donetsk"},
    "sloviansk":{"iso3":"UKR","admin1":"Donetsk"},
    "zaporizhzhia":{"iso3":"UKR","admin1":"Zaporizhzhia"},"zaporozhye":{"iso3":"UKR","admin1":"Zaporizhzhia"},
    "cherson":{"iso3":"UKR","admin1":"Kherson"},"kherson":{"iso3":"UKR","admin1":"Kherson"},
    "mykolaiv":{"iso3":"UKR","admin1":"Mykolaiv"},"dnipro":{"iso3":"UKR","admin1":"Dnipropetrovsk"},
    "sumy":{"iso3":"UKR","admin1":"Sumy"},"chernihiv":{"iso3":"UKR","admin1":"Chernihiv"},
    "lviv":{"iso3":"UKR","admin1":"Lviv"},
    "krim":{"iso3":"UKR","admin1":"Crimea"},"crimea":{"iso3":"UKR","admin1":"Crimea"},
    "sevastopol":{"iso3":"UKR","admin1":"Crimea"},
    /* RUSLAND */
    "belgorod":{"iso3":"RUS","admin1":"Belgorod"},"koersk":{"iso3":"RUS","admin1":"Kursk"},
    "kursk":{"iso3":"RUS","admin1":"Kursk"},"bryansk":{"iso3":"RUS","admin1":"Bryansk"},
    "rostov":{"iso3":"RUS","admin1":"Rostov"},"voronezh":{"iso3":"RUS","admin1":"Voronezh"},
    /* SYRIË */
    "aleppo":{"iso3":"SYR","admin1":"Aleppo"},"damascus":{"iso3":"SYR","admin1":"Damascus"},
    "homs":{"iso3":"SYR","admin1":"Homs"},"hama":{"iso3":"SYR","admin1":"Hama"},
    "idlib":{"iso3":"SYR","admin1":"Idlib"},"latakia":{"iso3":"SYR","admin1":"Latakia"},
    "tartus":{"iso3":"SYR","admin1":"Tartus"},
    "raqqa":{"iso3":"SYR","admin1":"Ar-Raqqah"},"ar-raqqah":{"iso3":"SYR","admin1":"Ar-Raqqah"},
    "deir ez-zor":{"iso3":"SYR","admin1":"Deir ez-Zor"},"deirez":{"iso3":"SYR","admin1":"Deir ez-Zor"},
    "deir ez zor":{"iso3":"SYR","admin1":"Deir ez-Zor"},
    "hasakah":{"iso3":"SYR","admin1":"Al-Hasakeh"},"al-hasakah":{"iso3":"SYR","admin1":"Al-Hasakeh"},
    "daraa":{"iso3":"SYR","admin1":"Daraa"},"dara":{"iso3":"SYR","admin1":"Daraa"},
    "suwayda":{"iso3":"SYR","admin1":"As-Suwayda"},"sweida":{"iso3":"SYR","admin1":"As-Suwayda"},
    "quneitra":{"iso3":"SYR","admin1":"Quneitra"},
    /* LIBANON */
    "beirut":{"iso3":"LBN","admin1":"Beyrouth"},"beiroet":{"iso3":"LBN","admin1":"Beyrouth"},
    "tripoli":{"iso3":"LBN","admin1":"Liban-Nord"},
    "sidon":{"iso3":"LBN","admin1":"Liban-Sud"},"tyre":{"iso3":"LBN","admin1":"Liban-Sud"},
    "baalbek":{"iso3":"LBN","admin1":"Baalbek-Hermel"},
    "bekaa":{"iso3":"LBN","admin1":"Béqaa"},"beqaa":{"iso3":"LBN","admin1":"Béqaa"},
    "nabatieh":{"iso3":"LBN","admin1":"Nabatîyé"},"akkar":{"iso3":"LBN","admin1":"Aakkâr"},
    /* JEMEN */
    "sanaa":{"iso3":"YEM","admin1":"Amanat Al Asimah"},"aden":{"iso3":"YEM","admin1":"Adan"},
    "hodeidah":{"iso3":"YEM","admin1":"Al Hudaydah"},
    "taiz":{"iso3":"YEM","admin1":"Ta'izz"},"ta'izz":{"iso3":"YEM","admin1":"Ta'izz"},
    "marib":{"iso3":"YEM","admin1":"Marib"},"ma'rib":{"iso3":"YEM","admin1":"Marib"},
    "sa'dah":{"iso3":"YEM","admin1":"Sa'dah"},"sadah":{"iso3":"YEM","admin1":"Sa'dah"},
    "ibb":{"iso3":"YEM","admin1":"Ibb"},"dhamar":{"iso3":"YEM","admin1":"Dhamar"},
    "hajjah":{"iso3":"YEM","admin1":"Hajjah"},"aljawf":{"iso3":"YEM","admin1":"Al Jawf"},
    "hadramawt":{"iso3":"YEM","admin1":"Hadramawt"},
    /* SAOEDI-ARABIË */
    "riyadh":{"iso3":"SAU","admin1":"Ar Riyad"},
    "jeddah":{"iso3":"SAU","admin1":"Makkah"},"makkah":{"iso3":"SAU","admin1":"Makkah"},
    "medina":{"iso3":"SAU","admin1":"Al Madinah"},
    "jizan":{"iso3":"SAU","admin1":"Jizan"},"jazan":{"iso3":"SAU","admin1":"Jizan"},
    "najran":{"iso3":"SAU","admin1":"Najran"},
    "abha":{"iso3":"SAU","admin1":"Asir"},"khamis mushait":{"iso3":"SAU","admin1":"Asir"},
    /* ISRAËL */
    "tel aviv":{"iso3":"ISR","admin1":"Tel Aviv"},
    "jeruzalem":{"iso3":"ISR","admin1":"Jerusalem"},"jerusalem":{"iso3":"ISR","admin1":"Jerusalem"},
    "haifa":{"iso3":"ISR","admin1":"Haifa"},"golan":{"iso3":"ISR","admin1":"Northern"},
    /* PALESTINA */
    "gaza":{"iso3":"PSE","admin1":"Gaza"},"rafah":{"iso3":"PSE","admin1":"Gaza"},
    "khan younis":{"iso3":"PSE","admin1":"Gaza"},"jabalia":{"iso3":"PSE","admin1":"Gaza"},
    "westelijke jordaanoever":{"iso3":"PSE","admin1":"West Bank"},
    "west bank":{"iso3":"PSE","admin1":"West Bank"},
    "ramallah":{"iso3":"PSE","admin1":"West Bank"},
    "jenin":{"iso3":"PSE","admin1":"West Bank"},
    "hebron":{"iso3":"PSE","admin1":"West Bank"}
  };

  /* ACTOR → canonieke naam (match conflict-areas partij-namen) */
  var ACTOR_ALIASES = {
    "rusland":"Rusland","russia":"Rusland","russian":"Rusland",
    "russian army":"Rusland","russian forces":"Rusland","kremlin":"Rusland",
    "moscow":"Rusland","wagner":"Rusland",
    "oekraïne":"Oekraïne","ukraine":"Oekraïne","ukrainian":"Oekraïne",
    "afu":"Oekraïne","zsu":"Oekraïne","ukrainian army":"Oekraïne",
    "syrië":"Regering","syria":"Regering","assad":"Regering",
    "syrian army":"Regering","syrian government":"Regering",
    "regime":"Regering","syrian regime":"Regering",
    "druze":"Druze","druzen":"Druze","suwayda":"Druze",
    "israël":"Israël","israel":"Israël","idf":"Israël",
    "israeli army":"Israël","israeli forces":"Israël",
    "hezbollah":"Hezbollah","hizbollah":"Hezbollah","hizballah":"Hezbollah",
    "libanese staat":"Libanese staat","lebanese state":"Libanese staat",
    "lebanese army":"Libanese staat","laf":"Libanese staat",
    "houthi":"Houthi's","houthis":"Houthi's","ansar allah":"Houthi's",
    "saudi":"Saoedi-Arabië","saudi arabia":"Saoedi-Arabië",
    "saudi-led coalition":"Saoedi-Arabië",
    "yemen government":"Regering","yemeni government":"Regering",
    "hadi":"Regering","stc":"Regering",
    "palestina":"Palestina","palestine":"Palestina",
    "palestinian":"Palestina","hamas":"Palestina","pij":"Palestina"
  };

  var _geojsons = {};
  var _areaCache = {};
  var _initialized = false;

  function normalize(str){
    return String(str || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function pointInRing(x, y, ring){
    var inside = false, len = ring.length;
    for(var i = 0, j = len - 1; i < len; j = i++){
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function pointInGeometry(x, y, geometry){
    if(!geometry) return false;
    if(geometry.type === "Polygon"){
      var rings = geometry.coordinates;
      if(!rings || !rings.length) return false;
      if(!pointInRing(x, y, rings[0])) return false;
      for(var h = 1; h < rings.length; h++){
        if(pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }
    if(geometry.type === "MultiPolygon"){
      var polys = geometry.coordinates;
      for(var p = 0; p < polys.length; p++){
        var rings2 = polys[p];
        if(!rings2 || !rings2.length) continue;
        if(!pointInRing(x, y, rings2[0])) continue;
        var inHole = false;
        for(var h2 = 1; h2 < rings2.length; h2++){
          if(pointInRing(x, y, rings2[h2])){ inHole = true; break; }
        }
        if(!inHole) return true;
      }
      return false;
    }
    return false;
  }

  function init(gadmGeojsons){
    if(!gadmGeojsons || typeof gadmGeojsons !== "object"){
      LOG("Init overgeslagen — geen geojsons");
      return false;
    }
    _geojsons = gadmGeojsons;
    _areaCache = {};
    Object.keys(gadmGeojsons).forEach(function(iso3){
      var gj = gadmGeojsons[iso3];
      if(!gj || !gj.features) return;
      var list = [];
      gj.features.forEach(function(f){
        if(!f.properties) return;
        list.push({
          id: f.properties.id,
          admin1: f.properties.name,
          admin1Parent: f.properties.provinceName,
          name: f.properties.name || f.properties.provinceName,
          iso3: iso3
        });
      });
      _areaCache[iso3] = list;
    });
    _initialized = true;
    var total = 0;
    Object.keys(_areaCache).forEach(function(k){ total += _areaCache[k].length; });
    LOG("Init klaar — " + total + " areas over " + Object.keys(_areaCache).length + " landen");
    return true;
  }

  function getProvinceForCity(cityKey){
    if(!cityKey) return null;
    var key = normalize(cityKey);
    if(!key) return null;
    if(CITY_TO_PROVINCE[key]){
      var r = CITY_TO_PROVINCE[key];
      return { iso3: r.iso3, admin1: r.admin1, method: "manual" };
    }
    var loc = (window.WorldMapData && window.WorldMapData.LOCATIONS)
      ? window.WorldMapData.LOCATIONS[key] : null;
    if(!loc || !loc.country) return null;
    var iso3 = null;
    try {
      if(window.WorldMapData && window.WorldMapData.getISO3){
        iso3 = window.WorldMapData.getISO3(loc.country);
      }
    } catch(e){}
    if(!iso3) return null;
    return { iso3: iso3, admin1: null, method: "country-only" };
  }

  function getProvinceForPoint(lat, lng, iso3Hint){
    if(typeof lat !== "number" || typeof lng !== "number") return null;
    var candidates = iso3Hint && _areaCache[iso3Hint]
      ? [iso3Hint] : Object.keys(_areaCache);
    for(var i = 0; i < candidates.length; i++){
      var iso3 = candidates[i];
      var gj = _geojsons[iso3];
      if(!gj || !gj.features) continue;
      for(var j = 0; j < gj.features.length; j++){
        var f = gj.features[j];
        if(!f || !f.geometry) continue;
        if(pointInGeometry(lng, lat, f.geometry)){
          return {
            iso3: iso3,
            admin1: f.properties.name,
            admin1Parent: f.properties.provinceName,
            areaId: f.properties.id,
            method: "point"
          };
        }
      }
    }
    return null;
  }

  function getAreasForProvince(iso3, admin1){
    if(!iso3) return [];
    var areas = _areaCache[iso3];
    if(!areas) return [];
    var want = normalize(admin1);
    if(!want) return areas.map(function(a){ return a.id; });
    var matches = [];
    for(var i = 0; i < areas.length; i++){
      var a = areas[i];
      var candidates = [a.admin1, a.admin1Parent, a.name];
      for(var c = 0; c < candidates.length; c++){
        var cand = normalize(candidates[c]);
        if(!cand) continue;
        if(cand === want || cand.indexOf(want) !== -1 || want.indexOf(cand) !== -1){
          matches.push(a.id);
          break;
        }
      }
    }
    return matches;
  }

  function resolveActor(actorName){
    if(!actorName) return "Onbekend";
    var key = normalize(actorName);
    if(ACTOR_ALIASES[key]) return ACTOR_ALIASES[key];
    for(var alias in ACTOR_ALIASES){
      if(!Object.prototype.hasOwnProperty.call(ACTOR_ALIASES, alias)) continue;
      if(key.indexOf(alias) !== -1) return ACTOR_ALIASES[alias];
    }
    return actorName;
  }

  function debugTest(){
    var tests = ["kyiv","bakhmut","gaza","aleppo","sanaa","beirut","tel aviv"];
    console.group("[ProvinceMapper] Test");
    tests.forEach(function(t){
      var r = getProvinceForCity(t);
      console.log(t, "→", r ? (r.iso3 + "/" + (r.admin1 || "*")) : "geen match");
    });
    console.groupEnd();
  }

  window.ProvinceMapper = {
    init: init,
    getProvinceForCity: getProvinceForCity,
    getProvinceForPoint: getProvinceForPoint,
    getAreasForProvince: getAreasForProvince,
    resolveActor: resolveActor,
    debugTest: debugTest,
    isReady: function(){ return _initialized; },
    _version: "v1.0",
    _cityTable: CITY_TO_PROVINCE,
    _actorTable: ACTOR_ALIASES
  };

  LOG("province-mapper.js v1.0 geladen (" + Object.keys(CITY_TO_PROVINCE).length +
      " steden, " + Object.keys(ACTOR_ALIASES).length + " actors)");
})();