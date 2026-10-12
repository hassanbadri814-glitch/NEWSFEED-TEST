/* ============================================================
   WAR DESK — baseline.js v3.1
   - v3.1: Saoedi-Arabië toegevoegd (13 provincies)
   - v3.0: Exacte GADM keys + country fallback
   ============================================================ */

(function(){
  "use strict";

  window.WD_BASELINE_VERSION = "v3.1";

  var BASELINE = {

    /* ══════════════ SYRIË (ADM2) ══════════════ */
    "SYR|As-Safirah":            { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|JabalSam'an":           { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|Jarabulus":             { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|Manbij":                { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie" },
    "SYR|Ar-Raqqah":             { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie" },
    "SYR|Ath-Thawrah":           { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie" },
    "SYR|TalAbyad":              { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|As-Suwayda":            { controller: "Druze-milities",     since: "2025-07-01", source: "semi-autonoom" },
    "SYR|Al-Hasakah":            { controller: "Al-Sharaa-regering", since: "2026-08-25", source: "SDF-ontbinding" },
    "SYR|Al-Malikiyah":          { controller: "Al-Sharaa-regering", since: "2026-08-25", source: "SDF-ontbinding" },
    "SYR|AlQamishli":            { controller: "Al-Sharaa-regering", since: "2026-08-25", source: "SDF-ontbinding" },
    "SYR|Ra'sal-'Ayn":           { controller: "Al-Sharaa-regering", since: "2026-08-25", source: "SDF-ontbinding" },
    "SYR|'Aynal-'Arab":          { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|A'zaz":                 { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|Afrin":                 { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|AlBab":                 { controller: "Al-Sharaa-regering", since: "2024-12-01", source: "HTS" },
    "SYR|Baniyas":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Duraykish":             { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Safita":                { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Tartus":                { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|At-Tall":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Darayya":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Duma":                  { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|MarkazRifDimashq":      { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Qatana":                { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Yabrud":                { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Zabadani":              { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Ash-ShaykhBadr":        { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Ma'arratal-Numan":      { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Al-Haffah":             { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Jableh":                { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Latakia":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Qardaha":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Quneitra":              { controller: "Israël (bezet)",     since: "2024-12-09", source: "IDF" },
    "SYR|Al-Qutayfah":           { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|An-Nabk":               { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "HTS" },
    "SYR|Ar-Rastan":             { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Hims":                  { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Palmyra":               { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Talkalakh":             { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Arihah":                { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Harem":                 { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Idlib":                 { controller: "Al-Sharaa-regering", since: "2015-03-01", source: "HTS" },
    "SYR|Jisrash-Shugur":        { controller: "Al-Sharaa-regering", since: "2015-03-01", source: "HTS" },
    "SYR|Mayadin":               { controller: "Al-Sharaa-regering", since: "2026-01-18", source: "integratie" },
    "SYR|As-Suqaylabiyah":       { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Hama":                  { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Masyaf":                { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Muhardeh":              { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Salamiyah":             { controller: "Al-Sharaa-regering", since: "2024-12-05", source: "HTS" },
    "SYR|Al-Mukharram":          { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },
    "SYR|Al-Qusayr":             { controller: "Al-Sharaa-regering", since: "2024-12-07", source: "HTS" },

    /* ══════════════ LIBANON (ADM2) ══════════════ */
    "LBN|BintJbayl":        { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Hasbaya":          { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Marjaayoun":       { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Nabatiyeh":        { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Saida":            { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Sour":             { controller: "Israël (bezet)", since: "2026-06-01", source: "IDF" },
    "LBN|Baalbeck":         { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Hermel":           { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|WestBekaa":        { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Zahleh":           { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Rachiaya":         { controller: "Hezbollah",      since: "2006-08-14", source: "Hezbollah" },
    "LBN|Aley":             { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Baabda":           { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Batroun":          { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Chouf":            { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|ElMetn":           { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Jezzine":          { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Jubail":           { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Kasrouane":        { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Akkar":            { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Minieh-Danieh":    { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Beirut":           { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Tripoli":          { controller: "Libanese staat", since: "1990-10-13", source: "staat" },
    "LBN|Zgharta":          { controller: "Libanese staat", since: "1990-10-13", source: "staat" },

    /* ══════════════ JEMEN (ADM1) ══════════════ */
    "YEM|AmanatAlAsimah":   { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Amran":            { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Dhamar":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Hadramawt":        { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Hajjah":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Ibb":              { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Lahij":            { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Ma'rib":           { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|Raymah":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Sa'dah":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|San'a'":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|Shabwah":          { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Ta'izz":           { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|'Adan":            { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|Abyan":            { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|AlBayda'":         { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|AlDali'":          { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|AlHudaydah":       { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },
    "YEM|AlJawf":           { controller: "Houthi's", since: "2021-02-01", source: "Houthi" },
    "YEM|AlMahrah":         { controller: "Regering", since: "2015-07-17", source: "STC" },
    "YEM|AlMahwit":         { controller: "Houthi's", since: "2014-09-21", source: "Houthi" },

    /* ══════════════ SAOEDI-ARABIË (ADM1) ══════════════ */
    "SAU|ArRiyad":              { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Makkah":               { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AlMadinah":            { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AshSharqiyah":         { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AlQassim":             { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Ha'il":                { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Tabuk":                { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AlJawf":               { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AlHududAshShamaliyah": { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Jizan":                { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Najran":               { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|Asir":                 { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },
    "SAU|AlBahah":              { controller: "Saoedi-Arabië", since: "1932-09-23", source: "staat" },

    /* ══════════════ ISRAËL (ADM1) ══════════════ */
    "ISR|Golan":     { controller: "Israël", since: "1967-06-10", source: "IDF" },
    "ISR|HaDarom":   { controller: "Israël", since: "1948-05-14", source: "IDF" },
    "ISR|Haifa":     { controller: "Israël", since: "1948-05-14", source: "IDF" },
    "ISR|HaMerkez":  { controller: "Israël", since: "1948-05-14", source: "IDF" },
    "ISR|HaZafon":   { controller: "Israël", since: "1948-05-14", source: "IDF" },
    "ISR|Jerusalem": { controller: "Israël", since: "1948-05-14", source: "IDF" },
    "ISR|TelAviv":   { controller: "Israël", since: "1948-05-14", source: "IDF" },

    /* ══════════════ PALESTINA (ADM1) ══════════════ */
    "PSE|Gaza":     { controller: "Israël (bezet)", since: "2025-10-10", source: "IDF" },
    "PSE|WestBank": { controller: "Palestina",       since: "1994-05-04", source: "PA" },

    /* ══════════════ SOEDAN (ADM1) ══════════════ */
    "SDN|AlJazirah":     { controller: "RSF",      since: "2024-12-01", source: "RSF" },
    "SDN|AlQadarif":     { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|BlueNile":      { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|CentralDarfur": { controller: "RSF",      since: "2024-01-01", source: "RSF" },
    "SDN|EastDarfur":    { controller: "RSF",      since: "2024-01-01", source: "RSF" },
    "SDN|Kassala":       { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|Khartoum":      { controller: "Regering", since: "2025-03-01", source: "SAF" },
    "SDN|NorthDarfur":   { controller: "Regering", since: "2025-01-01", source: "SAF" },
    "SDN|NorthKurdufan": { controller: "RSF",      since: "2024-06-01", source: "RSF" },
    "SDN|Northern":      { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|RedSea":        { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|RiverNile":     { controller: "Regering", since: "2024-01-01", source: "SAF" },
    "SDN|Sennar":        { controller: "RSF",      since: "2024-12-01", source: "RSF" },
    "SDN|SouthDarfur":   { controller: "RSF",      since: "2024-01-01", source: "RSF" },
    "SDN|SouthKurdufan": { controller: "Regering", since: "2024-06-01", source: "SAF" },
    "SDN|WestDarfur":    { controller: "Regering", since: "2025-06-01", source: "SAF" },
    "SDN|WestKurdufan":  { controller: "RSF",      since: "2024-06-01", source: "RSF" },
    "SDN|WhiteNile":     { controller: "Regering", since: "2024-01-01", source: "SAF" },

    /* ══════════════ OEKRAÏNE (ADM1) ══════════════ */
    "UKR|Donets'k":            { controller: "Rusland",  since: "2022-02-24", source: "RF" },
    "UKR|Luhans'k":            { controller: "Rusland",  since: "2022-02-24", source: "RF" },
    "UKR|Zaporizhia":          { controller: "Rusland",  since: "2022-02-24", source: "RF" },
    "UKR|Kherson":             { controller: "Rusland",  since: "2022-02-24", source: "RF" },
    "UKR|Crimea":              { controller: "Rusland",  since: "2014-03-18", source: "RF" },
    "UKR|Sevastopol'":         { controller: "Rusland",  since: "2014-03-18", source: "RF" },
    "UKR|Kiev":                { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|KievCity":            { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Kharkiv":             { controller: "Oekraïne", since: "2022-09-01", source: "ZSU" },
    "UKR|Odessa":              { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Mykolayiv":           { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Dnipropetrovs'k":     { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Sumy":                { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Chernihiv":           { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|L'viv":               { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Poltava":             { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Cherkasy":            { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Zhytomyr":            { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Rivne":               { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Ternopil'":           { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Ivano-Frankivs'k":    { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Zakarpattia":         { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Volyn":               { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Kirovohrad":          { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Vinnytsya":           { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Khmel'nyts'kyy":      { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },
    "UKR|Chernivtsi":          { controller: "Oekraïne", since: "2022-02-24", source: "ZSU" },

    /* ══════════════ ETHIOPIË (ADM1) ══════════════ */
    "ETH|Tigray":                    { controller: "TPLF (Tigray)",     since: "2020-11-04", source: "TPLF" },
    "ETH|Amhara":                    { controller: "Fano (Amhara)",     since: "2023-04-01", source: "Fano" },
    "ETH|Oromia":                    { controller: "OLA (Oromia)",      since: "2023-01-01", source: "OLA" },
    "ETH|AddisAbeba":                { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|Afar":                      { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|Benshangul-Gumaz":          { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|DireDawa":                  { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|GambelaPeoples":            { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|HarariPeople":              { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|Somali":                    { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },
    "ETH|SouthernNations,Nationalities": { controller: "Federale regering", since: "1991-05-28", source: "EPRDF" },

    /* ══════════════ MALI (ADM1) ══════════════ */
    "MLI|Kidal":     { controller: "FLA (Toeareg)",     since: "2024-01-01", source: "FLA" },
    "MLI|Gao":       { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Mopti":     { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Timbuktu":  { controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "MLI|Bamako":    { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Kayes":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Koulikoro": { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Ségou":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "MLI|Sikasso":   { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },

    /* ══════════════ BURKINA FASO (ADM1) ══════════════ */
    "BFA|Sahel":           { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Est":             { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Nord":            { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Centre-Nord":     { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "BFA|Boucle du Mouhoun":{ controller: "JNIM (Jihadisten)", since: "2025-06-01", source: "JNIM" },
    "BFA|Cascades":        { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre":          { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre-Est":      { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre-Ouest":    { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Centre-Sud":      { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Hauts-Bassins":   { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Plateau-Central": { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "BFA|Sud-Ouest":       { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },

    /* ══════════════ NIGER (ADM1) ══════════════ */
    "NER|Agadez":    { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "NER|Diffa":     { controller: "Boko Haram/ISWAP",  since: "2024-01-01", source: "ISWAP" },
    "NER|Dosso":     { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "NER|Maradi":    { controller: "IS Sahel",          since: "2025-06-01", source: "ISSP" },
    "NER|Niamey":    { controller: "Junta (Regering)",  since: "2024-01-01", source: "Junta" },
    "NER|Tahoua":    { controller: "IS Sahel",          since: "2025-06-01", source: "ISSP" },
    "NER|Tillabéry": { controller: "JNIM (Jihadisten)", since: "2025-01-01", source: "JNIM" },
    "NER|Zinder":    { controller: "Boko Haram/ISWAP",  since: "2024-01-01", source: "ISWAP" },

    /* ══════════════ DRC (ADM1) ══════════════ */
    "COD|Nord-Kivu":     { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Sud-Kivu":      { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Tanganyika":    { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Tshopo":        { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Haut-Uele":     { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Bas-Uele":      { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Maniema":       { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Ituri":         { controller: "M23/AFC",          since: "2024-06-01", source: "M23" },
    "COD|Kinshasa":      { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kongo-Central": { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kwango":        { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kwilu":         { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Mai-Ndombe":    { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Équateur":      { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Mongala":       { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Nord-Ubangi":   { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Sud-Ubangi":    { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Tshuapa":       { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kasaï":         { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kasaï-Central": { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Kasaï-Oriental":{ controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Lomami":        { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Sankuru":       { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Haut-Katanga":  { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Haut-Lomami":   { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },
    "COD|Lualaba":       { controller: "Regering (FARDC)", since: "2019-01-24", source: "FARDC" },

    /* ══════════════ MYANMAR (ADM1) ══════════════ */
    "MMR|Rakhine":     { controller: "Arakan Army",     since: "2024-01-01", source: "AA" },
    "MMR|Kachin":      { controller: "KIA (Kachin)",    since: "2024-06-01", source: "KIA" },
    "MMR|Kayin":       { controller: "KNU (Karen)",     since: "2024-01-01", source: "KNU" },
    "MMR|Sagaing":     { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Magway":      { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Chin":        { controller: "NUG (verzet)",    since: "2024-01-01", source: "PDF" },
    "MMR|Bago":        { controller: "NUG (verzet)",    since: "2024-06-01", source: "PDF" },
    "MMR|Ayeyarwady":  { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Kayah":       { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Mandalay":    { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Mon":         { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Naypyitaw":   { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Shan":        { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Tanintharyi": { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },
    "MMR|Yangon":      { controller: "Militaire junta", since: "2021-02-01", source: "Tatmadaw" },

    /* ══════════════ PAKISTAN (ADM1) ══════════════ */
    "PAK|Islamabad":                       { controller: "Pakistan (Regering)",   since: "1947-08-14", source: "staat" },
    "PAK|Balochistan":                     { controller: "Afghanistan (Taliban)", since: "2024-01-01", source: "BLA" },
    "PAK|Khyber-Pakhtunkhwa":              { controller: "Afghanistan (Taliban)", since: "2024-01-01", source: "TTP" },
    "PAK|FederallyAdministeredTribalAr":   { controller: "Afghanistan (Taliban)", since: "2024-01-01", source: "TTP" },
    "PAK|AzadKashmir":                     { controller: "India (grens)",         since: "1947-10-22", source: "grens" },
    "PAK|Gilgit-Baltistan":                { controller: "India (grens)",         since: "1947-11-01", source: "grens" },
    "PAK|Punjab":                          { controller: "India (grens)",         since: "1947-08-14", source: "grens" },
    "PAK|Sindh":                           { controller: "India (grens)",         since: "1947-08-14", source: "grens" }
  };

  var COUNTRY_FALLBACK = {
    "SYR": { controller: "Al-Sharaa-regering", since: "2024-12-08", source: "fallback" },
    "UKR": { controller: "Oekraïne",           since: "2022-02-24", source: "fallback" },
    "YEM": { controller: "Houthi's",           since: "2014-09-21", source: "fallback" },
    "SAU": { controller: "Saoedi-Arabië",      since: "1932-09-23", source: "fallback" },
    "ISR": { controller: "Israël",             since: "1948-05-14", source: "fallback" },
    "PSE": { controller: "Palestina",          since: "1994-05-04", source: "fallback" },
    "SDN": { controller: "Regering",           since: "2024-01-01", source: "fallback" },
    "LBN": { controller: "Libanese staat",     since: "1990-10-13", source: "fallback" },
    "ETH": { controller: "Federale regering",  since: "1991-05-28", source: "fallback" },
    "MLI": { controller: "Junta (Regering)",   since: "2024-01-01", source: "fallback" },
    "BFA": { controller: "Junta (Regering)",   since: "2024-01-01", source: "fallback" },
    "NER": { controller: "Junta (Regering)",   since: "2024-01-01", source: "fallback" },
    "COD": { controller: "Regering (FARDC)",   since: "2019-01-24", source: "fallback" },
    "MMR": { controller: "Militaire junta",    since: "2021-02-01", source: "fallback" },
    "PAK": { controller: "Pakistan (Regering)", since: "1947-08-14", source: "fallback" }
  };

  function normalizeKey(s){
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[''`\-_.]/g, "")
      .replace(/\s+/g, "")
      .replace(/governorate|province|region|state|district/g, "");
  }

  function getBaseline(iso3, admin1, provinceName){
    if (!iso3) return null;
    var keys = [];
    if (admin1) keys.push(iso3 + "|" + admin1);
    if (provinceName) keys.push(iso3 + "|" + provinceName);

    for (var i = 0; i < keys.length; i++){
      if (BASELINE[keys[i]]) return BASELINE[keys[i]];
    }

    var candidates = [];
    if (admin1) candidates.push(normalizeKey(admin1));
    if (provinceName) candidates.push(normalizeKey(provinceName));

    var prefix = iso3 + "|";
    for (var k in BASELINE){
      if (!Object.prototype.hasOwnProperty.call(BASELINE, k)) continue;
      if (k.indexOf(prefix) !== 0) continue;
      var baselineKey = normalizeKey(k.substring(prefix.length));
      for (var j = 0; j < candidates.length; j++){
        var c = candidates[j];
        if (!c) continue;
        if (baselineKey === c) return BASELINE[k];
        if (baselineKey.length >= 4 && c.length >= 4){
          if (baselineKey.indexOf(c) !== -1 || c.indexOf(baselineKey) !== -1){
            return BASELINE[k];
          }
        }
      }
    }

    if (COUNTRY_FALLBACK[iso3]) return COUNTRY_FALLBACK[iso3];
    return null;
  }

  function setBaseline(iso3, admin1, controller, since, source){
    var key = iso3 + "|" + admin1;
    BASELINE[key] = {
      controller: controller,
      since: since || new Date().toISOString().slice(0, 10),
      source: source || "handmatig"
    };
    try {
      if (window.WDStorage) {
        WDStorage.set("baseline_" + key, JSON.stringify(BASELINE[key]));
      }
    } catch(e){}
    return BASELINE[key];
  }

  function loadLocalOverrides(){
    try {
      if (!window.WDStorage) return;
      var keys = Object.keys(localStorage);
      keys.forEach(function(k){
        if (k.indexOf("baseline_") === 0){
          var key = k.replace("baseline_", "");
          var val = localStorage.getItem(k);
          if (val){
            try { BASELINE[key] = JSON.parse(val); } catch(e){}
          }
        }
      });
    } catch(e){}
  }

  loadLocalOverrides();

  window.WDBaseline = {
    version: "v3.1",
    get: getBaseline,
    set: setBaseline,
    _all: BASELINE,
    _fallback: COUNTRY_FALLBACK
  };

  try {
    if (window.wdLog) {
      wdLog.info("[Baseline] v3.1 geladen — " +
        Object.keys(BASELINE).length + " exacte entries + " +
        Object.keys(COUNTRY_FALLBACK).length + " fallbacks (12 okt 2026)");
    }
  } catch(e){}

})();