/* ============================================================
   WAR DESK — classifier.js v5.0
   ------------------------------------------------------------
   ARCHITECTUUR:
   [1] Taaldetectie (NL/EN/FR/DE/AR)
   [2] Sport hard-block (4-tier)
   [3] Statement vs Event splitsing
   [4] Actor+Locatie+Actie triplet voor militair-lock
   [5] Scoring (taal-bewust, dubbele-match voorkomen)
   [6] Winnaar (militair > politiek bij twijfel)
   [7] Confidence + overig categorie
   [8] Filter-vlag voor UI
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v5.0";
  var CATS = ["militair", "crime", "politiek", "protest", "civiel"];
  var PRIORITY = { militair: 5, crime: 4, politiek: 3, protest: 2, civiel: 1 };

  /* ============================================================
     [1] TAALDETECTIE
     ============================================================ */
  function detectLanguage(text) {
    if (!text) return "unknown";
    /* Arabisch schrift */
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    /* Stopwoorden per taal */
    var lower = text.toLowerCase();
    var nl = (lower.match(/\b(de|het|een|van|voor|met|niet|wordt|zijn|heeft|door|over|naar|aan|bij|uit|ook|maar|nog|kan|moet|gaat|komt|maakt|zegt|tussen|tegen|onder|zonder)\b/g) || []).length;
    var en = (lower.match(/\b(the|and|of|in|to|is|was|are|were|with|for|from|on|at|by|as|that|this|has|have|will|says|said|after|before|over|into|between)\b/g) || []).length;
    var fr = (lower.match(/\b(le|la|les|de|du|des|un|une|et|est|sont|pour|dans|sur|avec|par|que|qui|mais|plus|sans|entre|selon|vers)\b/g) || []).length;
    var de = (lower.match(/\b(der|die|das|und|ist|sind|von|zu|mit|auf|für|nach|bei|aus|wird|werden|über|als|auch|noch|aber|zwischen|gegen)\b/g) || []).length;
    var max = Math.max(nl, en, fr, de);
    if (max === 0) return "unknown";
    if (max === nl) return "nl";
    if (max === en) return "en";
    if (max === fr) return "fr";
    if (max === de) return "de";
    return "unknown";
  }

  /* ============================================================
     [2] SPORT — HARD BLOCK (4-TIER)
     ============================================================ */
  var SPORT_SOURCES = [
    "nos sport", "espn", "voetbalzone", "voetbalprimeur",
    "ad sportwereld", "telegraaf sport", "vi.nl", "voetbalnieuws",
    "soccernews", "fcupdate", "glory kickboxing", "mmadna",
    "sky sports", "bbc sport", "eurosport", "motorsport",
    "formule1.nl", "racingnews365", "gpfans", "goal.com",
    "marca", "as.com", "lequipe", "l'équipe", "gazzetta",
    "kicker", "sport-bild", "sport1", "sporza", "hln sport",
    "nba.com", "nfl.com", "mlb.com", "nhl.com", "fifa.com",
    "uefa.com", "olympics.com", "atptour", "wtatennis",
    "basketball.nl", "voetbal international"
  ];

  var SPORT_STRONG = [
    "eredivisie", "eerste divisie", "keuken kampioen divisie",
    "premier league", "champions league", "europa league",
    "conference league", "nations league", "copa america",
    "africa cup", "afcon", "asian cup", "gold cup",
    "world cup", "wk voetbal", "ek voetbal",
    "wk wielrennen", "wk atletiek", "wk zwemmen",
    "olympische spelen", "olympics", "paralympics",
    "tour de france", "giro d'italia", "vuelta",
    "wimbledon", "roland garros",
    "us open tennis", "australian open",
    "grand slam tennis",
    "super bowl", "world series", "stanley cup", "nba finals",
    "nba playoffs", "motogp", "formule 1", "formule1",
    "grand prix", "indycar", "nascar",
    "voetbalclub", "voetbalploeg", "voetbalwedstrijd", "voetbaltoernooi",
    "wielerploeg", "wielerwedstrijd", "wielrennen",
    "tennistoernooi", "tenniswedstrijd",
    "bokswedstrijd", "kickboksen",
    "mma wedstrijd", "ufc fight",
    "handbaltoernooi", "volleybaltoernooi", "basketbaltoernooi",
    "bnxt supercup", "bnxt league",
    "fide", "schaaktoernooi",
    "atletiekwedstrijd", "atletiektoernooi",
    "schaatstoernooi", "schaatswedstrijd"
  ];

  var SPORT_WEAK = [
    "voetbal", "voetballer", "voetballers",
    "tennis", "tennisser",
    "basketbal", "basketballer",
    "volleybal", "volleyballer",
    "handbal", "hockey", "rugby", "honkbal",
    "atletiek", "atleet", "atleten",
    "zwemmen", "zwemmer",
    "schaatsen", "schaatser",
    "wielrennen", "wielrenner",
    "marathon", "judo", "karate",
    "boksen", "bokser",
    "golf", "golfer",
    "skaten", "surfen", "zeilen", "roeien",
    "darts", "snooker", "biljart",
    "schaken", "schaker",
    "esports", "e-sports",
    "keeper", "doelman", "doelvrouw",
    "spits", "aanvaller", "verdediger", "middenvelder",
    "scheidsrechter", "arbiter", "referee",
    "bondscoach", "hoofdcoach",
    "doelpunt", "goal", "penalty", "strafschoppen",
    "buitenspel", "offside", "rode kaart", "gele kaart",
    "competitie", "wedstrijd", "toernooi",
    "kampioenschap", "landskampioen",
    "play-offs", "playoffs", "degradatie", "promotie",
    "transfer", "transferwindow",
    "speler", "speelster", "team", "ploeg", "elftal",
    "supporters", "stadion",
    "seizoen", "competitieseizoen",
    "oefeninterland", "oefenwedstrijd",
    "landenwedstrijd", "supercup"
  ];

  var SPORT_CLUBS = [
    "ajax", "psv", "feyenoord", "az alkmaar", "fc utrecht", "fc twente",
    "vitesse", "sc heerenveen", "sparta rotterdam", "willem ii",
    "go ahead eagles", "pec zwolle", "rkc waalwijk", "fortuna sittard",
    "excelsior", "almere city", "heracles", "nec nijmegen", "n.e.c.",
    "fc groningen", "nac breda", "ado den haag", "de graafschap",
    "anderlecht", "club brugge", "standard luik", "rsc anderlecht",
    "kaa gent", "racing genk", "charleroi",
    "manchester united", "manchester city", "man city", "man united",
    "liverpool", "chelsea", "arsenal", "tottenham", "newcastle",
    "aston villa", "west ham", "everton", "brighton",
    "real madrid", "barcelona", "fc barcelona", "atletico madrid",
    "sevilla", "valencia", "villarreal", "real betis", "athletic bilbao",
    "juventus", "inter milan", "internazionale", "ac milan",
    "napoli", "roma", "as roma", "lazio", "atalanta", "fiorentina",
    "bayern münchen", "bayern munchen", "borussia dortmund",
    "rb leipzig", "bayer leverkusen", "eintracht frankfurt",
    "paris saint-germain", "psg", "olympique marseille", "olympique lyon",
    "as monaco", "lille osc",
    "galatasaray", "fenerbahçe", "fenerbahce", "besiktas", "trabzonspor",
    "benfica", "fc porto", "sporting lisbon", "sporting cp", "braga",
    "celtic", "rangers",
    "zenit", "cska moskou", "shakhtar donetsk", "dynamo kyiv",
    "red bull salzburg", "fc basel", "young boys",
    "boca juniors", "river plate", "flamengo", "palmeiras",
    "al hilal", "al nassr", "al ahli"
  ];

  /* ============================================================
     [3] STATEMENT vs EVENT — markers
     ============================================================ */
  var STATEMENT_PREFIXES = [
    /^report\s*:/i, /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
    /^en\s*direct/i, /^analysis\s*:/i, /^opinion\s*:/i, /^commentary\s*:/i,
    /^update\s*:/i, /^updates?\s*:/i, /^watch\s*:/i, /^video\s*:/i,
    /^interview\s*:/i, /^exclusive\s*:/i, /^breaking\s*:/i,
    /^\d+\s+days?\s+before/i,
    /^[A-Z][a-z]+\s+leader\s*:/i,     /* "Hamas leader:" */
    /^[A-Z][a-z]+\s+official\s*:/i,   /* "US official:" */
    /^[A-Z][a-z]+\s+says\s*:/i        /* "Netanyahu says:" */
  ];

  var STATEMENT_VERBS = {
    /* EN */
    "says":2, "said":2, "claims":2, "claimed":2, "denies":2, "denied":2,
    "confirms":2, "confirmed":2, "warns":2, "warned":2,
    "threatens":2, "threatened":2, "demands":2, "demanded":2,
    "considers":2, "considering":2, "awaits":2, "awaiting":2,
    "expects":2, "expected":2, "plan":2, "plans":2, "planning":2,
    "roadmap":2, "deal":2, "agreement":2, "agreed":2, "agrees":2,
    "responds":2, "response":2, "rejects":2, "rejected":2,
    "urges":2, "urged":2, "calls for":2, "called for":2,
    "according to":2, "reportedly":2, "allegedly":2,
    "welcome":2, "welcomes":2, "welcomed":2,
    "condemn":2, "condemns":2, "condemned":2,
    "praise":2, "praises":2, "praised":2,
    "speaks":2, "spoke":2, "told":2,
    /* NL */
    "zegt":2, "zei":2, "verklaart":2, "verklaarde":2,
    "beweert":2, "beweerde":2, "ontkent":2, "ontkende":2,
    "bevestigt":2, "bevestigde":2, "waarschuwt":2, "waarschuwde":2,
    "dreigt":2, "dreigde":2, "eist":2, "eiste":2,
    "overweegt":2, "overwoog":2, "wacht":2, "wachtte":2,
    "verwacht":2, "verwachte":2, "plan":2, "plannen":2,
    "roadmap":2, "akkoord":2, "reageert":2, "reageerde":2,
    "wijst af":2, "wees af":2, "roept op":2, "riep op":2,
    "volgens":2, "naar verluidt":2,
    "verwelkomt":2, "verwelkomde":2,
    "veroordeelt":2, "veroordeelde":2,
    "prijst":2, "prees":2, "spreekt":2, "sprak":2,
    /* FR */
    "déclare":2, "affirme":2, "nie":2, "confirme":2,
    "avertit":2, "menace":2, "exige":2, "attend":2,
    "prévoit":2, "selon":2, "réagit":2, "réponse":2,
    /* DE */
    "sagt":2, "behauptet":2, "bestreitet":2, "bestätigt":2,
    "warnt":2, "droht":2, "fordert":2, "erwartet":2,
    "plant":2, "laut":2, "antwortet":2, "reagiert":2
  };

  var EVENT_VERBS = {
    /* EN — duidelijke event-werkwoorden */
    "killed":3, "kills":3, "wounded":3, "injured":3,
    "shot":3, "shoots":3, "stabbed":3, "stabs":3,
    "bombed":3, "bombing":3, "attacked":3, "attacks":3,
    "shelled":3, "struck":3, "strikes":3,
    "captured":3, "seized":3, "invaded":3,
    "hit":2, "hits":2, "exploded":3, "explodes":3,
    "blasted":3, "burned":2, "destroyed":3,
    "arrested":2, "detained":2, "released":2,
    "crashed":3, "collided":3, "collapsed":3,
    /* NL */
    "gedood":3, "doodde":3, "doodden":3,
    "gewond":2, "verwond":3, "verwondde":3,
    "neergeschoten":3, "neergestoken":3,
    "gebombardeerd":3, "aangevallen":3, "beschoten":3,
    "veroverd":3, "veroverde":3, "ingenomen":3,
    "getroffen":2, "trof":3, "troffen":3,
    "opgeblazen":3, "ontplofte":3, "ontploften":3,
    "gearresteerd":2, "opgepakt":2, "aangehouden":2,
    "crashte":3, "botste":3, "stortte in":3,
    "raakte":2, "raakten":2, "verwoest":3,
    /* FR */
    "tué":3, "tués":3, "blessé":3, "blessés":3,
    "bombardé":3, "attaqué":3, "capturé":3,
    /* DE */
    "getötet":3, "verletzt":3, "bombardiert":3,
    "angegriffen":3, "gefangen":3
  };

  /* ============================================================
     [4] TRIPLET — Actor + Locatie + Actie
     ============================================================ */
  var TRIPLET_ACTORS = [
    /* Non-state */
    "hamas", "hezbollah", "houthi", "houthis", "taliban",
    "isis", "isil", "al-qaeda", "alqaeda", "al-shabaab",
    "boko haram", "wagner", "militie", "milities",
    "rebellen", "opstandelingen", "jihadisten",
    "insurgents", "militants", "rebels",
    /* State */
    "idf", "israeli army", "israeli forces", "israeli military",
    "russian army", "russian forces", "russian military",
    "ukrainian army", "ukrainian forces", "ukrainian military",
    "iranian army", "iranian forces",
    "syrian army", "syrian forces",
    "iraqi army", "yemeni army",
    "lebanese army", "turkish army",
    "nato", "navo", "un forces", "vredesmacht",
    /* NL */
    "leger", "troepen", "strijdkrachten", "krijgsmacht",
    "luchtmacht", "marine",
    /* Generiek */
    "armed group", "gewapende groep"
  ];

  var TRIPLET_ACTIONS = [
    "strikes", "struck", "fires", "fired", "bombs", "bombed",
    "attacks", "attacked", "invades", "invaded", "seizes", "seized",
    "captures", "captured", "shells", "shelled",
    "shot down", "downs", "intercepts", "intercepted",
    "launches", "launched", "hit", "hits",
    "beschiet", "beschoot", "bestookt", "bombardeert",
    "valt aan", "viel aan", "aanvalt", "veroverde", "verovert",
    "raakt", "raakte", "treft", "trof",
    "schiet", "schoot", "lanceert", "lanceerde"
  ];

  /* ============================================================
     WOORDENLIJSTEN — basis
     ============================================================ */
  var W_MILITAIR = {
    "raketaanval":3, "raketaanvallen":3, "raketinslag":3, "raketinslagen":3,
    "missile strike":3, "missile attack":3,
    "ballistische raket":3, "hypersonische raket":3,
    "kruisraket":3, "kruisraketten":3,
    "luchtaanval":3, "luchtaanvallen":3, "airstrike":3, "airstrikes":3,
    "bombardement":3, "bombardementen":3, "bombing":3,
    "beschieting":3, "beschietingen":3, "shelling":3,
    "mortieraanval":3, "artillerievuur":3, "granaatinslag":3,
    "droneaanval":3, "droneaanvallen":3,
    "invasie":3, "invasion":3, "invaded":3, "binnengevallen":3,
    "offensief":3, "offensives":3, "tegenoffensief":3, "counteroffensive":3,
    "vuurgevecht":3, "grondgevecht":3, "grondgevechten":3,
    "neergehaald":3, "downed":3, "shot-down":3, "onderschept":3, "intercepted":3,
    "escalatie":2, "escalaties":2, "escalation":2, "escaleert":2,
    "militair":2, "militaire":2, "military":2,
    "leger":2, "legers":2, "army":2, "krijgsmacht":2, "strijdkrachten":2,
    "troepen":2, "troops":2, "forces":2,
    "soldaat":2, "soldaten":2, "soldier":2, "soldiers":2,
    "strijder":2, "strijders":2, "fighters":2,
    "idf":2, "hamas":2, "hezbollah":2,
    "houthi":2, "houthis":2, "taliban":2, "isis":2, "isil":2,
    "al-qaeda":2, "alqaeda":2, "al-shabaab":2, "boko haram":2,
    "wagner":2,
    "armed group":2, "gewapende groep":2, "gewapende groepering":2,
    "militie":3, "milities":3, "militanten":2,
    "militants":2, "militant":2, "insurgents":2,
    "rebellen":2, "opstandelingen":2, "jihadisten":2,
    "nato":2, "navo":2,
    "frontlinie":2, "frontline":2,
    "oorlog":2, "oorlogen":2, "war":2,
    "oorlogsgebied":1, "conflictgebied":1,
    "wapen":2, "wapens":2, "weapons":2,
    "patriot":2, "iron dome":2, "ijzeren koepel":2,
    "huurlingen":2, "huursoldaten":2, "mercenaries":2, "mercenary":2,
    "bevelhebber":2, "generaal":2, "kolonel":2, "commandant":2,
    "tank":2, "tanks":2, "pantservoertuig":2,
    "gevechtsvliegtuig":2, "straaljager":2, "fighter jet":2,
    "marine":2, "fregat":2,
    "militair doelwit":2, "militaire installatie":2,
    "wapenstilstand":2, "staakt-het-vuren":2, "staakt het vuren":2,
    "ceasefire":2, "cease-fire":2,
    "vredesakkoord":2, "vredesovereenkomst":2,
    "gesneuveld":1, "gesneuvelde":1,
    "krijgsgevangene":2, "krijgsgevangenen":2,
    "conflict":1, "conflicten":1, "strijd":1
  };

  var W_CRIME = {
    "moord":3, "moorden":3, "vermoord":3, "moordenaar":3, "moordenaars":3,
    "doodslag":3, "doodde":3, "doodden":3,
    "neergeschoten":3, "neergestoken":3, "neergeslagen":3,
    "liquidatie":3, "afrekening":3, "homicide":3,
    "murder":3, "murdered":3, "manslaughter":3,
    "schietpartij":3, "schietincident":3, "shooting":3, "shootings":3,
    "steekpartij":3, "steekincident":3, "stabbing":3,
    "vuurwapen":2, "vuurwapens":2, "illegale vuurwapens":3,
    "wapenhandel":3, "wapensmokkel":3,
    "overval":3, "overvallen":3, "beroving":3, "roofoverval":3,
    "ontvoering":3, "ontvoerd":3, "kidnapping":3, "gekidnapt":3,
    "gijzeling":3, "gijzelaar":3, "gijzelaars":3, "hostage":3,
    "marteling":3, "mishandeling":3, "torture":3,
    "verkrachting":3, "rape":3, "aanranding":3,
    "zedenmisdrijf":3, "kindermisbruik":3, "kinderporno":3,
    "fraude":3, "fraudeur":3, "oplichting":3, "opgelicht":3,
    "phishing":3, "hacking":3, "hacker":3, "hackers":3,
    "cyberaanval":3, "cyberattack":3, "ransomware":3, "malware":3,
    "datalek":3, "datalekken":3,
    "witwassen":3, "witwasserij":3, "witwaspraktijken":3,
    "corruptie":3, "corrupt":3, "omkoping":3, "steekpenningen":3,
    "belastingfraude":3, "btw-fraude":3,
    "identiteitsdiefstal":3, "identiteitsfraude":3,
    "maffia":3, "mocromaffia":3, "maffioso":3,
    "kartel":3, "drugskartel":3, "drugssyndicaat":3,
    "georganiseerde misdaad":3, "organized crime":3,
    "bende":2, "bendes":2, "straatbende":2, "motorbende":2,
    "drugs":2, "drug":2, "drugsbaron":3, "drugslab":3, "drugspand":3,
    "drugshandel":3, "drugsdealer":3,
    "verdachte":2, "verdachten":2, "suspect":2,
    "arrestatie":2, "arrestaties":2, "aangehouden":2, "gearresteerd":2,
    "opgepakt":2, "veroordeeld":2, "veroordeling":2,
    "ontsnapping":3, "ontsnapt":3, "escape":3, "escaped":3,
    "bom":3, "bommen":3, "bomb":3, "bombs":3,
    "explosief":3, "explosieven":3, "explosives":3,
    "bomaanslag":4, "bomaanslagen":4, "bomb attack":4,
    "autobom":4, "autobomaanslag":4, "car bomb":4,
    "mensensmokkel":3, "mensenhandel":3, "human trafficking":3,
    "smokkel":2, "smokkelaar":2
  };

  var W_POLITIEK = {
    "verkiezing":3, "verkiezingen":3, "election":3, "elections":3,
    "referendum":3, "volksraadpleging":3,
    "staatsgreep":3, "coup":3, "militaire coup":3,
    "wetsvoorstel":3, "wetsontwerp":3, "amendement":3,
    "motie van wantrouwen":3, "motie van treurnis":3,
    "regeringscrisis":3, "kabinetscrisis":3, "kabinet valt":3,
    "regeerakkoord":3, "coalitieakkoord":3,
    "verkiezingsprogramma":3, "partijprogramma":3,
    "parlement":2, "parliament":2,
    "tweede kamer":2, "eerste kamer":2, "senaat":2,
    "coalitie":2, "coalition":2,
    "oppositie":2, "opposition":2,
    "kabinet":2, "cabinet":2,
    "regering":2, "government":2,
    "president":2, "presidentschap":2, "premier":2, "prime minister":2,
    "minister":2, "ministers":2, "staatssecretaris":2,
    "kamerlid":2, "kamerleden":2, "fractievoorzitter":2,
    "lijsttrekker":2, "kandidatenlijst":2,
    "formatie":2, "informateur":2, "formateur":2,
    "diplomaat":2, "diplomaten":2, "ambassadeur":2, "ambassadeurs":2,
    "diplomatie":3, "diplomacy":3, "diplomatisch":3, "diplomatic":3,
    "verdrag":2, "treaty":2, "akkoord":2, "overeenkomst":2,
    "staatsbezoek":2, "topoverleg":3, "vredesoverleg":3,
    "vredesplan":3, "peace plan":3,
    "dialoog":3, "dialog":3, "dialogue":3,
    "zelfbeheersing":3, "terughoudendheid":3, "self-restraint":3,
    "bemiddeling":3, "mediation":3, "mediator":2,
    "onderhandelingen":3, "negotiations":3,
    "soevereiniteit":2, "sovereignty":2,
    "sanctie":3, "sancties":3, "sanction":3, "sanctions":3,
    "embargo":3,
    "politiek":1, "political":1, "politicus":1,
    "partij":1, "partijen":1, "party":1,
    "campagne":1, "campaign":1,
    "debat":1, "debatten":1, "debate":1,
    "stemming":1, "vote":1,
    "stem":1, "voters":1, "kiezers":1,
    "beleid":1, "policy":1, "overheid":1,
    "regeringsleider":1, "staatshoofd":1,
    "minister-president":1, "vicepremier":1,
    "ministerie":1, "ministry":1
  };

  var W_PROTEST = {
    "demonstratie":3, "demonstraties":3,
    "demonstranten":3, "demonstrant":3, "demonstreren":3,
    "protest":3, "protesten":3, "protesteerders":3,
    "betoging":3, "betogers":3,
    "rellen":3, "relschoppers":3, "oproer":3, "volksopstand":3,
    "staking":3, "stakingen":3, "stakers":3,
    "worker strike":3, "general strike":3,
    "boycot":3, "boycott":3,
    "blokkade":3, "wegblokkade":3,
    "sit-in":3, "kraak":3, "kraken":3, "kraakpand":3,
    "activist":2, "activisten":2, "activisme":2,
    "protestmars":2, "stille tocht":2,
    "burgerlijke ongehoorzaamheid":3,
    "vakbond":2, "vakbonden":2, "fnv":2, "cnv":2,
    "werkonderbreking":3, "estafettestaking":3, "prikactie":3,
    "vakbondsactie":3,
    "menigte":1, "waterkanon":2, "traangas":2
  };

  var W_CIVIEL = {
    "aardbeving":3, "earthquake":3, "naschok":3, "zeebeving":3,
    "overstroming":3, "overstromingen":3, "flood":3, "flooding":3,
    "tsunami":3, "vloedgolf":3,
    "lawine":3, "aardverschuiving":3, "modderstroom":3,
    "orkaan":3, "hurricane":3, "tyfoon":3, "cycloon":3,
    "tornado":3, "windhoos":3, "wervelstorm":3,
    "vulkaanuitbarsting":3, "vulkaan":3, "lava":3,
    "bosbrand":3, "wildfire":3, "natuurbrand":3,
    "droogte":3, "hittegolf":3,
    "noodweer":3, "storm":2,
    "instorting":3, "gebouwinstorting":3, "ingestort":3,
    "vliegtuigongeluk":3, "vliegramp":3, "plane crash":3,
    "treinongeluk":3, "treinramp":3, "treinontsporing":3,
    "helikoptercrash":3, "helicopter crash":3,
    "scheepsramp":3, "veerboot":2,
    "verdronken":3, "verdrinking":3,
    "woningbrand":3, "flatbrand":3, "keukenbrand":3,
    "gaslek":3, "gasontploffing":3,
    "koolmonoxidevergiftiging":3,
    "verkeersongeval":3, "verkeersongeluk":3,
    "botsing":2, "aanrijding":3, "frontale botsing":3,
    "file":2, "files":2, "verkeerschaos":3,
    "barbecue-ongeluk":3, "steekvlam":3,
    "vuurwerkongeval":3, "vuurwerkramp":3,
    "ontruiming":2, "evacuatie":2, "geëvacueerd":3,
    "vermiste":2, "vermist":2, "missing":2,
    "ongeluk":2, "ongelukken":2, "accident":2,
    "brandweer":2, "fire department":2,
    "ambulance":2, "traumahelikopter":2, "hulpdiensten":2,
    "noodgeval":2, "noodsituatie":2, "emergency":2,
    "toeristen":2, "vakantiegangers":2, "reizigers":2,
    "natuurramp":2, "natural disaster":2,
    "infrastructuur":2, "brug":2, "tunnel":2,
    "stroomuitval":3, "blackout":3, "stroomstoring":3,
    "wateroverlast":3, "treinvertraging":3,
    "hulpverlening":1, "reddingsactie":1,
    "gedood":1, "doden":1, "killed":1, "dead":1, "deaths":1,
    "dodelijk":1, "dodelijke":1, "fatal":1,
    "gewond":1, "gewonden":1, "wounded":1, "injured":1,
    "slachtoffer":1, "slachtoffers":1, "victims":1,
    "schade":1, "damage":1
  };

  /* Arabisch — alleen match bij spaties of begin/eind */
  var W_ARABIC = [
    /* Militair */
    { w:"حرب", cat:"militair", weight:3 },
    { w:"غارة", cat:"militair", weight:3 },
    { w:"غارات", cat:"militair", weight:3 },
    { w:"قصف", cat:"militair", weight:3 },
    { w:"قوات", cat:"militair", weight:2 },
    { w:"جيش", cat:"militair", weight:2 },
    { w:"صاروخ", cat:"militair", weight:3 },
    { w:"صواريخ", cat:"militair", weight:3 },
    { w:"مسيّرة", cat:"militair", weight:3 },
    { w:"طائرة", cat:"militair", weight:2 },
    { w:"قتال", cat:"militair", weight:3 },
    { w:"معارك", cat:"militair", weight:3 },
    { w:"هجوم", cat:"militair", weight:3 },
    { w:"اعتداء", cat:"militair", weight:3 },
    { w:"احتلال", cat:"militair", weight:2 },
    { w:"فصائل", cat:"militair", weight:2 },
    { w:"مقاومة", cat:"militair", weight:2 },
    { w:"مسلح", cat:"militair", weight:2 },
    { w:"مسلحون", cat:"militair", weight:2 },
    { w:"حماس", cat:"militair", weight:2 },
    { w:"حزب الله", cat:"militair", weight:2 },
    { w:"الحوثي", cat:"militair", weight:2 },
    { w:"طالبان", cat:"militair", weight:2 },
    { w:"داعش", cat:"militair", weight:2 },
    /* Crime */
    { w:"انفجار", cat:"crime", weight:2 },
    { w:"مقتل", cat:"crime", weight:2 },
    { w:"قتلى", cat:"crime", weight:2 },
    { w:"قتل", cat:"crime", weight:2 },
    { w:"جريمة", cat:"crime", weight:3 },
    { w:"مخدرات", cat:"crime", weight:3 },
    { w:"إرهاب", cat:"crime", weight:3 },
    { w:"إرهابي", cat:"crime", weight:3 },
    { w:"خطف", cat:"crime", weight:3 },
    { w:"اختطاف", cat:"crime", weight:3 },
    { w:"اعتقال", cat:"crime", weight:2 },
    { w:"احتيال", cat:"crime", weight:3 },
    /* Politiek */
    { w:"انتخابات", cat:"politiek", weight:3 },
    { w:"حكومة", cat:"politiek", weight:2 },
    { w:"رئيس", cat:"politiek", weight:2 },
    { w:"وزير", cat:"politiek", weight:2 },
    { w:"الخارجية", cat:"politiek", weight:2 },
    { w:"برلمان", cat:"politiek", weight:2 },
    { w:"دبلوماسي", cat:"politiek", weight:3 },
    { w:"دبلوماسية", cat:"politiek", weight:3 },
    { w:"مفاوضات", cat:"politiek", weight:3 },
    { w:"اتفاق", cat:"politiek", weight:2 },
    { w:"اتفاقية", cat:"politiek", weight:2 },
    { w:"وقف إطلاق النار", cat:"politiek", weight:3 },
    { w:"عقوبات", cat:"politiek", weight:3 },
    { w:"قمة", cat:"politiek", weight:2 },
    { w:"نتنياهو", cat:"politiek", weight:2 },
    /* Protest */
    { w:"احتجاج", cat:"protest", weight:3 },
    { w:"احتجاجات", cat:"protest", weight:3 },
    { w:"مظاهرة", cat:"protest", weight:3 },
    { w:"مظاهرات", cat:"protest", weight:3 },
    { w:"إضراب", cat:"protest", weight:3 },
    { w:"متظاهرون", cat:"protest", weight:3 },
    { w:"معارضة", cat:"protest", weight:2 },
    /* Civiel */
    { w:"زلزال", cat:"civiel", weight:3 },
    { w:"فيضان", cat:"civiel", weight:3 },
    { w:"فيضانات", cat:"civiel", weight:3 },
    { w:"حريق", cat:"civiel", weight:3 },
    { w:"حرائق", cat:"civiel", weight:3 },
    { w:"حادث", cat:"civiel", weight:2 }
  ];

  /* Locaties in Arabisch */
  var AR_LOCATIONS = [
    "غزة", "إسرائيل", "لبنان", "سوريا", "العراق", "اليمن", "إيران",
    "روسيا", "أوكرانيا", "مصر", "السعودية", "تركيا", "فلسطين",
    "باكستان", "أفغانستان", "ليبيا", "السودان"
  ];

  /* ============================================================
     TERRORISME + CONFLICT ZONES
     ============================================================ */
  var TERRORISM_WORDS = [
    "aanslag", "aanslagen", "terrorist", "terroristen", "terrorisme",
    "zelfmoordaanslag", "zelfmoordenaar", "bomaanslag",
    "suicide attack", "suicide bomber", "terrorism", "terrorist attack"
  ];

  var CONFLICT_ZONES = [
    "gaza", "israel", "israël", "israeli",
    "palestijn", "palestina", "palestinian",
    "westelijke jordaanoever", "west bank",
    "libanon", "lebanon", "beiroet", "beirut",
    "syrië", "syria", "damascus", "aleppo", "idlib",
    "jemen", "yemen", "sanaa", "houthi",
    "irak", "iraq", "bagdad", "baghdad", "mosul",
    "iran", "iranian", "teheran", "tehran",
    "saudi-arabië", "saudi", "riyad",
    "emiraten", "uae", "qatar", "doha",
    "bahrain", "kuwait", "jordanië", "jordan", "amman",
    "egypte", "egypt", "cairo",
    "turkije", "turkey", "turkish", "ankara",
    "oekraïne", "ukraine", "ukrainian",
    "kyiv", "kiev", "kharkiv", "odesa",
    "donbas", "donetsk", "luhansk", "mariupol",
    "bachmoet", "bakhmut", "zaporizhzhia", "cherson", "kherson",
    "rusland", "russia", "russian", "moskou", "moscow",
    "belgorod", "koersk", "kursk", "bryansk", "rostov",
    "krim", "crimea",
    "afghanistan", "afghan", "kabul",
    "pakistan", "pakistani", "islamabad", "peshawar",
    "india", "indian", "kashmir", "kasjmir",
    "soedan", "sudan", "khartoum", "darfur",
    "libië", "libya", "libyan", "tripoli", "benghazi",
    "somalië", "somalia", "mogadishu",
    "ethiopië", "ethiopia", "tigray",
    "mali", "bamako", "burkina faso",
    "niger", "niamey", "congo", "goma",
    "mozambique", "nigeria", "nigerian", "chad",
    "zuid-soedan", "south sudan", "juba",
    "haïti", "haiti"
  ];

  var INSTABLE_ZONES = [
    "sahel", "venezuela", "colombia", "mexico", "mexican",
    "guatemala", "honduras", "peru", "ecuador", "bolivia",
    "armenië", "azerbeidzjan", "georgië",
    "kosovo", "servië", "moldavië"
  ];

  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash-report", "isw", "war-mapper",
    "middle-east-eye", "al-monitor", "times of israel", "haaretz",
    "jpost", "ynet", "anadolu", "saba yemen", "al-arabiya",
    "al jazeera", "aljazeera", "kyiv independent"
  ];

  /* ============================================================
     COMPILATIE
     ============================================================ */
  function compileLatin(word) {
    var w = String(word).toLowerCase();
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    esc = esc.replace(/-/g, '[\\s\\-]+');
    if (w.length < 4) return new RegExp('\\b' + esc + '\\b', 'i');
    return new RegExp('\\b' + esc + '\\w*', 'i');
  }

  /* Arabisch: spaties of begin/eind */
  function compileArabic(word) {
    var w = String(word);
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /* Match alleen als omgeven door spaties, begin, eind of leestekens */
    return new RegExp('(?:^|[\\s,.،؛:!?؟])' + esc + '(?=$|[\\s,.،؛:!?؟])', 'i');
  }

  function compileMap(map, isArabic) {
    var out = [];
    for (var w in map) {
      if (!Object.prototype.hasOwnProperty.call(map, w)) continue;
      out.push({
        word: w,
        weight: map[w],
        pattern: isArabic ? compileArabic(w) : compileLatin(w)
      });
    }
    return out;
  }

  function compileList(list, isArabic) {
    return list.map(function(w){
      return { word: w, pattern: isArabic ? compileArabic(w) : compileLatin(w) };
    });
  }

  var P_MILITAIR  = compileMap(W_MILITAIR, false);
  var P_CRIME     = compileMap(W_CRIME, false);
  var P_POLITIEK  = compileMap(W_POLITIEK, false);
  var P_PROTEST   = compileMap(W_PROTEST, false);
  var P_CIVIEL    = compileMap(W_CIVIEL, false);
  var P_STATEMENT = compileMap(STATEMENT_VERBS, false);
  var P_EVENT     = compileMap(EVENT_VERBS, false);

  var P_ARABIC = W_ARABIC.map(function(a){
    return {
      word: a.w,
      cat: a.cat,
      weight: a.weight,
      pattern: compileArabic(a.w)
    };
  });
  var P_AR_LOCATIONS = AR_LOCATIONS.map(function(w){
    return { word: w, pattern: compileArabic(w) };
  });

  var P_TERROR    = compileList(TERRORISM_WORDS, false);
  var P_CONFLICT  = compileList(CONFLICT_ZONES, false);
  var P_INSTABLE  = compileList(INSTABLE_ZONES, false);
  var P_ACTOR     = compileList(TRIPLET_ACTORS, false);
  var P_TRIPLET_ACTION = compileList(TRIPLET_ACTIONS, false);
  var P_SPORT_SRC = SPORT_SOURCES.map(function(s){ return s.toLowerCase(); });
  var P_SPORT_STRONG = compileList(SPORT_STRONG, false);
  var P_SPORT_WEAK = compileList(SPORT_WEAK, false);
  var P_SPORT_CLUBS = compileList(SPORT_CLUBS, false);

  /* ============================================================
     HELPERS
     ============================================================ */
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

  /* ============================================================
     [2] SPORT DETECTIE
     ============================================================ */
  function detectSport(titleLower, text, sourceLower) {
    /* Bron */
    for (var i = 0; i < P_SPORT_SRC.length; i++) {
      if (sourceLower.indexOf(P_SPORT_SRC[i]) !== -1) {
        return { by: "source", word: P_SPORT_SRC[i] };
      }
    }
    /* Strong in titel */
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(titleLower)) {
        return { by: "strong-title", word: P_SPORT_STRONG[i].word };
      }
    }
    /* Strong in tekst */
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(text)) {
        return { by: "strong-text", word: P_SPORT_STRONG[i].word };
      }
    }
    /* Club + weak */
    var club = null;
    for (var i = 0; i < P_SPORT_CLUBS.length; i++) {
      if (P_SPORT_CLUBS[i].pattern.test(text)) { club = P_SPORT_CLUBS[i].word; break; }
    }
    if (club) {
      for (var i = 0; i < P_SPORT_WEAK.length; i++) {
        if (P_SPORT_WEAK[i].pattern.test(text)) {
          return { by: "club+weak", word: club + " + " + P_SPORT_WEAK[i].word };
        }
      }
    }
    /* Weak x3 */
    var weakCount = 0, weakWords = [];
    for (var i = 0; i < P_SPORT_WEAK.length; i++) {
      if (P_SPORT_WEAK[i].pattern.test(text)) {
        weakCount++;
        if (weakWords.length < 3) weakWords.push(P_SPORT_WEAK[i].word);
      }
    }
    if (weakCount >= 3) {
      return { by: "weak-3plus", word: weakWords.join(", ") };
    }
    return null;
  }

  /* ============================================================
     [3] STATEMENT vs EVENT
     ============================================================ */
  function detectStatementMode(titleLower) {
    /* Prefix */
    for (var i = 0; i < STATEMENT_PREFIXES.length; i++) {
      if (STATEMENT_PREFIXES[i].test(titleLower)) {
        return { isStatement: true, reason: "prefix", prefix: STATEMENT_PREFIXES[i].source };
      }
    }
    /* Verb-telling */
    var stat = countMatches(titleLower, P_STATEMENT);
    var evt = countMatches(titleLower, P_EVENT);
    if (stat.score >= 2 && stat.score > evt.score) {
      return { isStatement: true, reason: "verb", score: stat.score, eventScore: evt.score };
    }
    return { isStatement: false, statScore: stat.score, eventScore: evt.score };
  }

  /* ============================================================
     [4] TRIPLET-CHECK voor militair-lock
     ============================================================ */
  function checkTriplet(titleLower) {
    var actor = null, loc = null, action = null;
    for (var i = 0; i < P_ACTOR.length; i++) {
      if (P_ACTOR[i].pattern.test(titleLower)) { actor = P_ACTOR[i].word; break; }
    }
    for (var i = 0; i < P_CONFLICT.length; i++) {
      if (P_CONFLICT[i].pattern.test(titleLower)) { loc = P_CONFLICT[i].word; break; }
    }
    if (!loc) {
      for (var i = 0; i < P_AR_LOCATIONS.length; i++) {
        if (P_AR_LOCATIONS[i].pattern.test(titleLower)) { loc = P_AR_LOCATIONS[i].word; break; }
      }
    }
    for (var i = 0; i < P_TRIPLET_ACTION.length; i++) {
      if (P_TRIPLET_ACTION[i].pattern.test(titleLower)) { action = P_TRIPLET_ACTION[i].word; break; }
    }
    var count = (actor?1:0) + (loc?1:0) + (action?1:0);
    return {
      count: count,
      actor: actor,
      location: loc,
      action: action,
      isLocked: count >= 3
    };
  }

  /* ============================================================
     [5] SCORING
     ============================================================ */
  function applyArabic(text, scores, hits) {
    for (var i = 0; i < P_ARABIC.length; i++) {
      var pa = P_ARABIC[i];
      if (!pa.pattern.test(text)) continue;
      if (scores[pa.cat] === undefined) continue;
      scores[pa.cat] += pa.weight;
      hits[pa.cat].push({ word: pa.word, weight: pa.weight, lang: "ar" });
    }
  }

  function applyConflictBoost(scores, text, titleLower, sourceLower) {
    var conflictLoc = findMatch(text, P_CONFLICT);
    var instableLoc = findMatch(text, P_INSTABLE);
    var arLoc = findMatch(titleLower, P_AR_LOCATIONS);
    var boost = 0;
    if (conflictLoc) boost += 3;
    else if (instableLoc) boost += 1;
    if (arLoc) boost += 2;
    for (var i = 0; i < OSINT_SOURCES.length; i++) {
      if (sourceLower.indexOf(OSINT_SOURCES[i]) !== -1) { boost += 3; break; }
    }
    return boost;
  }

  /* ============================================================
     [6] WINNAAR + [7] CONFIDENCE + [8] FILTER
     ============================================================ */
  function pickWinner(scores, triplet, mode) {
    var rank = CATS.map(function(c){ return { cat: c, score: scores[c] }; });
    rank.sort(function(a, b){
      if (b.score !== a.score) return b.score - a.score;
      return PRIORITY[b.cat] - PRIORITY[a.cat];
    });
    var winner = rank[0];
    var runnerUp = rank[1];

    /* Militair > Politiek bij twijfel (<2 punten verschil) */
    if (winner.cat === "politiek" && (scores.militair >= scores.politiek - 2) && scores.militair > 0) {
      winner = { cat: "militair", score: scores.militair };
      runnerUp = { cat: "politiek", score: scores.politiek };
    }

    return { winner: winner, runnerUp: runnerUp };
  }

  function calcConfidence(winner, runnerUp) {
    var maxScore = winner.score;
    var secondScore = runnerUp.score;
    if (maxScore === 0) return 0;
    if (secondScore === 0) return 100;
    var ratio = maxScore / secondScore;
    var conf;
    if (ratio >= 3) conf = 95;
    else if (ratio >= 2) conf = 85;
    else if (ratio >= 1.5) conf = 70;
    else conf = 55;
    if (maxScore < 4) conf = Math.min(conf, 60);
    if (maxScore < 2) conf = Math.min(conf, 40);
    return conf;
  }

  /* ============================================================
     SUBTYPES
     ============================================================ */
  function detectMilitairSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/\braketaanval|raketinslag|missile|kruisraket|ballistische/.test(text)) return "Raketaanval";
    if (/\bdrone|uav/.test(text)) return "Drone-aanval";
    if (/\bbombardement|bombing|bombardment/.test(text)) return "Bombardement";
    if (/\bluchtaanval|airstrike|air-strike/.test(text)) return "Luchtaanval";
    if (/\bbeschieting|shelling/.test(text)) return "Beschieting";
    if (/\bartillerie|mortier|artillery|mortar/.test(text)) return "Artillerie";
    if (/\bluchtafweer|air-defense|patriot|iron.dome|onderschept|intercepted/.test(text)) return "Luchtafweer";
    if (/\binvasie|invasion/.test(text)) return "Invasie";
    if (/\btegenoffensief|counteroffensive/.test(text)) return "Tegenoffensief";
    if (/\boffensief|offensive/.test(text)) return "Offensief";
    if (/\bgevecht|combat|fighting|clashes/.test(text)) return "Grondgevecht";
    if (/\bstaakt[\s\-]+het[\s\-]+vuren|ceasefire|wapenstilstand/.test(text)) return "Wapenstilstand";
    if (/\baanval|attack|assault|strike/.test(text)) return "Aanval";
    return "Conflict";
  }

  function detectCrimeSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/maffia|mocromaffia/.test(text)) return "Maffia";
    if (/\bontsnapping|ontsnapt|escape|escaped|uitbraak/.test(text)) return "Ontsnapping";
    if (/\bschietpartij|schietincident|neergeschoten|shooting/.test(text)) return "Schietpartij";
    if (/\bsteekpartij|steekincident|neergestoken|stabbing/.test(text)) return "Steekpartij";
    if (/\bmoord|vermoord|doodslag|murder|homicide/.test(text)) return "Moord";
    if (/\bliquidatie|afrekening/.test(text)) return "Liquidatie";
    if (/\boverval|beroving/.test(text)) return "Overval";
    if (/\bontvoering|gijzeling|kidnapping|hostage/.test(text)) return "Ontvoering";
    if (/\bdrugs|drugshandel|kartel|drugsbaron|drugsdealer/.test(text)) return "Drugs";
    if (/\bfraude|oplichting|omkoping/.test(text)) return "Fraude";
    if (/\bphishing|hacking|cyber|ransomware|malware|datalek/.test(text)) return "Cyber";
    if (/\bcorruptie/.test(text)) return "Corruptie";
    if (/\bwitwassen|witwas/.test(text)) return "Witwassen";
    if (/\bwapenhandel|wapensmokkel/.test(text)) return "Wapenhandel";
    if (/\bmensensmokkel|mensenhandel/.test(text)) return "Mensenhandel";
    if (/\bbom|explosief|explosive/.test(text)) return "Explosie";
    return "Misdaad";
  }

  function detectPolitiekSubtype(text) {
    if (/\bplot|plotting|plots/.test(text)) return "Samenzwering";
    if (/\bsanctions?\s+(against|on)|sanctie|sancties/.test(text)) return "Sanctie";
    if (/\bnegotiations|talks|summit|mediators|onderhandelingen|dialoog|dialogue/.test(text)) return "Diplomatie";
    if (/\bstatement|declaration|verklaring|aankondiging/.test(text)) return "Verklaring";
    if (/\bverkiezing|election/.test(text)) return "Verkiezing";
    if (/\breferendum/.test(text)) return "Referendum";
    if (/\bstaatsgreep|coup/.test(text)) return "Staatsgreep";
    if (/\bforeign.minister|prime.minister|diplomat|ambassador/.test(text)) return "Diplomatie";
    if (/\bregeringscrisis|kabinetscrisis/.test(text)) return "Regeringscrisis";
    if (/\bwetsvoorstel|motie/.test(text)) return "Wetgeving";
    if (/\bthreat|dreigt|waarschuwt/.test(text)) return "Dreiging";
    return "Politiek";
  }

  function detectProtestSubtype(text) {
    if (/\brellen|relschoppers|oproer/.test(text)) return "Rel";
    if (/\bstaking|stakers|general.strike/.test(text)) return "Staking";
    if (/\bboycot/.test(text)) return "Boycot";
    if (/\bkraak|kraken/.test(text)) return "Kraak";
    if (/\bblokkade/.test(text)) return "Blokkade";
    if (/\bsit-in/.test(text)) return "Sit-in";
    if (/\bdemonstratie|protest|betoging/.test(text)) return "Demonstratie";
    return "Protest";
  }

  function detectCivielSubtype(text) {
    if (/\bverkeersongeval|verkeersongeluk|botsing|aanrijding|\bfile\b/.test(text)) return "Verkeer";
    if (/\bhelikoptercrash|helicopter.crash/.test(text)) return "Helikopter";
    if (/\bwoningbrand|flatbrand|bosbrand/.test(text)) return "Brand";
    if (/\bgaslek|gasontploffing|koolmonoxide/.test(text)) return "Ongeluk";
    if (/\baardbeving|earthquake/.test(text)) return "Aardbeving";
    if (/\boverstroming|flood|tsunami/.test(text)) return "Overstroming";
    if (/\blawine|aardverschuiving/.test(text)) return "Lawine";
    if (/\borkaan|hurricane|tyfoon|tornado|storm/.test(text)) return "Storm";
    if (/\bvulkaan|lava/.test(text)) return "Vulkaan";
    if (/\bvliegtuigongeluk|vliegramp|plane.crash/.test(text)) return "Vliegtuig";
    if (/\btreinongeluk|treinramp/.test(text)) return "Trein";
    if (/\bverdronken|verdrinking/.test(text)) return "Verdrinking";
    if (/\bvermiste|vermist|missing/.test(text)) return "Vermissing";
    if (/\bontruiming|evacuatie|evacuation/.test(text)) return "Evacuatie";
    if (/\bbarbecue/.test(text)) return "Barbecue";
    if (/\bstroomuitval|blackout|stroomstoring/.test(text)) return "Stroomstoring";
    return "Overig";
  }

  /* ============================================================
     HOOFDFUNCTIE
     ============================================================ */
  function classify(title, desc, source, url) {
    var titleStr = String(title || "");
    var titleLower = titleStr.toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();

    /* [1] Taal */
    var lang = detectLanguage(titleStr + " " + String(desc || ""));

    /* [2] Sport */
    var sport = detectSport(titleLower, text, sourceLower);
    if (sport) {
      return {
        category: "sport",
        subtype: "Sport",
        confidence: 98,
        uncertain: false,
        lang: lang,
        isSport: true,
        isFiltered: true,
        scores: {},
        signals: {},
        meta: { sportBlocked: true, sportBy: sport.by, sportWord: sport.word }
      };
    }

    /* [3] Statement/Event */
    var mode = detectStatementMode(titleLower);

    /* [4] Triplet */
    var triplet = checkTriplet(titleLower);

    /* [5] Scores */
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

    /* Arabisch */
    if (lang === "ar") applyArabic(text, scores, hits);

    /* Conflict-boost (alleen militair) */
    var boost = applyConflictBoost(scores, text, titleLower, sourceLower);
    if (boost > 0) {
      if (triplet.count >= 2 || mRes.score >= 3) {
        scores.militair += boost;
      } else if (triplet.count === 1 && mRes.score >= 2) {
        scores.militair += Math.floor(boost / 2);
      }
    }

    /* Terrorisme */
    var terrorWord = findMatch(text, P_TERROR);
    if (terrorWord) {
      var hasArmedActor = /\b(taliban|houthi|hamas|hezbollah|isis|isil|al.qaeda|al.shabaab|boko.haram|militie|milities|militanten|militant|insurgents?|armed.group|gewapende.groep|rebels?|opstandelingen|jihadisten?|terroristen?)\b/i.test(text);
      if (triplet.location || hasArmedActor) scores.militair += 5;
      else scores.crime += 5;
    }

    /* [4] Militair-lock */
    if (triplet.isLocked) {
      scores.militair += 8;
    }

    /* [3] Statement-override: als statement EN geen militair-lock → politiek boost */
    if (mode.isStatement && !triplet.isLocked) {
      scores.politiek += 4;
      /* Militair blokkeren als er geen concreet event is */
      if (mode.eventScore < 3 && !terrorWord) {
        scores.militair = 0;
      }
    }

    /* Zwakke input → overig */
    var maxInput = Math.max(scores.militair, scores.crime, scores.politiek, scores.protest, scores.civiel);
    var isWeak = (maxInput < 4) && !triplet.isLocked;

    /* [6] Winnaar */
    var pick = pickWinner(scores, triplet, mode);
    var winner = pick.winner;
    var runnerUp = pick.runnerUp;

    /* Als alles 0 → overig */
    if (winner.score === 0) {
      return {
        category: "overig",
        subtype: "Onbekend",
        confidence: 0,
        uncertain: true,
        lang: lang,
        isSport: false,
        isFiltered: true,
        scores: scores,
        signals: hits,
        meta: { reason: "Geen signaal", mode: mode, triplet: triplet }
      };
    }

    /* [7] Confidence */
    var confidence = calcConfidence(winner, runnerUp);

    /* Overig als te zwak */
    if (isWeak && confidence < 65) {
      return {
        category: "overig",
        subtype: "Onbekend",
        confidence: confidence,
        uncertain: true,
        lang: lang,
        isSport: false,
        isFiltered: true,
        scores: scores,
        signals: hits,
        meta: { reason: "Zwakke score", mode: mode, triplet: triplet, maxInput: maxInput }
      };
    }

    var uncertain = (confidence > 0 && confidence < 65);

    /* [8] Subtype */
    var subtype = "";
    if (winner.cat === "militair") subtype = detectMilitairSubtype(text, !!terrorWord);
    else if (winner.cat === "crime") subtype = detectCrimeSubtype(text, !!terrorWord);
    else if (winner.cat === "politiek") subtype = detectPolitiekSubtype(text);
    else if (winner.cat === "protest") subtype = detectProtestSubtype(text);
    else subtype = detectCivielSubtype(text);

    return {
      category: winner.cat,
      subtype: subtype,
      confidence: confidence,
      uncertain: uncertain,
      lang: lang,
      isSport: false,
      isFiltered: false,
      scores: scores,
      signals: hits,
      meta: {
        mode: mode,
        triplet: triplet,
        terrorWord: terrorWord,
        conflictBoost: boost
      }
    };
  }

  /* ============================================================
     HELPER: isSport
     ============================================================ */
  function isSport(title, desc, source) {
    var titleLower = String(title || "").toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    return detectSport(titleLower, text, String(source || "").toLowerCase()) !== null;
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.WDClassifier = {
    version: VERSION,
    classify: classify,
    isSport: isSport,
    detectLanguage: detectLanguage,
    categories: CATS,
    _words: {
      militair: W_MILITAIR, crime: W_CRIME, politiek: W_POLITIEK,
      protest: W_PROTEST, civiel: W_CIVIEL, arabic: W_ARABIC,
      statement: STATEMENT_VERBS, event: EVENT_VERBS
    },
    _locations: { conflict: CONFLICT_ZONES, instable: INSTABLE_ZONES }
  };

  try {
    if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen");
  } catch(e){}

})();