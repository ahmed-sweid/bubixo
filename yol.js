/* ================== BUBIXO INGILIZCE — OGRENME YOLU (v3) ==================
   Panel (dashboard) + A1→A2 ogrenme yolu + ilerleme + kelime tekrar sistemi
   (aralikli tekrar) + dinleme / konusma alistirmalari + seviye testi +
   "AI ile Konusma Pratigi" arayuzu.

   KURALLAR (bozulmasin):
   - app.js'e ve data*.js'e DOKUNMAZ. Gerekenler zaten global: S, store, speak,
     showView, renderLesson, renderTense, openStory, startDeck, grade, UNITS ...
     Sarmallar try/catch icinde; sarmal patlarsa ORIJINAL fonksiyon yine calisir.
   - Ilerleme ayni anahtarda (bx-eng) S.yol altinda tutulur. Eski alanlara
     (units, words, tales, kur, games) YAZMAZ; yalnizca okur. Deste kartlarinin
     durumu S.yol.vocab'a KOPYALANIR (tasima degil — S.words aynen kalir).
   - SES: yeni ses URETILMEZ. Alistirmalar yalnizca kursun MEVCUT metinlerini
     speak() ile calar; ses.js bu metinlerin hash'iyle /audio/en/v1/<c|d>/
     altindaki ElevenLabs mp3'unu bulur. Metin bayt bayt ayni olmali — bu
     yuzden kurs metinleri burada DEGISTIRILMEDEN kullanilir.
     Hiz secimi (0.75x / 1x) yalnizca oynatma hizidir (HTMLAudio.playbackRate,
     ses.js'te); dosyaya dokunmaz.
   - Sahte ilerleme yok: her yuzde, gercekten kaydedilmis bir sonuctan hesaplanir.
   ========================================================================= */
