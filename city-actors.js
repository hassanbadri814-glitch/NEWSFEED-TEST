/* ============================================================
   WAR DESK — city-actors.js v2.0
   - Canonieke actor-resolver, bijgewerkt oktober 2026
   - SDF opgeheven → Al-Sharaa-regering
   - Nieuwe actoren: JNIM, IS Sahel, Boko Haram
   ============================================================ */

(function(){
  "use strict";

  window.WD_CITY_ACTORS_VERSION = "v2.0";

  var SPECIFIC = {
    /* ══ SYRIË ══ */
    "hayat tahrir al-sham":       { conflict:"SYR", party:"Al-Sharaa-regering" },
    "hay'at tahrir al-sham":      { conflict:"SYR", party:"Al-Sharaa-regering" },
    "hts":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "nusra":                      { conflict:"SYR", party:"Al-Sharaa-regering" },
    "al-nusra":                   { conflict:"SYR", party:"Al-Sharaa-regering" },
    "jabhat al-nusra":            { conflict:"SYR", party:"Al-Sharaa-regering" },
    "syrian democratic forces":   { conflict:"SYR", party:"Al-Sharaa-regering" },
    "sdf":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "ypg":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "ypj":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "pkk":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "kurdish forces":             { conflict:"SYR", party:"Al-Sharaa-regering" },
    "druze":                      { conflict:"SYR", party:"Druze-milities" },
    "druze militia":              { conflict:"SYR", party:"Druze-milities" },
    "jabal al-druze":             { conflict:"SYR", party:"Druze-milities" },
    "islamic state":              { conflict:"SYR", party:"IS" },
    "isis":                       { conflict:"SYR", party:"IS" },
    "daesh":                      { conflict:"SYR", party:"IS" },
    "idf":                        { conflict:"ISR", party:"Israël" },

    /* ══ LIBANON ══ */
    "hezbollah":                  { conflict:"LBN", party:"Hezbollah" },
    "hizbollah":                  { conflict:"LBN", party:"Hezbollah" },
    "hizballah":                  { conflict:"LBN", party:"Hezbollah" },
    "lebanese army":              { conflict:"LBN", party:"Libanese staat" },
    "laf":                        { conflict:"LBN", party:"Libanese staat" },
    "idf":                        { conflict:"LBN", party:"Israël (bezet)" },

    /* ══ JEMEN ══ */
    "houthi rebels":              { conflict:"YEM", party:"Houthi's" },
    "houthi militia":             { conflict:"YEM", party:"Houthi's" },
    "houthis":                    { conflict:"YEM", party:"Houthi's" },
    "houthi":                     { conflict:"YEM", party:"Houthi's" },
    "ansar allah":                { conflict:"YEM", party:"Houthi's" },
    "ansarallah":                 { conflict:"YEM", party:"Houthi's" },
    "yemen government":           { conflict:"YEM", party:"Regering" },
    "yemeni government":          { conflict:"YEM", party:"Regering" },
    "yemeni army":                { conflict:"YEM", party:"Regering" },
    "stc":                        { conflict:"YEM", party:"Regering" },

    /* ══ OEKRAÏNE ══ */
    "russian army":               { conflict:"UKR", party:"Rusland" },
    "russian forces":             { conflict:"UKR", party:"Rusland" },
    "russian military":           { conflict:"UKR", party:"Rusland" },
    "russian troops":             { conflict:"UKR", party:"Rusland" },
    "wagner group":               { conflict:"UKR", party:"Rusland" },
    "wagner":                     { conflict:"UKR", party:"Rusland" },
    "ukrainian army":             { conflict:"UKR", party:"Oekraïne" },
    "ukrainian forces":           { conflict:"UKR", party:"Oekraïne" },
    "ukrainian military":         { conflict:"UKR", party:"Oekraïne" },
    "ukrainian troops":           { conflict:"UKR", party:"Oekraïne" },
    "afu":                        { conflict:"UKR", party:"Oekraïne" },
    "zsu":                        { conflict:"UKR", party:"Oekraïne" },
    "azov":                       { conflict:"UKR", party:"Oekraïne" },

    /* ══ SOEDAN ══ */
    "rapid support forces":       { conflict:"SDN", party:"RSF" },
    "rapid support force":        { conflict:"SDN", party:"RSF" },
    "rsf":                        { conflict:"SDN", party:"RSF" },
    "sudanese army":              { conflict:"SDN", party:"Regering" },
    "sudanese armed forces":      { conflict:"SDN", party:"Regering" },
    "saf":                        { conflict:"SDN", party:"Regering" },

    /* ══ SAHEL — JNIM/IS ══ */
    "jnim":                       { conflict:"MLI", party:"JNIM (Jihadisten)" },
    "jama'at nasr al-islam":      { conflict:"MLI", party:"JNIM (Jihadisten)" },
    "jamaat nasr al-islam":       { conflict:"MLI", party:"JNIM (Jihadisten)" },
    "is sahel":                   { conflict:"MLI", party:"IS Sahel" },
    "islamic state sahel":        { conflict:"MLI", party:"IS Sahel" },
    "isgs":                       { conflict:"MLI", party:"IS Sahel" },
    "boko haram":                 { conflict:"NER", party:"Boko Haram/ISWAP" },
    "iswap":                      { conflict:"NER", party:"Boko Haram/ISWAP" },

    /* ══ DRC ══ */
    "m23":                        { conflict:"COD", party:"M23/AFC" },
    "m23/afc":                    { conflict:"COD", party:"M23/AFC" },
    "afc":                        { conflict:"COD", party:"M23/AFC" },
    "fardc":                      { conflict:"COD", party:"Regering (FARDC)" },
    "congolese army":             { conflict:"COD", party:"Regering (FARDC)" },

    /* ══ ETHIOPIË ══ */
    "tplf":                       { conflict:"ETH", party:"TPLF (Tigray)" },
    "tigray forces":              { conflict:"ETH", party:"TPLF (Tigray)" },
    "fano":                       { conflict:"ETH", party:"Fano (Amhara)" },
    "ola":                        { conflict:"ETH", party:"OLA (Oromia)" },

    /* ══ MYANMAR ══ */
    "arakan army":                { conflict:"MMR", party:"Arakan Army" },
    "arakan":                     { conflict:"MMR", party:"Arakan Army" },
    "kachin independence army":   { conflict:"MMR", party:"KIA (Kachin)" },
    "kia":                        { conflict:"MMR", party:"KIA (Kachin)" },
    "karen national union":       { conflict:"MMR", party:"KNU (Karen)" },
    "knu":                        { conflict:"MMR", party:"KNU (Karen)" },
    "national unity government":  { conflict:"MMR", party:"NUG (verzet)" },
    "pdf":                        { conflict:"MMR", party:"NUG (verzet)" },
    "nug":                        { conflict:"MMR", party:"NUG (verzet)" },
    "tatmadaw":                   { conflict:"MMR", party:"Militaire junta" },
    "military junta":             { conflict:"MMR", party:"Militaire junta" },
    "junta forces":               { conflict:"MMR", party:"Militaire junta" },

    /* ══ PALESTINA ══ */
    "hamas":                      { conflict:"PSE", party:"Palestina" },
    "pij":                        { conflict:"PSE", party:"Palestina" },
    "islamic jihad":              { conflict:"PSE", party:"Palestina" },
    "qassam brigades":            { conflict:"PSE", party:"Palestina" },

    /* ══ Arabisch ══ */
    "هيئة تحرير الشام":           { conflict:"SYR", party:"Al-Sharaa-regering" },
    "جبهة النصرة":                { conflict:"SYR", party:"Al-Sharaa-regering" },
    "قوات سوريا الديمقراطية":     { conflict:"SYR", party:"Al-Sharaa-regering" },
    "قسد":                        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "الدروز":                     { conflict:"SYR", party:"Druze-milities" },
    "حزب الله":                   { conflict:"LBN", party:"Hezbollah" },
    "الحوثي":                     { conflict:"YEM", party:"Houthi's" },
    "الحوثيون":                   { conflict:"YEM", party:"Houthi's" },
    "الجيش الروسي":               { conflict:"UKR", party:"Rusland" },
    "الجيش الأوكراني":            { conflict:"UKR", party:"Oekraïne" },
    "قوات الدعم السريع":          { conflict:"SDN", party:"RSF" },
    "حماس":                       { conflict:"PSE", party:"Palestina" },
    "داعش":                       { conflict:"SYR", party:"IS" }
  };

  var GENERIC = {
    "syrian government":  { conflict:"SYR", party:"Al-Sharaa-regering" },
    "syrian army":        { conflict:"SYR", party:"Al-Sharaa-regering" },
    "syria":              { conflict:"SYR", party:"Al-Sharaa-regering" },
    "assad":              { conflict:"SYR", party:"Al-Sharaa-regering" },
    "lebanese government":{ conflict:"LBN", party:"Libanese staat" },
    "lebanon":            { conflict:"LBN", party:"Libanese staat" },
    "israeli army":       { conflict:"ISR", party:"Israël" },
    "israel":             { conflict:"ISR", party:"Israël" },
    "yemen":              { conflict:"YEM", party:"Regering" },
    "russia":             { conflict:"UKR", party:"Rusland" },
    "ukraine":            { conflict:"UKR", party:"Oekraïne" },
    "sudan":              { conflict:"SDN", party:"Regering" },
    "saudi arabia":       { conflict:"SAU", party:"Saoedi-Arabië" },
    "palestine":          { conflict:"PSE", party:"Palestina" },
    "iraq":               { conflict:"IRQ", party:"Regering" },
    "mali":               { conflict:"MLI", party:"Junta (Regering)" },
    "burkina faso":       { conflict:"BFA", party:"Junta (Regering)" },
    "niger":              { conflict:"NER", party:"Junta (Regering)" },
    "ethiopia":           { conflict:"ETH", party:"Federale regering" },
    "myanmar":            { conflict:"MMR", party:"Militaire junta" },
    "pakistan":           { conflict:"PAK", party:"Pakistan (Regering)" },
    "الجيش السوري":       { conflict:"SYR", party:"Al-Sharaa-regering" },
    "سوريا":              { conflict:"SYR", party:"Al-Sharaa-regering" },
    "دمشق":               { conflict:"SYR", party:"Al-Sharaa-regering" },
    "لبنان":              { conflict:"LBN", party:"Libanese staat" },
    "إسرائيل":            { conflict:"ISR", party:"Israël" },
    "اليمن":              { conflict:"YEM", party:"Regering" },
    "روسيا":              { conflict:"UKR", party:"Rusland" },
    "أوكرانيا":           { conflict:"UKR", party:"Oekraïne" },
    "السودان":            { conflict:"SDN", party:"Regering" },
    "السعودية":           { conflict:"SAU", party:"Saoedi-Arabië" },
    "فلسطين":             { conflict:"PSE", party:"Palestina" }
  };

  function compileTable(table){
    var keys = Object.keys(table);
    keys.sort(function(a, b){ return b.length - a.length; });
    return keys.map(function(k){ return { key: k, value: table[k], len: k.length }; });
  }

  var SPECIFIC_KEYS = compileTable(SPECIFIC);
  var GENERIC_KEYS  = compileTable(GENERIC);

  function normalize(text){
    if (!text) return "";
    return String(text).toLowerCase()
      .replace(/[«»„"]/g, "")
      .replace(/[()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasWordBoundaries(haystack, idx, keyLen){
    var before = idx === 0 ? " " : haystack.charAt(idx - 1);
    var after = (idx + keyLen >= haystack.length) ? " " : haystack.charAt(idx + keyLen);
    var beforeOk = /[^\w]/.test(before) || before === " ";
    var afterOk = /[^\w]/.test(after) || after === " ";
    if (/[\u0600-\u06FF]/.test(before)) beforeOk = true;
    if (/[\u0600-\u06FF]/.test(after)) afterOk = true;
    return beforeOk && afterOk;
  }

  function tryTable(compiled, haystack){
    for (var i = 0; i < compiled.length; i++){
      var entry = compiled[i];
      var idx = haystack.indexOf(entry.key);
      if (idx === -1) continue;
      if (!hasWordBoundaries(haystack, idx, entry.len)) continue;
      return { value: entry.value, matched: entry.key };
    }
    return null;
  }

  function resolveActor(text){
    if (!text) return null;
    var norm = normalize(text);
    if (!norm) return null;
    var specific = tryTable(SPECIFIC_KEYS, norm);
    if (specific){
      return { conflict: specific.value.conflict, party: specific.value.party, tier: "specific", matched: specific.matched };
    }
    var generic = tryTable(GENERIC_KEYS, norm);
    if (generic){
      return { conflict: generic.value.conflict, party: generic.value.party, tier: "generic", matched: generic.matched };
    }
    return null;
  }

  function resolveFromCandidates(titleText, countryCandidates){
    var fromText = resolveActor(titleText);
    if (fromText) return fromText;
    if (Array.isArray(countryCandidates)){
      for (var i = 0; i < countryCandidates.length; i++){
        var c = countryCandidates[i];
        if (!c) continue;
        var r = resolveActor(c);
        if (r) return r;
      }
    }
    return null;
  }

  function matchParty(label, parties){
    if (!label || !parties) return null;
    if (parties[label]) return label;
    var low = String(label).toLowerCase().trim();
    if (!low) return null;
    var best = null, bestLen = 0;
    for (var k in parties){
      if (!Object.prototype.hasOwnProperty.call(parties, k)) continue;
      var kl = k.toLowerCase();
      if (kl === low) return k;
      if (low.indexOf(kl) !== -1 && kl.length > bestLen){ best = k; bestLen = kl.length; }
      if (kl.indexOf(low) !== -1 && low.length > bestLen){ best = k; bestLen = low.length; }
    }
    return best;
  }

  window.WDCityActors = {
    version: "v2.0",
    resolve: resolveActor,
    resolveFromCandidates: resolveFromCandidates,
    matchParty: matchParty,
    _specific: SPECIFIC,
    _generic: GENERIC
  };

  window.WDResolveCityActor = resolveActor;

  try {
    if (window.wdLog) {
      wdLog.info("[CityActors] v2.0 geladen — " +
        Object.keys(SPECIFIC).length + " specifieke + " +
        Object.keys(GENERIC).length + " generieke actors (okt 2026)");
    }
  } catch(e){}

})();