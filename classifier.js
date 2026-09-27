/* ============================================================
   WAR DESK — classifier.js v4.0
   ------------------------------------------------------------
   Belangrijkste wijzigingen t.o.v. v3.1:
   - Sport volledig geïsoleerd (hard block, 2 tiers)
   - Fix dash-matching (staakt-het-vuren = staakt het vuren)
   - Report-mode verzacht (geen harde reset militair)
   - hasRealMilitaryAction versoepeld (conflict zone + actie)
   - Explosie / explosion toegevoegd als neutrale term
   - Arabische woordenlijst (~140 termen)
   - Conflict zones uitgebreid (Pakistan, India, Turkije, etc.)
   - Dubbele substring-score voorkomen
   - Confidence met absolute drempel
   - Engelse geweldswoorden naar crime
   - ACTION_VERBS / MILITARY_PATTERNS uitgebreid
   - REPORT_VERBS getrimd (geen says/said meer)
   - Subtypes uitgebreid
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v4.0";
  var CATS = ["militair", "crime", "politiek", "protest", "civiel"];
  var PRIORITY = { militair: 5, crime: 4, politiek: 3, protest: 2, civiel: 1 };

  /* ============================================================
     SPORT — HARD BLOCK, 2-TIER
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
    "uefa.com", "olympics.com", "atptour", "wtatennis"
  ];

  /* Tier 1: 1 hit = sport (competitions, onmiskenbare sporttermen) */
  var SPORT_STRONG = [
    "eredivisie", "eerste divisie", "keuken kampioen divisie",
    "premier league", "champions league", "europa league",
    "conference league", "nations league", "copa america",
    "africa cup", "afcon", "asian cup", "gold cup",
    "world cup", "wk voetbal", "ek voetbal", "wk-voetbal", "ek-voetbal",
    "wk wielrennen", "wk atletiek", "wk zwemmen",
    "olympische spelen", "olympics", "paralympics", "paralympische spelen",
    "tour de france", "giro d'italia", "vuelta", "vuelta a espana",
    "wimbledon", "roland garros", "roland-garros",
    "us open tennis", "australian open",
    "grand slam tennis", "grand slam toernooi",
    "super bowl", "world series", "stanley cup", "nba finals",
    "nba playoffs", "motogp", "formule 1", "formule1", "f1 grand prix",
    "grand prix", "indycar", "nascar",
    "voetbalclub", "voetbalploeg", "voetbalwedstrijd", "voetbaltoernooi",
    "wielerploeg", "wielerwedstrijd", "wielrennen", "wielrenner",
    "atletiekwedstrijd", "atletiektoernooi",
    "tennistoernooi", "tenniswedstrijd", "tennisser",
    "bokswedstrijd", "bokser", "kickboksen", "kickbokser",
    "mma wedstrijd", "ufc", "ufc fight",
    "handbaltoernooi", "volleybaltoernooi", "basketbaltoernooi",
    "ijshockeywedstrijd", "honkbalwedstrijd",
    "schaatstoernooi", "schaatswedstrijd",
    "golf toernooi", "golftoernooi",
    "rugbywedstrijd", "rugbytoernooi"
  ];

  /* Tier 2: 3+ hits = sport (generieke termen) */
  var SPORT_WEAK = [
    "voetbal", "voetballer", "voetballers",
    "tennis", "tennissers",
    "basketbal", "basketballer",
    "volleybal", "volleyballer",
    "handbal", "handballer",
    "hockey", "hockeyer",
    "rugby", "rugbyspeler",
    "honkbal", "honkbalspeler",
    "softbal", "korfbal",
    "atletiek", "atleet", "atleten",
    "zwemmen", "zwemmer", "zwemmers",
    "schaatsen", "schaatser", "schaatsers",
    "wielrennen", "wielrenners",
    "marathon", "halve marathon",
    "judo", "judoka", "karate", "taekwondo",
    "boksen", "bokser", "boksers",
    "golf", "golfer", "golfers",
    "skaten", "skateboarden", "surfen",
    "zeilen", "roeien", "kanovaren",
    "paardrijden", "paardensport",
    "darts", "snooker", "biljart",
    "schaken", "schaker",
    "esports", "e-sports",
    "keeper", "doelman", "doelvrouw",
    "spits", "spitsen", "aanvaller", "aanvallers",
    "verdediger", "verdedigers",
    "middenvelder", "middenvelders",
    "scheidsrechter", "arbiter", "referee",
    "trainer", "coach", "bondscoach", "hoofdcoach",
    "doelpunt", "doelpunten", "goal", "goals",
    "penalty", "penaltys", "strafschoppen",
    "buitenspel", "offside",
    "rode kaart", "gele kaart",
    "competitie", "wedstrijd", "wedstrijden",
    "toernooi", "toernooien",
    "kampioenschap", "kampioenschappen",
    "landskampioen", "landskampioenen",
    "titelverdediger", "titelverdedigers",
    "play-offs", "playoffs", "degradatie", "promotie",
    "transfer", "transfers", "transferwindow",
    "speler", "spelers", "speelster", "speelsters",
    "team", "teams", "ploeg", "ploegen",
    "elftal", "elftallen", "selectie",
    "supporters", "fans", "fanatieke",
    "stadium", "stadion", "arena",
    "seizoen", "competitieseizoen"
  ];

  var SPORT_CLUBS = [
    /* NL */
    "ajax", "psv", "feyenoord", "az alkmaar", "fc utrecht", "fc twente",
    "vitesse", "sc heerenveen", "sparta rotterdam", "willem ii",
    "go ahead eagles", "pec zwolle", "rkc waalwijk", "fortuna sittard",
    "excelsior", "almere city", "heracles", "nec nijmegen", "n.e.c.",
    "fc groningen", "nac breda", "ado den haag", "de graafschap",
    "top oss", "telstar", "eindhoven", "mvv", "roda jc",
    /* BE */
    "anderlecht", "club brugge", "standard luik", "rsc anderlecht",
    "kaa gent", "racing genk", "charleroi", "cercle brugge",
    /* EN */
    "manchester united", "manchester city", "man city", "man united",
    "liverpool", "chelsea", "arsenal", "tottenham", "newcastle",
    "aston villa", "west ham", "everton", "brighton", "wolves",
    "nottingham forest", "leicester", "southampton",
    /* ES */
    "real madrid", "barcelona", "fc barcelona", "atletico madrid",
    "sevilla", "valencia", "villarreal", "real betis", "athletic bilbao",
    "real sociedad", "celta vigo", "getafe",
    /* IT */
    "juventus", "inter milan", "internazionale", "ac milan",
    "napoli", "roma", "as roma", "lazio", "atalanta", "fiorentina",
    /* DE */
    "bayern münchen", "bayern munchen", "borussia dortmund",
    "rb leipzig", "bayer leverkusen", "eintracht frankfurt",
    "vfb stuttgart", "borussia mönchengladbach", "werder bremen",
    /* FR */
    "paris saint-germain", "psg", "olympique marseille", "olympique lyon",
    "as monaco", "lille osc", "rennes", "nice",
    /* TR */
    "galatasaray", "fenerbahçe", "fenerbahce", "besiktas", "trabzonspor",
    /* PT */
    "benfica", "fc porto", "sporting lisbon", "sporting cp", "braga",
    /* SCO */
    "celtic", "rangers",
    /* Overig */
    "zenit", "cska moskou", "shakhtar donetsk", "dynamo kyiv",
    "red bull salzburg", "fc basel", "young boys",
    "club america", "chivas", "boca juniors", "river plate",
    "flamengo", "palmeiras", "santos", "corinthians",
    "al hilal", "al nassr", "al ahli"
  ];

  /* ============================================================
     WOORDENLIJSTEN — MILITAIR
     ============================================================ */
  var W_MILITAIR = {
    /* Raketten & luchtaanvallen */
    "raketaanval":3, "raketaanvallen":3, "raketinslag":3, "raketinslagen":3,
    "missile-strike":3, "missile-attack":3, "missile-strikes":3,
    "ballistische-raket":3, "ballistische-raketten":3,
    "hypersonische-raket":3, "kruisraket":3, "kruisraketten":3,
    "luchtaanval":3, "luchtaanvallen":3, "airstrike":3, "airstrikes":3,
    "air-strike":3, "air-strikes":3,
    "bombardement":3, "bombardementen":3, "bombing":3, "bombings":3,
    "bombardment":3, "gebombardeerd":3, "gebombardeerde":3,
    "beschieting":3, "beschietingen":3, "shelling":3, "beschoten":3,
    "mortieraanval":3, "mortieraanvallen":3, "mortiergranaat":3,
    "artillerievuur":3, "artilleriebeschieting":3, "granaatinslag":3,
    "droneaanval":3, "droneaanvallen":3, "drone-aanval":3, "drone-strike":3,
    "gevechtsdrone":3, "kamikazedrone":3,

    /* Oorlog & invasie */
    "invasie":3, "invasion":3, "invaded":3, "binnengevallen":3,
    "offensief":3, "offensieven":3, "offensive":3, "offensives":3,
    "tegenoffensief":3, "counteroffensive":3, "counter-offensive":3,
    "vuurgevecht":3, "vuurgevechten":3, "grondgevecht":3, "grondgevechten":3,
    "neergehaald":3, "neergehaalde":3, "downed":3, "shot-down":3,
    "onderschept":3, "onderschepte":3, "intercepted":3,

    /* Militair algemeen */
    "escalatie":2, "escalaties":2, "escalation":2, "escaleert":2, "escaleerde":2,
    "militair":2, "militaire":2, "military":2,
    "leger":2, "legers":2, "army":2, "krijgsmacht":2, "strijdkrachten":2,
    "troepen":2, "troops":2, "forces":2,
    "soldaat":2, "soldaten":2, "soldier":2, "soldiers":2,
    "fighter":2, "fighters":2, "strijder":2, "strijders":2,
    "idf":2, "israel-defense-forces":2, "hamas":2, "hezbollah":2,
    "houthi":2, "houthis":2, "taliban":2, "isis":2, "isil":2,
    "al-qaeda":2, "alqaeda":2, "al-shabaab":2, "boko-haram":2,
    "wagner":2, "wagner-groep":2,
    "armed-group":2, "armed-groups":2, "gewapende-groep":2,
    "gewapende-groepering":2, "gewapende-militie":3,
    "militie":3, "milities":3, "militanten":2,
    "militants":2, "militant":2, "insurgents":2, "insurgent":2,
    "rebellen":2, "rebellenbeweging":2, "opstandelingen":2,
    "jihadisten":2, "jihadist":2,
    "nato":2, "navo":2,
    "frontlinie":2, "frontline":2, "front":2,
    "oorlog":2, "oorlogen":2, "war":2, "wars":2,
    "oorlogsgebied":1, "conflictgebied":1, "crisisgebied":1,
    "wapen":2, "wapens":2, "weapon":2, "weapons":2,
    "patriot":2, "s-300":2, "s-400":2, "iron-dome":2, "ijzeren-koepel":2,
    "paramilitaire":2, "paramilitair":2,
    "huurlingen":2, "huursoldaten":2,
    "bevelhebber":2, "generaal":2, "kolonel":2, "commandant":2,
    "tank":2, "tanks":2, "pantservoertuig":2, "pantserwagen":2,
    "gevechtsvliegtuig":2, "gevechtsvliegtuigen":2, "fighter-jet":2, "straaljager":2,
    "marine":2, "warship":2, "fregat":2, "torpedo":2,
    "militair-doelwit":2, "militaire-installatie":2, "militair-objectief":2,
    "wapenstilstand":2, "wapenstilstanden":2,
    "staakt-het-vuren":2, "staakt het vuren":2, "ceasefire":2, "cease-fire":2,
    "vredesakkoord":2, "vredesovereenkomst":2,
    "gesneuveld":1, "gesneuvelde":1, "gesneuvelden":1,
    "gesneuvelden":1, "krijgsgevangene":2, "krijgsgevangenen":2,
    "slagveld":1, "battlefield":1,
    "veteraan":1, "veteranen":1,
    "conflict":1, "conflicten":1, "strijd":1,

    /* Oorlog gerelateerde werkwoorden */
    "treft":2, "troffen":2, "getroffen":2,
    "aanval":2, "aanvallen":2, "attack":2, "attacks":2,
    "bestookt":3, "bestookte":3
  };

  /* ============================================================
     WOORDENLIJSTEN — CRIME (misdaad)
     ============================================================ */
  var W_CRIME = {
    /* Doding */
    "moord":3, "moorden":3, "vermoord":3, "vermoorde":3,
    "moordenaar":3, "moordenaars":3,
    "doodslag":3, "doodde":3, "doodden":3, "gedood":2,
    "neergeschoten":3, "neergeschotene":3, "neergestoken":3, "neergestokene":3,
    "neergeslagen":3, "doodgeslagen":3,
    "liquidatie":3, "liquidaties":3, "afrekening":3, "afrekeningen":3,
    "homicide":3, "murder":3, "murdered":3, "manslaughter":3,
    "shot-dead":3, "stabbed-to-death":3,
    "killed":2, "kills":2,

    /* Wapens & geweld */
    "schietpartij":3, "schietpartijen":3, "schietincident":3,
    "schietincidenten":3, "shooting":3, "shootings":3,
    "steekpartij":3, "steekpartijen":3, "steekincident":3,
    "steekincidenten":3, "stabbing":3, "stabbings":3,
    "vuurwapen":2, "vuurwapens":2, "illegale-vuurwapens":3,
    "wapenhandel":3, "illegale-wapenhandel":3, "wapensmokkel":3,
    "overval":3, "overvallen":3, "beroving":3, "berovingen":3,
    "roofoverval":3, "roofovervallen":3, "bankoverval":3,

    /* Ontvoering / gijzeling */
    "ontvoering":3, "ontvoeringen":3, "ontvoerd":3, "ontvoerde":3,
    "kidnapping":3, "kidnapped":3, "gekidnapt":3,
    "gijzeling":3, "gijzelingen":3, "gijzelaar":3, "gijzelaars":3,
    "hostage":3, "hostages":3, "hostage-taking":3,

    /* Zedendelicten */
    "marteling":3, "martelingen":3, "torture":3,
    "mishandeling":3, "zware-mishandeling":3,
    "verkrachting":3, "verkrachtingen":3, "rape":3,
    "aanranding":3, "zedenmisdrijf":3, "zedendelict":3,
    "kindermisbruik":3, "kinderporno":3, "seksuele-uitbuiting":3,
    "seksueel-misbruik":3,

    /* Fraude & economische misdaad */
    "fraude":3, "fraudes":3, "fraudeur":3, "fraudeurs":3,
    "oplichting":3, "oplichtingen":3, "opgelicht":3,
    "phishing":3, "hacking":3, "hacker":3, "hackers":3,
    "cyberaanval":3, "cyberaanvallen":3, "cyberattack":3,
    "ransomware":3, "malware":3, "datalek":3, "datalekken":3,
    "drugssmokkel":3, "drugshandel":3, "drugstransport":3,
    "witwassen":3, "witwasserij":3, "witwaspraktijken":3,
    "corruptie":3, "corrupt":3, "omkoping":3, "steekpenningen":3,
    "belastingfraude":3, "btw-fraude":3, "accijnsfraude":3,
    "identiteitsdiefstal":3, "identiteitsfraude":3,
    "valsemunterij":3, "valsheid-in-geschrifte":3,
    "milieucriminaliteit":3, "illegale-afvaldump":3,
    "namaak":3, "productpiraterij":3, "marktmanipulatie":3,

    /* Georganiseerde misdaad */
    "maffia":3, "mocromaffia":3, "maffioso":3, "maffiosi":3,
    "kartel":3, "kartels":3, "drugskartel":3, "drugskartels":3,
    "drugssyndicaat":3, "criminele-organisatie":3,
    "georganiseerde-misdaad":3, "organized-crime":3,
    "bende":2, "bendes":2, "straatbende":2, "motorbende":2,
    "onderwereld":2, "handlanger":2, "handlangers":2,

    /* Drugs */
    "drugs":2, "drug":2, "drugsbaron":3, "drugslab":3, "drugspand":3,
    "drugshandel":3, "drugsdealer":3, "drugsdealers":3, "dealer":2,

    /* Politie / justitie */
    "verdachte":2, "verdachten":2, "suspect":2, "suspects":2,
    "arrestatie":2, "arrestaties":2, "aangehouden":2, "gearresteerd":2,
    "opgepakt":2, "veroordeeld":2, "veroordeling":2,
    "convicted":2, "conviction":2, "celstraf":2, "gevangenisstraf":2,
    "politieonderzoek":2, "politie-onderzoek":2, "recherche":2,
    "opsporing":2, "opsporingsonderzoek":2,
    "justitie":2, "openbaar-ministerie":2, "om-strafbaar":2,
    "rechtbank":1, "rechter":1, "uitspraak":1, "vonnis":1,

    /* Ontsnapping */
    "ontsnapping":3, "ontsnappingen":3, "ontsnapt":3, "ontsnapte":3,
    "escape":3, "escaped":3, "gevangenisontsnapping":3, "uitbraak":3,

    /* Explosieven (neutral — context bepaalt) */
    "explosie":2, "explosies":2, "ontploffing":2, "ontploffingen":2,
    "explosion":2, "explosions":2, "blast":2, "blasts":2,
    "bom":3, "bommen":3, "bomb":3, "bombs":3,
    "explosief":3, "explosieven":3, "explosive":3, "explosives":3,
    "bomaanslag":4, "bomaanslagen":4, "bomb-attack":4,
    "autobom":4, "autobomaanslag":4, "car-bomb":4,

    /* Overig */
    "mensensmokkel":3, "mensenhandel":3, "human-trafficking":3,
    "mensensmokkelaar":3, "mensensmokkelaars":3,
    "smokkel":2, "smokkelaar":2, "smokkelaars":2,
    "helers":2, "heling":2,
    "teisteren":1, "teistert":1, "teisterde":1
  };

  /* ============================================================
     WOORDENLIJSTEN — POLITIEK
     ============================================================ */
  var W_POLITIEK = {
    /* Verkiezingen */
    "verkiezing":3, "verkiezingen":3, "election":3, "elections":3,
    "referendum":3, "referenda":3, "volksraadpleging":3,
    "staatsgreep":3, "staatsgrepen":3, "coup":3, "coups":3, "militaire-coup":3,
    "kiesrecht":3, "kiesstelsel":3,
    "parlementsverkiezing":3, "presidentsverkiezing":3,
    "gemeenteraadsverkiezing":3, "provinciale-statenverkiezing":3,

    /* Regering & parlement */
    "wetsvoorstel":3, "wetsvoorstellen":3, "wetsontwerp":3, "amendement":3,
    "motie-van-wantrouwen":3, "motie-van-treurnis":3,
    "regeringscrisis":3, "kabinetscrisis":3, "kabinet-valt":3,
    "regeerakkoord":3, "coalitieakkoord":3,
    "verkiezingsprogramma":3, "partijprogramma":3,
    "parlement":2, "parlementen":2, "parliament":2,
    "volksvertegenwoordiging":2,
    "tweede-kamer":2, "eerste-kamer":2, "senaat":2,
    "coalitie":2, "coalities":2, "coalition":2,
    "oppositie":2, "opposition":2,
    "kabinet":2, "kabinetten":2, "cabinet":2,
    "regering":2, "regeringen":2, "government":2,
    "president":2, "presidentschap":2, "premier":2, "prime-minister":2,
    "minister":2, "ministers":2, "staatssecretaris":2, "staatsecretarissen":2,
    "kamerlid":2, "kamerleden":2, "fractievoorzitter":2,
    "lijsttrekker":2, "kandidatenlijst":2,
    "formatie":2, "informateur":2, "formateur":2,

    /* Diplomatie */
    "diplomaat":2, "diplomaten":2, "ambassadeur":2, "ambassadeurs":2,
    "diplomatie":3, "diplomacy":3, "diplomatisch":3, "diplomatic":3,
    "verdrag":2, "verdragen":2, "treaty":2, "treaties":2,
    "akkoord":2, "overeenkomst":2, "overeenkomsten":2,
    "staatsbezoek":2, "topoverleg":3, "vredesoverleg":3,
    "vredesplan":3, "peace-plan":3,
    "dialoog":3, "dialog":3, "dialogue":3, "dialogen":3,
    "zelfbeheersing":3, "terughoudendheid":3, "self-restraint":3,
    "bemiddeling":3, "mediation":3, "mediator":2, "mediators":2,
    "onderhandeling":2, "onderhandelingen":3, "negotiation":2, "negotiations":3,
    "souvereiniteit":2, "soevereiniteit":2, "sovereignty":2,
    "vredesmissie":2, "vredesmacht":2, "peacekeeping":2,

    /* Sancties */
    "sanctie":3, "sancties":3, "sanction":3, "sanctions":3,
    "embargo":3, "embargo's":3,

    /* Politiek algemeen */
    "politiek":1, "political":1, "politicus":1, "politica":1,
    "partij":1, "partijen":1, "party":1, "parties":1,
    "campagne":1, "campaign":1,
    "debat":1, "debatten":1, "debate":1,
    "stemming":1, "vote":1, "voting":1,
    "stem":1, "voters":1, "kiezers":1,
    "beleid":1, "policy":1, "overheid":1, "authority":1,
    "parlementslid":1, "parlementsleden":1,
    "regeringsleider":1, "staatshoofd":1, "staatshoofden":1,
    "minister-president":1, "vicepremier":1,
    "ministerie":1, "departement":1, "ministry":1
  };

  /* ============================================================
     WOORDENLIJSTEN — PROTEST
     ============================================================ */
  var W_PROTEST = {
    "demonstratie":3, "demonstraties":3,
    "demonstranten":3, "demonstrant":3,
    "demonstreren":3, "demonstreerde":3,
    "protest":3, "protesten":3, "protesteerders":3,
    "betoging":3, "betogingen":3, "betogers":3,
    "rellen":3, "rellende":3, "relschoppers":3, "relschopper":3,
    "oproer":3, "oproeren":3, "volksopstand":3,
    "staking":3, "stakingen":3, "stakers":3, "stakingbreker":3,
    "worker-strike":3, "labor-strike":3, "general-strike":3, "strike":2,
    "boycot":3, "boycots":3, "boycott":3, "boycotts":3,
    "blokkade":3, "blokkades":3, "wegblokkade":3, "spoorblokkade":3,
    "sit-in":3, "sit-ins":3, "sit-inactie":3,
    "kraak":3, "kraken":3, "gekraakt":3, "kraakpand":3, "krakers":3,
    "activist":2, "activisten":2, "activisme":2,
    "protestmars":2, "stille-tocht":2, "stille tocht":2,
    "burgerlijke-ongehoorzaamheid":3, "civil-disobedience":3,
    "sociale-beweging":2, "social-movement":2,
    "vakbond":2, "vakbonden":2, "fnv":2, "cnv":2,
    "werkonderbreking":3, "estafettestaking":3, "prikactie":3,
    "vakbondsactie":3, "vakbondsacties":3,
    "leuzen":1, "spandoek":1, "spandoeken":1,
    "pamflet":1, "flyer":1, "pamfletten":1,
    "menigte":1, "duizenden-betogers":2,
    "politie-inzet":1, "waterkanon":2, "traangas":2
  };

  /* ============================================================
     WOORDENLIJSTEN — CIVIEL
     ============================================================ */
  var W_CIVIEL = {
    /* Natuurrampen */
    "aardbeving":3, "aardbevingen":3, "earthquake":3, "earthquakes":3,
    "naschok":3, "naschokken":3, "zeebeving":3,
    "overstroming":3, "overstromingen":3, "flood":3, "floods":3,
    "flooding":3, "tsunami":3, "vloedgolf":3,
    "lawine":3, "lawines":3, "aardverschuiving":3, "modderstroom":3,
    "orkaan":3, "orkanen":3, "hurricane":3, "tyfoon":3, "typhoon":3,
    "cycloon":3, "cyclone":3, "tornado":3, "windhoos":3, "wervelstorm":3,
    "vulkaanuitbarsting":3, "vulkaan":3, "lava":3,
    "bosbrand":3, "bosbranden":3, "wildfire":3, "natuurbrand":3,
    "droogte":3, "hittegolf":3, "noodweer":3, "noodstorm":3,
    "natuurramp":2, "natural-disaster":2,
    "ramp":2, "rampen":2, "disaster":2, "disasters":2, "catastrofe":2,

    /* Ongevallen */
    "instorting":3, "gebouwinstorting":3, "ingestort":3,
    "vliegtuigongeluk":3, "vliegramp":3, "plane-crash":3,
    "treinongeluk":3, "treinramp":3, "treinontsporing":3,
    "helikoptercrash":3, "helicopter-crash":3, "helikopterongeluk":3,
    "scheepsramp":3, "veerboot":2,
    "verdronken":3, "verdrinking":3, "drenkeling":3,
    "woningbrand":3, "flatbrand":3, "keukenbrand":3,
    "gaslek":3, "gasontploffing":3, "gas_explosion":3,
    "koolmonoxidevergiftiging":3, "co-vergiftiging":3,
    "verkeersongeval":3, "verkeersongeluk":3, "verkeersongevallen":3,
    "botsing":2, "aanrijding":3, "frontale-botsing":3,
    "file":2, "files":2, "verkeerschaos":3,
    "barbecue-ongeluk":3, "steekvlam":3,
    "vuurwerkongeval":3, "vuurwerkramp":3,

    /* Rampen & hulp */
    "ontruiming":2, "ontruimingen":2,
    "evacuatie":2, "evacuaties":2, "geëvacueerd":3,
    "vermiste":2, "vermist":2, "missing":2,
    "ongeluk":2, "ongelukken":2, "accident":2, "accidents":2,
    "brandweer":2, "fire-department":2,
    "ambulance":2, "traumahelikopter":2, "hulpdiensten":2,
    "noodgeval":2, "noodsituatie":2, "emergency":2,
    "toeristen":2, "vakantiegangers":2, "reizigers":2,
    "infrastructuur":2, "brug":2, "tunnel":2, "viaduct":2,
    "stroomuitval":3, "blackout":3, "stroomstoring":3,
    "wateroverlast":3, "treinvertraging":3,
    "hulpverlening":1, "reddingsactie":1, "redding":1,

    /* Slachtoffers (laag gewicht — overlapt met alles) */
    "gedood":1, "doden":1, "killed":1, "dead":1, "deaths":1,
    "dodelijk":1, "dodelijke":1, "fatal":1, "fatalities":1,
    "gewond":1, "gewonden":1, "wounded":1, "injured":1,
    "slachtoffer":1, "slachtoffers":1, "victims":1,
    "schade":1, "damage":1, "vernieling":1
  };

  /* ============================================================
     ARABISCH (substring-matching, geen word boundaries)
     ============================================================ */
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
    { w:"شهداء", cat:"militair", weight:2 },
    { w:"حماس", cat:"militair", weight:2 },
    { w:"حزب الله", cat:"militair", weight:2 },
    { w:"الحوثي", cat:"militair", weight:2 },
    { w:"طالبان", cat:"militair", weight:2 },
    { w:"داعش", cat:"militair", weight:2 },
    { w:"القاعدة", cat:"militair", weight:2 },

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
    { w:"انتخاب", cat:"politiek", weight:3 },
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
    { w:"حادث", cat:"civiel", weight:2 },
    { w:"حوادث", cat:"civiel", weight:2 },

    /* Locaties (voor context) */
    { w:"غزة", cat:"_location", weight:2 },
    { w:"إسرائيل", cat:"_location", weight:2 },
    { w:"لبنان", cat:"_location", weight:2 },
    { w:"سوريا", cat:"_location", weight:2 },
    { w:"العراق", cat:"_location", weight:2 },
    { w:"اليمن", cat:"_location", weight:2 },
    { w:"إيران", cat:"_location", weight:2 },
    { w:"روسيا", cat:"_location", weight:2 },
    { w:"أوكرانيا", cat:"_location", weight:2 },
    { w:"مصر", cat:"_location", weight:2 },
    { w:"السعودية", cat:"_location", weight:2 },
    { w:"تركيا", cat:"_location", weight:2 },
    { w:"فلسطين", cat:"_location", weight:2 },
    { w:"نتنياهو", cat:"politiek", weight:2 },
    { w:"بوتين", cat:"politiek", weight:2 },
    { w:"زيلينسكي", cat:"politiek", weight:2 },
    { w:"ترامب", cat:"politiek", weight:2 }
  ];

  /* ============================================================
     SUBSTRING-WOORDEN (alleen NL/EN)
     ============================================================ */
  var SUBSTRING_WORDS = {
    "maffia":       { cat:"crime", weight:3 },
    "mocromaffia":  { cat:"crime", weight:3 },
    "maffioso":     { cat:"crime", weight:3 },
    "kartel":       { cat:"crime", weight:3 },
    "drugskartel":  { cat:"crime", weight:3 },
    "crimineel":    { cat:"crime", weight:3 },
    "criminele":    { cat:"crime", weight:3 },
    "terrorist":    { cat:"crime", weight:3 },
    "witwas":       { cat:"crime", weight:3 },
    "oplicht":      { cat:"crime", weight:3 },
    "mensensmokkel":{ cat:"crime", weight:3 },
    "raketaanval":  { cat:"militair", weight:3 },
    "bombardement": { cat:"militair", weight:3 },
    "luchtaanval":  { cat:"militair", weight:3 },
    "gevecht":      { cat:"militair", weight:2 },
    "verkiezing":   { cat:"politiek", weight:3 },
    "sanctie":      { cat:"politiek", weight:3 }
  };

  /* ============================================================
     TERRORISME
     ============================================================ */
  var TERRORISM_WORDS = [
    "aanslag", "aanslagen", "terrorist", "terroristen", "terrorisme",
    "zelfmoordaanslag", "zelfmoordenaar", "zelfmoordterrorist",
    "bomaanslag", "autobom", "autobomaanslag", "truckbom",
    "suicide-attack", "suicide-bomber", "terrorism", "terrorist-attack",
    "terror-attack", "jihadist", "jihadisten"
  ];

  /* ============================================================
     REPORT-VERBS (sterk getrimd — geen says/said/told meer)
     ============================================================ */
  var REPORT_VERBS = {
    /* Alleen echte "dit is een rapport/analyse"-woorden */
    "report":3, "reports":3, "reported":3, "reportedly":3,
    "allegedly":3, "alleged":3,
    "claims":3, "claimed":3,
    "denies":3, "denied":3, "denial":3,
    "announces":3, "announced":3, "announcement":3,
    "declares":3, "declared":3, "declaration":3, "declarations":3,
    "reveals":3, "revealed":3,
    "confirms":3, "confirmed":3,
    "considers":3, "considering":3,
    "highlights":3, "highlighted":3,
    "plot":3, "plots":3, "plotting":3, "plotted":3,
    "plans-to":3, "planning-to":3,
    "according-to":3, "volgens":3,
    "exclusive":3, "analysis":3, "opinion":3, "commentary":3,
    "interview":3, "watch":3, "video":3,

    /* Diplomatieke werkwoorden */
    "negotiations":3, "negotiating":3, "negotiates":3,
    "talks":2, "summit":3,
    "diplomacy":3, "diplomatic":3,
    "mediates":3, "mediation":3, "mediators":2,
    "condemns":3, "condemned":3,
    "praises":3, "praised":3,

    /* NL */
    "verklaart":3, "verklaarde":3, "verklaring":3,
    "beweert":3, "beweerde":3,
    "ontkent":3, "ontkende":3,
    "bevestigt":3, "bevestigde":3,
    "waarschuwt":3, "waarschuwde":3,
    "dreigt":3, "dreigde":3,
    "beschuldigt":3, "beschuldigde":3,
    "aankondiging":3, "aankondigt":3, "aankondigde":3,
    "overweegt":3, "overwoog":3,
    "onderhandelingen":3, "overleg":2,
    "diplomatiek":3,
    "ontmoet":3, "ontmoette":3, "ontmoeting":3,
    "bezoekt":3, "bezocht":3,

    /* FR */
    "selon":3, "déclare":3, "annonce":3, "rapporte":3,
    "affirme":3, "avertit":3,

    /* DE */
    "berichtet":3, "laut":3, "meldet":3,
    "erklärt":3, "erklärung":3
  };

  /* ============================================================
     ACTION-VERBS — specifieke militaire werkwoorden
     ============================================================ */
  var ACTION_VERBS = {
    /* EN */
    "struck":3, "strikes-on":3, "strikes-in":3,
    "bombed":3, "shelled":3, "invaded":3,
    "shot-down":3, "downed":3, "intercepted":3,
    "besieged":3, "surrounded":2,
    "captured":2, "seized":2, "recaptured":2,
    "repelled":2, "withdrew":2, "withdrawn":2,
    "shot":2, "shoots":2, "shooting":2,
    "stabbed":2, "stabbing":2,
    "attacked":2, "attacks":2,
    "killed":2, "kills":2,
    "detained":2, "arrested":2,

    /* NL */
    "trof":3, "troffen":3, "getroffen":2,
    "bombardeerde":3, "bombardeerden":3,
    "beschoot":3, "beschoten":3,
    "viel-binnen":3, "vielen-binnen":3,
    "veroverde":3, "veroverden":3,
    "enterde":3, "enterd":3,
    "sloeg-toe":2, "sloegen-toe":2,
    "schoot":2, "schoten":2,
    "stak":2, "staken":2,
    "doodde":3, "doodden":3,
    "raakte":2, "raakten":2,
    "treft":2, "treffen":2,
    "bestookte":3, "bestookten":3,

    /* FR */
    "frappé":3, "attaqué":3, "envahi":3, "bombardé":3,
    "abattu":3,

    /* DE */
    "getötet":3, "angegriffen":3, "invadiert":3, "bombardiert":3,
    "abgeschossen":3, "eingedrungen":3
  };

  /* ============================================================
     MILITAIRE PATRONEN (actief + passief)
     ============================================================ */
  var MILITARY_PATTERNS = [
    /* Actief */
    /\b(launched|fired|conducted|carried out)\s+\d*\s*(missiles?|rockets?|drones?|airstrikes?|strikes?|attacks?|offensive|operations?|bombing)/i,
    /\b(shot|downed|intercepted|destroyed)\b.*\b(aircraft|drone|missile|jet|rocket|tank)/i,
    /\b(airstrike|missile|rocket|drone|bomb|shell)\s+(hit|struck|targeted|destroyed)/i,
    /\bhit\s+(by|with)\s+(airstrike|missile|rocket|drone|bomb|shell)/i,
    /\battack\s+(was\s+)?(carried\s+out|claimed|conducted)\s+by/i,

    /* Passief */
    /\b\d+\s+(missiles?|rockets?|drones?|airstrikes?|strikes?)\s+(were\s+)?(fired|launched|hit|struck|dropped)/i,
    /\b(missiles?|rockets?|bombs?|airstrikes?)\s+(were\s+)?(fired|launched|hit|struck|fell|landed|dropped)/i,
    /\b(was|were)\s+(hit|struck|targeted|bombed|shelled|attacked|invaded)\s+by/i,

    /* Slachtoffers */
    /\b(killed|wounded|injured|dead)\s+\d+/i,
    /\b\d+\s+(killed|dead|wounded|injured|casualties|doden|gewonden)/i,
    /\b(ten minste|minstens|tenminste)\s+\d+\s+(doden|gewonden|slachtoffers)/i,

    /* NL actief */
    /\b(raketten|raket|drones?|luchtaanvallen?)\s+(afgevuurd|gelanceerd|neergehaald)/i,
    /\b(aanval|aanvallen)\s+(uitgevoerd|geclaimd)\s+door/i
  ];

  /* ============================================================
     LOCATIES
     ============================================================ */
  var CONFLICT_ZONES = [
    /* Midden-Oosten */
    "gaza", "israel", "israël", "israeli", "palestijn", "palestina", "palestinian",
    "westelijke-jordaanoever", "west-bank", "ramallah", "jenin", "hebron",
    "libanon", "lebanon", "beiroet", "beirut", "lebanese",
    "syrië", "syria", "damascus", "aleppo", "idlib", "homs", "syrian",
    "jemen", "yemen", "yemeni", "sanaa", "aden", "houthi", "houthis",
    "irak", "iraq", "iraqi", "bagdad", "baghdad", "mosul", "erbil",
    "iran", "iranian", "teheran", "tehran", "isfahan",
    "saudi-arabië", "saudi", "riyad", "emiraten", "uae", "qatar", "doha",
    "bahrain", "kuwait", "jordanië", "jordan", "amman", "egypte", "egypt",
    "turkije", "turkey", "turkish", "ankara", "istanbul",

    /* Oekraïne/Rusland */
    "oekraïne", "ukraine", "ukrainian", "kyiv", "kiev", "kharkiv", "odesa", "odessa",
    "donbas", "donetsk", "luhansk", "marioepol", "mariupol", "bachmoet", "bakhmut",
    "zaporizhzhia", "zaporozhye", "zaporizhia", "cherson", "kherson",
    "avdiivka", "kramatorsk", "sloviansk",
    "rusland", "russia", "russian", "moskou", "moscow", "belgorod",
    "koersk", "kursk", "bryansk", "rostov", "voronezh", "saratov",
    "krim", "crimea", "sevastopol",

    /* Azië */
    "afghanistan", "afghan", "kabul", "kandahar",
    "pakistan", "pakistani", "islamabad", "peshawar", "waziristan", "quetta", "rawalpindi",
    "india", "indian", "kashmir", "kasjmir", "new-delhi",
    "bangladesh", "dhaka", "sri-lanka", "colombo",
    "myanmar", "burma", "nepal", "kathmandu",

    /* Afrika */
    "soedan", "sudan", "khartoum", "darfur", "sudanese",
    "libië", "libya", "libyan", "tripoli", "benghazi",
    "somalië", "somalia", "somali", "mogadishu",
    "ethiopië", "ethiopia", "tigray",
    "mali", "bamako", "timbuktu",
    "burkina-faso", "ouagadougou",
    "niger", "niamey",
    "congo", "goma", "kinshasa", "drc",
    "mozambique", "cabo-delgado",
    "nigeria", "nigerian", "abuja", "lagos",
    "chad", "tsjaad",
    "zuid-soedan", "south-sudan", "juba",
    "burundi", "rwanda", "uganda",
    "haïti", "haiti"
  ];

  var INSTABLE_ZONES = [
    "sahel", "venezuela", "colombia", "mexico", "mexican",
    "guatemala", "honduras", "el-salvador",
    "peru", "ecuador", "bolivia",
    "kazachstan", "uzbekistan", "turkmenistan", "tajikistan",
    "armenië", "azerbeidzjan", "georgië", "nagorno-karabach",
    "kosovo", "servië", "bosnië", "moldavië", "transnistrië"
  ];

  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash-report", "isw", "war-mapper",
    "reuters-tg", "al-jazeera-ar-tg", "al-arabiya-tg",
    "middle-east-eye-tg", "kyiv-independent",
    "middle-east-eye", "al-monitor", "times-of-israel", "times of israel",
    "haaretz", "jpost", "jerusalem-post", "ynet",
    "anadolu", "aa.com.tr", "saba-yemen", "al-arabiya",
    "al-jazeera", "aljazeera", "middleeasteye"
  ];

  /* ============================================================
     COMPILATIE
     ============================================================ */
  function compilePattern(word) {
    var w = String(word).toLowerCase();

    /* Arabisch: geen \b (bestaat niet in Arabisch schrift) */
    if (/[\u0600-\u06FF]/.test(w)) {
      var escA = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escA, 'i');
    }

    /* Escape regex-specials behalve dash */
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /* Dash vervangen door [spatie-of-dash]+ → "staakt-het-vuren" matcht ook "staakt het vuren" */
    esc = esc.replace(/-/g, '[\\s\\-]+');

    if (w.length < 4) return new RegExp('\\b' + esc + '\\b', 'i');
    return new RegExp('\\b' + esc + '\\w*', 'i');
  }

  function compileMap(map) {
    var out = [];
    for (var w in map) {
      if (!Object.prototype.hasOwnProperty.call(map, w)) continue;
      out.push({ word: w, weight: map[w], pattern: compilePattern(w) });
    }
    return out;
  }

  function compileList(list) {
    return list.map(function(w){ return { word: w, pattern: compilePattern(w) }; });
  }

  var P_MILITAIR    = compileMap(W_MILITAIR);
  var P_CRIME       = compileMap(W_CRIME);
  var P_POLITIEK    = compileMap(W_POLITIEK);
  var P_PROTEST     = compileMap(W_PROTEST);
  var P_CIVIEL      = compileMap(W_CIVIEL);
  var P_REPORT_VERBS = compileMap(REPORT_VERBS);
  var P_ACTION_VERBS = compileMap(ACTION_VERBS);

  var P_SUBSTRING = [];
  for (var sw in SUBSTRING_WORDS) {
    if (!Object.prototype.hasOwnProperty.call(SUBSTRING_WORDS, sw)) continue;
    P_SUBSTRING.push({
      word: sw,
      cat: SUBSTRING_WORDS[sw].cat,
      weight: SUBSTRING_WORDS[sw].weight,
      pattern: new RegExp(sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    });
  }

  var P_ARABIC = W_ARABIC.map(function(a){
    return {
      word: a.w,
      cat: a.cat,
      weight: a.weight,
      pattern: new RegExp(a.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    };
  });

  var P_TERROR      = compileList(TERRORISM_WORDS);
  var P_CONFLICT    = compileList(CONFLICT_ZONES);
  var P_INSTABLE    = compileList(INSTABLE_ZONES);
  var P_SPORT_SRC   = SPORT_SOURCES.map(function(s){ return s.toLowerCase(); });
  var P_SPORT_STRONG = compileList(SPORT_STRONG);
  var P_SPORT_WEAK   = compileList(SPORT_WEAK);
  var P_SPORT_CLUBS  = compileList(SPORT_CLUBS);

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

  function findAllMatches(text, patterns) {
    var out = [];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].pattern.test(text)) out.push(patterns[i].word);
    }
    return out;
  }

  /* ============================================================
     SPORT-DETECTIE — 2-TIER HARD BLOCK
     ============================================================ */
  function detectSport(titleLower, text, sourceLower) {
    /* 1. Bron-check */
    for (var i = 0; i < P_SPORT_SRC.length; i++) {
      if (sourceLower.indexOf(P_SPORT_SRC[i]) !== -1) {
        return { by: "source", word: P_SPORT_SRC[i] };
      }
    }

    /* 2. Sterke term in TITEL → direct sport */
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(titleLower)) {
        return { by: "strong-title", word: P_SPORT_STRONG[i].word };
      }
    }

    /* 3. Sterke term in volledige tekst → direct sport */
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(text)) {
        return { by: "strong-text", word: P_SPORT_STRONG[i].word };
      }
    }

    /* 4. Club + minstens 1 zwakke term → sport */
    var club = null;
    for (var i = 0; i < P_SPORT_CLUBS.length; i++) {
      if (P_SPORT_CLUBS[i].pattern.test(text)) { club = P_SPORT_CLUBS[i].word; break; }
    }
    if (club) {
      var weakCount0 = 0, weakWord0 = null;
      for (var i = 0; i < P_SPORT_WEAK.length; i++) {
        if (P_SPORT_WEAK[i].pattern.test(text)) {
          weakCount0++;
          if (!weakWord0) weakWord0 = P_SPORT_WEAK[i].word;
        }
      }
      if (weakCount0 >= 1) {
        return { by: "club+weak", word: club + " + " + weakWord0 };
      }
    }

    /* 5. 3+ zwakke termen → sport */
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
     REPORT-MODE — alleen titel
     ============================================================ */
  function detectReportMode(title) {
    var titleLower = String(title || "").toLowerCase();
    var reportScore = 0;
    var indicators = [];

    /* Prefixes */
    var prefixes = [
      /^report\s*:/i, /^report\s*[-–]/i,
      /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
      /^en\s*direct/i,
      /^analysis\s*:/i, /^opinion\s*:/i, /^commentary\s*:/i,
      /^update\s*:/i, /^updates?\s*:/i,
      /^\d+\s+days?\s+before/i,
      /^watch\s*:/i, /^video\s*:/i, /^interview\s*:/i, /^exclusive\s*:/i
    ];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i].test(titleLower)) {
        reportScore += 5;
        indicators.push({ type: "prefix" });
        break;
      }
    }

    var rv = countMatches(titleLower, P_REPORT_VERBS);
    reportScore += rv.score;
    rv.hits.forEach(function(h){ indicators.push({ type: "verb", word: h.word }); });

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
  function hasRealMilitaryAction(titleLower, text) {
    /* 1. Militair weight-3 woord in titel */
    for (var i = 0; i < P_MILITAIR.length; i++) {
      if (P_MILITAIR[i].weight >= 3 && P_MILITAIR[i].pattern.test(titleLower)) return true;
    }

    /* 2. Militaire regex-patronen in titel */
    for (var m = 0; m < MILITARY_PATTERNS.length; m++) {
      if (MILITARY_PATTERNS[m].test(titleLower)) return true;
    }

    /* 3. Actie-verb in titel (min 3 punten) */
    var titleAction = countMatches(titleLower, P_ACTION_VERBS);
    if (titleAction.score >= 3) return true;

    /* 4. Actor + actie-verb in titel */
    var titleHasActor = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|iraqi|yemeni|lebanese|idf|hamas|hezbollah|houthi|taliban|isis|isil|al.qaeda|al.shabaab|boko.haram|armed.group|militants?|insurgents?|fighters?|troops?|forces?|soldiers?|army|navy|military|rebels?|jihadists?|militie|milities|militanten)\b/i.test(titleLower);
    if (titleHasActor && titleAction.score >= 2) return true;

    /* 5. Conflict zone in TITEL + slachtoffers/actie in titel → militair */
    var conflictInTitle = false;
    for (var i = 0; i < P_CONFLICT.length; i++) {
      if (P_CONFLICT[i].pattern.test(titleLower)) { conflictInTitle = true; break; }
    }
    if (conflictInTitle) {
      var deathPattern = /\b(doden|dode|gewonden|slachtoffers|dead|killed|wounded|injured|casualties|death.toll)\b/i;
      if (deathPattern.test(titleLower)) return true;
      var milWord = countMatches(titleLower, P_MILITAIR);
      if (milWord.score >= 2) return true;
    }

    /* 6. Fallback: actie in volledige tekst met sterk gewicht + actor */
    var fullAction = countMatches(text, P_ACTION_VERBS);
    for (var m2 = 0; m2 < MILITARY_PATTERNS.length; m2++) {
      if (MILITARY_PATTERNS[m2].test(text)) fullAction.score += 5;
    }
    var fullActor = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|idf|hamas|hezbollah|houthi|taliban|isis|isil|al.qaeda|al.shabaab|boko.haram|armed.group|militants?|insurgents?|fighters?|troops?|forces?|soldiers?|army|military|rebels?|militie|milities|militanten)\b/i.test(text);
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
    if (/\bstaakt[\s\-]+het[\s\-]+vuren|ceasefire|wapenstilstand/.test(text)) return "Wapenstilstand";
    if (/\baanval|attack|assault|strike/.test(text)) return "Aanval";
    return "Conflict";
  }

  function detectCrimeSubtype(text, isTerror) {
    if (isTerror) return "Terrorisme";
    if (/maffia|mocromaffia/.test(text)) return "Maffia";
    if (/\bontsnapping|ontsnapt|ontsnapte|escape|escaped|uitbraak/.test(text)) return "Ontsnapping";
    if (/\bschietpartij|schietincident|schoten|neergeschoten|shooting/.test(text)) return "Schietpartij";
    if (/\bsteekpartij|steekincident|neergestoken|stabbing/.test(text)) return "Steekpartij";
    if (/\bmoord|vermoord|doodslag|doodde|doodden|murder|homicide/.test(text)) return "Moord";
    if (/\bliquidatie|afrekening/.test(text)) return "Liquidatie";
    if (/\boverval|beroving/.test(text)) return "Overval";
    if (/\bontvoering|gijzeling|kidnapping|hostage/.test(text)) return "Ontvoering";
    if (/\bdrugs|drugshandel|kartel|drugsbaron|drugsdealer/.test(text)) return "Drugs";
    if (/\bfraude|oplichting|omkoping|belastingfraude/.test(text)) return "Fraude";
    if (/\bphishing|hacking|cyber|ransomware|malware|datalek/.test(text)) return "Cyber";
    if (/\bcorruptie/.test(text)) return "Corruptie";
    if (/\bwitwassen|witwas/.test(text)) return "Witwassen";
    if (/\bwapenhandel|wapensmokkel/.test(text)) return "Wapenhandel";
    if (/\bmensensmokkel|mensenhandel/.test(text)) return "Mensenhandel";
    if (/\bexplosie|ontploffing|explosion|blast/.test(text)) return "Explosie";
    return "Misdaad";
  }

  function detectPolitiekSubtype(text) {
    if (/\bplot|plotting|plots|plotted/.test(text)) return "Samenzwering";
    if (/\bthreat|threatens|threatening|threatened|dreigt|waarschuwt/.test(text)) return "Dreiging";
    if (/\bsanctions?\s+(against|on)|sanctie|sancties/.test(text)) return "Sanctie";
    if (/\bnegotiations|negotiating|talks|summit|mediators|overleg|onderhandelingen|dialoog|dialogue/.test(text)) return "Diplomatie";
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
    if (/\bstroomuitval|blackout|stroomstoring/.test(text)) return "Stroomstoring";
    return "Overig";
  }

  /* ============================================================
     HOOFDFUNCTIE v4.0
     ============================================================ */
  function classify(title, desc, source, url) {
    var titleStr = String(title || "");
    var titleLower = titleStr.toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();

    /* ===== SPORT CHECK EERST (HARD BLOCK) ===== */
    var sport = detectSport(titleLower, text, sourceLower);
    if (sport) {
      return {
        category: "sport",
        subtype: "Sport",
        confidence: 98,
        uncertain: false,
        isSport: true,
        scores: {},
        signals: {},
        meta: {
          sportBlocked: true,
          sportBy: sport.by,
          sportWord: sport.word
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

    /* Arabische woorden */
    var arabicConflictZone = false;
    for (var a = 0; a < P_ARABIC.length; a++) {
      var pa = P_ARABIC[a];
      if (!pa.pattern.test(text)) continue;
      if (pa.cat === "_location") { arabicConflictZone = true; continue; }
      if (scores[pa.cat] === undefined) continue;
      scores[pa.cat] += pa.weight;
      hits[pa.cat].push({ word: pa.word, weight: pa.weight, lang: "ar" });
    }

    /* Substring-matching (voorkom dubbele score) */
    var alreadyMatched = [];
    for (var cat in hits) {
      if (!Object.prototype.hasOwnProperty.call(hits, cat)) continue;
      for (var h = 0; h < hits[cat].length; h++) alreadyMatched.push(hits[cat][h].word);
    }
    for (var i = 0; i < P_SUBSTRING.length; i++) {
      var p = P_SUBSTRING[i];
      /* Skip als woord al als hoofd-match is geteld */
      var isDuplicate = false;
      for (var am = 0; am < alreadyMatched.length; am++) {
        if (alreadyMatched[am].indexOf(p.word) === 0 || p.word.indexOf(alreadyMatched[am]) === 0) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) continue;
      if (p.pattern.test(text)) {
        scores[p.cat] += p.weight;
        hits[p.cat].push({ word: p.word, weight: p.weight, substring: true });
      }
    }

    /* ===== MODUS ===== */
    var mode = detectReportMode(titleLower);

    /* ===== ECHTE MILITAIRE ACTIE? ===== */
    var hasMil = hasRealMilitaryAction(titleLower, text);

    /* ===== REPORT-MODE — SOFT PENALTY ===== */
    if (mode.isReport && !hasMil) {
      scores.politiek += mode.reportScore;
      /* Soft penalty i.p.v. hard reset */
      scores.militair = Math.max(0, scores.militair - 3);
    } else if (mode.isReport && hasMil) {
      scores.politiek += Math.floor(mode.reportScore / 2);
    }

    /* ===== MILITAIR: locatie-boost ===== */
    if (!hasMil) {
      scores.militair = 0;
    } else {
      var conflictLocation = findMatch(text, P_CONFLICT);
      var instableLocation = findMatch(text, P_INSTABLE);
      if (conflictLocation) scores.militair += 3;
      else if (instableLocation) scores.militair += 1;
      if (arabicConflictZone) scores.militair += 2;

      for (var osi = 0; osi < OSINT_SOURCES.length; osi++) {
        if (sourceLower.indexOf(OSINT_SOURCES[osi]) !== -1) {
          scores.militair += 3;
          break;
        }
      }
    }

    /* ===== TERRORISME ===== */
    var terrorWord = findMatch(text, P_TERROR);
    if (terrorWord) {
      var conflictLoc = findMatch(text, P_CONFLICT);
      var armedActor = /\b(taliban|houthi|houthis|hamas|hezbollah|isis|isil|al.qaeda|alqaeda|al.shabaab|boko.haram|militie|milities|militanten|militant|insurgents?|armed.group|gewapende.groep|rebels?|opstandelingen|jihadisten?|terroristen?)\b/i.test(text);
      if (conflictLoc || armedActor) scores.militair += 6;
      else scores.crime += 6;
    }

    /* ===== CIVIEL-BLOKKADE (voorkom valse civiel bij sterke militair) ===== */
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
    /* Absolute drempel: bij lage score nooit meer dan 60% */
    if (maxScore < 4) confidence = Math.min(confidence, 60);
    if (maxScore < 2) confidence = Math.min(confidence, 40);
    var uncertain = (confidence > 0 && confidence < 65);

    /* ===== SUBTYPE ===== */
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
      isSport: false,
      scores: scores,
      signals: hits,
      meta: {
        mode: mode,
        hasMilitaryAction: hasMil,
        isReport: mode.isReport,
        isAction: mode.isAction,
        terrorWord: terrorWord,
        arabicConflictZone: arabicConflictZone
      }
    };
  }

  /* ============================================================
     HELPER: isSport (voor UI-filtering)
     ============================================================ */
  function isSport(title, desc, source) {
    var titleLower = String(title || "").toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    var sourceLower = String(source || "").toLowerCase();
    return detectSport(titleLower, text, sourceLower) !== null;
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.WDClassifier = {
    version: VERSION,
    classify: classify,
    isSport: isSport,
    categories: CATS,
    _words: {
      militair: W_MILITAIR, crime: W_CRIME, politiek: W_POLITIEK,
      protest: W_PROTEST, civiel: W_CIVIEL, arabic: W_ARABIC,
      report_verbs: REPORT_VERBS, action_verbs: ACTION_VERBS,
      sport_sources: SPORT_SOURCES, sport_strong: SPORT_STRONG,
      sport_weak: SPORT_WEAK, sport_clubs: SPORT_CLUBS
    },
    _substrings: SUBSTRING_WORDS,
    _locations: { conflict: CONFLICT_ZONES, instable: INSTABLE_ZONES },
    _terrorism: TERRORISM_WORDS,
    _patterns: { military: MILITARY_PATTERNS }
  };

  try {
    if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen");
  } catch(e){}

})();