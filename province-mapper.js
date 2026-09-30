/* ============================================================
   WAR DESK — province-mapper.js v1.1
   - v1.1: Uitgebreide Arabische actoralias
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[PROVMAP]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var CITY_TO_PROVINCE = {
    /* OEKRAÏNE */
    "kyiv":{"iso3":"UKR","admin1":"Kyiv"},"kiev":{"iso3":"UKR","admin1":"Kyiv"},
    "kharkiv":{"iso3":"UKR","admin1":"Kharkiv"},"odesa":{"iso3":"UKR","admin1":"Odesa"},
    "donetsk":{"iso3":"UKR","admin1":"Donetsk"},"donbas":{"iso3":"UKR","admin1":"Donetsk"},
    "luhansk":{"iso3":"UKR","admin1":"Luhansk"},
    "mariupol":{"iso3":"UKR","admin1":"Donetsk"},
    "bakhmut":{"iso3":"UKR","admin1":"Donetsk"},
    "avdiivka":{"iso3":"UKR","admin1":"Donetsk"},"kramatorsk":{"iso3":"UKR","admin1":"Donetsk"},
    "sloviansk":{"iso3":"UKR","admin1":"Donetsk"},
    "zaporizhzhia":{"iso3":"UKR","admin1":"Zaporizhzhia"},
    "kherson":{"iso3":"UKR","admin1":"Kherson"},
    "mykolaiv":{"iso3":"UKR","admin1":"Mykolaiv"},"dnipro":{"iso3":"UKR","admin1":"Dnipropetrovsk"},
    "sumy":{"iso3":"UKR","admin1":"Sumy"},"chernihiv":{"iso3":"UKR","admin1":"Chernihiv"},
    "lviv":{"iso3":"UKR","admin1":"Lviv"},"crimea":{"iso3":"UKR","admin1":"Crimea"},
    "sevastopol":{"iso3":"UKR","admin1":"Crimea"},
    "kupyansk":{"iso3":"UKR","admin1":"Kharkiv"},"izium":{"iso3":"UKR","admin1":"Kharkiv"},
    "lyman":{"iso3":"UKR","admin1":"Donetsk"},"pokrovsk":{"iso3":"UKR","admin1":"Donetsk"},
    "toretsk":{"iso3":"UKR","admin1":"Donetsk"},"vuhledar":{"iso3":"UKR","admin1":"Donetsk"},

    /* RUSLAND */
    "belgorod":{"iso3":"RUS","admin1":"Belgorod"},"kursk":{"iso3":"RUS","admin1":"Kursk"},
    "bryansk":{"iso3":"RUS","admin1":"Bryansk"},
    "rostov":{"iso3":"RUS","admin1":"Rostov"},

    /* SYRIË */
    "aleppo":{"iso3":"SYR","admin1":"Aleppo"},"damascus":{"iso3":"SYR","admin1":"Damascus"},
    "damaskus":{"iso3":"SYR","admin1":"Damascus"},
    "homs":{"iso3":"SYR","admin1":"Homs"},"hama":{"iso3":"SYR","admin1":"Hama"},
    "idlib":{"iso3":"SYR","admin1":"Idlib"},"latakia":{"iso3":"SYR","admin1":"Latakia"},
    "tartus":{"iso3":"SYR","admin1":"Tartus"},
    "raqqa":{"iso3":"SYR","admin1":"Ar-Raqqah"},
    "deir ez-zor":{"iso3":"SYR","admin1":"Deir ez-Zor"},
    "hasakah":{"iso3":"SYR","admin1":"Al-Hasakeh"},
    "daraa":{"iso3":"SYR","admin1":"Daraa"},
    "suwayda":{"iso3":"SYR","admin1":"As-Suwayda"},
    "quneitra":{"iso3":"SYR","admin1":"Quneitra"},
    "manbij":{"iso3":"SYR","admin1":"Aleppo"},
    "afrin":{"iso3":"SYR","admin1":"Aleppo"},
    "al-bab":{"iso3":"SYR","admin1":"Aleppo"},
    "azaz":{"iso3":"SYR","admin1":"Aleppo"},
    "kobani":{"iso3":"SYR","admin1":"Aleppo"},
    "qamishli":{"iso3":"SYR","admin1":"Al-Hasakeh"},
    "palmyra":{"iso3":"SYR","admin1":"Homs"},
    "tabqa":{"iso3":"SYR","admin1":"Ar-Raqqah"},

    /* SYRIË — Arabisch */
    "دمشق":{"iso3":"SYR","admin1":"Damascus"},
    "حلب":{"iso3":"SYR","admin1":"Aleppo"},
    "حمص":{"iso3":"SYR","admin1":"Homs"},
    "حماة":{"iso3":"SYR","admin1":"Hama"},
    "إدلب":{"iso3":"SYR","admin1":"Idlib"},
    "ادلب":{"iso3":"SYR","admin1":"Idlib"},
    "اللاذقية":{"iso3":"SYR","admin1":"Latakia"},
    "طرطوس":{"iso3":"SYR","admin1":"Tartus"},
    "الرقة":{"iso3":"SYR","admin1":"Ar-Raqqah"},
    "دير الزور":{"iso3":"SYR","admin1":"Deir ez-Zor"},
    "الحسكة":{"iso3":"SYR","admin1":"Al-Hasakeh"},
    "القامشلي":{"iso3":"SYR","admin1":"Al-Hasakeh"},
    "درعا":{"iso3":"SYR","admin1":"Daraa"},
    "السويداء":{"iso3":"SYR","admin1":"As-Suwayda"},
    "القنيطرة":{"iso3":"SYR","admin1":"Quneitra"},
    "منبج":{"iso3":"SYR","admin1":"Aleppo"},
    "عفرين":{"iso3":"SYR","admin1":"Aleppo"},
    "الباب":{"iso3":"SYR","admin1":"Aleppo"},
    "أعزاز":{"iso3":"SYR","admin1":"Aleppo"},
    "تدمر":{"iso3":"SYR","admin1":"Homs"},
    "الطبقة":{"iso3":"SYR","admin1":"Ar-Raqqah"},

    /* LIBANON */
    "beirut":{"iso3":"LBN","admin1":"Beyrouth"},"beiroet":{"iso3":"LBN","admin1":"Beyrouth"},
    "sidon":{"iso3":"LBN","admin1":"Liban-Sud"},"tyre":{"iso3":"LBN","admin1":"Liban-Sud"},
    "baalbek":{"iso3":"LBN","admin1":"Baalbek-Hermel"},
    "bekaa":{"iso3":"LBN","admin1":"Béqaa"},
    "nabatieh":{"iso3":"LBN","admin1":"Nabatîyé"},"akkar":{"iso3":"LBN","admin1":"Aakkâr"},
    /* Arabisch */
    "بيروت":{"iso3":"LBN","admin1":"Beyrouth"},
    "صيدا":{"iso3":"LBN","admin1":"Liban-Sud"},
    "صور":{"iso3":"LBN","admin1":"Liban-Sud"},
    "بعلبك":{"iso3":"LBN","admin1":"Baalbek-Hermel"},
    "النبطية":{"iso3":"LBN","admin1":"Nabatîyé"},

    /* JEMEN */
    "sanaa":{"iso3":"YEM","admin1":"Amanat Al Asimah"},"aden":{"iso3":"YEM","admin1":"Adan"},
    "hodeidah":{"iso3":"YEM","admin1":"Al Hudaydah"},
    "taiz":{"iso3":"YEM","admin1":"Ta'izz"},
    "marib":{"iso3":"YEM","admin1":"Marib"},"ma'rib":{"iso3":"YEM","admin1":"Marib"},
    "sa'dah":{"iso3":"YEM","admin1":"Sa'dah"},
    "ibb":{"iso3":"YEM","admin1":"Ibb"},"dhamar":{"iso3":"YEM","admin1":"Dhamar"},
    "mocha":{"iso3":"YEM","admin1":"Al Hudaydah"},
    /* Arabisch */
    "صنعاء":{"iso3":"YEM","admin1":"Amanat Al Asimah"},
    "عدن":{"iso3":"YEM","admin1":"Adan"},
    "الحديدة":{"iso3":"YEM","admin1":"Al Hudaydah"},
    "تعز":{"iso3":"YEM","admin1":"Ta'izz"},
    "مأرب":{"iso3":"YEM","admin1":"Marib"},
    "صعدة":{"iso3":"YEM","admin1":"Sa'dah"},
    "إب":{"iso3":"YEM","admin1":"Ibb"},
    "ذمار":{"iso3":"YEM","admin1":"Dhamar"},
    "المكلا":{"iso3":"YEM","admin1":"Hadramawt"},

    /* SAOEDI-ARABIË */
    "riyadh":{"iso3":"SAU","admin1":"Ar Riyad"},
    "jeddah":{"iso3":"SAU","admin1":"Makkah"},"makkah":{"iso3":"SAU","admin1":"Makkah"},
    "medina":{"iso3":"SAU","admin1":"Al Madinah"},
    "jizan":{"iso3":"SAU","admin1":"Jizan"},"najran":{"iso3":"SAU","admin1":"Najran"},
    "abha":{"iso3":"SAU","admin1":"Asir"},
    /* Arabisch */
    "الرياض":{"iso3":"SAU","admin1":"Ar Riyad"},
    "جدة":{"iso3":"SAU","admin1":"Makkah"},
    "مكة":{"iso3":"SAU","admin1":"Makkah"},
    "المدينة المنورة":{"iso3":"SAU","admin1":"Al Madinah"},
    "جيزان":{"iso3":"SAU","admin1":"Jizan"},
    "نجران":{"iso3":"SAU","admin1":"Najran"},
    "أبها":{"iso3":"SAU","admin1":"Asir"},

    /* ISRAËL */
    "tel aviv":{"iso3":"ISR","admin1":"Tel Aviv"},
    "jeruzalem":{"iso3":"ISR","admin1":"Jerusalem"},"jerusalem":{"iso3":"ISR","admin1":"Jerusalem"},
    "haifa":{"iso3":"ISR","admin1":"Haifa"},"golan":{"iso3":"ISR","admin1":"Northern"},
    /* Arabisch */
    "تل أبيب":{"iso3":"ISR","admin1":"Tel Aviv"},
    "القدس":{"iso3":"ISR","admin1":"Jerusalem"},
    "حيفا":{"iso3":"ISR","admin1":"Haifa"},
    "الجولان":{"iso3":"ISR","admin1":"Northern"},

    /* PALESTINA */
    "gaza":{"iso3":"PSE","admin1":"Gaza"},"rafah":{"iso3":"PSE","admin1":"Gaza"},
    "khan younis":{"iso3":"PSE","admin1":"Gaza"},"jabalia":{"iso3":"PSE","admin1":"Gaza"},
    "west bank":{"iso3":"PSE","admin1":"West Bank"},
    "ramallah":{"iso3":"PSE","admin1":"West Bank"},
    "jenin":{"iso3":"PSE","admin1":"West Bank"},
    /* Arabisch */
    "غزة":{"iso3":"PSE","admin1":"Gaza"},
    "رفح":{"iso3":"PSE","admin1":"Gaza"},
    "خان يونس":{"iso3":"PSE","admin1":"Gaza"},
    "جباليا":{"iso3":"PSE","admin1":"Gaza"},
    "بيت حانون":{"iso3":"PSE","admin1":"Gaza"},
    "بيت لاهيا":{"iso3":"PSE","admin1":"Gaza"},
    "دير البلح":{"iso3":"PSE","admin1":"Gaza"},
    "رام الله":{"iso3":"PSE","admin1":"West Bank"},
    "جنين":{"iso3":"PSE","admin1":"West Bank"},
    "نابلس":{"iso3":"PSE","admin1":"West Bank"},
    "الخليل":{"iso3":"PSE","admin1":"West Bank"},
    "بيت لحم":{"iso3":"PSE","admin1":"West Bank"},

    /* IRAK */
    "baghdad":{"iso3":"IRQ","admin1":"Baghdad"},"mosul":{"iso3":"IRQ","admin1":"Nineveh"},
    "erbil":{"iso3":"IRQ","admin1":"Erbil"},"basra":{"iso3":"IRQ","admin1":"Basra"},
    /* Arabisch */
    "بغداد":{"iso3":"IRQ","admin1":"Baghdad"},
    "الموصل":{"iso3":"IRQ","admin1":"Nineveh"},
    "أربيل":{"iso3":"IRQ","admin1":"Erbil"},
    "البصرة":{"iso3":"IRQ","admin1":"Basra"},
    "كركوك":{"iso3":"IRQ","admin1":"Kirkuk"},

    /* IRAN */
    "tehran":{"iso3":"IRN","admin1":"Tehran"},
    "الرياض‎":{"iso3":"SAU","admin1":"Ar Riyad"},
    "طهران":{"iso3":"IRN","admin1":"Tehran"}
  };

  /* ============================================================
     v1.1: UITGEBREIDE ACTORALIAS
     ============================================================ */
  var ACTOR_ALIASES = {
    /* === Rusland === */
    "rusland":"Rusland","russia":"Rusland","russian":"Rusland",
    "russian army":"Rusland","russian forces":"Rusland",
    "russian military":"Rusland","kremlin":"Rusland","moscow":"Rusland",
    "wagner":"Rusland","wagner group":"Rusland","россия":"Rusland",
    "российская армия":"Rusland","вс рф":"Rusland",
    "الجيش الروسي":"Rusland","القوات الروسية":"Rusland","روسيا":"Rusland","موسكو":"Rusland",

    /* === Oekraïne === */
    "oekraïne":"Oekraïne","ukraine":"Oekraïne","ukrainian":"Oekraïne",
    "ukrainian army":"Oekraïne","ukrainian forces":"Oekraïne",
    "afu":"Oekraïne","zsu":"Oekraïne","україна":"Oekraïne",
    "украинская армия":"Oekraïne","всУ":"Oekraïne",
    "الجيش الأوكراني":"Oekraïne","القوات الأوكرانية":"Oekraïne","أوكرانيا":"Oekraïne","كييف":"Oekraïne",

    /* === Syrië — regering === */
    "syrië":"Regering","syria":"Regering","assad":"Regering",
    "syrian army":"Regering","syrian government":"Regering",
    "regime":"Regering","syrian regime":"Regering",
    "الجيش السوري":"Regering","قوات الأسد":"Regering",
    "النظام السوري":"Regering","الجيش العربي السوري":"Regering",
    "قوات النظام":"Regering","القوات الحكومية":"Regering",
    "قوات الحكومة":"Regering",

    /* === Syrië — oppositie === */
    "syrian opposition":"Onbekend","free syrian army":"Onbekend",
    "fsa":"Onbekend","hts":"Onbekend","hayat tahrir al-sham":"Onbekend",
    "nusra":"Onbekend","al-nusra":"Onbekend","jabhat al-nusra":"Onbekend",
    "sdf":"Onbekend","syrian democratic forces":"Onbekend","ypg":"Onbekend",
    "pkk":"Onbekend",
    "هيئة تحرير الشام":"Onbekend","جبهة النصرة":"Onbekend",
    "الجيش السوري الحر":"Onbekend","قوات سوريا الديمقراطية":"Onbekend",
    "قسد":"Onbekend","ي ب ك":"Onbekend","وحدات حماية الشعب":"Onbekend",
    "البيشمركة":"Onbekend",

    /* === Druze === */
    "druze":"Druze","druzen":"Druze","suwayda":"Druze",
    "druze militia":"Druze","jabal al-druze":"Druze",
    "الدروز":"Druze","جبل العرب":"Druze","الموحدون الدروز":"Druze",

    /* === Israël === */
    "israël":"Israël","israel":"Israël","idf":"Israël",
    "israeli army":"Israël","israeli forces":"Israël","israeli military":"Israël",
    "الجيش الإسرائيلي":"Israël","الاحتلال الإسرائيلي":"Israël",
    "قوات الاحتلال":"Israël","إسرائيل":"Israël","القوات الإسرائيلية":"Israël",
    "צה\"ל":"Israël","ישראל":"Israël",

    /* === Hezbollah === */
    "hezbollah":"Hezbollah","hizbollah":"Hezbollah","hizballah":"Hezbollah",
    "حزب الله":"Hezbollah","المقاومة الإسلامية":"Hezbollah",
    "مقاومة لبنان":"Hezbollah","ح ز ب الله":"Hezbollah",

    /* === Libanon === */
    "libanese staat":"Libanese staat","lebanese state":"Libanese staat",
    "lebanese army":"Libanese staat","laf":"Libanese staat",
    "libanon":"Libanese staat","lebanon":"Libanese staat",
    "الجيش اللبناني":"Libanese staat","لبنان":"Libanese staat",

    /* === Houthi's === */
    "houthi":"Houthi's","houthis":"Houthi's","ansar allah":"Houthi's",
    "houthi rebels":"Houthi's","houthi militia":"Houthi's",
    "الحوثي":"Houthi's","الحوثيون":"Houthi's","أنصار الله":"Houthi's",
    "جماعة الحوثي":"Houthi's","ميليشيا الحوثي":"Houthi's",

    /* === Saoedi-Arabië === */
    "saudi":"Saoedi-Arabië","saudi arabia":"Saoedi-Arabië",
    "saudi-led coalition":"Saoedi-Arabië","ksa":"Saoedi-Arabië",
    "السعودية":"Saoedi-Arabië","التحالف السعودي":"Saoedi-Arabië",
    "التحالف العربي":"Saoedi-Arabië",

    /* === Jemen regering === */
    "yemen government":"Regering","yemeni government":"Regering",
    "hadi":"Regering","stc":"Regering",
    "الحكومة اليمنية":"Regering","المجلس الانتقالي":"Regering",

    /* === Palestina === */
    "palestina":"Palestina","palestine":"Palestina",
    "palestinian":"Palestina","hamas":"Palestina","pij":"Palestina",
    "palestinian islamic jihad":"Palestina",
    "حماس":"Palestina","كتائب القسام":"Palestina",
    "الجهاد الإسلامي":"Palestina","سرايا القدس":"Palestina",
    "فلسطين":"Palestina","المقاومة الفلسطينية":"Palestina",

    /* === Iran === */
    "iran":"Iran","iranian army":"Iran","irgc":"Iran",
    "iranian forces":"Iran","iranian military":"Iran",
    "الحرس الثوري":"Iran","فيلق القدس":"Iran",
    "إيران":"Iran","الجمهورية الإسلامية":"Iran","طهران":"Iran",
    "иран":"Iran","корпус стражей":"Iran",

    /* === IS / Al-Qaeda === */
    "isis":"Onbekend","isil":"Onbekend","daesh":"Onbekend",
    "islamic state":"Onbekend","islamic state in iraq and syria":"Onbekend",
    "al-qaeda":"Onbekend","al qaeda":"Onbekend","alqaeda":"Onbekend",
    "داعش":"Onbekend","تنظيم الدولة":"Onbekend",
    "تنظيم الدولة الإسلامية":"Onbekend","القاعدة":"Onbekend",

    /* === Irak === */
    "iraqi army":"Irak","iraqi forces":"Irak","iraq":"Irak",
    "iraqi government":"Irak","pmf":"Irak","popular mobilization forces":"Irak",
    "الجيش العراقي":"Irak","الحشد الشعبي":"Irak","العراق":"Irak",
    "بغداد":"Irak",

    /* === Overig === */
    "taliban":"Onbekend","afghan army":"Onbekend","afghanistan":"Onbekend",
    "pakistani army":"Pakistan","pakistan":"Pakistan",
    "indian army":"India","india":"India",
    "myanmar military":"Myanmar","myanmar":"Myanmar",
    "junta":"Myanmar",
    "north korean army":"Noord-Korea","north korea":"Noord-Korea",
    "chinese military":"China","china":"China","pla":"China",
    "rsf":"Sudan","rapid support forces":"Sudan","sudanese army":"Sudan",
    "sudan":"Sudan",
    "al-shabaab":"Somalië","al shabaab":"Somalië","somalië":"Somalië",
    "boko haram":"Nigeria","nigeria":"Nigeria",
    "m23":"Congo","congo":"Congo"
  };

  var _geojsons = {};
  var _areaCache = {};
  var _initialized = false;

  function normalize(str){
    return String(str || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06FF]/g, "");
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
    /* v1.1: probeer ook direct op ruwe key (voor Arabisch) */
    if(CITY_TO_PROVINCE[cityKey]){
      var r2 = CITY_TO_PROVINCE[cityKey];
      return { iso3: r2.iso3, admin1: r2.admin1, method: "manual-arabic" };
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

    /* v1.1: probeer ook ruwe key (voor Arabisch) */
    var rawKey = String(actorName).trim();
    if(ACTOR_ALIASES[rawKey]) return ACTOR_ALIASES[rawKey];

    /* Partial match (alleen Latijns) */
    for(var alias in ACTOR_ALIASES){
      if(!Object.prototype.hasOwnProperty.call(ACTOR_ALIASES, alias)) continue;
      if(/[\u0600-\u06FF]/.test(alias)) continue;
      if(key.indexOf(normalize(alias)) !== -1) return ACTOR_ALIASES[alias];
    }
    return "Onbekend";  /* Onbekende actoren → "Onbekend" ipv ruwe string */
  }

  window.ProvinceMapper = {
    init: init,
    getProvinceForCity: getProvinceForCity,
    getProvinceForPoint: getProvinceForPoint,
    getAreasForProvince: getAreasForProvince,
    resolveActor: resolveActor,
    isReady: function(){
      if(!_initialized) return false;
      return Object.keys(_areaCache).length > 0;
    },
    _version: "v1.1",
    _cityTable: CITY_TO_PROVINCE,
    _actorTable: ACTOR_ALIASES
  };

  LOG("province-mapper.js v1.1 geladen (" + Object.keys(CITY_TO_PROVINCE).length +
      " steden, " + Object.keys(ACTOR_ALIASES).length + " actors)");
})();