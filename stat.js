/* ================== BUBIXO AKADEMI — anonim olcum ==================
   Kisisel veri toplanmaz: cerez yok, parmak izi yok, ham IP sunucuda saklanmaz.
   Toplanan tek sey (kurs, olay, deger) sayaci.

   TASARIM: app.js'e HIC DOKUNMAZ. Ihtiyac duydugu her sey zaten global:
   showView / renderLesson / openStory / speak ve tek yazma noktasi store.write.
   Bunlar sarmalanir; sarmal bir hata verirse ORIJINAL fonksiyon yine calisir.

   Uc erisilemezse: olaylar sessizce dusurulur, konsola bile yazilmaz, kurs
   eksiksiz calismaya devam eder (TALIMAT §0.2).

   Kendi localStorage anahtari vardir (bx-stat-<kurs>); kursun ilerleme
   anahtarina (bx-tr-de vb.) ASLA yazmaz.
   =================================================================== */
(function () {
  "use strict";

  var KURS = String(window.BX_KURS || "").slice(0, 4);
  /* "tren" = Ingilizce konusanlara Turkce (/learn-turkish/); "en" ise
     Turklere Ingilizce. Ikisi AYRI kurstur, ayri sayilir. */
  if (!/^(en|ru|ar|de|tren)$/.test(KURS)) return;     /* tanimsizsa hic calisma */

  var UC = "https://api.bubixo.com/akademi/api/stat";
  var ANAHTAR = "bx-stat-" + KURS;
  var ARA = 10000;                                 /* toplu gonderim araligi */
  var TAVAN = 60;                                    /* tek istekte olay tavani */

  var kuyruk = [];
  var kapali = false;                                 /* ust uste hata -> sus */
  var hata = 0;

  function yaz(e, v) {
    if (kapali) return;
    var o = { c: KURS, e: e };
    if (v != null && v !== "") o.v = String(v).slice(0, 40);
    kuyruk.push(o);
    if (kuyruk.length >= TAVAN) bosalt();
  }

  function bosalt(kapanis) {
    if (kapali || !kuyruk.length) return;
    var paket = kuyruk.splice(0, TAVAN);
    var govde = JSON.stringify(paket);
    try {
      /* text/plain -> "basit istek": tarayici on-ucus (OPTIONS) YAPMAZ */
      var blob = new Blob([govde], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon && navigator.sendBeacon(UC, blob)) return;
      if (kapanis) return;                             /* kapanista fetch'e guvenme */
      fetch(UC, {
        method: "POST", body: govde, mode: "cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" }
      })
        .catch(function () { if (++hata >= 3) kapali = true; });
    } catch (e) { if (++hata >= 3) kapali = true; }
  }

  setInterval(function () { bosalt(false); }, ARA);
  addEventListener("pagehide", function () { bosalt(true); });
  addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") bosalt(true);
  });

  /* ---------- ziyaret + 2./7. gun donusu ---------- */
  (function () {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(ANAHTAR) || "{}") || {}; } catch (e) { }
    var bugun = new Date().toISOString().slice(0, 10);
    if (!d.ilk) d.ilk = bugun;
    if (d.son !== bugun) {
      d.son = bugun;
      yaz("visit");
      var gecen = Math.round((Date.parse(bugun) - Date.parse(d.ilk)) / 86400000);
      if (gecen >= 1 && !d.g2) { d.g2 = 1; yaz("day2"); }
      if (gecen >= 6 && !d.g7) { d.g7 = 1; yaz("day7"); }
    }
    try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); } catch (e) { }
  })();

  /* ---------- global fonksiyonlari sarmala ---------- */
  function sarmala(ad, once) {
    var f = window[ad];
    if (typeof f !== "function") return;
    window[ad] = function () {
      try { once.apply(null, arguments); } catch (e) { }      /* olcum kursu bozamaz */
      return f.apply(this, arguments);
    };
  }
  sarmala("showView", function (v) { yaz("tab", v); });
  sarmala("renderLesson", function (id) { yaz("lesson_open", id); });
  sarmala("openStory", function (id) { yaz("story_open", id); });
  sarmala("speak", function () { yaz("audio_play", window.BX_SES_KAYNAK || "tts"); });

  /* ---------- store.write'i izle: durum gecislerinden olay uret ---------- */
  (function () {
    if (typeof store !== "object" || typeof store.write !== "function") return;
    var eskiYaz = store.write;
    var onceki = null;

    function ozet(S) {
      var u = {}, t = {}, k = {};
      var su = S.units || {};
      for (var i in su) u[i] = (su[i] && su[i].done) ? 1 : 0;
      var st = S.tales || {};
      for (var j in st) t[j] = 1;
      var sk = (S.kur && S.kur.done) || {};
      for (var m in sk) k[m] = 1;
      return { u: u, t: t, k: k, tur: (S.games && S.games.rounds) || 0 };
    }

    store.write = function (S) {
      try {
        var y = ozet(S);
        if (onceki) {
          for (var i in y.u) if (y.u[i] && !onceki.u[i]) yaz("lesson_done", i);
          for (var j in y.t) if (!onceki.t[j]) yaz("story_done", j);
          for (var m in y.k) if (!onceki.k[m]) yaz("builder_done", m);
          if (y.tur > onceki.tur) yaz("game_round", window.BX_OYUN || "-");
        }
        onceki = y;
      } catch (e) { }
      return eskiYaz.apply(this, arguments);
    };
    try { onceki = ozet(S); } catch (e) { }
  })();

  /* ---------- quiz sonucu: ders ekranindaki puan kutusunu izle ---------- */
  (function () {
    var gorulen = "";
    new MutationObserver(function () {
      var el = document.getElementById("qscore");
      if (!el) return;
      var m = (el.textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      var imza = (window.BX_DERS || "") + ":" + m[0];
      if (imza === gorulen) return;
      gorulen = imza;
      var oran = parseInt(m[1], 10) / parseInt(m[2], 10);
      yaz(oran >= 0.6 ? "quiz_pass" : "quiz_fail", window.BX_DERS || "-");
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  })();
  /* hangi derste oldugumuzu quiz izleyicisine bildir */
  sarmala("renderLesson", function (id) { window.BX_DERS = id; });
  sarmala("renderTense", function (id) { window.BX_DERS = id; });

  /* ---------- ceviri paneli ve PWA kurulumu ---------- */
  addEventListener("click", function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest(".cev-btn")) yaz("translate");
  }, true);
  addEventListener("appinstalled", function () { yaz("install"); });

  /* disari acilan tek yuzey: baska modullerin olay yazabilmesi icin */
  window.bxStat = yaz;
})();
