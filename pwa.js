/* ============ BUBIXO AKADEMI — PWA istemcisi ============
   app.js'e HIC DOKUNMAZ. Yaptiklari:
     1) service worker'i kaydeder (kurs adi ve surum adreste)
     2) "Yeni surum hazir" seridi — sayfayi ALTINDAN CEKMEZ, kullanici yeniler
     3) Cevrimdisi seridi + cevrimdisiyken ceviri dugmesini gizler
     4) Kurulum daveti — ILK saniyede DEGIL: ikinci gun veya bir ders bitince
     5) "Sesleri indir" karti (yalniz HIKAYE sesleri; sozluk pakete GIRMEZ)

   Gorunen her metin UI nesnesinde; kurs dili window.BX_PWA_UI ile gelir.
   Servis/ag erisilemezse hicbir sey yapmaz, kurs aynen calisir.
   ======================================================== */
(function(){
"use strict";

var KURS   = String(window.BX_KURS || "");
var SURUM  = String(window.BX_PWA_SURUM || "1");
var VARLIK = String(window.BX_VARLIK_KOK || "");     /* api.bubixo.com/<yol>/ */
if(!KURS || !("serviceWorker" in navigator)) return;

var UI = window.BX_PWA_UI || {};
var D = {
  yeniSurum:"Neue Version bereit", yenile:"Neu laden",
  cevrimdisi:"Du bist offline — die Lektionen laufen weiter.",
  kur:"Zum Startbildschirm hinzufügen", kurAlt:"Offline lernen, ohne App-Store.",
  kurEt:"Hinzufügen", kapat:"Später",
  iosBaslik:"Zum Startbildschirm hinzufügen",
  ios:"Tippe unten auf «Teilen» und dann auf «Zum Home-Bildschirm».",
  sesBaslik:"Geschichten offline hören", sesAlt:"Lade die Tonspur aller Geschichten herunter",
  sesIndir:"Herunterladen", sesIniyor:"Wird geladen…", sesHazir:"Alle Geschichten sind offline",
  sesKismi:"von", sesHata:"Nicht vollständig geladen — versuch es später noch einmal."
};
for(var k in D) if(!(k in UI)) UI[k] = D[k];

var esc = function(s){ var d=document.createElement("div"); d.textContent=s==null?"":s; return d.innerHTML; };

/* ---------- kucuk serit ---------- */
function serit(id, metin, dugme, tikla, renk){
  if(document.getElementById(id)) return;
  var el = document.createElement("div");
  el.id = id;
  /* Birden fazla serit acikken ust uste binmesin: yenisi oncekinin ALTINA. */
  var ustte = 0;
  ["bx-yeni","bx-off","bx-kur","bx-ios"].forEach(function(x){
    var e = document.getElementById(x);
    if(e) ustte += e.getBoundingClientRect().height;
  });
  el.style.cssText = "position:fixed;left:0;right:0;top:" + ustte + "px;z-index:9999;display:flex;gap:12px;" +
    "align-items:center;justify-content:center;padding:9px 14px;font:600 14px/1.4 inherit;" +
    "background:" + (renk || "#10251c") + ";color:#e8f2ec;box-shadow:0 2px 12px rgba(0,0,0,.22)";
  el.innerHTML = '<span>' + esc(metin) + '</span>' + (dugme ?
    '<button style="font:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.45);' +
    'background:transparent;color:#fff;border-radius:8px;padding:4px 12px">' + esc(dugme) + '</button>' : '') +
    '<button aria-label="x" style="font:inherit;cursor:pointer;border:0;background:transparent;' +
    'color:#9fc5b3;padding:2px 6px">&#10005;</button>';
  var dg = el.querySelectorAll("button");
  if(dugme && tikla) dg[0].onclick = tikla;
  dg[dg.length-1].onclick = function(){ el.remove(); };
  document.body.appendChild(el);
  seritPayi();
  return el;
}

/* ---------- 1) kayit ---------- */
var kayit = null;
var swAdres = "sw.js?k=" + encodeURIComponent(KURS) + "&v=" + encodeURIComponent(SURUM) +
              "&a=" + encodeURIComponent(VARLIK) +
              "&f=" + encodeURIComponent((window.BX_KABUK || []).join(","));
addEventListener("load", function(){
  navigator.serviceWorker.register(swAdres).then(function(r){
    kayit = r;
    /* Yeni surum bekliyorsa serit goster — otomatik yenileme YOK. */
    if(r.waiting) yeniSurumSeridi();
    r.addEventListener("updatefound", function(){
      var y = r.installing;
      if(!y) return;
      y.addEventListener("statechange", function(){
        if(y.state === "installed" && navigator.serviceWorker.controller) yeniSurumSeridi();
      });
    });
  }).catch(function(){});
});
function yeniSurumSeridi(){
  serit("bx-yeni", UI.yeniSurum, UI.yenile, function(){
    try{ if(kayit && kayit.waiting) kayit.waiting.postMessage({tip:"atla"}); }catch(e){}
    location.reload();
  });
}

/* ---------- 2) cevrimdisi ---------- */
function cevrimdisiDurum(){
  var kapali = !navigator.onLine;
  document.documentElement.classList.toggle("bx-cevrimdisi", kapali);
  if(kapali) serit("bx-off", UI.cevrimdisi, null, null, "#5a4a1f");
  else { var e = document.getElementById("bx-off"); if(e) e.remove(); }
}
addEventListener("online", cevrimdisiDurum);
addEventListener("offline", cevrimdisiDurum);
addEventListener("load", cevrimdisiDurum);
/* cevrimdisiyken cevirmen ve Bubi gizlenir — hata kutusu YOK */
/* Seritler position:fixed; govdeyi ITMEZLERSE sayfanin ustunu ORTERLER
   (ilk denemede logo ve ceviri dugmesi seridin altinda kaldi).
   Serit varken <body> yukaridan itilir; yukseklik JS ile olculur cunku
   metin iki satira tasabiliyor. */
var st = document.createElement("style");
st.textContent =
  ".bx-cevrimdisi .cev-btn,.bx-cevrimdisi #bubi-launcher,.bx-cevrimdisi .bx-bubi{display:none!important}" +
  "body{transition:padding-top .12s}";
document.head.appendChild(st);

function seritPayi(){
  var y = 0;
  ["bx-yeni","bx-off","bx-kur","bx-ios"].forEach(function(id){
    var e = document.getElementById(id);
    if(e) y = Math.max(y, e.getBoundingClientRect().height);
  });
  document.body.style.paddingTop = y ? y + "px" : "";
}
/* Serit eklenip kaldirildikca payi guncelle */
new MutationObserver(seritPayi).observe(document.documentElement, {childList:true, subtree:true});
addEventListener("resize", seritPayi);

/* ---------- 3) kurulum daveti: ilk saniyede DEGIL ---------- */
var ANAHTAR = "bx-pwa-" + KURS;
function durum(){ try{ return JSON.parse(localStorage.getItem(ANAHTAR) || "{}") || {}; }catch(e){ return {}; } }
function durumYaz(d){ try{ localStorage.setItem(ANAHTAR, JSON.stringify(d)); }catch(e){} }
var bekleyenDavet = null;
addEventListener("beforeinstallprompt", function(ev){
  ev.preventDefault(); bekleyenDavet = ev; davetDene();
});
/* Ilk ziyaret tarihi HER ACILISTA kaydedilir. Yalnizca beforeinstallprompt
   icinde kaydedilseydi ve o olay 2. gunde gelseydi, "ilk gun" o gun sayilir ve
   kullanici bir gun daha beklerdi. */
(function(){ var d = durum();
  if(!d.ilk){ d.ilk = new Date().toISOString().slice(0,10); durumYaz(d); } })();

function hakEdildiMi(){
  var d = durum(), bugun = new Date().toISOString().slice(0,10);
  if(!d.ilk){ d.ilk = bugun; durumYaz(d); }
  if(d.kapatildi || d.kuruldu) return false;
  if(d.ilk !== bugun) return true;                       /* ikinci gun */
  try{                                                    /* veya bir ders bitti */
    var S = JSON.parse(localStorage.getItem(window.BX_STORE_KEY || "") || "{}");
    var u = S.units || {};
    for(var i in u) if(u[i] && u[i].done) return true;
  }catch(e){}
  return false;
}
function davetDene(){
  if(!bekleyenDavet || !hakEdildiMi()) return;
  var el = serit("bx-kur", UI.kur, UI.kurEt, function(){
    var p = bekleyenDavet; bekleyenDavet = null;
    if(el) el.remove();
    try{ p.prompt(); }catch(e){}
  });
  if(el) el.querySelector("button:last-child").addEventListener("click", function(){
    var d = durum(); d.kapatildi = 1; durumYaz(d);
  });
}
addEventListener("appinstalled", function(){ var d = durum(); d.kuruldu = 1; durumYaz(d); });
/* iOS: beforeinstallprompt yok -> ikinci ziyarette tek satirlik yonerge */
addEventListener("load", function(){
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  if(!ios) return;
  setTimeout(function(){ if(hakEdildiMi()) serit("bx-ios", UI.iosBaslik + " — " + UI.ios); }, 1500);
});

/* ---------- 4) "Sesleri indir": YALNIZ hikaye sesleri ---------- */
function hikayeAdresleri(){
  if(typeof STORIES === "undefined" || !window.bxSes) return [];
  var kok = "https://api.bubixo.com/audio/" + (window.BX_SES_DIL || "tr") + "/v1/";
  var kume = {};
  STORIES.forEach(function(s){ s.lines.forEach(function(l){
    var m = (window.BX_SES_DIL === "en") ? l.en : l.tr;
    if(!m) return;
    kume[kok + (l.v === "d" ? "d" : "c") + "/" + window.bxSes.hash(m) + ".mp3"] = 1;
  }); });
  return Object.keys(kume);
}
function sesKarti(){
  var kap = document.getElementById("v-gunluk");
  if(!kap || document.getElementById("bx-ses-kart")) return;
  var adresler = hikayeAdresleri();
  if(!adresler.length) return;
  var mb = (adresler.length * 17600 / 1048576).toFixed(1);      /* olculen ortalama ~17,6 KB */
  var d = document.createElement("div");
  d.id = "bx-ses-kart"; d.className = "card";
  d.style.cssText = "padding:18px 20px;margin-top:18px";
  d.innerHTML = '<div style="font-weight:700;font-size:17px">' + esc(UI.sesBaslik) + '</div>' +
    '<div style="font-size:14px;color:var(--soft);margin:4px 0 12px">' + esc(UI.sesAlt) +
    ' · <span dir="ltr">' + adresler.length + ' · ' + mb + ' MB</span></div>' +
    '<button id="bx-ses-btn" class="startquiz" style="margin-top:0">' + esc(UI.sesIndir) + '</button>' +
    '<div id="bx-ses-dur" style="font-size:13.5px;color:var(--soft);margin-top:8px"></div>';
  kap.appendChild(d);
  var btn = d.querySelector("#bx-ses-btn"), bilgi = d.querySelector("#bx-ses-dur");
  navigator.serviceWorker.ready.then(function(r){
    if(r.active) r.active.postMessage({tip:"ses-durumu", adresler:adresler});
  }).catch(function(){});
  btn.onclick = function(){
    btn.disabled = true; btn.textContent = UI.sesIniyor;
    navigator.serviceWorker.ready.then(function(r){
      if(r.active) r.active.postMessage({tip:"sesleri-indir", adresler:adresler});
    });
  };
  navigator.serviceWorker.addEventListener("message", function(ev){
    var m = ev.data || {};
    if(m.tip === "ses-ilerleme") bilgi.textContent = m.bitti + " / " + m.toplam;
    if(m.tip === "ses-durumu" && m.var)
      bilgi.textContent = (m.var >= m.toplam) ? UI.sesHazir : (m.var + " " + UI.sesKismi + " " + m.toplam);
    if(m.tip === "ses-bitti"){
      btn.disabled = false; btn.textContent = UI.sesIndir;
      bilgi.textContent = m.hata ? UI.sesHata : UI.sesHazir;
    }
  });
}
/* Gunluk sekmesi her acildiginda yeniden uretiliyor -> karti yeniden ekle */
(function(){
  var eski = window.showView;
  if(typeof eski !== "function") return;
  window.showView = function(v){
    var r = eski.apply(this, arguments);
    if(v === "gunluk") setTimeout(sesKarti, 60);
    return r;
  };
})();

window.bxPwa = {adresler: hikayeAdresleri, davet: function(){ return !!bekleyenDavet; }};
})();
