/* ============================================================
   WAR DESK — worldmap-data.js v2.1
   ------------------------------------------------------------
   - v2.1: COUNTRY_TO_ISO3 mapping (fix voor land-kleuren)
   - v2.0: ACTOR_MAP + CONFLICT_COLORS (conflict-kaart)
   - v1.0: allianties + feed tiers
   ============================================================ */

(function(){
  "use strict";

  window.WORLDMAP_VERSION = "v2.1";

  /* ============================================================
     ALLIANTIES — alleen voor actor-positie bepaling (niet rendering)
     ============================================================ */
  window.ALLIANCES = {
    "USA":"west", "GBR":"west", "FRA":"west", "DEU":"west", "ITA":"west",
    "ESP":"west", "PRT":"west", "NLD":"west", "BEL":"west", "LUX":"west",
    "DNK":"west", "NOR":"west", "ISL":"west", "POL":"west", "CZE":"west",
    "SVK":"west", "HUN":"west", "ROU":"west", "BGR":"west", "GRC":"west",
    "TUR":"west", "EST":"west", "LVA":"west", "LTU":"west", "SVN":"west",
    "HRV":"west", "ALB":"west", "MNE":"west", "MKD":"west", "CAN":"west",
    "AUS":"west", "FIN":"west", "SWE":"west", "IRL":"west", "AUT":"west",
    "CHE":"west", "MLT":"west", "CYP":"west", "BIH":"west", "XKX":"west",
    "UKR":"west", "MDA":"west", "GEO":"west", "ARM":"west",
    "KOR":"west", "JPN":"west", "TWN":"west", "ISR":"west",
    "NZL":"west", "SGP":"west", "PHL":"west", "THA":"west",
    "RUS":"east", "BLR":"east", "CHN":"east", "PRK":"east", "IRN":"east",
    "SYR":"east", "VEN":"east", "CUB":"east", "NIC":"east",
    "MMR":"east", "ERI":"east", "ZWE":"east", "MLI":"east",
    "BFA":"east", "NER":"east", "CAF":"east", "SSD":"east",
    "IND":"neutral", "BRA":"neutral", "ZAF":"neutral", "SAU":"neutral",
    "EGY":"neutral", "ARE":"neutral", "QAT":"neutral", "KWT":"neutral",
    "BHR":"neutral", "OMN":"neutral", "JOR":"neutral", "LBN":"neutral",
    "IRQ":"neutral", "PAK":"neutral", "BGD":"neutral", "IDN":"neutral",
    "MYS":"neutral", "VNM":"neutral", "MEX":"neutral", "ARG":"neutral",
    "CHL":"neutral", "COL":"neutral", "PER":"neutral", "NGA":"neutral",
    "KEN":"neutral", "ETH":"neutral", "TZA":"neutral", "UGA":"neutral",
    "GHA":"neutral", "SEN":"neutral", "CIV":"neutral", "CMR":"neutral",
    "AGO":"neutral", "MOZ":"neutral", "ZMB":"neutral", "MAR":"neutral",
    "DZA":"neutral", "TUN":"neutral", "LBY":"neutral", "SDN":"neutral",
    "SOM":"neutral", "YEM":"neutral", "AFG":"neutral", "KAZ":"neutral",
    "UZB":"neutral", "TKM":"neutral", "KGZ":"neutral", "TJK":"neutral",
    "AZE":"neutral", "MNG":"neutral", "NPL":"neutral", "LKA":"neutral",
    "KHM":"neutral", "LAO":"neutral", "BRN":"neutral", "PNG":"neutral",
    "FJI":"neutral", "BTN":"neutral", "MDV":"neutral", "TLS":"neutral",
    "_default":"neutral"
  };

  /* ============================================================
     ALLIANCE COLORS — niet gebruikt voor rendering
     ============================================================ */
  window.ALLIANCE_COLORS = {
    west:     "#3b82f6",
    east:     "#e63946",
    neutral:  "#6b7280",
    friendly: "#06b6d4",
    disputed: "#a855f7"
  };

  /* ============================================================
     CONFLICT COLORS — voor de conflict-kaart
     ============================================================ */
  window.CONFLICT_COLORS = {
    cold:       "#2f2f38",
    warm:       "#7a4040",
    hot:        "#a52a2a",
    scorching:  "#d41919",
    actorRing:  "#ff6666",
    actorHot:   "#ff2222",
    border:     "rgba(255,255,255,0.12)",
    borderHot:  "#ff0000"
  };

  /* ============================================================
     ACTOR_MAP — bekende actoren → land
     ============================================================ */
  window.ACTOR_MAP = {
    /* Midden-Oosten */
    "houthi": "Jemen",
    "houthis": "Jemen",
    "houthi rebels": "Jemen",
    "hezbollah": "Libanon",
    "hamas": "Gaza",
    "palestinian islamic jihad": "Gaza",
    "pij": "Gaza",
    "idf": "Israël",
    "israeli army": "Israël",
    "israeli forces": "Israël",
    "israeli military": "Israël",
    "iranian army": "Iran",
    "irgc": "Iran",
    "iranian forces": "Iran",
    "syrian army": "Syrië",
    "assad forces": "Syrië",
    "iraqi army": "Irak",
    "islamic state": "Syrië",
    "isis": "Syrië",
    "isil": "Syrië",
    "daesh": "Syrië",
    "al-qaeda": "Syrië",
    "al qaeda": "Syrië",

    /* Oekraïne/Rusland */
    "russian army": "Rusland",
    "russian forces": "Rusland",
    "russian military": "Rusland",
    "kremlin": "Rusland",
    "wagner": "Rusland",
    "wagner group": "Rusland",
    "ukrainian army": "Oekraïne",
    "ukrainian forces": "Oekraïne",
    "ukrainian military": "Oekraïne",
    "afu": "Oekraïne",
    "zsu": "Oekraïne",

    /* Afrika */
    "rsf": "Sudan",
    "rapid support forces": "Sudan",
    "sudanese army": "Sudan",
    "al-shabaab": "Somalië",
    "al shabaab": "Somalië",
    "boko haram": "Nigeria",
    "m23": "Congo",

    /* Azië */
    "taliban": "Afghanistan",
    "afghan army": "Afghanistan",
    "pakistani army": "Pakistan",
    "indian army": "India",
    "myanmar military": "Myanmar",
    "junta": "Myanmar",
    "north korean army": "Noord-Korea",
    "chinese military": "China",
    "pla": "China"
  };

  /* ============================================================
     FEED TIERS — 100% neutrale persbureaus
     ============================================================ */
  window.FEED_TIERS = {
    /* TIER 1A — 100% */
    "NOS": 1.0, "BBC World": 1.0, "BBC UK": 1.0, "BBC Arabic": 1.0,
    "France24 EN": 1.0, "France24 AR": 1.0,
    "Reuters": 1.0, "AP News": 1.0, "Reuters TG": 1.0,

    /* TIER 1B — 85% */
    "Al Jazeera": 0.85, "Al Jazeera AR": 0.85, "Al Jazeera AR TG": 0.85,
    "Al Arabiya TG": 0.85, "Al-Ahram": 0.85, "Arab News": 0.85,
    "Saudi Gazette": 0.85, "The National": 0.85, "Gulf News": 0.85,
    "The Peninsula": 0.85, "Asharq Al-Awsat": 0.85,
    "Anadolu AR": 0.85, "TRT World": 0.85,
    "SANA": 0.85, "SABA Yemen": 0.85,
    "RT Arabic": 0.85, "RT News": 0.85, "TASS": 0.85,
    "Times of Israel": 0.85, "Jerusalem Post": 0.85, "Ynet": 0.85,
    "Kyiv Independent": 0.85, "Ukrinform": 0.85,
    "Mehr News Iran": 0.85,
    "MAP": 0.85,

    /* TIER 2 — 70% */
    "De Telegraaf": 0.7, "AD.nl": 0.7, "De Volkskrant": 0.7,
    "Het Parool": 0.7, "Trouw": 0.7, "RTL Nieuws": 0.7, "Nu.nl": 0.7,
    "HLN": 0.7, "Nieuwsblad": 0.7, "De Standaard": 0.7,
    "VRT NWS": 0.7, "De Morgen": 0.7, "De Tijd": 0.7,
    "Spiegel": 0.7, "Bild": 0.7, "Zeit": 0.7, "FAZ": 0.7,
    "Süddeutsche": 0.7, "Die Welt": 0.7,
    "Le Monde": 0.7, "FranceInfo": 0.7, "Libération": 0.7,
    "Corriere della Sera": 0.7, "Repubblica": 0.7, "La Stampa": 0.7,
    "Guardian UK": 0.7, "Telegraph": 0.7, "Sky News": 0.7,
    "Independent": 0.7, "FT": 0.7,
    "NYT US": 0.7, "CNN": 0.7, "Washington Post": 0.7, "NPR": 0.7,
    "Guardian": 0.7, "NYT World": 0.7, "Japan Times": 0.7,
    "Al Monitor": 0.7, "Middle East Eye": 0.7, "CNN Arabic": 0.7,
    "Al Quds Al Arabi": 0.7, "L'Orient-Le Jour": 0.7, "Naharnet": 0.7,
    "Hespress": 0.7, "Le360": 0.7, "Yabiladi": 0.7, "TelQuel": 0.7,
    "NOS Sport": 0.7, "NOS Voetbal": 0.7, "ESPN NL": 0.7,
    "NUsport": 0.7, "RTL Sport": 0.7,
    "Egypt Independent": 0.7,

    /* TIER 3 — 50% */
    "Omroep Brabant": 0.5, "Omroep Flevoland": 0.5, "NH Nieuws": 0.5,
    "RTV Utrecht": 0.5, "Omroep Gelderland": 0.5, "L1": 0.5,
    "RTV Oost": 0.5, "Omroep West": 0.5,
    "Lakome2": 0.5, "Bladna.nl": 0.5, "Marokko.nl": 0.5,
    "Voetbalnieuws": 0.5, "Voetbalzone": 0.5, "Voetbalprimeur": 0.5,
    "FCUpdate": 0.5, "Soccernews": 0.5,
    "Glory Kickboxing": 0.5, "MMA DNA": 0.5,
    "Enab Baladi": 0.5, "Sudan Tribune": 0.5, "Radio Dabanga": 0.5,
    "Middle East Monitor": 0.5, "Mondoweiss": 0.5,

    /* TIER 4 — 30% (OSINT) */
    "Clash Report TG": 0.3, "Liveuamap TG": 0.3, "GeoConfirmed TG": 0.3,
    "OSINTdefender TG": 0.3, "Faytuks TG": 0.3, "NOELreports TG": 0.3,
    "Middle East Eye TG": 0.3,

    "_default": 0.5
  };

  /* ============================================================
     THRESHOLDS
     ============================================================ */
  window.WORLDMAP_THRESHOLDS = {
    consensus_min: 0.70,
    confirm_min_sources: 3,
    confirm_min_origins: 2,
    claim_min_sources: 2,
    claim_grace_hours: 24,
    retract_grace_hours: 6,
    definitive_days: 7,
    decay_half_life_days: 3,
    max_events_per_source_per_day: 3,

    heat: {
  cold: 0,
  warm: 1,      /* was 5 — verlaagd voor zichtbaarheid */
  hot: 3,       /* was 15 */
  scorching: 8  /* was 40 */
},

    actor_ring_min: 3,
    actor_ring_hot: 15,

    conflict_ring_min: 5,
    snapshot_interval_ms: 24 * 60 * 60 * 1000,
    heat_recalc_interval_ms: 5 * 60 * 1000
  };

  /* ============================================================
     LANDNAAM → ISO3 (v2.1 — voor matching met GeoJSON features)
     ============================================================ */
  var COUNTRY_TO_ISO3 = {
    /* Conflictgebieden */
    "oekraïne": "UKR", "ukraine": "UKR",
    "rusland": "RUS", "russia": "RUS",
    "israël": "ISR", "israel": "ISR",
    "gaza": "PSE",
    "westelijke jordaanoever": "PSE", "west bank": "PSE",
    "libanon": "LBN", "lebanon": "LBN",
    "syrië": "SYR", "syria": "SYR",
    "iran": "IRN",
    "irak": "IRQ", "iraq": "IRQ",
    "jemen": "YEM", "yemen": "YEM",
    "saudi-arabië": "SAU", "saudi": "SAU",
    "qatar": "QAT",
    "koeweit": "KWT", "kuwait": "KWT",
    "vae": "ARE", "uae": "ARE", "emiraten": "ARE",

    /* Afrika */
    "sudan": "SDN",
    "mali": "MLI",
    "burkina faso": "BFA",
    "niger": "NER",
    "nigeria": "NGA",
    "somalië": "SOM", "somalia": "SOM",
    "ethiopië": "ETH", "ethiopia": "ETH",
    "congo": "COD", "drc": "COD",
    "mozambique": "MOZ",
    "libië": "LBY", "libya": "LBY",
    "egypte": "EGY", "egypt": "EGY",
    "marokko": "MAR", "morocco": "MAR",
    "algerije": "DZA", "tunesië": "TUN",
    "kenia": "KEN", "kenya": "KEN",

    /* Azië */
    "afghanistan": "AFG",
    "pakistan": "PAK",
    "india": "IND",
    "china": "CHN",
    "taiwan": "TWN",
    "noord-korea": "PRK", "north korea": "PRK",
    "zuid-korea": "KOR", "south korea": "KOR",
    "myanmar": "MMR",
    "japan": "JPN",
    "indonesië": "IDN",

    /* Europa */
    "nederland": "NLD", "netherlands": "NLD",
    "belgië": "BEL", "belgium": "BEL",
    "duitsland": "DEU", "germany": "DEU",
    "frankrijk": "FRA", "france": "FRA",
    "verenigd koninkrijk": "GBR", "vk": "GBR", "uk": "GBR",
    "polen": "POL", "poland": "POL",
    "spanje": "ESP", "spain": "ESP",
    "italië": "ITA", "italy": "ITA",
    "zwitserland": "CHE",
    "oostenrijk": "AUT",
    "zweden": "SWE",
    "noorwegen": "NOR",
    "denemarken": "DNK",
    "finland": "FIN",
    "ierland": "IRL",
    "portugal": "PRT",
    "griekenland": "GRC",
    "turkije": "TUR", "turkey": "TUR",
    "roemenië": "ROU",
    "hongarije": "HUN",
    "tsjechië": "CZE",
    "servië": "SRB",
    "kroatië": "HRV",
    "bulgarije": "BGR",
    "moldavië": "MDA",
    "georgië": "GEO",
    "armenië": "ARM",
    "azerbeidzjan": "AZE",
    "wit-rusland": "BLR", "belarus": "BLR",

    /* Amerika */
    "vs": "USA", "verenigde staten": "USA", "usa": "USA",
    "canada": "CAN",
    "mexico": "MEX",
    "brazilië": "BRA", "brazil": "BRA",
    "venezuela": "VEN",
    "colombia": "COL",
    "argentië": "ARG",
    "chili": "CHL",
    "peru": "PER",
    "cuba": "CUB",

    /* Regio-fallbacks */
    "oost-europa": "REG-EE",
    "midden-oosten": "REG-ME",
    "west-europa": "REG-WE",
    "afrika": "REG-AF",
    "sahel": "REG-SH",
    "azië": "REG-AS",
    "noord-amerika": "REG-NA",
    "latijns-amerika": "REG-LA"
  };

  /* ============================================================
     HELPERS
     ============================================================ */
  window.WorldMapData = {
    getAlliance: function(iso3){
      if (!iso3) return "neutral";
      var a = window.ALLIANCES[iso3.toUpperCase()];
      return a || window.ALLIANCES._default;
    },
    getColor: function(alliance){
      return window.ALLIANCE_COLORS[alliance] || window.ALLIANCE_COLORS.neutral;
    },
    getTier: function(sourceName){
      if (!sourceName) return window.FEED_TIERS._default;
      var t = window.FEED_TIERS[sourceName];
      return typeof t === "number" ? t : window.FEED_TIERS._default;
    },
    getThresholds: function(){
      return window.WORLDMAP_THRESHOLDS;
    },
    getConflictColor: function(level){
      var c = window.CONFLICT_COLORS;
      if (level === "scorching") return c.scorching;
      if (level === "hot") return c.hot;
      if (level === "warm") return c.warm;
      return c.cold;
    },
    /* v2.1: landnaam → ISO3 */
    getISO3: function(countryName){
      if (!countryName) return null;
      var key = String(countryName).toLowerCase().trim();
      return COUNTRY_TO_ISO3[key] || null;
    },
    detectActorsInTitle: function(title){
      if (!title) return [];
      var lower = String(title).toLowerCase();
      var found = [];
      var seen = {};
      for (var key in window.ACTOR_MAP) {
        if (!Object.prototype.hasOwnProperty.call(window.ACTOR_MAP, key)) continue;
        if (key.indexOf(" ") === -1) {
          var regex = new RegExp("\\b" + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\b", "i");
          if (regex.test(lower)) {
            var country = window.ACTOR_MAP[key];
            if (country && !seen[country]){
              seen[country] = true;
              found.push(country);
            }
          }
        } else {
          if (lower.indexOf(key) !== -1) {
            var country2 = window.ACTOR_MAP[key];
            if (country2 && !seen[country2]){
              seen[country2] = true;
              found.push(country2);
            }
          }
        }
      }
      return found;
    }
  };

  try { if (window.wdLog) wdLog.info("[WORLDMAP] data v2.1 geladen — conflict-kaart + ISO3 mapping"); } catch(e){}

})();