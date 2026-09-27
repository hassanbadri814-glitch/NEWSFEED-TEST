/* ============================================================
   WAR DESK — classifier.js v2.3
   Waterdicht 5-categorie systeem — v2.3 fixes:

   1. hasMilitaryAction: ALLEEN actor + violence-verb
      (geen locatie-shortcut meer)
   2. Dreigingen (threatening/warns/denies/plots) → Politiek
   3. "Report:" prefix → Politiek
   4. Duits "gewarnt", "soll" toegevoegd
   5. "diplomacy", "FM", "foreign-minister" → Politiek
   6. Subtype fix: neergestoken → Steekpartij (was Moord)
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v2.3";
  var CATS = ["militair", "crime", "politiek", "protest", "civiel"];
  var PRIORITY = { militair: 5, crime: 4, politiek: 3, protest: 2, civiel: 1 };

  /* ===== MILITAIR ===== */
  var W_MILITAIR = {
    "raketaanval":3, "raketinslag":3, "kruisraket-afgevuurd":3,
    "ballistische-raket":3, "hypersonische-raket":3,
    "missile-strike":3, "missile-attack":3,
    "bombardement":3, "bombardementen":3, "bombing":3, "bombardment":3, "gebombardeerd":3,
    "luchtaanval":3, "luchtaanvallen":3, "airstrike":3, "air-strike":3,
    "beschieting":3, "beschietingen":3, "shelling":3, "beschoten":3,
    "mortier":3, "mortar":3, "mortieraanval":3,
    "artillerie":3, "artillery":3, "artillerievuur":3,
    "granaat":3, "granaten":3, "grenade":3,
    "invasie":3, "invasion":3, "invaded":3, "binnengevallen":3,
    "offensief":3, "offensive":3, "tegenoffensief":3, "counteroffensive":3,
    "bestorming":3, "bestormd":3,
    "gevecht":3, "gevechten":3, "fighting":3, "combat":3, "vuurgevecht":3,
    "drone-aanval":3, "droneaanval":3, "drone-strike":3,
    "oorlogshandeling":3, "oorlogsdaad":3,
    "staakt-het-vuren-geschonden":3,
    "escaleert":3, "escaleerde":3, "escalatie":2, "escalation":2,
    "luchtafweer-afgevuurd":3, "luchtafweer":3, "air-defense":3,
    "onderschept":3, "intercepted":3, "neergehaald":3, "downed":3,
    "aanval":2, "aanvallen":2, "attack":2, "attacks":2, "assault":2,
    "militair":2, "militaire":2, "military":2,
    "leger":2, "army":2, "krijgsmacht":2, "strijdkrachten":2,
    "troepen":2, "troops":2, "forces":2,
    "soldaat":2, "soldaten":2, "soldier":2, "soldiers":2,
    "fighter":2, "fighters":2, "strijder":2, "strijders":2,
    "idf":2, "israel-defense-forces":2, "hamas":2, "hezbollah":2,
    "houthi":2, "houthis":2, "taliban":2, "isis":2, "al-qaeda":2, "alqaeda":2,
    "al-shabaab":2, "boko-haram":2, "wagner":2,
    "armed-group":2, "gewapende-groep":2, "gewapende-groepering":2,
    "militants":2, "militant":2, "insurgents":2, "insurgent":2,
    "rebellen":2, "rebellenbeweging":2, "opstandelingen":2,
    "nato":2, "navo":2, "vn-vredesmacht":2, "un-peacekeepers":2,
    "frontlinie":2, "frontline":2, "front":2,
    "oorlog":2, "war":2,
    "wapen":2, "wapens":2, "weapon":2, "weapons":2,
    "patriot":2, "s-300":2, "s-400":2, "iron-dome":2,
    "paramilitaire":2, "huurlingen":2, "huursoldaten":2,
    "bevelhebber":2, "generaal":2, "kolonel":2, "commandant":2,
    "konvooi":2, "militaire-konvooi":2,
    "tank":2, "tanks":2, "pantservoertuig":2, "pantserwagen":2,
    "gevechtsvliegtuig":2, "fighter-jet":2, "straaljager":2,
    "marine":2, "warship":2, "fregat":2, "torpedo":2,
    "militair-doelwit":2, "militaire-installatie":2,
    "wapenstilstand":2, "staakt-het-vuren":2, "ceasefire":2,
    "gesneuveld":1, "gesneuvelde":1, "gesneuvelden":1,
    "oorlogsgebied":1, "conflictgebied":1, "crisisgebied":1,
    "slagveld":1, "battlefield":1,
    "veteraan":1, "veteranen":1,
    "conflict":1, "strijd":1
  };

  /* ===== CRIME ===== */
  var W_CRIME = {
    "moord":3, "vermoord":3, "moorden":3, "moordenaar":3, "moordenaars":3,
    "neergeschoten":3, "neergestoken":3, "neergeslagen":3,
    "doodslag":3, "doodde":3, "doodden":3,
    "overval":3, "overvallen":3, "beroving":3, "roofoverval":3,
    "ontvoering":3, "ontvoerd":3, "kidnapping":3, "gekidnapt":3,
    "gijzeling":3, "gijzelaar":3, "gijzelaars":3, "hostage":3, "hostages":3,
    "schietpartij":3, "schietincident":3, "shooting":3, "neerschieten":3,
    "steekpartij":3, "steekincident":3, "neersteken":3,
    "wapenhandel":3, "illegale-wapenhandel":3, "wapensmokkel":3,
    "mensensmokkel":3, "mensenhandel":3, "human-trafficking":3,
    "liquidatie":3, "afrekening":3, "vergelding":3,
    "marteling":3, "mishandeling":3, "zware-mishandeling":3,
    "verkrachting":3, "aanranding":3, "zedenmisdrijf":3,
    "kindermisbruik":3, "kinderporno":3, "seksuele-uitbuiting":3,
    "fraude":3, "fraudeur":3, "fraudeurs":3, "oplichting":3, "opgelicht":3,
    "phishing":3, "hacking":3, "hackers":3, "cyberaanval":3, "cyberattack":3,
    "ransomware":3, "malware":3, "datalek":3, "datalekken":3,
    "drugssmokkel":3, "drugshandel":3, "drugstransport":3,
    "witwassen":3, "witwasserij":3, "witwaspraktijken":3,
    "corruptie":3, "corrupt":3, "omkoping":3, "steekpenningen":3,
    "belastingfraude":3, "btw-fraude":3, "accijnsfraude":3,
    "identiteitsdiefstal":3, "identiteitsfraude":3,
    "valsemunterij":3, "valsheid-in-geschrifte":3,
    "milieucriminaliteit":3, "illegale-afvaldump":3,
    "namaak":3, "productpiraterij":3, "marktmanipulatie":3,
    "maffia":2, "mocromaffia":2, "maffioso":2, "maffiosi":2,
    "kartel":2, "drugskartel":2, "drugssyndicaat":2,
    "bende":2, "bendes":2, "gang":2, "straatbende":2, "motorbende":2,
    "criminele-organisatie":2, "georganiseerde-misdaad":2,
    "onderwereld":2, "bovenwereld":2, "handlanger":2, "handlangers":2,
    "ontsnapping":2, "ontsnapt":2, "ontsnapte":2, "escape":2, "escaped":2,
    "verdachte":2, "verdachten":2, "suspect":2, "suspects":2,
    "arrestatie":2, "arrestaties":2, "aangehouden":2, "gearresteerd":2,
    "veroordeeld":2, "veroordeling":2, "convicted":2, "celstraf":2,
    "drugs":2, "drug":2, "drugsbaron":2, "drugslab":2, "drugspand":2,
    "politieonderzoek":2, "politie-onderzoek":2, "recherche":2,
    "opsporing":2, "opsporingsonderzoek":2,
    "justitie":2, "openbaar-ministerie":2, "witwasonderzoek":2,
    "helers":2, "heling":2,
    "illegale-handel":2, "smokkel":2, "smokkelaar":2,
    "vuurwapen":2, "vuurwapens":2, "illegale-vuurwapens":2,
    "gepakt":1, "opgepakt":1,
    "aanklacht":1, "charged":1, "tenlastelegging":1,
    "boete":1, "boetes":1, "geldboete":1,
    "rechter":1, "rechtbank":1, "uitspraak":1,
    "detentie":1, "gevangenis":1, "cel":1,
    "recidivist":1, "veelpleger":1,
    "teisteren":1, "teistert":1, "teisterde":1
  };

  /* ===== POLITIEK — uitgebreid ===== */
  var W_POLITIEK = {
    // Diplomatieke werkwoorden
    "says":3, "said":3, "claims":3, "accuses":3, "warns":3, "warned":3,
    "rejects":3, "rejected":3, "awaits":3, "refuses":3, "refused":3,
    "demands":3, "demanded":3, "urges":3, "urged":3,
    "declares":3, "declared":3, "states":3, "thanked":3, "thanks":3,
    "praised":3, "condemned":3, "highlights":3, "highlighted":3,
    "denies":3, "denied":3, "denial":3,
    "meet":3, "meets":3, "met":3, "meeting":3, "meetings":3,
    "summit":3, "visit":3, "visits":3, "visited":3,
    "hosts":3, "hosted":3, "arrives":3, "arrived":3, "departed":3,
    "talks":3, "negotiations":3, "negotiates":3, "mediates":3, "mediation":3,
    "foreign-minister":3, "foreign-ministers":3, "prime-minister":3,
    "defence-minister":3, "defense-minister":3, "foreign-ministry":3,
    "diplomat":3, "diplomats":3, "ambassador":3, "ambassadors":3,
    "diplomacy":3, "diplomatic":3,

    // Dreiging / planning (geen actie)
    "threat":3, "threatens":3, "threatening":3, "threatened":3,
    "warns":3, "warned":3, "warning":3,
    "plot":3, "plots":3, "plotting":3, "plotted":3,
    "plans-to":3, "planning":3, "prepares":3, "preparing":3,
    "considers":3, "considering":3,
    "report":3, "reports":3, "reportedly":3, "reporting":3,

    // Nederlands
    "zegt":3, "zei":3, "verklaart":3, "verklaarde":3, "beweert":3, "beweerde":3,
    "beschuldigt":3, "beschuldigde":3, "waarschuwt":3, "waarschuwde":3,
    "eist":3, "eiste":3, "weigert":3, "weigerde":3, "dreigt":3, "dreigde":3,
    "volgens":3, "reageert":3, "reageerde":3, "ontkent":3, "ontkende":3,
    "ontmoet":3, "ontmoette":3, "bezoekt":3, "bezocht":3, "reist-naar":3,

    // Duits
    "gewarnt":3, "warnt":3, "warnte":3, "sagt":3, "sagte":3,
    "laut":3, "bericht":3, "berichtet":3, "meldet":3,

    // Politieke gebeurtenissen
    "verkiezing":3, "verkiezingen":3, "election":3, "elections":3,
    "referendum":3, "volksraadpleging":3,
    "staatsgreep":3, "coup":3, "militaire-coup":3,
    "wetsvoorstel":3, "wetsontwerp":3, "amendement":3,
    "motie-van-wantrouwen":3,
    "regeringscrisis":3, "kabinetscrisis":3, "kabinet-valt":3,
    "regeerakkoord":3, "coalitieakkoord":3,
    "sanction":3, "sanctions":3, "sanctie":3, "sancties":3,

    // Actoren
    "parlement":2, "parliament":2, "volksvertegenwoordiging":2,
    "tweede-kamer":2, "eerste-kamer":2, "senaat":2,
    "coalitie":2, "coalition":2, "oppositie":2, "opposition":2,
    "kabinet":2, "cabinet":2, "regering":2, "government":2,
    "president":2, "presidentschap":2, "premier":2, "prime-minister":2,
    "minister":2, "ministers":2, "staatssecretaris":2,
    "verdrag":2, "treaty":2, "akkoord":2, "overeenkomst":2,
    "staatsbezoek":2, "topoverleg":2, "vredesoverleg":2,
    "politieke-partij":2, "fractie":2, "fractievoorzitter":2,
    "lijsttrekker":2, "kandidatenlijst":2, "kiesrecht":2,
    "parlementsverkiezing":2, "presidentsverkiezing":2,
    "gemeenteraad":2, "provinciale-staten":2, "waterschap":2,
    "formatie":2, "informateur":2, "formateur":2,
    "mediators":2, "mediator":2, "vredesplan":2, "peace-plan":2,

    "politiek":1, "political":1, "politicus":1, "politica":1,
    "partij":1, "party":1, "campagne":1, "campaign":1,
    "debat":1, "debate":1, "stemming":1, "vote":1,
    "stem":1, "voters":1, "kiezers":1,
    "beleid":1, "policy":1, "overheid":1, "authority":1
  };

  /* ===== PROTEST ===== */
  var W_PROTEST = {
    "demonstratie":3, "demonstranten":3, "demonstreren":3, "demonstrant":3,
    "protest":3, "protesten":3, "protesteerders":3,
    "rellen":3, "rellende":3, "relschoppers":3,
    "oproer":3, "volksopstand":3,
    "staking":3, "stakers":3, "stakingen":3,
    "worker-strike":3, "labor-strike":3, "general-strike":3,
    "boycot":3, "boycott":3,
    "blokkade":3, "wegblokkade":3, "spoorblokkade":3,
    "sit-in":3, "sit-inactie":3,
    "kraak":3, "kraken":3, "gekraakt":3, "kraakpand":3,
    "activist":2, "activisten":2, "activisme":2,
    "betoging":2, "betogers":2,
    "protestmars":2, "stille-tocht":2,
    "burgerlijke-ongehoorzaamheid":2,
    "sociale-beweging":2,
    "vakbond":2, "vakbonden":2, "fnv":2, "cnv":2,
    "leuzen":1, "spandoek":1, "spandoeken":1,
    "pamflet":1, "flyer":1, "pamfletten":1,
    "menigte":1, "duizenden":1,
    "politie-inzet":1, "waterkanon":1, "traangas":1
  };

  /* ===== CIVIEL ===== */
  var W_CIVIEL = {
    "aardbeving":3, "earthquake":3, "naschok":3, "naschokken":3,
    "overstroming":3, "overstromingen":3, "flood":3, "flooding":3,
    "tsunami":3, "vloedgolf":3,
    "lawine":3, "aardverschuiving":3, "modderstroom":3,
    "orkaan":3, "hurricane":3, "tyfoon":3, "typhoon":3, "cycloon":3,
    "tornado":3, "windhoos":3, "wervelstorm":3,
    "vulkaanuitbarsting":3, "vulkaan":3, "lava":3,
    "bosbrand":3, "wildfire":3, "natuurbrand":3,
    "droogte":3, "hittegolf":3,
    "noodweer":3, "noodstorm":3,
    "instorting":3, "gebouwinstorting":3, "ingestort":3,
    "vliegtuigongeluk":3, "vliegramp":3, "plane-crash":3,
    "treinongeluk":3, "treinramp":3, "treinontsporing":3,
    "helikoptercrash":3, "helicopter-crash":3, "helikopterongeluk":3,
    "scheepsramp":3, "veerboot":3,
    "verdrinking":3, "verdronken":3, "drenkeling":3,
    "woningbrand":3, "flatbrand":3, "keukenbrand":3,
    "gaslek":3, "gasontploffing":3,
    "koolmonoxidevergiftiging":3, "co-vergiftiging":3,
    "verkeersongeval":3, "verkeersongeluk":3,
    "botsing":3, "aanrijding":3, "frontale-botsing":3,
    "file":3, "files":3, "verkeerschaos":3,
    "barbecue":3, "barbecue-ongeluk":3, "steekvlam":3,
    "vuurwerkongeval":3, "vuurwerkramp":3,
    "ontruiming":3, "evacuatie":3, "geëvacueerd":3,
    "vermiste":3, "vermist":3, "missing":3,
    "ongeluk":2, "accident":2, "ongeval":2,
    "brandweer":2, "fire-department":2,
    "ambulance":2, "traumahelikopter":2, "hulpdiensten":2,
    "ramp":2, "disaster":2, "catastrofe":2,
    "noodgeval":2, "noodsituatie":2, "emergency":2,
    "toeristen":2, "vakantiegangers":2, "reizigers":2,
    "natuurramp":2, "natural-disaster":2,
    "infrastructuur":2, "brug":2, "tunnel":2, "viaduct":2,
    "stroomuitval":2, "blackout":2, "stroomstoring":2,
    "gedood":1, "doden":1, "killed":1, "dead":1, "deaths":1,
    "gewond":1, "gewonden":1, "wounded":1, "injured":1,
    "slachtoffer":1, "slachtoffers":1, "victims":1,
    "dodelijk":1, "dodelijke":1, "fatal":1, "fatalities":1,
    "schade":1, "damage":1, "vernieling":1,
    "hulpverlening":1, "reddingsactie":1, "redding":1
  };

  /* ===== SPORT-BLACKLIST — alleen specifiek ===== */
  var SPORT_WORDS = [
    "football", "soccer", "voetbal", "voetballer", "voetbalclub",
    "eredivisie", "champions-league", "europa-league", "conference-league",
    "knvb", "uefa", "fifa",
    "wimbledon", "roland-garros", "grand-slam", "tennis",
    "formule-1", "formule1", "grand-prix", "motogp",
    "basketball", "nba", "nfl", "nhl", "mlb", "ufc", "mma",
    "atletiek", "wielrennen", "tour-de-france",
    "olympische-spelen", "olympics", "olympic",
    "wk-voetbal", "ek-voetbal", "wereldbeker"
  ];

  var SUBSTRING_WORDS = {
    "maffia":       { cat: "crime", weight: 3 },
    "mocromaffia":  { cat: "crime", weight: 3 },
    "maffioso":     { cat: "crime", weight: 3 },
    "kartel":       { cat: "crime", weight: 3 },
    "drugskartel":  { cat: "crime", weight: 3 },
    "crimineel":    { cat: "crime", weight: 3 },
    "criminele":    { cat: "crime", weight: 3 },
    "terrorist":    { cat: "crime", weight: 3 },
    "witwas":       { cat: "crime", weight: 3 },
    "oplicht":      { cat: "crime", weight: 3 },
    "mensensmokkel":{ cat: "crime", weight: 3 },
    "raketaanval":  { cat: "militair", weight: 3 },
    "bombardement": { cat: "militair", weight: 3 },
    "luchtaanval":  { cat: "militair", weight: 3 },
    "gevecht":      { cat: "militair", weight: 3 },
    "drone":        { cat: "militair", weight: 2 },
    "verkiezing":   { cat: "politiek", weight: 3 },
    "sanctie":      { cat: "politiek", weight: 3 }
  };

  var TERRORISM_WORDS = [
    "aanslag", "aanslagen", "terrorist", "terroristen", "terrorisme",
    "zelfmoordaanslag", "zelfmoordenaar",
    "bomaanslag", "autobom", "autobomaanslag",
    "suicide-attack", "suicide-bomber", "terrorism", "terrorist-attack"
  ];

  var DIPLOMATIC_WORDS = [
    "says", "said", "claims", "accuses", "warns", "warned", "rejects",
    "rejected", "awaits", "refuses", "refused", "demands", "urges", "urged",
    "declares", "states", "thanked", "thanks", "praised", "condemned",
    "highlights", "denies", "denied", "denial",
    "meet", "meets", "met", "meeting", "summit", "visit", "visits",
    "hosts", "hosted", "arrives", "talks", "negotiations",
    "foreign-minister", "prime-minister", "defence-minister", "defense-minister",
    "diplomat", "diplomats", "ambassador", "diplomacy", "diplomatic",
    "threat", "threatens", "threatening", "threatened",
    "plot", "plots", "plotting", "plotted",
    "plans-to", "planning", "prepares", "preparing",
    "report", "reports", "reportedly",
    "zegt", "zei", "verklaart", "beweert", "beschuldigt",
    "waarschuwt", "eist", "weigert", "dreigt", "volgens",
    "ontkent", "ontkende", "ontmoet", "bezoekt",
    "gewarnt", "warnt", "sagt", "laut", "bericht", "meldet"
  ];

  var CONFLICT_ZONES = [
    "gaza", "israel", "israël", "israeli",
    "palestijn", "palestina", "palestinian",
    "westelijke-jordaanoever", "west-bank", "ramallah", "jenin", "hebron",
    "libanon", "lebanon", "beiroet", "beirut", "lebanese",
    "syrië", "syria", "damascus", "aleppo", "idlib", "homs", "syrian",
    "oekraïne", "ukraine", "ukrainian", "kyiv", "kiev", "kharkiv", "odesa", "odessa",
    "donbas", "donetsk", "luhansk", "marioepol", "mariupol", "bachmoet", "bakhmut",
    "zaporizhzhia", "zaporozhye", "zaporizhia", "cherson", "kherson",
    "avdiivka", "kramatorsk", "sloviansk",
    "rusland", "russia", "russian", "moskou", "moscow", "belgorod",
    "koersk", "kursk", "bryansk", "rostov", "voronezh", "saratov",
    "krim", "crimea", "sevastopol",
    "jemen", "yemen", "yemeni", "sanaa", "aden", "houthi", "houthis",
    "soedan", "sudan", "khartoum", "darfur", "sudanese",
    "irak", "iraq", "iraqi", "bagdad", "baghdad", "mosul", "erbil",
    "iran", "iranian", "teheran", "tehran", "isfahan",
    "afghanistan", "afghan", "kabul", "kandahar",
    "congo", "goma", "kinshasa", "drc",
    "mali", "bamako", "timbuktu",
    "burkina-faso", "ouagadougou",
    "niger", "niamey",
    "myanmar", "burma",
    "kashmir", "kasjmir",
    "libië", "libya", "libyan", "tripoli", "benghazi",
    "somalië", "somalia", "somali", "mogadishu",
    "ethiopië", "ethiopia", "tigray",
    "mozambique", "cabo-delgado",
    "haïti", "haiti"
  ];

  var INSTABLE_ZONES = [
    "sahel", "nigeria", "nigerian", "chad", "tsjaad",
    "zuid-soedan", "south-sudan", "juba",
    "burundi", "rwanda", "uganda",
    "venezuela", "colombia",
    "mexico", "mexican"
  ];

  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash-report", "isw", "war-mapper",
    "reuters-tg", "al-jazeera-ar-tg", "al-arabiya-tg",
    "middle-east-eye-tg", "kyiv-independent"
  ];

  function compilePattern(word) {
    var w = String(word).toLowerCase();
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/[\u0600-\u06FF]/.test(w)) return new RegExp(esc, 'i');
    if (w.length < 4) return new RegExp('\\b' + esc + '\\b', 'i');
    return new RegExp('\\b' + esc + '\\w*', 'i');
  }

  function compileMap(map) {
    var out = [];
    for (var w in map) out.push({ word: w, weight: map[w], pattern: compilePattern(w) });
    return out;
  }

  var P_MILITAIR = compileMap(W_MILITAIR);
  var P_CRIME    = compileMap(W_CRIME);
  var P_POLITIEK = compileMap(W_POLITIEK);
  var P_PROTEST  = compileMap(W_PROTEST);
  var P_CIVIEL   = compileMap(W_CIVIEL);

  var P_SUBSTRING = [];
  for (var sw in SUBSTRING_WORDS) {
    P_SUBSTRING.push({
      word: sw,
      cat: SUBSTRING_WORDS[sw].cat,
      weight: SUBSTRING_WORDS[sw].weight,
      pattern: new RegExp(sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    });
  }

  var P_TERROR = TERRORISM_WORDS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_DIPLOMATIC = DIPLOMATIC_WORDS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_CONFLICT = CONFLICT_ZONES.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_INSTABLE = INSTABLE_ZONES.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_SPORT = SPORT_WORDS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });

  function countMatches(text, patterns) {
    var score = 0, hits = [];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].pattern.test(text)) {
        score += patterns[i].weight;
        hits.push({ word: patterns[i].word, weight: patterns[i].weight });
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

  function applySubstring(text, scores, hits) {
    for (var i = 0; i < P_SUBSTRING.length; i++) {
      var p = P_SUBSTRING[i];
      if (p.pattern.test(text)) {
        scores[p.cat] += p.weight;
        hits[p.cat].push({ word: p.word, weight: p.weight, substring: true });
      }
    }
  }

  /* ============================================================
     FIX 1: hasMilitaryAction — ALLEEN actor + violence verb
     ============================================================ */
  function hasMilitaryAction(text) {
    // Direct: gewicht-3 militaire term die een echte actie is
    // (sluit uit: dreigingen, waarschuwingen, rapporten)
    var actionPatterns = [
      /\braketaanval\b/i, /\braketinslag\b/i, /\bmissile.strike\b/i,
      /\bbombardement\b/i, /\bbombing\b/i, /\bgebombardeerd\b/i,
      /\bluchtaanval\b/i, /\bairstrike\b/i, /\bair.strike\b/i,
      /\bbeschieting\b/i, /\bshelling\b/i, /\bbeschoten\b/i,
      /\bmortieraanval\b/i, /\bartillerievuur\b/i, /\bgranaatinslag\b/i,
      /\binvasie\b/i, /\binvasion\b/i, /\binvaded\b/i, /\bbinnengevallen\b/i,
      /\boffensief\b/i, /\boffensive\b/i, /\btegenoffensief\b/i,
      /\bbestorming\b/i, /\bvuurgevecht\b/i, /\bgevechten\b/i,
      /\bdrone.strike\b/i, /\bdrone.aanval\b/i,
      /\bescaleert\b/i, /\bescaleerde\b/i
    ];
    for (var p = 0; p < actionPatterns.length; p++) {
      if (actionPatterns[p].test(text)) return true;
    }

    var hasActor = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|iraqi|yemeni|lebanese|saudi|turkish|egyptian|libyan|sudanese|somali|nigerian|afghan|pakistani|indian|chinese|taiwanese|venezuelan|kurdish|idf|hamas|hezbollah|houthi|taliban|isis|al.qaeda|al.shabaab|boko.haram|wagner|armed.group|gewapende.groep|militants|militant|insurgents|insurgent|fighters|fighter|troops|troop|forces|force|soldiers|soldier|army|navy|air.force|airforce|marines|military|paramilitary|rebels|rebel)\b/i.test(text);

    var hasViolenceVerb = /\b(strike|strikes|struck|attack|attacks|attacked|kill|kills|killed|injure|injures|injured|bomb|bombs|bombed|shell|shells|shelled|hit|hits|launch|launches|launched|fire|fires|fired|shoot|shoots|shot|down|downed|shoot.down|intercept|intercepts|intercepted|advance|advances|advanced|withdraw|withdraws|withdrew|withdrawn|abandon|abandons|abandoned|abandoning|retreat|retreats|retreated|repel|repels|repelled|capture|captures|captured|seize|seizes|seized|clash|clashes|clashed|invaded|invades|seized|crashed|exploded)\b/i.test(text);

    // BEIDE nodig — geen locatie-shortcut meer
    return hasActor && hasViolenceVerb;
  }

  function isDiplomaticStatement(text) {
    for (var i = 0; i < P_DIPLOMATIC.length; i++) {
      if (P_DIPLOMATIC[i].pattern.test(text)) return P_DIPLOMATIC[i].word;
    }
    return null;
  }

  function isSportArticle(text) {
    for (var i = 0; i < P_SPORT.length; i++) {
      if (P_SPORT[i].pattern.test(text)) return P_SPORT[i].word;
    }
    return null;
  }

  function hasCivielIncident(text) {
    return /\b(crash|killed|dead|deaths|died|injured|wounded|accident|fire|emergency|explosion|blast|helikoptercrash|helicopter.crash)\b/i.test(text);
  }

  /* ============================================================
     FIX 6: Subtype-detectie — steekpartij/schietpartij vóór moord
     ============================================================ */
  function detectMilitairSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/\braketaanval|raketinslag|missile|kruisraket|ballistische/.test(text)) return "Raketaanval";
    if (/\bdrone|uav/.test(text)) return "Drone-aanval";
    if (/\bbombardement|bombing|bombardment/.test(text)) return "Bombardement";
    if (/\bluchtaanval|airstrike|air-strike/.test(text)) return "Luchtaanval";
    if (/\bbeschieting|shelling/.test(text)) return "Beschieting";
    if (/\bartillerie|mortier|artillery|mortar/.test(text)) return "Artillerie";
    if (/\bluchtafweer|air-defense|patriot|iron-dome|onderschept|intercepted/.test(text)) return "Luchtafweer";
    if (/\binvasie|invasion/.test(text)) return "Invasie";
    if (/\btegenoffensief|counteroffensive/.test(text)) return "Tegenoffensief";
    if (/\boffensief|offensive/.test(text)) return "Offensief";
    if (/\bgevecht|combat|fighting|clashes/.test(text)) return "Grondgevecht";
    if (/\bstaakt-het-vuren|ceasefire|wapenstilstand/.test(text)) return "Wapenstilstand";
    if (/\baanval|attack|assault|strike/.test(text)) return "Aanval";
    return "Conflict";
  }

  function detectCrimeSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/maffia|mocromaffia/.test(text)) return "Maffia";
    if (/\bontsnapping|ontsnapt|ontsnapte|escape|escaped/.test(text)) return "Ontsnapping";
    /* FIX: schietpartij en steekpartij VÓÓR moord */
    if (/\bschietpartij|schietincident|schoten|neergeschoten|shooting/.test(text)) return "Schietpartij";
    if (/\bsteekpartij|steekincident|neergestoken/.test(text)) return "Steekpartij";
    if (/\bmoord|vermoord|doodslag|doodde|doodden/.test(text)) return "Moord";
    if (/\bliquidatie|afrekening/.test(text)) return "Liquidatie";
    if (/\boverval|beroving/.test(text)) return "Overval";
    if (/\bontvoering|gijzeling|kidnapping|hostage/.test(text)) return "Ontvoering";
    if (/\bdrugs|drugshandel|kartel|drugsbaron/.test(text)) return "Drugs";
    if (/\bfraude|oplichting|omkoping|belastingfraude/.test(text)) return "Fraude";
    if (/\bphishing|hacking|cyber|ransomware|malware|datalek/.test(text)) return "Cyber";
    if (/\bcorruptie/.test(text)) return "Corruptie";
    if (/\bwitwassen|witwas/.test(text)) return "Witwassen";
    if (/\bwapenhandel|wapensmokkel/.test(text)) return "Wapenhandel";
    if (/\bmensensmokkel|mensenhandel/.test(text)) return "Mensenhandel";
    return "Misdaad";
  }

  function detectPolitiekSubtype(text) {
    if (/\bthreat|threatens|threatening|threatened|dreigt|waarschuwt|warns|warned/.test(text)) return "Dreiging";
    if (/\bplot|plotting|plots|plot-to|plans-to/.test(text)) return "Samenzwering";
    if (/\bverkiezing|election/.test(text)) return "Verkiezing";
    if (/\breferendum/.test(text)) return "Referendum";
    if (/\bstaatsgreep|coup/.test(text)) return "Staatsgreep";
    if (/\bsanctie|sanctions|sanction/.test(text)) return "Sanctie";
    if (/\bforeign-minister|prime-minister|diplomat|ambassador|fm\b/.test(text)) return "Diplomatie";
    if (/\bdiplomacy|diplomatic|verdrag|vredesoverleg|treaty|negotiations|mediators|summit/.test(text)) return "Diplomatie";
    if (/\bregeringscrisis|kabinetscrisis/.test(text)) return "Regeringscrisis";
    if (/\bwetsvoorstel|motie/.test(text)) return "Wetgeving";
    return "Politiek";
  }

  function detectProtestSubtype(text) {
    if (/\brellen|relschoppers|oproer/.test(text)) return "Rel";
    if (/\bstaking|stakers|worker-strike|general-strike/.test(text)) return "Staking";
    if (/\bboycot/.test(text)) return "Boycot";
    if (/\bkraak|kraken/.test(text)) return "Kraak";
    if (/\bblokkade|wegblokkade/.test(text)) return "Blokkade";
    if (/\bmars|protestmars|stille-tocht/.test(text)) return "Mars";
    if (/\bsit-in/.test(text)) return "Sit-in";
    if (/\bdemonstratie|protest|betoging/.test(text)) return "Demonstratie";
    return "Protest";
  }

  function detectCivielSubtype(text) {
    if (/\bverkeersongeval|verkeersongeluk|botsing|aanrijding|\bfile\b/.test(text)) return "Verkeer";
    if (/\bhelikoptercrash|helicopter.crash|helikopterongeluk/.test(text)) return "Helikopter";
    if (/\bwoningbrand|keukenbrand|flatbrand|bosbrand/.test(text)) return "Brand";
    if (/\bgaslek|gasontploffing|koolmonoxide/.test(text)) return "Ongeluk";
    if (/\baardbeving|earthquake/.test(text)) return "Aardbeving";
    if (/\boverstroming|flood|tsunami/.test(text)) return "Overstroming";
    if (/\blawine|aardverschuiving/.test(text)) return "Lawine";
    if (/\borkaan|hurricane|tyfoon|tornado|storm/.test(text)) return "Storm";
    if (/\bvulkaan|lava/.test(text)) return "Vulkaan";
    if (/\bvliegtuigongeluk|vliegramp|plane-crash/.test(text)) return "Vliegtuig";
    if (/\btreinongeluk|treinramp|treinontsporing/.test(text)) return "Trein";
    if (/\bverdronken|verdrinking/.test(text)) return "Verdrinking";
    if (/\bvermiste|vermist|missing/.test(text)) return "Vermissing";
    if (/\bontruiming|evacuatie|evacuation/.test(text)) return "Evacuatie";
    if (/\bbarbecue/.test(text)) return "Barbecue";
    return "Overig";
  }

  function classify(title, desc, source, url) {
    var text = String((title || "") + " " + (desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();

    var mRes  = countMatches(text, P_MILITAIR);
    var cRes  = countMatches(text, P_CRIME);
    var pRes  = countMatches(text, P_POLITIEK);
    var prRes = countMatches(text, P_PROTEST);
    var ciRes = countMatches(text, P_CIVIEL);

    var scores = {
      militair: mRes.score, crime: cRes.score, politiek: pRes.score,
      protest: prRes.score, civiel: ciRes.score
    };
    var hits = {
      militair: mRes.hits, crime: cRes.hits, politiek: pRes.hits,
      protest: prRes.hits, civiel: ciRes.hits
    };

    applySubstring(text, scores, hits);

    var hasMilAction = hasMilitaryAction(text);
    var diploWord = isDiplomaticStatement(text);
    var sportWord = isSportArticle(text);
    var civielIncident = hasCivielIncident(text);
    var isReport = /^report:|^\d+ days before|reportedly/i.test(text);

    var conflictLocation = findMatch(text, P_CONFLICT);
    var instableLocation = findMatch(text, P_INSTABLE);

    var isOsint = false;
    for (var i = 0; i < OSINT_SOURCES.length; i++) {
      if (sourceLower.indexOf(OSINT_SOURCES[i]) !== -1) { isOsint = true; break; }
    }

    var terrorWord = findMatch(text, P_TERROR);
    var isTerror = !!terrorWord;

    /* Sport-block */
    if (sportWord && !hasMilAction && !isTerror && !civielIncident) {
      return {
        category: "civiel", subtype: "Sport", confidence: 90, uncertain: false,
        scores: scores, signals: hits,
        meta: { sportWord: sportWord, blocked: true }
      };
    }

    /* Militair vereist actie */
    if (!hasMilAction && !isTerror) scores.militair = 0;

    /* Locatie + OSINT bonus */
    var locationBonus = 0;
    if (scores.militair > 0) {
      if (conflictLocation) { locationBonus = 2; scores.militair += 2; }
      else if (instableLocation) { locationBonus = 1; scores.militair += 1; }
      if (isOsint) scores.militair += 2;
    }

    /* Terrorisme */
    if (isTerror) {
      if (conflictLocation) scores.militair += 5;
      else scores.crime += 5;
    }

    /* Diplomatiek override */
    if (diploWord && !hasMilAction && !isTerror) {
      scores.politiek += 5;
      scores.militair = 0;
    }

    /* "sanctions against" bonus */
    if (/\bsanctions?\s+(against|on)\b/i.test(text) && !hasMilAction && !isTerror) {
      scores.politiek += 3;
      scores.militair = 0;
    }

    /* "Report:" prefix → Politiek */
    if (isReport && !hasMilAction && !isTerror) {
      scores.politiek += 4;
      scores.militair = 0;
    }

    /* Civiel-blokkade */
    var hasStrongCiviel = false;
    for (var ci = 0; ci < ciRes.hits.length; ci++) {
      if (ciRes.hits[ci].weight === 3) { hasStrongCiviel = true; break; }
    }
    if (hasStrongCiviel && !hasMilAction && !isTerror) {
      var hasStrongMilitary = false;
      for (var mi = 0; mi < mRes.hits.length; mi++) {
        if (mRes.hits[mi].weight >= 3) { hasStrongMilitary = true; break; }
      }
      if (!hasStrongMilitary) scores.militair = 0;
    }

    /* Winnaar */
    var rank = CATS.map(function(c){ return { cat: c, score: scores[c] }; });
    rank.sort(function(a, b){
      if (b.score !== a.score) return b.score - a.score;
      return PRIORITY[b.cat] - PRIORITY[a.cat];
    });

    var winner = rank[0];
    var runnerUp = rank[1];
    var maxScore = winner.score;
    var secondScore = runnerUp.score;

    if (maxScore === 0) {
      winner = { cat: "civiel", score: 0 };
      secondScore = 0;
    }

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

    var subtype = "";
    if (winner.cat === "militair") subtype = detectMilitairSubtype(text, isTerror);
    else if (winner.cat === "crime") subtype = detectCrimeSubtype(text, isTerror);
    else if (winner.cat === "politiek") subtype = detectPolitiekSubtype(text);
    else if (winner.cat === "protest") subtype = detectProtestSubtype(text);
    else subtype = detectCivielSubtype(text);

    return {
      category: winner.cat, subtype: subtype,
      confidence: confidence, uncertain: uncertain,
      scores: scores, signals: hits,
      meta: {
        conflictLocation: conflictLocation,
        instableLocation: instableLocation,
        locationBonus: locationBonus,
        isOsint: isOsint, terrorWord: terrorWord, isTerror: isTerror,
        diplomaticWord: diploWord, sportWord: sportWord,
        hasMilitaryAction: hasMilAction, civielIncident: civielIncident,
        isReport: isReport
      }
    };
  }

  window.WDClassifier = {
    version: VERSION, classify: classify, categories: CATS,
    _words: {
      militair: W_MILITAIR, crime: W_CRIME, politiek: W_POLITIEK,
      protest: W_PROTEST, civiel: W_CIVIEL, sport: SPORT_WORDS
    },
    _substrings: SUBSTRING_WORDS,
    _locations: { conflict: CONFLICT_ZONES, instable: INSTABLE_ZONES },
    _terrorism: TERRORISM_WORDS,
    _diplomatic: DIPLOMATIC_WORDS
  };

  try { if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen"); } catch(e){}

})();