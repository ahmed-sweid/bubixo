/* ================== BUBIXO INGILIZCE — CEVIRI PANELI ==================
   Yeni servis YOK: sitenin zaten calisan cevirmenini kullanir
   (bubixo-text-tools, POST /text-tools/translate — OpenAI gpt-5.6-luna).
   Kelime-alti karsiliklar SUNUCUYA GITMEDEN kursun kendi sozlugunden uretilir.
   Cevirmen erisilemezse buton hic gorunmez; kurs eksiksiz calisir.
   ====================================================================== */
(function () {
  "use strict";

  /* --- kullaniciya gorunen her metin burada --- */
  const UI = {
    ico: "⇄",
    btn: "Çeviri",
    title: "Çeviri",
    close: "Kapat",
    dirs: [{ k: "tr-en", ad: "Türkçe → İngilizce", src: "tr", tgt: "en" },
    { k: "en-tr", ad: "İngilizce → Türkçe", src: "en", tgt: "tr" }],
    ph: { "tr-en": "Türkçe cümleni yaz…", "en-tr": "İngilizce cümleni yaz…" },
    translate: "Çevir",
    working: "Çevriliyor…",
    listen: " Dinle",
    copy: "Kopyala",
    copied: "Kopyalandı ",
    shortcut: "Ctrl + Enter ile de çevirebilirsin.",
    longText: "Uzun metin mi? Tam çevirmeni aç →",
    history: "Son çevirilerin",
    wordNote: "Karşılıklar kursun 3000 kelimelik sözlüğünden geliyor; bazı kelimeler boş kalabilir.",
    empty: "Önce bir şeyler yaz.",
    tooLong: "En fazla 300 karakter.",
    busy: "Biraz hızlı gittin  Bir dakika sonra tekrar dene.",
    down: "Çeviri şu an cevap vermiyor, birazdan tekrar dene.",
    openFull: "Tam çevirmeni aç →",
    alts: "Alternatifler"
  };

  const API = "https://api.bubixo.com/text-tools";
  const FULL = "https://api.bubixo.com/ceviri/";
  const MAX = 300;                 /* kurs kutusu bilincli olarak kisa; servis 5000 kabul eder */
  const KEY = "bx-eng-ceviri";
  const PROBE = 2000;

  let acik = false, mesgul = false, yon = "tr-en", sonIstek = null, sonSonuc = null;
  let token = null, tokenBitis = 0, sozluk = null;

  /* ---------- kucuk yardimcilar ---------- */
  const el = id => document.getElementById(id);
  const gec = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
  const gecYaz = a => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 5))); } catch (e) { } };
  const kacis = s => (typeof esc === "function") ? esc(s)
    : String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- 3) kelime-alti karsilik: sozlukten, sunucusuz ---------- */
  const SADE = /^[^\wçğıöşüÇĞİÖŞÜ']+|[^\wçğıöşüÇĞİÖŞÜ']+$/g;
  const sade = p => String(p).replace(SADE, "").toLowerCase();

  function sozlukKur() {
    if (sozluk) return sozluk;
    sozluk = new Map();
    const koy = (k, v) => { if (k && v && !sozluk.has(k)) sozluk.set(k, v); };
    const ekle = list => {
      if (list) list.forEach(w => {
        const ham = String(w.e || "").toLowerCase().trim();
        const tr = String(w.t || "").split(/[;,]/)[0].trim();
        koy(ham, tr);
        /* "how are you?" gibi girdiler noktalamasiz da aranabilsin */
        koy(ham.split(/\s+/).map(sade).join(" "), tr);
      });
    };
    if (typeof WORDS !== "undefined") ekle(WORDS);
    if (typeof GAMEWORDS !== "undefined") ekle(GAMEWORDS);
    return sozluk;
  }
  /* Sozlukte olmayan ama her cumlede gecen dilbilgisi kelimeleri.
     Hikayeler'deki islev-karsiligi gelenegi ("is" -> "-dir") burada da surer;
     sozluk her zaman once bakilir, bu tablo yalnizca bosluk doldurur. */
  const GRAMER = {
    is: "-dir", are: "-dir", am: "-im", was: "-di", were: "-di", been: "olmuş",
    has: "vardır", does: "(soru yapar)", did: "(geçmiş yapar)", an: "bir",
    must: "-meli", should: "-malı", might: "belki", ever: "hiç",
    "isn't": "değil", "aren't": "değil", "don't": "(olumsuz)", "doesn't": "(olumsuz)",
    "didn't": "(olumsuz geçmiş)", "won't": "(olumsuz gelecek)"
  };
  /* cekim kokleri: books/book, walked/walk, going/go, countries/country */
  function kokler(k) {
    const a = [];
    if (/ies$/.test(k)) a.push(k.slice(0, -3) + "y");
    if (/es$/.test(k)) a.push(k.slice(0, -2));
    if (/s$/.test(k)) a.push(k.slice(0, -1));
    if (/ed$/.test(k)) a.push(k.slice(0, -2), k.slice(0, -1));
    if (/ing$/.test(k)) a.push(k.slice(0, -3), k.slice(0, -3) + "e");
    return a.filter(function (x) { return x.length > 1; });
  }
  function karsilik(kelime) {
    const s = sozlukKur();
    const k = kelime.toLowerCase();
    if (s.has(k)) return s.get(k);
    const a = kokler(k);
    for (var i = 0; i < a.length; i++) { if (s.has(a[i])) return s.get(a[i]); }
    if (GRAMER[k]) return GRAMER[k];
    return "";                       /* bulunamayanin alti TEMIZ BOS kalir */
  }
  /* Obek once, kelime sonra: "get up" ikiye bolunup up=yukari YAZILMAZ.
     Sozlukte 408 cok kelimeli girdi var; en uzun eslesme kazanir (3 -> 2 -> 1). */
  function kelimeAlti(cumle) {
    const s = sozlukKur();
    const parca = String(cumle).split(/\s+/).filter(Boolean);
    const out = [];
    for (var i = 0; i < parca.length;) {
      var tr = "", n = 0;
      for (var uz = Math.min(3, parca.length - i); uz >= 2; uz--) {
        var kelimeler = parca.slice(i, i + uz).map(sade);
        var anahtar = kelimeler.join(" ");
        if (s.has(anahtar)) { tr = s.get(anahtar); n = uz; break; }
        /* "looking for" -> "look for": ilk kelimeyi kokune indirip bir daha bak */
        var kk = kokler(kelimeler[0]), bulundu = false;
        for (var x = 0; x < kk.length; x++) {
          var a2 = [kk[x]].concat(kelimeler.slice(1)).join(" ");
          if (s.has(a2)) { tr = s.get(a2); n = uz; bulundu = true; break; }
        }
        if (bulundu) break;
      }
      if (!n) { n = 1; tr = karsilik(sade(parca[i])); }
      /* Hikayeler'deki bilesenin AYNISI — yeni CSS yok */
      out.push('<span class="wg"><span class="wt">' + kacis(parca.slice(i, i + n).join(" "))
        + '</span><span class="wa">' + kacis(tr) + '</span></span>');
      i += n;
    }
    return out.join("");
  }

  /* ---------- servis ---------- */
  async function tokenAl() {
    const now = Date.now();
    if (token && now < tokenBitis) return token;
    const r = await fetch(API + "/token", { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!r.ok) throw { kod: r.status };
    const d = await r.json();
    if (!d || !d.token) throw { kod: 0 };
    token = d.token;
    tokenBitis = now + Math.max(30, (d.expires_in || 300) - 30) * 1000;
    return token;
  }
  async function cevir(text, src, tgt, tekrar) {
    const t = await tokenAl();
    const r = await fetch(API + "/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Text-Tools-Token": t },
      body: JSON.stringify({ text: text, source: src, target: tgt })
    });
    if (r.status === 401 && !tekrar) { token = null; return cevir(text, src, tgt, true); }  /* token suresi doldu */
    if (!r.ok) throw { kod: r.status };
    const d = await r.json();
    if (!d || d.success !== true || typeof d.translation !== "string") throw { kod: 0 };      /* bozuk/bos cevap */
    return d;
  }

  /* ---------- 5) servis kapaliysa buton HIC gorunmez ---------- */
  let yoklandi = false;
  function checkTranslator(tekrar) {
    if (el("bx-cev-btn")) return;
    if (yoklandi && !tekrar) return;      /* iki yerden cagrilsa bile tek yoklama */
    yoklandi = true;
    let vazgec = null;
    const ctrl = ("AbortController" in window) ? new AbortController() : null;
    if (ctrl) vazgec = setTimeout(function () { ctrl.abort(); }, PROBE);
    fetch(API + "/health", { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) { if (d && d.success) butonEkle(); else return Promise.reject(); })
      .catch(function () {
        /* yavas baglantida tek bir 2 sn'lik iska ozelligi KALICI gizlemesin: bir kez daha dene */
        if (!tekrar) { setTimeout(function () { checkTranslator(true); }, 5000); return; }
        console.warn("[bubixo] cevirmen erisilemedi, Ceviri butonu gizlendi");
      })
      .then(function () { if (vazgec) clearTimeout(vazgec); });
  }
  function butonEkle() {
    const yer = document.querySelector(".top-row");
    if (!yer || el("bx-cev-btn")) return;
    const b = document.createElement("button");
    b.id = "bx-cev-btn"; b.className = "cev-btn"; b.type = "button";
    const i = document.createElement("span"); i.className = "cev-ico"; i.textContent = UI.ico;
    const t = document.createElement("span"); t.textContent = UI.btn;
    b.appendChild(i); b.appendChild(t);
    b.onclick = ac;
    yer.appendChild(b);
  }

  /* ---------- panel ---------- */
  function kabuk() {
    if (el("bx-cev")) return;
    const d = document.createElement("div");
    d.id = "bx-cev"; d.className = "cev-wrap";
    d.setAttribute("role", "dialog"); d.setAttribute("aria-label", UI.title);
    d.innerHTML = ''
      + '<div class="cev-arka" id="cevarka"></div>'
      + '<div class="cev-panel">'
      + '<div class="cev-head"><b>' + UI.title + '</b>'
      + '<button class="cev-x" id="cevx" aria-label="' + UI.close + '">&#10005;</button></div>'
      + '<div class="cev-body">'
      + '<div class="chips" id="cevyon">'
      + UI.dirs.map(function (y) { return '<button class="chip' + (y.k === yon ? " on" : "") + '" data-y="' + y.k + '">' + y.ad + '</button>'; }).join("")
      + '</div>'
      + '<textarea class="cev-in" id="cevin" maxlength="' + MAX + '" rows="3" placeholder="' + UI.ph[yon] + '"></textarea>'
      + '<div class="cev-say"><span id="cevsay">0/' + MAX + '</span><span>' + UI.shortcut + '</span></div>'
      + '<div class="kur-btns">'
      + '<button class="go" id="cevgo">' + UI.translate + '</button>'
      + '<button id="cevspk">' + UI.listen + '</button>'
      + '<button id="cevcopy">' + UI.copy + '</button>'
      + '</div>'
      + '<div id="cevout"></div>'
      + '<div id="cevgec"></div>'
      + '<a class="cev-full" href="' + FULL + '" target="_blank" rel="noopener">' + UI.longText + '</a>'
      + '</div>'
      + '</div>';
    document.body.appendChild(d);
    el("cevx").onclick = kapat;
    el("cevarka").onclick = kapat;
    document.querySelectorAll("#cevyon .chip").forEach(function (b) {
      b.onclick = function () {
        yon = b.dataset.y;
        document.querySelectorAll("#cevyon .chip").forEach(function (x) { x.classList.toggle("on", x.dataset.y === yon); });
        el("cevin").placeholder = UI.ph[yon];
        el("cevout").innerHTML = ""; sonSonuc = null; sonIstek = null;
      };
    });
    const inp = el("cevin");
    inp.oninput = function () { el("cevsay").textContent = inp.value.length + "/" + MAX; };
    inp.onkeydown = function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); calistir(); } };
    el("cevgo").onclick = calistir;
    el("cevspk").onclick = function () { if (sonSonuc && typeof speak === "function") speak(sonSonuc.en); };
    el("cevcopy").onclick = function () {
      if (!sonSonuc) return;
      const metin = sonSonuc.tgt === "en" ? sonSonuc.en : sonSonuc.tr;
      const bitir = function () { const b = el("cevcopy"); b.textContent = UI.copied; setTimeout(function () { b.textContent = UI.copy; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).then(bitir, function () { });
      else bitir();
    };
    document.addEventListener("keydown", function (e) { if (acik && e.key === "Escape") kapat(); });
  }
  function ac() {
    kabuk();
    acik = true;
    el("bx-cev").classList.add("on");
    document.body.classList.add("cev-kilit");
    gecCiz();
    setTimeout(function () { const i = el("cevin"); if (i) i.focus(); }, 60);
  }
  function kapat() {
    acik = false;
    const w = el("bx-cev"); if (w) w.classList.remove("on");
    document.body.classList.remove("cev-kilit");
    if (typeof stopSpeak === "function") stopSpeak();
  }

  /* ---------- ceviri akisi ---------- */
  async function calistir() {
    if (mesgul) return;                                     /* cift tiklama tek istek */
    const inp = el("cevin"), out = el("cevout");
    const metin = (inp.value || "").trim();
    if (!metin) return uyar(UI.empty);
    if (metin.length > MAX) return uyar(UI.tooLong);
    const d = UI.dirs.filter(function (x) { return x.k === yon; })[0];
    const imza = yon + " " + metin;
    if (sonIstek === imza && sonSonuc) { sonucCiz(sonSonuc); return; }   /* ayni metin: yeni istek yok */

    mesgul = true;
    const go = el("cevgo");
    go.disabled = true; go.textContent = UI.working;
    out.innerHTML = '<div class="cev-bekle">' + UI.working + '</div>';
    try {
      const c = await cevir(metin, d.src, d.tgt);
      const en = d.tgt === "en" ? c.translation : metin;
      const tr = d.tgt === "en" ? metin : c.translation;
      sonIstek = imza;
      sonSonuc = { en: en, tr: tr, tgt: d.tgt, note: c.note, alt: c.alt, level: c.level };
      sonucCiz(sonSonuc);
      const g = gec().filter(function (x) { return !(x.en === en && x.tr === tr); });
      g.unshift({ en: en, tr: tr, tgt: d.tgt }); gecYaz(g); gecCiz();
    } catch (err) {
      const kod = (err && err.kod) || 0;
      out.innerHTML = '<div class="cev-hata">' + (kod === 429 ? UI.busy : UI.down)
        + ' <a href="' + FULL + '" target="_blank" rel="noopener">' + UI.openFull + '</a></div>';
    } finally {
      mesgul = false;
      go.disabled = false; go.textContent = UI.translate;
    }
  }
  function uyar(m) { el("cevout").innerHTML = '<div class="cev-hata">' + kacis(m) + '</div>'; }

  /* sonuc cizici — note/alt/level BOSSA CIZILMEZ (yapay zeka gelince arayuz degismez) */
  function sonucCiz(s) {
    const out = el("cevout");
    out.innerHTML = ''
      + '<div class="cev-sonuc">'
      + (s.level ? '<span class="cev-lvl">' + kacis(s.level) + '</span>' : "")
      + '<div class="cev-en"><b>' + kacis(s.en) + '</b>'
      + '<button class="bigspk" id="cevspk2" aria-label="' + UI.listen + '">' + (typeof SPK !== "undefined" ? SPK : "&#128266;") + '</button></div>'
      + '<div class="cev-tr">' + kacis(s.tr) + '</div>'
      + '<div class="st-words cev-words">' + kelimeAlti(s.en) + '</div>'
      + (s.note ? '<div class="kur-note">' + kacis(s.note) + '</div>' : "")
      + (s.alt && s.alt.length ? '<div class="cev-alt"><b>' + UI.alts + '</b>'
        + s.alt.map(function (a) { return '<div>' + kacis(a) + '</div>'; }).join("") + '</div>' : "")
      + '<div class="cev-note">' + UI.wordNote + '</div>'
      + '</div>';
    const b = el("cevspk2");
    if (b) b.onclick = function () { if (typeof speak === "function") speak(s.en); };
    document.querySelectorAll("#cevout .wg").forEach(function (w) {
      w.onclick = function () {
        if (typeof speak === "function") speak(w.querySelector(".wt").textContent);
      };
    });
  }
  function gecCiz() {
    const g = gec(), kutu = el("cevgec");
    if (!kutu) return;
    kutu.innerHTML = g.length ? '<div class="cev-gec"><b>' + UI.history + '</b>'
      + g.map(function (x, i) { return '<button class="cev-grow" data-i="' + i + '"><span>' + kacis(x.en) + '</span><i>' + kacis(x.tr) + '</i></button>'; }).join("")
      + '</div>' : "";
    kutu.querySelectorAll("[data-i]").forEach(function (b) {
      b.onclick = function () {
        const x = g[+b.dataset.i];
        sonSonuc = { en: x.en, tr: x.tr, tgt: x.tgt }; sonIstek = null;
        sonucCiz(sonSonuc);
      };
    });
  }

  window.checkTranslator = checkTranslator;
  /* emniyet agi: app.js cagirmasa da calissin (cift cagri yoklandi bayragiyla yutulur) */
  if (document.readyState === "complete") checkTranslator();
  else window.addEventListener("load", function () { checkTranslator(); });
  window.bxCeviri = { ac: ac, kapat: kapat, cevir: cevir, karsilik: karsilik, kelimeAlti: kelimeAlti };
})();
