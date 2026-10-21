/* ============ BUBIXO AKADEMI — uretilmis ses (iki sesli) ============
   app.js'e HIC DOKUNMAZ.

   HAVUZ : /audio/<dil>/v1/<ses>/<hash>.mp3      ses = "c" | "d"
   INDEKS: /audio/<dil>/audio-index.json  ->  {"c":{hash:1,...}, "d":{...}}

   SES SECIMI VERIDEN GELIR: bir metin hangi sesle uretildiyse indekste o
   bolumdedir. Yani yonlendirme icin cagri yerlerini degistirmek gerekmez —
   hash "d" bolumundeyse D, degilse C calar. Bu, dort kursta da app.js'e
   dokunmadan calismayi mumkun kilan sey.
   Yine de acik secim destekleniyor: speak(metin, "d") veya bxSes.cal(metin,"d").

   NEDEN speechSynthesis KATMANI: kurs sesi iki yoldan caliyor — speak() ve
   hikayenin "tumunu dinle" akisi (kendi SpeechSynthesisUtterance'ini kuruyor).
   Yalnizca speak() sarmalansaydi hikaye akisi disarida kalirdi.

   HASH: iki 32-bit FNV-1a varyanti (16 hex). crypto.subtle async, burasi
   senkron olmak zorunda. charCodeAt UTF-16 verdigi icin Node ile ayni.
   ==================================================================== */
(function () {
  "use strict";
  if (!("speechSynthesis" in window)) return;

  var DIL = (window.BX_SES_DIL || "tr");
  var KOK = "https://api.bubixo.com/audio/" + DIL + "/v1/";
  var IDX = (window.BX_AUDIO_IDX || ("audio/" + DIL + "/audio-index.json"));

  var idx = null;                 /* {c:Set, d:Set} */
  var ses = null;                 /* calan Audio */
  var kusak = 0;                  /* eski onend'ler yeni sesi kesmesin */
  var ipucu = null;               /* speak(metin,"d") ile gelen acik secim */

  function sesMetni(t) {
    return String(t == null ? "" : t).replace(/[Ѐ-ӿ؀-ۿ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function h32(s, seed) {
    var h = seed >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function hex8(n) { var x = n.toString(16); while (x.length < 8) x = "0" + x; return x; }
  function sesHash(t) { var s = sesMetni(t); return hex8(h32(s, 0x811c9dc5)) + hex8(h32(s, 0x01000193)); }

  try {
    fetch(IDX, { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        idx = { c: new Set(Object.keys(j.c || {})), d: new Set(Object.keys(j.d || {})) };
      })
      .catch(function () { });
  } catch (e) { }

  /* metin -> hangi ses? acik ipucu once, sonra indeks. yoksa null (= TTS) */
  function sesSec(h, acik) {
    if (!idx) return null;
    if (acik === "d" && idx.d.has(h)) return "d";
    if (acik === "c" && idx.c.has(h)) return "c";
    if (idx.d.has(h)) return "d";
    if (idx.c.has(h)) return "c";
    return null;
  }

  function durdur() {
    kusak++;
    if (ses) { try { ses.pause(); ses.src = ""; ses.load(); } catch (e) { } ses = null; }
  }

  var ss = window.speechSynthesis;
  var eskiCal = ss.speak.bind(ss);
  var eskiIptal = ss.cancel.bind(ss);

  ss.speak = function (u) {
    var acik = ipucu; ipucu = null;                 /* ipucu tek seferlik */
    var metin = u && u.text ? sesMetni(u.text) : "";
    var h = metin ? sesHash(metin) : "";
    var s = h ? sesSec(h, acik) : null;
    if (!s) {
      window.BX_SES_KAYNAK = "tts";
      return eskiCal(u);
    }
    /* Ust uste binmeyi kesin olarak onle: onceki her ne caliyorsa dursun. */
    durdur();
    try { eskiIptal(); } catch (e) { }
    var benim = kusak;
    window.BX_SES_KAYNAK = "mp3";
    var dustu = false;
    function dus() {
      if (dustu || benim !== kusak) return;
      dustu = true;
      window.BX_SES_KAYNAK = "tts";
      try { eskiCal(u); } catch (e) { if (u.onerror) u.onerror(); }
    }
    try {
      var a = new Audio(KOK + s + "/" + h + ".mp3");
      a.preload = "auto";
      /* TTS'te 0.9 normal, 0.65-0.7 yavas -> mp3'te 1.0 ve 0.75 */
      /* Normal hizda icerik turune gore oynatma hizi (yalniz Ingilizce kurs, 2026-10-07): yol.js window.bxNormalHiz
         tanimlar (cumle 0.85, hikaye 0.90, tek kelime 1.00). Tanimli degilse eskisi gibi 1.0. Yavas secimi 0.75 kalir. */
      var normal = 1.0;
      try { if (typeof window.bxNormalHiz === "function") normal = window.bxNormalHiz(metin) || 1.0; } catch (e) { }
      a.playbackRate = (u.rate && u.rate < 0.85) ? 0.75 : normal;
      /* Bir satir BITMEDEN sonraki baslamasin: onend yalnizca kendi kusaginda. */
      a.onended = function () { if (benim === kusak && u.onend) u.onend(); };
      a.onerror = dus;
      ses = a;
      var p = a.play();
      if (p && p.catch) p.catch(dus);
    } catch (e) { dus(); }
  };

  ss.cancel = function () { durdur(); return eskiIptal(); };

  /* speak(metin, "c"|"d") — acik ses secimi.
     Mevcut imzalar speak(text,onend,rate) ve speak(text,opt); hicbiri 2. argumana
     STRING vermiyor, bu yuzden bu ek guvenli. */
  var eskiSpeak = window.speak;
  if (typeof eskiSpeak === "function") {
    window.speak = function (metin, a2, a3) {
      if (typeof a2 === "string") { ipucu = a2 === "d" ? "d" : "c"; return eskiSpeak.call(this, metin); }
      return eskiSpeak.apply(this, arguments);
    };
  }

  window.bxSes = {
    hash: sesHash,
    hazir: function () { return !!idx; },
    sayi: function () { return idx ? { c: idx.c.size, d: idx.d.size } : null; },
    cal: function (metin, s) {
      ipucu = (s === "d") ? "d" : "c";
      var u = new SpeechSynthesisUtterance(metin); ss.speak(u);
    },
    dur: durdur,
    /* Teshis: new Audio() DOM'a eklenmeyen bir oge yaratir, bu yuzden
       document.querySelector("audio") onu BULAMAZ. Calan sesi buradan gorursun. */
    calan: function () { return ses ? { src: ses.src, duraklamis: ses.paused, hiz: ses.playbackRate } : null; }
  };
})();
