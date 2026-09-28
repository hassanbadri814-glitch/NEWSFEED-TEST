/* ============================================================
   WAR DESK — worldmap-data.js v3.1
   ------------------------------------------------------------
   - v3.1: LOCATIONS uitgebreid met conflict-steden
           (Syrië, Oekraïne, Jemen, Gaza, Israël, Saoedi, Irak, Iran)
   - v3.0: LOCATIONS gecentraliseerd (was in ai-map.js)
   ============================================================ */

(function(){
  "use strict";

  window.WORLDMAP_VERSION = "v3.1";

  /* ============================================================
     LOCATIONS — alle bekende steden/regio's voor geo-mapping
     ============================================================ */
  var LOCATIONS = {
    /* ================= OEKRAÏNE ================= */
    "oekraïne":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "ukraine":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kyiv":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kiev":{lat:50.45,lng:30.52,country:"Oekraïne",region:"Oost-Europa"},
    "kharkiv":{lat:49.99,lng:36.23,country:"Oekraïne",region:"Oost-Europa"},
    "odesa":{lat:46.48,lng:30.73,country:"Oekraïne",region:"Oost-Europa"},
    "donetsk":{lat:48.02,lng:37.80,country:"Oekraïne",region:"Oost-Europa"},
    "donbas":{lat:48.50,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "luhansk":{lat:48.57,lng:39.31,country:"Oekraïne",region:"Oost-Europa"},
    "cherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "kherson":{lat:46.64,lng:32.61,country:"Oekraïne",region:"Oost-Europa"},
    "zaporizhzhia":{lat:47.84,lng:35.14,country:"Oekraïne",region:"Oost-Europa"},
    "zaporozhye":{lat:47.84,lng:35.14,country:"Oekraïne",region:"Oost-Europa"},
    "marioepol":{lat:47.10,lng:37.55,country:"Oekraïne",region:"Oost-Europa"},
    "mariupol":{lat:47.10,lng:37.55,country:"Oekraïne",region:"Oost-Europa"},
    "bachmoet":{lat:48.60,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "bakhmut":{lat:48.60,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "avdiivka":{lat:48.13,lng:37.75,country:"Oekraïne",region:"Oost-Europa"},
    "kramatorsk":{lat:48.72,lng:37.56,country:"Oekraïne",region:"Oost-Europa"},
    "sloviansk":{lat:48.85,lng:37.62,country:"Oekraïne",region:"Oost-Europa"},
    "sumy":{lat:50.91,lng:34.80,country:"Oekraïne",region:"Oost-Europa"},
    "chernihiv":{lat:51.50,lng:31.29,country:"Oekraïne",region:"Oost-Europa"},
    "mykolaiv":{lat:46.97,lng:31.99,country:"Oekraïne",region:"Oost-Europa"},
    "dnipro":{lat:48.46,lng:35.05,country:"Oekraïne",region:"Oost-Europa"},
    "lviv":{lat:49.84,lng:24.03,country:"Oekraïne",region:"Oost-Europa"},
    "krim":{lat:45.35,lng:34.00,country:"Oekraïne",region:"Oost-Europa"},
    "crimea":{lat:45.35,lng:34.00,country:"Oekraïne",region:"Oost-Europa"},
    "sevastopol":{lat:44.62,lng:33.53,country:"Oekraïne",region:"Oost-Europa"},
    /* v3.1 nieuwe Oekraïne conflict-steden */
    "soledar":{lat:48.68,lng:38.10,country:"Oekraïne",region:"Oost-Europa"},
    "vuhledar":{lat:47.78,lng:37.25,country:"Oekraïne",region:"Oost-Europa"},
    "chasiv yar":{lat:48.58,lng:37.85,country:"Oekraïne",region:"Oost-Europa"},
    "kupyansk":{lat:49.71,lng:37.61,country:"Oekraïne",region:"Oost-Europa"},
    "izium":{lat:49.21,lng:37.28,country:"Oekraïne",region:"Oost-Europa"},
    "lyman":{lat:48.98,lng:37.81,country:"Oekraïne",region:"Oost-Europa"},
    "siversk":{lat:48.87,lng:38.10,country:"Oekraïne",region:"Oost-Europa"},
    "pokrovsk":{lat:48.28,lng:37.18,country:"Oekraïne",region:"Oost-Europa"},
    "toretsk":{lat:48.40,lng:37.85,country:"Oekraïne",region:"Oost-Europa"},
    "huliaipole":{lat:47.66,lng:36.25,country:"Oekraïne",region:"Oost-Europa"},
    "enerhodar":{lat:47.50,lng:34.65,country:"Oekraïne",region:"Oost-Europa"},

    /* ================= RUSLAND ================= */
    "rusland":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "russia":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "moskou":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "moscow":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "belgorod":{lat:50.60,lng:36.59,country:"Rusland",region:"Oost-Europa"},
    "koersk":{lat:51.73,lng:36.19,country:"Rusland",region:"Oost-Europa"},
    "kursk":{lat:51.73,lng:36.19,country:"Rusland",region:"Oost-Europa"},
    "rostov":{lat:47.24,lng:39.71,country:"Rusland",region:"Oost-Europa"},
    "bryansk":{lat:53.25,lng:34.37,country:"Rusland",region:"Oost-Europa"},
    "saratov":{lat:51.53,lng:46.03,country:"Rusland",region:"Oost-Europa"},
    "voronezh":{lat:51.67,lng:39.21,country:"Rusland",region:"Oost-Europa"},

    /* ================= ISRAËL ================= */
    "israël":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "israel":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "tel aviv":{lat:32.08,lng:34.78,country:"Israël",region:"Midden-Oosten"},
    "jeruzalem":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "jerusalem":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "haifa":{lat:32.79,lng:34.99,country:"Israël",region:"Midden-Oosten"},
    /* v3.1 grensgebied Israël-Libanon */
    "metula":{lat:33.28,lng:35.58,country:"Israël",region:"Midden-Oosten"},
    "kiryat shmona":{lat:33.21,lng:35.57,country:"Israël",region:"Midden-Oosten"},
    "nahariya":{lat:33.01,lng:35.09,country:"Israël",region:"Midden-Oosten"},
    "acre":{lat:32.93,lng:35.08,country:"Israël",region:"Midden-Oosten"},
    "akko":{lat:32.93,lng:35.08,country:"Israël",region:"Midden-Oosten"},
    "sderot":{lat:31.52,lng:34.60,country:"Israël",region:"Midden-Oosten"},
    "ashkelon":{lat:31.67,lng:34.57,country:"Israël",region:"Midden-Oosten"},

    /* ================= GAZA ================= */
    "gaza":{lat:31.35,lng:34.31,country:"Gaza",region:"Midden-Oosten"},
    "rafah":{lat:31.29,lng:34.25,country:"Gaza",region:"Midden-Oosten"},
    "khan younis":{lat:31.35,lng:34.30,country:"Gaza",region:"Midden-Oosten"},
    "jabalia":{lat:31.53,lng:34.50,country:"Gaza",region:"Midden-Oosten"},
    /* v3.1 nieuwe Gaza steden */
    "deir al-balah":{lat:31.42,lng:34.35,country:"Gaza",region:"Midden-Oosten"},
    "bureij":{lat:31.44,lng:34.40,country:"Gaza",region:"Midden-Oosten"},
    "maghazi":{lat:31.42,lng:34.38,country:"Gaza",region:"Midden-Oosten"},
    "nuseirat":{lat:31.45,lng:34.39,country:"Gaza",region:"Midden-Oosten"},
    "beit hanoun":{lat:31.54,lng:34.53,country:"Gaza",region:"Midden-Oosten"},
    "beit lahia":{lat:31.55,lng:34.50,country:"Gaza",region:"Midden-Oosten"},

    /* ================= WESTELIJKE JORDAANOEVER ================= */
    "westelijke jordaanoever":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "west bank":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "ramallah":{lat:31.90,lng:35.20,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "jenin":{lat:32.46,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},

    /* ================= LIBANON ================= */
    "libanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "lebanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beiroet":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beirut":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},

    /* ================= SYRIË ================= */
    "syrië":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "syria":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "damascus":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "aleppo":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},
    /* v3.1 nieuwe Syrië conflict-steden */
    "idlib city":{lat:35.93,lng:36.63,country:"Syrië",region:"Midden-Oosten"},
    "jisr al-shughur":{lat:35.81,lng:36.32,country:"Syrië",region:"Midden-Oosten"},
    "afrin":{lat:36.51,lng:36.87,country:"Syrië",region:"Midden-Oosten"},
    "azaz":{lat:36.59,lng:37.05,country:"Syrië",region:"Midden-Oosten"},
    "al-bab":{lat:36.37,lng:37.52,country:"Syrië",region:"Midden-Oosten"},
    "manbij":{lat:36.53,lng:37.95,country:"Syrië",region:"Midden-Oosten"},
    "kobani":{lat:36.90,lng:38.35,country:"Syrië",region:"Midden-Oosten"},
    "tabqa":{lat:35.84,lng:38.55,country:"Syrië",region:"Midden-Oosten"},
    "mayadin":{lat:35.02,lng:40.45,country:"Syrië",region:"Midden-Oosten"},
    "abu kamal":{lat:34.45,lng:40.92,country:"Syrië",region:"Midden-Oosten"},
    "palmyra":{lat:34.55,lng:38.28,country:"Syrië",region:"Midden-Oosten"},

    /* ================= IRAK ================= */
    "irak":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "iraq":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "bagdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "baghdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    /* v3.1 */
    "erbil":{lat:36.19,lng:44.01,country:"Irak",region:"Midden-Oosten"},
    "mosul":{lat:36.34,lng:43.13,country:"Irak",region:"Midden-Oosten"},
    "basra":{lat:30.51,lng:47.78,country:"Irak",region:"Midden-Oosten"},
    "kirkuk":{lat:35.47,lng:44.39,country:"Irak",region:"Midden-Oosten"},
    "najaf":{lat:31.99,lng:44.33,country:"Irak",region:"Midden-Oosten"},

    /* ================= IRAN ================= */
    "iran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "teheran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "tehran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "isfahan":{lat:32.65,lng:51.67,country:"Iran",region:"Midden-Oosten"},
    /* v3.1 */
    "bandar abbas":{lat:27.18,lng:56.28,country:"Iran",region:"Midden-Oosten"},
    "bushehr":{lat:28.92,lng:50.83,country:"Iran",region:"Midden-Oosten"},
    "shiraz":{lat:29.60,lng:52.53,country:"Iran",region:"Midden-Oosten"},
    "tabriz":{lat:38.08,lng:46.29,country:"Iran",region:"Midden-Oosten"},
    "qom":{lat:34.64,lng:50.87,country:"Iran",region:"Midden-Oosten"},

    /* ================= JEMEN ================= */
    "jemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "yemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "sanaa":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "aden":{lat:12.78,lng:45.03,country:"Jemen",region:"Midden-Oosten"},
    /* v3.1 */
    "mocha":{lat:13.32,lng:43.25,country:"Jemen",region:"Midden-Oosten"},
    "al-mukha":{lat:13.32,lng:43.25,country:"Jemen",region:"Midden-Oosten"},
    "durayhimi":{lat:14.65,lng:43.05,country:"Jemen",region:"Midden-Oosten"},
    "zabid":{lat:14.20,lng:43.32,country:"Jemen",region:"Midden-Oosten"},
    "bayda":{lat:13.98,lng:45.57,country:"Jemen",region:"Midden-Oosten"},
    "mukalla":{lat:14.53,lng:49.12,country:"Jemen",region:"Midden-Oosten"},

    /* ================= SAOEDI-ARABIË ================= */
    "saudi":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "riyadh":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    /* v3.1 */
    "dhahran":{lat:26.29,lng:50.11,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "jubail":{lat:27.00,lng:49.65,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "yanbu":{lat:24.09,lng:38.06,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "taif":{lat:21.27,lng:40.42,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "abqaiq":{lat:25.94,lng:49.67,country:"Saoedi-Arabië",region:"Midden-Oosten"},

    /* ================= GOLF ================= */
    "qatar":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "doha":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "koeweit":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "kuwait":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "dubai":{lat:25.20,lng:55.27,country:"VAE",region:"Midden-Oosten"},
    "abu dhabi":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},

    /* ================= AFRIKA ================= */
    "sudan":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "khartoum":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "darfur":{lat:13.00,lng:25.00,country:"Sudan",region:"Afrika"},
    "mali":{lat:12.65,lng:-8.00,country:"Mali",region:"Sahel"},
    "bamako":{lat:12.65,lng:-8.00,country:"Mali",region:"Sahel"},
    "burkina faso":{lat:12.37,lng:-1.52,country:"Burkina Faso",region:"Sahel"},
    "niger":{lat:13.51,lng:2.11,country:"Niger",region:"Sahel"},
    "nigeria":{lat:9.06,lng:7.49,country:"Nigeria",region:"Afrika"},
    "somalia":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "somalië":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "mogadishu":{lat:2.05,lng:45.32,country:"Somalië",region:"Afrika"},
    "ethiopië":{lat:9.02,lng:38.75,country:"Ethiopië",region:"Afrika"},
    "ethiopia":{lat:9.02,lng:38.75,country:"Ethiopië",region:"Afrika"},
    "tigray":{lat:13.50,lng:39.50,country:"Ethiopië",region:"Afrika"},
    "congo":{lat:-4.44,lng:15.27,country:"Congo",region:"Afrika"},
    "kinshasa":{lat:-4.44,lng:15.27,country:"Congo",region:"Afrika"},
    "goma":{lat:-1.68,lng:29.23,country:"Congo",region:"Afrika"},
    "mozambique":{lat:-25.97,lng:32.57,country:"Mozambique",region:"Afrika"},

    /* ================= AZIË ================= */
    "afghanistan":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "kabul":{lat:34.53,lng:69.17,country:"Afghanistan",region:"Azië"},
    "pakistan":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "islamabad":{lat:33.68,lng:73.05,country:"Pakistan",region:"Azië"},
    "karachi":{lat:24.86,lng:67.01,country:"Pakistan",region:"Azië"},
    "balochistan":{lat:28.97,lng:66.47,country:"Pakistan",region:"Azië"},
    "baluchistan":{lat:28.97,lng:66.47,country:"Pakistan",region:"Azië"},
    "sindh":{lat:25.89,lng:68.34,country:"Pakistan",region:"Azië"},
    "punjab":{lat:31.17,lng:72.71,country:"Pakistan",region:"Azië"},
    "gilgit":{lat:35.42,lng:74.98,country:"Pakistan",region:"Azië"},
    "waziristan":{lat:32.72,lng:69.83,country:"Pakistan",region:"Azië"},
    "khyber":{lat:34.10,lng:71.15,country:"Pakistan",region:"Azië"},
    "india":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "new delhi":{lat:28.61,lng:77.21,country:"India",region:"Azië"},
    "kashmir":{lat:34.08,lng:74.80,country:"India",region:"Azië"},
    "china":{lat:39.90,lng:116.40,country:"China",region:"Azië"},
    "taiwan":{lat:25.03,lng:121.56,country:"Taiwan",region:"Azië"},
    "noord-korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "north korea":{lat:39.03,lng:125.75,country:"Noord-Korea",region:"Azië"},
    "myanmar":{lat:19.75,lng:96.10,country:"Myanmar",region:"Azië"},

    /* ================= EUROPA ================= */
    "nederland":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "netherlands":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "amsterdam":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "rotterdam":{lat:51.92,lng:4.48,country:"Nederland",region:"West-Europa"},
    "den haag":{lat:52.08,lng:4.31,country:"Nederland",region:"West-Europa"},
    "utrecht":{lat:52.09,lng:5.12,country:"Nederland",region:"West-Europa"},
    "eindhoven":{lat:51.44,lng:5.47,country:"Nederland",region:"West-Europa"},
    "groningen":{lat:53.22,lng:6.57,country:"Nederland",region:"West-Europa"},
    "belgië":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "belgium":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "brussel":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "brussels":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "duitsland":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "germany":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "berlin":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "frankrijk":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "france":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "paris":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "parijs":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "verenigd koninkrijk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "uk":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "london":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "londen":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},
    "polen":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"},
    "poland":{lat:52.23,lng:21.01,country:"Polen",region:"Oost-Europa"},
    "spanje":{lat:40.42,lng:-3.70,country:"Spanje",region:"West-Europa"},
    "spain":{lat:40.42,lng:-3.70,country:"Spanje",region:"West-Europa"},
    "italië":{lat:41.90,lng:12.50,country:"Italië",region:"West-Europa"},
    "italy":{lat:41.90,lng:12.50,country:"Italië",region:"West-Europa"},
    "zwitserland":{lat:46.95,lng:7.45,country:"Zwitserland",region:"West-Europa"},
    "oostenrijk":{lat:48.21,lng:16.37,country:"Oostenrijk",region:"West-Europa"},
    "zweden":{lat:59.33,lng:18.07,country:"Zweden",region:"West-Europa"},
    "noorwegen":{lat:59.91,lng:10.75,country:"Noorwegen",region:"West-Europa"},
    "denemarken":{lat:55.68,lng:12.57,country:"Denemarken",region:"West-Europa"},
    "finland":{lat:60.17,lng:24.94,country:"Finland",region:"West-Europa"},
    "ierland":{lat:53.35,lng:-6.26,country:"Ierland",region:"West-Europa"},
    "portugal":{lat:38.72,lng:-9.14,country:"Portugal",region:"West-Europa"},
    "griekenland":{lat:37.98,lng:23.73,country:"Griekenland",region:"West-Europa"},
    "athene":{lat:37.98,lng:23.73,country:"Griekenland",region:"West-Europa"},

    /* ================= AFRIKA (NOORD) ================= */
    "marokko":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "morocco":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "rabat":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "casablanca":{lat:33.57,lng:-7.59,country:"Marokko",region:"Afrika"},
    "marrakech":{lat:31.63,lng:-7.99,country:"Marokko",region:"Afrika"},

    /* ================= AMERIKA ================= */
    "vs":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "verenigde staten":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "usa":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "washington":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "new york":{lat:40.71,lng:-74.01,country:"VS",region:"Noord-Amerika"},
    "canada":{lat:45.42,lng:-75.70,country:"Canada",region:"Noord-Amerika"},
    "mexico":{lat:19.43,lng:-99.13,country:"Mexico",region:"Latijns-Amerika"},
    "brazil":{lat:-15.79,lng:-47.88,country:"Brazilië",region:"Latijns-Amerika"},
    "venezuela":{lat:10.48,lng:-66.90,country:"Venezuela",region:"Latijns-Amerika"},
    "colombia":{lat:4.71,lng:-74.07,country:"Colombia",region:"Latijns-Amerika"}
  };

  /* ============================================================
     ALLIANTIES
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

  window.ALLIANCE_COLORS = {
    west:     "#3b82f6",
    east:     "#e63946",
    neutral:  "#6b7280",
    friendly: "#06b6d4",
    disputed: "#a855f7"
  };

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

  window.ACTOR_MAP = {
    "houthi": "Jemen", "houthis": "Jemen", "houthi rebels": "Jemen",
    "hezbollah": "Libanon", "hamas": "Gaza",
    "palestinian islamic jihad": "Gaza", "pij": "Gaza",
    "idf": "Israël", "israeli army": "Israël", "israeli forces": "Israël",
    "israeli military": "Israël",
    "iranian army": "Iran", "irgc": "Iran", "iranian forces": "Iran",
    "syrian army": "Syrië", "assad forces": "Syrië",
    "iraqi army": "Irak", "islamic state": "Syrië",
    "isis": "Syrië", "isil": "Syrië", "daesh": "Syrië",
    "al-qaeda": "Syrië", "al qaeda": "Syrië",
    "russian army": "Rusland", "russian forces": "Rusland",
    "russian military": "Rusland", "kremlin": "Rusland",
    "wagner": "Rusland", "wagner group": "Rusland",
    "ukrainian army": "Oekraïne", "ukrainian forces": "Oekraïne",
    "ukrainian military": "Oekraïne", "afu": "Oekraïne", "zsu": "Oekraïne",
    "rsf": "Sudan", "rapid support forces": "Sudan", "sudanese army": "Sudan",
    "al-shabaab": "Somalië", "al shabaab": "Somalië",
    "boko haram": "Nigeria", "m23": "Congo",
    "taliban": "Afghanistan", "afghan army": "Afghanistan",
    "pakistani army": "Pakistan", "indian army": "India",
    "myanmar military": "Myanmar", "junta": "Myanmar",
    "north korean army": "Noord-Korea",
    "chinese military": "China", "pla": "China"
  };

  window.FEED_TIERS = {
    "NOS": 1.0, "BBC World": 1.0, "BBC UK": 1.0, "BBC Arabic": 1.0,
    "France24 EN": 1.0, "France24 AR": 1.0,
    "Reuters": 1.0, "AP News": 1.0, "Reuters TG": 1.0,
    "Al Jazeera": 0.85, "Al Jazeera AR": 0.85, "Al Jazeera AR TG": 0.85,
    "Al Arabiya TG": 0.85, "Al-Ahram": 0.85, "Arab News": 0.85,
    "Saudi Gazette": 0.85, "The National": 0.85, "Gulf News": 0.85,
    "The Peninsula": 0.85, "Asharq Al-Awsat": 0.85,
    "Anadolu AR": 0.85, "TRT World": 0.85,
    "SANA": 0.85, "SABA Yemen": 0.85,
    "RT Arabic": 0.85, "RT News": 0.85, "TASS": 0.85,
    "Times of Israel": 0.85, "Jerusalem Post": 0.85, "Ynet": 0.85,
    "Kyiv Independent": 0.85, "Ukrinform": 0.85,
    "Mehr News Iran": 0.85, "MAP": 0.85,
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
    "Omroep Brabant": 0.5, "Omroep Flevoland": 0.5, "NH Nieuws": 0.5,
    "RTV Utrecht": 0.5, "Omroep Gelderland": 0.5, "L1": 0.5,
    "RTV Oost": 0.5, "Omroep West": 0.5,
    "Lakome2": 0.5, "Bladna.nl": 0.5, "Marokko.nl": 0.5,
    "Voetbalnieuws": 0.5, "Voetbalzone": 0.5, "Voetbalprimeur": 0.5,
    "FCUpdate": 0.5, "Soccernews": 0.5,
    "Glory Kickboxing": 0.5, "MMA DNA": 0.5,
    "Enab Baladi": 0.5, "Sudan Tribune": 0.5, "Radio Dabanga": 0.5,
    "Middle East Monitor": 0.5, "Mondoweiss": 0.5,
    "Clash Report TG": 0.3, "Liveuamap TG": 0.3, "GeoConfirmed TG": 0.3,
    "OSINTdefender TG": 0.3, "Faytuks TG": 0.3, "NOELreports TG": 0.3,
    "Middle East Eye TG": 0.3,
    "_default": 0.5
  };

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
    heat: { cold: 0, warm: 0.5, hot: 1.5, scorching: 3 },
    actor_ring_min: 3,
    actor_ring_hot: 15,
    period_days: 7,
    conflict_ring_min: 5,
    snapshot_interval_ms: 24 * 60 * 60 * 1000,
    heat_recalc_interval_ms: 5 * 60 * 1000
  };

  /* ============================================================
     LANDNAAM → ISO3
     ============================================================ */
  var COUNTRY_TO_ISO3 = {
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
    "sudan": "SDN", "mali": "MLI", "burkina faso": "BFA",
    "niger": "NER", "nigeria": "NGA",
    "somalië": "SOM", "somalia": "SOM",
    "ethiopië": "ETH", "ethiopia": "ETH",
    "congo": "COD", "drc": "COD", "mozambique": "MOZ",
    "libië": "LBY", "libya": "LBY",
    "egypte": "EGY", "egypt": "EGY",
    "marokko": "MAR", "morocco": "MAR",
    "algerije": "DZA", "tunesië": "TUN",
    "kenia": "KEN", "kenya": "KEN",
    "afghanistan": "AFG", "pakistan": "PAK",
    "india": "IND", "china": "CHN", "taiwan": "TWN",
    "noord-korea": "PRK", "north korea": "PRK",
    "zuid-korea": "KOR", "south korea": "KOR",
    "myanmar": "MMR", "japan": "JPN", "indonesië": "IDN",
    "nederland": "NLD", "netherlands": "NLD",
    "belgië": "BEL", "belgium": "BEL",
    "duitsland": "DEU", "germany": "DEU",
    "frankrijk": "FRA", "france": "FRA",
    "verenigd koninkrijk": "GBR", "vk": "GBR", "uk": "GBR",
    "polen": "POL", "poland": "POL",
    "spanje": "ESP", "spain": "ESP",
    "italië": "ITA", "italy": "ITA",
    "zwitserland": "CHE", "oostenrijk": "AUT",
    "zweden": "SWE", "noorwegen": "NOR",
    "denemarken": "DNK", "finland": "FIN",
    "ierland": "IRL", "portugal": "PRT", "griekenland": "GRC",
    "turkije": "TUR", "turkey": "TUR",
    "roemenië": "ROU", "hongarije": "HUN", "tsjechië": "CZE",
    "servië": "SRB", "kroatië": "HRV", "bulgarije": "BGR",
    "moldavië": "MDA", "georgië": "GEO", "armenië": "ARM",
    "azerbeidzjan": "AZE",
    "wit-rusland": "BLR", "belarus": "BLR",
    "vs": "USA", "verenigde staten": "USA", "usa": "USA",
    "canada": "CAN", "mexico": "MEX",
    "brazilië": "BRA", "brazil": "BRA",
    "venezuela": "VEN", "colombia": "COL",
    "argentië": "ARG", "chili": "CHL",
    "peru": "PER", "cuba": "CUB",
    "oost-europa": "REG-EE", "midden-oosten": "REG-ME",
    "west-europa": "REG-WE", "afrika": "REG-AF",
    "sahel": "REG-SH", "azië": "REG-AS",
    "noord-amerika": "REG-NA", "latijns-amerika": "REG-LA"
  };

  window.WorldMapData = {
    LOCATIONS: LOCATIONS,

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
    getThresholds: function(){ return window.WORLDMAP_THRESHOLDS; },
    getConflictColor: function(level){
      var c = window.CONFLICT_COLORS;
      if (level === "scorching") return c.scorching;
      if (level === "hot") return c.hot;
      if (level === "warm") return c.warm;
      return c.cold;
    },
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

  try { if (window.wdLog) wdLog.info("[WORLDMAP] data v3.1 geladen — LOCATIONS: " + Object.keys(LOCATIONS).length); } catch(e){}

})();