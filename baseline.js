/* ============================================================
   WAR DESK — baseline.js v2.0
   - Grondwaarheid: wie controleert welk gebied?
   - Bijgewerkt tot 12 oktober 2026
   - Syrië: SDF opgeheven, Al-Sharaa-regering controleert oost
   - Libanon: Israëlische bezetting zuiden
   - Gaza: 58-63% Israëlisch bezet
   - Soedan: SAF vs RSF
   ============================================================ */

(function(){
  "use strict";

  window.WD_BASELINE_VERSION = "v2.0";

  var BASELINE = {

    /* ══════════════ SYRIË — oktober 2026 ══════════════ */
    "SYR|Damascus":     { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Aleppo":       { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|Homs":         { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Hama":         { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Idlib":        { controller: "Al-Sharaa-regering", since: "2015-03-01", source: "HTS" },
    "SYR|Latakia":      { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Tartus":       { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Daraa":        { controller: "Al-Sharaa-regering", since: "2024-12-15", source: "HTS" },
    "SYR|Rif Dimashq":  { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Raqqa":        { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie-akkoord" },
    "SYR|Deir ez-Zor":  { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie-akkoord" },
    "SYR|Al-Hasakeh":   { controller: "Al-Sharaa-regering", since: "2026-08-25", source: "SDF-ontbinding" },
    "SYR|As-Suwayda":   { controller: "Druze-milities",   since: "2025-07-01", source: "semi-autonoom" },
    "SYR|Quneitra":     { controller: "Israël (bezet)",   since: "2024-12-09", source: "IDF" },

    /* ══════════════ LIBANON — oktober 2026 ══════════════ */
    "LBN|Beirut":        { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Mount Lebanon": { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|North":         { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Akkar":         { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Baalbek-Hermel":{ controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Bekaa":         { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Nabatiyeh":     { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|South":         { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Beqaa":         { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },

    /* ══════════════ JEMEN — oktober 2026 ══════════════ */
    "YEM|Sana'a":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Sa'dah":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Amran":         { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Dhamar":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Al Mahwit":     { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Raymah":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Al Hudaydah":   { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Hajjah":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Ibb":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Ta'izz":        { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Al Bayda":      { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Ma'rib":        { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|Al Jawf":       { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|Al Dali":       { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|Aden":          { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Abyan":         { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Lahij":         { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Shabwah":       { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Hadramawt":     { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Al Mahrah":     { controller: "Regering", since: "2015-07-17", source: "STC" },

    /* ══════════════ GAZA — oktober 2026 ══════════════ */
    "PSE|Gaza":     { controller: "Israël (bezet)", since: "2025-10-10", source: "IDF" },
    "PSE|West Bank":{ controller: "Palestina",       since: "1994-05-04", source: "PA" },

    /* ══════════════ SOEDAN — oktober 2026 ══════════════ */
    "SDN|Khartoum":     { controller: "Regering", since: "2025-03-01", source: "SAF" },
    "SDN|North Darfur": { controller: "Regering", since: "2025-01-01", source: "SAF" },
    "SDN|South Darfur": { controller: "RSF",      since: "2024-01-01", source: "RSF" },
    "SDN|West Darfur":  { controller: "Regering", since: "2025-06-01", source: "SAF" },
    "SDN|East Darfur":  { controller: "RSF",      since: "2024-01-01", source: "RSF" },
    "SDN|Central Darfur":{ controller: "RSF",     since: "2024-01-01", source: "RSF" },
    "SDN|North Kordofan":{ controller: "RSF",     since: "2024-06-01", source: "RSF" },
    "SDN|South Kordofan":{ controller: "Regering",since: "2024-06-01", source: "SAF" },
    "SDN|West Kordofan": { controller: "RSF",     since: "2024-06-01", source: "RSF" },
    "SDN|Al Jazirah":    { controller: "RSF",     since: "2024-12-01", source: "RSF" },
    "SDN|Sennar":        { controller: "RSF",     since: "2024-12-01", source: "RSF" },
    "SDN|White Nile":    { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|Blue Nile":     { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|River Nile":    { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|Red Sea":       { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|Kassala":       { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|Gedaref":       { controller: "Regering",since: "2024-01-01", source: "SAF" },
    "SDN|Northern":      { controller: "Regering",since: "2024-01-01", source: "SAF" },

    /* ══════════════ OEKRAÏNE — oktober 2026 ══════════════ */
    "UKR|Kyiv":         { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Kharkiv":      { controller: "Oekraïne", since: "2022-09-01", source: "ZSU" },
    "UKR|Odesa":        { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Donetsk":      { controller: "Rusland", since: "2022-02-24", source: "RF" },
    "UKR|Luhansk":      { controller: "Rusland", since: "2022-02-24", source: "RF" },
    "UKR|Zaporizhzhia": { controller: "Rusland", since: "2022-02-24", source: "RF" },
    "UKR|Kherson":      { controller: "Rusland", since: "2022-02-24", source: "RF" },
    "UKR|Dnipropetrovsk":{ controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Sumy":         { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Chernihiv":    { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Lviv":         { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Mykolaiv":     { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Poltava":      { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Cherkasy":     { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Zhytomyr":     { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Rivne":        { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Ternopil":     { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Ivano-Frankivsk":{ controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Zakarpattia":  { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Volyn":        { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Kirovohrad":   { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Vinnytsia":    { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Khmelnytskyi": { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Chernivtsi":   { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },

    /* ══════════════ SAHEL — oktober 2026 ══════════════ */
    "MLI|Kidal":      { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "MLI|Gao":        { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Timbuktu":   { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Menaka":     { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Mopti":      { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Segou":      { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Koulikoro":  { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Sikasso":    { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Kayes":      { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Bamako":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },

    "BFA|Sahel":      { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Est":        { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Nord":       { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Centre-Nord":{ controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Centre-Est": { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Boucle du Mouhoun":{ controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "BFA|Cascades":   { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Hauts-Bassins":{ controller: "Junta (Regering)",since: "2024-01-01", source: "Junta" },
    "BFA|Centre":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre-Sud": { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre-Ouest":{ controller: "Junta (Regering)", since: "2024-01-01", source: "Junta" },
    "BFA|Plateau-Central":{ controller: "Junta (Regering)", since: "2024-01-01", source: "Junta" },
    "BFA|Sud-Ouest":  { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },

    "NER|Tillaberi":  { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "NER|Tahoua":     { controller: "IS Sahel",          since: "2025-06-01", source: "ISSP" },
    "NER|Dosso":      { controller: "IS Sahel",          since: "2025-06-01", source: "ISSP" },
    "NER|Maradi":     { controller: "IS Sahel",          since: "2025-06-01", source: "ISSP" },
    "NER|Diffa":      { controller: "Boko Haram/ISWAP",  since: "2024-01-01", source: "ISWAP" },
    "NER|Zinder":     { controller: "Boko Haram/ISWAP",  since: "2024-01-01", source: "ISWAP" },
    "NER|Agadez":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "NER|Niamey":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },

    /* ══════════════ MYANMAR — oktober 2026 ══════════════ */
    "MMR|Rakhine":    { controller: "Arakan Army",     since: "2024-01-01", source: "AA" },
    "MMR|Kachin":     { controller: "KIA (Kachin)",    since: "2024-06-01", source: "KIA" },
    "MMR|Kayin":      { controller: "KNU (Karen)",     since: "2024-01-01", source: "KNU" },
    "MMR|Sagaing":    { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Magway":     { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Mandalay":   { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Shan":       { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Chin":       { controller: "NUG (verzet)",    since: "2024-01-01", source: "PDF" },
    "MMR|Bago":       { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Ayeyarwady": { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Yangon":     { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Naypyidaw":  { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Mon":        { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Kayah":      { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Tanintharyi":{ controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" }
  };

  function getBaseline(iso3, admin1, provinceName){
    if (!iso3) return null;
    var keys = [];
    if (admin1) keys.push(iso3 + "|" + admin1);
    if (provinceName) keys.push(iso3 + "|" + provinceName);
    keys.push(iso3 + "|*");
    for (var i = 0; i < keys.length; i++){
      if (BASELINE[keys[i]]) return BASELINE[keys[i]];
    }
    return null;
  }

  function setBaseline(iso3, admin1, controller, since, source){
    var key = iso3 + "|" + admin1;
    BASELINE[key] = {
      controller: controller,
      since: since || new Date().toISOString().slice(0, 10),
      source: source || "handmatig"
    };
    try {
      if (window.WDStorage) {
        WDStorage.set("baseline_" + key, JSON.stringify(BASELINE[key]));
      }
    } catch(e){}
    return BASELINE[key];
  }

  function loadLocalOverrides(){
    try {
      if (!window.WDStorage) return;
      var keys = Object.keys(localStorage);
      keys.forEach(function(k){
        if (k.indexOf("baseline_") === 0){
          var key = k.replace("baseline_", "");
          var val = localStorage.getItem(k);
          if (val){
            try { BASELINE[key] = JSON.parse(val); } catch(e){}
          }
        }
      });
    } catch(e){}
  }

  loadLocalOverrides();

  window.WDBaseline = {
    version: "v2.0",
    get: getBaseline,
    set: setBaseline,
    _all: BASELINE
  };

  try {
    if (window.wdLog) {
      wdLog.info("[Baseline] v2.0 geladen — " +
        Object.keys(BASELINE).length + " provincies (bijgewerkt tot 12 okt 2026)");
    }
  } catch(e){}

})();