/* ============================================================
   WAR DESK — classifier.js v5.0c
   ------------------------------------------------------------
   - v5.0c: FIX hasRealMilitaryAction checkt nu ook werkwoorden
            (strikes, attacks, killed, bombed, shelled, etc.)
            in zowel titel ALS tekst.
   - v5.0b: statement-mode reset niet als hasMil true
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v5.0c";
  var CATS = ["militair", "crime", "politiek", "protest", "civiel"];
  var PRIORITY = { militair: 5, crime: 4, politiek: 3, protest: 2, civiel: 1 };

  function detectLanguage(text) {
    if (!text) return "unknown";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    var lower = text.toLowerCase();
    var nl = (lower.match(/\b(de|het|een|van|voor|met|niet|wordt|zijn|heeft|door|over|naar|aan|bij|uit|ook|maar|nog|kan|moet|gaat|komt|maakt|zegt|tussen|tegen|onder)\b/g) || []).length;
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
    "wimbledon", "roland garros", "us open tennis",
    "australian open", "grand slam tennis",
    "super bowl", "world series", "stanley cup", "nba finals",
    "nba playoffs", "motogp", "formule 1", "formule1",
    "grand prix", "indycar", "nascar",
    "voetbalclub", "voetbalploeg", "voetbalwedstrijd", "voetbaltoernooi",
    "wielerploeg", "wielerwedstrijd", "wielrennen",
    "tennistoernooi", "tenniswedstrijd",
    "bokswedstrijd", "kickboksen",
    "mma wedstrijd", "ufc fight",
    "handbaltoernooi", "volleybaltoernooi", "basketbaltoernooi",
    "bnxt supercup", "bnxt league", "fide", "schaaktoernooi",
    "atletiekwedstrijd", "atletiektoernooi",
    "schaatstoernooi", "schaatswedstrijd"
  ];

  var SPORT_WEAK = [
    "voetbal", "voetballer", "voetballers",
    "tennis", "tennisser", "basketbal", "basketballer",
    "volleybal", "volleyballer", "handbal", "hockey", "rugby", "honkbal",
    "atletiek", "atleet", "atleten", "zwemmen", "zwemmer",
    "schaatsen", "schaatser", "wielrenner", "marathon",
    "judo", "karate", "boksen", "bokser", "golf", "golfer",
    "skaten", "surfen", "zeilen", "roeien",
    "darts", "snooker", "biljart", "schaken", "schaker",
    "esports", "e-sports", "keeper", "doelman", "doelvrouw",
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
    "supporters", "stadion", "seizoen",
    "oefeninterland", "oefenwedstrijd",
    "landenwedstrijd", "supercup",
    "game", "match", "derby", "finale", "interland",
    "armbanden", "armbands", "shirt", "tenue"
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

  var SPORT_COUNTRIES = [
    "ireland", "israel", "england", "france", "germany", "spain", "italy",
    "netherlands", "belgium", "portugal", "denmark", "sweden", "norway",
    "poland", "croatia", "serbia", "switzerland", "austria", "scotland",
    "wales", "turkey", "greece", "hungary", "romania", "ukraine",
    "russia", "morocco", "egypt", "tunisia", "algeria", "japan",
    "korea", "china", "brazil", "argentina", "uruguay", "mexico",
    "usa", "canada", "australia", "new zealand", "nigeria", "senegal"
  ];

  var STATEMENT_PREFIXES = [
    /^report\s*:/i, /^live\s*:/i, /^live\s*[-–]/i, /^live\s+updates?/i,
    /^en\s*direct/i, /^analysis\s*:/i, /^opinion\s*:/i, /^commentary\s*:/i,
    /^update\s*:/i, /^updates?\s*:/i, /^watch\s*:/i, /^video\s*:/i,
    /^interview\s*:/i, /^exclusive\s*:/i, /^breaking\s*:/i,
    /^\d+\s+days?\s+before/i, /^\d+\s+days?\s+after/i,
    /^[A-Z][a-z]+\s+leader\s*:/i, /^[A-Z][a-z]+\s+official\s*:/i, /^[A-Z][a-z]+\s+says\s*:/i
  ];

  /* ============================================================
     v5.0c: NIEUW — militaire actie-werkwoorden (titel + tekst)
     ============================================================ */
  var MILITARY_ACTION_VERBS = [
    /* Engels */
    /\b(strikes?|struck|striking)\b/i,
    /\b(attacks?|attacked|attacking)\b/i,
    /\b(bombs?|bombed|bombing|bombardment|bombardments)\b/i,
    /\b(shells?|shelled|shelling)\b/i,
    /\b(kills?|killed|killing|deaths?|dead)\b/i,
    /\b(seizes?|seized|seizing|captures?|captured|capturing|overruns?|overran)\b/i,
    /\b(invades?|invaded|invading|invasion|invasions)\b/i,
    /\b(launches?|launched|launching)\b/i,
    /\b(fires?|fired|firing)\b/i,
    /\b(hits?|hit|hitting)\b/i,
    /\b(downs?|downed|shoots?\s+down|shot\s+down)\b/i,
    /\b(intercepts?|intercepted|intercepting)\b/i,
    /\b(explodes?|exploded|exploding|explosion|explosions|blasts?)\b/i,
    /\b(offensive|offensives|counteroffensive|counter-offensive)\b/i,
    /\b(raids?|raided|raiding)\b/i,
    /\b(combat|clashes|clashing|fighting|firefight|battle|battles)\b/i,
    /\b(wounded|injured|casualties)\b/i,
    /\b(airstrikes?|air\s+strikes?|missile\s+strikes?|drone\s+strikes?|rocket\s+attacks?)\b/i,
    /* Nederlands */
    /\b(raakte|raakten|getroffen|treft|treffen|raken)\b/i,
    /\b(aanviel|aanvielen|aanvalt|aanvallen|aanval)\b/i,
    /\b(bombardeerde|bombardeerden|gebombardeerd|bombardement|bombardementen)\b/i,
    /\b(beschoot|beschoten|beschieting|beschietingen)\b/i,
    /\b(doodde|doodden|gedood|doden|dodelijk)\b/i,
    /\b(veroverde|veroverden|ingenomen|innam|innamen|heroverd|heroverde)\b/i,
    /\b(viel\s+binnen|vielen\s+binnen|binnengevallen|invasie|invasies)\b/i,
    /\b(neerschoot|neergeschoten|neergehaald|onderschept)\b/i,
    /\b(ontplofte|ontploften|ontploffing|explosie|explosies)\b/i,
    /\b(offensief|offensieven|tegenoffensief)\b/i,
    /\b(gewond|gewonden|slachtoffers|slachtoffer)\b/i,
    /\b(raketaanval|raketinslag|luchtaanval|droneaanval|mortieraanval|artillerievuur|granaatinslag)\b/i,
    /* Frans */
    /\b(frappé|frappe|frappes)\b/i,
    /\b(attaqué|attaque|attaques)\b/i,
    /\b(bombardé|bombardement|bombardements)\b/i,
    /\b(tué|tués|mort|morts)\b/i,
    /\b(invasion|envahi|envahie)\b/i,
    /* Duits */
    /\b(angegriffen|greift\s+an|getroffen|bombardiert)\b/i,
    /\b(getötet|tote|tötet|tot)\b/i,
    /\b(invasion|invadiert)\b/i,
    /* Arabisch */
    /قصف|غارة|غارات|ضربة|ضربات/,
    /هجوم|هجمات|اعتداء/,
    /قتل|قتلى|مقتل|مصرع/,
    /جرح|جرحى|إصابات/,
    /انفجار|انفجارات|تفجير/,
    /صاروخ|صواريخ|قذيفة|قذائف/,
    /معارك|قتال|اشتباكات/,
    /سيطر|استولى|حرر/
  ];

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
    "witwassen":3, "witwasserij":3,
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
    "staatsgreep":3, "coup":3,
    "wetsvoorstel":3, "wetsontwerp":3, "amendement":3,
    "motie van wantrouwen":3,
    "regeringscrisis":3, "kabinetscrisis":3, "kabinet valt":3,
    "regeerakkoord":3, "coalitieakkoord":3,
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
    "diplomaat":2, "diplomaten":2, "ambassadeur":2,
    "diplomatie":3, "diplomacy":3, "diplomatisch":3,
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

  var W_ARABIC = [
    { w:"حرب", cat:"militair", weight:3 }, { w:"غارة", cat:"militair", weight:3 },
    { w:"غارات", cat:"militair", weight:3 }, { w:"قصف", cat:"militair", weight:3 },
    { w:"قوات", cat:"militair", weight:2 }, { w:"جيش", cat:"militair", weight:2 },
    { w:"صاروخ", cat:"militair", weight:3 }, { w:"صواريخ", cat:"militair", weight:3 },
    { w:"مسيّرة", cat:"militair", weight:3 }, { w:"طائرة", cat:"militair", weight:2 },
    { w:"قتال", cat:"militair", weight:3 }, { w:"معارك", cat:"militair", weight:3 },
    { w:"هجوم", cat:"militair", weight:3 }, { w:"اعتداء", cat:"militair", weight:3 },
    { w:"احتلال", cat:"militair", weight:2 }, { w:"فصائل", cat:"militair", weight:2 },
    { w:"مقاومة", cat:"militair", weight:2 }, { w:"مسلح", cat:"militair", weight:2 },
    { w:"مسلحون", cat:"militair", weight:2 }, { w:"حماس", cat:"militair", weight:2 },
    { w:"حزب الله", cat:"militair", weight:2 }, { w:"الحوثي", cat:"militair", weight:2 },
    { w:"طالبان", cat:"militair", weight:2 }, { w:"داعش", cat:"militair", weight:2 },
    { w:"انفجار", cat:"crime", weight:2 }, { w:"مقتل", cat:"crime", weight:2 },
    { w:"قتلى", cat:"crime", weight:2 }, { w:"قتل", cat:"crime", weight:2 },
    { w:"جريمة", cat:"crime", weight:3 }, { w:"مخدرات", cat:"crime", weight:3 },
    { w:"إرهاب", cat:"crime", weight:3 }, { w:"إرهابي", cat:"crime", weight:3 },
    { w:"خطف", cat:"crime", weight:3 }, { w:"اختطاف", cat:"crime", weight:3 },
    { w:"اعتقال", cat:"crime", weight:2 }, { w:"احتيال", cat:"crime", weight:3 },
    { w:"انتخابات", cat:"politiek", weight:3 }, { w:"حكومة", cat:"politiek", weight:2 },
    { w:"رئيس", cat:"politiek", weight:2 }, { w:"وزير", cat:"politiek", weight:2 },
    { w:"الخارجية", cat:"politiek", weight:2 }, { w:"برلمان", cat:"politiek", weight:2 },
    { w:"دبلوماسي", cat:"politiek", weight:3 }, { w:"دبلوماسية", cat:"politiek", weight:3 },
    { w:"مفاوضات", cat:"politiek", weight:3 }, { w:"اتفاق", cat:"politiek", weight:2 },
    { w:"اتفاقية", cat:"politiek", weight:2 }, { w:"وقف إطلاق النار", cat:"politiek", weight:3 },
    { w:"عقوبات", cat:"politiek", weight:3 }, { w:"قمة", cat:"politiek", weight:2 },
    { w:"نتنياهو", cat:"politiek", weight:2 },
    { w:"احتجاج", cat:"protest", weight:3 }, { w:"احتجاجات", cat:"protest", weight:3 },
    { w:"مظاهرة", cat:"protest", weight:3 }, { w:"مظاهرات", cat:"protest", weight:3 },
    { w:"إضراب", cat:"protest", weight:3 }, { w:"متظاهرون", cat:"protest", weight:3 },
    { w:"معارضة", cat:"protest", weight:2 },
    { w:"زلزال", cat:"civiel", weight:3 }, { w:"فيضان", cat:"civiel", weight:3 },
    { w:"فيضانات", cat:"civiel", weight:3 }, { w:"حريق", cat:"civiel", weight:3 },
    { w:"حرائق", cat:"civiel", weight:3 }, { w:"حادث", cat:"civiel", weight:2 }
  ];

  var TERRORISM_WORDS = [
    "aanslag", "aanslagen", "terrorist", "terroristen", "terrorisme",
    "zelfmoordaanslag", "zelfmoordenaar", "bomaanslag",
    "suicide attack", "suicide bomber", "terrorism", "terrorist attack"
  ];

  var CONFLICT_ZONES = [
    "gaza", "israel", "israël", "israeli", "palestijn", "palestina", "palestinian",
    "westelijke jordaanoever", "west bank", "libanon", "lebanon", "beiroet", "beirut",
    "syrië", "syria", "damascus", "aleppo", "idlib", "jemen", "yemen", "sanaa", "houthi",
    "irak", "iraq", "bagdad", "baghdad", "mosul", "iran", "iranian", "teheran", "tehran",
    "saudi-arabië", "saudi", "riyad", "emiraten", "uae", "qatar", "doha",
    "bahrain", "kuwait", "jordanië", "jordan", "amman", "egypte", "egypt", "cairo",
    "turkije", "turkey", "turkish", "ankara", "oekraïne", "ukraine", "ukrainian",
    "kyiv", "kiev", "kharkiv", "odesa", "donbas", "donetsk", "luhansk", "mariupol",
    "bachmoet", "bakhmut", "zaporizhzhia", "cherson", "kherson",
    "rusland", "russia", "russian", "moskou", "moscow",
    "belgorod", "koersk", "kursk", "bryansk", "rostov",
    "krim", "crimea", "afghanistan", "afghan", "kabul",
    "pakistan", "pakistani", "islamabad", "peshawar",
    "india", "indian", "kashmir", "kasjmir",
    "soedan", "sudan", "khartoum", "darfur",
    "libië", "libya", "libyan", "tripoli", "benghazi",
    "somalië", "somalia", "mogadishu",
    "ethiopië", "ethiopia", "tigray", "mali", "bamako", "burkina faso",
    "niger", "niamey", "congo", "goma", "mozambique", "nigeria", "nigerian", "chad",
    "zuid-soedan", "south sudan", "juba", "haïti", "haiti"
  ];

  var INSTABLE_ZONES = [
    "sahel", "venezuela", "colombia", "mexico", "mexican",
    "guatemala", "honduras", "peru", "ecuador", "bolivia",
    "armenië", "azerbeidzjan", "georgië", "kosovo", "servië", "moldavië"
  ];

  var OSINT_SOURCES = [
    "osintdefender", "faytuks", "noelreports", "liveuamap",
    "geoconfirmed", "clash-report", "isw", "war-mapper",
    "middle-east-eye", "al-monitor", "times of israel", "haaretz",
    "jpost", "ynet", "saba yemen"
  ];

  function compileLatin(word) {
    var w = String(word).toLowerCase();
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    esc = esc.replace(/-/g, '[\\s\\-]+');
    if (w.length < 4) return new RegExp('\\b' + esc + '\\b', 'i');
    return new RegExp('\\b' + esc + '\\w*', 'i');
  }
  function compileArabic(word) {
    var w = String(word);
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[\\s\\u0600-\\u06FF])' + esc + '(?=$|[\\s,.،؛:!?؟])', 'i');
  }
  function compileMap(map) {
    var out = [];
    for (var w in map) {
      if (!Object.prototype.hasOwnProperty.call(map, w)) continue;
      out.push({ word: w, weight: map[w], pattern: compileLatin(w) });
    }
    return out;
  }
  function compileList(list) {
    return list.map(function(w){
      return { word: w, pattern: compileLatin(w) };
    });
  }

  var P_MILITAIR  = compileMap(W_MILITAIR);
  var P_CRIME     = compileMap(W_CRIME);
  var P_POLITIEK  = compileMap(W_POLITIEK);
  var P_PROTEST   = compileMap(W_PROTEST);
  var P_CIVIEL    = compileMap(W_CIVIEL);

  var P_ARABIC = W_ARABIC.map(function(a){
    return { word: a.w, cat: a.cat, weight: a.weight, pattern: compileArabic(a.w) };
  });

  var P_TERROR    = compileList(TERRORISM_WORDS);
  var P_CONFLICT  = compileList(CONFLICT_ZONES);
  var P_INSTABLE  = compileList(INSTABLE_ZONES);
  var P_SPORT_SRC = SPORT_SOURCES.map(function(s){ return s.toLowerCase(); });
  var P_SPORT_STRONG = compileList(SPORT_STRONG);
  var P_SPORT_WEAK = compileList(SPORT_WEAK);
  var P_SPORT_CLUBS = compileList(SPORT_CLUBS);
  var P_SPORT_COUNTRIES = compileList(SPORT_COUNTRIES);

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

  function detectSport(titleLower, text, sourceLower) {
    for (var i = 0; i < P_SPORT_SRC.length; i++) {
      if (sourceLower.indexOf(P_SPORT_SRC[i]) !== -1) return { by: "source", word: P_SPORT_SRC[i] };
    }
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(titleLower)) return { by: "strong-title", word: P_SPORT_STRONG[i].word };
    }
    for (var i = 0; i < P_SPORT_STRONG.length; i++) {
      if (P_SPORT_STRONG[i].pattern.test(text)) return { by: "strong-text", word: P_SPORT_STRONG[i].word };
    }
    var club = null;
    for (var i = 0; i < P_SPORT_CLUBS.length; i++) {
      if (P_SPORT_CLUBS[i].pattern.test(text)) { club = P_SPORT_CLUBS[i].word; break; }
    }
    if (club) {
      for (var i = 0; i < P_SPORT_WEAK.length; i++) {
        if (P_SPORT_WEAK[i].pattern.test(text)) return { by: "club+weak", word: club + " + " + P_SPORT_WEAK[i].word };
      }
    }
    var countryHits = 0, countryWord = null;
    for (var i = 0; i < P_SPORT_COUNTRIES.length; i++) {
      if (P_SPORT_COUNTRIES[i].pattern.test(titleLower)) {
        countryHits++;
        if (!countryWord) countryWord = P_SPORT_COUNTRIES[i].word;
      }
    }
    var hasSportEvent = /\b(game|match|derby|wedstrijd|finale|toernooi|interland|duel)\b/i.test(titleLower);
    if (countryHits >= 2 && hasSportEvent) return { by: "2countries+event", word: countryWord + " + " + countryHits + " landen" };
    var weakCount = 0, weakWords = [];
    for (var i = 0; i < P_SPORT_WEAK.length; i++) {
      if (P_SPORT_WEAK[i].pattern.test(text)) {
        weakCount++;
        if (weakWords.length < 3) weakWords.push(P_SPORT_WEAK[i].word);
      }
    }
    if (weakCount >= 3) return { by: "weak-3plus", word: weakWords.join(", ") };
    return null;
  }

  function detectStatementMode(titleLower) {
    for (var i = 0; i < STATEMENT_PREFIXES.length; i++) {
      if (STATEMENT_PREFIXES[i].test(titleLower)) {
        return { isStatement: true, reason: "prefix", prefix: STATEMENT_PREFIXES[i].source };
      }
    }
    return { isStatement: false };
  }

  /* ============================================================
     v5.0c: Uitgebreide militaire actie-detectie
     ============================================================ */
  function hasMilitaryActionVerb(text) {
    for (var i = 0; i < MILITARY_ACTION_VERBS.length; i++) {
      if (MILITARY_ACTION_VERBS[i].test(text)) return true;
    }
    return false;
  }

  function hasRealMilitaryAction(titleLower, text) {
    /* 1. Weight-3 militaire woorden in titel */
    for (var i = 0; i < P_MILITAIR.length; i++) {
      if (P_MILITAIR[i].weight >= 3 && P_MILITAIR[i].pattern.test(titleLower)) return true;
    }

    /* 2. NIEUW: militaire actie-werkwoorden in titel */
    if (hasMilitaryActionVerb(titleLower)) return true;

    /* 3. Conflict zone + slachtoffers/actie in TITEL of TEKST */
    var conflictInTitle = false;
    for (var i = 0; i < P_CONFLICT.length; i++) {
      if (P_CONFLICT[i].pattern.test(titleLower)) { conflictInTitle = true; break; }
    }
    if (conflictInTitle) {
      var deathPattern = /\b(doden|dode|gewonden|slachtoffers|dead|killed|wounded|injured|casualties|death.toll)\b/i;
      if (deathPattern.test(titleLower)) return true;
      if (hasMilitaryActionVerb(text)) return true;
      var milWord = countMatches(titleLower, P_MILITAIR);
      if (milWord.score >= 2) return true;
    }

    /* 4. Actor + actie in titel of tekst */
    var actorPattern = /\b(israeli|russian|ukrainian|iranian|palestinian|syrian|iraqi|yemeni|lebanese|idf|hamas|hezbollah|houthi|taliban|isis|isil|al.qaeda|al.shabaab|boko.haram|armed.group|militants?|insurgents?|fighters?|troops?|forces?|soldiers?|army|navy|military|rebels?|jihadists?|militie|milities|militanten)\b/i;
    if (actorPattern.test(titleLower) && hasMilitaryActionVerb(text)) return true;

    /* 5. NIEUW: military in title + action in text */
    for (var i = 0; i < P_MILITAIR.length; i++) {
      if (P_MILITAIR[i].weight >= 2 && P_MILITAIR[i].pattern.test(titleLower)) {
        if (hasMilitaryActionVerb(text)) return true;
      }
    }

    return false;
  }

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

  function classify(title, desc, source, url) {
    var titleStr = String(title || "");
    var titleLower = titleStr.toLowerCase();
    var descLower = String(desc || "").toLowerCase();
    var text = titleLower + " " + descLower;
    var sourceLower = String(source || "").toLowerCase();
    var lang = detectLanguage(titleStr + " " + String(desc || ""));

    var sport = detectSport(titleLower, text, sourceLower);
    if (sport) {
      return {
        category: "sport", subtype: "Sport", confidence: 98, uncertain: false,
        lang: lang, isSport: true, isFiltered: true,
        scores: {}, signals: {},
        meta: { sportBlocked: true, sportBy: sport.by, sportWord: sport.word }
      };
    }

    var mode = detectStatementMode(titleLower);

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

    if (lang === "ar") {
      for (var i = 0; i < P_ARABIC.length; i++) {
        var pa = P_ARABIC[i];
        if (!pa.pattern.test(text)) continue;
        if (scores[pa.cat] === undefined) continue;
        scores[pa.cat] += pa.weight;
        hits[pa.cat].push({ word: pa.word, weight: pa.weight, lang: "ar" });
      }
    }

    var hasMil = hasRealMilitaryAction(titleLower, text);
    if (!hasMil) scores.militair = 0;
    else {
      var conflictLoc = findMatch(text, P_CONFLICT);
      var instableLoc = findMatch(text, P_INSTABLE);
      if (conflictLoc) scores.militair += 3;
      else if (instableLoc) scores.militair += 1;
      for (var i = 0; i < OSINT_SOURCES.length; i++) {
        if (sourceLower.indexOf(OSINT_SOURCES[i]) !== -1) { scores.militair += 3; break; }
      }
    }

    var terrorWord = findMatch(text, P_TERROR);
    if (terrorWord) {
      var conflictLoc2 = findMatch(text, P_CONFLICT);
      var armedActor = /\b(taliban|houthi|houthis|hamas|hezbollah|isis|isil|al.qaeda|alqaeda|al.shabaab|boko.haram|militie|milities|militanten|militant|insurgents?|armed.group|gewapende.groep|rebels?|opstandelingen|jihadisten?|terroristen?)\b/i.test(text);
      if (conflictLoc2 || armedActor) scores.militair += 6;
      else scores.crime += 6;
    }

    /* v5.0c: statement-mode reset militair NIET als hasMil true */
    if (mode.isStatement) {
      if (mode.reason === "prefix") {
        if (!hasMil) {
          scores.militair = 0;
          scores.politiek += 7;
        } else {
          scores.politiek += 3;
        }
      } else {
        scores.politiek += 7;
      }
    }

    var rank = CATS.map(function(c){ return { cat: c, score: scores[c] }; });
    rank.sort(function(a, b){
      if (b.score !== a.score) return b.score - a.score;
      return PRIORITY[b.cat] - PRIORITY[a.cat];
    });
    var winner = rank[0];
    var runnerUp = rank[1];

    if (winner.score === 0) {
      winner = { cat: "civiel", score: 0 };
      runnerUp = { cat: "civiel", score: 0 };
    }

    var confidence = 0;
    if (winner.score === 0) confidence = 0;
    else if (runnerUp.score === 0) confidence = 100;
    else {
      var ratio = winner.score / runnerUp.score;
      if (ratio >= 3) confidence = 95;
      else if (ratio >= 2) confidence = 85;
      else if (ratio >= 1.5) confidence = 70;
      else confidence = 55;
    }
    if (winner.score < 4) confidence = Math.min(confidence, 60);
    if (winner.score < 2) confidence = Math.min(confidence, 40);
    var uncertain = (confidence > 0 && confidence < 65);

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
      meta: { mode: mode, hasMilitaryAction: hasMil, terrorWord: terrorWord }
    };
  }

  function isSport(title, desc, source) {
    var titleLower = String(title || "").toLowerCase();
    var text = (titleLower + " " + String(desc || "")).toLowerCase();
    return detectSport(titleLower, text, String(source || "").toLowerCase()) !== null;
  }

  window.WDClassifier = {
    version: VERSION,
    classify: classify,
    isSport: isSport,
    detectLanguage: detectLanguage,
    categories: CATS,
    _words: {
      militair: W_MILITAIR, crime: W_CRIME, politiek: W_POLITIEK,
      protest: W_PROTEST, civiel: W_CIVIEL, arabic: W_ARABIC
    },
    _locations: { conflict: CONFLICT_ZONES, instable: INSTABLE_ZONES },
    _militaryVerbs: MILITARY_ACTION_VERBS
  };

  try { if (window.wdLog) wdLog.info("[WAR DESK] classifier.js " + VERSION + " geladen (uitgebreide military-actie detectie)"); } catch(e){}

})();