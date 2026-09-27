/* ============================================================
   WAR DESK — classifier.js v3.1
   - Sport volledig verborgen (bron + 100+ termen)
   - Report-mode alleen titel (niet beschrijving)
   - Generieke werkwoorden verwijderd
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v3.1";
  var CATS = ["militair", "crime", "politiek", "protest", "civiel"];
  var PRIORITY = { militair: 5, crime: 4, politiek: 3, protest: 2, civiel: 1 };

  /* ============================================================
     SPORT-DETECTIE — agressief, volledig blokkeren
     ============================================================ */

  /* Sportbronnen — direct blokkeren */
  var SPORT_SOURCES = [
    "nos sport", "espn", "voetbalzone", "voetbalprimeur",
    "ad sportwereld", "telegraaf sport", "vi.nl", "voetbalnieuws",
    "soccernews", "fcupdate", "glory kickboxing", "mmadna",
    "sky sports", "bbc sport", "eurosport", "motorsport",
    "formule1.nl", "racingnews365", "gpfans"
  ];

  /* Uitgebreide sport-woordenlijst (NL + EN + FR + DE) */
  var SPORT_WORDS = [
    /* NL voetbal */
    "voetbal", "voetballer", "voetbalclub", "voetbalploeg", "voetbalwedstrijd",
    "voetbaltoernooi", "keeper", "doelman", "spits", "middenvelder",
    "verdediger", "scheidsrechter", "arbiter", "penalty", "strafschoppen",
    "buitenspel", "doelpunt", "doelpunten", "rode-kaart", "gele-kaart",
    "eredivisie", "eerste-divisie", "knvb", "johan-cruijff-schaal",
    "beker", "bekertoernooi", "play-offs", "degradatie", "kampioenschap",
    "landskampioen", "titel", "competitie", "wedstrijd", "wedstrijden",
    "ploeggenoten", "ploeggenoot", "bondscoach", "trainer", "coach",
    "teamgenoten", "elftal", "nationale-elftal", "oranje-elftal",
    "oefeninterland", "oefenwedstrijd", "vriendschappelijk",
    "wk-voetbal", "ek-voetbal", "wk", "ek", "nations-league",

    /* NL andere sporten */
    "wielrennen", "wielrenner", "wielerploeg", "tour-de-france",
    "giro", "vuelta", "klassieker", "etappe", "koers",
    "tennis", "tennisser", "tennistoernooi", "wimbledon", "roland-garros",
    "grand-slam", "atp", "wta",
    "formule-1", "formule1", "grand-prix", "coureur", "verstappen",
    "motogp", "atletiek", "zwemmen", "zwemmer", "golf", "golfer",
    "schaatsen", "schaatser", "marathon", "olympische-spelen", "olympics",
    "paralympics", "basketball", "volleybal", "handbal", "hockey",
    "honkbal", "rugby", "boksen", "bokser", "kickboksen", "mma",
    "ufc", "nba", "nfl", "nhl", "mlb", "fifa", "uefa", "ioc",
    "eredivisie-club", "supercup", "landenwedstrijd",

    /* EN sport */
    "football", "soccer", "match", "championship", "league",
    "goal", "goals", "penalty", "offside", "referee",
    "coach", "player", "players", "team", "teams", "club", "clubs",
    "tournament", "friendly", "qualifier", "playoff",
    "basketball", "tennis", "golf", "athletics", "swimming",
    "olympics", "olympic", "world-cup", "euro-cup",

    /* FR sport */
    "équipe", "l'équipe", "football", "match", "finale",
    "volleyball", "basket", "tennis", "cyclisme", "athlétisme",
    "championnat", "coupe", "tournoi",

    /* DE sport */
    "fußball", "mannschaft", "spieler", "trainer", "wettkampf",
    "meisterschaft", "turnier", "finale", "olympia"
  ];

  /* Top-voetbalclubs — signaal voor sport */
  var SPORT_CLUBS = [
    "ajax", "psv", "feyenoord", "az alkmaar", "fc utrecht", "fc twente",
    "vitesse", "sc heerenveen", "sparta rotterdam", "willem ii",
    "go ahead eagles", "pec zwolle", "rkc waalwijk", "fortuna sittard",
    "excelsior", "almere city", "heracles", "n.e.c.", "nec nijmegen",
    "real madrid", "barcelona", "atletico madrid", "manchester united",
    "manchester city", "liverpool", "chelsea", "arsenal", "tottenham",
    "juventus", "inter milan", "ac milan", "bayern münchen",
    "borussia dortmund", "paris saint-germain", "psg",
    "man city", "man united"
  ];

  /* ============================================================
     WOORDENLIJSTEN
     ============================================================ */

  var W_MILITAIR = {
    "raketaanval":3, "raketinslag":3, "missile-strike":3, "missile-attack":3,
    "ballistische-raket":3, "hypersonische-raket":3,
    "bombardement":3, "bombardementen":3, "bombing":3, "bombardment":3, "gebombardeerd":3,
    "luchtaanval":3, "luchtaanvallen":3, "airstrike":3, "air-strike":3,
    "beschieting":3, "beschietingen":3, "shelling":3, "beschoten":3,
    "mortieraanval":3, "artillerievuur":3, "granaatinslag":3,
    "invasie":3, "invasion":3, "invaded":3, "binnengevallen":3,
    "offensief":3, "offensive":3, "tegenoffensief":3, "counteroffensive":3,
    "vuurgevecht":3, "grondgevecht":3,
    "drone-aanval":3, "droneaanval":3, "drone-strike":3,
    "neergehaald":3, "downed":3, "shot-down":3, "intercepted":3,
    "escalatie":2, "escalation":2, "escaleert":2, "escaleerde":2,
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
    "nato":2, "navo":2,
    "frontlinie":2, "frontline":2, "front":2,
    "oorlog":2, "war":2,
    "wapen":2, "wapens":2, "weapon":2, "weapons":2,
    "patriot":2, "s-300":2, "s-400":2, "iron-dome":2,
    "paramilitaire":2, "huurlingen":2, "huursoldaten":2,
    "bevelhebber":2, "generaal":2, "kolonel":2, "commandant":2,
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

  var W_POLITIEK = {
    "verkiezing":3, "verkiezingen":3, "election":3, "elections":3,
    "referendum":3, "volksraadpleging":3,
    "staatsgreep":3, "coup":3, "militaire-coup":3,
    "wetsvoorstel":3, "wetsontwerp":3, "amendement":3,
    "motie-van-wantrouwen":3,
    "regeringscrisis":3, "kabinetscrisis":3, "kabinet-valt":3,
    "regeerakkoord":3, "coalitieakkoord":3,
    "verkiezingsprogramma":3, "partijprogramma":3,
    "sanction":3, "sanctions":3, "sanctie":3, "sancties":3,
    "parlement":2, "parliament":2, "volksvertegenwoordiging":2,
    "tweede-kamer":2, "eerste-kamer":2, "senaat":2,
    "coalitie":2, "coalition":2, "oppositie":2, "opposition":2,
    "kabinet":2, "cabinet":2, "regering":2, "government":2,
    "president":2, "presidentschap":2, "premier":2, "prime-minister":2,
    "minister":2, "ministers":2, "staatssecretaris":2,
    "diplomaat":2, "diplomaten":2, "ambassadeur":2, "ambassadeurs":2,
    "verdrag":2, "treaty":2, "akkoord":2, "overeenkomst":2,
    "staatsbezoek":2, "topoverleg":2, "vredesoverleg":2,
    "politieke-partij":2, "fractie":2, "fractievoorzitter":2,
    "lijsttrekker":2, "kandidatenlijst":2, "kiesrecht":2,
    "parlementsverkiezing":2, "presidentsverkiezing":2,
    "gemeenteraad":2, "provinciale-staten":2, "waterschap":2,
    "formatie":2, "informateur":2, "formateur":2,
    "foreign-minister":2, "foreign-ministry":2,
    "vredesplan":2, "peace-plan":2,
    "politiek":1, "political":1, "politicus":1, "politica":1,
    "partij":1, "party":1, "campagne":1, "campaign":1,
    "debat":1, "debate":1, "stemming":1, "vote":1,
    "stem":1, "voters":1, "kiezers":1,
    "beleid":1, "policy":1, "overheid":1, "authority":1
  };

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

  /* ============================================================
     SUBSTRING + TERRORISME
     ============================================================ */

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

  /* ============================================================
     REPORT-VERBS (alleen titel-check)
     ============================================================ */
  var REPORT_VERBS = {
    "says":3, "said":3, "told":3, "reported":3, "reports":3, "reportedly":3,
    "claims":3, "claimed":3, "denies":3, "denied":3, "denial":3,
    "warns":3, "warned":3, "warning":3, "threatens":3, "threatened":3,
    "threatening":3, "threat":3, "announces":3, "announced":3,
    "declares":3, "declared":3, "reveals":3, "revealed":3,
    "states":3, "stated":3, "confirms":3, "confirmed":3,
    "accuses":3, "accused":3, "urges":3, "urged":3,
    "according-to":3, "statement":3, "statements":3,
    "announcement":3, "declaration":3, "declarations":3,
    "plot":3, "plots":3, "plotting":3, "plotted":3,
    "plans-to":3, "planning":3, "planned":3,
    "considers":3, "considering":3,
    "highlights":3, "highlighted":3,
    "negotiations":3, "negotiates":3, "negotiating":3,
    "talks":3, "summit":3, "diplomacy":3, "diplomatic":3,
    "mediates":3, "mediation":3, "mediators":3,
    "condemns":3, "condemned":3, "praises":3, "praised":3,
    "meet":3, "meets":3, "met":3, "meeting":3, "meetings":3,
    "visit":3, "visits":3, "visited":3,
    "hosts":3, "hosted":3, "arrives":3, "arrived":3, "departed":3,
    "zegt":3, "zei":3, "vertelt":3, "vertelde":3,
    "meldt":3, "meldde":3, "bericht":3, "berichtte":3,
    "verklaart":3, "verklaarde":3, "beweert":3, "beweerde":3,
    "ontkent":3, "ontkende":3, "bevestigt":3, "bevestigde":3,
    "waarschuwt":3, "waarschuwde":3, "dreigt":3, "dreigde":3,
    "beschuldigt":3, "beschuldigde":3, "eist":3, "eiste":3,
    "volgens":3, "verklaring":3, "verklaringen":3,
    "aankondiging":3, "aankondigt":3, "aankondigde":3,
    "plan":2, "plannen":3, "plant":3, "plande":3,
    "overweegt":3, "overwoog":3,
    "onderhandelingen":3, "overleg":3, "topoverleg":3,
    "diplomatiek":3, "diplomaat":3, "diplomaten":3,
    "ontmoet":3, "ontmoette":3, "ontmoeting":3,
    "bezoekt":3, "bezocht":3, "bezoek":3,
    "reist-naar":3, "arriveert":3,
    "live":2, "liveblog":3,
    "selon":3, "déclare":3, "annonce":3, "rapporte":3,
    "affirme":3, "avertit":3, "menace":3,
    "négociations":3, "pourparlers":3,
    "sagt":3, "sagte":3, "berichtet":3, "laut":3, "meldet":3,
    "warnt":3, "warnte":3, "droht":3, "drohte":3,
    "erklärt":3, "erklärung":3
  };

  /* ============================================================
     ACTION-VERBS — alleen SPECIFIEKE militaire werkwoorden
     (generieke als launches/fires/hits zijn verwijderd)
     ============================================================ */
  var ACTION_VERBS = {
    /* Ondubbelzinnig militair */
    "struck":3, "strikes-on":3, "strikes-in":3,
    "bombed":3, "shelled":3, "invaded":3,
    "shot-down":3, "downed":3, "intercepted":3,
    "besieged":3, "surrounded":2,
    "captured":2, "seized":2, "recaptured":2,
    "repelled":2, "withdrew":2, "withdrawn":2,

    /* Nederlands */
    "trof":3, "troffen":3, "bombardeerde":3, "bombardeerden":3,
    "beschoot":3, "beschoten":3, "viel-binnen":3, "vielen-binnen":3,
    "veroverde":3, "veroverden":3, "enterde":3, "enterd":3,
    "sloeg-toe":2,

    /* Frans */
    "frappé":3, "attaqué":3, "envahi":3, "bombardé":3,
    "abattu":3,

    /* Duits */
    "getötet":3, "angegriffen":3, "invadiert":3, "bombardiert":3,
    "abgeschossen":3, "eingedrungen":3
  };

  /* Specifieke militaire combinaties (regex) */
  var MILITARY_PATTERNS = [
    /\b(launched|fired|conducted)\s+\d*\s*(missiles?|rockets?|drones?|airstrikes?|strikes?|attacks?|offensive|operations?)\b/i,
    /\b(shot|downed|intercepted)\b.*\b(aircraft|drone|missile|jet|rocket)\b/i,
    /\b(killed|wounded|injured)\s+\d+\b/i,
    /\b\d+\s+(killed|dead|wounded|injured|casualties)\b/i,
    /\b(airstrike|missile|rocket|drone|bomb|shell)\s+(hit|struck|targeted|destroyed)\b/i,
    /\bhit\s+(by|with)\s+(airstrike|missile|rocket|drone|bomb|shell)/i
  ];

  /* ============================================================
     LOCATIES
     ============================================================ */
  var CONFLICT_ZONES = [
    "gaza", "israel", "israël", "israeli", "palestijn", "palestina", "palestinian",
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
    "niger", "niamey", "myanmar", "burma", "kashmir", "kasjmir",
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
    "venezuela", "colombia", "mexico", "mexican"
  ];

  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash-report", "isw", "war-mapper",
    "reuters-tg", "al-jazeera-ar-tg", "al-arabiya-tg",
    "middle-east-eye-tg", "kyiv-independent"
  ];

  /* ============================================================
     COMPILATIE
     ============================================================ */
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
  var P_REPORT_VERBS = compileMap(REPORT_VERBS);
  var P_ACTION_VERBS = compileMap(ACTION_VERBS);

  var P_SUBSTRING = [];
  for (var sw in SUBSTRING_WORDS) {
    P_SUBSTRING.push({
      word: sw, cat: SUBSTRING_WORDS[sw].cat, weight: SUBSTRING_WORDS[sw].weight,
      pattern: new RegExp(sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    });
  }

  var P_TERROR = TERRORISM_WORDS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_CONFLICT = CONFLICT_ZONES.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_INSTABLE = INSTABLE_ZONES.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_SPORT = SPORT_WORDS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  var P_SPORT_CLUBS = SPORT_CLUBS.map(function(w){ return { word: w, pattern: compilePattern(w) }; });

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
     SPORT-DETECTIE — agressief
     ============================================================ */
  function isSportBySource(sourceLower) {
    for (var i = 0; i < SPORT_SOURCES.length; i++) {
      if (sourceLower.indexOf(SPORT_SOURCES[i]) !== -1) return SPORT_SOURCES[i];
    }
    return null;
  }

  function isSportByWords(text) {
    for (var i = 0; i < P_SPORT.length; i++) {
      if (P_SPORT[i].pattern.test(text)) return P_SPORT[i].word;
    }
    return null;
  }

  function isSportByClub(text) {
    for (var i = 0; i < P_SPORT_CLUBS.length; i++) {
      if (P_SPORT_CLUBS[i].pattern.test(text)) return P_SPORT_CLUBS[i].word;
    }
    return null;
  }

  /* ============================================================
     REPORT-MODE — ALLEEN TITEL
     ============================================================ */
  function detectReportMode(title) {
    var titleLower = String(title || "").toLowerCase();
    var reportScore = 0;
    var indicators = [];

    /* Prefix check */
    var prefixes = [
      /^report\s*:/i, /^report\s*-/i,
      /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
      /^en\s*direct/i,
      /^analysis\s*:/i, /^opinion\s*:/i, /^commentary\s*:/i,
      /^update\s*:/i, /^updates?\s*:/i,
      /^\d+\s+days?\s+before/i,
      /^watch\s*:/i, /^video\s*:/i, /^interview\s*:/i, /^exclusive\s*:/i
    ];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i].test(title)) {
        reportScore += 5;
        indicators.push({ type: "prefix" });
        break;
      }
    }

    /* Report-verbs in titel */
    var rv = countMatches(titleLower, P_REPORT_VERBS);
    reportScore += rv.score;
    rv.hits.forEach(function(h){ indicators.push({ type: "verb", word: h.word }); });

    /* Action-verbs in titel */
    var av = countMatches(titleLower, P_ACTION_VERBS);
    var actionScore = av.score;
    for (var m = 0; m < MILITARY_PATTERNS.length; m++) {
      if (MILITARY_PATTERNS[m].test(titleLower)) actionScore += 5;
    }

    var isReport = reportScore > 0 && reportScore > actionScore * 1.5;
    var isAction = actionScore > reportScore;

    return {
      isReport: isReport,
      isAction: isAction,
      reportScore: reportScore,
      actionScore: actionScore,
      indicators: indicators.slice(0, 5)
    };
  }

  /* ============================================================
     ECHTE MILITAIRE ACTIE?
     ============================================================ */
  function hasRealMilitaryAction(title, text) {
    var titleLower = String(title || "").toLowerCase();

    /* 1. Militair gewicht-3 woord in titel */
    for (var i = 0; i < P_MILITAIR.length; i++) {
      if (P_MILITAIR[i].weight >= 3 && P_MILITAIR[i].pattern.test(titleLower)) return true;
    }

    /* 2. Specifieke militaire regex-patronen in titel */
    for (var m = 0; m < MILITARY_PATTERNS.length; m++) {
      if (MILITARY_PATTERNS[m].test(titleLower)) return true;
    }

    /* 3. Actie-verb in titel (min 3 punten) */
    var titleAction = countMatches(titleLower, P_ACTION_VERBS);
    if (titleAction.score >= 3) return true;

    /* 4. Actor + actie-verb in titel */
    var titleHasActor = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|iraqi|yemeni|lebanese|idf|hamas|hezbollah|houthi|taliban|isis|al.qaeda|armed.group|militants|insurgents|fighters|troops|forces|soldiers|army|navy|military|rebels)\b/i.test(titleLower);
    if (titleHasActor && titleAction.score >= 2) return true;

    /* 5. Fallback: actie in hele tekst met sterk gewicht */
    var fullAction = countMatches(text, P_ACTION_VERBS);
    for (var m2 = 0; m2 < MILITARY_PATTERNS.length; m2++) {
      if (MILITARY_PATTERNS[m2].test(text)) fullAction.score += 5;
    }
    var fullActor = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|idf|hamas|hezbollah|houthi|taliban|isis|al.qaeda|armed.group|militants|insurgents|fighters|troops|forces|soldiers|army|military|rebels)\b/i.test(text);
    if (fullActor && fullAction.score >= 6) return true;

    return false;
  }

  /* ============================================================
     SUBTYPE-DETECTIE
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
    if (/\bplot|plotting|plots|plotted/.test(text)) return "Samenzwering";
    if (/\bthreat|threatens|threatening|threatened|dreigt|waarschuwt/.test(text)) return "Dreiging";
    if (/\bsanctions?\s+(against|on)|sanctie|sancties/.test(text)) return "Sanctie";
    if (/\bnegotiations|negotiating|talks|summit|mediators|overleg|onderhandelingen/.test(text)) return "Diplomatie";
    if (/\bstatement|declaration|verklaring|aankondiging/.test(text)) return "Verklaring";
    if (/\bverkiezing|election/.test(text)) return "Verkiezing";
    if (/\breferendum/.test(text)) return "Referendum";
    if (/\bstaatsgreep|coup/.test(text)) return "Staatsgreep";
    if (/\bforeign-minister|prime-minister|diplomat|ambassador/.test(text)) return "Diplomatie";
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

  /* ============================================================
     HOOFDFUNCTIE v3.1
     ============================================================ */
  function classify(title, desc, source, url) {
    var titleStr = String(title || "");
    var titleLower = titleStr.toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();

    /* ===== SPORT-CHECK EERST ===== */
    var sportBySource = isSportBySource(sourceLower);
    var sportByWords = isSportByWords(text);
    var sportByClub = isSportByClub(text);

    if (sportBySource || sportByWords || sportByClub) {
      return {
        category: "sport",
        subtype: "Sport",
        confidence: 95,
        uncertain: false,
        scores: {},
        signals: {},
        meta: {
          sportBySource: sportBySource,
          sportByWords: sportByWords,
          sportByClub: sportByClub,
          blocked: true
        }
      };
    }

    /* ===== SCORES ===== */
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

    /* ===== MODUS (alleen titel) ===== */
    var mode = detectReportMode(titleLower);

    /* ===== ECHTE MILITAIRE ACTIE ===== */
    var hasMil = hasRealMilitaryAction(titleLower, text);

    /* ===== REPORT-MODE OVERRIDE ===== */
    if (mode.isReport && !hasMil) {
      scores.politiek += mode.reportScore;
      scores.militair = 0;

      var crimeStrong = scores.crime >= 8;
      var protestStrong = scores.protest >= 8;
      var civielStrong = scores.civiel >= 8;

      if (!crimeStrong && !protestStrong && !civielStrong) {
        scores.politiek = Math.max(scores.politiek, scores.crime + 3, scores.protest + 3, scores.civiel + 3);
      }
    }

    /* ===== MILITAIR ===== */
    if (!hasMil) scores.militair = 0;
    else {
      var conflictLocation = findMatch(text, P_CONFLICT);
      var instableLocation = findMatch(text, P_INSTABLE);
      if (conflictLocation) scores.militair += 2;
      else if (instableLocation) scores.militair += 1;

      for (var i = 0; i < OSINT_SOURCES.length; i++) {
        if (sourceLower.indexOf(OSINT_SOURCES[i]) !== -1) { scores.militair += 2; break; }
      }
    }

    /* ===== TERRORISME ===== */
    var terrorWord = findMatch(text, P_TERROR);
    if (terrorWord) {
      var conflictLoc = findMatch(text, P_CONFLICT);
      if (conflictLoc) scores.militair += 5;
      else scores.crime += 5;
    }

    /* ===== CIVIEL-BLOKKADE ===== */
    var hasStrongCiviel = false;
    for (var ci = 0; ci < ciRes.hits.length; ci++) {
      if (ciRes.hits[ci].weight === 3) { hasStrongCiviel = true; break; }
    }
    if (hasStrongCiviel && !hasMil) {
      var hasStrongMil = false;
      for (var mi = 0; mi < mRes.hits.length; mi++) {
        if (mRes.hits[mi].weight >= 3) { hasStrongMil = true; break; }
      }
      if (!hasStrongMil) scores.militair = 0;
    }

    /* ===== WINNAAR ===== */
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

    /* ===== CONFIDENCE ===== */
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

    /* ===== SUBTYPE ===== */
    var subtype = "";
    if (winner.cat === "militair") subtype = detectMilitairSubtype(text, !!terrorWord);
    else if (winner.cat === "crime") subtype = detectCrimeSubtype(text, !!terrorWord);
    else if (winner.cat === "politiek") subtype = detectPolitiekSubtype(text);
    else if (winner.cat === "protest") subtype = detectProtestSubtype(text);
    else subtype = detectCivielSubtype(text);

    return {
      category: winner.cat, subtype: subtype,
      confidence: confidence, uncertain: uncertain,
      scores: scores, signals: hits,
      meta: {
        mode: mode,
        hasMilitaryAction: hasMil,
        isReport: mode.isReport,
        isAction: mode.isAction,
        terrorWord: terrorWord
      }
    };
  }

  window.WDClassifier = {
    version: VERSION, classify: classify, categories: CATS,
    _words: {
      militair: W_MILITAIR, crime: W_CRIME, politiek: W_POLITIEK,
      protest: W_PROTEST, civiel: W_CIVIEL, sport: SPORT_WORDS,
      report_verbs: REPORT_VERBS, action_verbs: ACTION_VERBS,
      sport_sources: SPORT_SOURCES, sport_clubs: SPORT_CLUBS
    },
    _substrings: SUBSTRING_WORDS,
    _locations: { conflict: CONFLICT_ZONES, instable: INSTABLE_ZONES },
    _terrorism: TERRORISM_WORDS
  };

  try { if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen"); } catch(e){}

})();