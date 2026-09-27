/* ============================================================
   WAR DESK — event-detector.js v1.5
   - v1.5: extractCityEvent (control + attack types)
   - v1.4: future-threats uitgebreid
   - v1.3: extractCityClaim
   ============================================================ */

(function(){
  "use strict";

  window.WDEventDetectorVersion = "v1.5";

  var ACTION_PATTERNS = [
    { re: /\b(raakte|raakten|getroffen|treft|treffen|raken)\b/i, type: "strike" },
    { re: /\b(aanviel|aanvielen|viel aan|vielen aan|aanvalt|aanvallen)\b/i, type: "attack" },
    { re: /\b(bombardeerde|bombardeerden|gebombardeerd|bombardement|bombardementen)\b/i, type: "bombing" },
    { re: /\b(beschoot|beschoten|beschieting|beschietingen)\b/i, type: "shelling" },
    { re: /\b(lanceerde|lanceerden|afgevuurd|gelanceerd|lanceert|lanceren)\b/i, type: "launch" },
    { re: /\b(doodde|doodden|gedood|dodelijk getroffen)\b/i, type: "kill" },
    { re: /\b(verwondde|verwondden|verwond geraakt|gewond geraakt|gewonden vielen)\b/i, type: "wound" },
    { re: /\b(veroverde|veroverden|ingenomen|innam|innamen|heroverd|heroverde|heroveren)\b/i, type: "capture" },
    { re: /\b(viel binnen|vielen binnen|binnengevallen|invasie|invasies)\b/i, type: "invasion" },
    { re: /\b(neerschoot|neergeschoten|neergehaald|onderschept|onderscheppen|neerhalen)\b/i, type: "shootdown" },
    { re: /\b(ontplofte|ontploften|opgeblazen|explosie|explosies|ontploffing|ontploffingen)\b/i, type: "explosion" },
    { re: /\b(raketaanval|raketinslag|luchtaanval|droneaanval|drone-aanval|mortieraanval|artillerievuur|granaatinslag)\b/i, type: "specific-strike" },
    { re: /\b(gevecht|gevechten|vuurgevecht|grondgevecht|grondgevechten)\b/i, type: "combat" },
    { re: /\b(offensief|offensieven|tegenoffensief)\b/i, type: "offensive" },

    { re: /\b(struck|strikes|striking|hit|hits|hitting)\b/i, type: "strike" },
    { re: /\b(attacked|attacks|attacking)\b/i, type: "attack" },
    { re: /\b(bombed|bombing|bombings|bombardment|bombardments)\b/i, type: "bombing" },
    { re: /\b(shelled|shelling|shells)\b/i, type: "shelling" },
    { re: /\b(fired|fires|firing|launched|launches|launching)\b/i, type: "launch" },
    { re: /\b(killed|kills|killing|dead|deaths)\b/i, type: "kill" },
    { re: /\b(wounded|injured|injures|injuring|casualties)\b/i, type: "wound" },
    { re: /\b(captured|seized|seizing|captures|overran|overruns)\b/i, type: "capture" },
    { re: /\b(invaded|invading|invasion|invasions)\b/i, type: "invasion" },
    { re: /\b(shot down|shoots down|shooting down|downed|downs|intercepted|intercepts|intercepting)\b/i, type: "shootdown" },
    { re: /\b(exploded|explodes|exploding|explosion|explosions|blast|blasts)\b/i, type: "explosion" },
    { re: /\b(airstrikes?|air strikes?|missile strikes?|drone strikes?|artillery fire|rocket attacks?)\b/i, type: "specific-strike" },
    { re: /\b(combat|clashes|fighting|firefight|battle|battles)\b/i, type: "combat" },
    { re: /\b(offensive|offensives|counteroffensive|counter-offensive)\b/i, type: "offensive" },
    { re: /\b(raid|raids|raided|raiding)\b/i, type: "raid" },
    { re: /\b(repelled|repelling|repels)\b/i, type: "defense" },
    { re: /\b(counterattack|counterattacks|counter-attack|counter-attacks)\b/i, type: "attack" },

    { re: /\b(targeted|targets|targeting)\b/i, type: "strike" },
    { re: /\b(rocket|missile|drone) (attacks?|strikes?|launch(es)?|barrages?)\b/i, type: "specific-strike" },
    { re: /\b(barrage|barrages|salvo|salvos) of\b/i, type: "launch" },
    { re: /\b(warplanes?|jets?|fighter jets?|aircraft|planes?|bombers?)\s+(hit|struck|attacked|bombed|targeted|carried out|launched)/i, type: "specific-strike" },
    { re: /\b(carried out|launched|conducted|mounted)\s+\d*\s*(airstrikes?|attacks?|strikes?|raids?|offensives?|operations?|bombardments?)/i, type: "specific-strike" },
    { re: /\b(air raid|air raids)\b/i, type: "specific-strike" },

    { re: /\b(frappé|frappe|frappes)\b/i, type: "strike" },
    { re: /\b(attaqué|attaque|attaques)\b/i, type: "attack" },
    { re: /\b(bombardé|bombardement|bombardements)\b/i, type: "bombing" },
    { re: /\b(tué|tués|mort|morts)\b/i, type: "kill" },
    { re: /\b(blessé|blessés)\b/i, type: "wound" },
    { re: /\b(invasion|envahi|envahie)\b/i, type: "invasion" },

    { re: /\b(getroffen|treffer|angriff|angriffe)\b/i, type: "strike" },
    { re: /\b(angegriffen|greift an)\b/i, type: "attack" },
    { re: /\b(bombardiert|bombardement)\b/i, type: "bombing" },
    { re: /\b(getötet|tote|tötet|tot)\b/i, type: "kill" },
    { re: /\b(verletzt|verletzte)\b/i, type: "wound" },
    { re: /\b(invasion|invadiert)\b/i, type: "invasion" },

    { re: /قصف|غارة|غارات|ضربة|ضربات/, type: "strike" },
    { re: /هجوم|هجمات|اعتداء/, type: "attack" },
    { re: /قتل|قتلى|مقتل|مصرع/, type: "kill" },
    { re: /جرح|جرحى|إصابات/, type: "wound" },
    { re: /انفجار|انفجارات|تفجير/, type: "explosion" },
    { re: /صاروخ|صواريخ|قذيفة|قذائف/, type: "launch" },
    { re: /احتلال|غزو|اجتياح/, type: "invasion" },
    { re: /معارك|قتال|اشتباكات/, type: "combat" }
  ];

  var REPORT_PATTERNS = [
    /\b(says?|said|stated|declares?|declared|announces?|announced)\b/i,
    /\b(warns?|warned|highlights?|highlighted)\b/i,
    /\b(discusses?|discussed|talks?|talked|meets?|met|meeting)\b/i,
    /\b(claims?|claimed|alleges?|alleged)\b/i,
    /\b(condemns?|condemned|urges?|urged|calls? for|called for)\b/i,
    /\b(zegt|zei|verklaart|verklaarde|beweert|beweerde|stelt|stelde)\b/i,
    /\b(waarschuwt|waarschuwde|benadrukt|benadrukte|onderstreept|onderstreepte)\b/i,
    /\b(bespreekt|besprak|overlegt|overlegde|ontmoet|ontmoette|ontmoeting)\b/i,
    /\b(reageert|reageerde|reageerden|reactie)\b/i,
    /\b(volgens|naar verluidt)\b/i,
    /\b(according to|reportedly|allegedly)\b/i,
    /\b(selon|d'après)\b/i,
    /\b(laut|berichtet|meldet)\b/i,
    /قال|صرح|أعلن|وفقا|حسب/
  ];

  var FUTURE_PATTERNS = [
    /\b(ready for|ready to|preparing to|prepared to|about to|will attack|will strike|will launch|will fire|planning to|plans to|threatens to|vows to|says will|announces will|promises to|intends to)\b/i,
    /\b(klaar voor|bereid om|op het punt om|zal aanvallen|zal toeslaan|dreigt met|belooft te|van plan is)\b/i,
    /\b(prêt à|va attaquer|menace de)\b/i,
    /\b(bereit für|wird angreifen|droht mit)\b/i,
    /مستعد ل|يهدد بـ|سيهاجم/,
    /\b(voices?\s+readiness|voiced?\s+readiness)\b/i,
    /\b(ready\s+for\s+potential|ready\s+for\s+any|ready\s+for\s+renewed)\b/i,
    /\b(potential\s+(renewed\s+)?(attack|strike|offensive|war|conflict))\b/i,
    /\b(prepares?\s+for\s+(potential\s+)?(attack|strike|war|offensive|invasion))\b/i,
    /\b(braces?\s+for\s+(potential\s+)?(attack|strike|war|offensive))\b/i,
    /\b(warns?\s+of\s+(potential\s+)?(attack|strike|war|offensive))\b/i,
    /\b(threatens?\s+(renewed\s+|potential\s+)?(attack|strike|war))\b/i,
    /\b(await(s|ing)?\s+(us\s+)?(response|attack|strike))\b/i,
    /\b(rhetoric|rhetorisch|verbale\s+dreiging)\b/i
  ];

  var PREFIX_PATTERNS = [
    /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
    /^report\s*:/i, /^analysis\s*:/i, /^opinion\s*:/i,
    /^commentary\s*:/i, /^update\s*:/i, /^updates?\s*:/i,
    /^watch\s*:/i, /^video\s*:/i, /^exclusive\s*:/i,
    /^breaking\s*:/i, /^interview\s*:/i,
    /^en\s*direct/i
  ];

  var SOURCE_COUNTRY = {
    "NOS": "Nederland", "NOS Sport": "Nederland", "NOS Voetbal": "Nederland",
    "De Telegraaf": "Nederland", "AD.nl": "Nederland",
    "De Volkskrant": "Nederland", "Het Parool": "Nederland",
    "Trouw": "Nederland", "RTL Nieuws": "Nederland", "Nu.nl": "Nederland",
    "Omroep Brabant": "Nederland", "Omroep Flevoland": "Nederland",
    "NH Nieuws": "Nederland", "RTV Utrecht": "Nederland",
    "Omroep Gelderland": "Nederland", "L1": "Nederland",
    "RTV Oost": "Nederland", "Omroep West": "Nederland",
    "ESPN NL": "Nederland", "NUsport": "Nederland", "RTL Sport": "Nederland",
    "Voetbalnieuws": "Nederland", "Voetbalzone": "Nederland",
    "Voetbalprimeur": "Nederland", "FCUpdate": "Nederland",
    "Soccernews": "Nederland", "Glory Kickboxing": "Nederland",
    "MMA DNA": "Nederland",
    "HLN": "België", "Nieuwsblad": "België", "De Standaard": "België",
    "VRT NWS": "België", "De Morgen": "België", "De Tijd": "België",
    "Spiegel": "Duitsland", "Bild": "Duitsland", "Zeit": "Duitsland",
    "FAZ": "Duitsland", "Süddeutsche": "Duitsland",
    "Tagesschau": "Duitsland", "Die Welt": "Duitsland",
    "Le Monde": "Frankrijk", "FranceInfo": "Frankrijk",
    "Libération": "Frankrijk", "France24 EN": "Frankrijk",
    "France24 AR": "Frankrijk",
    "Corriere della Sera": "Italië", "Repubblica": "Italië",
    "La Stampa": "Italië", "ANSA": "Italië",
    "BBC UK": "VK", "BBC World": "VK", "BBC Arabic": "VK",
    "Guardian UK": "VK", "Guardian": "VK",
    "Telegraph": "VK", "Sky News": "VK", "Independent": "VK", "FT": "VK",
    "NYT US": "VS", "NYT World": "VS", "CNN": "VS",
    "Washington Post": "VS", "NPR": "VS",
    "AP News": "VS", "Reuters": "VK", "Reuters TG": "VK",
    "Al Jazeera": "Qatar", "Al Jazeera AR": "Qatar",
    "Al Jazeera AR TG": "Qatar",
    "Al Arabiya TG": "Saudi-Arabië", "Arab News": "Saudi-Arabië",
    "Saudi Gazette": "Saudi-Arabië",
    "The National": "VAE", "Gulf News": "VAE",
    "The Peninsula": "Qatar",
    "Asharq Al-Awsat": "Saudi-Arabië",
    "Al-Ahram": "Egypte", "Egypt Independent": "Egypte",
    "CNN Arabic": "VAE", "Al Quds Al Arabi": "VK",
    "Anadolu AR": "Turkije", "TRT World": "Turkije",
    "Hespress": "Marokko", "Le360": "Marokko",
    "MAP": "Marokko", "Yabiladi": "Marokko",
    "Lakome2": "Marokko", "TelQuel": "Marokko",
    "Bladna.nl": "Marokko", "Marokko.nl": "Marokko",
    "Times of Israel": "Israël", "Jerusalem Post": "Israël",
    "Ynet": "Israël",
    "Kyiv Independent": "Oekraïne", "Ukrinform": "Oekraïne",
    "RT News": "Rusland", "RT Arabic": "Rusland", "TASS": "Rusland",
    "Mehr News Iran": "Iran",
    "SANA": "Syrië", "SABA Yemen": "Jemen",
    "Enab Baladi": "Syrië",
    "Sudan Tribune": "Sudan", "Radio Dabanga": "Sudan",
    "L'Orient-Le Jour": "Libanon", "Naharnet": "Libanon",
    "Liveuamap TG": "Oekraïne",
    "GeoConfirmed TG": "Oekraïne",
    "OSINTdefender TG": "VS",
    "Faytuks TG": "VS",
    "NOELreports TG": "Nederland",
    "Clash Report TG": "Turkije",
    "Middle East Eye": "VK", "Middle East Eye TG": "VK",
    "Al Monitor": "VS",
    "Middle East Monitor": "VK",
    "Mondoweiss": "VS",
    "Japan Times": "Japan"
  };

  /* ============================================================
     v1.5: CITY-EVENT PATRONEN
     ============================================================ */
  var CITY_CONTROL_PATTERNS = [
    /\b(captured|captures|capturing|seized|seizes|seizing|overran|overruns|took|taken|takes)\b/i,
    /\b(retook|retaken|retakes|reclaimed|reclaims|reclaiming|recaptured|recaptures)\b/i,
    /\b(lib(erated|erates|erating))\b/i,
    /\b(took|taken|takes)\s+control\s+of\b/i,
    /\b(veroverde|veroverd|veroverden|veroveren|innam|innamen|innemen|ingenomen)\b/i,
    /\b(heroverd|heroverde|heroverden|heroveren|bevrijd|bevrijdde|bevrijdden|bevrijden)\b/i,
    /\b(nam|namen)\s+.*\s+in\b/i,
    /\b(capturé|capture|capturent|repris|reprirent|libéré|libéra)\b/i,
    /\b(eingenommen|einnahm|erobert|eroberte|befreit|befreite)\b/i,
    /سيطر|استولى|حرر|دخل/
  ];

  var CITY_ATTACK_PATTERNS = [
    /\b(attacked|attacks|attacking|hit|hits|hitting|struck|strikes|striking)\b/i,
    /\b(shelled|shelling|shells|bombed|bombing|bombardment)\b/i,
    /\b(targeted|targets|targeting)\b/i,
    /\b(raakte|raakten|getroffen|treft|beschoten|beschieting)\b/i,
    /\b(bombardeerde|bombardeerden|gebombardeerd)\b/i,
    /\b(aangevallen|aanvalt|aanvielen|beschoot)\b/i,
    /\b(frappé|attaqué|attaques|bombardé)\b/i,
    /\b(angegriffen|getroffen|bombardiert)\b/i,
    /قصف|غارة|غارات|هجوم|اعتداء|ضربة/
  ];

  function findActionVerbs(text) {
    var found = [];
    ACTION_PATTERNS.forEach(function(p) {
      if (p.re.test(text)) found.push({ type: p.type });
    });
    return found;
  }

  function findReportVerbs(text) {
    var found = [];
    REPORT_PATTERNS.forEach(function(p) {
      if (p.test(text)) found.push(p.source);
    });
    return found;
  }

  function findFuturePatterns(text) {
    var found = [];
    FUTURE_PATTERNS.forEach(function(p) {
      if (p.test(text)) found.push(p.source);
    });
    return found;
  }

  function hasPrefix(title) {
    for (var i = 0; i < PREFIX_PATTERNS.length; i++) {
      if (PREFIX_PATTERNS[i].test(title)) return true;
    }
    return false;
  }

  function hasControlAction(text) {
    for (var i = 0; i < CITY_CONTROL_PATTERNS.length; i++) {
      if (CITY_CONTROL_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  function hasAttackAction(text) {
    for (var i = 0; i < CITY_ATTACK_PATTERNS.length; i++) {
      if (CITY_ATTACK_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  function analyze(title, desc) {
    title = String(title || "");
    desc = String(desc || "");
    var text = title + " " + desc;

    var prefixMatch = hasPrefix(title);
    var actionMatches = findActionVerbs(text);
    var reportMatches = findReportVerbs(text);
    var futureMatches = findFuturePatterns(text);

    if (prefixMatch && actionMatches.length === 0) {
      return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reportMatch: reportMatches.length > 0, prefixMatch: prefixMatch, futureMatch: false, reason: "prefix-no-action" };
    }

    if (actionMatches.length === 0) {
      return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reportMatch: reportMatches.length > 0, prefixMatch: prefixMatch, futureMatch: futureMatches.length > 0, reason: reportMatches.length > 0 ? "report-only" : "no-action-verb" };
    }

    if (futureMatches.length > 0 && actionMatches.length <= 2) {
      return { isPhysicalEvent: false, actionTypes: [], actionCount: 0, reportMatch: reportMatches.length > 0, prefixMatch: prefixMatch, futureMatch: true, reason: "future-threat" };
    }

    var types = [];
    actionMatches.forEach(function(m) {
      if (types.indexOf(m.type) === -1) types.push(m.type);
    });

    return { isPhysicalEvent: true, actionTypes: types, actionCount: actionMatches.length, reportMatch: reportMatches.length > 0, prefixMatch: prefixMatch, futureMatch: futureMatches.length > 0, reason: "action-found" };
  }

  /* ============================================================
     v1.5: EXTRACT CITY EVENT (control of attack)
     ============================================================ */
  function findCityInText(text){
    if (!window.__wm_locations) return null;
    var lower = " " + String(text || "").toLowerCase().replace(/[^\w\sÀ-ÿ-]/g, " ").replace(/\s+/g, " ").trim() + " ";
    var bestCity = null;
    var bestLen = 0;
    for (var key in window.__wm_locations){
      if (!Object.prototype.hasOwnProperty.call(window.__wm_locations, key)) continue;
      if (key.length <= bestLen) continue;
      if (key.length < 4) continue;
      if (lower.indexOf(" " + key + " ") !== -1){
        bestCity = key;
        bestLen = key.length;
      }
    }
    return bestCity;
  }

  function extractCityEvent(title, desc, actorCountries){
    title = String(title || "");
    desc = String(desc || "");
    var text = title + " " + desc;

    var cityKey = findCityInText(text);
    if (!cityKey) return null;
    if (!actorCountries || !actorCountries.length) return null;

    var actorName = actorCountries[0];
    var actorISO3 = null;
    try {
      if (window.WorldMapData && window.WorldMapData.getISO3){
        actorISO3 = window.WorldMapData.getISO3(actorName);
      }
    } catch(e){}

    var type = null;
    if (hasControlAction(text)) type = "control";
    else if (hasAttackAction(text)) type = "attack";

    if (!type) return null;

    return {
      city: cityKey,
      type: type,
      actor: actorName,
      actorISO3: actorISO3
    };
  }

  /* Backwards-compat: oude extractCityClaim → nu de control-variant */
  function extractCityClaim(title, desc, actorCountries){
    var ev = extractCityEvent(title, desc, actorCountries);
    if (ev && ev.type === "control") return ev;
    return null;
  }

  function getSourceCountry(sourceName) {
    return SOURCE_COUNTRY[sourceName] || null;
  }

  window.WDEventDetector = {
    analyze: analyze,
    findActionVerbs: findActionVerbs,
    findReportVerbs: findReportVerbs,
    findFuturePatterns: findFuturePatterns,
    hasPrefix: hasPrefix,
    hasControlAction: hasControlAction,
    hasAttackAction: hasAttackAction,
    extractCityEvent: extractCityEvent,
    extractCityClaim: extractCityClaim,
    getSourceCountry: getSourceCountry,
    _actionPatterns: ACTION_PATTERNS,
    _reportPatterns: REPORT_PATTERNS,
    _futurePatterns: FUTURE_PATTERNS,
    _controlPatterns: CITY_CONTROL_PATTERNS,
    _attackPatterns: CITY_ATTACK_PATTERNS,
    _sourceCountry: SOURCE_COUNTRY
  };

  try {
    if (window.wdLog) {
      wdLog.info("[EventDetector] v1.5 geladen — " +
        ACTION_PATTERNS.length + " acties, " +
        CITY_CONTROL_PATTERNS.length + " control, " +
        CITY_ATTACK_PATTERNS.length + " attack");
    }
  } catch(e){}

})();