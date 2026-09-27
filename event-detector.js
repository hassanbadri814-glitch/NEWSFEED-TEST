/* ============================================================
   WAR DESK — event-detector.js v1.0
   Detecteert of een artikel een FYSIEKE militaire actie beschrijft.
   
   Doel: alleen fysieke acties (raketaanval, beschieting, etc.)
   tellen mee voor de wereldkaart-hitte. Een minister die
   "praat over Gaza" is geen militair event.
   ============================================================ */

(function(){
  "use strict";

  window.WDEventDetectorVersion = "v1.0";

  /* ============================================================
     ACTIE-WERKWOORDEN — fysieke militaire acties
     ============================================================ */
  var ACTION_PATTERNS = [
    /* ==== NL ==== */
    { re: /\b(raakte|raakten|getroffen|treft)\b/i, type: "strike" },
    { re: /\b(aanviel|aanvielen|viel aan|vielen aan|aanvalt)\b/i, type: "attack" },
    { re: /\b(bombardeerde|bombardeerden|gebombardeerd|bombardement)\b/i, type: "bombing" },
    { re: /\b(beschoot|beschoten|beschieting|beschietingen)\b/i, type: "shelling" },
    { re: /\b(lanceerde|lanceerden|afgevuurd|gelanceerd|lanceert)\b/i, type: "launch" },
    { re: /\b(doodde|doodden|gedood|dodelijk getroffen)\b/i, type: "kill" },
    { re: /\b(verwondde|verwondden|verwond geraakt|gewond geraakt|gewonden vielen)\b/i, type: "wound" },
    { re: /\b(veroverde|veroverden|ingenomen|innam|innamen|heroverd|heroverde)\b/i, type: "capture" },
    { re: /\b(viel binnen|vielen binnen|binnengevallen|invasie)\b/i, type: "invasion" },
    { re: /\b(neerschoot|neergeschoten|neergehaald|onderschept)\b/i, type: "shootdown" },
    { re: /\b(ontplofte|ontploften|opgeblazen|explosie|explosies)\b/i, type: "explosion" },
    { re: /\b(raketaanval|raketinslag|luchtaanval|droneaanval|drone-aanval|mortieraanval|artillerievuur|granaatinslag)\b/i, type: "specific-strike" },
    { re: /\b(gevecht|gevechten|vuurgevecht|grondgevecht|grondgevechten)\b/i, type: "combat" },

    /* ==== EN ==== */
    { re: /\b(struck|strikes|striking|hit|hits|hitting)\b/i, type: "strike" },
    { re: /\b(attacked|attacks|attacking)\b/i, type: "attack" },
    { re: /\b(bombed|bombing|bombardment|bombardments)\b/i, type: "bombing" },
    { re: /\b(shelled|shelling)\b/i, type: "shelling" },
    { re: /\b(fired|firing|launched|launching|launches)\b/i, type: "launch" },
    { re: /\b(killed|kills|killing|dead|deaths)\b/i, type: "kill" },
    { re: /\b(wounded|injured|injures|injuring|casualties)\b/i, type: "wound" },
    { re: /\b(captured|seized|seizing|captures|overran)\b/i, type: "capture" },
    { re: /\b(invaded|invading|invasion)\b/i, type: "invasion" },
    { re: /\b(shot down|downed|intercepted|intercepts)\b/i, type: "shootdown" },
    { re: /\b(exploded|explodes|explosion|blast|blasts)\b/i, type: "explosion" },
    { re: /\b(airstrike|missile strike|drone strike|artillery fire|rocket attack)\b/i, type: "specific-strike" },
    { re: /\b(combat|clashes|fighting|firefight)\b/i, type: "combat" },

    /* ==== FR ==== */
    { re: /\b(frappé|frappe|frappes)\b/i, type: "strike" },
    { re: /\b(attaqué|attaque|attaques)\b/i, type: "attack" },
    { re: /\b(bombardé|bombardement)\b/i, type: "bombing" },
    { re: /\b(tué|tués|mort|morts)\b/i, type: "kill" },
    { re: /\b(blessé|blessés)\b/i, type: "wound" },
    { re: /\b(invasion|envahi|envahie)\b/i, type: "invasion" },

    /* ==== DE ==== */
    { re: /\b(getroffen|treffer|angriff|angriffe)\b/i, type: "strike" },
    { re: /\b(angegriffen|greift an)\b/i, type: "attack" },
    { re: /\b(bombardiert|bombardement)\b/i, type: "bombing" },
    { re: /\b(getötet|tote|tötet|tot)\b/i, type: "kill" },
    { re: /\b(verletzt|verletzte)\b/i, type: "wound" },
    { re: /\b(invasion|invadiert)\b/i, type: "invasion" },

    /* ==== AR ==== */
    { re: /قصف|غارة|غارات|ضربة|ضربات/, type: "strike" },
    { re: /هجوم|هجمات|اعتداء/, type: "attack" },
    { re: /قتل|قتلى|مقتل|مصرع/, type: "kill" },
    { re: /جرح|جرحى|إصابات/, type: "wound" },
    { re: /انفجار|انفجارات|تفجير/, type: "explosion" },
    { re: /صاروخ|صواريخ|قذيفة|قذائف/, type: "launch" },
    { re: /احتلال|غزو|اجتياح/, type: "invasion" },
    { re: /معارك|قتال|اشتباكات/, type: "combat" }
  ];

  /* ============================================================
     REPORT-WERKWOORDEN — communicatie, geen fysieke actie
     (alleen gebruikt om vast te stellen of het puur report is)
     ============================================================ */
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

  /* ============================================================
     PREFIXES — rapport-modus
     ============================================================ */
  var PREFIX_PATTERNS = [
    /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
    /^report\s*:/i, /^analysis\s*:/i, /^opinion\s*:/i,
    /^commentary\s*:/i, /^update\s*:/i, /^updates?\s*:/i,
    /^watch\s*:/i, /^video\s*:/i, /^exclusive\s*:/i,
    /^breaking\s*:/i, /^interview\s*:/i,
    /^en\s*direct/i
  ];

  /* ============================================================
     BRON-LAND — thuisbasis van de bron
     Deze worden NOOIT als event-locatie gebruikt.
     ============================================================ */
  var SOURCE_COUNTRY = {
    /* Nederlandse bronnen */
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

    /* Belgische bronnen */
    "HLN": "België", "Nieuwsblad": "België", "De Standaard": "België",
    "VRT NWS": "België", "De Morgen": "België", "De Tijd": "België",

    /* Duitse bronnen */
    "Spiegel": "Duitsland", "Bild": "Duitsland", "Zeit": "Duitsland",
    "FAZ": "Duitsland", "Süddeutsche": "Duitsland",
    "Tagesschau": "Duitsland", "Die Welt": "Duitsland",

    /* Franse bronnen */
    "Le Monde": "Frankrijk", "FranceInfo": "Frankrijk",
    "Libération": "Frankrijk", "France24 EN": "Frankrijk",
    "France24 AR": "Frankrijk",

    /* Italiaanse bronnen */
    "Corriere della Sera": "Italië", "Repubblica": "Italië",
    "La Stampa": "Italië", "ANSA": "Italië",

    /* VK bronnen */
    "BBC UK": "VK", "BBC World": "VK", "BBC Arabic": "VK",
    "Guardian UK": "VK", "Guardian": "VK",
    "Telegraph": "VK", "Sky News": "VK", "Independent": "VK", "FT": "VK",

    /* VS bronnen */
    "NYT US": "VS", "NYT World": "VS", "CNN": "VS",
    "Washington Post": "VS", "NPR": "VS",
    "AP News": "VS", "Reuters": "VK", "Reuters TG": "VK",

    /* Arabisch */
    "Al Jazeera": "Qatar", "Al Jazeera AR": "Qatar",
    "Al Jazeera AR TG": "Qatar",
    "Al Arabiya TG": "Saudi-Arabië", "Arab News": "Saudi-Arabië",
    "Saudi Gazette": "Saudi-Arabië",
    "The National": "VAE", "Gulf News": "VAE",
    "The Peninsula": "Qatar",
    "Asharq Al-Awsat": "Saudi-Arabië",
    "Al-Ahram": "Egypte", "Egypt Independent": "Egypte",
    "CNN Arabic": "VAE",
    "Al Quds Al Arabi": "VK",
    "Anadolu AR": "Turkije", "TRT World": "Turkije",

    /* Marokko */
    "Hespress": "Marokko", "Le360": "Marokko",
    "MAP": "Marokko", "Yabiladi": "Marokko",
    "Lakome2": "Marokko", "TelQuel": "Marokko",
    "Bladna.nl": "Marokko", "Marokko.nl": "Marokko",

    /* Conflictlanden */
    "Times of Israel": "Israël", "Jerusalem Post": "Israël",
    "Ynet": "Israël",
    "Kyiv Independent": "Oekraïne", "Ukrinform": "Oekraïne",
    "RT News": "Rusland", "RT Arabic": "Rusland", "TASS": "Rusland",
    "Mehr News Iran": "Iran",
    "SANA": "Syrië", "SABA Yemen": "Jemen",
    "Enab Baladi": "Syrië",
    "Sudan Tribune": "Sudan", "Radio Dabanga": "Sudan",
    "L'Orient-Le Jour": "Libanon", "Naharnet": "Libanon",

    /* OSINT */
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
     HOOFDFUNCTIES
     ============================================================ */
  function findActionVerbs(text) {
    var found = [];
    ACTION_PATTERNS.forEach(function(p) {
      if (p.re.test(text)) {
        found.push({ type: p.type });
      }
    });
    return found;
  }

  function findReportVerbs(text) {
    var found = [];
    REPORT_PATTERNS.forEach(function(p) {
      if (p.test(text)) {
        found.push(p.source);
      }
    });
    return found;
  }

  function hasPrefix(title) {
    for (var i = 0; i < PREFIX_PATTERNS.length; i++) {
      if (PREFIX_PATTERNS[i].test(title)) return true;
    }
    return false;
  }

  /* ============================================================
     ANALYSE
     ============================================================ */
  function analyze(title, desc) {
    title = String(title || "");
    desc = String(desc || "");
    var text = title + " " + desc;

    var prefixMatch = hasPrefix(title);
    var actionMatches = findActionVerbs(text);
    var reportMatches = findReportVerbs(text);

    /* Case 1: prefix + geen actie → report */
    if (prefixMatch && actionMatches.length === 0) {
      return {
        isPhysicalEvent: false,
        actionTypes: [],
        actionCount: 0,
        reportMatch: reportMatches.length > 0,
        prefixMatch: prefixMatch,
        reason: "prefix-no-action"
      };
    }

    /* Case 2: geen actie-verb → geen fysieke actie */
    if (actionMatches.length === 0) {
      return {
        isPhysicalEvent: false,
        actionTypes: [],
        actionCount: 0,
        reportMatch: reportMatches.length > 0,
        prefixMatch: prefixMatch,
        reason: reportMatches.length > 0 ? "report-only" : "no-action-verb"
      };
    }

    /* Case 3: actie-verbs → fysiek event (ongeacht report-verbs) */
    var types = [];
    actionMatches.forEach(function(m) {
      if (types.indexOf(m.type) === -1) types.push(m.type);
    });

    return {
      isPhysicalEvent: true,
      actionTypes: types,
      actionCount: actionMatches.length,
      reportMatch: reportMatches.length > 0,
      prefixMatch: prefixMatch,
      reason: "action-found"
    };
  }

  function getSourceCountry(sourceName) {
    return SOURCE_COUNTRY[sourceName] || null;
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.WDEventDetector = {
    analyze: analyze,
    findActionVerbs: findActionVerbs,
    findReportVerbs: findReportVerbs,
    hasPrefix: hasPrefix,
    getSourceCountry: getSourceCountry,
    _actionPatterns: ACTION_PATTERNS,
    _reportPatterns: REPORT_PATTERNS,
    _sourceCountry: SOURCE_COUNTRY
  };

  try {
    if (window.wdLog) {
      wdLog.info("[EventDetector] v1.0 geladen — " +
        ACTION_PATTERNS.length + " actie-patronen, " +
        REPORT_PATTERNS.length + " report-patronen");
    }
  } catch(e){}

})();