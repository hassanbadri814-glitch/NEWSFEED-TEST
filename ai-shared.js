/* ============================================================
   WAR DESK — ai-shared.js v1.0
   Centrale utilities voor alle AI-modules
   - Backward-compatible: modules kunnen eigen code blijven gebruiken
   - 0% risico: als dit bestand niet laadt, blijven modules werken
   ============================================================ */

(function(){
  "use strict";

  /* ============================================================
     STOP_WORDS — alle ruis-woorden voor trending/dedup/summary
     ============================================================ */
  var STOP_WORDS = {};
  [
    // NL voegwoorden / lidwoorden
    "de","het","een","van","en","in","is","op","dat","voor","met","zijn","er","aan","om",
    "ook","als","maar","bij","of","uit","dan","naar","nog","wel","geen","kan","meer","wordt",
    "door","over","ze","zich","niet","heeft","hebben","worden","deze","dit","tot","je","u",
    "we","ik","hij","zij","jij","mijn","jouw","ons","onze",
    // EN voegwoorden / lidwoorden
    "the","and","for","with","that","this","from","have","has","are","was","were","will",
    "been","they","their","you","your",
    // Werkwoorden (meningen, acties)
    "says","said","say","after","before","during","about","into","under","more","less",
    "just","also","new","two","three","first","last","next","back","against",
    "between","through","which","what","when","where","who","how","why","than","then","very",
    "much","many","some","only","even","still","being","does","did","done",
    "via","per","alweer","hadden","zullen","zou","kunnen","moet","moeten","mag","mogen",
    "laat","laten","gaat","gaan","komt","komen","weer","toch","want","omdat",
    "terwijl","tijdens","volgens","binnen","buiten","tussen","tegen","zonder",
    // Media-termen
    "speech","handen","hand","thing","things","people","man","woman","day","days",
    "year","years","week","month","today","tomorrow","yesterday","time","times",
    "make","made","take","took","give","gave","come","came","look","looked",
    "think","thought","know","knew","want","wanted","need","needed","find","found",
    "video","videos","photo","photos","report","reports","update","updates",
    "nieuws","foto","fotos","bericht","berichten",
    // Rollen / titels
    "minister","president","prime","premier","king","queen","leader","chief",
    "official","officials","spokesman","spokesperson","general","doctor","dr",
    "mr","mrs","ms","lord","sir","uncle","aunt","brother","sister",
    // Journalistieke werkwoorden
    "told","called","asked","urged","warned","claimed","denied",
    "confirmed","announced","declared","stated","reported","added"
  ].forEach(function(w){ STOP_WORDS[w] = true; });

  /* ============================================================
     NL_WORDS — voor taal-detectie in ai-summary
     ============================================================ */
  var NL_WORDS = {
    "de":1,"het":1,"een":1,"van":1,"en":1,"op":1,
    "dat":1,"voor":1,"met":1,"zijn":1,"er":1,"aan":1,
    "om":1,"ook":1,"als":1,"maar":1,"bij":1,"of":1,
    "uit":1,"dan":1,"naar":1,"nog":1,"wel":1,"geen":1,
    "kan":1,"meer":1,"wordt":1,"door":1,"over":1,
    "niet":1,"heeft":1,"hebben":1,"worden":1,"deze":1,
    "dit":1,"tot":1,"zal":1,"kon":1,"kunnen":1
  };

  /* ============================================================
     NL_SOURCES — voor taalprioriteit in ai-summary
     ============================================================ */
  var NL_SOURCES = {
    "nos":1, "nos.nl":1, "nos nieuws":1, "nos sport":1,
    "nu.nl":1, "nu":1,
    "ad.nl":1, "ad":1,
    "de telegraaf":1, "telegraaf":1,
    "volkskrant":1, "de volkskrant":1,
    "nrc":1, "nrc handelsblad":1,
    "trouw":1, "parool":1, "het parool":1,
    "fd":1, "het financieele dagblad":1,
    "rtl nieuws":1, "rtl":1,
    "bnr":1, "bnr nieuwsradio":1,
    "dutchnews":1, "nltimes":1
  };

  /* ============================================================
     getTimestamp — robuust, pakt JONGSTE van alle datumvelden
     Bron: ai-map.js v1.3
     ============================================================ */
  function getTimestamp(a) {
    if (!a) return 0;
    var fields = ["pubDate","published","isoDate","date","timestamp","time","created","updated"];
    var candidates = [];
    for (var i = 0; i < fields.length; i++) {
      var v = a[fields[i]];
      if (!v) continue;
      var t;
      if (typeof v === "number") {
        t = v < 100000000000 ? v * 1000 : v;
      } else {
        t = new Date(v).getTime();
      }
      if (!isNaN(t) && t > 946684800000 && t < Date.now() + 86400000) {
        candidates.push(t);
      }
    }
    if (!candidates.length) return 0;
    candidates.sort(function(x, y){ return y - x; });
    return candidates[0];
  }

  /* ============================================================
     tokenize — lowercase, verwijder leestekens, split
     ============================================================ */
  function tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^\w\sÀ-ÿ]/g, " ")
      .split(/\s+/)
      .filter(function(w){ return w.length > 0; });
  }

  /* ============================================================
     jaccard — similarity tussen twee sets
     ============================================================ */
  function jaccard(setA, setB) {
    var inter = 0;
    for (var k in setA) if (setB[k]) inter++;
    var union = 0;
    for (var k2 in setA) union++;
    for (var k3 in setB) if (!setA[k3]) union++;
    return union === 0 ? 0 : inter / union;
  }

  /* ============================================================
     containment — hoeveel % van kleine set zit in grote set
     ============================================================ */
  function containment(small, big) {
    var total = 0, found = 0;
    for (var k in small) {
      total++;
      if (big[k]) found++;
    }
    return total === 0 ? 0 : found / total;
  }

  /* ============================================================
     similarity — Jaccard voor zinnen (ai-summary/dedup stijl)
     ============================================================ */
  function similarity(a, b) {
    var ta = tokenize(a).filter(function(w){ return w.length > 3; });
    var tb = tokenize(b).filter(function(w){ return w.length > 3; });
    if (!ta.length || !tb.length) return 0;
    var setA = {};
    for (var i = 0; i < ta.length; i++) setA[ta[i]] = 1;
    var setB = {};
    for (var j = 0; j < tb.length; j++) setB[tb[j]] = 1;
    return jaccard(setA, setB);
  }

  /* ============================================================
     timeAgo — universele tijdsnotatie
     ============================================================ */
  function timeAgo(d) {
    var t = (typeof d === "number") ? d : new Date(d).getTime();
    if (isNaN(t) || !t) return "";
    var diff = (Date.now() - t) / 1000;
    if (diff < 60) return "nu";
    if (diff < 3600) return Math.floor(diff / 60) + " min";
    if (diff < 86400) return Math.floor(diff / 3600) + " u";
    return Math.floor(diff / 86400) + " d";
  }

  /* ============================================================
     isNLSource — check of source een NL-bron is
     ============================================================ */
  function isNLSource(source) {
    var s = String(source || "").toLowerCase().trim();
    if (!s) return false;
    for (var k in NL_SOURCES) {
      if (s === k || s.indexOf(k) !== -1) return true;
    }
    return false;
  }

  /* ============================================================
     detectDutch — percentage NL-woorden in tekst
     ============================================================ */
  function detectDutch(text) {
    var words = String(text || "").toLowerCase().replace(/[^\w\sÀ-ÿ]/g, " ").split(/\s+/);
    if (!words.length) return 0;
    var hits = 0;
    for (var i = 0; i < words.length; i++) {
      if (NL_WORDS[words[i]]) hits++;
    }
    return hits / words.length;
  }

  /* ============================================================
     safeLog — logging met fallback
     ============================================================ */
  function safeLog(prefix, msg) {
    try {
      if (window.wdLog) {
        if (typeof msg === "string") wdLog.info("[" + prefix + "] " + msg);
        else wdLog.info("[" + prefix + "]", msg);
      }
    } catch(e){}
  }

  /* ============================================================
     EXPORT — globaal beschikbaar voor alle modules
     ============================================================ */
  window.AIShared = {
    version: "v1.0",
    STOP_WORDS: STOP_WORDS,
    NL_WORDS: NL_WORDS,
    NL_SOURCES: NL_SOURCES,
    getTimestamp: getTimestamp,
    tokenize: tokenize,
    jaccard: jaccard,
    containment: containment,
    similarity: similarity,
    timeAgo: timeAgo,
    isNLSource: isNLSource,
    detectDutch: detectDutch,
    safeLog: safeLog
  };

  if (window.wdLog) {
    wdLog.info("[WAR DESK] ai-shared.js " + window.AIShared.version + " geladen — " +
      Object.keys(STOP_WORDS).length + " stopwords, " +
      Object.keys(NL_SOURCES).length + " NL bronnen");
  }

})();