(function () {
  "use strict";
  if (typeof S === "undefined" || typeof store !== "object" || typeof showView !== "function" ||
    typeof UNITS === "undefined" || typeof WORDS === "undefined") return;

  var VARLIK = (typeof window !== "undefined" && window.BX_VARLIK_KOK) ? window.BX_VARLIK_KOK : "./";
  var GUN = 864e5;

  /* ---------- CSS: alt sayfalar yalniz kurs.css'i baglar, burada eklenir ---------- */
  (function () {
    if (document.querySelector('link[href*="/ingilizce/yol.css"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = VARLIK + "yol.css";
    document.head.appendChild(l);
  })();

  /* ---------- durum ---------- */
  var Y = S.yol = (S.yol && typeof S.yol === "object") ? S.yol : {};
  Y.vocab = Y.vocab || {};     /* {"water":{b:kutu,d:vade(ms),l:yanlis,n:dogru}} */
  Y.gram = Y.gram || {};     /* {g2:{d:dogru,t:toplam}} gramer mini testi en iyi sonuc */
  Y.dinle = Y.dinle || {};     /* {b1:0.75} dinleme alistirmasi en iyi oran */
  Y.konus = Y.konus || {};     /* {b1:1} konusma (shadowing) bitti */
  Y.test = Y.test || {};     /* {b1:0.875} bolum mini testi en iyi oran */
  Y.ai = Y.ai || {};     /* {kafe:1} rehberli konusma senaryosu bitti */
  Y.hiz = (Y.hiz === 0.75) ? 0.75 : 1;
  /* ---------- ilerleme deposu (soyut) ----------
     Bugun: LocalStorageProgressStore — app.js'in kendi store'u uzerinden ayni anahtar (bx-eng).
     Ileride hesap tabanli saklama icin ayni arayuzle APIProgressStore yazilip
     progressStore.kullan(APIProgressStore) denir; bu dosyadaki kayit noktalari degismez.
     TODO(hesap): APIProgressStore = {ad:"api", yukle:function(){...}, kaydet:function(durum){...}}
     — sunucu tarafi YOK; maliyet olusturmamak icin bilerek yazilmadi.
     Not: app.js'in kendi yazmalari (ders, deste, hikaye...) dogrudan store.write'tan gecer;
     API'ye geciste store.write bu depoya yonlendirilmelidir. */
  var LocalStorageProgressStore = {
    ad: "localStorage",
    yukle: function () { return store.read(); },
    kaydet: function (durum) { store.write(durum); }
  };
  var progressStore = {
    arka: LocalStorageProgressStore,
    kullan: function (yeni) { if (yeni && typeof yeni.kaydet === "function") this.arka = yeni; },
    kaydet: function () { this.arka.kaydet(S); }
  };
  function kaydet() { progressStore.kaydet(); }

  /* ---------- kucuk yardimcilar ---------- */
  function $q(s) { return document.querySelector(s); }
  function h(s) { return esc(String(s == null ? "" : s)); }
  function karistir(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sec(a, n) { return karistir(a).slice(0, n); }
  function gunSonu() { var d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
  function normal(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9ğüşöçıâ ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function yuzde(a, b) { return b ? Math.round(a / b * 100) : 0; }
  var UNIT = function (id) { return UNITS.find(function (x) { return x.id === id; }); };
  var TENSE = function (id) { return TENSES.find(function (x) { return x.id === id; }); };
  var DECK = function (id) { return DECKS.find(function (x) { return x.id === id; }); };
  var STORY = function (id) { return STORIES.find(function (x) { return x.id === id; }); };
  var KUR_AD = { question: "Soru", present: "Geniş Zaman", past: "Geçmiş Zaman", future: "Gelecek Zaman" };
  var SEV_AD = ["", "Kolay", "Orta", "Zor"];
  var HOP = typeof SPK === "string" ? SPK : "";

  /* ======================= OGRENME YOLU TANIMI =======================
     Mevcut icerigin TAMAMI bes bolume dagitildi (10 ders, 10 deste, 6 gramer,
     12 cumle-kur seti, 12 hikaye) — hicbiri disarida kalmadi, hicbiri silinmedi. */
  var BOLUMLER = [
    {
      id: "b1", sev: "A1", ad: "Başlangıç", alt: "Alfabe, selamlaşma ve “olmak” fiili — ilk cümlelerin.",
      ders: ["u1", "u2", "u3"], deste: ["d1", "d7"], gramer: ["g1"], kur: ["question-1"], hikaye: ["s3"],
      sozluk: { bas: 0, son: 1000, n: 30 }
    },
    {
      id: "b2", sev: "A1", ad: "Temel İngilizce", alt: "Sayılar, saat, aile ve günlük rutin — geniş zaman.",
      ders: ["u4", "u5", "u6"], deste: ["d3", "d4", "d10"], gramer: ["g2"], kur: ["present-1"], hikaye: ["s1", "s4"],
      sozluk: { bas: 0, son: 1000, n: 60 }
    },
    {
      id: "b3", sev: "A1", ad: "Günlük Hayat", alt: "Restoranda sipariş, yol sorma ve alışveriş.",
      ders: ["u7", "u8", "u9"], deste: ["d2", "d5", "d9"], gramer: ["g3"], kur: ["question-2", "present-2"], hikaye: ["s2"],
      sozluk: { bas: 0, son: 1000, n: 100 }
    },
    {
      id: "b4", sev: "A2", ad: "Günlük İngilizce", alt: "Geçmişten ve gelecekten bahset: was/were, past simple, will/going to.",
      ders: ["u10"], deste: ["d6", "d8"], gramer: ["g4", "g5"], kur: ["past-1", "past-2", "future-1", "future-2"], hikaye: ["s5", "s6", "s7", "s8"],
      sozluk: { bas: 0, son: 1000, n: 150 }
    },
    {
      id: "b5", sev: "A2", ad: "Konuşma ve Anlama", alt: "Uzun hikâyeler, present perfect ve zor cümle kurma.",
      ders: [], deste: [], gramer: ["g6"], kur: ["question-3", "present-3", "past-3", "future-3"], hikaye: ["s9", "s10", "s11", "s12"],
      sozluk: { bas: 1000, son: 2000, n: 50 }
    }
  ];
  var BOLUM = function (id) { return BOLUMLER.find(function (b) { return b.id === id; }); };
  function bolumAd(b) { return b.sev + " – " + b.ad; }

  /* ======================= KELIME TEKRAR SISTEMI =======================
     Kutu (b) 0-6. Dogru → bir ust kutu, aralik uzar; yanlis → kutu 0 ve
     10 dk sonra yeniden. Cok yanlis yapilan kelimenin (l>=2) araliklari
     kisalir: zorlandigin kelime daha sik gelir.
     Durumlar: Yeni (hic gorulmedi) · Ogreniliyor · Tekrar zamani (vadesi geldi)
     · Ogrenildi (kutu >= 3: en az 3 kez, aralikli olarak dogru). */
  var ARALIK = [0, 1, 3, 7, 16, 35, 75];       /* gun */
  var VK = {};                                  /* anahtar -> {e,t,m,i} */
  function anahtar(s) { return String(s).toLowerCase().trim(); }
  WORDS.forEach(function (w, i) { var k = anahtar(w.e); if (!VK[k]) VK[k] = { e: w.e, t: w.t, m: w.m || "", i: i }; });
  DECKS.forEach(function (d) { d.words.forEach(function (w) { var k = anahtar(w.en); if (!VK[k]) VK[k] = { e: w.en, t: w.tr, m: "", i: -1 }; }); });

  function vNot(k, q) {                          /* q: 0 bilemedim, 1 zor, 2 bildim */
    var now = Date.now();
    var v = Y.vocab[k] || { b: 0, d: 0, l: 0, n: 0 };
    if (q === 0) { v.b = 0; v.l = (v.l || 0) + 1; v.d = now + 10 * 60e3; }
    else if (q === 1) { v.b = Math.max(1, v.b); v.d = now + GUN; }
    else {
      v.b = Math.min((v.b || 0) + 1, ARALIK.length - 1);
      var gun = ARALIK[v.b];
      if ((v.l || 0) >= 2) gun = Math.max(1, Math.round(gun * 0.6));
      v.d = now + gun * GUN; v.n = (v.n || 0) + 1;
    }
    Y.vocab[k] = v;
    return v;
  }
  function vDurum(k) {
    var v = Y.vocab[k];
    if (!v) return "yeni";
    if (v.d <= gunSonu()) return "tekrar";
    return v.b >= 3 ? "ogrenildi" : "ogreniliyor";
  }
  function vSayim() {
    var o = { yeni: 0, ogreniliyor: 0, tekrar: 0, ogrenildi: 0 };
    WORDS.forEach(function (w) { o[vDurum(anahtar(w.e))]++; });
    return o;
  }
  function vadesiGelen() {
    var son = gunSonu();
    return Object.keys(Y.vocab).filter(function (k) { return VK[k] && Y.vocab[k].d <= son; })
      .sort(function (a, b) { return Y.vocab[a].d - Y.vocab[b].d || (Y.vocab[b].l || 0) - (Y.vocab[a].l || 0); });
  }
  function ogrenilenSayisi() { return Object.keys(Y.vocab).filter(function (k) { return Y.vocab[k].b >= 3; }).length; }
  function sozlukSayisi(z) {
    return Object.keys(Y.vocab).filter(function (k) { var x = VK[k]; return x && x.i >= z.bas && x.i < z.son && Y.vocab[k].b >= 1; }).length;
  }

  /* Tek seferlik: deste kartlarindaki mevcut cevaplar kelime sistemine KOPYALANIR.
     S.words degismez; yalnizca daha once ogrenilmis kelimeler "yeni" gorunmesin diye. */
  if (!Y.mig1) {
    try {
      DECKS.forEach(function (d) {
        d.words.forEach(function (w, i) {
          var st = S.words[d.id + ":" + i]; if (!st) return;
          var k = anahtar(w.en); if (Y.vocab[k]) return;
          Y.vocab[k] = { b: st.box | 0, d: st.due || 0, l: (st.box | 0) === 0 ? 1 : 0, n: st.box | 0 };
        });
      });
    } catch (e) { }
    Y.mig1 = 1;
    kaydet();
  }

  /* ======================= ILERLEME =======================
     Her ogenin "bitti" olcutu gercek bir kayda dayanir:
     ders = mini test 4/5 (app.js) · deste = her kart en az bir kez "Bildim"
     gramer = mini test en az 2/3 · cumle kur = set sonuna gelindi (app.js)
     hikaye = okundu (app.js) · dinleme / mini test = en az %70 · konusma = 5 cumle tekrar edildi */
  function oranGecti(x) { return (x || 0) >= 0.7; }
  function gramerGecti(g) { return !!g && g.t > 0 && g.d / g.t >= 0.66; }
  function ogeler(b) {
    var L = [];
    b.ders.forEach(function (id) {
      var u = UNIT(id), st = S.units[id] || {};
      if (!u) return;
      L.push({
        tip: "ders", ad: "Ders " + (UNITS.indexOf(u) + 1) + " · " + u.title,
        alt: "~" + u.mins + " dk · anlatım + 5 soruluk test" + (st.score != null ? " · son: " + st.score + "/5" : ""),
        done: !!st.done, ac: function () { git("ders", id); }
      });
    });
    b.deste.forEach(function (id) {
      var d = DECK(id); if (!d) return;
      var bil = d.words.filter(function (w, i) { return ((S.words[id + ":" + i] || {}).box || 0) >= 1; }).length;
      L.push({
        tip: "kelime", ad: d.title + " destesi", alt: bil + "/" + d.words.length + " kart bilindi",
        done: bil === d.words.length, ac: function () { git("deste", id); }
      });
    });
    var z = b.sozluk, zn = Math.min(sozlukSayisi(z), z.n);
    L.push({
      tip: "kelime", ad: "Sözlük: " + (z.bas + 1) + "–" + z.son + " arasından " + z.n + " kelime",
      alt: zn + "/" + z.n + " kelime en az bir kez doğru", done: zn >= z.n,
      ac: function () { tekrarAc({ bas: z.bas, son: z.son }); }
    });
    b.gramer.forEach(function (id) {
      var t = TENSE(id), g = Y.gram[id]; if (!t) return;
      L.push({
        tip: "gramer", ad: t.title, alt: g ? "en iyi: " + g.d + "/" + g.t : "formül + örnekler + mini test",
        done: gramerGecti(g), ac: function () { git("gramer", id); }
      });
    });
    L.push({
      tip: "dinleme", ad: "Dinleme alıştırması", alt: Y.dinle[b.id] != null ? "en iyi: %" + Math.round(Y.dinle[b.id] * 100) : "8 soru · seç, eksik kelimeyi bul, sırala",
      done: oranGecti(Y.dinle[b.id]), ac: function () { dinlemeAc(b); }
    });
    b.kur.forEach(function (k) {
      var p = k.split("-"), sk = S.kur.done[k];
      var n = BUILDER.filter(function (x) { return x.cat === p[0] && x.lvl === +p[1]; }).length;
      L.push({
        tip: "cumle", ad: "Cümle kur · " + KUR_AD[p[0]] + " (" + SEV_AD[+p[1]] + ")",
        alt: sk != null ? "son tur: " + sk + "/" + n : n + " cümle", done: sk != null, ac: function () { git("kur", k); }
      });
    });
    b.hikaye.forEach(function (id) {
      var s = STORY(id); if (!s) return;
      L.push({
        tip: "hikaye", ad: s.title, alt: s.titleTr + " · " + s.lines.length + " satır, sesli",
        done: !!S.tales[id], ac: function () { git("hikaye", id); }
      });
    });
    L.push({
      tip: "konusma", ad: "Konuşma: dinle ve tekrar et", alt: "5 kısa cümle · shadowing",
      done: !!Y.konus[b.id], ac: function () { konusmaAc(b); }
    });
    L.push({
      tip: "test", ad: "Bölüm mini testi", alt: Y.test[b.id] != null ? "en iyi: %" + Math.round(Y.test[b.id] * 100) : "8 soru · geçmek için %70",
      done: oranGecti(Y.test[b.id]), ac: function () { testAc(b); }
    });
    return L;
  }
  function bolumDurum(b) { var L = ogeler(b); var d = L.filter(function (o) { return o.done; }).length; return { L: L, d: d, t: L.length }; }
  function seviyeDurum(sev) {
    var d = 0, t = 0;
    BOLUMLER.forEach(function (b) { if (b.sev !== sev) return; var x = bolumDurum(b); d += x.d; t += x.t; });
    return { d: d, t: t, p: yuzde(d, t) };
  }
  function aktifBolum() {
    var o = Y.odak && BOLUM(Y.odak);
    if (o) { var x = bolumDurum(o); if (x.d < x.t) return o; }
    for (var i = 0; i < BOLUMLER.length; i++) { var y = bolumDurum(BOLUMLER[i]); if (y.d < y.t) return BOLUMLER[i]; }
    return BOLUMLER[BOLUMLER.length - 1];
  }
  function basladiMi() {
    return !!(Y.last || Object.keys(S.units).length || Object.keys(S.tales).length ||
      Object.keys(S.words).length || Object.keys(Y.vocab).length || Object.keys(S.kur.done).length);
  }

  /* ======================= GEZINME ======================= */
  var yolIc = false;
  function yolGoster(fn) { yolIc = true; try { showView("yol"); } finally { yolIc = false; } if (fn) { document.body.classList.add("yl-ic"); fn(); } }
  function git(tip, id) {
    if (tip === "ders") { showView("dersler"); renderLesson(id); }
    else if (tip === "gramer") { showView("gramer"); renderTense(id); }
    else if (tip === "hikaye") { showView("hikaye"); openStory(id); }
    else if (tip === "deste") { showView("kelime"); startDeck(id); }
    else if (tip === "kur") { var p = id.split("-"); S.kur.cat = p[0]; S.kur.lvl = +p[1]; kaydet(); showView("kur"); }
    else if (tip === "dinleme") { var b1 = BOLUM(id); if (b1) dinlemeAc(b1); }
    else if (tip === "konusma") { var b2 = BOLUM(id); if (b2) konusmaAc(b2); }
    else if (tip === "test") { var b3 = BOLUM(id); if (b3) testAc(b3); }
    else if (tip === "tekrar") { tekrarAc({}); }
    else if (tip === "ai") { aiAc(id); }
    else if (tip === "seviye") { seviyeAc(); }
    else if (tip === "diyalog") { diyalogAc(id); }
    else if (tip === "telaffuz") { telaffuzAc(id); }
    else if (tip === "golge") { golgeAc(id); }
    else if (tip === "dtest") { dtestAc(id); }
    else showView(tip);
  }
  function sonYer(o) { o.ts = Date.now(); Y.last = o; kaydet(); }
  function sonEtiket(L) {
    if (!L) return "";
    var u, t, s, d, b, p;
    switch (L.t) {
      case "ders": u = UNIT(L.id); return u ? "Ders " + (UNITS.indexOf(u) + 1) + " · " + u.title : "";
      case "gramer": t = TENSE(L.id); return t ? "Gramer · " + t.title : "";
      case "hikaye": s = STORY(L.id); return s ? "Hikâye · " + s.title + " (" + s.titleTr + ")" : "";
      case "deste": d = DECK(L.id); return d ? "Kelime destesi · " + d.title : "";
      case "kur": p = String(L.id).split("-"); return "Cümle kur · " + (KUR_AD[p[0]] || "") + " (" + (SEV_AD[+p[1]] || "") + ")";
      case "dinleme": b = BOLUM(L.id); return b ? "Dinleme alıştırması · " + bolumAd(b) : "";
      case "konusma": b = BOLUM(L.id); return b ? "Konuşma pratiği · " + bolumAd(b) : "";
      case "test": b = BOLUM(L.id); return b ? "Mini test · " + bolumAd(b) : "";
      case "tekrar": return "Kelime tekrarı";
      case "ai": var sc = SENARYO.find(function (x) { return x.id === L.id; }); return sc ? "AI konuşma · " + sc.ad : "";
      case "diyalog": return L.ad ? "Diyalog · " + L.ad : "";
      case "telaffuz": return L.ad ? "Telaffuz · " + L.ad : "";
      case "golge": return L.ad || "";
      case "dtest": return L.ad || "";
    }
    return "";
  }

  /* ---------- sarmallar: son kalinan yer + gramer sonucu ---------- */
  function sarmala(ad, once) {
    var f = window[ad]; if (typeof f !== "function") return;
    window[ad] = function () { try { once.apply(null, arguments); } catch (e) { } return f.apply(this, arguments); };
  }
  var aktifGramer = null;
  sarmala("renderLesson", function (id) { sonYer({ t: "ders", id: id }); });
  var gramerImza = "";
  sarmala("renderTense", function (id) { aktifGramer = id; gramerImza = ""; sonYer({ t: "gramer", id: id }); });
  sarmala("openStory", function (id) { sonYer({ t: "hikaye", id: id }); });
  sarmala("startDeck", function (id) { sonYer({ t: "deste", id: id }); });
  sarmala("renderKur", function () { sonYer({ t: "kur", id: S.kur.cat + "-" + S.kur.lvl }); });

  /* Deste kartlari "Bildim/Bilemedim" -> ayni kelime tekrar sisteminde de islenir.
     grade() kendisi store.write cagirdigi icin burada yazmaya gerek yok. */
  (function () {
    var f = window.grade; if (typeof f !== "function") return;
    window.grade = function (key, ok) {
      try {
        var p = String(key).split(":"), d = DECK(p[0]), w = d && d.words[+p[1]];
        if (w) vNot(anahtar(w.en), ok ? 2 : 0);
      } catch (e) { }
      return f.apply(this, arguments);
    };
  })();

  /* Gramer mini testi sonucu app.js'te saklanmiyor; puan kutusundan okunur. */
  (function () {
    var kok = document.getElementById("v-gramer"); if (!kok || !window.MutationObserver) return;
    new MutationObserver(function () {
      var el = document.getElementById("gscore");
      if (!el || !aktifGramer) return;
      var m = el.textContent.match(/(\d+)\/(\d+)/); if (!m) return;
      var imza = aktifGramer + "|" + el.textContent;
      if (imza === gramerImza) return; gramerImza = imza;     /* renderTense her acilista sifirlar: ayni puanla tekrar da kaydedilir */
      var d = +m[1], t = +m[2], eski = Y.gram[aktifGramer], konu = TENSE(aktifGramer);
      if (!eski || d > eski.d) Y.gram[aktifGramer] = { d: d, t: t };
      /* Yalniz bu surumden sonraki testler: eski sonuc YOKTU, uydurulmaz. */
      Y.gramerGecmis = (Y.gramerGecmis || []).concat([{
        tarih: new Date().toISOString(), konu: aktifGramer,
        baslik: konu ? konu.title : aktifGramer, soru: t, dogru: d, yanlis: t - d, yuzde: t ? Math.round(d / t * 100) : 0
      }]).slice(-200);
      kaydet();
    }).observe(kok, { childList: true, subtree: true, characterData: true });
  })();

  /* ======================= SES: hiz + kontroller =======================
     0.75x secilirse kursun BUTUN seslerine uygulanir (ses.js mp3'te
     playbackRate 0.75, tarayici seslendirmesinde rate 0.7). Dosya degismez. */
  (function () {
    var f = window.speak; if (typeof f !== "function") return;
    window.speak = function (t, a2, a3) {
      if (Y.hiz === 0.75 && (a2 == null || typeof a2 === "object")) {
        var o = {}; if (a2) for (var k in a2) o[k] = a2[k];
        o.rate = Math.min(o.rate || 0.92, 0.7);
        return f.call(this, t, o, a3);
      }
      return f.apply(this, arguments);
    };
  })();
  /* ---------- ICERIK TURUNE GORE NORMAL HIZ (2026-10-07) ----------
     Kullanici istegi: cumleler fazla hizli. "1x" (normal) secimindeyken kayitli mp3'ler icerik turune gore calar:
       hikaye satiri 0.90 · cumle / ornek cumle / diyalog repligi 0.85 · tek kelime, kisa ifade, minimal cift 1.00.
     Yalniz HTMLAudio.playbackRate (preservesPitch varsayilan: ses tonu degismez); dosyalar degismez. "0.75x" secimi tum
     seslerde 0.75 olarak kalir. ses.js (app.js'in caldigi sesler) ayni karari window.bxNormalHiz uzerinden alir.
     Cumle olcutu: 3+ kelime, ya da noktalamayla biten 2 kelime ("Anything else?"); virgullu kisa ciftler ("ship, sheep.")
     ve "to live", "thank you" gibi ifadeler kelime sayilir. */
  var HIKAYE_SATIR = {};
  try { STORIES.forEach(function (s) { s.lines.forEach(function (l) { HIKAYE_SATIR[String(l.en).replace(/\s+/g, " ").trim()] = 1; }); }); } catch (e) { }
  function icerikHizi(metin) {
    var t = String(metin == null ? "" : metin).replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
    if (HIKAYE_SATIR[t]) return 0.90;
    var n = t ? t.split(" ").length : 0;
    if (n >= 3 || (n === 2 && /[.?!]$/.test(t) && t.indexOf(",") < 0)) return 0.85;
    return 1.0;
  }
  window.bxNormalHiz = icerikHizi;
  function cal(metin, onend) { speak(metin, onend ? { onend: onend } : undefined); }
  function hizSecici() {
    return '<div class="yl-hiz" role="group" aria-label="Ses hızı">' +
      '<button type="button" data-hiz="0.75" class="' + (Y.hiz === 0.75 ? "on" : "") + '" aria-pressed="' + (Y.hiz === 0.75) + '">0.75x</button>' +
      '<button type="button" data-hiz="1" class="' + (Y.hiz === 1 ? "on" : "") + '" aria-pressed="' + (Y.hiz === 1) + '">1x</button></div>';
  }
  function sesCubugu() {
    return '<div class="yl-ses">' +
      '<button type="button" class="yl-btn yl-dinle" data-cal="1">' + HOP + '<span>Dinle</span></button>' +
      '<button type="button" class="yl-btn yl-tekrar" data-cal="1">↻ <span>Tekrar dinle</span></button>' +
      hizSecici() + '</div>';
  }
  function hizBagla(kok) {
    (kok || document).querySelectorAll(".yl-hiz button").forEach(function (b) {
      b.onclick = function () {
        Y.hiz = +b.dataset.hiz === 0.75 ? 0.75 : 1; kaydet();
        document.querySelectorAll(".yl-hiz button").forEach(function (x) {
          var on = (+x.dataset.hiz === Y.hiz); x.classList.toggle("on", on); x.setAttribute("aria-pressed", on);
        });
      };
    });
  }
  function sesBagla(kok, metin, g) {
    var oyna = function () {
      if (Array.isArray(metin)) oynatDizi(metin);
      else if (g) oynat(metin, g);
      else cal(metin);
    };
    kok.querySelectorAll("[data-cal]").forEach(function (b) { b.onclick = oyna; });
    hizBagla(kok);
    return oyna;
  }
  /* Ders / gramer / hikaye / kelime karti ekranlarina hiz secici ekle (app.js'e dokunmadan). */
  function hizEkle(kapsam) {
    var bas = document.querySelector(kapsam + " .lesson-head");
    if (!bas || bas.querySelector(".yl-hiz")) return;
    var s = document.createElement("div"); s.className = "yl-hiz-ek"; s.innerHTML = '<span>Ses hızı</span>' + hizSecici();
    bas.appendChild(s); hizBagla(s);
  }
  (function () {
    var cift = [["renderLesson", "#v-dersler"], ["renderTense", "#v-gramer"], ["openStory", "#v-hikaye"], ["drawCard", "#v-kelime"]];
    cift.forEach(function (c) {
      var f = window[c[0]]; if (typeof f !== "function") return;
      window[c[0]] = function () { var r = f.apply(this, arguments); try { hizEkle(c[1]); } catch (e) { } return r; };
    });
  })();

  /* ======================= ALISTIRMA HAVUZU =======================
     Yalnizca kursun mevcut, seslendirilmis metinleri. Metin AYNEN kalir
     (hash degisirse mp3 bulunamaz). */
  function cumleHavuzu(b) {
    var p = [];
    function ekle(en, tr, kaynak) {
      if (!en || !tr) return;
      if (/[—\/()]/.test(en)) return;                       /* "soru — cevap" ve "a / b" satirlari tek cumle degil */
      var n = en.split(/\s+/).length; if (n < 3 || n > 14) return;
      p.push({ en: en, tr: tr, k: kaynak });
    }
    b.ders.forEach(function (id) { var u = UNIT(id); if (u) u.points.forEach(function (x) { ekle(x.en, x.tr, "ders"); }); });
    b.hikaye.forEach(function (id) { var s = STORY(id); if (s) s.lines.forEach(function (l) { ekle(l.en, l.tr, "hikaye"); }); });
    b.kur.forEach(function (k) { var q = k.split("-"); BUILDER.forEach(function (x) { if (x.cat === q[0] && x.lvl === +q[1]) ekle(x.en, x.tr, "kur"); }); });
    b.deste.forEach(function (id) { var d = DECK(id); if (d) d.words.forEach(function (w) { ekle(w.ex, w.xt, "deste"); }); });
    b.gramer.forEach(function (id) { var t = TENSE(id); if (t) t.ex.forEach(function (e) { ekle(e.en, e.tr, "gramer"); }); });
    var gor = {}; return p.filter(function (x) { if (gor[x.en]) return false; gor[x.en] = 1; return true; });
  }
  var TUM_HAVUZ = null;
  function tumHavuz() { if (!TUM_HAVUZ) { TUM_HAVUZ = []; BOLUMLER.forEach(function (b) { TUM_HAVUZ = TUM_HAVUZ.concat(cumleHavuzu(b)); }); } return TUM_HAVUZ; }
  var DURAK = { the: 1, a: 1, an: 1, and: 1, but: 1, or: 1, to: 1, of: 1, in: 1, on: 1, at: 1, is: 1, are: 1, am: 1, was: 1, were: 1, it: 1, i: 1, you: 1, he: 1, she: 1, we: 1, they: 1, my: 1, his: 1, her: 1, for: 1, with: 1, do: 1, does: 1, did: 1, not: 1, be: 1, me: 1, can: 1 };
  function kelimeler(en) { return en.split(/\s+/).map(function (w) { return w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, ""); }).filter(Boolean); }
  var TEK_KELIMELER = WORDS.map(function (w) { return w.e; }).filter(function (e) { return /^[a-z]{3,10}$/.test(e); });

  function soruAnlam(x, havuz) {
    var yanlis = sec(havuz.filter(function (y) { return y.tr !== x.tr; }).map(function (y) { return y.tr; }), 3);
    if (yanlis.length < 3) yanlis = yanlis.concat(sec(tumHavuz().filter(function (y) { return y.tr !== x.tr && yanlis.indexOf(y.tr) < 0; }).map(function (y) { return y.tr; }), 3 - yanlis.length));
    var o = karistir(yanlis.concat([x.tr]));
    return { tip: "anlam", baslik: "Dinle ve doğru anlamı seç", ses: x.en, o: o, a: o.indexOf(x.tr), cozum: x };
  }
  function soruBosluk(x) {
    var ks = kelimeler(x.en);
    var aday = ks.filter(function (w) { return w.length >= 3 && !DURAK[w.toLowerCase()] && /^[A-Za-z]+$/.test(w); });
    if (!aday.length) return null;
    var hedef = aday[Math.floor(Math.random() * aday.length)];
    var kucuk = ks.map(function (w) { return w.toLowerCase(); });
    var yanlis = sec(TEK_KELIMELER.filter(function (e) {
      return Math.abs(e.length - hedef.length) <= 2 && kucuk.indexOf(e) < 0 && e !== hedef.toLowerCase();
    }), 3);
    var buyuk = /^[A-Z]/.test(hedef);
    yanlis = yanlis.map(function (e) { return buyuk ? e.charAt(0).toUpperCase() + e.slice(1) : e; });
    var o = karistir(yanlis.concat([hedef]));
    var bir = false;
    var gosterim = x.en.split(/(\s+)/).map(function (p) {
      if (!bir && p.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "") === hedef) { bir = true; return p.replace(hedef, "_____"); }
      return p;
    }).join("");
    return { tip: "bosluk", baslik: "Dinlediğin cümlede eksik kelimeyi bul", ses: x.en, gosterim: gosterim, o: o, a: o.indexOf(hedef), cozum: x };
  }
  function soruSirala(x) {
    var ks = kelimeler(x.en);
    if (ks.length < 3 || ks.length > 9) return null;
    return { tip: "sirala", baslik: "Dinle ve cümleyi sırala", ses: x.en, dogru: ks, cozum: x };
  }
  function dinlemeSorulari(b, n) {
    var havuz = cumleHavuzu(b);
    var A = sec(havuz, 40), S3 = [];
    var tipler = ["anlam", "bosluk", "sirala", "anlam", "bosluk", "sirala", "anlam", "bosluk"].slice(0, n);
    var kul = {};
    tipler.forEach(function (tip) {
      for (var i = 0; i < A.length; i++) {
        var x = A[i]; if (kul[x.en]) continue;
        var q = tip === "anlam" ? soruAnlam(x, havuz) : tip === "bosluk" ? soruBosluk(x) : soruSirala(x);
        if (q) { kul[x.en] = 1; S3.push(q); return; }
      }
    });
    return S3;
  }
  function quizSorulari(b, n) {
    var L = [];
    b.ders.forEach(function (id) { var u = UNIT(id); if (u) u.quiz.forEach(function (q) { L.push({ tip: "mc", baslik: "Ders " + (UNITS.indexOf(u) + 1) + " · " + u.title, soru: q.q, o: q.o, a: q.a, e: q.e }); }); });
    b.gramer.forEach(function (id) { var t = TENSE(id); if (t) t.quiz.forEach(function (q) { L.push({ tip: "mc", baslik: "Gramer · " + t.title, soru: q.q, o: q.o, a: q.a, e: q.e }); }); });
    return sec(L, n);
  }

  /* ======================= GENEL SORU KOSUCUSU ======================= */
  function kosucu(opt) {
    var kutu = $q("#v-yol"), i = 0, dogru = 0, sorular = opt.sorular;
    function ust() {
      return '<div class="yl-sub">' +
        '<div class="lesson-head"><button class="backbtn" id="ylgeri">← Panel</button></div>' +
        '<p class="yl-kicker">' + h(opt.ust) + '</p><h2 class="sec-title">' + h(opt.baslik) + '</h2>' +
        (opt.alt ? '<p class="sec-sub">' + h(opt.alt) + '</p>' : "");
    }
    function ciz() {
      if (i >= sorular.length) return bitir();
      var q = sorular[i], govde = "";
      var ilerleme = '<div class="kur-prog"><span>' + (i + 1) + '/' + sorular.length + '</span><span class="kur-bar"><i style="width:' + yuzde(i, sorular.length) + '%"></i></span></div>';
      if (q.tip === "mc") {
        govde = '<div class="qq yl-qq"><p class="yl-qb">' + h(q.baslik) + '</p><p>' + h(q.soru) + '</p>' +
          '<div class="opts">' + q.o.map(function (o, oi) { return '<button data-o="' + oi + '">' + h(o) + '</button>'; }).join("") + '</div>' +
          '<div class="expl">' + h(q.e) + '</div></div>';
      } else {
        govde = '<div class="qq yl-qq"><p class="yl-qb"> ' + h(q.baslik) + '</p>' + sesCubugu() +
          (q.soru && q.tip !== "mc" ? '<p class="yl-soru">' + h(q.soru) + '</p>' : "") +
          (q.tip === "bosluk" ? '<p class="yl-bosluk" lang="en">' + h(q.gosterim) + '</p>' : "") +
          (q.tip === "sirala"
            ? '<div class="sb-line" id="ylsira"><span class="ph">Kelimelere duyduğun sırayla dokun…</span></div><div class="sb-pool" id="ylhavuz"></div>' +
            '<div class="kur-btns"><button class="go" id="ylkontrol">Kontrol et</button></div>'
            : '<div class="opts"' + ((q.tip === "bosluk" || q.oLang === "en") ? ' lang="en"' : "") + '>' + q.o.map(function (o, oi) { return '<button data-o="' + oi + '">' + h(o) + '</button>'; }).join("") + '</div>') +
          '<div class="yl-cozum" id="ylcozum" hidden></div></div>';
      }
      kutu.innerHTML = ust() + ilerleme + govde + '<div class="yl-ileri"><button class="startquiz" id="ylsonraki" hidden>' + (i + 1 < sorular.length ? "Devam →" : "Sonucu gör") + '</button></div></div>';
      $q("#ylgeri").onclick = function () { sesDurdur(); (opt.geri || panel)(); };
      hizBagla(kutu);
      if (q.ses) { var oyna = sesBagla(kutu, q.ses, q.g); oyna(); }
      var bitti = false;
      function sonuc(ok) {
        if (bitti) return; bitti = true;
        if (ok) dogru++;
        if (opt.cevap) try { opt.cevap(q, ok); } catch (e) { }
        if (q.cozum) {
          var c = $q("#ylcozum"); c.hidden = false;
          c.innerHTML = '<b>' + (ok ? "✓ Doğru" : "✗ Doğrusu") + ':</b> <span lang="en">' + h(q.cozum.en) + '</span>' + (q.cozum.tr ? '<i>' + h(q.cozum.tr) + '</i>' : "");
          c.className = "yl-cozum " + (ok ? "ok" : "no");
        }
        var s = $q("#ylsonraki"); s.hidden = false; s.focus();
      }
      if (q.tip === "sirala") {
        var havuz = karistir(q.dogru.map(function (w, k) { return { w: w, k: k }; })), secim = [];
        var tazele = function () {
          $q("#ylsira").innerHTML = secim.length ? secim.map(function (p, k) { return '<button lang="en" data-r="' + k + '">' + h(p.w) + '</button>'; }).join("") : '<span class="ph">Kelimelere duyduğun sırayla dokun…</span>';
          $q("#ylhavuz").innerHTML = havuz.map(function (p, k) { return '<button lang="en" data-a="' + k + '">' + h(p.w) + '</button>'; }).join("");
          if (bitti) return;
          kutu.querySelectorAll("#ylhavuz [data-a]").forEach(function (btn) { btn.onclick = function () { secim.push(havuz.splice(+btn.dataset.a, 1)[0]); tazele(); }; });
          kutu.querySelectorAll("#ylsira [data-r]").forEach(function (btn) { btn.onclick = function () { havuz.push(secim.splice(+btn.dataset.r, 1)[0]); tazele(); }; });
        };
        tazele();
        $q("#ylkontrol").onclick = function () {
          if (bitti) return;
          if (havuz.length) { $q("#ylcozum").hidden = false; $q("#ylcozum").className = "yl-cozum"; $q("#ylcozum").textContent = "Önce bütün kelimeleri yerleştir."; return; }
          var ok = secim.map(function (p) { return p.w.toLowerCase(); }).join(" ") === q.dogru.map(function (w) { return w.toLowerCase(); }).join(" ");
          sonuc(ok); $q("#ylkontrol").disabled = true; tazele();
        };
      } else {
        kutu.querySelectorAll(".opts button").forEach(function (btn) {
          btn.onclick = function () {
            if (bitti) return;
            var ok = +btn.dataset.o === q.a;
            btn.classList.add(ok ? "ok" : "no");
            if (!ok) { var dg = kutu.querySelectorAll(".opts button")[q.a]; if (dg) dg.classList.add("ok"); }
            if (q.tip === "mc") { var ex = kutu.querySelector(".expl"); if (ex && q.e) ex.style.display = "block"; }
            sonuc(ok);
          };
        });
      }
      $q("#ylsonraki").onclick = function () { sesDurdur(); i++; ciz(); };
    }
    function bitir() {
      var oran = sorular.length ? dogru / sorular.length : 0;
      var ek = opt.bitince ? opt.bitince(dogru, sorular.length, oran) : "";
      kutu.innerHTML = ust() +
        '<div class="card yl-sonuc"><div class="yl-sonuc-n">' + dogru + '/' + sorular.length + '</div>' +
        (opt.puanYok ? "" : '<p>' + (oran >= 0.7 ? " Geçtin! Bu adım tamamlandı." : "Geçmek için %70 gerekiyor. İlgili dersleri tekrar edip yeniden dene.") + '</p>') + (ek || "") +
        '<div class="yl-btns"><button class="yl-btn yl-ana" id="yltekrar">Tekrar dene</button><button class="yl-btn" id="ylpanel">' + (opt.geri ? "Geri dön" : "Panele dön") + '</button></div></div></div>';
      $q("#ylgeri").onclick = opt.geri || panel; $q("#ylpanel").onclick = opt.geri || panel;
      $q("#yltekrar").onclick = opt.yeniden;
      if (opt.sonra) opt.sonra(kutu);
    }
    window.scrollTo({ top: 0 });
    ciz();
  }

  function dinlemeAc(b) {
    sonYer({ t: "dinleme", id: b.id });
    yolGoster(function () {
      kosucu({
        ust: bolumAd(b), baslik: "Dinleme alıştırması", alt: "Kursun kayıtlı seslerini dinle: anlamı seç, eksik kelimeyi bul, cümleyi sırala. Ses hızını 0.75x yapabilirsin.",
        sorular: dinlemeSorulari(b, 8),
        bitince: function (d, t, oran) { if (Y.dinle[b.id] == null || oran > Y.dinle[b.id]) { Y.dinle[b.id] = oran; kaydet(); } },
        yeniden: function () { dinlemeAc(b); }
      });
    });
  }
  function testAc(b) {
    sonYer({ t: "test", id: b.id });
    yolGoster(function () {
      var qs = quizSorulari(b, 6);
      var dn = dinlemeSorulari(b, 8).filter(function (q) { return q.tip === "anlam"; });
      qs = qs.concat(dn.slice(0, 8 - qs.length));
      kosucu({
        ust: bolumAd(b), baslik: "Bölüm mini testi", alt: "Ders ve gramer sorularıyla dinleme karışık. %70 ve üzeri bölümü tamamlatır.",
        sorular: karistir(qs),
        bitince: function (d, t, oran) { if (Y.test[b.id] == null || oran > Y.test[b.id]) { Y.test[b.id] = oran; kaydet(); } },
        yeniden: function () { testAc(b); }
      });
    });
  }

  /* ======================= SEVIYE TESTI =======================
     Her bolumden 3 soru (ders/gramer testi + dinleme), kolaydan zora.
     Sonuc ilerlemeye ISLENMEZ; yalnizca baslangic bolumu onerir. */
  function seviyeAc() {
    yolGoster(function () {
      var sorular = [];
      BOLUMLER.forEach(function (b, bi) {
        var qs = quizSorulari(b, 2);
        var dn = dinlemeSorulari(b, 4).filter(function (q) { return q.tip === "anlam"; }).slice(0, 3 - qs.length);
        qs.concat(dn).forEach(function (q) { q.bolum = bi; sorular.push(q); });
      });
      var dogru = BOLUMLER.map(function () { return 0; }), top = BOLUMLER.map(function () { return 0; });
      sorular.forEach(function (q) { top[q.bolum]++; });
      var oneri = null;
      kosucu({
        ust: "Seviye testi", baslik: "Seviyemi belirle",
        alt: sorular.length + " soru, yaklaşık 5 dakika; kolaydan zora gider. Sonuç ilerlemene işlenmez — yalnızca nereden başlayacağını önerir.",
        sorular: sorular, puanYok: true,
        cevap: function (q, ok) { if (ok) dogru[q.bolum]++; },
        bitince: function () {
          var k = 0;
          while (k < BOLUMLER.length - 1 && dogru[k] >= Math.ceil(top[k] * 2 / 3)) k++;
          oneri = BOLUMLER[k];
          Y.seviye = { t: Date.now(), bolum: oneri.id, d: dogru.slice(), top: top.slice() };
          kaydet();
          return '<div class="yl-seviye"><p>Önerilen başlangıç: <b>' + h(bolumAd(oneri)) + '</b></p>' +
            BOLUMLER.map(function (b, i) { return '<div class="yl-sv-row"><span>' + h(bolumAd(b)) + '</span><span class="yl-bar"><i style="width:' + yuzde(dogru[i], top[i]) + '%"></i></span><b>' + dogru[i] + '/' + top[i] + '</b></div>'; }).join("") +
            '<button class="yl-btn yl-ana" id="ylburadan">' + h(oneri.ad) + ' bölümünden başla →</button></div>';
        },
        sonra: function () {
          var b = $q("#ylburadan");
          if (b) b.onclick = function () { Y.odak = oneri.id; kaydet(); panel(oneri.id); };
        },
        yeniden: seviyeAc
      });
    });
  }

  /* ======================= KELIME TEKRARI ======================= */
  function tekrarAc(o) {
    o = o || {};
    sonYer({ t: "tekrar", id: "" });
    yolGoster(function () {
      var mod = o.mod || (vadesiGelen().length ? "tekrar" : "yeni");
      var kuyruk;
      if (mod === "tekrar") kuyruk = vadesiGelen().slice(0, 20);
      else {
        var bas = o.bas || 0, son = o.son || WORDS.length;
        kuyruk = WORDS.slice(bas, son).map(function (w) { return anahtar(w.e); }).filter(function (k) { return !Y.vocab[k]; }).slice(0, 10);
      }
      var kutu = $q("#v-yol"), pos = 0, dogru = 0, yanlis = 0, tekrarSay = {}, gorunum = Y.kartModu === "dinle" ? "dinle" : "kart";
      function ust() {
        return '<div class="yl-sub"><div class="lesson-head"><button class="backbtn" id="ylgeri">← Panel</button></div>' +
          '<p class="yl-kicker">Kelime tekrar sistemi</p><h2 class="sec-title">' + (mod === "tekrar" ? "Bugünkü tekrar" : "Yeni kelimeler") + '</h2>' +
          '<div class="chips yl-mod"><button class="chip ' + (gorunum === "kart" ? "on" : "") + '" data-m="kart">Kart</button><button class="chip ' + (gorunum === "dinle" ? "on" : "") + '" data-m="dinle">Dinle ve seç</button></div>';
      }
      function bagla() {
        $q("#ylgeri").onclick = function () { sesDurdur(); panel(); };
        kutu.querySelectorAll(".yl-mod .chip").forEach(function (c) { c.onclick = function () { gorunum = Y.kartModu = c.dataset.m; kaydet(); ciz(); }; });
        hizBagla(kutu);
      }
      function ciz() {
        if (!kuyruk.length) {
          kutu.innerHTML = ust() + '<div class="card yl-sonuc"><p>' + (mod === "tekrar" ? "Bugün tekrar edilecek kelimen yok. " : "Bu aralıkta çalışılmamış kelime kalmadı. ") + '</p>' +
            '<div class="yl-btns"><button class="yl-btn yl-ana" id="ylyeni">Yeni kelime öğren</button><button class="yl-btn" id="ylpanel">Panele dön</button></div></div></div>';
          bagla(); $q("#ylpanel").onclick = panel; $q("#ylyeni").onclick = function () { tekrarAc({ mod: "yeni" }); };
          return;
        }
        if (pos >= kuyruk.length) return bitir();
        var k = kuyruk[pos], w = VK[k], durum = vDurum(k);
        var etiket = { yeni: "Yeni", ogreniliyor: "Öğreniliyor", tekrar: "Tekrar zamanı", ogrenildi: "Öğrenildi" }[durum];
        var ilerleme = '<div class="kur-prog"><span>' + (pos + 1) + '/' + kuyruk.length + '</span><span class="kur-bar"><i style="width:' + yuzde(pos, kuyruk.length) + '%"></i></span></div>';
        var kart;
        if (gorunum === "kart") {
          kart = '<div class="card yl-kart"><span class="yl-durum yl-d-' + durum + '">' + etiket + '</span>' +
            (w.m ? '<div class="yl-emo">' + w.m + '</div>' : "") +
            '<div class="yl-kelime" lang="en">' + h(w.e) + '</div>' + sesCubugu() +
            '<div id="ylanlam" hidden><div class="yl-anlam">' + h(w.t) + '</div></div>' +
            '<button class="startquiz" id="ylgoster">Anlamını göster</button>' +
            '<div class="yl-not" id="ylnot" hidden><button class="fc-again" data-q="0">Bilemedim</button><button class="yl-zor" data-q="1">Zor</button><button class="fc-good" data-q="2">Bildim ✓</button></div></div>';
        } else {
          var yanlisT = sec(WORDS.filter(function (x) { return x.t !== w.t; }).slice(0, 1500).map(function (x) { return x.t; }), 3);
          var o = karistir(yanlisT.concat([w.t]));
          kart = '<div class="card yl-kart"><span class="yl-durum yl-d-' + durum + '">' + etiket + '</span>' +
            '<p class="yl-qb"> Dinle ve anlamını seç</p>' + sesCubugu() +
            '<div class="qq"><div class="opts">' + o.map(function (t, oi) { return '<button data-o="' + oi + '" data-t="' + h(t) + '">' + h(t) + '</button>'; }).join("") + '</div></div>' +
            '<div class="yl-cozum" id="ylcozum" hidden></div><button class="startquiz" id="yldevam" hidden>Devam →</button></div>';
        }
        kutu.innerHTML = ust() + ilerleme + kart + '</div>';
        bagla(); sesBagla(kutu, w.e); cal(w.e);
        if (gorunum === "kart") {
          $q("#ylgoster").onclick = function () { $q("#ylanlam").hidden = false; $q("#ylnot").hidden = false; this.hidden = true; };
          kutu.querySelectorAll("#ylnot button").forEach(function (b) { b.onclick = function () { notla(k, +b.dataset.q); }; });
        } else {
          var cevap = false;
          kutu.querySelectorAll(".opts button").forEach(function (b) {
            b.onclick = function () {
              if (cevap) return; cevap = true;
              var ok = b.dataset.t === w.t;
              b.classList.add(ok ? "ok" : "no");
              kutu.querySelectorAll(".opts button").forEach(function (x) { if (x.dataset.t === w.t) x.classList.add("ok"); });
              var c = $q("#ylcozum"); c.hidden = false; c.className = "yl-cozum " + (ok ? "ok" : "no");
              c.innerHTML = '<b lang="en">' + h(w.e) + '</b> <i>' + h(w.t) + '</i>';
              var dv = $q("#yldevam"); dv.hidden = false; dv.focus();
              dv.onclick = function () { notla(k, ok ? 2 : 0); };
            };
          });
        }
      }
      function notla(k, q) {
        vNot(k, q); kaydet();
        if (q === 0) { yanlis++; tekrarSay[k] = (tekrarSay[k] || 0) + 1; if (tekrarSay[k] <= 2) kuyruk.push(k); }
        else dogru++;
        sesDurdur(); pos++; ciz();
      }
      function bitir() {
        var kalan = vadesiGelen().length;
        kutu.innerHTML = ust() + '<div class="card yl-sonuc"><div class="yl-sonuc-n">' + dogru + ' ✓ · ' + yanlis + ' ↻</div>' +
          '<p>' + (yanlis ? "Bilemediklerin oturum içinde tekrar geldi; yarın yine karşına çıkacaklar." : "Hepsini bildin. Bir dahaki tekrar daha ileri bir güne kaydı.") + '</p>' +
          '<p class="yl-mini">' + (kalan ? "Bugün hâlâ " + kalan + " kelimenin tekrar zamanı var." : "Bugünkü tekrarlar bitti.") + '</p>' +
          '<div class="yl-btns">' + (kalan ? '<button class="yl-btn yl-ana" id="yldaha">Tekrara devam</button>' : '<button class="yl-btn yl-ana" id="yldaha">10 yeni kelime</button>') +
          '<button class="yl-btn" id="ylpanel">Panele dön</button></div></div></div>';
        bagla(); $q("#ylpanel").onclick = panel;
        $q("#yldaha").onclick = function () { tekrarAc(kalan ? { mod: "tekrar" } : { mod: "yeni", bas: o.bas, son: o.son }); };
      }
      window.scrollTo({ top: 0 });
      ciz();
    });
  }

  /* ======================= KONUSMA: DINLE VE TEKRAR ET ======================= */
  var SR_ = window.SpeechRecognition || window.webkitSpeechRecognition;
  function benzerlik(hedef, duyulan) {
    var a = normal(hedef).split(" "), b = normal(duyulan).split(" ");
    if (!a.length) return 0;
    var n = 0; a.forEach(function (w) { var i = b.indexOf(w); if (i >= 0) { n++; b.splice(i, 1); } });
    return n / a.length;
  }
  function konusmaAc(b) {
    sonYer({ t: "konusma", id: b.id });
    yolGoster(function () {
      var havuz = cumleHavuzu(b).filter(function (x) { var n = x.en.split(/\s+/).length; return n >= 3 && n <= 9; });
      var liste = sec(havuz, 5), pos = 0, kutu = $q("#v-yol"), metinGizli = false, rec = null;
      function ciz() {
        if (pos >= liste.length) {
          Y.konus[b.id] = 1; kaydet();
          kutu.innerHTML = '<div class="yl-sub"><div class="lesson-head"><button class="backbtn" id="ylgeri">← Panel</button></div>' +
            '<div class="card yl-sonuc"><div class="yl-sonuc-n"> 5/5</div><p>Konuşma adımı tamamlandı. Aynı cümleleri yarın metne bakmadan tekrar etmeyi dene.</p>' +
            '<div class="yl-btns"><button class="yl-btn yl-ana" id="yltekrar">Yeni 5 cümle</button><button class="yl-btn" id="ylpanel">Panele dön</button></div></div></div>';
          $q("#ylgeri").onclick = panel; $q("#ylpanel").onclick = panel; $q("#yltekrar").onclick = function () { konusmaAc(b); };
          return;
        }
        var x = liste[pos];
        kutu.innerHTML = '<div class="yl-sub"><div class="lesson-head"><button class="backbtn" id="ylgeri">← Panel</button></div>' +
          '<p class="yl-kicker">' + h(bolumAd(b)) + '</p><h2 class="sec-title">Konuşma: dinle ve tekrar et</h2>' +
          '<p class="sec-sub">Cümleyi dinle, sonra aynı ritimle yüksek sesle söyle (shadowing). Önce 0.75x ile başlayabilirsin.</p>' +
          '<div class="kur-prog"><span>' + (pos + 1) + '/' + liste.length + '</span><span class="kur-bar"><i style="width:' + yuzde(pos, liste.length) + '%"></i></span></div>' +
          '<div class="card yl-kart">' + sesCubugu() +
          '<div class="yl-golge' + (metinGizli ? " gizli" : "") + '" lang="en">' + h(x.en) + '</div><div class="yl-anlam-k">' + h(x.tr) + '</div>' +
          '<button class="chip" id="ylgizle">' + (metinGizli ? "Metni göster" : "Metni gizle") + '</button>' +
          (SR_ ? '<button class="mic" id="ylmic" aria-label="Söyle"><svg viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg></button><div class="pr-result" id="ylsonuc">Mikrofona bas ve söyle — ya da sesli tekrar edip aşağıdaki düğmeye bas.</div>'
            : '<div class="pr-warn">Bu tarayıcıda konuşma tanıma yok; dinle, sesli tekrar et ve düğmeye bas. Sesli tekrar tek başına da çok etkilidir.</div>') +
          '<button class="startquiz" id="ylsoyledim">✓ Tekrar ettim, sonraki</button></div></div>';
        $q("#ylgeri").onclick = function () { if (rec) { try { rec.stop(); } catch (e) { } } sesDurdur(); panel(); };
        sesBagla(kutu, x.en); cal(x.en);
        $q("#ylgizle").onclick = function () { metinGizli = !metinGizli; ciz(); };
        $q("#ylsoyledim").onclick = function () { if (rec) { try { rec.stop(); } catch (e) { } rec = null; } sesDurdur(); pos++; ciz(); };
        if (SR_ && $q("#ylmic")) {
          $q("#ylmic").onclick = function () {
            if (rec) { try { rec.stop(); } catch (e) { } rec = null; return; }
            sesDurdur();
            rec = new SR_(); rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 3;
            $q("#ylmic").classList.add("rec"); $q("#ylsonuc").textContent = "Dinliyorum…";
            rec.onresult = function (ev) {
              var alt = Array.from(ev.results[0]).map(function (a) { return a.transcript; });
              var en = alt.reduce(function (m, a) { return Math.max(m, benzerlik(x.en, a)); }, 0);
              $q("#ylsonuc").innerHTML = (en >= 0.7 ? '<div class="good">✓ Çok iyi — %' + Math.round(en * 100) + ' eşleşti.</div>' : '<div class="bad">%' + Math.round(en * 100) + ' eşleşti — bir kez daha dinleyip dene.</div>') +
                '<div class="pr-heard">Duyulan: “' + h(alt[0] || "…") + '”</div>';
            };
            rec.onerror = function (ev) { $q("#ylsonuc").innerHTML = ev.error === "not-allowed" ? '<div class="bad">Mikrofon izni gerekli.</div>' : '<div class="bad">Ses alınamadı, tekrar dene.</div>'; };
            rec.onend = function () { var m = $q("#ylmic"); if (m) m.classList.remove("rec"); rec = null; };
            try { rec.start(); } catch (e) { }
          };
        }
      }
      window.scrollTo({ top: 0 });
      ciz();
    });
  }

  /* ======================= AI ILE KONUSMA PRATIGI =======================
     Bubixo'da sohbet icin bir AI ucu YOK (text-tools yalnizca ceviri/yazim;
     Bubi bir site rehberi). Yeni ucretli servis baglanmadi.
     Bugun: REHBERLI MOD — senaryo adimlari ve cevap denetimi tamamen cihazda;
     hicbir metin sunucuya gitmez, API maliyeti sifir.
     Partnerin repliklerine henuz ElevenLabs sesi uretilmedi: speak() tarayici
     seslendirmesine duser. Ayni metinler english_audio_manifest_new.json'da
     (kategori "ai_scenario"); uretilip havuza konunca OTOMATIK mp3 calar. */
  var KonusmaServisi = {
    mod: "rehberli",
    /* TODO(ai-konusma): Serbest AI sohbeti. Acmadan once: (1) ayri uc (or.
       /akademi/api/konusma) + X-Real-IP tabanli kota + gunluk butce tavani,
       (2) en ucuz uygun model ve kisa baglam, (3) kullaniciya "yazdigin metin
       sunucuya gider" bilgisi. O zamana kadar "uzak" NULL kalir ve hicbir ag
       istegi yapilmaz. */
    uzak: null,
    yanitla: function (senaryo, adimNo, metin) {
      if (this.uzak) { /* TODO(ai-konusma): return this.uzak(senaryo, adimNo, metin); */ }
      var adim = senaryo.adimlar[adimNo], n = " " + normal(metin) + " ";
      var ok = !adim.anahtar || adim.anahtar.every(function (grup) {
        return grup.some(function (k) { return n.indexOf(" " + normal(k) + " ") >= 0; });
      });
      if (normal(metin).split(" ").filter(Boolean).length < 1) ok = false;
      return Promise.resolve({ ok: ok, ipucu: adim.ornek });
    }
  };
  var SENARYO = [
    {
      id: "kafe", em: "", ad: "Kafede sipariş ver", rol: "Barista", hedef: "Bir içecek ve atıştırmalık sipariş et, sonra ödemeyi yap.",
      adimlar: [
        { ai: "Hi there! What can I get you?", tr: "Merhaba! Ne alırsınız?", gorev: "Bir kahve iste (latte, cappuccino ya da sade kahve).", anahtar: [["coffee", "latte", "cappuccino", "americano", "espresso", "tea"]], ornek: "Can I have a latte, please?" },
        { ai: "Sure. What size would you like: small, medium or large?", tr: "Tabii. Hangi boy olsun: küçük, orta ya da büyük?", gorev: "Boyutu söyle.", anahtar: [["small", "medium", "large", "regular", "big"]], ornek: "Medium, please." },
        { ai: "Would you like anything to eat with that?", tr: "Yanında yiyecek bir şey ister misiniz?", gorev: "Bir kurabiye ya da kek iste — veya kibarca hayır de.", anahtar: [["cookie", "cake", "muffin", "croissant", "sandwich", "no", "nothing"]], ornek: "Yes, a chocolate cookie, please." },
        { ai: "Is that for here or to go?", tr: "Burada mı, yoksa götürmek için mi?", gorev: "Burada mı içeceğini, götürecek misin söyle.", anahtar: [["here", "go", "take", "away"]], ornek: "For here, please." },
        { ai: "That's six fifty. How would you like to pay?", tr: "Altı elli tutuyor. Nasıl ödemek istersiniz?", gorev: "Kartla ya da nakit ödeyeceğini söyle.", anahtar: [["card", "cash"]], ornek: "By card, please." }],
      son: { ai: "Thank you! Your drink will be ready in a minute.", tr: "Teşekkürler! İçeceğiniz bir dakika içinde hazır olur." }
    },
    {
      id: "otel", em: "", ad: "Otelde oda ayırt", rol: "Resepsiyonist", hedef: "Oda ayırt, kaç gece kalacağını söyle ve kahvaltı saatini sor.",
      adimlar: [
        { ai: "Good evening, welcome to the Park Hotel. How can I help you?", tr: "İyi akşamlar, Park Otel'e hoş geldiniz. Nasıl yardımcı olabilirim?", gorev: "Bir oda ayırtmak istediğini söyle.", anahtar: [["room"]], ornek: "I'd like to book a room, please." },
        { ai: "Of course. For how many nights?", tr: "Tabii. Kaç gece için?", gorev: "Kaç gece kalacağını söyle.", anahtar: [["one", "two", "three", "four", "five", "six", "seven", "night", "nights", "week", "1", "2", "3", "4", "5", "6", "7"]], ornek: "For three nights." },
        { ai: "Would you like a single room or a double room?", tr: "Tek kişilik mi, çift kişilik oda mı istersiniz?", gorev: "Oda tipini seç.", anahtar: [["single", "double", "twin"]], ornek: "A double room, please." },
        { ai: "Breakfast is included. Can I have your name, please?", tr: "Kahvaltı dahil. Adınızı alabilir miyim?", gorev: "Adını söyle.", anahtar: null, ornek: "Yes, my name is Ali Yilmaz." },
        { ai: "Thank you. Here is your key. Your room is on the third floor.", tr: "Teşekkürler. Anahtarınız burada. Odanız üçüncü katta.", gorev: "Kahvaltının saat kaçta olduğunu sor.", anahtar: [["breakfast"], ["time", "when", "what"]], ornek: "What time is breakfast?" }],
      son: { ai: "Breakfast is from seven to ten. Enjoy your stay!", tr: "Kahvaltı yediden ona kadar. İyi konaklamalar!" }
    },
    {
      id: "tanisma", em: "", ad: "Kendini tanıt", rol: "Yeni bir arkadaş (Emma)", hedef: "Adını, nereli olduğunu, ne iş yaptığını ve bir hobini söyle.",
      adimlar: [
        { ai: "Hi! I'm Emma. What's your name?", tr: "Merhaba! Ben Emma. Senin adın ne?", gorev: "Adını söyle.", anahtar: [["name", "im", "i am", "call"]], ornek: "Hi Emma, my name is Deniz." },
        { ai: "Nice to meet you! Where are you from?", tr: "Tanıştığımıza memnun oldum! Nerelisin?", gorev: "Nereli olduğunu söyle.", anahtar: [["from", "turkey", "turkiye", "istanbul", "ankara", "izmir"]], ornek: "I'm from Turkey. I live in Izmir." },
        { ai: "Oh, nice! What do you do?", tr: "Ne güzel! Ne iş yapıyorsun?", gorev: "Mesleğini ya da öğrenci olduğunu söyle.", anahtar: [["im", "i am", "work", "student", "job", "teacher", "engineer", "doctor", "nurse"]], ornek: "I'm a student. / I work in a bank." },
        { ai: "Cool. What do you like doing in your free time?", tr: "Harika. Boş zamanında ne yapmayı seversin?", gorev: "Bir hobini söyle.", anahtar: [["like", "love", "enjoy", "play", "read", "watch", "listen", "go"]], ornek: "I like reading and playing football." }],
      son: { ai: "That sounds fun! It was nice talking to you.", tr: "Kulağa eğlenceli geliyor! Seninle konuşmak güzeldi." }
    },
    {
      id: "yol", em: "", ad: "Yol sor", rol: "Yoldan geçen biri", hedef: "İstasyonun yerini sor, uzak olup olmadığını öğren ve teşekkür et.",
      adimlar: [
        { ai: "Hello! You look a little lost. Can I help you?", tr: "Merhaba! Biraz kaybolmuş gibisiniz. Yardım edebilir miyim?", gorev: "Tren istasyonunun nerede olduğunu sor.", anahtar: [["station"]], ornek: "Yes, please. Where is the train station?" },
        { ai: "Go straight ahead and turn left at the traffic lights.", tr: "Düz gidin ve trafik ışıklarından sola dönün.", gorev: "Uzak olup olmadığını sor.", anahtar: [["far", "long", "minutes", "walk", "near", "close"]], ornek: "Is it far?" },
        { ai: "No, it's about ten minutes on foot.", tr: "Hayır, yürüyerek yaklaşık on dakika.", gorev: "Yakında bir eczane olup olmadığını sor.", anahtar: [["pharmacy", "chemist"]], ornek: "Is there a pharmacy near here?" },
        { ai: "Yes, there's one next to the bank.", tr: "Evet, bankanın yanında bir tane var.", gorev: "Teşekkür et.", anahtar: [["thank", "thanks", "cheers"]], ornek: "Thank you very much!" }],
      son: { ai: "You're welcome. Have a nice day!", tr: "Rica ederim. İyi günler!" }
    },
    {
      id: "alisveris", em: "", ad: "Alışveriş yap", rol: "Satış görevlisi", hedef: "Tişört ara, bedenini söyle, deneyip fiyatını sor ve satın al.",
      adimlar: [
        { ai: "Hi, can I help you?", tr: "Merhaba, yardımcı olabilir miyim?", gorev: "Bir tişört aradığını söyle.", anahtar: [["t shirt", "tshirt", "shirt"]], ornek: "Yes, I'm looking for a T-shirt." },
        { ai: "What size are you?", tr: "Bedeniniz ne?", gorev: "Bedenini söyle.", anahtar: [["small", "medium", "large", "s", "m", "l", "xl"]], ornek: "Medium, please." },
        { ai: "Here you are. We have it in blue and black.", tr: "Buyurun. Mavi ve siyah renkleri var.", gorev: "Bir rengi deneyip deneyemeyeceğini sor.", anahtar: [["try"]], ornek: "Can I try the blue one on?" },
        { ai: "Sure, the fitting room is over there.", tr: "Tabii, deneme kabini şurada.", gorev: "Fiyatını sor.", anahtar: [["how much", "price", "cost"]], ornek: "How much is it?" },
        { ai: "It's twenty-five dollars.", tr: "Yirmi beş dolar.", gorev: "Alacağını söyle.", anahtar: [["take", "buy", "ill", "ok", "okay", "yes"]], ornek: "OK, I'll take it." }],
      son: { ai: "Great! You can pay at the checkout.", tr: "Harika! Kasada ödeyebilirsiniz." }
    }
  ];
  function aiListe() {
    yolGoster(function () {
      var kutu = $q("#v-yol");
      kutu.innerHTML = '<div class="yl-sub"><div class="lesson-head"><button class="backbtn" id="ylgeri">← Panel</button></div>' +
        '<p class="yl-kicker">Konuşma pratiği</p><h2 class="sec-title">AI Konuşma Pratiği – Cihazda Çalışır</h2>' +
        '<p class="sec-sub">Bir senaryo seç; karşındaki rolün sorusuna İngilizce yaz ya da söyle. Senaryolar hazır adımlarla ilerler ve cevabın cihazında kontrol edilir: ' +
        '<b>bu alıştırmada yazdığın cevaplar sunucuya gönderilmez.</b> Mikrofonla cevap verirsen sesin, tarayıcının kendi konuşma tanıma hizmetiyle yazıya çevrilir.</p>' +
        '<div class="yl-ai-grid">' + SENARYO.map(function (s) {
          return '<button class="card yl-ai-kart" data-s="' + s.id + '"><b>' + h(s.ad) + '</b><small>' + h(s.hedef) + '</small>' +
            (Y.ai[s.id] ? '<span class="due" style="background:var(--green-soft);color:var(--green)">✓ tamamlandı</span>' : '<span class="due">' + s.adimlar.length + ' adım</span>') + '</button>';
        }).join("") + '</div></div>';
      $q("#ylgeri").onclick = panel;
      kutu.querySelectorAll(".yl-ai-kart").forEach(function (b) { b.onclick = function () { aiAc(b.dataset.s); }; });
      window.scrollTo({ top: 0 });
    });
  }
  function aiAc(id) { icerikYukle(function () { aiAc_(id); }); }
  function aiAc_(id) {
    var sc = SENARYO.find(function (x) { return x.id === id; }); if (!sc) return aiListe();
    var aiG = ((ICERIK && ICERIK.AI_KISI[sc.id]) || {}).g || "f";
    sonYer({ t: "ai", id: id });
    yolGoster(function () {
      var kutu = $q("#v-yol"), adim = 0, gecmis = [], rec = null, bitti = false;
      gecmis.push({ k: "ai", en: sc.adimlar[0].ai, tr: sc.adimlar[0].tr });
      function balon(m) {
        if (m.k === "ai") return '<div class="yl-msg ai"><button class="spk" data-say="' + h(m.en) + '" aria-label="Dinle">' + HOP + '</button><div><b lang="en">' + h(m.en) + '</b><i>' + h(m.tr) + '</i></div></div>';
        if (m.k === "sen") return '<div class="yl-msg sen' + (m.ok ? "" : " no") + '"><div><b lang="en">' + h(m.en) + '</b>' + (m.ok ? "" : '<i>Tam anlaşılmadı — ipucuna bak, tekrar dene.</i>') + '</div></div>';
        return '<div class="yl-msg ip"><div> Örnek cevap: <b lang="en">' + h(m.en) + '</b></div></div>';
      }
      function ciz() {
        var gorev = bitti ? "" : sc.adimlar[adim].gorev;
        kutu.innerHTML = '<div class="yl-sub"><div class="lesson-head"><button class="backbtn" id="ylgeri">← Senaryolar</button>' + '<div class="yl-hiz-ek"><span>Ses hızı</span>' + hizSecici() + '</div></div>' +
          '<p class="yl-kicker">' + h(sc.rol) + ' · cihazda çalışır</p><h2 class="sec-title">' + h(sc.ad) + '</h2><p class="sec-sub">' + h(sc.hedef) + '</p>' +
          '<div class="card yl-sohbet" id="ylsohbet">' + gecmis.map(balon).join("") + '</div>' +
          (bitti
            ? '<div class="card yl-sonuc"><p> Senaryoyu tamamladın.</p><div class="yl-btns"><button class="yl-btn yl-ana" id="ylbastan">Baştan oyna</button><button class="yl-btn" id="yldiger">Başka senaryo</button></div></div>'
            : '<div class="yl-gorev"><b>Görevin:</b> ' + h(gorev) + '</div>' +
            '<form class="yl-giris" id="ylform"><input id="ylin" lang="en" autocomplete="off" maxlength="200" placeholder="İngilizce yaz…" aria-label="Cevabın">' +
            (SR_ ? '<button type="button" class="yl-btn" id="ylmic" aria-label="Söyle" title="Konuşma tanıma tarayıcının kendi hizmetiyle yapılır"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg></button>' : "") +
            '<button class="yl-btn yl-ana" type="submit">Gönder</button></form>' +
            '<div class="yl-btns yl-kucuk"><button class="yl-btn" id="ylipucu"> İpucu</button><button class="yl-btn" id="ylgec">Geç →</button></div>') +
          (sesAdresi(sc.adimlar[0].ai, aiG) ? "" : '<p class="yl-mini">Partnerin replikleri için kayıtlı ses henüz yok; şimdilik tarayıcının İngilizce sesiyle okunuyor.</p>') + '</div>';
        $q("#ylgeri").onclick = function () { if (rec) { try { rec.stop(); } catch (e) { } } sesDurdur(); aiListe(); };
        hizBagla(kutu);
        kutu.querySelectorAll("#ylsohbet [data-say]").forEach(function (b) { b.onclick = function () { oynat(b.dataset.say, aiG); }; });
        var sh = $q("#ylsohbet"); sh.scrollTop = sh.scrollHeight;
        if (bitti) {
          $q("#ylbastan").onclick = function () { aiAc(id); };
          $q("#yldiger").onclick = aiListe;
          return;
        }
        $q("#ylform").onsubmit = function (ev) {
          ev.preventDefault();
          var v = $q("#ylin").value.trim(); if (!v) return;
          KonusmaServisi.yanitla(sc, adim, v).then(function (r) {
            gecmis.push({ k: "sen", en: v, ok: r.ok });
            if (r.ok) ilerle(); else { gecmis.push({ k: "ip", en: r.ipucu }); ciz(); }
          });
        };
        $q("#ylipucu").onclick = function () { gecmis.push({ k: "ip", en: sc.adimlar[adim].ornek }); ciz(); };
        $q("#ylgec").onclick = function () { gecmis.push({ k: "ip", en: sc.adimlar[adim].ornek }); ilerle(); };
        if (SR_ && $q("#ylmic")) {
          $q("#ylmic").onclick = function () {
            if (rec) { try { rec.stop(); } catch (e) { } rec = null; return; }
            sesDurdur();
            rec = new SR_(); rec.lang = "en-US"; rec.interimResults = false;
            $q("#ylmic").classList.add("rec");
            rec.onresult = function (ev) { $q("#ylin").value = ev.results[0][0].transcript; };
            rec.onend = function () { var m = $q("#ylmic"); if (m) m.classList.remove("rec"); rec = null; };
            try { rec.start(); } catch (e) { }
          };
        }
        var inp = $q("#ylin"); if (inp && gecmis.length > 1) inp.focus();
      }
      function ilerle() {
        adim++;
        var m = adim < sc.adimlar.length ? sc.adimlar[adim] : sc.son;
        if (adim >= sc.adimlar.length) { bitti = true; Y.ai[sc.id] = 1; kaydet(); }
        gecmis.push({ k: "ai", en: m.ai, tr: m.tr });
        ciz(); oynat(m.ai, aiG);
      }
      window.scrollTo({ top: 0 });
      ciz(); oynat(sc.adimlar[0].ai, aiG);
    });
  }

  /* ======================= YENI SESLI ICERIK: OYNATICI =======================
     Veri: ses-icerik.js (tools/icerik_kaynak.js'ten uretilir) — gerekince yuklenir.
     Ses onceligi: (1) v1'de AYNI metnin AYNI cinsiyette kaydi, (2) v2'de uretilmis
     dosya (ses-v2.json listeler; tools/ses_kur.js yazar — kod degismez), (3) tarayici
     seslendirmesi. (3)'te metne gorunmez bir karakter eklenir; yoksa ses.js metnin
     v1'deki YANLIS cinsiyetli kaydini calardi (or. Can'in "What do you do?" repligi).
     Hiz (0.75x/1x) yalnizca HTMLAudio.playbackRate; dosyaya dokunulmaz. */
  var ICERIK = null, V2 = {}, icerikBekleyen = null;
  function icerikYukle(fn) {
    if (ICERIK) { fn(); return; }
    if (window.BX_ICERIK) { ICERIK = window.BX_ICERIK; fn(); return; }
    if (icerikBekleyen) { icerikBekleyen.push(fn); return; }
    icerikBekleyen = [fn];
    try {
      fetch(VARLIK + "ses-v2.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.files) V2 = j.files; }).catch(function () { });
    } catch (e) { }
    var sc = document.createElement("script");
    sc.src = VARLIK + "ses-icerik.js";
    sc.onload = function () { ICERIK = window.BX_ICERIK || null; var L = icerikBekleyen || []; icerikBekleyen = null; if (ICERIK) L.forEach(function (f) { try { f(); } catch (e) { } }); };
    sc.onerror = function () {
      icerikBekleyen = null;
      yolGoster(function () {
        $q("#v-yol").innerHTML = '<div class="card yl-sonuc"><p>Bu bölümün içeriği yüklenemedi. Bağlantını kontrol edip tekrar dene.</p><div class="yl-btns"><button class="yl-btn" id="ylpanel">Panele dön</button></div></div>';
        $q("#ylpanel").onclick = panel;
      });
    };
    document.head.appendChild(sc);
  }
  var aktifSes = null, sesKusak = 0, diziTok = null;
  function sesDurdur(icten) {
    sesKusak++;
    if (!icten) diziTok = null;
    if (aktifSes) { try { aktifSes.pause(); aktifSes.removeAttribute("src"); aktifSes.load(); } catch (e) { } aktifSes = null; }
    try { stopSpeak(); } catch (e) { }
  }
  function sesKaydi(metin, g) { return ICERIK ? ICERIK.ses[(g === "m" ? "d" : "c") + "|" + metin] : null; }
  function sesAdresi(metin, g) {
    var e = sesKaydi(metin, g);
    if (!e) return null;
    if (e.v1) return ICERIK.v1kok + e.v1;
    if (e.f && V2[e.f]) return ICERIK.v2kok + e.f;
    return null;
  }
  function oynat(metin, g, onend, diziden) {
    sesDurdur(!!diziden);
    var benim = sesKusak, u = sesAdresi(metin, g), bitti = false;
    function son() { if (bitti || benim !== sesKusak) return; bitti = true; if (onend) onend(); }
    function tts() {
      if (benim !== sesKusak) return;
      speak(sesKaydi(metin, g) ? metin + "​" : metin, { onend: son });
      /* bazi tarayicilar onend gondermez — dizi takilmasin */
      setTimeout(son, (2500 + metin.length * 85) / (Y.hiz || 1));
    }
    if (!u) { tts(); return; }
    try {
      var a = new Audio(u); aktifSes = a;
      a.playbackRate = (Y.hiz === 0.75) ? 0.75 : icerikHizi(metin);
      a.onended = son;
      a.onerror = function () { if (aktifSes === a) aktifSes = null; tts(); };
      var p = a.play(); if (p && p.catch) p.catch(function () { if (benim === sesKusak && !bitti) tts(); });
    } catch (e) { tts(); }
  }
  /* liste: [{m:metin, g:"f"|"m"}] — sirayla, araya kisa nefes. Baska bir ses baslatilirsa dizi biter. */
  function oynatDizi(liste, onend, adimda) {
    var tok = {}, i = 0; diziTok = tok;
    (function sonraki() {
      if (diziTok !== tok) return;
      if (i >= liste.length) { diziTok = null; if (onend) onend(); return; }
      var x = liste[i];
      if (adimda) try { adimda(i); } catch (e) { }
      i++;
      oynat(x.m, x.g, function () { setTimeout(sonraki, 350); }, true);
    })();
  }

  /* ---------- kendi sesini kaydet + ornekle karsilastir (puan YOK, kayit cihazdan cikmaz) ---------- */
  var kayitAkim = null, kayitRec = null;
  function kayitDurdur() {
    try { if (kayitRec && kayitRec.state !== "inactive") kayitRec.stop(); } catch (e) { }
    try { if (kayitAkim) kayitAkim.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
    kayitRec = null; kayitAkim = null;
  }
  function kayitci(kok, metin, g) {
    var destek = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    var url = null, kendi = null;
    function ciz(durum, mesaj) {
      kok.innerHTML = '<div class="yl-kayit"><b class="yl-kayit-b" lang="en">' + h(metin) + '</b><div class="yl-btns yl-kucuk">' +
        '<button class="yl-btn" data-k="ornek">' + HOP + ' Örneği dinle</button>' +
        (destek ? (durum === "kayit"
          ? '<button class="yl-btn yl-kayit-on" data-k="dur">⏹ Durdur</button>'
          : '<button class="yl-btn yl-ana" data-k="kaydet"> Tekrar et (kaydet)</button>') : "") +
        (url ? '<button class="yl-btn" data-k="dinle">▶ Kaydımı dinle</button>' : "") + '</div>' +
        '<p class="yl-mini">' + (mesaj || (destek
          ? "Telaffuz puanı vermiyoruz: güvenilir bir puanlama servisi yok. Kaydını dinle ve örnekle karşılaştır — ünlünün uzunluğu, dudak ve dil konumu aynı mı? Kayıt cihazından çıkmaz."
          : "Bu tarayıcı ses kaydını desteklemiyor. Örneği dinle ve yüksek sesle tekrar et.")) + '</p></div>';
      kok.querySelector('[data-k="ornek"]').onclick = function () { oynat(metin, g); };
      var b;
      if ((b = kok.querySelector('[data-k="kaydet"]'))) b.onclick = baslat;
      if ((b = kok.querySelector('[data-k="dur"]'))) b.onclick = function () { try { kayitRec.stop(); } catch (e) { } };
      if ((b = kok.querySelector('[data-k="dinle"]'))) b.onclick = function () { sesDurdur(); try { kendi = new Audio(url); aktifSes = kendi; kendi.play(); } catch (e) { } };
    }
    function baslat() {
      sesDurdur(); kayitDurdur();
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (akim) {
        kayitAkim = akim;
        var parca = [], r = new MediaRecorder(akim); kayitRec = r;
        r.ondataavailable = function (e) { if (e.data && e.data.size) parca.push(e.data); };
        r.onstop = function () {
          try { akim.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
          if (url) try { URL.revokeObjectURL(url); } catch (e) { }
          url = parca.length ? URL.createObjectURL(new Blob(parca, { type: r.mimeType || "audio/webm" })) : null;
          kayitRec = null; kayitAkim = null;
          if (kok.isConnected) ciz("hazir");
        };
        r.start(); ciz("kayit", "Kaydediyorum… (en fazla 6 saniye)");
        setTimeout(function () { try { if (r.state === "recording") r.stop(); } catch (e) { } }, 6000);
      }).catch(function () { ciz("hazir", "Mikrofon izni verilmedi. Örneği dinleyip yüksek sesle tekrar edebilirsin."); });
    }
    ciz("hazir");
  }

  function ustBaslik(geriAd, kicker, baslik, alt) {
    return '<div class="lesson-head"><button class="backbtn" id="ylgeri">← ' + h(geriAd) + '</button><div class="yl-hiz-ek"><span>Ses hızı</span>' + hizSecici() + '</div></div>' +
      '<p class="yl-kicker">' + h(kicker) + '</p><h2 class="sec-title">' + h(baslik) + '</h2>' + (alt ? '<p class="sec-sub">' + h(alt) + '</p>' : "");
  }

  /* ======================= DIYALOGLAR ======================= */
  Y.dialog = Y.dialog || {};          /* {cafe:1} sonuna kadar dinlendi */
  function diyalogListe() {
    icerikYukle(function () {
      yolGoster(function () {
        var kutu = $q("#v-yol");
        var grup = function (lv) {
          return ICERIK.DIYALOG.filter(function (d) { return d.level === lv; }).map(function (d) {
            return '<button class="card yl-ai-kart" data-d="' + d.id + '"><span class="yl-ai-em">' + d.em + '</span><b>' + h(d.ad) + '</b><small>' + h(d.ozet) + '</small>' +
              (Y.dialog[d.id] ? '<span class="due" style="background:var(--green-soft);color:var(--green)">✓ dinlendi</span>' : '<span class="due">' + d.satir.length + ' replik</span>') + '</button>';
          }).join("");
        };
        kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Dinle ve konuş", "Gerçek hayattan diyaloglar",
          "Replik replik dinle, Türkçesine istersen bak, sonra rolleri değiştirip yüksek sesle oku.") +
          '<h3 class="yl-grup">A1 — Başlangıç</h3><div class="yl-ai-grid">' + grup("A1") + '</div>' +
          '<h3 class="yl-grup">A2 — Günlük İngilizce</h3><div class="yl-ai-grid">' + grup("A2") + '</div></div>';
        $q("#ylgeri").onclick = panel; hizBagla(kutu);
        kutu.querySelectorAll("[data-d]").forEach(function (b) { b.onclick = function () { diyalogAc(b.dataset.d); }; });
        window.scrollTo({ top: 0 });
      });
    });
  }
  function diyalogAc(id) {
    icerikYukle(function () {
      var d = ICERIK.DIYALOG.find(function (x) { return x.id === id; }); if (!d) return diyalogListe();
      sonYer({ t: "diyalog", id: id, ad: d.ad });
      yolGoster(function () {
        var kutu = $q("#v-yol"), pos = 0, trAcik = !!Y.trAcik, adlar = Object.keys(d.kisi);
        var g = function (i) { return d.kisi[d.satir[i][0]].g; };
        function bitti() { if (pos >= d.satir.length - 1 && !Y.dialog[id]) { Y.dialog[id] = 1; kaydet(); } }
        function satir(j) {
          var s = d.satir[j], sol = s[0] === adlar[0];
          return '<div class="yl-msg ' + (sol ? "ai" : "sen") + (j === pos ? " yl-simdi" : "") + '" data-j="' + j + '">' +
            (sol ? '<button class="spk" data-j="' + j + '" aria-label="Repliği dinle">' + HOP + '</button>' : "") +
            '<div><span class="yl-kim">' + h(s[0]) + '</span><b lang="en">' + h(s[1]) + '</b>' + (trAcik ? '<i>' + h(s[2]) + '</i>' : "") + '</div>' +
            (sol ? "" : '<button class="spk" data-j="' + j + '" aria-label="Repliği dinle">' + HOP + '</button>') + '</div>';
        }
        function ciz() {
          var son = pos >= d.satir.length - 1;
          kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Diyaloglar", d.level + " · " + d.em + " Diyalog", d.ad, d.ozet) +
            '<div class="yl-kisiler">' + adlar.map(function (a) { var k = d.kisi[a]; return '<span><b>' + h(a) + '</b> — ' + h(k.rol) + ' · ' + (k.g === "m" ? "♂" : "♀") + '</span>'; }).join("") + '</div>' +
            '<div class="yl-btns yl-kucuk"><button class="yl-btn" id="ylbastan">▶ Diyaloğu baştan dinle</button><button class="yl-btn" id="yltr">' + (trAcik ? "Türkçeyi gizle" : "Türkçesini göster") + '</button></div>' +
            '<div class="card yl-sohbet yl-diyalog" id="ylsohbet">' + d.satir.slice(0, pos + 1).map(function (_, j) { return satir(j); }).join("") + '</div>' +
            '<div class="yl-ses"><button class="yl-btn yl-dinle" id="yldinle">' + HOP + '<span>Dinle</span></button><button class="yl-btn yl-tekrar" id="yltekrar">↻ <span>Tekrar dinle</span></button>' +
            (son ? '<span class="yl-bitti">✓ Diyalog bitti</span>' : '<button class="yl-btn yl-ana" id="ylsonraki">Sonraki replik →</button>') + '</div>' +
            '<p class="yl-mini">' + (pos + 1) + '/' + d.satir.length + ' replik · Kayıtlı ses yoksa tarayıcının İngilizce sesi okur.</p></div>';
          $q("#ylgeri").onclick = function () { sesDurdur(); diyalogListe(); };
          hizBagla(kutu);
          var sh = $q("#ylsohbet"); sh.scrollTop = sh.scrollHeight;
          kutu.querySelectorAll("#ylsohbet .spk").forEach(function (b) { b.onclick = function () { oynat(d.satir[+b.dataset.j][1], g(+b.dataset.j)); }; });
          $q("#yldinle").onclick = $q("#yltekrar").onclick = function () { oynat(d.satir[pos][1], g(pos)); };
          var sn = $q("#ylsonraki"); if (sn) sn.onclick = function () { pos++; bitti(); ciz(); oynat(d.satir[pos][1], g(pos)); };
          $q("#yltr").onclick = function () { trAcik = Y.trAcik = !trAcik; kaydet(); ciz(); };
          $q("#ylbastan").onclick = function () {
            oynatDizi(d.satir.map(function (s, j) { return { m: s[1], g: g(j) }; }), function () { bitti(); },
              function (j) { pos = j; ciz(); if (j === d.satir.length - 1) bitti(); });
          };
        }
        window.scrollTo({ top: 0 });
        ciz(); oynat(d.satir[0][1], g(0));
      });
    });
  }

  /* ======================= TELAFFUZ CALISMASI ======================= */
  Y.pron = Y.pron || {};              /* {th:{calisildi:1, quiz:0.83, t:ms}} */
  function telaffuzListe() {
    icerikYukle(function () {
      yolGoster(function () {
        var kutu = $q("#v-yol");
        kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Türk öğrenciler için", "Telaffuz Çalışması",
          "Türkçede olmayan ya da farklı çıkan İngilizce sesler. Dinle, karşılaştır, kendi sesini kaydedip örnekle kıyasla.") +
          '<div class="yl-ai-grid">' + ICERIK.TELAFFUZ.map(function (t) {
            var p = Y.pron[t.id] || {};
            return '<button class="card yl-ai-kart" data-t="' + t.id + '"><span class="yl-ai-em yl-ipa">' + h(t.ses) + '</span><b>' + h(t.ad) + '</b>' +
              '<small>' + t.kelime.length + ' kelime · ' + (t.cift.length ? t.cift.length + ' minimal çift · ' : "") + t.cumle.length + ' cümle</small>' +
              (p.calisildi ? '<span class="due" style="background:var(--green-soft);color:var(--green)">✓ çalışıldı' + (p.quiz != null ? ' · ayırt etme %' + Math.round(p.quiz * 100) : "") + '</span>' : "") + '</button>';
          }).join("") + '</div></div>';
        $q("#ylgeri").onclick = panel; hizBagla(kutu);
        kutu.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { telaffuzAc(b.dataset.t); }; });
        window.scrollTo({ top: 0 });
      });
    });
  }
  function telaffuzAc(id) {
    icerikYukle(function () {
      var t = ICERIK.TELAFFUZ.find(function (x) { return x.id === id; }); if (!t) return telaffuzListe();
      sonYer({ t: "telaffuz", id: id, ad: t.ad });
      yolGoster(function () {
        var kutu = $q("#v-yol"), anlam = {};
        t.kelime.forEach(function (k) { anlam[k[0]] = k[1]; });
        kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Telaffuz", "Telaffuz Çalışması", t.ad, "") +
          '<div class="tipbox"><b>Nasıl?</b> ' + h(t.ipucu) + '</div>' +
          '<div class="card yl-kayit-k" id="ylkayit"></div>' +
          '<h3 class="yl-grup">Kelimeler</h3><div class="yl-kelimeler">' + t.kelime.map(function (k, i) {
            return '<div class="card yl-kk"><button class="spk" data-k="' + i + '" aria-label="Dinle">' + HOP + '</button><span><b lang="en">' + h(k[0]) + '</b><i>' + h(k[1]) + '</i></span>' +
              '<button class="yl-btn yl-tekrar-et" data-r="' + i + '">Tekrar et</button></div>';
          }).join("") + '</div>' +
          (t.cift.length ? '<h3 class="yl-grup">Minimal çiftler — farkı duy</h3><div class="yl-ciftler">' + t.cift.map(function (c, i) {
            return '<div class="card yl-cift"><button class="yl-btn" data-a="' + i + '">' + HOP + ' <span lang="en">' + h(c[0]) + '</span></button><span class="yl-vs">≠</span>' +
              '<button class="yl-btn" data-b="' + i + '">' + HOP + ' <span lang="en">' + h(c[1]) + '</span></button>' +
              '<button class="yl-btn yl-kars" data-c="' + i + '">Karşılaştır</button><small>' + h(anlam[c[0]] || "") + ' · ' + h(anlam[c[1]] || "") + '</small></div>';
          }).join("") + '</div>' +
            '<div class="card yl-quiz" id="ylquiz"></div>' : "") +
          '<h3 class="yl-grup">Cümle içinde</h3><div class="card" style="padding:6px 18px">' + t.cumle.map(function (c, i) {
            return '<div class="exline"><button class="spk" data-s="' + i + '" aria-label="Dinle">' + HOP + '</button><span><b lang="en">' + h(c[0]) + '</b><i>' + h(c[1]) + '</i></span>' +
              '<button class="yl-btn yl-tekrar-et" data-rs="' + i + '">Tekrar et</button></div>';
          }).join("") + '</div>' +
          '<div class="yl-btns"><button class="yl-btn yl-ana" id="ylcalistim">' + ((Y.pron[id] || {}).calisildi ? "✓ Çalışıldı olarak işaretli" : "✓ Bu seti çalıştım") + '</button></div></div>';
        $q("#ylgeri").onclick = function () { sesDurdur(); kayitDurdur(); telaffuzListe(); };
        hizBagla(kutu);
        var kayitKok = $q("#ylkayit");
        kayitci(kayitKok, t.kelime[0][0], "f");
        kutu.querySelectorAll("[data-k]").forEach(function (b) { b.onclick = function () { oynat(t.kelime[+b.dataset.k][0], "f"); }; });
        kutu.querySelectorAll("[data-r]").forEach(function (b) { b.onclick = function () { var w = t.kelime[+b.dataset.r][0]; kayitci(kayitKok, w, "f"); oynat(w, "f"); kayitKok.scrollIntoView({ block: "center", behavior: "smooth" }); }; });
        kutu.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () { oynat(t.cumle[+b.dataset.s][0], "m"); }; });
        kutu.querySelectorAll("[data-rs]").forEach(function (b) { b.onclick = function () { var c = t.cumle[+b.dataset.rs][0]; kayitci(kayitKok, c, "m"); oynat(c, "m"); kayitKok.scrollIntoView({ block: "center", behavior: "smooth" }); }; });
        kutu.querySelectorAll("[data-a]").forEach(function (b) { b.onclick = function () { oynat(t.cift[+b.dataset.a][0], "f"); }; });
        kutu.querySelectorAll("[data-b]").forEach(function (b) { b.onclick = function () { oynat(t.cift[+b.dataset.b][1], "f"); }; });
        kutu.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { var c = t.cift[+b.dataset.c]; oynat(c[0] + ", " + c[1] + ".", "f"); }; });
        $q("#ylcalistim").onclick = function () { var p = Y.pron[id] = Y.pron[id] || {}; p.calisildi = 1; p.t = Date.now(); kaydet(); this.textContent = "✓ Çalışıldı olarak işaretli"; };
        if (t.cift.length) ayirtQuiz(t);
        window.scrollTo({ top: 0 });
      });
    });
  }
  /* "Hangisini duydun?" — konusma degil ALGI testi; puan gercek (dogru secim / tur). */
  function ayirtQuiz(t) {
    var kok = $q("#ylquiz"), tur = 0, dogru = 0, N = 6, cevap = null;
    function yeni() {
      if (tur >= N) {
        var oran = dogru / N, p = Y.pron[t.id] = Y.pron[t.id] || {};
        if (p.quiz == null || oran > p.quiz) p.quiz = oran;
        p.calisildi = 1; p.t = Date.now(); kaydet();
        kok.innerHTML = '<p class="yl-qb"> Hangisini duydun?</p><p><b>' + dogru + '/' + N + '</b> doğru ayırt ettin. ' + (oran >= 0.8 ? "Kulağın bu farkı yakalıyor." : "Çiftleri birkaç kez karşılaştırıp yeniden dene.") + '</p><button class="yl-btn" id="ylqyeni">Yeniden dene</button>';
        $q("#ylqyeni").onclick = function () { tur = 0; dogru = 0; yeni(); };
        return;
      }
      var c = t.cift[Math.floor(Math.random() * t.cift.length)], hangi = Math.random() < 0.5 ? 0 : 1;
      cevap = c[hangi];
      kok.innerHTML = '<p class="yl-qb"> Hangisini duydun? · ' + (tur + 1) + '/' + N + '</p>' +
        '<div class="yl-btns yl-kucuk"><button class="yl-btn" id="ylqcal">' + HOP + ' Dinle</button></div>' +
        '<div class="qq"><div class="opts" lang="en">' + [c[0], c[1]].map(function (w) { return '<button data-w="' + h(w) + '">' + h(w) + '</button>'; }).join("") + '</div></div>' +
        '<div id="ylqsonuc"></div>';
      $q("#ylqcal").onclick = function () { oynat(cevap, "f"); };
      var bitti = false;
      kok.querySelectorAll("[data-w]").forEach(function (b) {
        b.onclick = function () {
          if (bitti) return; bitti = true;
          var ok = b.dataset.w === cevap; if (ok) dogru++;
          b.classList.add(ok ? "ok" : "no");
          kok.querySelectorAll("[data-w]").forEach(function (x) { if (x.dataset.w === cevap) x.classList.add("ok"); });
          $q("#ylqsonuc").innerHTML = '<button class="yl-btn yl-ana" id="ylqileri">' + (tur + 1 < N ? "Sonraki →" : "Sonucu gör") + '</button>';
          $q("#ylqileri").onclick = function () { tur++; yeni(); };
        };
      });
    }
    kok.innerHTML = '<p class="yl-qb"> Hangisini duydun?</p><p class="yl-mini">' + N + ' tur: bir kelime çalınır, çiftin hangisi olduğunu seç. Bu bir dinleme (ayırt etme) testidir, telaffuz puanı değildir.</p><button class="yl-btn yl-ana" id="ylqbasla">Başla</button>';
    $q("#ylqbasla").onclick = function () { yeni(); oynat(cevap, "f"); };
  }

  /* ======================= SHADOWING ======================= */
  Y.golge = Y.golge || {};            /* {A1:{"0":1,"3":1}} tamamlanan cumle indeksleri */
  function golgeAc(lv) {
    icerikYukle(function () {
      lv = (lv === "A2") ? "A2" : "A1";
      sonYer({ t: "golge", id: lv, ad: "Shadowing " + lv });
      yolGoster(function () {
        var kutu = $q("#v-yol"), set = ICERIK.GOLGE[lv], L = set.liste, g = set.g;
        var bitenler = Y.golge[lv] = Y.golge[lv] || {};
        var pos = 0; while (pos < L.length - 1 && bitenler[pos]) pos++;
        var goster = false, dinlendi = false;
        function sayac(l) { return Object.keys(Y.golge[l] || {}).length; }
        function ciz() {
          var x = L[pos];
          kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Dinle ve tekrar et", "Shadowing", "Önce dinle, metne bakmadan aynı ritimle tekrar et, sonra cümleyi gör. Puan yok — amaç ritim ve akıcılık.") +
            '<div class="chips"><button class="chip ' + (lv === "A1" ? "on" : "") + '" data-l="A1">A1 · ' + sayac("A1") + '/' + ICERIK.GOLGE.A1.liste.length + '</button>' +
            '<button class="chip ' + (lv === "A2" ? "on" : "") + '" data-l="A2">A2 · ' + sayac("A2") + '/' + ICERIK.GOLGE.A2.liste.length + '</button></div>' +
            '<div class="kur-prog"><span>' + (pos + 1) + '/' + L.length + '</span><span class="kur-bar"><i style="width:' + yuzde(sayac(lv), L.length) + '%"></i></span></div>' +
            '<ol class="yl-adimlar"><li class="on">Dinle</li><li class="' + (dinlendi ? "on" : "") + '">Tekrar dinle</li><li class="' + (dinlendi ? "on" : "") + '">Sen tekrar et</li><li class="' + (goster ? "on" : "") + '">Cümleyi gör</li><li class="' + (goster ? "on" : "") + '">Sonraki</li></ol>' +
            '<div class="card yl-kart">' +
            '<div class="yl-ses"><button class="yl-btn yl-dinle" id="yldinle">' + HOP + '<span>Dinle</span></button><button class="yl-btn yl-tekrar" id="yltekrar">↻ <span>Tekrar dinle</span></button></div>' +
            (goster ? '<div class="yl-golge" lang="en">' + h(x[0]) + '</div><div class="yl-anlam-k">' + h(x[1]) + '</div>'
              : '<div class="yl-golge gizli" aria-hidden="true">' + h(x[0].replace(/[A-Za-z]/g, "•")) + '</div><p class="yl-mini">Cümle gizli: önce kulağınla yakala.</p>') +
            '<div id="ylkayit"></div>' +
            (goster ? '<button class="startquiz" id="ylsonraki">' + (pos + 1 < L.length ? "Sonraki cümle →" : "Seti bitir ✓") + '</button>'
              : '<button class="startquiz" id="ylgoster">Tekrar ettim — cümleyi göster</button>') +
            '</div></div>';
          $q("#ylgeri").onclick = function () { sesDurdur(); kayitDurdur(); panel(); };
          hizBagla(kutu);
          kutu.querySelectorAll(".chip[data-l]").forEach(function (c) { c.onclick = function () { sesDurdur(); kayitDurdur(); golgeAc(c.dataset.l); }; });
          $q("#yldinle").onclick = $q("#yltekrar").onclick = function () { dinlendi = true; oynat(x[0], g); };
          kayitci($q("#ylkayit"), goster ? x[0] : "…", g);
          var gb = $q("#ylgoster"); if (gb) gb.onclick = function () { goster = true; ciz(); };
          var sb = $q("#ylsonraki"); if (sb) sb.onclick = function () {
            bitenler[pos] = 1; kaydet(); sesDurdur(); kayitDurdur();
            if (pos + 1 >= L.length) {
              kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Shadowing " + lv, "Set bitti ", "") +
                '<div class="card yl-sonuc"><p>' + sayac(lv) + '/' + L.length + ' cümle tamamlandı. Yarın aynı cümleleri metne bakmadan, 1x hızda dene.</p>' +
                '<div class="yl-btns"><button class="yl-btn yl-ana" id="ylbas">Baştan</button>' + (lv === "A1" ? '<button class="yl-btn" id="ylA2">A2 setine geç</button>' : "") + '<button class="yl-btn" id="ylpanel">Panele dön</button></div></div></div>';
              hizBagla(kutu); $q("#ylgeri").onclick = panel; $q("#ylpanel").onclick = panel;
              $q("#ylbas").onclick = function () { pos = 0; goster = false; dinlendi = false; ciz(); oynat(L[0][0], g); };
              var a2 = $q("#ylA2"); if (a2) a2.onclick = function () { golgeAc("A2"); };
              return;
            }
            pos++; goster = false; dinlendi = false; ciz(); oynat(L[pos][0], g);
          };
        }
        window.scrollTo({ top: 0 });
        ciz(); oynat(L[pos][0], g);
      });
    });
  }

  /* ======================= DINLEME TESTLERI ======================= */
  Y.dtest = Y.dtest || {};            /* {A1:{en_iyi:0.8, son:{tarih,dogru,toplam,yuzde}, gecmis:[...]}} */
  function dtSorular(lv) {
    var D = ICERIK.DINLEME.filter(function (x) { return x.level === lv; });
    var cins = function (x) { return D.indexOf(x) % 2 === 0 ? "f" : "m"; };   /* manifest ile ayni kural */
    var K2 = ICERIK.KONUSMA.filter(function (x) { return x.level === lv; });
    var DY = ICERIK.DIYALOG.filter(function (x) { return x.level === lv; });
    var sira = karistir(D), Q = [], i = 0, nDogru = lv === "A2" ? 3 : 4;
    for (var a = 0; a < nDogru && i < sira.length; a++, i++) {
      var x = sira[i];
      Q.push({ tip: "dinle-mc", baslik: "Dinle ve doğru cevabı seç", ses: x.en, g: cins(x), soru: x.soru, o: x.o, a: x.a, cozum: { en: x.en, tr: "" } });
    }
    if (K2.length) {
      var c = K2[Math.floor(Math.random() * K2.length)];
      Q.push({
        tip: "dinle-mc", baslik: "Konuşmayı dinle ve doğru cevabı seç", ses: c.satir.map(function (s) { return { m: s[2], g: s[1] }; }), soru: c.soru, o: c.o, a: c.a,
        cozum: { en: c.satir.map(function (s) { return s[0] + ": " + s[2]; }).join("  "), tr: "" }
      });
    }
    for (var b = 0; b < 2 && i < sira.length; i++) {
      var y = sira[i], q = soruBosluk({ en: y.en, tr: "" });
      if (q) { q.baslik = "Dinle ve eksik kelimeyi seç"; q.g = cins(y); Q.push(q); b++; }
    }
    for (var e = 0; e < 2 && i < sira.length; e++, i++) {
      var z = sira[i], o = karistir([z.en].concat(z.benzer));
      Q.push({ tip: "dinle-mc", baslik: "Dinle ve doğru cümleyi seç", ses: z.en, g: cins(z), soru: "Duyduğun cümle hangisi?", o: o, a: o.indexOf(z.en), oLang: "en", cozum: { en: z.en, tr: "" } });
    }
    var tumSatir = [];
    DY.forEach(function (d) { d.satir.forEach(function (s, j) { tumSatir.push({ d: d, j: j }); }); });
    var adaylar = karistir(tumSatir.filter(function (t) { var s = t.d.satir; return t.j + 1 < s.length && s[t.j + 1][0] !== s[t.j][0] && /\?$/.test(s[t.j][1]); }));
    for (var f = 0; f < 2 && f < adaylar.length; f++) {
      var t = adaylar[f], s = t.d.satir[t.j], cvp = t.d.satir[t.j + 1][1];
      var yanlis = sec(tumSatir.filter(function (u) { return u.d.id !== t.d.id && !/\?$/.test(u.d.satir[u.j][1]); }).map(function (u) { return u.d.satir[u.j][1]; }), 3);
      var o2 = karistir(yanlis.concat([cvp]));
      Q.push({
        tip: "dinle-mc", baslik: "Diyaloğa uygun cevabı seç", ses: s[1], g: t.d.kisi[s[0]].g, soru: "“" + s[0] + "” (" + t.d.kisi[s[0]].rol + ") böyle diyor. En uygun cevap hangisi?",
        o: o2, a: o2.indexOf(cvp), oLang: "en", cozum: { en: cvp, tr: t.d.satir[t.j + 1][2] }
      });
    }
    return Q;
  }
  function dtestListe() {
    icerikYukle(function () {
      yolGoster(function () {
        var kutu = $q("#v-yol");
        var kart = function (lv, alt) {
          var r = Y.dtest[lv];
          return '<button class="card yl-ai-kart" data-l="' + lv + '"><span class="yl-ai-em"></span><b>Dinleme testi ' + lv + '</b><small>' + alt + '</small>' +
            (r ? '<span class="due" style="background:var(--green-soft);color:var(--green)">en iyi %' + Math.round(r.en_iyi * 100) + ' · son: ' + r.son.dogru + '/' + r.son.toplam + '</span>' : '<span class="due">10 soru</span>') + '</button>';
        };
        kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Dinleme", "Dinleme testleri",
          "Dört soru türü: doğru cevabı seç, eksik kelimeyi seç, doğru cümleyi seç ve diyaloğa uygun cevabı seç. Sonuç ilerlemene kaydedilir.") +
          '<div class="yl-ai-grid">' + kart("A1", "Kısa cümleler: saat, fiyat, yer, gün.") + kart("A2", "Uzun cümleler ve mini konuşmalar.") + '</div></div>';
        $q("#ylgeri").onclick = panel; hizBagla(kutu);
        kutu.querySelectorAll("[data-l]").forEach(function (b) { b.onclick = function () { dtestAc(b.dataset.l); }; });
        window.scrollTo({ top: 0 });
      });
    });
  }
  function dtestAc(lv) {
    icerikYukle(function () {
      sonYer({ t: "dtest", id: lv, ad: "Dinleme testi " + lv });
      yolGoster(function () {
        kosucu({
          ust: "Dinleme testi", baslik: "Dinleme testi " + lv, alt: "Her soruda sesi istediğin kadar tekrar dinleyebilirsin. 0.75x yavaş oynatma serbest.",
          sorular: dtSorular(lv), geri: dtestListe, puanYok: true,
          bitince: function (d, t, oran) {
            var r = Y.dtest[lv] = Y.dtest[lv] || { en_iyi: 0, gecmis: [] };
            r.son = { tarih: new Date().toISOString(), dogru: d, toplam: t, yuzde: Math.round(oran * 100) };
            r.en_iyi = Math.max(r.en_iyi || 0, oran);
            r.gecmis = (r.gecmis || []).concat([r.son]).slice(-50);
            kaydet();
            return '<p>' + (oran >= 0.8 ? " Çok iyi — kulağın bu seviyeye alışmış." : oran >= 0.5 ? "İyi gidiyor. Kaçırdığın soruları 0.75x ile tekrar dinle." : "Önce diyalogları ve shadowing'i çalış, sonra yeniden dene.") +
              '</p><p class="yl-mini">Sonuç kaydedildi · en iyi: %' + Math.round(r.en_iyi * 100) + '</p>';
          },
          yeniden: function () { dtestAc(lv); }
        });
      });
    });
  }

  /* ======================= GRAMER TEST GECMISI ======================= */
  function gramerGecmisi() {
    yolGoster(function () {
      var kutu = $q("#v-yol"), L = (Y.gramerGecmis || []).slice().reverse();
      kutu.innerHTML = '<div class="yl-sub">' + ustBaslik("Panel", "Gramer", "Gramer test geçmişi",
        "Bu sürümden itibaren çözülen her gramer mini testi burada. Daha önceki sonuçlar kaydedilmemişti; tahmin edilip eklenmedi.") +
        (L.length ? '<div class="card yl-tablo-k"><table class="yl-tablo"><thead><tr><th>Tarih</th><th>Konu</th><th>Soru</th><th>Doğru</th><th>Yanlış</th><th>%</th></tr></thead><tbody>' +
          L.map(function (r) { return '<tr><td>' + h(new Date(r.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })) + '</td><td>' + h(r.baslik) + '</td><td>' + r.soru + '</td><td>' + r.dogru + '</td><td>' + r.yanlis + '</td><td><b>%' + r.yuzde + '</b></td></tr>'; }).join("") +
          '</tbody></table></div>'
          : '<div class="card yl-sonuc"><p>Henüz kayıt yok. Gramer sekmesinde bir konunun mini testini çöz; sonuç burada görünür.</p><div class="yl-btns"><button class="yl-btn yl-ana" id="ylgr">Gramer konularına git</button></div></div>') + '</div>';
      $q("#ylgeri").onclick = panel; hizBagla(kutu);
      var g = $q("#ylgr"); if (g) g.onclick = function () { showView("gramer"); };
      window.scrollTo({ top: 0 });
    });
  }

  /* ======================= PANEL ======================= */
  var IKON = { ders: "", kelime: "", gramer: "", dinleme: "", cumle: "", hikaye: "", konusma: "", test: "" };
  var TIP_AD = { ders: "Ders", kelime: "Kelime", gramer: "Gramer", dinleme: "Dinleme", cumle: "Cümle kur", hikaye: "Hikâye", konusma: "Konuşma", test: "Mini test" };
  function panel(acik) {
    if (!$q("#v-yol").classList.contains("on")) { yolGoster(function () { panel(acik); }); return; }
    sesDurdur();
    document.body.classList.remove("yl-ic");
    var kutu = $q("#v-yol");
    var a1 = seviyeDurum("A1"), a2 = seviyeDurum("A2");
    var vs = vSayim(), vade = vadesiGelen().length;
    var basladi = basladiMi(), aktif = aktifBolum(), acikId = acik || aktif.id;
    var son = sonEtiket(Y.last);
    var siradaki = bolumDurum(aktif).L.find(function (o) { return !o.done; });
    var sv = Y.seviye && BOLUM(Y.seviye.bolum);

    var hero =
      '<section class="yl-hero yl-app-home">' +
      '<div class="yl-pills"><span>A1 → A2</span></div>' +
      (basladi
        ? '<h2>Öğrenmeye devam et</h2>' + (son ? '<p class="yl-son">Son çalışma: <b>' + h(son) + '</b></p>' : '<p class="yl-son">' + h(bolumAd(aktif)) + ' bölümündesin.</p>') +
        '<div class="yl-cta"><button class="yl-btn yl-ana" id="yldevam">Devam et <span aria-hidden="true">→</span></button><button class="yl-btn yl-hayalet" id="ylseviye">Seviye testi</button></div>'
        : '<h2>İlk dersine başla</h2><p class="yl-son">Kısa bir dersle İngilizce öğrenmeye başlayabilirsin.</p>' +
        '<div class="yl-cta"><button class="yl-btn yl-ana" id="ylsifir">İlk derse başla <span aria-hidden="true">→</span></button><button class="yl-btn yl-hayalet" id="ylseviye">Seviye testi</button></div>') +
      (sv ? '<p class="yl-mini yl-sv">Önerilen başlangıç: <b>' + h(bolumAd(sv)) + '</b></p>' : "") +
      (basladi ? '<p class="yl-mini yl-hero-ilerleme">A1 <b>%' + a1.p + '</b> · A2 <b>%' + a2.p + '</b></p>' : "") +
      '</section>';

    /* 2) Bugunku calisma: siradaki adim + kelime tekrari */
    var bugun = '<h2 class="sec-title yl-yol-b">Bugünkü çalışma</h2>' +
      (siradaki && basladi ? '<button class="card yl-siradaki" id="ylsiradaki"><span class="yl-oi">' + IKON[siradaki.tip] + '</span>' +
        '<span class="yl-ot"><em>Sıradaki adım · ' + h(bolumAd(aktif)) + '</em><b>' + h(siradaki.ad) + '</b><small>' + h(siradaki.alt) + '</small></span><span class="yl-od">›</span></button>' : "");

    /* 5) Ilerleme (istatistikler en sonda) */
    var ilerleme = '<h2 class="sec-title yl-yol-b">İlerlemen</h2><section class="card yl-ilerleme">' +
      '<div class="yl-lvls">' +
      '<div class="yl-lvl"><div><b>A1</b><span>%' + a1.p + ' tamamlandı</span></div><span class="yl-bar"><i style="width:' + a1.p + '%"></i></span><small>' + a1.d + '/' + a1.t + ' adım</small></div>' +
      '<div class="yl-lvl"><div><b>A2</b><span>%' + a2.p + ' tamamlandı</span></div><span class="yl-bar"><i style="width:' + a2.p + '%"></i></span><small>' + a2.d + '/' + a2.t + ' adım</small></div>' +
      '</div>' +
      '<div class="yl-hero-hiz"><span>Ses hızı (tüm kurs)</span>' + hizSecici() + '</div>' +
      '</section>';

    var toplamV = WORDS.length;
    var tekrar =
      '<section class="card yl-tekrar-k">' +
      '<div class="yl-tk-ust"><div><p class="yl-kicker">Kelime tekrar sistemi</p>' +
      '<h3>' + (vade ? 'Bugün tekrar etmen gereken <b>' + vade + '</b> kelime var' : (Object.keys(Y.vocab).length ? "Bugünkü tekrarların bitti " : "3000 kelimelik sözlükle başla")) + '</h3>' +
      '<p class="yl-mini">Yanlış bildiğin kelime daha sık, doğru bildiğin daha seyrek gelir.</p></div>' +
      '<div class="yl-btns">' + (vade ? '<button class="yl-btn yl-ana" id="yltekrarbas">Tekrara başla</button>' : "") + '<button class="yl-btn' + (vade ? "" : " yl-ana") + '" id="ylyeni">10 yeni kelime</button></div></div>' +
      '<div class="yl-vbar" aria-hidden="true">' +
      ["ogrenildi", "ogreniliyor", "tekrar"].map(function (k) { return vs[k] ? '<i class="yl-v-' + k + '" style="width:' + Math.max(0.6, vs[k] / toplamV * 100) + '%"></i>' : ""; }).join("") + '</div>' +
      '<ul class="yl-vleg">' +
      '<li><i class="yl-v-yeni"></i>Yeni <b>' + vs.yeni + '</b></li><li><i class="yl-v-ogreniliyor"></i>Öğreniliyor <b>' + vs.ogreniliyor + '</b></li>' +
      '<li><i class="yl-v-tekrar"></i>Tekrar zamanı <b>' + vs.tekrar + '</b></li><li><i class="yl-v-ogrenildi"></i>Öğrenildi <b>' + vs.ogrenildi + '</b></li></ul>' +
      '</section>';
    bugun += tekrar;

    var yol = '<h2 class="sec-title yl-yol-b" id="ogrenme-yolu">Öğrenme yolu</h2><p class="sec-sub">Beş bölüm, A1\'den A2\'ye. Her bölümde kelime, dinleme, konuşma, gramer, hikâye ve mini test var. Sırayla ilerlemek en verimlisi — ama istediğin adımı açabilirsin.</p>' +
      '<ol class="yl-yol">' + BOLUMLER.map(function (b, bi) {
        var x = bolumDurum(b), p = yuzde(x.d, x.t), tam = x.d === x.t;
        return '<li class="yl-bolum' + (b.id === aktif.id ? " aktif" : "") + (tam ? " tam" : "") + '" id="yl-' + b.id + '">' +
          '<details' + (b.id === acikId ? " open" : "") + '><summary>' +
          '<span class="yl-no">' + (tam ? "✓" : bi + 1) + '</span>' +
          '<span class="yl-bb"><span class="yl-sev">' + b.sev + '</span><b>' + h(b.ad) + '</b><small>' + h(b.alt) + '</small>' +
          '<span class="yl-bp"><span class="yl-bar"><i style="width:' + p + '%"></i></span><em>' + x.d + '/' + x.t + '</em></span></span>' +
          '<span class="yl-ok" aria-hidden="true">▾</span></summary>' +
          '<ul class="yl-ogeler">' + x.L.map(function (o, oi) {
            return '<li><button class="yl-oge' + (o.done ? " bitti" : "") + '" data-b="' + b.id + '" data-i="' + oi + '">' +
              '<span class="yl-oi">' + IKON[o.tip] + '</span><span class="yl-ot"><em>' + TIP_AD[o.tip] + '</em><b>' + h(o.ad) + '</b><small>' + h(o.alt) + '</small></span>' +
              '<span class="yl-od">' + (o.done ? "✓" : "›") + '</span></button></li>';
          }).join("") + '</ul>' +
          (bi === BOLUMLER.length - 1 ? '<p class="yl-ek">Ek pratik: <button class="yl-link" data-git="telaffuz">Telaffuz</button> · <button class="yl-link" data-git="oyun">Oyunlar</button> · <button class="yl-link" data-git="gunluk">Günün cümlesi</button></p>' : "") +
          '</details></li>';
      }).join("") + '</ol>';

    kutu.innerHTML = '<div class="yl">' + hero + bugun + yol + ilerleme + '</div>';

    /* ---- baglantilar ---- */
    hizBagla(kutu);
    var dv = $q("#yldevam"); if (dv) dv.onclick = devam;
    var sf = $q("#ylsifir"); if (sf) sf.onclick = function () { Y.odak = "b1"; kaydet(); git("ders", "u1"); };
    $q("#ylseviye").onclick = seviyeAc;
    var sr = $q("#ylsiradaki"); if (sr && siradaki) sr.onclick = siradaki.ac;
    var tb = $q("#yltekrarbas"); if (tb) tb.onclick = function () { tekrarAc({ mod: "tekrar" }); };
    $q("#ylyeni").onclick = function () { tekrarAc({ mod: "yeni" }); };
    kutu.querySelectorAll(".yl-oge").forEach(function (btn) {
      btn.onclick = function () {
        var b = BOLUM(btn.dataset.b); var L = ogeler(b); var o = L[+btn.dataset.i];
        Y.odak = b.id; kaydet();
        if (o) o.ac();
      };
    });
    kutu.querySelectorAll("[data-git]").forEach(function (b) { b.onclick = function () { showView(b.dataset.git); }; });
    if (acik) { var el = document.getElementById("yl-" + acik); if (el) setTimeout(function () { el.scrollIntoView({ block: "start", behavior: "smooth" }); }, 50); }
  }
  function devam() {
    var L = Y.last;
    if (L && L.t && sonEtiket(L)) return git(L.t, L.id);
    var s = bolumDurum(aktifBolum()).L.find(function (o) { return !o.done; });
    if (s) s.ac(); else panel();
  }

  /* ======================= SEKME + ACILIS ======================= */
  (function () {
    var nav = document.getElementById("nav"), main = document.querySelector("main.wrap");
    if (!nav || !main) return;
    if (!document.getElementById("v-yol")) {
      var sec_ = document.createElement("section"); sec_.className = "view"; sec_.id = "v-yol";
      main.insertBefore(sec_, main.firstChild);
    }
    var homeButton = nav.querySelector('[data-v="yol"]');
    if (!homeButton) {
      homeButton = document.createElement("button");
      homeButton.dataset.v = "yol";
      nav.insertBefore(homeButton, nav.firstChild);
    }
    homeButton.setAttribute("aria-label", "Öğren");
    homeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>Öğren';
    homeButton.onclick = function () { showView("yol"); };
    /* mobil alt menu yatay kayar: sagda gizli sekme varsa kenar solsun */
    var ipucu = function () { try { nav.classList.toggle("yl-dahavar", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4); } catch (e) { } };
    nav.addEventListener("scroll", ipucu, { passive: true }); addEventListener("resize", ipucu); setTimeout(ipucu, 0);
    var f = window.showView;
    window.showView = function (v) {
      try { sesDurdur(); kayitDurdur(); document.body.classList.toggle("yl-ic", v !== "yol"); } catch (e) { }
      var r = f.apply(this, arguments);
      if (v === "yol") {
        if (!yolIc) try { panel(); } catch (e) { }
        /* alt sayfadaysak panel kurs kokunun adresine gecsin */
        try {
          var kok = window.BX_KURS_YOL;
          if (kok && location.pathname !== kok && location.pathname.indexOf(kok) === 0) history.pushState({ v: "yol" }, "", kok);
        } catch (e) { }
      }
      return r;
    };
  })();

  function acilis() {
    if (window.BX_ACILIS) return;                  /* alt sayfa: acilis.js hangi sekmenin acilacagina karar verir */
    var hs = location.hash;
    try {
      if (hs === "#seviye-testi") return seviyeAc();
      if (hs === "#tekrar") return tekrarAc({});
      if (hs === "#ai-konusma") return aiListe();
      if (hs === "#diyaloglar") return diyalogListe();
      if (hs === "#telaffuz-calismasi") return telaffuzListe();
      if (hs === "#shadowing") return golgeAc("A1");
      if (hs === "#dinleme-testi") return dtestListe();
      if (hs === "#gramer-gecmisi") return gramerGecmisi();
      if (hs === "#dersler") return showView("dersler");
      showView("yol");
    } catch (e) { try { showView("dersler"); } catch (_) { } }
  }
  acilis();
  window.bxYol = {
    panel: panel, seviye: seviyeAc, tekrar: tekrarAc, ai: aiListe, diyalog: diyalogListe, telaffuz: telaffuzListe, golge: golgeAc, dinlemeTesti: dtestListe,
    BOLUMLER: BOLUMLER, SENARYO: SENARYO, durum: vDurum, KonusmaServisi: KonusmaServisi, progressStore: progressStore, LocalStorageProgressStore: LocalStorageProgressStore,
    sesAdresi: function (m, g) { return sesAdresi(m, g); }
  };
})();
