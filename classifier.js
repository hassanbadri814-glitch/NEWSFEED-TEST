/* ============================================================
   WAR DESK — classifier.js v1.0
   Centrale classificatie van artikelen in 4 categorieën:
   Militair / Crime / Politiek / Civiel
   
   - Gewogen woordenlijsten (3=sterk, 2=context, 1=zwak)
   - 5 talen: NL, EN, AR, FR, DE
   - Conflictgebied-bonus
   - OSINT-bron-bonus
   - Terrorisme-regel (context-afhankelijk)
   - Subtype-detectie
   - Confidence + twijfel-indicator
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";

  /* ============================================================
     WOORDENLIJSTEN
     ============================================================ */

  var W_MILITAIR = {
    /* ===== Gewicht 3 — sterk signaal ===== */
    "raketaanval":3, "raketaanvallen":3, "raketinslag":3, "raket":3, "raketten":3,
    "missile":3, "missiles":3, "missile strike":3,
    "drone":3, "drones":3, "uav":3, "drone-aanval":3, "droneaanval":3,
    "bombardement":3, "bombardementen":3, "bombing":3, "bombardment":3,
    "luchtaanval":3, "luchtaanvallen":3, "airstrike":3, "air strike":3,
    "beschieting":3, "beschietingen":3, "shelling":3,
    "mortier":3, "mortar":3, "mortieraanval":3,
    "artillerie":3, "artillery":3,
    "granaat":3, "granaten":3, "grenade":3,
    "invasie":3, "invasion":3, "invaded":3,
    "offensief":3, "offensive":3, "tegenoffensief":3, "counteroffensive":3,
    "aanval":3, "aanvallen":3, "attack":3, "attacks":3, "assault":3,
    "gevechtsvliegtuig":3, "fighter jet":3,
    "tank":3, "tanks":3,
    "luchtafweer":3, "air defense":3,
    "onderschept":3, "intercepted":3,
    "staakt-het-vuren":3, "ceasefire":3, "wapenstilstand":3,
    "escalatie":3, "escalation":3,
    "bombardeerde":3, "bombardeert":3,

    /* ===== Gewicht 2 — context ===== */
    "militair":2, "militaire":2, "military":2,
    "leger":2, "army":2,
    "troepen":2, "troops":2,
    "soldaat":2, "soldaten":2, "soldier":2, "soldiers":2,
    "idf":2, "hamas":2, "hezbollah":2, "houthi":2, "houthis":2,
    "taliban":2, "isis":2, "al-qaeda":2, "alqaeda":2,
    "nato":2, "navo":2,
    "frontlinie":2, "frontline":2,
    "gevecht":2, "gevechten":2, "fighting":2, "combat":2,
    "oorlog":2, "war":2, "conflict":2,
    "genocide":2, "etnische-zuivering":2,
    "bezetting":2, "occupation":2, "occupied":2,
    "bevrijding":2, "liberation":2,
    "wapen":2, "wapens":2, "weapon":2, "weapons":2,
    "grens":2, "border":2,
    "krijgsmacht":2, "defensie":2, "defense":2,
    "vredesoverleg":2, "peace-talks":2,
    "staatsgreep":2, "coup":2,

    /* ===== Gewicht 1 — zwak ===== */
    "gesneuveld":1, "gesneuvelde":1,
    "front":1, "slagveld":1, "battlefield":1
  };

  var W_CRIME = {
    /* ===== Gewicht 3 — gewelddadig ===== */
    "moord":3, "vermoord":3, "moorden":3, "moordenaar":3,
    "neergeschoten":3, "neergestoken":3,
    "doodslag":3, "doodde":3,
    "overval":3, "overvallen":3, "beroving":3,
    "ontvoering":3, "ontvoerd":3, "kidnapping":3,
    "gijzeling":3, "gijzelaar":3, "gijzelaars":3, "hostage":3, "hostages":3,
    "schietpartij":3, "schietincident":3,
    "wapenhandel":3, "mensensmokkel":3,

    /* ===== Gewicht 3 — niet-gewelddadig ===== */
    "fraude":3, "oplichting":3, "opgelicht":3,
    "phishing":3, "hacking":3, "hackers":3, "cyberaanval":3, "cyberattack":3,
    "drugssmokkel":3, "drugshandel":3,
    "witwassen":3, "witwasserij":3,
    "corruptie":3, "corrupt":3,
    "omkoping":3, "steekpenningen":3,
    "belastingfraude":3,
    "identiteitsdiefstal":3,

    /* ===== Gewicht 2 ===== */
    "verdachte":2, "verdachten":2, "suspect":2, "suspects":2,
    "arrestatie":2, "arrestaties":2, "arrested":2,
    "veroordeeld":2, "convicted":2,
    "drugs":2, "drug":2, "drugsbaron":2, "drugsbende":2,
    "kartel":2, "cartel":2,
    "bende":2, "bendes":2, "gang":2,
    "crimineel":2, "criminal":2,
    "politieonderzoek":2, "politie-onderzoek":2,
    "witwaspraktijken":2,
    "helers":2, "heling":2,
    "oplichters":2,

    /* ===== Gewicht 1 ===== */
    "gepakt":1, "opgepakt":1,
    "celstraf":1, "rechtbank":1, "rechter":1, "court":1,
    "aanklacht":1, "charged":1,
    "boete":1, "boetes":1,
    "onderzoek":1
  };

  var W_POLITIEK = {
    /* ===== Gewicht 3 ===== */
    "verkiezing":3, "verkiezingen":3, "election":3, "elections":3,
    "referendum":3,
    "wetsvoorstel":3,
    "motie-van-wantrouwen":3,
    "regeringscrisis":3,
    "kabinet-valt":3,

    /* ===== Gewicht 2 ===== */
    "parlement":2, "parliament":2,
    "tweede-kamer":2, "eerste-kamer":2,
    "coalitie":2, "coalition":2,
    "kabinet":2, "cabinet":2,
    "regering":2, "government":2,
    "president":2, "premier":2, "prime-minister":2,
    "minister":2, "ministers":2,
    "diplomatiek":2, "diplomatic":2,
    "sanctie":2, "sancties":2, "sanctions":2,
    "verdrag":2, "treaty":2,
    "ambassadeur":2, "ambassador":2,
    "staatsbezoek":2,
    "presidentsverkiezing":2,
    "parlementsverkiezing":2,
    "coalities":2,

    /* ===== Gewicht 1 ===== */
    "politiek":1, "political":1,
    "partij":1, "party":1,
    "campagne":1, "campaign":1,
    "debat":1, "debate":1,
    "stem":1, "vote":1,
    "stemmen":1, "voters":1
  };

  var W_CIVIEL = {
    /* ===== Gewicht 3 — sterk civiel ===== */
    "barbecue":3, "barbecues":3,
    "verkeersongeval":3, "verkeersongeluk":3,
    "botsing":3, "aanrijding":3, "aanrijdingen":3,
    "file":3, "files":3,
    "woningbrand":3, "keukenbrand":3, "flatbrand":3,
    "gaslek":3, "gasontploffing":3,
    "koolmonoxide":3, "co-vergiftiging":3,
    "verdronken":3, "verdrinking":3,
    "lawine":3, "lawines":3,
    "overstroming":3, "overstromingen":3, "flood":3, "flooding":3,
    "aardbeving":3, "earthquake":3,
    "vliegtuigongeluk":3, "vliegramp":3, "plane crash":3,
    "treinongeluk":3, "treinramp":3,
    "instorting":3, "collapse":3,
    "ontruiming":3, "evacuatie":3, "evacuation":3,
    "natuurramp":3, "natural disaster":3,
    "steekvlam":3,
    "koolmonoxidevergiftiging":3,

    /* ===== Gewicht 2 ===== */
    "ongeluk":2, "accident":2,
    "brandweer":2, "fire department":2,
    "ambulance":2,
    "vermiste":2, "vermist":2, "missing":2,
    "storm":2, "orkaan":2, "hurricane":2, "typhoon":2,
    "tornado":2,
    "bosbrand":2, "wildfire":2,
    "droogte":2, "drought":2,
    "hittegolf":2, "heatwave":2,
    "toeristen":2, "tourists":2,
    "vakantiegangers":2,

    /* ===== Gewicht 1 — zwak/neutraal ===== */
    "gewond":1, "gewonden":1, "wounded":1,
    "gedood":1, "doden":1, "killed":1, "dead":1, "deaths":1,
    "slachtoffer":1, "slachtoffers":1, "victims":1,
    "dodelijk":1, "dodelijke":1, "fatal":1,
    "gewonde":1, "injured":1
  };

  /* ============================================================
     TERRORISME-WOORDEN (context-afhankelijk)
     ============================================================ */
  var TERRORISM_WORDS = [
    "aanslag", "aanslagen", "terrorist", "terroristen", "terrorisme",
    "zelfmoordaanslag", "zelfmoordenaar",
    "bomaanslag", "autobom", "autobomaanslag",
    "suicide attack", "suicide bomber", "terrorism", "terrorist attack"
  ];

  /* ============================================================
     LOCATIES
     ============================================================ */
  var CONFLICT_ZONES = [
    "gaza", "israel", "israël", "palestijn", "palestina", "palestinian",
    "westelijke jordaanoever", "west bank", "ramallah", "jenin", "hebron",
    "libanon", "lebanon", "beiroet", "beirut", "nabatieh",
    "syrië", "syria", "damascus", "damaskus", "aleppo", "idlib", "homs",
    "oekraïne", "ukraine", "kyiv", "kiev", "kharkiv", "odesa", "odessa",
    "donbas", "donetsk", "luhansk", "marioepol", "mariupol", "bachmoet", "bakhmut",
    "zaporizhzhia", "cherson", "kherson", "avdiivka", "kramatorsk", "sloviansk",
    "rusland", "russia", "moskou", "moscow", "belgorod", "koersk", "kursk",
    "bryansk", "rostov", "voronezh", "saratov",
    "krim", "crimea", "sevastopol",
    "jemen", "yemen", "sanaa", "aden", "houthi", "houthis",
    "soedan", "sudan", "khartoum", "darfur",
    "irak", "iraq", "bagdad", "baghdad", "mosul", "erbil",
    "iran", "teheran", "tehran", "isfahan",
    "afghanistan", "kabul", "kandahar",
    "congo", "goma", "kinshasa", "drc",
    "mali", "bamako", "timbuktu",
    "burkina faso", "ouagadougou",
    "niger", "niamey",
    "myanmar", "burma",
    "kashmir", "kasjmir",
    "libië", "libya", "tripoli", "benghazi",
    "somalië", "somalia", "mogadishu",
    "ethiopië", "ethiopia", "tigray",
    "mozambique", "cabo delgado",
    "haïti", "haiti"
  ];

  var INSTABLE_ZONES = [
    "sahel", "nigeria", "chad", "tsjaad",
    "zuid-soedan", "south sudan", "juba",
    "burundi", "rwanda", "uganda",
    "venezuela", "colombia",
    "mexico"
  ];

  /* ============================================================
     OSINT-bronnen (bonus voor Militair)
     ============================================================ */
  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash report", "isw", "war mapper",
    "reuters tg", "al jazeera ar tg", "al arabiya tg",
    "middle east eye tg", "kyiv independent"
  ];

  /* ============================================================
     PRECOMPILED REGEX PATTERNS (performance)
     ============================================================ */

  function compilePattern(word) {
    var w = String(word).toLowerCase();
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/[\u0600-\u06FF]/.test(w)) {
      return new RegExp(esc, 'i');
    }
    if (w.length < 4) {
      return new RegExp('\\b' + esc + '\\b', 'i');
    }
    return new RegExp('\\b' + esc + '\\w*', 'i');
  }

  function compileMap(map) {
    var out = [];
    for (var w in map) {
      out.push({ word: w, weight: map[w], pattern: compilePattern(w) });
    }
    return out;
  }

  var P_MILITAIR = compileMap(W_MILITAIR);
  var P_CRIME = compileMap(W_CRIME);
  var P_POLITIEK = compileMap(W_POLITIEK);
  var P_CIVIEL = compileMap(W_CIVIEL);

  var P_TERROR = TERRORISM_WORDS.map(function(w){
    return { word: w, pattern: compilePattern(w) };
  });
  var P_CONFLICT = CONFLICT_ZONES.map(function(w){
    return { word: w, pattern: compilePattern(w) };
  });
  var P_INSTABLE = INSTABLE_ZONES.map(function(w){
    return { word: w, pattern: compilePattern(w) };
  });

  /* ============================================================
     MATCH HELPERS
     ============================================================ */

  function countMatches(text, patterns) {
    var score = 0;
    var hits = [];
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      if (p.pattern.test(text)) {
        score += p.weight;
        hits.push({ word: p.word, weight: p.weight });
      }
    }
    return { score: score, hits: hits };
  }

  function findMatch(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].pattern.test(text)) return patterns[i].word;
    }
    return null;
  }

  /* ============================================================
     SUBTYPE-DETECTIE
     ============================================================ */

  function detectMilitairSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/\braketaanval|raketinslag|missile|\braket\b/.test(text)) return "Raketaanval";
    if (/\bdrone|uav/.test(text)) return "Drone-aanval";
    if (/\bbombardement|bombing|bombardment/.test(text)) return "Bombardement";
    if (/\bluchtaanval|airstrike|air strike/.test(text)) return "Luchtaanval";
    if (/\bbeschieting|shelling/.test(text)) return "Beschieting";
    if (/\bartillerie|mortier|artillery|mortar/.test(text)) return "Artillerie";
    if (/\binvasie|invasion/.test(text)) return "Invasie";
    if (/\btegenoffensief|counteroffensive/.test(text)) return "Tegenoffensief";
    if (/\boffensief|offensive/.test(text)) return "Offensief";
    if (/\bgevecht|combat|fighting/.test(text)) return "Grondgevecht";
    if (/\baanval|attack|assault/.test(text)) return "Aanval";
    return "Conflict";
  }

  function detectCrimeSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/\bmoord|vermoord|doodslag|neergeschoten|neergestoken/.test(text)) return "Moord";
    if (/\boverval|beroving/.test(text)) return "Overval";
    if (/\bontvoering|gijzeling|kidnapping|hostage/.test(text)) return "Ontvoering";
    if (/\bschietpartij|schietincident/.test(text)) return "Schietpartij";
    if (/\bfraude|oplichting|omkoping|belastingfraude/.test(text)) return "Fraude";
    if (/\bphishing|hacking|cyber/.test(text)) return "Cyber";
    if (/\bdrugs|kartel|drugshandel/.test(text)) return "Drugs";
    if (/\bcorruptie/.test(text)) return "Corruptie";
    if (/\bwitwassen/.test(text)) return "Witwassen";
    if (/\bwapenhandel/.test(text)) return "Wapenhandel";
    if (/\bmensensmokkel/.test(text)) return "Mensenhandel";
    return "Misdaad";
  }

  function detectPolitiekSubtype(text) {
    if (/\bverkiezing|election/.test(text)) return "Verkiezing";
    if (/\breferendum/.test(text)) return "Referendum";
    if (/\bstaatsgreep|coup/.test(text)) return "Staatsgreep";
    if (/\bsanctie|sanctions/.test(text)) return "Sanctie";
    if (/\bdiplomatiek|verdrag|vredesoverleg|treaty/.test(text)) return "Diplomatie";
    if (/\bregeringscrisis/.test(text)) return "Regeringscrisis";
    if (/\bwetsvoorstel|motie/.test(text)) return "Wetgeving";
    return "Politiek";
  }

  function detectCivielSubtype(text) {
    if (/\bverkeersongeval|botsing|aanrijding|\bfile\b/.test(text)) return "Verkeer";
    if (/\bwoningbrand|keukenbrand|flatbrand|bosbrand|\bbrand\b/.test(text)) return "Brand";
    if (/\bgaslek|gasontploffing|koolmonoxide/.test(text)) return "Ongeluk";
    if (/\boverstroming|lawine|\bstorm\b|orkaan|tornado|flood/.test(text)) return "Natuur";
    if (/\baardbeving|earthquake/.test(text)) return "Aardbeving";
    if (/\bvliegtuigongeluk|vliegramp|plane crash/.test(text)) return "Vliegtuig";
    if (/\btreinongeluk|treinramp/.test(text)) return "Trein";
    if (/\bverdronken|verdrinking/.test(text)) return "Verdrinking";
    if (/\bvermiste|vermist|missing/.test(text)) return "Vermissing";
    if (/\bontruiming|evacuatie|evacuation/.test(text)) return "Evacuatie";
    if (/\bbarbecue/.test(text)) return "Barbecue";
    return "Ongeluk";
  }

  /* ============================================================
     HOOFDFUNCTIE
     ============================================================ */

  function classify(title, desc, source, url) {
    var text = String((title || "") + " " + (desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();

    /* 1. Basis-scores */
    var mRes = countMatches(text, P_MILITAIR);
    var cRes = countMatches(text, P_CRIME);
    var pRes = countMatches(text, P_POLITIEK);
    var ciRes = countMatches(text, P_CIVIEL);

    var mScore = mRes.score;
    var cScore = cRes.score;
    var pScore = pRes.score;
    var ciScore = ciRes.score;

    /* 2. Locatie-bonus voor Militair */
    var conflictLocation = findMatch(text, P_CONFLICT);
    var instableLocation = findMatch(text, P_INSTABLE);
    var locationBonus = 0;
    if (conflictLocation) {
      locationBonus = 2;
      mScore += 2;
    } else if (instableLocation) {
      locationBonus = 1;
      mScore += 1;
    }

    /* 3. OSINT bron-bonus */
    var isOsint = false;
    for (var i = 0; i < OSINT_SOURCES.length; i++) {
      if (sourceLower.indexOf(OSINT_SOURCES[i]) !== -1) {
        isOsint = true;
        mScore += 2;
        break;
      }
    }

    /* 4. Terrorisme-regel */
    var terrorWord = findMatch(text, P_TERROR);
    var isTerror = false;
    if (terrorWord) {
      isTerror = true;
      if (conflictLocation) {
        mScore += 5;
      } else {
        cScore += 5;
      }
    }

    /* 5. Civiel-blokkade: sterk civiel woord + alleen zwakke militaire signalen → Militair op 0 */
    var hasStrongCiviel = false;
    for (var ci = 0; ci < ciRes.hits.length; ci++) {
      if (ciRes.hits[ci].weight === 3) { hasStrongCiviel = true; break; }
    }
    if (hasStrongCiviel) {
      var hasStrongMilitary = false;
      for (var mi = 0; mi < mRes.hits.length; mi++) {
        if (mRes.hits[mi].weight >= 3) { hasStrongMilitary = true; break; }
      }
      if (!hasStrongMilitary) {
        mScore = 0;
      }
    }

    /* 6. Bepaal winnaar met tiebreaker: Militair > Crime > Politiek > Civiel */
    var scores = [
      { cat: "militair", score: mScore },
      { cat: "crime", score: cScore },
      { cat: "politiek", score: pScore },
      { cat: "civiel", score: ciScore }
    ];
    var priority = { "militair": 4, "crime": 3, "politiek": 2, "civiel": 1 };
    scores.sort(function(a, b){
      if (b.score !== a.score) return b.score - a.score;
      return priority[b.cat] - priority[a.cat];
    });

    var winner = scores[0];
    var runnerUp = scores[1];
    var maxScore = winner.score;
    var secondScore = runnerUp.score;

    /* 7. Geen enkel signaal → Civiel als opvangbak */
    if (maxScore === 0) {
      winner = { cat: "civiel", score: 0 };
      secondScore = 0;
    }

    /* 8. Confidence */
    var confidence = 0;
    if (maxScore === 0) confidence = 0;
    else if (secondScore === 0) confidence = 100;
    else {
      var ratio = maxScore / secondScore;
      if (ratio >= 3) confidence = 95;
      else if (ratio >= 2) confidence = 85;
      else if (ratio >= 1.5) confidence = 70;
      else confidence = 55;
    }
    var uncertain = (confidence > 0 && confidence < 65);

    /* 9. Subtype */
    var subtype = "";
    if (winner.cat === "militair") subtype = detectMilitairSubtype(text, isTerror);
    else if (winner.cat === "crime") subtype = detectCrimeSubtype(text, isTerror);
    else if (winner.cat === "politiek") subtype = detectPolitiekSubtype(text);
    else subtype = detectCivielSubtype(text);

    return {
      category: winner.cat,
      subtype: subtype,
      confidence: confidence,
      uncertain: uncertain,
      scores: {
        militair: mScore,
        crime: cScore,
        politiek: pScore,
        civiel: ciScore
      },
      signals: {
        militair: mRes.hits,
        crime: cRes.hits,
        politiek: pRes.hits,
        civiel: ciRes.hits
      },
      meta: {
        conflictLocation: conflictLocation,
        instableLocation: instableLocation,
        locationBonus: locationBonus,
        isOsint: isOsint,
        terrorWord: terrorWord,
        isTerror: isTerror
      }
    };
  }

  /* ============================================================
     EXPORT
     ============================================================ */

  window.WDClassifier = {
    version: VERSION,
    classify: classify,
    _words: {
      militair: W_MILITAIR,
      crime: W_CRIME,
      politiek: W_POLITIEK,
      civiel: W_CIVIEL
    },
    _locations: {
      conflict: CONFLICT_ZONES,
      instable: INSTABLE_ZONES
    },
    _terrorism: TERRORISM_WORDS
  };

  try {
    if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen");
  } catch(e){}

})();