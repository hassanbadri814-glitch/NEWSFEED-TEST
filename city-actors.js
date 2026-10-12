/* ============================================================
   WAR DESK — city-actors.js v1.0
   - Canonieke actor-resolver: tekst → { conflict, party, tier }
   - Twee-lagen: SPECIFIC (gewapende groepen) wint van GENERIC
     (staten/regeringen) — "HTS in Syrië" → HTS, niet Syrië.
   - Latijns + Arabisch + ISO3-fallback.
   ============================================================ */

(function(){
  "use strict";

  window.WD_CITY_ACTORS_VERSION = "v1.0";

  /* ────────────────────────────────────────────────────────────
     SPECIFIC — gewapende groepen / niet-statelijke actoren.
     Woorden hier worden ALTIJD geprefereerd boven GENERIC.
     ──────────────────────────────────────────────────────────── */
  var SPECIFIC = {
    /* ══ SYRIË ══ */
    "hayat tahrir al-sham":       { conflict:"SYR", party:"HTS" },
    "hay'at tahrir al-sham":      { conflict:"SYR", party:"HTS" },
    "hayat tahrir al sham":       { conflict:"SYR", party:"HTS" },
    "jabhat al-nusra":            { conflict:"SYR", party:"HTS" },
    "jabhat al nusra":            { conflict:"SYR", party:"HTS" },
    "al-nusra front":             { conflict:"SYR", party:"HTS" },
    "al nusra front":             { conflict:"SYR", party:"HTS" },
    "nusra front":                { conflict:"SYR", party:"HTS" },
    "hts":                        { conflict:"SYR", party:"HTS" },
    "nusra":                      { conflict:"SYR", party:"HTS" },
    "al-nusra":                   { conflict:"SYR", party:"HTS" },
    "al nusra":                   { conflict:"SYR", party:"HTS" },

    "syrian democratic forces":   { conflict:"SYR", party:"SDF" },
    "syrian democratic force":    { conflict:"SYR", party:"SDF" },
    "sdf":                        { conflict:"SYR", party:"SDF" },
    "ypg":                        { conflict:"SYR", party:"SDF" },
    "ypj":                        { conflict:"SYR", party:"SDF" },
    "pkk":                        { conflict:"SYR", party:"SDF" },
    "kurdish forces":             { conflict:"SYR", party:"SDF" },
    "kurdish-led":                { conflict:"SYR", party:"SDF" },

    "free syrian army":           { conflict:"SYR", party:"Syrische oppositie" },
    "syrian opposition":          { conflict:"SYR", party:"Syrische oppositie" },
    "syrian opposition forces":   { conflict:"SYR", party:"Syrische oppositie" },
    "national liberation front":  { conflict:"SYR", party:"Syrische oppositie" },
    "fsa":                        { conflict:"SYR", party:"Syrische oppositie" },
    "sna":                        { conflict:"SYR", party:"Syrische oppositie" },
    "syrian national army":       { conflict:"SYR", party:"Syrische oppositie" },

    "jabal al-druze":             { conflict:"SYR", party:"Druze" },
    "jabal al druze":             { conflict:"SYR", party:"Druze" },
    "druze militia":              { conflict:"SYR", party:"Druze" },
    "druze forces":               { conflict:"SYR", party:"Druze" },
    "druze":                      { conflict:"SYR", party:"Druze" },

    "islamic state":              { conflict:"SYR", party:"IS" },
    "isis":                       { conflict:"SYR", party:"IS" },
    "isil":                       { conflict:"SYR", party:"IS" },
    "daesh":                      { conflict:"SYR", party:"IS" },

    "idf":                        { conflict:"ISR", party:"Israël" },

    /* ══ LIBANON ══ */
    "hezbollah":                  { conflict:"LBN", party:"Hezbollah" },
    "hizbollah":                  { conflict:"LBN", party:"Hezbollah" },
    "hizballah":                  { conflict:"LBN", party:"Hezbollah" },
    "hizbullah":                  { conflict:"LBN", party:"Hezbollah" },
    "islamic resistance":         { conflict:"LBN", party:"Hezbollah" },
    "lebanese resistance":        { conflict:"LBN", party:"Hezbollah" },

    "lebanese army":              { conflict:"LBN", party:"Libanese staat" },
    "laf":                        { conflict:"LBN", party:"Libanese staat" },

    "idf":                        { conflict:"LBN", party:"Israël" },

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
    "southern transitional council":{ conflict:"YEM", party:"Regering" },

    /* ══ OEKRAÏNE ══ */
    "russian army":               { conflict:"UKR", party:"Rusland" },
    "russian forces":             { conflict:"UKR", party:"Rusland" },
    "russian military":           { conflict:"UKR", party:"Rusland" },
    "russian troops":             { conflict:"UKR", party:"Rusland" },
    "russian-backed":             { conflict:"UKR", party:"Rusland" },
    "kremlin forces":             { conflict:"UKR", party:"Rusland" },
    "wagner group":               { conflict:"UKR", party:"Rusland" },
    "wagner":                     { conflict:"UKR", party:"Rusland" },
    "afr":                        { conflict:"UKR", party:"Rusland" },

    "ukrainian army":             { conflict:"UKR", party:"Oekraïne" },
    "ukrainian forces":           { conflict:"UKR", party:"Oekraïne" },
    "ukrainian military":         { conflict:"UKR", party:"Oekraïne" },
    "ukrainian troops":           { conflict:"UKR", party:"Oekraïne" },
    "ukrainian defense":          { conflict:"UKR", party:"Oekraïne" },
    "afu":                        { conflict:"UKR", party:"Oekraïne" },
    "zsu":                        { conflict:"UKR", party:"Oekraïne" },
    "azov":                       { conflict:"UKR", party:"Oekraïne" },
    "territorial defense":        { conflict:"UKR", party:"Oekraïne" },

    /* ══ SOEDAN ══ */
    "rapid support forces":       { conflict:"SDN", party:"RSF" },
    "rapid support force":        { conflict:"SDN", party:"RSF" },
    "rsf":                        { conflict:"SDN", party:"RSF" },

    "sudanese army":              { conflict:"SDN", party:"Regering" },
    "sudanese armed forces":      { conflict:"SDN", party:"Regering" },
    "saf":                        { conflict:"SDN", party:"Regering" },

    /* ══ SAHEL — JNIM/IS ══ */
    "jama'at nasr al-islam":      { conflict:"MLI", party:"JNIM (Jihadisten)" },
    "jamaat nasr al-islam":       { conflict:"MLI", party:"JNIM (Jihadisten)" },
    "jnim":                       { conflict:"MLI", party:"JNIM (Jihadisten)" },

    "islamic state sahel":        { conflict:"MLI", party:"IS Sahel" },
    "is sahel":                   { conflict:"MLI", party:"IS Sahel" },
    "islamic state greater sahara":{ conflict:"MLI", party:"IS Sahel" },
    "isgs":                       { conflict:"MLI", party:"IS Sahel" },

    "boko haram":                 { conflict:"NER", party:"Boko Haram/ISWAP" },
    "iswap":                      { conflict:"NER", party:"Boko Haram/ISWAP" },

    /* ══ DRC ══ */
    "m23":                        { conflict:"COD", party:"M23/AFC" },
    "m23/afc":                    { conflict:"COD", party:"M23/AFC" },
    "afc":                        { conflict:"COD", party:"M23/AFC" },
    "fdlr":                       { conflict:"COD", party:"FDLR (Rwanda)" },

    "fardc":                      { conflict:"COD", party:"Regering (FARDC)" },
    "congolese army":             { conflict:"COD", party:"Regering (FARDC)" },

    /* ══ ETHIOPIË ══ */
    "tigray defense forces":      { conflict:"ETH", party:"TPLF (Tigray)" },
    "tigray people's liberation": { conflict:"ETH", party:"TPLF (Tigray)" },
    "tplf":                       { conflict:"ETH", party:"TPLF (Tigray)" },
    "tigray forces":              { conflict:"ETH", party:"TPLF (Tigray)" },

    "fano militia":               { conflict:"ETH", party:"Fano (Amhara)" },
    "fano":                       { conflict:"ETH", party:"Fano (Amhara)" },

    "oromo liberation army":      { conflict:"ETH", party:"OLA (Oromia)" },
    "ola":                        { conflict:"ETH", party:"OLA (Oromia)" },

    /* ══ MYANMAR ══ */
    "arakan army":                { conflict:"MMR", party:"Arakan Army" },
    "arakan":                     { conflict:"MMR", party:"Arakan Army" },
    "three brotherhood alliance": { conflict:"MMR", party:"Arakan Army" },
    "brotherhood alliance":       { conflict:"MMR", party:"Arakan Army" },

    "kachin independence army":   { conflict:"MMR", party:"KIA (Kachin)" },
    "kachin independence":        { conflict:"MMR", party:"KIA (Kachin)" },
    "kia":                        { conflict:"MMR", party:"KIA (Kachin)" },

    "karen national union":       { conflict:"MMR", party:"KNU (Karen)" },
    "karen national liberation":  { conflict:"MMR", party:"KNU (Karen)" },
    "knu":                        { conflict:"MMR", party:"KNU (Karen)" },

    "national unity government":  { conflict:"MMR", party:"NUG (verzet)" },
    "people's defense forces":    { conflict:"MMR", party:"NUG (verzet)" },
    "peoples defense forces":     { conflict:"MMR", party:"NUG (verzet)" },
    "pdf":                        { conflict:"MMR", party:"NUG (verzet)" },
    "nug":                        { conflict:"MMR", party:"NUG (verzet)" },

    "tatmadaw":                   { conflict:"MMR", party:"Militaire junta" },
    "military junta":             { conflict:"MMR", party:"Militaire junta" },
    "myanmar military":           { conflict:"MMR", party:"Militaire junta" },
    "junta forces":               { conflict:"MMR", party:"Militaire junta" },

    /* ══ PALESTINA ══ */
    "palestinian islamic jihad":  { conflict:"PSE", party:"Palestina" },
    "islamic jihad":              { conflict:"PSE", party:"Palestina" },
    "al-qassam brigades":         { conflict:"PSE", party:"Palestina" },
    "al qassam brigades":         { conflict:"PSE", party:"Palestina" },
    "qassam brigades":            { conflict:"PSE", party:"Palestina" },
    "hamas":                      { conflict:"PSE", party:"Palestina" },
    "pij":                        { conflict:"PSE", party:"Palestina" },

    /* ══ IRAK ══ */
    "popular mobilization forces":{ conflict:"IRQ", party:"Regering" },
    "popular mobilization":       { conflict:"IRQ", party:"Regering" },
    "hashd al-shaabi":            { conflict:"IRQ", party:"Regering" },
    "hashd al shaabi":            { conflict:"IRQ", party:"Regering" },
    "pmf":                        { conflict:"IRQ", party:"Regering" },

    "peshmerga":                  { conflict:"IRQ", party:"Regering" },

    /* ══ PAKISTAN ══ */
    "tehrik-i-taliban pakistan":  { conflict:"PAK", party:"Afghanistan (Taliban)" },
    "tehrik-i-taliban":           { conflict:"PAK", party:"Afghanistan (Taliban)" },
    "ttp":                        { conflict:"PAK", party:"Afghanistan (Taliban)" },
    "baloch liberation army":     { conflict:"PAK", party:"Afghanistan (Taliban)" },
    "bla":                        { conflict:"PAK", party:"Afghanistan (Taliban)" },

    /* ══ AFRIKA / OVERIG ══ */
    "al-shabaab":                 { conflict:"SOM", party:"Al-Shabaab" },
    "al shabaab":                 { conflict:"SOM", party:"Al-Shabaab" },
    "ash-shabaab":                { conflict:"SOM", party:"Al-Shabaab" },

    /* ══ Arabisch — SPECIFIC ══ */
    "هيئة تحرير الشام":           { conflict:"SYR", party:"HTS" },
    "جبهة النصرة":                { conflict:"SYR", party:"HTS" },
    "النصرة":                     { conflict:"SYR", party:"HTS" },
    "قوات سوريا الديمقراطية":     { conflict:"SYR", party:"SDF" },
    "قسد":                        { conflict:"SYR", party:"SDF" },
    "وحدات حماية الشعب":          { conflict:"SYR", party:"SDF" },
    "ي ب ك":                      { conflict:"SYR", party:"SDF" },
    "الجيش السوري الحر":          { conflict:"SYR", party:"Syrische oppositie" },
    "الجيش الوطني السوري":        { conflict:"SYR", party:"Syrische oppositie" },

    "الدروز":                     { conflict:"SYR", party:"Druze" },
    "جبل العرب":                  { conflict:"SYR", party:"Druze" },
    "الموحدون الدروز":            { conflict:"SYR", party:"Druze" },

    "حزب الله":                   { conflict:"LBN", party:"Hezbollah" },
    "المقاومة الإسلامية":         { conflict:"LBN", party:"Hezbollah" },
    "مقاومة لبنان":               { conflict:"LBN", party:"Hezbollah" },
    "ح ز ب الله":                 { conflict:"LBN", party:"Hezbollah" },

    "الحوثي":                     { conflict:"YEM", party:"Houthi's" },
    "الحوثيون":                   { conflict:"YEM", party:"Houthi's" },
    "أنصار الله":                 { conflict:"YEM", party:"Houthi's" },
    "جماعة الحوثي":               { conflict:"YEM", party:"Houthi's" },
    "ميليشيا الحوثي":             { conflict:"YEM", party:"Houthi's" },

    "الجيش الروسي":               { conflict:"UKR", party:"Rusland" },
    "القوات الروسية":             { conflict:"UKR", party:"Rusland" },
    "فاغنر":                      { conflict:"UKR", party:"Rusland" },

    "الجيش الأوكراني":            { conflict:"UKR", party:"Oekraïne" },
    "القوات الأوكرانية":          { conflict:"UKR", party:"Oekraïne" },

    "قوات الدعم السريع":          { conflict:"SDN", party:"RSF" },
    "الدعم السريع":               { conflict:"SDN", party:"RSF" },

    "الجيش السوداني":             { conflict:"SDN", party:"Regering" },

    "حماس":                       { conflict:"PSE", party:"Palestina" },
    "كتائب القسام":               { conflict:"PSE", party:"Palestina" },
    "الجهاد الإسلامي":            { conflict:"PSE", party:"Palestina" },
    "سرايا القدس":                { conflict:"PSE", party:"Palestina" },

    "الحشد الشعبي":               { conflict:"IRQ", party:"Regering" },
    "قوات البيشمركة":             { conflict:"IRQ", party:"Regering" },

    "داعش":                       { conflict:"SYR", party:"IS" },
    "تنظيم الدولة":               { conflict:"SYR", party:"IS" },
    "تنظيم الدولة الإسلامية":     { conflict:"SYR", party:"IS" },

    "طالبان":                     { conflict:"PAK", party:"Afghanistan (Taliban)" }
  };

  /* ────────────────────────────────────────────────────────────
     GENERIC — staten/regeringen. Alleen fallback.
     ──────────────────────────────────────────────────────────── */
  var GENERIC = {
    /* ══ SYRIË ══ */
    "syrian government":  { conflict:"SYR", party:"Regering" },
    "syrian regime":      { conflict:"SYR", party:"Regering" },
    "assad regime":       { conflict:"SYR", party:"Regering" },
    "assad forces":       { conflict:"SYR", party:"Regering" },
    "syrian army":        { conflict:"SYR", party:"Regering" },
    "damascus government":{ conflict:"SYR", party:"Regering" },
    "syria":              { conflict:"SYR", party:"Regering" },
    "assad":              { conflict:"SYR", party:"Regering" },

    /* ══ LIBANON ══ */
    "lebanese government":{ conflict:"LBN", party:"Libanese staat" },
    "lebanon":            { conflict:"LBN", party:"Libanese staat" },

    /* ══ ISRAËL ══ */
    "israeli army":       { conflict:"ISR", party:"Israël" },
    "israeli forces":     { conflict:"ISR", party:"Israël" },
    "israeli military":   { conflict:"ISR", party:"Israël" },
    "israel":             { conflict:"ISR", party:"Israël" },

    /* ══ JEMEN ══ */
    "yemen":              { conflict:"YEM", party:"Regering" },

    /* ══ OEKRAÏNE ══ */
    "russia":             { conflict:"UKR", party:"Rusland" },
    "moscow":             { conflict:"UKR", party:"Rusland" },
    "ukraine":            { conflict:"UKR", party:"Oekraïne" },
    "kyiv":               { conflict:"UKR", party:"Oekraïne" },

    /* ══ SOEDAN ══ */
    "sudan":              { conflict:"SDN", party:"Regering" },
    "khartoum":           { conflict:"SDN", party:"Regering" },

    /* ══ SAOEDI-ARABIË ══ */
    "saudi arabia":       { conflict:"SAU", party:"Saoedi-Arabië" },
    "saudi-led coalition":{ conflict:"SAU", party:"Saoedi-Arabië" },
    "saudi":              { conflict:"SAU", party:"Saoedi-Arabië" },

    /* ══ PALESTINA ══ */
    "palestine":          { conflict:"PSE", party:"Palestina" },
    "palestinian":        { conflict:"PSE", party:"Palestina" },

    /* ══ IRAK ══ */
    "iraqi army":         { conflict:"IRQ", party:"Regering" },
    "iraqi forces":       { conflict:"IRQ", party:"Regering" },
    "iraq":               { conflict:"IRQ", party:"Regering" },

    /* ══ SAHEL ══ */
    "mali":               { conflict:"MLI", party:"Junta (Regering)" },
    "burkina faso":       { conflict:"BFA", party:"Junta (Regering)" },
    "niger":              { conflict:"NER", party:"Junta (Regering)" },

    /* ══ DRC ══ */
    "congolese":          { conflict:"COD", party:"Regering (FARDC)" },
    "drc":                { conflict:"COD", party:"Regering (FARDC)" },
    "congo":              { conflict:"COD", party:"Regering (FARDC)" },

    /* ══ ETHIOPIË ══ */
    "ethiopian army":     { conflict:"ETH", party:"Federale regering" },
    "ethiopian forces":   { conflict:"ETH", party:"Federale regering" },
    "ethiopia":           { conflict:"ETH", party:"Federale regering" },

    /* ══ MYANMAR ══ */
    "myanmar army":       { conflict:"MMR", party:"Militaire junta" },
    "myanmar":            { conflict:"MMR", party:"Militaire junta" },
    "burma":              { conflict:"MMR", party:"Militaire junta" },

    /* ══ PAKISTAN ══ */
    "pakistani army":     { conflict:"PAK", party:"Pakistan (Regering)" },
    "pakistan":           { conflict:"PAK", party:"Pakistan (Regering)" },

    /* ══ Arabisch — GENERIC ══ */
    "الجيش السوري":       { conflict:"SYR", party:"Regering" },
    "قوات الأسد":         { conflict:"SYR", party:"Regering" },
    "النظام السوري":      { conflict:"SYR", party:"Regering" },
    "الجيش العربي السوري":{ conflict:"SYR", party:"Regering" },
    "قوات النظام":        { conflict:"SYR", party:"Regering" },
    "القوات الحكومية":    { conflict:"SYR", party:"Regering" },
    "دمشق":               { conflict:"SYR", party:"Regering" },
    "سوريا":              { conflict:"SYR", party:"Regering" },

    "الجيش اللبناني":     { conflict:"LBN", party:"Libanese staat" },
    "لبنان":              { conflict:"LBN", party:"Libanese staat" },
    "بيروت":              { conflict:"LBN", party:"Libanese staat" },

    "الجيش الإسرائيلي":   { conflict:"ISR", party:"Israël" },
    "إسرائيل":            { conflict:"ISR", party:"Israël" },
    "الاحتلال الإسرائيلي":{ conflict:"ISR", party:"Israël" },

    "الحكومة اليمنية":    { conflict:"YEM", party:"Regering" },
    "اليمن":              { conflict:"YEM", party:"Regering" },

    "روسيا":              { conflict:"UKR", party:"Rusland" },
    "موسكو":              { conflict:"UKR", party:"Rusland" },
    "أوكرانيا":           { conflict:"UKR", party:"Oekraïne" },
    "كييف":               { conflict:"UKR", party:"Oekraïne" },

    "السودان":            { conflict:"SDN", party:"Regering" },
    "الخرطوم":            { conflict:"SDN", party:"Regering" },

    "السعودية":           { conflict:"SAU", party:"Saoedi-Arabië" },

    "فلسطين":             { conflict:"PSE", party:"Palestina" },

    "العراق":             { conflict:"IRQ", party:"Regering" },
    "بغداد":              { conflict:"IRQ", party:"Regering" }
  };

  /* ────────────────────────────────────────────────────────────
     Precompileer lookup-tabellen op key-lengte (langste eerst).
     ──────────────────────────────────────────────────────────── */
  function compileTable(table){
    var keys = Object.keys(table);
    keys.sort(function(a, b){ return b.length - a.length; });
    return keys.map(function(k){
      return { key: k, value: table[k], len: k.length };
    });
  }

  var SPECIFIC_KEYS = compileTable(SPECIFIC);
  var GENERIC_KEYS  = compileTable(GENERIC);

  /* ────────────────────────────────────────────────────────────
     Normaliseer tekst — lowercase, verwijder onnodige tekens
     maar behoud spaties, koppeltekens en apostrofs.
     ──────────────────────────────────────────────────────────── */
  function normalize(text){
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/[«»""„"]/g, "")
      .replace(/[()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Woord-grens check: key mag niet midden in een ander woord zitten */
  function hasWordBoundaries(haystack, idx, keyLen){
    var before = idx === 0 ? " " : haystack.charAt(idx - 1);
    var after = (idx + keyLen >= haystack.length) ? " " : haystack.charAt(idx + keyLen);
    var beforeOk = /[^\w]/.test(before) || before === " ";
    var afterOk = /[^\w]/.test(after) || after === " ";
    /* Arabische tekens zijn \w in JS? Nee, \w = [A-Za-z0-9_].
       Dus Arabische buren zijn sowieso "non-word". Voor de zekerheid: */
    if (/[\u0600-\u06FF]/.test(before)) beforeOk = true;
    if (/[\u0600-\u06FF]/.test(after)) afterOk = true;
    return beforeOk && afterOk;
  }

  /* Probeer een tabel te matchen; return langste match of null */
  function tryTable(compiled, haystack){
    for (var i = 0; i < compiled.length; i++){
      var entry = compiled[i];
      var idx = haystack.indexOf(entry.key);
      if (idx === -1) continue;
      if (!hasWordBoundaries(haystack, idx, entry.len)) continue;
      return { value: entry.value, matched: entry.key, idx: idx };
    }
    return null;
  }

  /* ────────────────────────────────────────────────────────────
     Hoofd-API: resolveActor(text) → { conflict, party, tier } | null
     ──────────────────────────────────────────────────────────── */
  function resolveActor(text){
    if (!text) return null;
    var norm = normalize(text);
    if (!norm) return null;

    /* Stap 1: SPECIFIC (gewapende groepen) — hoogste prioriteit */
    var specific = tryTable(SPECIFIC_KEYS, norm);
    if (specific){
      return {
        conflict: specific.value.conflict,
        party: specific.value.party,
        tier: "specific",
        matched: specific.matched
      };
    }

    /* Stap 2: GENERIC (staten) — fallback */
    var generic = tryTable(GENERIC_KEYS, norm);
    if (generic){
      return {
        conflict: generic.value.conflict,
        party: generic.value.party,
        tier: "generic",
        matched: generic.matched
      };
    }

    return null;
  }

  /* ────────────────────────────────────────────────────────────
     Probeer eerst uit een array van landen (uit detectActorsInTitle)
     en val dan terug op vrije tekst.
     ──────────────────────────────────────────────────────────── */
  function resolveFromCandidates(titleText, countryCandidates){
    /* SPECIFIC uit ruwe tekst heeft altijd voorrang */
    var fromText = resolveActor(titleText);
    if (fromText && fromText.tier === "specific") return fromText;
    if (fromText && fromText.tier === "generic") return fromText;

    /* Fallback: kijk of één van de actorCountries alsnog matcht */
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

  /* ────────────────────────────────────────────────────────────
     Party lookup in een conflict-config (voor fuzzy match)
     ──────────────────────────────────────────────────────────── */
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
      if (low.indexOf(kl) !== -1 && kl.length > bestLen){
        best = k; bestLen = kl.length;
      }
      if (kl.indexOf(low) !== -1 && low.length > bestLen){
        best = k; bestLen = low.length;
      }
    }
    return best;
  }

  /* ────────────────────────────────────────────────────────────
     Debug: alle keys voor een gegeven conflict
     ──────────────────────────────────────────────────────────── */
  function actorsForConflict(conflictIso){
    var out = { specific: [], generic: [] };
    Object.keys(SPECIFIC).forEach(function(k){
      if (SPECIFIC[k].conflict === conflictIso) out.specific.push({ key:k, party:SPECIFIC[k].party });
    });
    Object.keys(GENERIC).forEach(function(k){
      if (GENERIC[k].conflict === conflictIso) out.generic.push({ key:k, party:GENERIC[k].party });
    });
    return out;
  }

  /* ────────────────────────────────────────────────────────────
     Publieke API
     ──────────────────────────────────────────────────────────── */
  window.WDCityActors = {
    version: "v1.0",
    resolve: resolveActor,
    resolveFromCandidates: resolveFromCandidates,
    matchParty: matchParty,
    actorsForConflict: actorsForConflict,
    _specific: SPECIFIC,
    _generic: GENERIC
  };

  /* Backwards-compat: korte naam */
  window.WDResolveCityActor = resolveActor;

  try {
    if (window.wdLog) {
      wdLog.info("[CityActors] v1.0 geladen — " +
        Object.keys(SPECIFIC).length + " specifieke + " +
        Object.keys(GENERIC).length + " generieke actors");
    }
  } catch(e){}

})();