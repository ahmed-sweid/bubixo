/* ============ BUBIXO AKADEMI — service worker ============
   Kurs basina AYRI kurulur; kapsam kendi yolu (/de/tuerkisch/ gibi).
   Ayarlar HTML'den gelir: kurulum adresine ?k=<kurs>&v=<surum> eklenir.

   Onbellek politikasi:
     kabuk + veri  -> ONCE AG (3,5 sn), sonra onbellek (index.html, app.js, data*.js, ikonlar)
     ses (mp3)     -> cache-first ama OTOMATIK TOPLU INDIRME YOK; yalnizca
                      calinan dosya onbellege girer. Hikaye seslerinin tamami
                      "Sesleri indir" dugmesiyle topluca alinabilir.
     /api/*        -> network-only, ASLA onbellege alinmaz (olcum ve ceviri)

   Surum: onbellek adi bx-<kurs>-v<surum>. Yeni surum yayinlaninca eskiler silinir.
   ========================================================= */
"use strict";

const AYAR   = new URL(self.location).searchParams;
const KURS   = AYAR.get("k") || "x";
const SURUM  = AYAR.get("v") || "1";
const ONBEL  = "bx-" + KURS + "-v" + SURUM;
const SES_ONBEL = "bx-ses-v1";              /* sesler surumden BAGIMSIZ: adlari hash */

/* Kabuk: kurulumda pesinen alinir. Kapsam koku SW'nin bulundugu dizin. */
const KOK = self.location.pathname.replace(/sw\.js.*$/, "");
const VARLIK_KOK = AYAR.get("a") || "";      /* api.bubixo.com/<yol>/ */
const KABUK = [
  KOK,                                        /* index.html (kanonik) */
  KOK + "manifest.json",
  KOK + "icon-192.png",
  KOK + "icon-512.png",
];
const UZAK = (AYAR.get("f") || "").split(",").filter(Boolean).map(f => VARLIK_KOK + f);

