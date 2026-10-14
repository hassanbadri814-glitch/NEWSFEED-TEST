/* ============================================================
   WAR DESK — conflict-areas-data.js v1.0
   Alleen data. Geen logica. Geen DOM.
   Bewerk dit bestand als je partijen, kleuren of landen wil
   toevoegen — de rest van de kaart-modules blijft ongemoeid.
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";

  function adm0Sources(iso3){
    return [
      "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_" + iso3 + "_0.json",
      "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_" + iso3 + "_0.json"
    ];
  }

  var CONFLICTS = {
    "UKR": {
      name: "Oekraïne", level: "ADM1", center: [49.0, 32.0, 6],
      parties: {
        "Rusland":  { color: "#C62828", fill: "#C62828" },
        "Oekraïne": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_UKR_1.json"
      ],
      countrySources: adm0Sources("UKR")
    },
    "SYR": {
      name: "Syrië", level: "ADM2", center: [34.8, 38.9, 7],
      parties: {
        "Al-Sharaa-regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Druze-milities":     { color: "#9333EA", fill: "#9333EA" },
        "IS":                 { color: "#1F2937", fill: "#1F2937" },
        "Israël (bezet)":     { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SYR_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SYR_2.json"
      ],
      countrySources: adm0Sources("SYR")
    },
    "LBN": {
      name: "Libanon", level: "ADM2", center: [33.85, 35.86, 8],
      parties: {
        "Libanese staat": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Hezbollah":      { color: "#FBC02D", fill: "#FBC02D" },
        "Israël (bezet)": { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_LBN_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_LBN_2.json"
      ],
      countrySources: adm0Sources("LBN")
    },
    "YEM": {
      name: "Jemen", level: "ADM1", center: [15.55, 48.52, 6],
      parties: {
        "Regering":  { color: "#2A6FDB", fill: "#2A6FDB" },
        "Houthi's":  { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_YEM_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_YEM_1.json"
      ],
      countrySources: adm0Sources("YEM")
    },
    "SAU": {
      name: "Saoedi-Arabië", level: "ADM1", center: [24.71, 46.68, 5],
      parties: {
        "Saoedi-Arabië": { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SAU_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SAU_1.json"
      ],
      countrySources: adm0Sources("SAU")
    },
    "SDN": {
      name: "Soedan", level: "ADM1", center: [15.55, 32.53, 6],
      parties: {
        "Regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "RSF":      { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SDN_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SDN_1.json"
      ],
      countrySources: adm0Sources("SDN")
    },
    "ISR": {
      name: "Israël", level: "ADM1", center: [31.4, 34.9, 7],
      parties: { "Israël": { color: "#C62828", fill: "#C62828" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ISR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ISR_1.json"
      ],
      countrySources: adm0Sources("ISR")
    },
    "PSE": {
      name: "Palestina", level: "ADM1", center: [31.95, 35.23, 8],
      parties: { "Palestina": { color: "#2A6FDB", fill: "#2A6FDB" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PSE_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PSE_1.json"
      ],
      countrySources: adm0Sources("PSE")
    },
    "ETH": {
      name: "Ethiopië", level: "ADM1", center: [11.0, 39.0, 6],
      parties: {
        "Federale regering": { color: "#2A6FDB", fill: "#2A6FDB" },
        "TPLF (Tigray)":     { color: "#F59E0B", fill: "#F59E0B" },
        "Fano (Amhara)":     { color: "#C62828", fill: "#C62828" },
        "OLA (Oromia)":      { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ETH_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ETH_1.json"
      ],
      countrySources: adm0Sources("ETH")
    },
    "MMR": {
      name: "Myanmar", level: "ADM1", center: [21.9, 95.9, 6],
      parties: {
        "Militaire junta": { color: "#C62828", fill: "#C62828" },
        "Arakan Army":     { color: "#F59E0B", fill: "#F59E0B" },
        "KIA (Kachin)":    { color: "#9333EA", fill: "#9333EA" },
        "KNU (Karen)":     { color: "#3B82F6", fill: "#3B82F6" },
        "NUG (verzet)":    { color: "#2A6FDB", fill: "#2A6FDB" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_MMR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_MMR_1.json"
      ],
      countrySources: adm0Sources("MMR")
    },
    "MLI": {
      name: "Mali", level: "ADM1", center: [17.6, -4.0, 6],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "FLA (Toeareg)":     { color: "#F59E0B", fill: "#F59E0B" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_MLI_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_MLI_1.json"
      ],
      countrySources: adm0Sources("MLI")
    },
    "BFA": {
      name: "Burkina Faso", level: "ADM1", center: [12.3, -1.6, 7],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_BFA_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_BFA_1.json"
      ],
      countrySources: adm0Sources("BFA")
    },
    "NER": {
      name: "Niger", level: "ADM1", center: [17.6, 8.1, 6],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "IS Sahel":          { color: "#9333EA", fill: "#9333EA" },
        "Boko Haram/ISWAP":  { color: "#F59E0B", fill: "#F59E0B" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_NER_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_NER_1.json"
      ],
      countrySources: adm0Sources("NER")
    },
    "COD": {
      name: "DR Congo", level: "ADM1", center: [-2.5, 26.0, 6],
      parties: {
        "Regering (FARDC)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "M23/AFC":          { color: "#C62828", fill: "#C62828" },
        "FDLR (Rwanda)":    { color: "#9333EA", fill: "#9333EA" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_COD_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_COD_1.json"
      ],
      countrySources: adm0Sources("COD")
    },
    "PAK": {
      name: "Pakistan", level: "ADM1", center: [30.4, 69.3, 6],
      parties: {
        "Pakistan (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Afghanistan (Taliban)": { color: "#C62828", fill: "#C62828" },
        "India (grens)":         { color: "#F59E0B", fill: "#F59E0B" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PAK_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PAK_1.json"
      ],
      countrySources: adm0Sources("PAK")
    }
  };

  var ACTIVE_CONFLICTS = [
    "SYR", "LBN", "YEM", "SAU", "ISR", "PSE",
    "UKR",
    "SDN", "ETH",
    "MLI", "BFA", "NER",
    "COD",
    "MMR", "PAK"
  ];

  var PANES = {
    province:      { name: "caPaneProvince",      z: 420 },
    countryShadow: { name: "caPaneCountryShadow", z: 430 },
    country:       { name: "caPaneCountry",       z: 440 }
  };

  var COLORS = {
    provinceBorder: "rgba(255,255,255,0.18)",
    countryBorder:  "rgba(255,255,255,0.80)",
    underAttack:    "#e63950",
    unknownFill:    "#1e2329"
  };

  var THRESHOLDS = {
    fillOpacity:            0.55,
    unknownFillOpacity:     0.15,
    attackRing:             0.4,
    attackRingHigh:         0.7,
    attackRingWeight:       1.8,
    attackRingHighWeight:   2.5
  };

  function provinceWeight(z){
    if (z <= 4) return 0.35;
    if (z <= 6) return 0.55;
    if (z <= 8) return 0.75;
    return 0.95;
  }

  function provinceOpacity(z){
    if (z <= 4) return 0.15;
    if (z <= 6) return 0.25;
    if (z <= 8) return 0.35;
    return 0.45;
  }

  window.WDCAData = {
    version: VERSION,
    conflicts: CONFLICTS,
    activeConflicts: ACTIVE_CONFLICTS,
    panes: PANES,
    colors: COLORS,
    thresholds: THRESHOLDS,
    provinceWeight: provinceWeight,
    provinceOpacity: provinceOpacity,
    getConflict: function(iso){ return CONFLICTS[iso] || null; }
  };

  try { wdLog.info("[CA-Data] " + VERSION + " geladen — " + Object.keys(CONFLICTS).length + " conflicten"); } catch(e){}

})();