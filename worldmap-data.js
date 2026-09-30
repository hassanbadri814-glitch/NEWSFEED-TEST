/* ============================================================
   WAR DESK — worldmap-data.js v3.3
   - v3.3: +90 ARABISCHE STEDEN, WIJKEN, BASES
   - v3.2: FEED_TIERS + robuustere getTier
   ============================================================ */

(function(){
  "use strict";

  window.WORLDMAP_VERSION = "v3.3";

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
    "mariupol":{lat:47.10,lng:37.55,country:"Oekraïne",region:"Oost-Europa"},
    "bakhmut":{lat:48.60,lng:38.00,country:"Oekraïne",region:"Oost-Europa"},
    "avdiivka":{lat:48.13,lng:37.75,country:"Oekraïne",region:"Oost-Europa"},
    "kramatorsk":{lat:48.72,lng:37.56,country:"Oekraïne",region:"Oost-Europa"},
    "sloviansk":{lat:48.85,lng:37.62,country:"Oekraïne",region:"Oost-Europa"},
    "sumy":{lat:50.91,lng:34.80,country:"Oekraïne",region:"Oost-Europa"},
    "chernihiv":{lat:51.50,lng:31.29,country:"Oekraïne",region:"Oost-Europa"},
    "mykolaiv":{lat:46.97,lng:31.99,country:"Oekraïne",region:"Oost-Europa"},
    "dnipro":{lat:48.46,lng:35.05,country:"Oekraïne",region:"Oost-Europa"},
    "lviv":{lat:49.84,lng:24.03,country:"Oekraïne",region:"Oost-Europa"},
    "crimea":{lat:45.35,lng:34.00,country:"Oekraïne",region:"Oost-Europa"},
    "sevastopol":{lat:44.62,lng:33.53,country:"Oekraïne",region:"Oost-Europa"},
    "soledar":{lat:48.68,lng:38.10,country:"Oekraïne",region:"Oost-Europa"},
    "vuhledar":{lat:47.78,lng:37.25,country:"Oekraïne",region:"Oost-Europa"},
    "kupyansk":{lat:49.71,lng:37.61,country:"Oekraïne",region:"Oost-Europa"},
    "izium":{lat:49.21,lng:37.28,country:"Oekraïne",region:"Oost-Europa"},
    "lyman":{lat:48.98,lng:37.81,country:"Oekraïne",region:"Oost-Europa"},
    "pokrovsk":{lat:48.28,lng:37.18,country:"Oekraïne",region:"Oost-Europa"},
    "toretsk":{lat:48.40,lng:37.85,country:"Oekraïne",region:"Oost-Europa"},

    /* ================= RUSLAND ================= */
    "rusland":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "russia":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "moscow":{lat:55.75,lng:37.62,country:"Rusland",region:"Oost-Europa"},
    "belgorod":{lat:50.60,lng:36.59,country:"Rusland",region:"Oost-Europa"},
    "kursk":{lat:51.73,lng:36.19,country:"Rusland",region:"Oost-Europa"},
    "rostov":{lat:47.24,lng:39.71,country:"Rusland",region:"Oost-Europa"},
    "bryansk":{lat:53.25,lng:34.37,country:"Rusland",region:"Oost-Europa"},

    /* ================= SYRIË — LATIJNS ================= */
    "syrië":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "syria":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "damascus":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "damaskus":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "aleppo":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},
    "homs":{lat:34.73,lng:36.72,country:"Syrië",region:"Midden-Oosten"},
    "hama":{lat:35.13,lng:36.75,country:"Syrië",region:"Midden-Oosten"},
    "idlib":{lat:35.93,lng:36.63,country:"Syrië",region:"Midden-Oosten"},
    "latakia":{lat:35.53,lng:35.79,country:"Syrië",region:"Midden-Oosten"},
    "tartus":{lat:34.89,lng:35.89,country:"Syrië",region:"Midden-Oosten"},
    "raqqa":{lat:35.95,lng:39.01,country:"Syrië",region:"Midden-Oosten"},
    "deir ez-zor":{lat:35.33,lng:40.15,country:"Syrië",region:"Midden-Oosten"},
    "hasakah":{lat:36.50,lng:40.75,country:"Syrië",region:"Midden-Oosten"},
    "daraa":{lat:32.62,lng:36.10,country:"Syrië",region:"Midden-Oosten"},
    "suwayda":{lat:32.71,lng:36.57,country:"Syrië",region:"Midden-Oosten"},
    "quneitra":{lat:33.13,lng:35.82,country:"Syrië",region:"Midden-Oosten"},
    "manbij":{lat:36.53,lng:37.95,country:"Syrië",region:"Midden-Oosten"},
    "afrin":{lat:36.51,lng:36.87,country:"Syrië",region:"Midden-Oosten"},
    "al-bab":{lat:36.37,lng:37.52,country:"Syrië",region:"Midden-Oosten"},
    "azaz":{lat:36.59,lng:37.05,country:"Syrië",region:"Midden-Oosten"},
    "jarablus":{lat:36.82,lng:38.01,country:"Syrië",region:"Midden-Oosten"},
    "kobani":{lat:36.90,lng:38.35,country:"Syrië",region:"Midden-Oosten"},
    "qamishli":{lat:37.05,lng:41.23,country:"Syrië",region:"Midden-Oosten"},
    "palmyra":{lat:34.55,lng:38.28,country:"Syrië",region:"Midden-Oosten"},
    "tabqa":{lat:35.84,lng:38.55,country:"Syrië",region:"Midden-Oosten"},

    /* ================= SYRIË — ARABISCH (v3.3) ================= */
    "سوريا":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "دمشق":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "الشام":{lat:33.51,lng:36.29,country:"Syrië",region:"Midden-Oosten"},
    "حلب":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},
    "حلب الشهباء":{lat:36.20,lng:37.13,country:"Syrië",region:"Midden-Oosten"},
    "حمص":{lat:34.73,lng:36.72,country:"Syrië",region:"Midden-Oosten"},
    "حماة":{lat:35.13,lng:36.75,country:"Syrië",region:"Midden-Oosten"},
    "إدلب":{lat:35.93,lng:36.63,country:"Syrië",region:"Midden-Oosten"},
    "ادلب":{lat:35.93,lng:36.63,country:"Syrië",region:"Midden-Oosten"},
    "اللاذقية":{lat:35.53,lng:35.79,country:"Syrië",region:"Midden-Oosten"},
    "طرطوس":{lat:34.89,lng:35.89,country:"Syrië",region:"Midden-Oosten"},
    "الرقة":{lat:35.95,lng:39.01,country:"Syrië",region:"Midden-Oosten"},
    "دير الزور":{lat:35.33,lng:40.15,country:"Syrië",region:"Midden-Oosten"},
    "الحسكة":{lat:36.50,lng:40.75,country:"Syrië",region:"Midden-Oosten"},
    "القامشلي":{lat:37.05,lng:41.23,country:"Syrië",region:"Midden-Oosten"},
    "درعا":{lat:32.62,lng:36.10,country:"Syrië",region:"Midden-Oosten"},
    "السويداء":{lat:32.71,lng:36.57,country:"Syrië",region:"Midden-Oosten"},
    "القنيطرة":{lat:33.13,lng:35.82,country:"Syrië",region:"Midden-Oosten"},
    "منبج":{lat:36.53,lng:37.95,country:"Syrië",region:"Midden-Oosten"},
    "عفرين":{lat:36.51,lng:36.87,country:"Syrië",region:"Midden-Oosten"},
    "الباب":{lat:36.37,lng:37.52,country:"Syrië",region:"Midden-Oosten"},
    "أعزاز":{lat:36.59,lng:37.05,country:"Syrië",region:"Midden-Oosten"},
    "جرابلس":{lat:36.82,lng:38.01,country:"Syrië",region:"Midden-Oosten"},
    "كوباني":{lat:36.90,lng:38.35,country:"Syrië",region:"Midden-Oosten"},
    "عين العرب":{lat:36.90,lng:38.35,country:"Syrië",region:"Midden-Oosten"},
    "تدمر":{lat:34.55,lng:38.28,country:"Syrië",region:"Midden-Oosten"},
    "الطبقة":{lat:35.84,lng:38.55,country:"Syrië",region:"Midden-Oosten"},
    /* v3.3: wijken/regio's */
    "الغوطة الشرقية":{lat:33.50,lng:36.40,country:"Syrië",region:"Midden-Oosten"},
    "الغوطة الغربية":{lat:33.48,lng:36.20,country:"Syrië",region:"Midden-Oosten"},
    "القلمون":{lat:33.85,lng:36.60,country:"Syrië",region:"Midden-Oosten"},
    "وادي بردى":{lat:33.60,lng:36.20,country:"Syrië",region:"Midden-Oosten"},
    "جبل الزاوية":{lat:35.75,lng:36.60,country:"Syrië",region:"Midden-Oosten"},
    "سهل الغاب":{lat:35.60,lng:36.25,country:"Syrië",region:"Midden-Oosten"},
    "الزبداني":{lat:33.72,lng:36.10,country:"Syrië",region:"Midden-Oosten"},
    "حي الشيخ مقصود":{lat:36.22,lng:37.16,country:"Syrië",region:"Midden-Oosten"},
    "صلاح الدين":{lat:36.22,lng:37.15,country:"Syrië",region:"Midden-Oosten"},
    "جبلة":{lat:35.36,lng:35.92,country:"Syrië",region:"Midden-Oosten"},
    "بانياس":{lat:35.18,lng:35.95,country:"Syrië",region:"Midden-Oosten"},
    "معرة النعمان":{lat:35.64,lng:36.68,country:"Syrië",region:"Midden-Oosten"},
    "جسر الشغور":{lat:35.81,lng:36.32,country:"Syrië",region:"Midden-Oosten"},
    "سرمدا":{lat:36.40,lng:36.85,country:"Syrië",region:"Midden-Oosten"},
    "عندان":{lat:36.55,lng:36.85,country:"Syrië",region:"Midden-Oosten"},
    "دارة عزة":{lat:36.28,lng:36.85,country:"Syrië",region:"Midden-Oosten"},

    /* ================= LIBANON ================= */
    "libanon":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beirut":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "beiroet":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "south lebanon":{lat:33.27,lng:35.20,country:"Libanon",region:"Midden-Oosten"},
    /* Arabisch */
    "لبنان":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "بيروت":{lat:33.89,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "طرابلس لبنان":{lat:34.44,lng:35.85,country:"Libanon",region:"Midden-Oosten"},
    "صيدا":{lat:33.56,lng:35.37,country:"Libanon",region:"Midden-Oosten"},
    "صور":{lat:33.27,lng:35.20,country:"Libanon",region:"Midden-Oosten"},
    "بعلبك":{lat:34.01,lng:36.21,country:"Libanon",region:"Midden-Oosten"},
    "النبطية":{lat:33.38,lng:35.48,country:"Libanon",region:"Midden-Oosten"},
    "الضاحية الجنوبية":{lat:33.85,lng:35.50,country:"Libanon",region:"Midden-Oosten"},
    "الجنوب اللبناني":{lat:33.30,lng:35.35,country:"Libanon",region:"Midden-Oosten"},
    "بنت جبيل":{lat:33.25,lng:35.43,country:"Libanon",region:"Midden-Oosten"},
    "الخيام":{lat:33.33,lng:35.61,country:"Libanon",region:"Midden-Oosten"},
    "زحلة":{lat:33.85,lng:35.90,country:"Libanon",region:"Midden-Oosten"},
    "جونية":{lat:33.98,lng:35.64,country:"Libanon",region:"Midden-Oosten"},

    /* ================= ISRAËL ================= */
    "israël":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "israel":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "tel aviv":{lat:32.08,lng:34.78,country:"Israël",region:"Midden-Oosten"},
    "jerusalem":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "haifa":{lat:32.79,lng:34.99,country:"Israël",region:"Midden-Oosten"},
    /* Arabisch */
    "إسرائيل":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "اسرائيل":{lat:31.77,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "القدس":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "القدس المحتلة":{lat:31.78,lng:35.22,country:"Israël",region:"Midden-Oosten"},
    "تل أبيب":{lat:32.08,lng:34.78,country:"Israël",region:"Midden-Oosten"},
    "حيفا":{lat:32.79,lng:34.99,country:"Israël",region:"Midden-Oosten"},
    "عسقلان":{lat:31.67,lng:34.57,country:"Israël",region:"Midden-Oosten"},
    "سديروت":{lat:31.52,lng:34.60,country:"Israël",region:"Midden-Oosten"},
    "الجليل":{lat:32.90,lng:35.30,country:"Israël",region:"Midden-Oosten"},
    "الجولان":{lat:32.90,lng:35.75,country:"Israël",region:"Midden-Oosten"},

    /* ================= PALESTINA ================= */
    "gaza":{lat:31.35,lng:34.31,country:"Gaza",region:"Midden-Oosten"},
    "rafah":{lat:31.29,lng:34.25,country:"Gaza",region:"Midden-Oosten"},
    "khan younis":{lat:31.35,lng:34.30,country:"Gaza",region:"Midden-Oosten"},
    "jabalia":{lat:31.53,lng:34.50,country:"Gaza",region:"Midden-Oosten"},
    "west bank":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "ramallah":{lat:31.90,lng:35.20,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "jenin":{lat:32.46,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "hebron":{lat:31.53,lng:35.10,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    /* Arabisch */
    "فلسطين":{lat:31.95,lng:35.23,country:"Palestina",region:"Midden-Oosten"},
    "غزة":{lat:31.35,lng:34.31,country:"Gaza",region:"Midden-Oosten"},
    "قطاع غزة":{lat:31.35,lng:34.31,country:"Gaza",region:"Midden-Oosten"},
    "رفح":{lat:31.29,lng:34.25,country:"Gaza",region:"Midden-Oosten"},
    "خان يونس":{lat:31.35,lng:34.30,country:"Gaza",region:"Midden-Oosten"},
    "جباليا":{lat:31.53,lng:34.50,country:"Gaza",region:"Midden-Oosten"},
    "بيت حانون":{lat:31.54,lng:34.53,country:"Gaza",region:"Midden-Oosten"},
    "بيت لاهيا":{lat:31.55,lng:34.50,country:"Gaza",region:"Midden-Oosten"},
    "دير البلح":{lat:31.42,lng:34.35,country:"Gaza",region:"Midden-Oosten"},
    "النصيرات":{lat:31.45,lng:34.39,country:"Gaza",region:"Midden-Oosten"},
    "البريج":{lat:31.44,lng:34.40,country:"Gaza",region:"Midden-Oosten"},
    "الشجاعية":{lat:31.50,lng:34.47,country:"Gaza",region:"Midden-Oosten"},
    "حي الزيتون":{lat:31.50,lng:34.45,country:"Gaza",region:"Midden-Oosten"},
    "الضفة الغربية":{lat:32.00,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "رام الله":{lat:31.90,lng:35.20,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "جنين":{lat:32.46,lng:35.30,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "نابلس":{lat:32.22,lng:35.26,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "الخليل":{lat:31.53,lng:35.10,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "طولكرم":{lat:32.31,lng:35.03,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},
    "بيت لحم":{lat:31.71,lng:35.20,country:"Westelijke Jordaanoever",region:"Midden-Oosten"},

    /* ================= JEMEN ================= */
    "yemen":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "sanaa":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "aden":{lat:12.78,lng:45.03,country:"Jemen",region:"Midden-Oosten"},
    "hodeidah":{lat:14.80,lng:42.95,country:"Jemen",region:"Midden-Oosten"},
    "taiz":{lat:13.58,lng:44.02,country:"Jemen",region:"Midden-Oosten"},
    "marib":{lat:15.46,lng:45.32,country:"Jemen",region:"Midden-Oosten"},
    "mocha":{lat:13.32,lng:43.25,country:"Jemen",region:"Midden-Oosten"},
    /* Arabisch */
    "اليمن":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "صنعاء":{lat:15.37,lng:44.19,country:"Jemen",region:"Midden-Oosten"},
    "عدن":{lat:12.78,lng:45.03,country:"Jemen",region:"Midden-Oosten"},
    "الحديدة":{lat:14.80,lng:42.95,country:"Jemen",region:"Midden-Oosten"},
    "تعز":{lat:13.58,lng:44.02,country:"Jemen",region:"Midden-Oosten"},
    "مأرب":{lat:15.46,lng:45.32,country:"Jemen",region:"Midden-Oosten"},
    "صعدة":{lat:16.94,lng:43.76,country:"Jemen",region:"Midden-Oosten"},
    "إب":{lat:13.97,lng:44.18,country:"Jemen",region:"Midden-Oosten"},
    "ذمار":{lat:14.55,lng:44.40,country:"Jemen",region:"Midden-Oosten"},
    "المكلا":{lat:14.53,lng:49.12,country:"Jemen",region:"Midden-Oosten"},
    "سيئون":{lat:15.94,lng:48.79,country:"Jemen",region:"Midden-Oosten"},
    "المخا":{lat:13.32,lng:43.25,country:"Jemen",region:"Midden-Oosten"},
    "الجوف":{lat:16.60,lng:45.30,country:"Jemen",region:"Midden-Oosten"},
    "شبوة":{lat:14.53,lng:47.00,country:"Jemen",region:"Midden-Oosten"},
    "حضرموت":{lat:15.90,lng:48.50,country:"Jemen",region:"Midden-Oosten"},

    /* ================= SAOEDI-ARABIË ================= */
    "saudi":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "riyadh":{lat:24.71,lng:46.68,country:"Saudi-Arabië",region:"Midden-Oosten"},
    "jeddah":{lat:21.49,lng:39.19,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "mecca":{lat:21.39,lng:39.83,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "medina":{lat:24.47,lng:39.61,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "jizan":{lat:16.89,lng:42.55,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "najran":{lat:17.49,lng:44.13,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "abha":{lat:18.22,lng:42.51,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    /* Arabisch */
    "السعودية":{lat:24.71,lng:46.68,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "الرياض":{lat:24.71,lng:46.68,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "جدة":{lat:21.49,lng:39.19,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "مكة":{lat:21.39,lng:39.83,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "المدينة المنورة":{lat:24.47,lng:39.61,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "جيزان":{lat:16.89,lng:42.55,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "نجران":{lat:17.49,lng:44.13,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "أبها":{lat:18.22,lng:42.51,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "الدمام":{lat:26.39,lng:50.10,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "الظهران":{lat:26.29,lng:50.11,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "حائل":{lat:27.52,lng:41.69,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "تبوك":{lat:28.38,lng:36.56,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "الشرقية":{lat:26.00,lng:50.00,country:"Saoedi-Arabië",region:"Midden-Oosten"},
    "عسير":{lat:18.22,lng:42.51,country:"Saoedi-Arabië",region:"Midden-Oosten"},

    /* ================= IRAK ================= */
    "iraq":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "baghdad":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "mosul":{lat:36.34,lng:43.13,country:"Irak",region:"Midden-Oosten"},
    "erbil":{lat:36.19,lng:44.01,country:"Irak",region:"Midden-Oosten"},
    "basra":{lat:30.51,lng:47.78,country:"Irak",region:"Midden-Oosten"},
    "kirkuk":{lat:35.47,lng:44.39,country:"Irak",region:"Midden-Oosten"},
    /* Arabisch */
    "العراق":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "بغداد":{lat:33.31,lng:44.36,country:"Irak",region:"Midden-Oosten"},
    "الموصل":{lat:36.34,lng:43.13,country:"Irak",region:"Midden-Oosten"},
    "أربيل":{lat:36.19,lng:44.01,country:"Irak",region:"Midden-Oosten"},
    "البصرة":{lat:30.51,lng:47.78,country:"Irak",region:"Midden-Oosten"},
    "كركوك":{lat:35.47,lng:44.39,country:"Irak",region:"Midden-Oosten"},
    "النجف":{lat:31.99,lng:44.33,country:"Irak",region:"Midden-Oosten"},
    "كربلاء":{lat:32.61,lng:44.03,country:"Irak",region:"Midden-Oosten"},
    "الفلوجة":{lat:33.35,lng:43.78,country:"Irak",region:"Midden-Oosten"},
    "الرمادي":{lat:33.42,lng:43.30,country:"Irak",region:"Midden-Oosten"},
    "تكريت":{lat:34.60,lng:43.68,country:"Irak",region:"Midden-Oosten"},
    "السليمانية":{lat:35.56,lng:45.43,country:"Irak",region:"Midden-Oosten"},
    "دهوك":{lat:36.87,lng:42.99,country:"Irak",region:"Midden-Oosten"},

    /* ================= IRAN ================= */
    "iran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "tehran":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "isfahan":{lat:32.65,lng:51.67,country:"Iran",region:"Midden-Oosten"},
    "shiraz":{lat:29.60,lng:52.53,country:"Iran",region:"Midden-Oosten"},
    /* Arabisch */
    "إيران":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "طهران":{lat:35.69,lng:51.39,country:"Iran",region:"Midden-Oosten"},
    "أصفهان":{lat:32.65,lng:51.67,country:"Iran",region:"Midden-Oosten"},
    "شيراز":{lat:29.60,lng:52.53,country:"Iran",region:"Midden-Oosten"},
    "تبريز":{lat:38.08,lng:46.29,country:"Iran",region:"Midden-Oosten"},
    "بندر عباس":{lat:27.18,lng:56.28,country:"Iran",region:"Midden-Oosten"},
    "قم":{lat:34.64,lng:50.87,country:"Iran",region:"Midden-Oosten"},
    "مشهد":{lat:36.30,lng:59.60,country:"Iran",region:"Midden-Oosten"},

    /* ================= GOLF ================= */
    "qatar":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "doha":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "kuwait":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "dubai":{lat:25.20,lng:55.27,country:"VAE",region:"Midden-Oosten"},
    "abu dhabi":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},
    /* Arabisch */
    "قطر":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "الدوحة":{lat:25.28,lng:51.53,country:"Qatar",region:"Midden-Oosten"},
    "الكويت":{lat:29.31,lng:47.48,country:"Koeweit",region:"Midden-Oosten"},
    "الإمارات":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},
    "دبي":{lat:25.20,lng:55.27,country:"VAE",region:"Midden-Oosten"},
    "أبو ظبي":{lat:24.45,lng:54.38,country:"VAE",region:"Midden-Oosten"},
    "البحرين":{lat:26.22,lng:50.58,country:"Bahrein",region:"Midden-Oosten"},
    "المنامة":{lat:26.22,lng:50.58,country:"Bahrein",region:"Midden-Oosten"},
    "عمان الأردن":{lat:31.95,lng:35.93,country:"Jordanië",region:"Midden-Oosten"},
    "الأردن":{lat:31.95,lng:35.93,country:"Jordanië",region:"Midden-Oosten"},

    /* ================= NOORD-AFRIKA ================= */
    "egypt":{lat:30.05,lng:31.23,country:"Egypte",region:"Afrika"},
    "cairo":{lat:30.05,lng:31.23,country:"Egypte",region:"Afrika"},
    "libya":{lat:32.89,lng:13.19,country:"Libië",region:"Afrika"},
    "tripoli":{lat:32.89,lng:13.19,country:"Libië",region:"Afrika"},
    "sudan":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "khartoum":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "darfur":{lat:13.00,lng:25.00,country:"Sudan",region:"Afrika"},
    /* Arabisch */
    "مصر":{lat:30.05,lng:31.23,country:"Egypte",region:"Afrika"},
    "القاهرة":{lat:30.05,lng:31.23,country:"Egypte",region:"Afrika"},
    "ليبيا":{lat:32.89,lng:13.19,country:"Libië",region:"Afrika"},
    "طرابلس ليبيا":{lat:32.89,lng:13.19,country:"Libië",region:"Afrika"},
    "بنغازي":{lat:32.12,lng:20.07,country:"Libië",region:"Afrika"},
    "السودان":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "الخرطوم":{lat:15.55,lng:32.53,country:"Sudan",region:"Afrika"},
    "بورتسودان":{lat:19.62,lng:37.22,country:"Sudan",region:"Afrika"},
    "الفاشر":{lat:13.63,lng:25.35,country:"Sudan",region:"Afrika"},
    "الجزائر":{lat:36.75,lng:3.06,country:"Algerije",region:"Afrika"},
    "تونس":{lat:36.81,lng:10.18,country:"Tunesië",region:"Afrika"},
    "المغرب":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "الرباط":{lat:34.02,lng:-6.84,country:"Marokko",region:"Afrika"},
    "الدار البيضاء":{lat:33.57,lng:-7.59,country:"Marokko",region:"Afrika"},

    /* ================= EUROPA ================= */
    "nederland":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "amsterdam":{lat:52.37,lng:4.90,country:"Nederland",region:"West-Europa"},
    "brussel":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "brussels":{lat:50.85,lng:4.35,country:"België",region:"West-Europa"},
    "berlin":{lat:52.52,lng:13.40,country:"Duitsland",region:"West-Europa"},
    "paris":{lat:48.85,lng:2.35,country:"Frankrijk",region:"West-Europa"},
    "london":{lat:51.51,lng:-0.13,country:"VK",region:"West-Europa"},

    /* ================= AMERIKA ================= */
    "vs":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "washington":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "new york":{lat:40.71,lng:-74.01,country:"VS",region:"Noord-Amerika"},
    "واشنطن":{lat:38.90,lng:-77.04,country:"VS",region:"Noord-Amerika"},
    "نيويورك":{lat:40.71,lng:-74.01,country:"VS",region:"Noord-Amerika"}
  };

  /* ============================================================
     ALLIANTIES
     ============================================================ */
  window.ALLIANCES = {
    "USA":"west","GBR":"west","FRA":"west","DEU":"west","ITA":"west",
    "ESP":"west","PRT":"west","NLD":"west","BEL":"west","LUX":"west",
    "DNK":"west","NOR":"west","ISL":"west","POL":"west","CZE":"west",
    "SVK":"west","HUN":"west","ROU":"west","BGR":"west","GRC":"west",
    "TUR":"west","EST":"west","LVA":"west","LTU":"west","SVN":"west",
    "HRV":"west","ALB":"west","MNE":"west","MKD":"west","CAN":"west",
    "AUS":"west","FIN":"west","SWE":"west","IRL":"west","AUT":"west",
    "CHE":"west","MLT":"west","CYP":"west","BIH":"west","XKX":"west",
    "UKR":"west","MDA":"west","GEO":"west","ARM":"west",
    "KOR":"west","JPN":"west","TWN":"west","ISR":"west",
    "NZL":"west","SGP":"west","PHL":"west","THA":"west",
    "RUS":"east","BLR":"east","CHN":"east","PRK":"east","IRN":"east",
    "SYR":"east","VEN":"east","CUB":"east","NIC":"east",
    "MMR":"east","ERI":"east","ZWE":"east","MLI":"east",
    "BFA":"east","NER":"east","CAF":"east","SSD":"east",
    "_default":"neutral"
  };

  window.ALLIANCE_COLORS = {
    west: "#3b82f6", east: "#e63946", neutral: "#6b7280",
    friendly: "#06b6d4", disputed: "#a855f7"
  };

  window.CONFLICT_COLORS = {
    cold: "#2f2f38", warm: "#7a4040", hot: "#a52a2a", scorching: "#d41919",
    actorRing: "#ff6666", actorHot: "#ff2222",
    border: "rgba(255,255,255,0.12)", borderHot: "#ff0000"
  };

  /* ============================================================
     v3.3: ACTOR_MAP — LATIJNS + ARABISCH
     ============================================================ */
  window.ACTOR_MAP = {
    /* Latijns */
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
    "chinese military": "China", "pla": "China",

    /* v3.3: ARABISCH — Houthi's */
    "الحوثي": "Jemen", "الحوثيون": "Jemen", "أنصار الله": "Jemen",
    "جماعة الحوثي": "Jemen", "ميليشيا الحوثي": "Jemen",

    /* v3.3: ARABISCH — Hezbollah */
    "حزب الله": "Libanon", "المقاومة الإسلامية": "Libanon",
    "مقاومة لبنان": "Libanon",

    /* v3.3: ARABISCH — Syrische regering */
    "الجيش السوري": "Regering", "قوات الأسد": "Regering",
    "النظام السوري": "Regering", "الجيش العربي السوري": "Regering",
    "قوات النظام": "Regering", "القوات الحكومية": "Regering",

    /* v3.3: ARABISCH — Syrische oppositie */
    "هيئة تحرير الشام": "Onbekend", "جبهة النصرة": "Onbekend",
    "الجيش السوري الحر": "Onbekend", "قوات سوريا الديمقراطية": "Onbekend",
    "قسد": "Onbekend", "ي ب ك": "Onbekend", "وحدات حماية الشعب": "Onbekend",

    /* v3.3: ARABISCH — Israël */
    "الجيش الإسرائيلي": "Israël", "الاحتلال الإسرائيلي": "Israël",
    "قوات الاحتلال": "Israël", "إسرائيل": "Israël", "القوات الإسرائيلية": "Israël",

    /* v3.3: ARABISCH — Rusland */
    "الجيش الروسي": "Rusland", "القوات الروسية": "Rusland",
    "روسيا": "Rusland", "موسكو": "Rusland",

    /* v3.3: ARABISCH — Oekraïne */
    "الجيش الأوكراني": "Oekraïne", "القوات الأوكرانية": "Oekraïne",
    "أوكرانيا": "Oekraïne", "كييف": "Oekraïne",

    /* v3.3: ARABISCH — Iran */
    "الحرس الثوري": "Iran", "فيلق القدس": "Iran",
    "إيران": "Iran", "الجمهورية الإسلامية": "Iran",

    /* v3.3: ARABISCH — IS / Al-Qaeda */
    "داعش": "Onbekend", "تنظيم الدولة": "Onbekend",
    "تنظيم الدولة الإسلامية": "Onbekend", "القاعدة": "Onbekend",
    "جبهة فتح الشام": "Onbekend",

    /* v3.3: ARABISCH — Hamas / PIJ */
    "حماس": "Palestina", "كتائب القسام": "Palestina",
    "الجهاد الإسلامي": "Palestina", "سرايا القدس": "Palestina",

    /* v3.3: ARABISCH — Overig */
    "طالبان": "Afghanistan", "الجيش الأفغاني": "Afghanistan",
    "الجيش الباكستاني": "Pakistan",
    "الجيش العراقي": "Irak", "الحشد الشعبي": "Irak",
    "قوات البيشمركة": "Irak"
  };

  /* ============================================================
     FEED_TIERS
     ============================================================ */
  window.FEED_TIERS = {
    "NOS": 1.0, "NOS.nl": 1.0,
    "BBC World": 1.0, "BBC News": 1.0, "BBC UK": 1.0, "BBC": 1.0,
    "BBC Arabic": 0.95,
    "Reuters": 1.0, "Reuters TG": 0.9,
    "AP News": 1.0, "AP": 1.0, "AFP": 1.0,
    "Bloomberg": 1.0,
    "France24 EN": 1.0, "France24 AR": 0.95,
    "ACLED": 1.0,
    "ISW": 0.95, "Institute for the Study of War": 0.95,
    "Bellingcat": 0.95, "OCHA": 0.95,
    "Al Jazeera": 0.85, "Al Jazeera AR": 0.85,
    "Al Arabiya TG": 0.85,
    "Al-Ahram": 0.85, "Arab News": 0.85,
    "Saudi Gazette": 0.85, "The National": 0.85,
    "Gulf News": 0.85, "The Peninsula": 0.85,
    "Asharq Al-Awsat": 0.85,
    "Anadolu AR": 0.85, "TRT World": 0.85,
    "SANA": 0.85, "SABA Yemen": 0.85,
    "RT Arabic": 0.85, "RT News": 0.85, "TASS": 0.85,
    "Times of Israel": 0.85, "Jerusalem Post": 0.85,
    "Ynet": 0.85, "Haaretz": 0.8,
    "Kyiv Independent": 0.85, "Ukrinform": 0.85,
    "Mehr News Iran": 0.85, "MAP": 0.85,
    "SOHR": 0.85, "Syrian Observatory": 0.85,
    "NYT": 0.85, "NYT US": 0.85, "NYT World": 0.85,
    "Washington Post": 0.85, "The Guardian": 0.85,
    "Guardian UK": 0.85, "CNN": 0.85,
    "Al-Monitor": 0.75, "Al Monitor": 0.75,
    "De Telegraaf": 0.7, "AD.nl": 0.7, "De Volkskrant": 0.7,
    "Het Parool": 0.7, "Trouw": 0.7, "RTL Nieuws": 0.7, "Nu.nl": 0.7,
    "NRC": 0.75, "BNR": 0.7,
    "HLN": 0.7, "Nieuwsblad": 0.7, "De Standaard": 0.7,
    "VRT NWS": 0.7, "De Morgen": 0.7, "De Tijd": 0.7,
    "Spiegel": 0.7, "Bild": 0.7, "Zeit": 0.7, "FAZ": 0.7,
    "Süddeutsche": 0.7, "Die Welt": 0.7, "Tagesschau": 0.7,
    "Le Monde": 0.7, "FranceInfo": 0.7, "Libération": 0.7, "Le Figaro": 0.7,
    "Corriere della Sera": 0.7, "Repubblica": 0.7, "La Stampa": 0.7, "ANSA": 0.7,
    "Telegraph": 0.7, "Sky News": 0.7, "Independent": 0.7, "FT": 0.7,
    "NPR": 0.7, "Japan Times": 0.7,
    "Middle East Eye": 0.7, "CNN Arabic": 0.75,
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
    "Middle East Monitor": 0.6, "Mondoweiss": 0.5, "MintPress": 0.5,
    "Clash Report TG": 0.3, "Liveuamap TG": 0.3, "GeoConfirmed TG": 0.3,
    "OSINTdefender TG": 0.3, "Faytuks TG": 0.3, "NOELreports TG": 0.3,
    "Middle East Eye TG": 0.3,
    /* v3.3: Telegram Arabisch */
    "@HalabTodayTV": 0.85, "@damscuce": 0.85, "@ya_topa": 0.85,
    "@NWSYEME": 0.85, "@naya_foriraq": 0.85,
    "@sadadahiechannel": 0.85, "@alshamii011": 0.75,
    "@DeepStateUA": 0.9, "@rybar": 0.85, "@sentdefender": 0.85,
    "@Faytuks": 0.7, "@GeoConfirmed": 0.9, "@OSINTtechnical": 0.7,
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
    "vae": "ARE", "uae": "ARE",
    "sudan": "SDN", "mali": "MLI", "burkina faso": "BFA",
    "niger": "NER", "nigeria": "NGA",
    "somalië": "SOM", "somalia": "SOM",
    "ethiopië": "ETH", "ethiopia": "ETH",
    "congo": "COD", "mozambique": "MOZ",
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
    "oost-europa": "REG-EE", "midden-oosten": "REG-ME",
    "west-europa": "REG-WE", "afrika": "REG-AF",
    "sahel": "REG-SH", "azië": "REG-AS",
    "noord-amerika": "REG-NA", "latijns-amerika": "REG-LA",
    /* v3.3: Arabisch */
    "سوريا": "SYR", "لبنان": "LBN", "إسرائيل": "ISR",
    "فلسطين": "PSE", "غزة": "PSE", "اليمن": "YEM",
    "السعودية": "SAU", "العراق": "IRQ", "إيران": "IRN",
    "مصر": "EGY", "ليبيا": "LBY", "السودان": "SDN",
    "الأردن": "JOR", "قطر": "QAT", "الكويت": "KWT",
    "الإمارات": "ARE", "البحرين": "BHR",
    "روسيا": "RUS", "أوكرانيا": "UKR"
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
      if (!sourceName) return 0.5;
      var s = String(sourceName).trim();
      if (!s) return 0.5;

      if (typeof window.FEED_TIERS[s] === "number") return window.FEED_TIERS[s];

      var lower = s.toLowerCase();
      for (var key in window.FEED_TIERS){
        if (key === "_default") continue;
        if (!Object.prototype.hasOwnProperty.call(window.FEED_TIERS, key)) continue;
        if (key.toLowerCase() === lower) return window.FEED_TIERS[key];
      }

      var bestMatch = null, bestLen = 0;
      for (var key2 in window.FEED_TIERS){
        if (key2 === "_default") continue;
        if (!Object.prototype.hasOwnProperty.call(window.FEED_TIERS, key2)) continue;
        var k = key2.toLowerCase();
        if (k.length < 3) continue;
        if (lower.indexOf(k) !== -1 || k.indexOf(lower) !== -1){
          if (k.length > bestLen){ bestMatch = key2; bestLen = k.length; }
        }
      }
      if (bestMatch) return window.FEED_TIERS[bestMatch];
      return 0.5;
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
          var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          /* v3.3: voor Arabisch, gebruik gewoon indexOf */
          if (/[\u0600-\u06FF]/.test(key)){
            if (lower.indexOf(key) !== -1){
              var country = window.ACTOR_MAP[key];
              if (country && !seen[country]){ seen[country] = true; found.push(country); }
            }
          } else {
            var regex = new RegExp("\\b" + escaped + "\\b", "i");
            if (regex.test(lower)) {
              var country2 = window.ACTOR_MAP[key];
              if (country2 && !seen[country2]){ seen[country2] = true; found.push(country2); }
            }
          }
        } else {
          if (lower.indexOf(key) !== -1) {
            var country3 = window.ACTOR_MAP[key];
            if (country3 && !seen[country3]){ seen[country3] = true; found.push(country3); }
          }
        }
      }
      return found;
    }
  };

  try { if (window.wdLog) wdLog.info("[WORLDMAP] data v3.3 geladen — LOCATIONS: " + Object.keys(LOCATIONS).length + ", ACTORS: " + Object.keys(window.ACTOR_MAP).length); } catch(e){}

})();