self.addEventListener("install", ev => {
  ev.waitUntil((async () => {
    const c = await caches.open(ONBEL);
    /* Tek tek: biri 404 verirse kurulumun tamami cokmesin (addAll oyle yapar). */
    await Promise.all(KABUK.concat(UZAK).map(async u => {
      try{
        const r = await fetch(u, {cache:"reload"});
        if(r && r.ok) await c.put(u, r.clone());
      }catch(e){}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", ev => {
  ev.waitUntil((async () => {
    for(const ad of await caches.keys()){
      /* Kendi kursunun ESKI surumlerini sil; baska kursun onbellegine DOKUNMA. */
      if(ad.startsWith("bx-" + KURS + "-v") && ad !== ONBEL) await caches.delete(ad);
    }
    await self.clients.claim();
  })());
});

const sesMi   = u => u.pathname.indexOf("/audio/") === 0;
const apiMi   = u => u.pathname.indexOf("/akademi/api/") === 0 ||
                     u.pathname.indexOf("/text-tools") === 0;

self.addEventListener("fetch", ev => {
  const istek = ev.request;
  if(istek.method !== "GET") return;
  let u; try{ u = new URL(istek.url); }catch(e){ return; }

  /* Olcum ve ceviri: agdan, onbellege ALINMAZ. Cevrimdisiyken sessizce basarisiz. */
  if(apiMi(u)){ ev.respondWith(fetch(istek).catch(() => new Response("", {status:503}))); return; }

  if(sesMi(u)){ ev.respondWith(sesGetir(istek)); return; }

  /* Kabuk ve veri: once onbellek, sonra ag; ag basarili olursa onbellegi tazele. */
  if(u.pathname.indexOf(KOK) === 0 || (VARLIK_KOK && istek.url.indexOf(VARLIK_KOK) === 0)){
    ev.respondWith(kabukGetir(istek));
  }
});

/* ONCE AG, SONRA ONBELLEK (Ingilizce kurs, 2026-10-05).
   Eskiden once onbellek veriliyordu: yeni yayin ancak IKINCI acilista gorunuyordu.
   Simdi cevrimiciyken her zaman guncel sayfa/kod gelir (HTTP onbellegi yine hizlandirir);
   ag AG_BEKLE icinde cevap vermezse ya da cevrimdisiysa onbellekteki kopya verilir —
   cevrimdisi davranis aynen korunur. Basarili cevap onbellegi tazeler. */
const AG_BEKLE = 3500;
async function kabukGetir(istek){
  const c = await caches.open(ONBEL);
  /* no-cache: HTTP onbellegindeki kopya sunucuya sorulmadan kullanilmasin (ETag ile 304, ucuz).
     Yoksa max-age=3600 yuzunden yeni yayin bir saat gecikebilirdi. */
  let taze = istek;
  try{
    taze = istek.mode === "navigate" ? new Request(istek.url, {cache:"no-cache", credentials:"same-origin"})
                                     : new Request(istek, {cache:"no-cache"});
  }catch(e){ taze = istek; }
  const ag = fetch(taze).then(r => {
    if(r && r.ok) c.put(istek, r.clone()).catch(()=>{});
    return r;
  }).catch(() => null);
  const ilk = await Promise.race([ag, new Promise(res => setTimeout(() => res("zaman"), AG_BEKLE))]);
  /* capraz kokenli <script>/<link> no-cors ister: cevap "opaque" (status 0) ama gecerlidir */
  if(ilk && ilk !== "zaman" && (ilk.ok || ilk.type === "opaque")) return ilk;
  const bulunan = await c.match(istek, {ignoreSearch:true});
  if(bulunan) return bulunan;
  const r = (ilk === "zaman") ? await ag : ilk;
  if(r) return r;
  /* Gezinme istegi ve cevrimdisi: onbellekteki kurs sayfasini ver. */
  if(istek.mode === "navigate"){
    const k = await c.match(KOK);
    if(k) return k;
  }
  return new Response("", {status:504});
}

async function sesGetir(istek){
  const c = await caches.open(SES_ONBEL);
  const bulunan = await c.match(istek);
  if(bulunan) return bulunan;
  try{
    const r = await fetch(istek);
    /* Adi hash oldugu icin icerik asla degismez -> sonsuza dek saklanabilir. */
    if(r && r.ok) c.put(istek, r.clone()).catch(()=>{});
    return r;
  }catch(e){
    return new Response("", {status:504});
  }
}

/* Sayfadan gelen komutlar */
self.addEventListener("message", ev => {
  const m = ev.data || {};
  if(m.tip === "atla"){ self.skipWaiting(); return; }
  if(m.tip === "sesleri-indir"){ ev.waitUntil(topluIndir(m.adresler, ev.source)); return; }
  if(m.tip === "ses-durumu"){ ev.waitUntil(sesDurumu(m.adresler, ev.source)); return; }
});

async function topluIndir(adresler, kaynak){
  const c = await caches.open(SES_ONBEL);
  let bitti = 0, hata = 0;
  for(const u of adresler || []){
    try{
      if(await c.match(u)){ bitti++; }
      else{
        const r = await fetch(u);
        if(r && r.ok){ await c.put(u, r.clone()); bitti++; } else hata++;
      }
    }catch(e){ hata++; }
    if(kaynak && (bitti + hata) % 20 === 0)
      kaynak.postMessage({tip:"ses-ilerleme", bitti, hata, toplam:(adresler||[]).length});
  }
  if(kaynak) kaynak.postMessage({tip:"ses-bitti", bitti, hata, toplam:(adresler||[]).length});
}

async function sesDurumu(adresler, kaynak){
  const c = await caches.open(SES_ONBEL);
  let var_ = 0;
  for(const u of adresler || []) if(await c.match(u)) var_++;
  if(kaynak) kaynak.postMessage({tip:"ses-durumu", var:var_, toplam:(adresler||[]).length});
}
