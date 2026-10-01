/* ============================================================
   WAR DESK — conflict-areas.js v11.14
   - v11.14: AI-confirmed overrides (3-dagen stabiliteit voor
             landen zonder DeepState/ISW). Fill = controller OF
             confirmed override. UKR blijft DeepState-leidend.
   - v11.13: styleProvince — fill = controller, rand = consensus
   - v11.12: openPanel sluit eerst #wmCountryPanel
   - v11.11: FIX init timeout (30s → 120s) + parallel batching
   ============================================================ */

(function(){
  "use strict";

  var LOG = function(){
    try{ wdLog.info.apply(null, ["[AREA]"].concat(Array.prototype.slice.call(arguments))); }catch(e){}
  };

  var UNIVERSAL_COLORS = [
    { label: "Regering / staat", color: "#2A6FDB" },
    { label: "Tegenstander / bezetter", color: "#C62828" },
    { label: "Hezbollah", color: "#FBC02D" },
    { label: "Druze (Syrië)", color: "#9333EA" },
    { label: "RSF (Soedan)", color: "#C62828" },
    { label: "Jihadisten (Sahel)", color: "#16A34A" },
    { label: "TPLF (Ethiopië)", color: "#F59E0B" },
    { label: "Arakan Army (Myanmar)", color: "#F59E0B" },
    { label: "M23 (DRC)", color: "#C62828" },
    { label: "Contested", color: "#a855f7" }
  ];

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
      countrySources: adm0Sources("UKR"),
      iswUrl: "https://services5.arcgis.com/SaBe5HMtmnbqSWlu/ArcGIS/rest/services/VIEW_RussiaCoTinUkraine_V3/FeatureServer/49/query?where=1%3D1&outFields=*&f=geojson",
      deepStateUrlFn: function(){
        var now = new Date();
        if(now.getUTCHours() < 4){ now.setUTCDate(now.getUTCDate() - 1); }
        var y = now.getUTCFullYear();
        var m = String(now.getUTCMonth() + 1).padStart(2, "0");
        var d = String(now.getUTCDate()).padStart(2, "0");
        return "https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_" + y + m + d + ".geojson";
      },
      provinceRules: null, districtOverrides: null, overlayPolygons: null,
      cacheKeys: {
        oblasts:   { key: "wardesk_ukraine_oblasts", version: "v11" },
        country:   { key: "wardesk_ukraine_country", version: "v1"  },
        deepState: { key: "wardesk_deepstate_geo",   version: "v7"  },
        isw:       { key: "wardesk_isw_geo",         version: "v5"  },
        snapshot:  { key: "wardesk_ukraine_snapshot",version: "v1"  }
      }
    },
    "SYR": {
      name: "Syrië", level: "ADM2", center: [34.8, 38.9, 7],
      parties: {
        "Regering":  { color: "#2A6FDB", fill: "#2A6FDB" },
        "Druze":     { color: "#C62828", fill: "#C62828" },
        "Israël":    { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SYR_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SYR_2.json"
      ],
      countrySources: adm0Sources("SYR"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["aleppo"],                                            controller: "Regering" },
        { match: ["alhasakah", "hasakah"],                              controller: "Regering" },
        { match: ["arraqqah", "raqqah"],                                controller: "Regering" },
        { match: ["assuwayda", "suwayda"],                              controller: "Druze" },
        { match: ["damascus"],                                          controller: "Regering" },
        { match: ["dara"],                                              controller: "Regering" },
        { match: ["dayrazzawr", "deirez"],                              controller: "Regering" },
        { match: ["hamah", "hama"],                                     controller: "Regering" },
        { match: ["hims", "homs"],                                      controller: "Regering" },
        { match: ["idlib"],                                             controller: "Regering" },
        { match: ["lattakia", "latakia"],                               controller: "Regering" },
        { match: ["quneitra"],                                          controller: "Regering" },
        { match: ["rifdimashq", "dimashq"],                             controller: "Regering" },
        { match: ["tartus"],                                            controller: "Regering" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_syria_adm2",      version: "v4" },
        country:   { key: "wardesk_syria_country",   version: "v1" },
        deepState: { key: "wardesk_syria_ds",        version: "v1" },
        isw:       { key: "wardesk_syria_isw",       version: "v1" },
        snapshot:  { key: "wardesk_syria_snapshot",  version: "v1" }
      }
    },
    "LBN": {
      name: "Libanon", level: "ADM2", center: [33.85, 35.86, 8],
      parties: {
        "Libanese staat": { color: "#2A6FDB", fill: "#2A6FDB" },
        "Hezbollah":      { color: "#FBC02D", fill: "#FBC02D" },
        "Israël":         { color: "#C62828", fill: "#C62828" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_LBN_2.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_LBN_2.json"
      ],
      countrySources: adm0Sources("LBN"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["akkar"],                 controller: "Libanese staat" },
        { match: ["beirut"],                controller: "Libanese staat" },
        { match: ["mountlebanon"],          controller: "Libanese staat" },
        { match: ["north"],                 controller: "Libanese staat" },
        { match: ["baalbak", "hermel"],     controller: "Hezbollah" },
        { match: ["bekaa"],                 controller: "Hezbollah" },
        { match: ["nabatiyeh"],             controller: "Hezbollah" },
        { match: ["south"],                 controller: "Hezbollah" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_lebanon_adm2",      version: "v2" },
        country:   { key: "wardesk_lebanon_country",   version: "v1" },
        deepState: { key: "wardesk_lebanon_ds",        version: "v1" },
        isw:       { key: "wardesk_lebanon_isw",       version: "v1" },
        snapshot:  { key: "wardesk_lebanon_snapshot",  version: "v1" }
      }
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
      countrySources: adm0Sources("YEM"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["sa'dah", "sadah", "saadah", "saada"],         controller: "Houthi's" },
        { match: ["san'a'", "sanaa", "sana", "amantalasimah", "amanatalasimah"], controller: "Houthi's" },
        { match: ["amran"],                                       controller: "Houthi's" },
        { match: ["dhamar"],                                      controller: "Houthi's" },
        { match: ["almahwit", "mahwit"],                          controller: "Houthi's" },
        { match: ["raymah"],                                      controller: "Houthi's" },
        { match: ["alhaduyadah", "hodeidah", "alhudaydah", "hudaydah", "hudaidah"], controller: "Houthi's" },
        { match: ["hajjah", "hajah"],                             controller: "Houthi's" },
        { match: ["ibb", "ib"],                                   controller: "Houthi's" },
        { match: ["ta'izz", "taizz", "taiz"],                     controller: "Houthi's" },
        { match: ["albayda", "bayda"],                            controller: "Houthi's" },
        { match: ["ma'rib", "marib", "mareb"],                    controller: "Houthi's" },
        { match: ["aljawf", "jawf", "aljauf"],                    controller: "Houthi's" },
        { match: ["aldali", "dhale", "addali", "dali"],           controller: "Houthi's" },
        { match: ["'adan", "adan", "aden"],                       controller: "Regering" },
        { match: ["abyan"],                                       controller: "Regering" },
        { match: ["lahij", "lahj"],                               controller: "Regering" },
        { match: ["shabwah", "shabwa"],                           controller: "Regering" },
        { match: ["hadramawt", "hadramout", "hadhramaut"],        controller: "Regering" },
        { match: ["almahrah", "mahra"],                           controller: "Regering" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_yemen_adm1",      version: "v2" },
        country:   { key: "wardesk_yemen_country",   version: "v1" },
        deepState: { key: "wardesk_yemen_ds",        version: "v1" },
        isw:       { key: "wardesk_yemen_isw",       version: "v1" },
        snapshot:  { key: "wardesk_yemen_snapshot",  version: "v1" }
      }
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
      countrySources: adm0Sources("SDN"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["khartoum", "khartum"],       controller: "RSF" },
        { match: ["shamaldarfur", "northdarfur", "shamal darfur", "north darfur"],    controller: "RSF" },
        { match: ["janubdarfur", "southdarfur", "janub darfur", "south darfur"],       controller: "RSF" },
        { match: ["gharbdarfur", "westdarfur", "gharb darfur", "west darfur"],         controller: "RSF" },
        { match: ["sharqdarfur", "eastdarfur", "sharq darfur", "east darfur"],         controller: "RSF" },
        { match: ["wasatdarfur", "centraldarfur", "wasat darfur", "central darfur"],   controller: "RSF" },
        { match: ["shamalkurdufan", "shamalkordofan", "northkurdufan", "northkordofan", "shamal kurdufan", "shamal kordofan", "north kurdufan", "north kordofan"], controller: "RSF" },
        { match: ["janubkurdufan", "janubkordofan", "southkurdufan", "southkordofan", "janub kurdufan", "janub kordofan", "south kurdufan", "south kordofan"], controller: "Regering" },
        { match: ["gharbkurdufan", "gharbkordofan", "westkurdufan", "westkordofan", "gharb kurdufan", "gharb kordofan", "west kurdufan", "west kordofan"], controller: "RSF" },
        { match: ["aljazirah", "gezira", "algezira", "al jazirah", "al gezira", "wadmadani"], controller: "RSF" },
        { match: ["sinnar", "sennar", "sannar"],                                       controller: "RSF" },
        { match: ["annilalabyad", "whitenile", "an nil al abyad", "white nile"],       controller: "Regering" },
        { match: ["annilalazraq", "bluenile", "an nil al azraq", "blue nile"],         controller: "Regering" },
        { match: ["nahranil", "rivernile", "nahr an nil", "river nile"],               controller: "Regering" },
        { match: ["albahralahmar", "redsea", "al bahr al ahmar", "red sea"],           controller: "Regering" },
        { match: ["kassala"],                                                         controller: "Regering" },
        { match: ["alqadarif", "gedaref", "qadarif", "al qadarif"],                    controller: "Regering" },
        { match: ["ashshamaliyah", "northern", "ash shamaliyah", "northern state"],    controller: "Regering" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_sudan_adm1",      version: "v3" },
        country:   { key: "wardesk_sudan_country",   version: "v1" },
        deepState: { key: "wardesk_sudan_ds",        version: "v1" },
        isw:       { key: "wardesk_sudan_isw",       version: "v1" },
        snapshot:  { key: "wardesk_sudan_snapshot",  version: "v1" }
      }
    },
    "SAU": {
      name: "Saoedi-Arabië", level: "ADM1", center: [24.71, 46.68, 5],
      parties: { "Saoedi-Arabië": { color: "#2A6FDB", fill: "#2A6FDB" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SAU_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_SAU_1.json"
      ],
      countrySources: adm0Sources("SAU"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["jizan", "jazan"],       controller: "Saoedi-Arabië" },
        { match: ["najran"],               controller: "Saoedi-Arabië" },
        { match: ["asir"],                 controller: "Saoedi-Arabië" },
        { match: ["albahah"],              controller: "Saoedi-Arabië" },
        { match: ["alhududashshamaliyah"], controller: "Saoedi-Arabië" },
        { match: ["aljawf"],               controller: "Saoedi-Arabië" },
        { match: ["almadinah"],            controller: "Saoedi-Arabië" },
        { match: ["alqassim"],             controller: "Saoedi-Arabië" },
        { match: ["arriyad", "arriyadh"],  controller: "Saoedi-Arabië" },
        { match: ["ashsharqiyah"],         controller: "Saoedi-Arabië" },
        { match: ["ha'il", "hail"],        controller: "Saoedi-Arabië" },
        { match: ["makkah"],               controller: "Saoedi-Arabië" },
        { match: ["tabuk"],                controller: "Saoedi-Arabië" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_saudi_adm1",      version: "v1" },
        country:   { key: "wardesk_saudi_country",   version: "v1" },
        deepState: { key: "wardesk_saudi_ds",        version: "v1" },
        isw:       { key: "wardesk_saudi_isw",       version: "v1" },
        snapshot:  { key: "wardesk_saudi_snapshot",  version: "v1" }
      }
    },
    "ISR": {
      name: "Israël", level: "ADM1", center: [31.4, 34.9, 7],
      parties: { "Israël": { color: "#C62828", fill: "#C62828" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ISR_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_ISR_1.json"
      ],
      countrySources: adm0Sources("ISR"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["golan"],    controller: "Israël" },
        { match: ["hadarom"],  controller: "Israël" },
        { match: ["haifa"],    controller: "Israël" },
        { match: ["hamerkaz"], controller: "Israël" },
        { match: ["hazafon"],  controller: "Israël" },
        { match: ["jerusalem"],controller: "Israël" },
        { match: ["telaviv"],  controller: "Israël" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_israel_adm1",      version: "v1" },
        country:   { key: "wardesk_israel_country",   version: "v1" },
        deepState: { key: "wardesk_israel_ds",        version: "v1" },
        isw:       { key: "wardesk_israel_isw",       version: "v1" },
        snapshot:  { key: "wardesk_israel_snapshot",  version: "v1" }
      }
    },
    "PSE": {
      name: "Palestina", level: "ADM1", center: [31.95, 35.23, 8],
      parties: { "Palestina": { color: "#2A6FDB", fill: "#2A6FDB" } },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PSE_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_PSE_1.json"
      ],
      countrySources: adm0Sources("PSE"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["gaza"],     controller: "Palestina" },
        { match: ["westbank"], controller: "Palestina" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_palestine_adm1",     version: "v1" },
        country:   { key: "wardesk_palestine_country",  version: "v1" },
        deepState: { key: "wardesk_palestine_ds",       version: "v1" },
        isw:       { key: "wardesk_palestine_isw",      version: "v1" },
        snapshot:  { key: "wardesk_palestine_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("ETH"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["tigray"],                                          controller: "TPLF (Tigray)" },
        { match: ["amhara"],                                          controller: "Fano (Amhara)" },
        { match: ["afar"],                                            controller: "TPLF (Tigray)" },
        { match: ["oromia"],                                          controller: "OLA (Oromia)" },
        { match: ["benshangul", "benishangul", "gumuz", "gumaz"],     controller: "Federale regering" },
        { match: ["assosa", "asosa", "metekel", "kamashi"],           controller: "Federale regering" },
        { match: ["gambela", "gambella"],                             controller: "Federale regering" },
        { match: ["somali", "somale"],                                controller: "Federale regering" },
        { match: ["sidama"],                                          controller: "Federale regering" },
        { match: ["southwest", "south west"],                         controller: "Federale regering" },
        { match: ["central ethiopia", "centralehtiopia"],             controller: "Federale regering" },
        { match: ["south ethiopia", "southethiopia"],                 controller: "Federale regering" },
        { match: ["snnpr", "southern nations"],                       controller: "Federale regering" },
        { match: ["addis ababa", "addisababa", "addis"],              controller: "Federale regering" },
        { match: ["dire dawa", "diredawa"],                           controller: "Federale regering" },
        { match: ["harari"],                                          controller: "Federale regering" },
        { match: ["wollega", "wellega", "gondar", "gojjam"],          controller: "Federale regering" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_ethiopia_adm1",   version: "v3" },
        country:   { key: "wardesk_ethiopia_country", version: "v1" },
        deepState: { key: "wardesk_ethiopia_ds",     version: "v1" },
        isw:       { key: "wardesk_ethiopia_isw",    version: "v1" },
        snapshot:  { key: "wardesk_ethiopia_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("MMR"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["rakhine", "arakan"],          controller: "Arakan Army" },
        { match: ["kachin"],                     controller: "KIA (Kachin)" },
        { match: ["kayin", "karen"],             controller: "KNU (Karen)" },
        { match: ["sagaing"],                    controller: "NUG (verzet)" },
        { match: ["magway"],                     controller: "NUG (verzet)" },
        { match: ["mandalay"],                   controller: "Militaire junta" },
        { match: ["shan"],                       controller: "Militaire junta" },
        { match: ["chin"],                       controller: "NUG (verzet)" },
        { match: ["bago"],                       controller: "NUG (verzet)" },
        { match: ["ayeyarwady", "irrawaddy"],    controller: "Militaire junta" },
        { match: ["yangon", "rangoon"],          controller: "Militaire junta" },
        { match: ["naypyidaw", "naypyitaw"],     controller: "Militaire junta" },
        { match: ["mon"],                        controller: "Militaire junta" },
        { match: ["kayah", "karenni"],           controller: "Militaire junta" },
        { match: ["tanintharyi", "tenasserim"],  controller: "Militaire junta" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_myanmar_adm1",   version: "v2" },
        country:   { key: "wardesk_myanmar_country", version: "v1" },
        deepState: { key: "wardesk_myanmar_ds",     version: "v1" },
        isw:       { key: "wardesk_myanmar_isw",    version: "v1" },
        snapshot:  { key: "wardesk_myanmar_snapshot", version: "v1" }
      }
    },
    "MLI": {
      name: "Mali", level: "ADM1", center: [17.6, -4.0, 6],
      parties: {
        "Junta (Regering)": { color: "#2A6FDB", fill: "#2A6FDB" },
        "JNIM (Jihadisten)": { color: "#16A34A", fill: "#16A34A" },
        "FLA (Toeareg)":     { color: "#F59E0B", fill: "#F59E0B" }
      },
      oblastSources: [
        "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_MLI_1.json",
        "https://geodata.ucdavis.edu/gadm/gadm4.0/json/gadm40_MLI_1.json"
      ],
      countrySources: adm0Sources("MLI"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["kidal"],      controller: "FLA (Toeareg)" },
        { match: ["gao"],        controller: "JNIM (Jihadisten)" },
        { match: ["timbuktu", "tombouctou"], controller: "JNIM (Jihadisten)" },
        { match: ["menaka"],     controller: "JNIM (Jihadisten)" },
        { match: ["mopti"],      controller: "JNIM (Jihadisten)" },
        { match: ["segou"],      controller: "Junta (Regering)" },
        { match: ["koulikoro"],  controller: "Junta (Regering)" },
        { match: ["sikasso"],    controller: "Junta (Regering)" },
        { match: ["kayes"],      controller: "Junta (Regering)" },
        { match: ["bamako"],     controller: "Junta (Regering)" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_mali_adm1",   version: "v2" },
        country:   { key: "wardesk_mali_country", version: "v1" },
        deepState: { key: "wardesk_mali_ds",     version: "v1" },
        isw:       { key: "wardesk_mali_isw",    version: "v1" },
        snapshot:  { key: "wardesk_mali_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("BFA"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["sahel"],                                           controller: "JNIM (Jihadisten)" },
        { match: ["est"],                                             controller: "JNIM (Jihadisten)" },
        { match: ["boucledumouhoun"],                                 controller: "JNIM (Jihadisten)" },
        { match: ["nord"],                                            controller: "JNIM (Jihadisten)" },
        { match: ["centrenord"],                                      controller: "JNIM (Jihadisten)" },
        { match: ["centreest"],                                       controller: "JNIM (Jihadisten)" },
        { match: ["kaya", "dori", "sebba", "gorom"],                  controller: "JNIM (Jihadisten)" },
        { match: ["cascades"],                                        controller: "Junta (Regering)" },
        { match: ["hautsbassins", "houet", "kenedougou", "tuy"],      controller: "Junta (Regering)" },
        { match: ["bobo", "dioulasso", "orodara", "banfora", "bama"], controller: "Junta (Regering)" },
        { match: ["sudouest"],                                        controller: "Junta (Regering)" },
        { match: ["gaoua", "diebougou", "dano"],                      controller: "Junta (Regering)" },
        { match: ["centresud"],                                       controller: "Junta (Regering)" },
        { match: ["plateaucentral", "plateau"],                       controller: "Junta (Regering)" },
        { match: ["centreouest"],                                     controller: "Junta (Regering)" },
        { match: ["centre"],                                          controller: "Junta (Regering)" },
        { match: ["kadiogo", "ouagadougou", "ouaga"],                 controller: "Junta (Regering)" },
        { match: ["kourweogo", "ziniare", "bousse"],                  controller: "Junta (Regering)" },
        { match: ["bazega", "kombissiri"],                            controller: "Junta (Regering)" },
        { match: ["zoundweogo", "manga"],                             controller: "Junta (Regering)" },
        { match: ["nando", "tenkodogo"],                              controller: "Junta (Regering)" },
        { match: ["boulgou", "garango"],                              controller: "Junta (Regering)" },
        { match: ["boulkiemde", "koudougou"],                         controller: "Junta (Regering)" },
        { match: ["sanguie", "reo"],                                  controller: "Junta (Regering)" },
        { match: ["sissili", "leo"],                                  controller: "Junta (Regering)" },
        { match: ["nahouri"],                                         controller: "Junta (Regering)" },
        { match: ["poni"],                                            controller: "Junta (Regering)" },
        { match: ["noumbiel", "batie"],                               controller: "Junta (Regering)" },
        { match: ["bougouriba"],                                      controller: "Junta (Regering)" },
        { match: ["iora"],                                            controller: "Junta (Regering)" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_burkina_adm1",   version: "v3" },
        country:   { key: "wardesk_burkina_country", version: "v1" },
        deepState: { key: "wardesk_burkina_ds",     version: "v1" },
        isw:       { key: "wardesk_burkina_isw",    version: "v1" },
        snapshot:  { key: "wardesk_burkina_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("NER"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["tillaberi", "tillabery"],        controller: "JNIM (Jihadisten)" },
        { match: ["tahoua"],                        controller: "IS Sahel" },
        { match: ["dosso"],                         controller: "IS Sahel" },
        { match: ["maradi"],                        controller: "IS Sahel" },
        { match: ["diffa"],                         controller: "Boko Haram/ISWAP" },
        { match: ["zinder"],                        controller: "Boko Haram/ISWAP" },
        { match: ["agadez"],                        controller: "Junta (Regering)" },
        { match: ["niamey"],                        controller: "Junta (Regering)" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_niger_adm1",   version: "v3" },
        country:   { key: "wardesk_niger_country", version: "v1" },
        deepState: { key: "wardesk_niger_ds",     version: "v1" },
        isw:       { key: "wardesk_niger_isw",    version: "v1" },
        snapshot:  { key: "wardesk_niger_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("COD"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["nordkivu"],          controller: "M23/AFC" },
        { match: ["sudkivu"],           controller: "M23/AFC" },
        { match: ["tanganyika"],        controller: "M23/AFC" },
        { match: ["ituri"],             controller: "M23/AFC" },
        { match: ["tshopo"],            controller: "M23/AFC" },
        { match: ["hautuele"],          controller: "M23/AFC" },
        { match: ["basuele"],           controller: "M23/AFC" },
        { match: ["maniema"],           controller: "M23/AFC" },
        { match: ["kinshasa"],          controller: "Regering (FARDC)" },
        { match: ["kongocentral"],      controller: "Regering (FARDC)" },
        { match: ["kwango"],            controller: "Regering (FARDC)" },
        { match: ["kwilu"],             controller: "Regering (FARDC)" },
        { match: ["maindombe"],         controller: "Regering (FARDC)" },
        { match: ["equateur"],          controller: "Regering (FARDC)" },
        { match: ["mongala"],           controller: "Regering (FARDC)" },
        { match: ["nordubangi"],        controller: "Regering (FARDC)" },
        { match: ["sudubangi"],         controller: "Regering (FARDC)" },
        { match: ["tshuapa"],           controller: "Regering (FARDC)" },
        { match: ["kasai"],             controller: "Regering (FARDC)" },
        { match: ["kasaicentral"],      controller: "Regering (FARDC)" },
        { match: ["kasaioriental"],     controller: "Regering (FARDC)" },
        { match: ["lomami"],            controller: "Regering (FARDC)" },
        { match: ["sankuru"],           controller: "Regering (FARDC)" },
        { match: ["hautkatanga"],       controller: "Regering (FARDC)" },
        { match: ["hautlomami"],        controller: "Regering (FARDC)" },
        { match: ["lualaba"],           controller: "Regering (FARDC)" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_drc_adm1",   version: "v3" },
        country:   { key: "wardesk_drc_country", version: "v1" },
        deepState: { key: "wardesk_drc_ds",     version: "v1" },
        isw:       { key: "wardesk_drc_isw",    version: "v1" },
        snapshot:  { key: "wardesk_drc_snapshot", version: "v1" }
      }
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
      countrySources: adm0Sources("PAK"),
      iswUrl: null, deepStateUrlFn: null,
      provinceRules: [
        { match: ["khyberpakhtunkhwa", "khyber"],   controller: "Afghanistan (Taliban)" },
        { match: ["balochistan"],                    controller: "Afghanistan (Taliban)" },
        { match: ["gilgitbaltistan", "gilgit"],      controller: "India (grens)" },
        { match: ["punjab"],                         controller: "India (grens)" },
        { match: ["sindh"],                          controller: "India (grens)" },
        { match: ["islamabad"],                      controller: "Pakistan (Regering)" },
        { match: ["azadkashmir", "kashmir"],         controller: "India (grens)" }
      ],
      districtOverrides: [], overlayPolygons: [],
      cacheKeys: {
        oblasts:   { key: "wardesk_pakistan_adm1",   version: "v2" },
        country:   { key: "wardesk_pakistan_country", version: "v1" },
        deepState: { key: "wardesk_pakistan_ds",     version: "v1" },
        isw:       { key: "wardesk_pakistan_isw",    version: "v1" },
        snapshot:  { key: "wardesk_pakistan_snapshot", version: "v1" }
      }
    }
  };

  var ACTIVE_CONFLICTS = [
    "SYR", "LBN", "YEM", "ISR", "PSE", "SAU",
    "UKR",
    "SDN", "ETH",
    "MLI", "BFA", "NER",
    "COD",
    "MMR", "PAK"
  ];

  var NEIGHBOR_COUNTRIES = [
    "TUR", "IRQ", "JOR", "EGY", "OMN", "ARE", "QAT", "KWT", "CYP",
    "RUS", "BLR", "POL", "ROU", "HUN", "SVK", "MDA",
    "LBY", "TCD", "CAF", "SSD", "ERI",
    "DJI", "SOM", "KEN",
    "DZA", "MRT", "GIN", "CIV", "GHA", "TGO", "BEN", "SEN", "GMB", "GNB", "SLE", "LBR",
    "RWA", "BDI", "UGA", "TZA", "ZMB", "AGO", "COG", "CMR",
    "THA", "LAO", "CHN", "IND", "BGD",
    "IRN", "AFG"
  ];

  var PROXIES = [
    "https://newsfeed2.hassanbadri814.workers.dev/?url=",
    "https://nieuwsproxy.hassanbadri814.workers.dev/?url=",
    "https://api.allorigins.win/raw?url="
  ];

  var DB_NAME = "wardesk_conflict_areas";
  var DB_VERSION = 1;
  var STORE_GEOJSON = "geojson";

  var PANES = {
    neighbors:     { name: "caPaneNeighbors",     z: 410 },
    province:      { name: "caPaneProvince",      z: 420 },
    countryShadow: { name: "caPaneCountryShadow", z: 430 },
    country:       { name: "caPaneCountry",       z: 440 },
    overlay:       { name: "caPaneOverlay",       z: 450 },
    territory:     { name: "caPaneTerritory",     z: 460 }
  };

  var COLORS = {
    provinceBorder: "rgba(255,255,255,0.18)",
    countryBorder:  "rgba(255,255,255,0.80)",
    countryShadow:  "rgba(0,0,0,0.60)",
    pulse:          "rgba(255,110,110,0.95)",
    territoryGain:  "#22c55e",
    territoryLoss:  "#ef4444",
    territoryContested: "#a855f7",
    confirmedRing: "#22c55e",
    neighborFillDark:    "#2d3a52",
    neighborFillLight:   "#d0cbc0",
    neighborStrokeDark:  "rgba(255,255,255,0.28)",
    neighborStrokeLight: "rgba(0,0,0,0.25)"
  };

  var FILL_OPACITY = 0.42;
  var OVERLAY_FILL_OPACITY = 0.55;

  function countryShadowWeight(z){
    if(z <= 4) return 1.5;
    if(z <= 6) return 1.8;
    if(z <= 8) return 2.1;
    return 2.4;
  }
  function countryWhiteWeight(z){
    if(z <= 4) return 0.9;
    if(z <= 6) return 1.0;
    if(z <= 8) return 1.2;
    return 1.4;
  }
  function provinceWeight(z){
    if(z <= 4) return 0.35;
    if(z <= 6) return 0.55;
    if(z <= 8) return 0.75;
    return 0.95;
  }
  function provinceOpacity(z){
    if(z <= 4) return 0.12;
    if(z <= 6) return 0.20;
    if(z <= 8) return 0.30;
    return 0.38;
  }

  var BORDER_WEIGHT_HOVER = 2.2;
  var OVERLAY_BORDER_WEIGHT = 1.4;

  var PULSE_INTERVAL_MS   = 900;
  var PULSE_MIN_INTENSITY = 0.15;
  var PULSE_WEIGHT_MIN    = 1.2;
  var PULSE_WEIGHT_MAX    = 2.8;

  var CACHE_MAX_AGE_MS    = 30 * 24 * 60 * 60 * 1000;
  var DS_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  var ISW_CACHE_MAX_AGE_MS= 7 * 24 * 60 * 60 * 1000;

  var CA = {
    map: null,
    layers: {},
    countryShadowLayers: {},
    countryLayers: {},
    overlayLayers: {},
    territoryLayer: null,
    neighborLayer: null,
    neighborGeojsons: {},
    geojsons: {},
    countryGeojsons: {},
    areas: {},
    deepStateGeos: {},
    iswGeos: {},
    isLoaded: false,
    isInitialized: false,
    stats: {},
    panel: null,
    selectedId: null,
    pulseTimer: null,
    pulsePhase: 0,
    isMapActive: true,
    _zoomBound: false,
    _mapClickBound: false,
    _lastOpenPanelTime: 0,
    _snapshotSavedFor: {},
    _currentConflictIso: null,
    _currentConflict: null,
    _consensus: {},
    _consensusBound: false,
    _territoryChanges: {},
    _confirmedOverrides: {}
  };

  var db = null;
  var _initPromise = null;

  function getConflict(iso){ return CONFLICTS[iso] || null; }

  function normalize(str){
    return String(str || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function findProvinceRule(nameOrProvince, rules){
    if(!nameOrProvince || !rules || !rules.length) return null;
    var norm = normalize(nameOrProvince);
    if(!norm) return null;
    for(var i = 0; i < rules.length; i++){
      var entry = rules[i];
      if(!entry || !entry.match) continue;
      for(var j = 0; j < entry.match.length; j++){
        var needle = normalize(entry.match[j]);
        if(!needle) continue;
        if(norm === needle) return entry;
        if(norm.indexOf(needle) !== -1) return entry;
        if(needle.length >= 5 && norm.length >= 5){
          if(norm.substring(0, needle.length) === needle) return entry;
          if(needle.indexOf(norm) !== -1) return entry;
        }
      }
    }
    return null;
  }

  function findDistrictOverride(districtName, overrides){
    if(!districtName || !overrides || !overrides.length) return null;
    var norm = normalize(districtName);
    if(!norm) return null;
    for(var i = 0; i < overrides.length; i++){
      var entry = overrides[i];
      if(!entry || !entry.match) continue;
      for(var j = 0; j < entry.match.length; j++){
        var needle = normalize(entry.match[j]);
        if(!needle) continue;
        if(norm === needle) return entry.controller;
      }
    }
    return null;
  }

  function pointInRing(x, y, ring){
    var inside = false, len = ring.length;
    for(var i = 0, j = len - 1; i < len; j = i++){
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function pointInGeometry(x, y, geometry){
    if(!geometry) return false;
    if(geometry.type === "Polygon"){
      var rings = geometry.coordinates;
      if(!rings || !rings.length) return false;
      if(!pointInRing(x, y, rings[0])) return false;
      for(var h = 1; h < rings.length; h++){
        if(pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }
    if(geometry.type === "MultiPolygon"){
      var polys = geometry.coordinates;
      for(var p = 0; p < polys.length; p++){
        var rings2 = polys[p];
        if(!rings2 || !rings2.length) continue;
        if(!pointInRing(x, y, rings2[0])) continue;
        var inHole = false;
        for(var h2 = 1; h2 < rings2.length; h2++){
          if(pointInRing(x, y, rings2[h2])){ inHole = true; break; }
        }
        if(!inHole) return true;
      }
      return false;
    }
    return false;
  }

  function featureContainsPoint(feature, x, y){
    if(!feature || !feature.geometry) return false;
    return pointInGeometry(x, y, feature.geometry);
  }

  function getCentroid(feature){
    if(!feature || !feature.geometry) return null;
    var geom = feature.geometry, outerRing = null;
    if(geom.type === "Polygon"){ outerRing = geom.coordinates[0]; }
    else if(geom.type === "MultiPolygon"){
      var largest = null, largestSize = 0;
      for(var i = 0; i < geom.coordinates.length; i++){
        var ring = geom.coordinates[i][0];
        if(ring && ring.length > largestSize){ largestSize = ring.length; largest = ring; }
      }
      outerRing = largest;
    }
    if(!outerRing || outerRing.length < 3) return null;
    var area = 0, cx = 0, cy = 0;
    for(var j = 0; j < outerRing.length - 1; j++){
      var x0 = outerRing[j][0], y0 = outerRing[j][1];
      var x1 = outerRing[j+1][0], y1 = outerRing[j+1][1];
      var cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area = area / 2;
    if(Math.abs(area) < 1e-12) return getBBoxCenter(outerRing);
    cx = cx / (6 * area); cy = cy / (6 * area);
    if(!pointInRing(cx, cy, outerRing)) return getBBoxCenter(outerRing);
    return [cx, cy];
  }

  function getBBoxCenter(ring){
    var minX = ring[0][0], maxX = ring[0][0], minY = ring[0][1], maxY = ring[0][1];
    for(var i = 1; i < ring.length; i++){
      if(ring[i][0] < minX) minX = ring[i][0];
      if(ring[i][0] > maxX) maxX = ring[i][0];
      if(ring[i][1] < minY) minY = ring[i][1];
      if(ring[i][1] > maxY) maxY = ring[i][1];
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  function openDB(){
    return new Promise(function(resolve){
      try {
        if(!("indexedDB" in window)){ resolve(null); return; }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e){
          var d = e.target.result;
          if(!d.objectStoreNames.contains(STORE_GEOJSON)){
            d.createObjectStore(STORE_GEOJSON, { keyPath: "k" });
          }
        };
        req.onsuccess = function(e){ db = e.target.result; resolve(db); };
        req.onerror = function(){ resolve(null); };
      } catch(e){ resolve(null); }
    });
  }
  function dbPut(key, value){
    if(!db) return Promise.resolve(false);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readwrite");
        tx.objectStore(STORE_GEOJSON).put({ k: key, v: value, t: Date.now() });
        tx.oncomplete = function(){ res(true); };
        tx.onerror = function(){ res(false); };
      } catch(e){ res(false); }
    });
  }
  function dbGet(key){
    if(!db) return Promise.resolve(null);
    return new Promise(function(res){
      try {
        var tx = db.transaction(STORE_GEOJSON, "readonly");
        var r = tx.objectStore(STORE_GEOJSON).get(key);
        r.onsuccess = function(){ res(r.result || null); };
        r.onerror = function(){ res(null); };
      } catch(e){ res(null); }
    });
  }

  function isValidGeoJSON(json){
    return json && json.features && Array.isArray(json.features) && json.features.length > 0;
  }

  function parseJsonText(text){
    var trimmed = String(text).replace(/^\uFEFF/, "").replace(/^\s+/, "");
    if(trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "[") throw new Error("Geen JSON response");
    try { return JSON.parse(text); }
    catch(e){ throw new Error("JSON parse fout: " + e.message); }
  }

  function fetchRaw(url, timeoutMs){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs || 25000);
    return fetch(url, { signal: ctrl.signal })
      .then(function(r){
        clearTimeout(timer);
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function(text){ clearTimeout(timer); return parseJsonText(text); })
      .catch(function(e){ clearTimeout(timer); throw e; });
  }

  function fetchViaProxy(targetUrl){
    var idx = 0;
    function tryNext(){
      if(idx >= PROXIES.length) return Promise.reject(new Error("Alle proxies faalden"));
      var proxy = PROXIES[idx];
      var fullUrl = proxy + encodeURIComponent(targetUrl);
      idx++;
      return fetchRaw(fullUrl, 50000).catch(function(){ return tryNext(); });
    }
    return tryNext();
  }

  function normalizeArea(json, level){
    json.features.forEach(function(f){
      if(!f || !f.properties) return;
      var p = f.properties;
      var name, provinceName, iso, id;
      if(level === "ADM2"){
        name = p.NAME_2 || p.name_2 || "?";
        provinceName = p.NAME_1 || p.name_1 || null;
        iso = p.GID_2 || "";
        id = (p.GID_2 || name).toString().toLowerCase().replace(/\s+/g, "-");
      } else {
        name = p.NAME_1 || p.VARNAME_1 || p.name_1 || "?";
        provinceName = null;
        iso = p.ISO_1 || p.GID_1 || "";
        id = (p.GID_1 || iso || name).toString().toLowerCase().replace(/\s+/g, "-");
      }
      f.properties = {
        id: id, name: name, provinceName: provinceName, iso: iso,
        controller: null, control_confidence: 0, control_source: null,
        territory_gain: false, territory_gain_from: null,
        attack_intensity: 0, attack_count: 0, last_update: null
      };
    });
    return json;
  }

  function fetchOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.oblastSources) return Promise.reject(new Error("Geen bronnen"));
    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.oblastSources.length) return Promise.reject(lastErr || new Error("Alle bronnen faalden"));
      return fetchViaProxy(conflict.oblastSources[idx])
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige GeoJSON");
          return normalizeArea(json, conflict.level);
        })
        .catch(function(e){ lastErr = e; return trySource(idx+1); });
    }
    return trySource(0);
  }

  function fetchCountry(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.countrySources) return Promise.reject(new Error("Geen country bronnen"));
    var lastErr = null;
    function trySource(idx){
      if(idx >= conflict.countrySources.length) return Promise.reject(lastErr || new Error("Alle country bronnen faalden"));
      return fetchViaProxy(conflict.countrySources[idx])
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige country GeoJSON");
          return json;
        })
        .catch(function(e){ lastErr = e; return trySource(idx+1); });
    }
    return trySource(0);
  }

  function loadOblasts(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict) return Promise.reject(new Error("Geen conflict"));
    var cacheKey = conflict.cacheKeys.oblasts.key;
    var cacheVer = conflict.cacheKeys.oblasts.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        return cached.v.geojson;
      }
      return fetchOblasts(conflictIso).then(function(json){
        return dbPut(cacheKey, { version: cacheVer, t: Date.now(), geojson: json }).then(function(){ return json; });
      });
    });
  }

  function loadCountry(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.countrySources || !conflict.cacheKeys.country) return Promise.resolve(null);
    var cacheKey = conflict.cacheKeys.country.key;
    var cacheVer = conflict.cacheKeys.country.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        return cached.v.geojson;
      }
      return fetchCountry(conflictIso).then(function(json){
        return dbPut(cacheKey, { version: cacheVer, t: Date.now(), geojson: json }).then(function(){ return json; });
      }).catch(function(e){
        LOG("[" + conflictIso + "] Landsgeometrie faalde: " + e.message);
        return null;
      });
    });
  }

  function isLightTheme(){ return document.body.classList.contains("light"); }

  function styleNeighbor(){
    var light = isLightTheme();
    return {
      fillColor: light ? COLORS.neighborFillLight : COLORS.neighborFillDark,
      fillOpacity: light ? 0.85 : 0.70,
      color: light ? COLORS.neighborStrokeLight : COLORS.neighborStrokeDark,
      weight: 0.5, opacity: 1, interactive: false,
      lineCap: "round", lineJoin: "round"
    };
  }

  function loadNeighbor(iso3){
    var cacheKey = "wardesk_neighbor_" + iso3;
    var cacheVer = "v3";
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < CACHE_MAX_AGE_MS &&
         isValidGeoJSON(cached.v.geojson)){
        CA.neighborGeojsons[iso3] = cached.v.geojson;
        return cached.v.geojson;
      }
      var sources = adm0Sources(iso3);
      var lastErr = null;
      function trySource(idx){
        if(idx >= sources.length) return Promise.reject(lastErr || new Error("geen bron"));
        return fetchViaProxy(sources[idx])
          .then(function(json){
            if(!isValidGeoJSON(json)) throw new Error("ongeldig");
            CA.neighborGeojsons[iso3] = json;
            return dbPut(cacheKey, { version: cacheVer, t: Date.now(), geojson: json }).then(function(){ return json; });
          })
          .catch(function(e){ lastErr = e; return trySource(idx + 1); });
      }
      return trySource(0);
    });
  }

  function loadAllNeighbors(){
    var toLoad = NEIGHBOR_COUNTRIES.filter(function(iso3){
      return ACTIVE_CONFLICTS.indexOf(iso3) === -1;
    });
    var batches = [];
    for(var i = 0; i < toLoad.length; i += 4){
      batches.push(toLoad.slice(i, i + 4));
    }
    return batches.reduce(function(chain, batch){
      return chain.then(function(){
        return Promise.all(batch.map(function(iso3){
          return loadNeighbor(iso3).catch(function(){ return null; });
        }));
      });
    }, Promise.resolve()).then(function(){ renderNeighbors(); });
  }

  function renderNeighbors(){
    if(!CA.map) return;
    if(CA.neighborLayer){
      try { CA.map.removeLayer(CA.neighborLayer); } catch(e){}
      CA.neighborLayer = null;
    }
    var allFeatures = [];
    Object.keys(CA.neighborGeojsons).forEach(function(iso3){
      var g = CA.neighborGeojsons[iso3];
      if(g && g.features){
        for(var i = 0; i < g.features.length; i++) allFeatures.push(g.features[i]);
      }
    });
    if(!allFeatures.length) return;
    ensurePanes(CA.map);
    CA.neighborLayer = L.geoJSON(
      { type: "FeatureCollection", features: allFeatures },
      { style: styleNeighbor, pane: PANES.neighbors.name, smoothFactor: 1.8, interactive: false }
    );
    CA.neighborLayer.addTo(CA.map);
  }

  function updateNeighborTheme(){
    if(!CA.neighborLayer) return;
    CA.neighborLayer.eachLayer(function(l){
      try { l.setStyle(styleNeighbor()); } catch(e){}
    });
  }

  function extractDeepStateGeometry(json){
    if(!json) return null;
    if(json.type === "FeatureCollection" && json.features){
      var best = null, bestArea = 0;
      json.features.forEach(function(f){
        if(!f.geometry) return;
        var area = 0;
        if(f.geometry.type === "Polygon") area = f.geometry.coordinates.length;
        else if(f.geometry.type === "MultiPolygon"){
          f.geometry.coordinates.forEach(function(poly){ area += poly.length; });
        }
        if(area > bestArea){ bestArea = area; best = f; }
      });
      return best;
    }
    if(json.type === "Feature" && json.geometry) return json;
    return null;
  }

  function loadDeepState(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.deepStateUrlFn) return Promise.resolve(null);
    var cacheKey = conflict.cacheKeys.deepState.key;
    var cacheVer = conflict.cacheKeys.deepState.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < DS_CACHE_MAX_AGE_MS && cached.v.geojson){
        return cached.v.geojson;
      }
      var url = conflict.deepStateUrlFn();
      return fetchRaw(url, 20000)
        .then(function(json){
          var feat = extractDeepStateGeometry(json);
          if(!feat) throw new Error("Geen polygoon");
          return dbPut(cacheKey, { version: cacheVer, t: Date.now(), geojson: feat }).then(function(){ return feat; });
        })
        .catch(function(e){ return null; });
    });
  }

  function loadISW(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.iswUrl) return Promise.resolve(null);
    var cacheKey = conflict.cacheKeys.isw.key;
    var cacheVer = conflict.cacheKeys.isw.version;
    return dbGet(cacheKey).then(function(cached){
      if(cached && cached.v && cached.v.version === cacheVer &&
         (Date.now() - cached.v.t) < ISW_CACHE_MAX_AGE_MS && isValidGeoJSON(cached.v.geojson)){
        return cached.v.geojson;
      }
      return fetchViaProxy(conflict.iswUrl)
        .then(function(json){
          if(!isValidGeoJSON(json)) throw new Error("Ongeldige ISW GeoJSON");
          return dbPut(cacheKey, { version: cacheVer, t: Date.now(), geojson: json }).then(function(){ return json; });
        })
        .catch(function(e){ return null; });
    });
  }

  function calculateControllers(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;

    var hasDS = !!CA.deepStateGeos[conflictIso];
    var hasISW = !!CA.iswGeos[conflictIso] && CA.iswGeos[conflictIso].features && CA.iswGeos[conflictIso].features.length > 0;
    var hasInheritance = !!conflict.provinceRules;
    var isADM1 = conflict.level === "ADM1";

    var stats = {};
    var partyNames = Object.keys(conflict.parties);
    partyNames.forEach(function(p){ stats[p] = 0; });
    stats.total = 0; stats.unknown = 0;

    geojson.features.forEach(function(feature){
      if(!feature || !feature.properties) return;
      stats.total++;
      var props = feature.properties;

      if(hasInheritance){
        var districtOverride = findDistrictOverride(props.name, conflict.districtOverrides);
        if(districtOverride){
          props.controller = districtOverride;
          props.control_confidence = 0.85;
          props.control_source = "Handmatig (district)";
          props.last_update = new Date().toISOString();
          if(stats[districtOverride] !== undefined) stats[districtOverride]++;
          return;
        }
        var matchTarget = isADM1 ? props.name : props.provinceName;
        var provinceRule = findProvinceRule(matchTarget, conflict.provinceRules);
        if(provinceRule){
          props.controller = provinceRule.controller;
          props.control_confidence = 0.8;
          props.last_update = new Date().toISOString();
          if(stats[provinceRule.controller] !== undefined) stats[provinceRule.controller]++;
          props.control_source = "Handmatig (provincie)";
          return;
        }
        props.controller = null;
        props.control_source = "Onbekend";
        stats.unknown++;
        return;
      }

      var centroid = getCentroid(feature);
      if(!centroid){ props.controller = null; stats.unknown++; return; }
      var cx = centroid[0], cy = centroid[1];
      var inOccupied = false;
      var source = null;
      if(hasDS){
        try {
          if(featureContainsPoint(CA.deepStateGeos[conflictIso], cx, cy)){
            inOccupied = true; source = "DeepState";
          }
        } catch(e){}
      }
      if(!inOccupied && hasISW){
        for(var i = 0; i < CA.iswGeos[conflictIso].features.length; i++){
          if(featureContainsPoint(CA.iswGeos[conflictIso].features[i], cx, cy)){
            inOccupied = true; source = "ISW"; break;
          }
        }
      }
      var controller = inOccupied ? "Rusland" : "Oekraïne";
      props.controller = controller;
      props.control_confidence = 0.7;
      props.last_update = new Date().toISOString();
      props.control_source = controller === "Rusland" ? (source || "Onbekend")
        : (hasDS ? "DeepState" : (hasISW ? "ISW" : "Onbekend"));
      if(stats[controller] !== undefined) stats[controller]++;
    });

    CA.stats[conflictIso] = stats;
  }

  function calculateAttackIntensity(conflictIso){
    var geojson = CA.geojsons[conflictIso];
    if(!geojson || !geojson.features) return;
    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){}
    if(!events.length) return;

    geojson.features.forEach(function(f){
      if(f.properties){ f.properties.attack_intensity = 0; f.properties.attack_count = 0; }
    });

    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var countByArea = {};

    events.forEach(function(ev){
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") return;
      if(ev.category !== "militair" && ev.category !== "crime") return;
      if(ev.countsForHeat === false) return;
      if(new Date(ev.date).getTime() < periodAgo) return;
      for(var i = 0; i < geojson.features.length; i++){
        var f = geojson.features[i];
        if(featureContainsPoint(f, ev.lng, ev.lat)){
          var id = f.properties.id;
          countByArea[id] = (countByArea[id] || 0) + 1;
          break;
        }
      }
    });

    geojson.features.forEach(function(f){
      if(!f.properties) return;
      var count = countByArea[f.properties.id] || 0;
      var intensity = Math.min(1, Math.log(1 + count) / Math.log(21));
      f.properties.attack_intensity = Math.round(intensity * 100) / 100;
      f.properties.attack_count = count;
    });
  }

  function hasActiveAreas(){
    for(var c = 0; c < ACTIVE_CONFLICTS.length; c++){
      var geojson = CA.geojsons[ACTIVE_CONFLICTS[c]];
      if(!geojson || !geojson.features) continue;
      for(var i = 0; i < geojson.features.length; i++){
        var p = geojson.features[i].properties;
        if(p && p.attack_intensity >= PULSE_MIN_INTENSITY) return true;
      }
    }
    return false;
  }

  function hashColor(c){
    return String(c || "").replace(/[^a-z0-9]/gi, "").slice(0, 10);
  }

  function ensureContestedPattern(colorA, colorB){
    var id = "wdContested-" + hashColor(colorA) + "-" + hashColor(colorB);
    if(document.getElementById(id)) return id;
    var svg = document.getElementById("wdPatternSvg");
    if(!svg){
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "wdPatternSvg";
      svg.setAttribute("aria-hidden", "true");
      svg.style.position = "absolute";
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.pointerEvents = "none";
      var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    var defs = svg.querySelector("defs");
    var pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    pattern.setAttribute("id", id);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "10");
    pattern.setAttribute("height", "10");
    pattern.setAttribute("patternTransform", "rotate(45)");
    var rectA = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectA.setAttribute("width", "10"); rectA.setAttribute("height", "10");
    rectA.setAttribute("fill", colorA); rectA.setAttribute("opacity", "0.75");
    var rectB = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rectB.setAttribute("width", "5"); rectB.setAttribute("height", "10");
    rectB.setAttribute("fill", colorB); rectB.setAttribute("opacity", "0.75");
    pattern.appendChild(rectA); pattern.appendChild(rectB);
    defs.appendChild(pattern);
    return id;
  }

  function getConsensusForFeature(feature, iso3){
    if(!CA._consensus || !feature || !feature.properties) return null;
    var props = feature.properties;
    if(props.provinceName){
      var key1 = iso3 + "|" + props.provinceName;
      if(CA._consensus[key1]) return CA._consensus[key1];
    }
    if(props.name){
      var key2 = iso3 + "|" + props.name;
      if(CA._consensus[key2]) return CA._consensus[key2];
    }
    var key3 = iso3 + "|*";
    if(CA._consensus[key3]) return CA._consensus[key3];
    return null;
  }

  /* v11.14: check confirmed override voor een feature */
  function getConfirmedOverrideFor(feature, iso3){
    if(!feature || !feature.properties) return null;
    var props = feature.properties;
    if(props.provinceName){
      var key1 = iso3 + "|" + props.provinceName;
      if(CA._confirmedOverrides[key1]) return CA._confirmedOverrides[key1];
    }
    if(props.name){
      var key2 = iso3 + "|" + props.name;
      if(CA._confirmedOverrides[key2]) return CA._confirmedOverrides[key2];
    }
    var key3 = iso3 + "|*";
    if(CA._confirmedOverrides[key3]) return CA._confirmedOverrides[key3];
    return null;
  }

  function applyConsensusToMap(){
    if(!CA.map || !CA._consensus) return;
    ACTIVE_CONFLICTS.forEach(function(iso){
      var layer = CA.layers[iso];
      if(!layer) return;
      CA._currentConflictIso = iso;
      CA._currentConflict = getConflict(iso);
      layer.eachLayer(function(l){
        if(!l.feature || !l.feature.properties) return;
        try { l.setStyle(styleProvince(l.feature)); } catch(e){}
        var cons = getConsensusForFeature(l.feature, iso);
        if(cons && cons.contested && cons.contestedActors && cons.contestedActors.length >= 2){
          applyContestedPatternToLayer(l, cons, iso);
        }
      });
    });
  }

  function applyContestedPatternToLayer(layer, consensus, iso3){
    if(!layer || !layer._path) return;
    var conflict = getConflict(iso3);
    if(!conflict || !conflict.parties) return;
    var actorA = consensus.contestedActors[0].actor;
    var actorB = consensus.contestedActors[1].actor;
    var colorA = (conflict.parties[actorA] && conflict.parties[actorA].fill) || "#2A6FDB";
    var colorB = (conflict.parties[actorB] && conflict.parties[actorB].fill) || "#C62828";
    var patternId = ensureContestedPattern(colorA, colorB);
    try {
      layer._path.setAttribute("fill", "url(#" + patternId + ")");
      layer._path.setAttribute("fill-opacity", "1");
    } catch(e){}
  }

  /* ============================================================
     v11.14: styleProvince — fill = controller OF confirmed override
     ============================================================ */
  function styleProvince(feature){
    var props = (feature && feature.properties) || {};
    var conflict = CA._currentConflict;
    var z = CA.map ? CA.map.getZoom() : 6;
    var baseWeight = provinceWeight(z);
    var baseOpacity = provinceOpacity(z);

    /* v11.14: confirmed override (AI, 3 dagen) heeft voorrang op
       provinceRules, maar niet op DeepState/ISW (die gebruiken geen
       provinceRules en hebben sowieso props.controller uit centroid) */
    var override = getConfirmedOverrideFor(feature, CA._currentConflictIso);

    var fillActor = props.controller;
    var fillColor = "transparent";

    if(override && conflict && conflict.parties[override]){
      fillActor = override;
      fillColor = conflict.parties[override].fill;
    } else if(props.controller && conflict && conflict.parties[props.controller]){
      fillColor = conflict.parties[props.controller].fill;
    }

    var result = {
      fillColor: fillColor,
      fillOpacity: fillActor ? FILL_OPACITY : 0,
      color: COLORS.provinceBorder,
      weight: baseWeight,
      opacity: baseOpacity,
      dashArray: null,
      lineCap: "round",
      lineJoin: "round",
      interactive: true
    };

    /* v11.14: override actief → dikkere rand (toon dat dit AI-bevestigd is) */
    if(override){
      result.weight = Math.max(baseWeight, 1.3);
      result.opacity = Math.max(baseOpacity, 0.5);
    }

    /* Rand = consensus-activiteit (overlay, altijd) */
    var consensus = getConsensusForFeature(feature, CA._currentConflictIso);
    if(consensus && consensus.dominantActor && conflict && conflict.parties){
      var actorColor = conflict.parties[consensus.dominantActor]
        ? conflict.parties[consensus.dominantActor].fill : null;
      if(actorColor){
        result.color = actorColor;
        result.weight = Math.max(baseWeight, 1.5);
        result.opacity = 0.9;
        if(consensus.contested){
          result.dashArray = "4 2";
          result.weight = Math.max(baseWeight, 2.0);
        }
      }
    }

    return result;
  }

  function styleCountryShadow(){
    var z = CA.map ? CA.map.getZoom() : 6;
    return { fillColor: "transparent", fillOpacity: 0, color: COLORS.countryShadow, weight: countryShadowWeight(z), opacity: 0.85, interactive: false, lineCap: "round", lineJoin: "round" };
  }
  function styleCountry(){
    var z = CA.map ? CA.map.getZoom() : 6;
    return { fillColor: "transparent", fillOpacity: 0, color: COLORS.countryBorder, weight: countryWhiteWeight(z), opacity: 0.85, interactive: false, lineCap: "round", lineJoin: "round" };
  }

  function updateBorderWeights(){
    if(!CA.map) return;
    var z = CA.map.getZoom();
    ACTIVE_CONFLICTS.forEach(function(iso){
      var layer = CA.layers[iso];
      if(layer){
        CA._currentConflictIso = iso;
        CA._currentConflict = getConflict(iso);
        layer.eachLayer(function(l){
          if(!l.feature) return;
          if(l._caHover) return;
          try { l.setStyle(styleProvince(l.feature)); } catch(e){}
          var cons = getConsensusForFeature(l.feature, iso);
          if(cons && cons.contested) applyContestedPatternToLayer(l, cons, iso);
        });
      }
      var shadow = CA.countryShadowLayers[iso];
      if(shadow){
        shadow.eachLayer(function(l){ try { l.setStyle({ weight: countryShadowWeight(z) }); } catch(e){} });
      }
      var country = CA.countryLayers[iso];
      if(country){
        country.eachLayer(function(l){ try { l.setStyle({ weight: countryWhiteWeight(z) }); } catch(e){} });
      }
    });
  }

  function bindZoomListener(){
    if(!CA.map || CA._zoomBound) return;
    CA._zoomBound = true;
    CA.map.on("zoomend", updateBorderWeights);
  }
  function unbindZoomListener(){
    if(!CA.map || !CA._zoomBound) return;
    try { CA.map.off("zoomend", updateBorderWeights); } catch(e){}
    CA._zoomBound = false;
  }

  function ensurePanes(map){
    Object.keys(PANES).forEach(function(key){
      var p = PANES[key];
      if(map.getPane(p.name)) return;
      map.createPane(p.name);
      map.getPane(p.name).style.zIndex = p.z;
      map.getPane(p.name).style.pointerEvents = "auto";
    });
  }

  function renderOverlayPolygons(conflictIso){
    var conflict = getConflict(conflictIso);
    if(!conflict || !conflict.overlayPolygons || !conflict.overlayPolygons.length) return;
    if(!CA.map) return;
    if(CA.overlayLayers[conflictIso]){
      try{ CA.map.removeLayer(CA.overlayLayers[conflictIso]); }catch(e){}
    }
    var overlayGroup = L.layerGroup();
    conflict.overlayPolygons.forEach(function(overlay){
      var party = conflict.parties[overlay.controller];
      if(!party) return;
      var poly = L.polygon(overlay.coords, {
        pane: PANES.overlay.name,
        color: COLORS.countryBorder, fillColor: party.fill,
        fillOpacity: OVERLAY_FILL_OPACITY, weight: OVERLAY_BORDER_WEIGHT,
        opacity: 0.9, interactive: true,
        lineCap: "round", lineJoin: "round"
      });
      poly.bindTooltip('<b>' + overlay.name + '</b><br>' + overlay.controller, { direction: "top", className: "wm-tooltip", offset: [0, -6] });
      poly.on("click", function(e){
        if(L.DomEvent) L.DomEvent.stopPropagation(e);
        var syntheticArea = {
          id: "overlay-" + conflictIso, name: overlay.name, provinceName: null,
          controller: overlay.controller, layer: poly,
          feature: { properties: { id: "overlay-" + conflictIso, name: overlay.name, provinceName: null, controller: overlay.controller, control_confidence: 0.9, control_source: "Handmatig (overlay)", attack_intensity: 0, attack_count: 0 }, geometry: { type: "Polygon", coordinates: [overlay.coords] } }
        };
        openPanel(syntheticArea, conflictIso);
      });
      overlayGroup.addLayer(poly);
    });
    overlayGroup.addTo(CA.map);
    CA.overlayLayers[conflictIso] = overlayGroup;
  }

  function renderTerritoryChanges(changes){
    if (!CA.map) return;
    if (!changes || typeof changes !== "object") return;
    if (CA.territoryLayer) {
      try { CA.map.removeLayer(CA.territoryLayer); } catch(e){}
      CA.territoryLayer = null;
    }
    var group = L.layerGroup();
    var count = 0;

    Object.keys(changes).forEach(function(gid){
      var c = changes[gid];
      if (!c || !c.iso3) return;
      var iso3 = c.iso3;
      var conflict = getConflict(iso3);
      if (!conflict) return;

      var layer = CA.layers[iso3];
      if (!layer) return;

      layer.eachLayer(function(l){
        if (!l.feature || !l.feature.properties) return;
        var p = l.feature.properties;
        var matches = false;
        if (c.admin1 && p.name && p.name.toLowerCase().indexOf(c.admin1.toLowerCase()) !== -1) matches = true;
        if (c.admin1 && p.provinceName && p.provinceName.toLowerCase().indexOf(c.admin1.toLowerCase()) !== -1) matches = true;
        if (!matches && !c.admin1) matches = true;
        if (!matches) return;

        var center = getCentroid(l.feature);
        if (!center) return;
        var lat = center[1], lng = center[0];

        var arrow = "";
        var color = COLORS.territoryContested;
        if (c.type === "control-change"){
          color = c.gainFor ? COLORS.territoryGain : COLORS.territoryLoss;
          arrow = c.gainFor ? "▲" : "▼";
        } else if (c.type === "became-contested"){
          color = COLORS.territoryContested;
          arrow = "⚔";
        } else if (c.type === "resolved"){
          color = COLORS.territoryGain;
          arrow = "✓";
        } else if (c.type === "new"){
          color = "#60a5fa";
          arrow = "＋";
        }

        var icon = L.divIcon({
          className: "ca-territory-marker",
          html: '<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:' + color + ';color:#fff;font-size:13px;font-weight:800;border:2px solid #fff;box-shadow:0 0 8px ' + color + ';">' + arrow + '</div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        var marker = L.marker([lat, lng], { icon: icon, pane: PANES.territory.name });
        marker.bindTooltip('<b>' + (c.label || gid) + '</b>', { direction: "top", className: "wm-tooltip" });
        group.addLayer(marker);
        count++;
      });
    });

    if (count > 0){
      group.addTo(CA.map);
      CA.territoryLayer = group;
      LOG("Territory: " + count + " markers getekend");
    }
  }

  var _pulseRetryTimer = null;
  var _pulseEmptyChecks = 0;

  function startPulse(){
    stopPulse();
    if(!CA.isMapActive) return;
    if(!hasActiveAreas()){
      _pulseEmptyChecks++;
      var wait = _pulseEmptyChecks < 3 ? 5000 : 30000;
      _pulseRetryTimer = setTimeout(function(){
        _pulseRetryTimer = null;
        if(CA.isMapActive && CA.isInitialized) startPulse();
      }, wait);
      return;
    }
    _pulseEmptyChecks = 0;
    CA.pulseTimer = setInterval(function(){
      if(!CA.isMapActive) return;
      CA.pulsePhase = (CA.pulsePhase + 1) % 2;
      var growing = CA.pulsePhase === 0;
      ACTIVE_CONFLICTS.forEach(function(iso){
        var layer = CA.layers[iso];
        if(!layer) return;
        var z = CA.map ? CA.map.getZoom() : 6;
        var baseW = provinceWeight(z);
        layer.eachLayer(function(l){
          if(!l.feature || !l.feature.properties) return;
          var p = l.feature.properties;
          if(!p.attack_intensity || p.attack_intensity < PULSE_MIN_INTENSITY) return;
          if(l._caHover) return;
          var extra = (PULSE_WEIGHT_MAX - PULSE_WEIGHT_MIN) * p.attack_intensity;
          var newWeight = growing ? (baseW + extra) : baseW;
          try { l.setStyle({ weight: newWeight, opacity: growing ? 1.0 : 0.9, color: COLORS.pulse }); } catch(e){}
        });
      });
    }, PULSE_INTERVAL_MS);
  }

  function stopPulse(){
    if(CA.pulseTimer){ clearInterval(CA.pulseTimer); CA.pulseTimer = null; }
    if(_pulseRetryTimer){ clearTimeout(_pulseRetryTimer); _pulseRetryTimer = null; }
  }

  function injectPanelStyles(){
    if(document.getElementById("caPanelFallbackStyles")) return;
    var s = document.createElement("style");
    s.id = "caPanelFallbackStyles";
    s.textContent =
      "#caAreaPanel.wm-country-panel{position:fixed!important;left:0!important;right:0!important;bottom:0!important;background:#111b2d!important;color:#e6ebf5!important;border-top:1px solid rgba(224,168,87,.4)!important;border-top-left-radius:18px!important;border-top-right-radius:18px!important;max-height:75vh!important;overflow-y:auto!important;z-index:99999!important;transform:translateY(100%)!important;transition:transform .3s cubic-bezier(.2,.9,.3,1)!important;box-shadow:0 -10px 40px rgba(0,0,0,.7)!important;padding-bottom:env(safe-area-inset-bottom,0)!important;display:block!important;visibility:visible!important;pointer-events:auto!important;}" +
      "#caAreaPanel.wm-country-panel.show{transform:translateY(0)!important;}" +
      "#caAreaPanel .wm-panel-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:.9rem 1rem .7rem!important;border-bottom:1px solid rgba(255,255,255,.08)!important;position:sticky!important;top:0!important;background:#111b2d!important;z-index:2!important;}" +
      "#caAreaPanel .wm-panel-title{font-family:'Playfair Display',serif!important;font-size:1.1rem!important;font-weight:700!important;color:#e6ebf5!important;margin:0!important;}" +
      "#caAreaPanel .wm-panel-close{width:32px!important;height:32px!important;border-radius:50%!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.12)!important;color:#8a94a8!important;font-size:.9rem!important;display:grid!important;place-items:center!important;cursor:pointer!important;font-family:inherit!important;padding:0!important;}" +
      "#caAreaPanel .wm-panel-stats{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:.5rem!important;padding:.75rem 1rem!important;border-bottom:1px solid rgba(255,255,255,.08)!important;}" +
      "#caAreaPanel .wm-panel-stat{text-align:center!important;padding:.5rem .3rem!important;background:rgba(255,255,255,.04)!important;border-radius:8px!important;border:1px solid rgba(255,255,255,.06)!important;}" +
      "#caAreaPanel .wm-panel-stat-val{font-size:1.2rem!important;font-weight:800!important;color:#e0a857!important;line-height:1!important;}" +
      "#caAreaPanel .wm-panel-stat-lbl{font-size:.6rem!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#6b7a93!important;margin-top:.2rem!important;font-weight:700!important;}" +
      "#caAreaPanel .wm-panel-stat.conf-high .wm-panel-stat-val{color:#10b981!important;}" +
      "#caAreaPanel .wm-panel-stat.conf-med .wm-panel-stat-val{color:#f59e0b!important;}" +
      "#caAreaPanel .wm-panel-stat.conf-low .wm-panel-stat-val{color:#f87171!important;}" +
      "#caAreaPanel .wm-panel-conf-detail{grid-column:1/-1!important;font-size:.7rem!important;color:#6b7a93!important;text-align:center!important;padding:.2rem 0 .1rem!important;}" +
      "#caAreaPanel .wm-panel-event{padding:.7rem 1rem!important;border-bottom:1px solid rgba(255,255,255,.05)!important;cursor:pointer!important;}" +
      "#caAreaPanel .wm-panel-event:last-child{border-bottom:none!important;}" +
      "#caAreaPanel .wm-panel-event-title{font-size:.78rem!important;font-weight:600!important;line-height:1.3!important;color:#e6ebf5!important;margin-bottom:.25rem!important;}" +
      "#caAreaPanel .wm-panel-event-meta{display:flex!important;gap:.4rem!important;align-items:center!important;font-size:.62rem!important;color:#6b7a93!important;flex-wrap:wrap!important;}" +
      "#caAreaPanel .wm-panel-event-src{color:#e0a857!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.03em!important;}" +
      "#caAreaPanel .wm-panel-event-dot{opacity:.4!important;}" +
      "#caAreaPanel .wm-panel-event-sub{color:#6b7a93!important;opacity:.8!important;}" +
      "#caAreaPanel .wm-ev-physical{background:rgba(230,57,80,.15)!important;color:#ff8090!important;padding:.1rem .4rem!important;border-radius:5px!important;font-weight:700!important;font-size:.58rem!important;text-transform:uppercase!important;letter-spacing:.03em!important;}" +
      "#caAreaPanel .wm-ev-political{background:rgba(107,122,147,.15)!important;color:#a3adc0!important;padding:.1rem .4rem!important;border-radius:5px!important;font-weight:700!important;font-size:.58rem!important;text-transform:uppercase!important;letter-spacing:.03em!important;}" +
      "#caAreaPanel .wm-panel-empty{padding:1.5rem 1rem!important;text-align:center!important;color:#6b7a93!important;font-size:.78rem!important;}" +
      "#caAreaPanel .ca-event-dim{opacity:.55!important;font-style:italic!important;}";
    document.head.appendChild(s);
  }

  function ensurePanel(){
    if(CA.panel) return CA.panel;
    injectPanelStyles();
    var panel = document.createElement("div");
    panel.id = "caAreaPanel";
    panel.className = "wm-country-panel";
    panel.innerHTML =
      '<div class="wm-panel-head"><div class="wm-panel-title" id="caPanelTitle">—</div>' +
      '<button class="wm-panel-close" id="caPanelClose" aria-label="Sluiten">✕</button></div>' +
      '<div class="wm-panel-stats" id="caPanelStats"></div>' +
      '<div class="wm-panel-events" id="caPanelEvents"></div>';
    document.body.appendChild(panel);
    CA.panel = panel;
    panel.querySelector("#caPanelClose").addEventListener("click", closePanel);
    panel.addEventListener("click", function(e){ if(e.target === panel) closePanel(); });
    LOG("Panel aangemaakt");
    return panel;
  }

  function getEventsForArea(area){
    var events = [];
    try {
      if(window.MAPAPI && window.MAPAPI.state && Array.isArray(window.MAPAPI.state.events)){
        events = window.MAPAPI.state.events;
      }
    } catch(e){}
    if(!events.length) return [];
    var periodAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var filtered = [];
    for(var i = 0; i < events.length; i++){
      var ev = events[i];
      if(!ev || typeof ev.lat !== "number" || typeof ev.lng !== "number") continue;
      if(ev.category !== "militair" && ev.category !== "crime") continue;
      if(new Date(ev.date).getTime() < periodAgo) continue;
      if(featureContainsPoint(area.feature, ev.lng, ev.lat)) filtered.push(ev);
    }
    filtered.sort(function(a, b){ return new Date(b.date).getTime() - new Date(a.date).getTime(); });
    return filtered.slice(0, 15);
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function timeAgoShort(d){
    var t = new Date(d).getTime();
    if(isNaN(t)) return "";
    var diff = (Date.now() - t) / 1000;
    if(diff < 60) return "nu";
    if(diff < 3600) return Math.floor(diff / 60) + "m";
    if(diff < 86400) return Math.floor(diff / 3600) + "u";
    return Math.floor(diff / 86400) + "d";
  }

  function openPanel(area, conflictIso){
    if (CA._lastOpenPanelTime && Date.now() - CA._lastOpenPanelTime < 500) return;
    CA._lastOpenPanelTime = Date.now();

    try {
      var wmPanel = document.getElementById("wmCountryPanel");
      if (wmPanel && wmPanel.classList.contains("show")){
        wmPanel.classList.remove("show");
      }
    } catch(e){}

    LOG("openPanel aangeroepen voor: " + (area && area.feature && area.feature.properties && area.feature.properties.name));
    try {
      var panel = ensurePanel();
      var props = area.feature.properties;
      panel.querySelector("#caPanelTitle").textContent = props.name || "?";

      var statsEl = panel.querySelector("#caPanelStats");
      var ctrlLabel = props.controller || "Onbekend";

      /* v11.14: override heeft voorrang op weergave controller-label */
      var override = getConfirmedOverrideFor(area.feature, conflictIso);
      if(override) ctrlLabel = override;

      var ctrlClass = "conf-med";
      if(ctrlLabel === "Rusland" || ctrlLabel === "Israël" || ctrlLabel === "Houthi's" || ctrlLabel === "RSF" || ctrlLabel === "JNIM (Jihadisten)" || ctrlLabel === "M23/AFC") ctrlClass = "conf-low";
      else if(ctrlLabel === "Oekraïne" || ctrlLabel === "Regering" || ctrlLabel === "Libanese staat" || ctrlLabel === "Saoedi-Arabië" || ctrlLabel === "Palestina" || ctrlLabel === "Federale regering" || ctrlLabel === "Junta (Regering)" || ctrlLabel === "Pakistan (Regering)") ctrlClass = "conf-high";

      var events = getEventsForArea(area);
      var physicalCount = 0;
      for(var i = 0; i < events.length; i++){
        if(events[i].countsForHeat !== false) physicalCount++;
      }

      var provinceLine = "";
      if(props.provinceName){
        provinceLine = '<div class="wm-panel-conf-detail">Provincie: ' + escapeHtml(props.provinceName) + '</div>';
      }

      /* v11.14: override-regel */
      var overrideLine = "";
      if(override){
        overrideLine = '<div class="wm-panel-conf-detail" style="color:#22c55e;font-weight:700">' +
          '✅ AI-bevestigd: <b>' + escapeHtml(override) + '</b> (3 dagen stabiel)' +
        '</div>';
      }

      /* Consensus-rand info (alleen bij voldoende bewijs) */
      var consensusLine = "";
      var consensus = getConsensusForFeature(area.feature, conflictIso);
      if(consensus){
        var conf = consensus.confidence || 0;
        var srcCount = consensus.sourceCount || 0;

        if(conf >= 0.5 && srcCount >= 2){
          var pct = Math.round((consensus.consensusStrength || 0) * 100);
          var confPct = Math.round(conf * 100);
          var contested = consensus.contested ? " · ⚔️ CONTESTED" : "";
          consensusLine = '<div class="wm-panel-conf-detail" style="color:#a855f7;font-weight:700">' +
            '🤖 AI-signaal: ' + escapeHtml(consensus.dominantActor) + ' (' + pct + '%' + contested + ')' +
            '<br><span style="font-weight:400;opacity:.8">' +
            confPct + '% confidence · ' + srcCount + ' bronnen · ' +
            (consensus.originCount || 0) + ' landen</span></div>';
        } else {
          consensusLine = '<div class="wm-panel-conf-detail" style="color:#6b7a93;font-style:italic">' +
            '🤖 Onvoldoende AI-bewijs (' + srcCount + ' bron' + (srcCount === 1 ? '' : 'nen') + ', ' +
            Math.round(conf * 100) + '% confidence)</div>';
        }
      }

      var territoryLine = "";
      var change = CA._territoryChanges[conflictIso + "|" + (props.provinceName || props.name || "*")];
      if (change){
        var icon = change.type === "control-change" ? (change.gainFor ? "🟢" : "🔴") :
                   change.type === "became-contested" ? "🟣" :
                   change.type === "resolved" ? "✅" : "🔵";
        territoryLine = '<div class="wm-panel-conf-detail" style="color:#e0a857;font-weight:700">' + icon + ' ' + escapeHtml(change.label || change.type) + '</div>';
      }

      statsEl.innerHTML =
        '<div class="wm-panel-stat ' + ctrlClass + '"><div class="wm-panel-stat-val">' + escapeHtml(ctrlLabel) + '</div><div class="wm-panel-stat-lbl">Controller</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + events.length + '</div><div class="wm-panel-stat-lbl">Events (7d)</div></div>' +
        '<div class="wm-panel-stat"><div class="wm-panel-stat-val">' + physicalCount + '</div><div class="wm-panel-stat-lbl">Fysiek</div></div>' +
        overrideLine + consensusLine + territoryLine +
        '<div class="wm-panel-conf-detail">Bron: ' + escapeHtml(props.control_source || "—") +
          ' · Confidence: ' + Math.round((props.control_confidence || 0) * 100) + '%</div>' +
        provinceLine;

      var evEl = panel.querySelector("#caPanelEvents");
      if(!events.length){
        evEl.innerHTML = '<div class="wm-panel-empty">Geen militaire events in dit gebied</div>';
      } else {
        evEl.innerHTML = events.map(function(ev){
          var physical = ev.countsForHeat !== false;
          var actionTag = physical ? "Fysiek" : "Niet-fysiek";
          var actionClass = physical ? "wm-ev-physical" : "wm-ev-political";
          var dimClass = physical ? "" : " ca-event-dim";
          return '<div class="wm-panel-event' + dimClass + '">' +
            '<div class="wm-panel-event-title">' + escapeHtml(ev.title || "?") + '</div>' +
            '<div class="wm-panel-event-meta">' +
              '<span class="wm-panel-event-src">' + escapeHtml(ev.source || "?") + '</span>' +
              '<span class="wm-panel-event-dot">·</span>' +
              '<span>' + timeAgoShort(ev.date) + '</span>' +
              '<span class="' + actionClass + '">' + actionTag + '</span>' +
              '<span class="wm-panel-event-sub">' + escapeHtml(ev.subtype || "—") + '</span>' +
            '</div>' +
          '</div>';
        }).join("");
      }

      CA.selectedId = props.id;
      requestAnimationFrame(function(){ panel.classList.add("show"); });
      LOG("Panel getoond voor " + (props.name || "?") + (override ? " (override: " + override + ")" : ""));
    } catch(err) {
      LOG("FOUT in openPanel: " + (err.message || "?"));
      try { console.error("[openPanel]", err); } catch(e){}
    }
  }

  function closePanel(){
    if(CA.panel) CA.panel.classList.remove("show");
    CA.selectedId = null;
  }

  function bindMapClickFallback(){
    if (!CA.map) return;
    if (CA._mapClickBound) return;
    CA._mapClickBound = true;

    CA.map.on("click", function(e){
      try {
        if (CA._lastOpenPanelTime && Date.now() - CA._lastOpenPanelTime < 800) return;

        var zoom = CA.map.getZoom();
        if (zoom < 4) return;

        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        try {
          if (CA.map._popup && CA.map._popup.isOpen && CA.map._popup.isOpen()) return;
        } catch(err){}

        for (var i = 0; i < ACTIVE_CONFLICTS.length; i++){
          var iso = ACTIVE_CONFLICTS[i];
          var geojson = CA.geojsons[iso];
          if (!geojson || !geojson.features) continue;

          for (var j = 0; j < geojson.features.length; j++){
            var f = geojson.features[j];
            if (!f || !f.geometry) continue;
            if (featureContainsPoint(f, lng, lat)){
              var area = {
                id: f.properties.id,
                name: f.properties.name,
                provinceName: f.properties.provinceName,
                controller: f.properties.controller,
                feature: f
              };
              LOG("Map-click fallback → " + iso + " · " + (f.properties.name || "?"));
              openPanel(area, iso);
              return;
            }
          }
        }
      } catch(err){
        LOG("Map-click fallback fout: " + (err.message || "?"));
      }
    });

    LOG("Map-level click fallback gebonden");
  }

  function onEachAreaFor(conflictIso){
    return function(feature, layer){
      layer.on({
        mouseover: function(e){
          var l = e.target;
          l._caHover = true;
          var conflict = getConflict(conflictIso);
          var props = feature.properties;
          var col = props.controller && conflict.parties[props.controller]
                    ? conflict.parties[props.controller].color : "#ffffff";
          try {
            l.setStyle({ weight: BORDER_WEIGHT_HOVER, color: col, opacity: 1.0, fillOpacity: Math.min(0.72, FILL_OPACITY + 0.15) });
          } catch(e2){}
        },
        mouseout: function(e){
          var l = e.target;
          l._caHover = false;
          CA._currentConflictIso = conflictIso;
          CA._currentConflict = getConflict(conflictIso);
          try { l.setStyle(styleProvince(feature)); } catch(e2){}
          var cons = getConsensusForFeature(feature, conflictIso);
          if(cons && cons.contested) applyContestedPatternToLayer(l, cons, conflictIso);
        },
        click: function(e){
          try {
            if(L.DomEvent) L.DomEvent.stopPropagation(e);
            var areasArr = CA.areas[conflictIso] || [];
            var area = null;
            for(var i = 0; i < areasArr.length; i++){
              if(areasArr[i].layer === e.target){ area = areasArr[i]; break; }
            }
            if(!area && feature && feature.properties) {
              area = {
                id: feature.properties.id,
                name: feature.properties.name,
                provinceName: feature.properties.provinceName,
                controller: feature.properties.controller,
                layer: e.target,
                feature: feature
              };
            }
            if(area) openPanel(area, conflictIso);
          } catch(err) {
            LOG("FOUT in click handler: " + (err.message || "?"));
          }
        },
        add: function(e){
          var l = e.target;
          var cons = getConsensusForFeature(l.feature, conflictIso);
          if(cons && cons.contested && cons.contestedActors && cons.contestedActors.length >= 2){
            applyContestedPatternToLayer(l, cons, conflictIso);
          }
        }
      });
    };
  }

  function injectAreaStyles(){
    if(document.getElementById("caAreaStyles")) return;
    var s = document.createElement("style");
    s.id = "caAreaStyles";
    s.textContent = ".leaflet-container .ca-pane-province path{transition:stroke .15s, stroke-width .15s;cursor:pointer!important;}";
    document.head.appendChild(s);
  }

  function renderLayer(conflictIso){
    var conflict = getConflict(conflictIso);
    var geojson = CA.geojsons[conflictIso];
    if(!CA.map || !geojson || !conflict) return;
    ensurePanes(CA.map);

    ["layers", "countryShadowLayers", "countryLayers"].forEach(function(bucket){
      if(CA[bucket][conflictIso]){
        try{ CA.map.removeLayer(CA[bucket][conflictIso]); }catch(e){}
      }
    });

    injectAreaStyles();
    CA._currentConflictIso = conflictIso;
    CA._currentConflict = conflict;

    CA.layers[conflictIso] = L.geoJSON(geojson, {
      style: styleProvince,
      pane: PANES.province.name,
      smoothFactor: 1.5,
      onEachFeature: onEachAreaFor(conflictIso)
    });
    CA.layers[conflictIso].addTo(CA.map);

    CA.areas[conflictIso] = [];
    CA.layers[conflictIso].eachLayer(function(l){
      if(l.feature && l.feature.properties){
        CA.areas[conflictIso].push({
          id: l.feature.properties.id, name: l.feature.properties.name,
          provinceName: l.feature.properties.provinceName,
          controller: l.feature.properties.controller,
          layer: l, feature: l.feature
        });
      }
    });

    var countryJson = CA.countryGeojsons[conflictIso];
    if(countryJson && countryJson.features && countryJson.features.length){
      CA.countryShadowLayers[conflictIso] = L.geoJSON(countryJson, {
        style: styleCountryShadow, pane: PANES.countryShadow.name,
        smoothFactor: 1.5, interactive: false
      });
      CA.countryShadowLayers[conflictIso].addTo(CA.map);

      CA.countryLayers[conflictIso] = L.geoJSON(countryJson, {
        style: styleCountry, pane: PANES.country.name,
        smoothFactor: 1.5, interactive: false
      });
      CA.countryLayers[conflictIso].addTo(CA.map);
    }

    renderOverlayPolygons(conflictIso);
  }

  function getLegendHtml(){
    var html = '';
    html += '<div class="wm-legend-block wm-legend-universal">';
    html += '<div class="wm-legend-block-title">── Legenda ──</div>';
    UNIVERSAL_COLORS.forEach(function(u){
      html += '<div class="wm-legend-row"><span class="wm-legend-swatch-square" style="background:' + u.color + '"></span>' + escapeHtml(u.label) + '</div>';
    });
    html += '<div class="wm-legend-row"><span class="wm-legend-swatch-square wm-legend-swatch-pulse"></span>Actief conflict</div>';
    html += '<div class="wm-legend-row"><span class="wm-legend-swatch-square" style="background:' + COLORS.territoryGain + '"></span>Winst (▲)</div>';
    html += '<div class="wm-legend-row"><span class="wm-legend-swatch-square" style="background:' + COLORS.territoryLoss + '"></span>Verlies (▼)</div>';
    html += '<div class="wm-legend-row" style="opacity:.7;font-style:italic">Fill = controle · Rand = activiteit</div>';
    html += '<div class="wm-legend-row" style="opacity:.7;font-style:italic">✅ = AI-bevestigd (3 dagen)</div>';
    html += '</div>';

    html += '<div class="wm-legend-block wm-legend-details">';
    html += '<div class="wm-legend-block-title">── Details per land ──</div>';
    ACTIVE_CONFLICTS.forEach(function(iso){
      var conflict = getConflict(iso);
      if(!conflict || !conflict.parties) return;
      var partyNames = Object.keys(conflict.parties);
      html += '<details class="wm-legend-country">';
      html += '<summary class="wm-legend-country-head">';
      html += '<span class="wm-legend-country-name">' + escapeHtml(conflict.name) + '</span>';
      html += '<span class="wm-legend-country-count">' + partyNames.length + '</span>';
      html += '<button class="wm-legend-zoom" data-iso="' + iso + '" aria-label="Zoom" type="button">📍</button>';
      html += '</summary>';
      partyNames.forEach(function(party){
        var c = conflict.parties[party];
        html += '<div class="wm-legend-row"><span class="wm-legend-swatch-square" style="background:' + c.fill + '"></span>' + escapeHtml(party) + '</div>';
      });
      html += '</details>';
    });
    html += '</div>';
    return html;
  }

  function bindLegendZoom(){
    var buttons = document.querySelectorAll(".wm-legend-zoom");
    for(var i = 0; i < buttons.length; i++){
      (function(btn){
        if(btn._caBound) return;
        btn._caBound = true;
        btn.addEventListener("click", function(e){
          e.preventDefault(); e.stopPropagation();
          var iso = btn.getAttribute("data-iso");
          var conflict = getConflict(iso);
          if(!conflict || !conflict.center) return;
          var mapInstance = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
          if(!mapInstance) return;
          var c = conflict.center;
          mapInstance.flyTo([c[0], c[1]], c[2] || 6, { duration: 1.2 });
        });
      })(buttons[i]);
    }
  }

  function injectLegendStyles(){
    if(document.getElementById("caLegendStyles")) return;
    var s = document.createElement("style");
    s.id = "caLegendStyles";
    s.textContent =
      ".wm-legend-universal{padding-bottom:.4rem;margin-bottom:.4rem;border-bottom:1px solid rgba(255,255,255,.08);}" +
      ".wm-legend-country{background:rgba(255,255,255,.03);border-radius:6px;margin-bottom:.2rem;overflow:hidden;}" +
      ".wm-legend-country-head{display:flex;align-items:center;gap:.3rem;padding:.3rem .4rem;cursor:pointer;list-style:none;font-size:.55rem;font-weight:700;color:#e0a857;user-select:none;}" +
      ".wm-legend-country-head::-webkit-details-marker{display:none;}" +
      ".wm-legend-country-head::before{content:'▶';font-size:.5rem;opacity:.6;transition:transform .15s;display:inline-block;}" +
      ".wm-legend-country[open] .wm-legend-country-head::before{transform:rotate(90deg);}" +
      ".wm-legend-country-name{flex:1;text-transform:uppercase;letter-spacing:.03em;}" +
      ".wm-legend-country-count{background:rgba(224,168,87,.2);color:#e0a857;font-size:.48rem;padding:.05rem .3rem;border-radius:6px;font-weight:700;}" +
      ".wm-legend-zoom{background:transparent;border:0;color:#e0a857;font-size:.7rem;cursor:pointer;padding:0 .15rem;font-family:inherit;opacity:.8;}" +
      ".wm-legend-country .wm-legend-row{padding:.15rem .4rem .15rem .9rem;font-size:.52rem;}";
    document.head.appendChild(s);
  }

  function refreshLegend(){ injectLegendStyles(); bindLegendZoom(); }

  function hookLegendRefresh(){
    if(!window.WorldMap) return;
    var original = window.WorldMap.refreshLegend;
    if(original && !original._caPatched){
      var wrapped = function(){
        var r = original.apply(this, arguments);
        refreshLegend();
        return r;
      };
      wrapped._caPatched = true;
      window.WorldMap.refreshLegend = wrapped;
    }
  }

  function initOneConflict(conflictIso){
    return loadOblasts(conflictIso).then(function(oblastsJson){
      CA.geojsons[conflictIso] = oblastsJson;
      return Promise.all([loadDeepState(conflictIso), loadISW(conflictIso), loadCountry(conflictIso)]).then(function(res){
        CA.deepStateGeos[conflictIso] = res[0];
        CA.iswGeos[conflictIso] = res[1];
        CA.countryGeojsons[conflictIso] = res[2];
        calculateControllers(conflictIso);
        calculateAttackIntensity(conflictIso);
        renderLayer(conflictIso);
        return true;
      });
    }).catch(function(e){
      LOG("[" + conflictIso + "] Init faalde: " + (e.message || "?"));
      return false;
    });
  }

  function _doInit(){
    LOG("Init gestart: " + ACTIVE_CONFLICTS.join(", "));
    return openDB().then(function(){
      var batches = [];
      for(var i = 0; i < ACTIVE_CONFLICTS.length; i += 4){
        batches.push(ACTIVE_CONFLICTS.slice(i, i + 4));
      }
      return batches.reduce(function(chain, batch){
        return chain.then(function(){
          LOG("Batch: " + batch.join(", "));
          return Promise.all(batch.map(function(iso){ return initOneConflict(iso); }));
        });
      }, Promise.resolve());
    }).then(function(){ loadAllNeighbors().catch(function(){}); }).then(function(){
      if(window.ProvinceMapper && window.ProvinceMapper.init){
        try { window.ProvinceMapper.init(CA.geojsons); } catch(e){}
      }
      if(window.ProvinceConsensus && window.ProvinceConsensus.init){
        window.ProvinceConsensus.init().then(function(){
          if(window.WarDesk && WarDesk.events){
            WarDesk.events.on("province:consensus", function(data){
              CA._consensus = data.byGid || {};
              applyConsensusToMap();
            });
            WarDesk.events.on("territory:changes", function(data){
              if (data && data.changes){
                CA._territoryChanges = data.changes;
                renderTerritoryChanges(data.changes);
              }
            });
            /* v11.14: 3-dagen-confirmed overrides */
            WarDesk.events.on("territory:confirmed", function(data){
              if (!data || !data.overrides) return;
              CA._confirmedOverrides = data.overrides;
              var count = Object.keys(data.overrides).length;
              LOG("Territory confirmed: " + count + " overrides actief" +
                  (data.fromCache ? " (uit cache)" : ""));
              if(data.confirmed && data.confirmed.length){
                data.confirmed.forEach(function(c){
                  LOG("  ✅ " + c.gid + " → " + c.actor +
                      " (" + c.consecutiveDays + "d" +
                      (c.previousActor ? ", was " + c.previousActor : "") + ")");
                });
              }
              applyConsensusToMap();
            });
          }
        }).catch(function(){});
      }
    }).then(function(){
      CA.isInitialized = true;
      CA.isLoaded = true;
      ensurePanes(CA.map);
      bindZoomListener();
      bindMapClickFallback();
      injectAreaStyles();
      injectPanelStyles();
      hookLegendRefresh();
      try { if(window.WorldMap && window.WorldMap.refreshLegend) window.WorldMap.refreshLegend(); } catch(e){}
      refreshLegend();
      startPulse();
      LOG("Init klaar — " + ACTIVE_CONFLICTS.length + " conflicten actief" +
          (Object.keys(CA._confirmedOverrides).length ? ", " + Object.keys(CA._confirmedOverrides).length + " overrides" : ""));
      return true;
    });
  }

  function init(mapInstance){
    if(CA.isInitialized){ return Promise.resolve(); }
    if(_initPromise){ return _initPromise; }
    if(!mapInstance) return Promise.reject(new Error("Geen map instance"));
    CA.map = mapInstance;

    /* v11.14: laad bestaande confirmed-overrides uit consensus-history
       vóór de init van GADM-lagen, zodat de eerste render meteen klopt */
    try {
      if (window.ConsensusHistory && window.ConsensusHistory.getConfirmedOverrides) {
        var existing = window.ConsensusHistory.getConfirmedOverrides();
        if (existing && Object.keys(existing).length) {
          CA._confirmedOverrides = existing;
          LOG("Confirmed overrides geladen bij init: " + Object.keys(existing).length);
        }
      }
    } catch(e){}

    _initPromise = _doInit();
    return _initPromise;
  }

  function refresh(){
    if(!CA.isInitialized) return Promise.resolve();
    return Promise.all(ACTIVE_CONFLICTS.map(function(iso){
      var conflict = getConflict(iso);
      return dbPut(conflict.cacheKeys.deepState.key, { version: "cleared", t: 0, geojson: null })
        .then(function(){ return dbPut(conflict.cacheKeys.isw.key, { version: "cleared", t: 0, geojson: null }); })
        .then(function(){ return initOneConflict(iso); });
    })).then(function(){ return true; });
  }

  function updateIntensity(){
    ACTIVE_CONFLICTS.forEach(function(iso){
      calculateAttackIntensity(iso);
      CA._currentConflictIso = iso;
      CA._currentConflict = getConflict(iso);
      var layer = CA.layers[iso];
      if(!layer) return;
      layer.eachLayer(function(l){
        if(!l.feature) return;
        try { l.setStyle(styleProvince(l.feature)); } catch(e){}
      });
    });
    if(hasActiveAreas() && !CA.pulseTimer) startPulse();
  }

  function clearCache(){
    return Promise.all(ACTIVE_CONFLICTS.map(function(iso){
      var conflict = getConflict(iso);
      var ops = [
        dbPut(conflict.cacheKeys.oblasts.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.deepState.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.isw.key, { version: "cleared", t: 0, geojson: null }),
        dbPut(conflict.cacheKeys.snapshot.key, { version: "cleared", t: 0, geojson: null })
      ];
      if(conflict.cacheKeys.country){
        ops.push(dbPut(conflict.cacheKeys.country.key, { version: "cleared", t: 0, geojson: null }));
      }
      return Promise.all(ops);
    })).then(function(){
      return Promise.all(NEIGHBOR_COUNTRIES.map(function(iso3){
        return dbPut("wardesk_neighbor_" + iso3, { version: "cleared", t: 0, geojson: null });
      }));
    }).then(function(){ return true; });
  }

  function destroy(){
    stopPulse();
    unbindZoomListener();
    ACTIVE_CONFLICTS.forEach(function(iso){
      ["layers", "countryShadowLayers", "countryLayers", "overlayLayers"].forEach(function(bucket){
        if(CA[bucket][iso] && CA.map){ try { CA.map.removeLayer(CA[bucket][iso]); } catch(e){} }
      });
    });
    if(CA.neighborLayer && CA.map){ try { CA.map.removeLayer(CA.neighborLayer); } catch(e){} }
    if(CA.territoryLayer && CA.map){ try { CA.map.removeLayer(CA.territoryLayer); } catch(e){} }
    CA.neighborLayer = null;
    CA.territoryLayer = null;
    CA.layers = {}; CA.countryShadowLayers = {}; CA.countryLayers = {}; CA.overlayLayers = {};
    CA.isInitialized = false; CA.isLoaded = false;
    _initPromise = null;
  }

  function getStats(){
    var out = {};
    ACTIVE_CONFLICTS.forEach(function(iso){ if(CA.stats[iso]) out[iso] = CA.stats[iso]; });
    return out;
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab');
    if(!tab) return;
    var view = tab.getAttribute("data-view");
    if(view === "map"){ CA.isMapActive = true; if(CA.isInitialized) startPulse(); }
    else { CA.isMapActive = false; stopPulse(); }
  });

  window.ConflictAreas = {
    init: init, refresh: refresh, updateIntensity: updateIntensity,
    destroy: destroy, clearCache: clearCache, getStats: getStats,
    getLegendHtml: getLegendHtml,
    applyConsensus: function(byGid){
      CA._consensus = byGid || {};
      applyConsensusToMap();
    },
    applyTerritoryChanges: function(changes){
      CA._territoryChanges = changes || {};
      renderTerritoryChanges(changes);
    },
    applyConfirmedOverrides: function(overrides){
      CA._confirmedOverrides = overrides || {};
      applyConsensusToMap();
    },
    getConfirmedOverrides: function(){ return CA._confirmedOverrides; },
    getConsensus: getConsensusForFeature,
    state: CA, _version: "v11.14",
    _conflicts: CONFLICTS,
    _activeConflicts: ACTIVE_CONFLICTS,
    _neighborCountries: NEIGHBOR_COUNTRIES,
    testPanel: function(){
      var iso = ACTIVE_CONFLICTS[0];
      var areas = CA.areas[iso] || [];
      if (areas.length) openPanel(areas[0], iso);
      else LOG("Geen areas om te testen");
    }
  };

  var tries = 0, MAX = 240;
  function tryInit(){
    if(CA.isInitialized) return;
    tries++;
    var m = window.MAPAPI && window.MAPAPI.state && window.MAPAPI.state.instance;
    if(m){
      LOG("Map instance gevonden na " + tries + " pogingen — start init");
      init(m).then(function(){
        LOG("Init promise voltooid");
      }).catch(function(e){
        LOG("Init FAALDE: " + (e.message || "?"));
      });
      return;
    }
    if(tries >= MAX){
      LOG("Timeout na " + MAX + " pogingen — map instance nooit gevonden");
      return;
    }
    if(tries % 10 === 0){
      LOG("Wacht op map instance... (" + tries + "/" + MAX + ")");
    }
    setTimeout(tryInit, 500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(tryInit, 1500); });
  } else {
    setTimeout(tryInit, 1500);
  }

  document.addEventListener("click", function(e){
    var tab = e.target.closest && e.target.closest('.bottom-tabs .tab[data-view="map"]');
    if(tab) setTimeout(tryInit, 1200);
  });

  try {
    if(window.WarDesk && window.WarDesk.events){
      window.WarDesk.events.on("map:military-events", function(){
        if(CA.isInitialized) setTimeout(function(){ updateIntensity(); }, 500);
      });
    }
  } catch(e){}

  (function observeTheme(){
    if(typeof MutationObserver === "undefined") return;
    var last = isLightTheme();
    var obs = new MutationObserver(function(){
      var current = isLightTheme();
      if(current !== last){ last = current; updateNeighborTheme(); }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  })();

  LOG("conflict-areas.js v11.14 geladen (fill=controle + AI-confirmed override)");
})();