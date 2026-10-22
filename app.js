/* ================== BUBIXO INGILIZCE — UYGULAMA ================== */
"use strict";
const $ = s => document.querySelector(s);
const esc = s => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };

/* ---------- kalici durum (localStorage, kibarca) ---------- */
const store = {
  read() { try { return JSON.parse(localStorage.getItem("bx-eng") || "{}"); } catch (e) { return {}; } },
  write(s) { try { localStorage.setItem("bx-eng", JSON.stringify(s)); } catch (e) { } }
};
let S = store.read();
S.units = S.units || {};      // {u1:{score,done}}
S.words = S.words || {};      // {"d1:0":{box,due}}
S.streak = S.streak || { last: null, count: 0 };
S.heard = S.heard || 0;       // dinlenen ses sayisi
S.tales = S.tales || {};      // {s1:true} okunan hikayeler
S.taleLvl = S.taleLvl || 0;   // hikaye seviye filtresi (0 = hepsi)
S.kur = S.kur || {};          // cumle kur
S.kur.cat = S.kur.cat || "question";
S.kur.lvl = S.kur.lvl || 1;
S.kur.done = S.kur.done || {};
S.games = S.games || {};      // oyunlar
S.games.theme = S.games.theme || "mix";
S.games.sound = S.games.sound !== false;
S.games.match = S.games.match || {};
S.games.mem = S.games.mem || {};
S.games.spell = S.games.spell || {};
S.games.rush = S.games.rush || {};
S.games.rounds = S.games.rounds || 0;

/* ---------- seri (streak) ---------- */
(function () {
  const today = new Date().toISOString().slice(0, 10);
  const last = S.streak.last;
  if (last !== today) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak.count = (last === y) ? S.streak.count + 1 : 1;
    S.streak.last = today;
    store.write(S);
  }
  $("#streak").textContent = " " + S.streak.count + " gün";
})();

/* ---------- ses (speechSynthesis) ---------- */
let VOICE = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith("en"));
  VOICE = vs.find(v => /en[-_](GB|US)/i.test(v.lang) && /google|natural|online/i.test(v.name)) ||
    vs.find(v => /en[-_](GB|US)/i.test(v.lang)) || vs[0] || null;
}
try { if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } } catch (e) { }
function speak(text, opt) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE ? VOICE.lang : "en-US";
    if (VOICE) u.voice = VOICE;
    u.rate = (opt && opt.rate) || 0.92;
    if (opt && opt.onend) u.onend = opt.onend;
    speechSynthesis.speak(u);
    S.heard++; store.write(S);
  } catch (e) { }
}
function stopSpeak() { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { } }
const SPK = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';

/* ---------- gezinme: dört ana sekme, özellikler alt ekranlarda ---------- */
const TAB_GROUP = {
  yol:"yol", dersler:"dersler", kelime:"kelime", pratik:"pratik", kesfet:"kesfet",
  gramer:"pratik", telaffuz:"pratik", kur:"pratik", oyun:"pratik",
  hikaye:"kesfet", gunluk:"kesfet"
};
document.querySelectorAll("#nav button").forEach(b => b.onclick = () => showView(b.dataset.v));
function lineIcon(name) {
  const paths = {
    ders: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5V21"/>',
    kelime: '<rect x="4" y="5" width="13" height="15" rx="2"/><path d="M8 5V3.5A1.5 1.5 0 0 1 9.5 2H19a2 2 0 0 1 2 2v13"/>',
    pratik: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    kesfet: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    telaffuz: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    oyun: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 9v6M5 12h6M16 10h.01M18 14h.01"/>',
    hikaye: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21z"/><path d="M5 4.5V21M9 7h7M9 11h7"/>',
    gunluk: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (paths[name] || paths.pratik) + '</svg>';
}

function renderHub(id) {
  const hubs = {
    pratik: {title:"Pratik", subtitle:"Öğrendiklerini farklı yollarla pekiştir.", items:[
      ["gramer","Gramer","Kuralları örneklerle öğren","Aa"],
      ["kur","Cümle kur","Kelimeleri doğru sıraya yerleştir","↔"],
      ["telaffuz","Dinleme ve telaffuz","Dinle ve sesli tekrar yap","♫"],
      ["oyun","Kelime oyunları","Oyunlarla kelime pratiği yap","✦"]
    ]},
    kesfet: {title:"Keşfet", subtitle:"İngilizceyi hikâyeler ve günlük içeriklerle keşfet.", items:[
      ["hikaye","Hikâyeler","Oku, dinle ve bilmediğin kelimeleri keşfet","▤"],
      ["gunluk","Günlük içerik","Günün cümlesini ve ilerlemeni gör","◷"]
    ]}
  };
  const hub=hubs[id], target=$("#v-"+id);
  target.innerHTML=`<h2 class="sec-title">${hub.title}</h2><p class="sec-sub">${hub.subtitle}</p>
    <div class="hub-grid">${hub.items.map(item=>`<button class="card hub-item" data-open="${item[0]}">
      <span class="hub-icon" aria-hidden="true">${lineIcon(item[0])}</span><span class="hub-copy"><b>${item[1]}</b><small>${item[2]}</small></span>
      <span class="hub-arrow" aria-hidden="true">›</span></button>`).join("")}</div>`;
  target.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>showView(b.dataset.open));
}
function showView(v) {
  tale.stop(); gStop();
  const group=TAB_GROUP[v]||"dersler";
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===group));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("on"));
  const view=$("#v-"+v); if(!view)return;
  view.classList.add("on"); window.scrollTo({top:0});
  if(v==="dersler")renderUnits();
  if(v==="kelime")renderDecks();
  if(v==="gramer")renderGramer();
  if(v==="telaffuz")renderPron();
  if(v==="gunluk")renderDaily();
  if(v==="hikaye")renderStories();
  if(v==="kur")renderKur();
  if(v==="oyun")renderGames();
  if(v==="pratik"||v==="kesfet")renderHub(v);
  if(!["dersler","kelime","pratik","kesfet"].includes(v)){
    const label=group==="pratik"?"← Pratik":"← Keşfet";
    view.insertAdjacentHTML("afterbegin",`<div class="subview-return"><button class="backbtn" data-return="${group}">${label}</button></div>`);
    view.querySelector("[data-return]").onclick=()=>showView(group);
  }
}
/* ================== 1) DERSLER ================== */
function renderUnits() {
  const doneCount = UNITS.filter(u => S.units[u.id] && S.units[u.id].done).length;
  $("#v-dersler").innerHTML = `
    <h2 class="sec-title">Ders Yolu</h2>
    <p class="sec-sub">${doneCount}/${UNITS.length} ders tamamlandı · sırayla ilerle, her ders 10 dakikadan kısa</p>
    ${UNITS.map((u, i) => {
    const st = S.units[u.id] || {};
    return `<div class="card unit ${st.done ? "done" : ""}" data-u="${u.id}" tabindex="0" role="button">
        <span class="no">${st.done ? "✓" : i + 1}</span>
        <span><b>${esc(u.title)}</b><small>~${u.mins} dk${st.score != null ? ` · son test: ${st.score}/5` : ""}</small></span>
        ${st.done ? '<span class="tick">Tamam</span>' : ""}
      </div>`;
  }).join("")}`;
  document.querySelectorAll(".unit").forEach(el => {
    el.onclick = () => renderLesson(el.dataset.u);
    el.onkeydown = e => { if (e.key === "Enter") renderLesson(el.dataset.u); };
  });
}

function renderLesson(id) {
  const u = UNITS.find(x => x.id === id);
  $("#v-dersler").innerHTML = `
    <div class="lesson">
      <div class="lesson-head"><button class="backbtn" id="lback">← Dersler</button></div>
      <h2>${esc(u.title)}</h2>
      <div class="intro">${esc(u.intro)}</div>
      <div class="card" style="padding:6px 18px">
        ${u.points.map((p, i) => `
          <div class="exline">
            <button class="spk" data-say="${esc(p.en)}" aria-label="Dinle">${SPK}</button>
            <span><b>${esc(p.en)}</b><i>${esc(p.tr)}</i></span>
          </div>`).join("")}
      </div>
      <div class="tipbox"><b>İpucu:</b> ${esc(u.tip)}</div>
      <div class="qbox">
        <h3>Mini test — 5 soru</h3>
        <div id="quiz"></div>
        <div class="qscore" id="qscore"></div>
      </div>
    </div>`;
  $("#lback").onclick = renderUnits;
  document.querySelectorAll("[data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));

  let answered = 0, correct = 0;
  $("#quiz").innerHTML = u.quiz.map((q, qi) => `
    <div class="qq" data-q="${qi}">
      <p>${qi + 1}. ${esc(q.q)}</p>
      <div class="opts">${q.o.map((o, oi) => `<button data-o="${oi}">${esc(o)}</button>`).join("")}</div>
      <div class="expl">${esc(q.e)}</div>
    </div>`).join("");
  document.querySelectorAll(".qq").forEach(qq => {
    const qi = +qq.dataset.q, q = u.quiz[qi];
    qq.querySelectorAll(".opts button").forEach(btn => btn.onclick = () => {
      if (qq.dataset.done) return;
      qq.dataset.done = "1"; answered++;
      const oi = +btn.dataset.o;
      if (oi === q.a) { btn.classList.add("ok"); correct++; }
      else { btn.classList.add("no"); qq.querySelectorAll(".opts button")[q.a].classList.add("ok"); }
      qq.querySelector(".expl").style.display = "block";
      if (answered === u.quiz.length) {
        const pass = correct >= 4;
        S.units[u.id] = { score: correct, done: pass || (S.units[u.id] && S.units[u.id].done) };
        store.write(S);
        $("#qscore").textContent = pass
          ? ` ${correct}/5 — ders tamamlandı!`
          : `${correct}/5 — 4 ve üzeri için örnekleri tekrar dinleyip yeniden dene.`;
        $("#qscore").style.color = pass ? "var(--green)" : "var(--amber)";
      }
    });
  });
}

/* ================== 2) KELIMELER (SRS) ================== */
const BOX_DAYS = [0, 1, 3, 7, 14];
function wordState(key) { return S.words[key] || { box: 0, due: 0 }; }
function dueCount(d) {
  const now = Date.now();
  return d.words.filter((w, i) => { const st = wordState(d.id + ":" + i); return st.box === 0 || st.due <= now; }).length;
}
function renderDecks() {
  $("#v-kelime").innerHTML = `
    <h2 class="sec-title">Kelime Kartları</h2>
    <p class="sec-sub">Karta dokun → anlamı gör → dürüstçe işaretle. “Bilemedim” dediklerin daha sık, bildiklerin daha seyrek gelir.</p>
    <div class="deckgrid">
      ${DECKS.map(d => {
    const due = dueCount(d);
    return `<div class="card deck" data-d="${d.id}" tabindex="0" role="button">
          <b>${esc(d.title)}</b>
          <small>${d.words.length} kelime</small>
          ${due ? `<span class="due">${due} kart hazır</span>` : `<span class="due" style="background:var(--green-soft);color:var(--green)">✓ güncel</span>`}
        </div>`;
  }).join("")}
    </div>
    <h2 class="sec-title" style="margin-top:34px">Sözlük: En Sık 3000 Kelime</h2>
    <p class="sec-sub">Hepsi seslendirmeli. Seviye seç, 100'lük gruplarla gez ya da doğrudan ara — kelimeye dokun, dinle.</p>
    <input class="dict-search" id="dsearch" type="search" placeholder="3000 kelimede ara… (ör. water, sevmek, get up)">
    <div class="dict-levels" id="dlevels"></div>\n    <div class="dict-pages" id="dpages"></div>
    <div class="card" id="dlist" style="overflow:hidden"></div>`;
  renderDict();
  document.querySelectorAll(".deck").forEach(el => {
    el.onclick = () => startDeck(el.dataset.d);
    el.onkeydown = e => { if (e.key === "Enter") startDeck(el.dataset.d); };
  });
}
let run = null;
function startDeck(id) {
  const d = DECKS.find(x => x.id === id);
  const now = Date.now();
  let idxs = d.words.map((w, i) => i).filter(i => { const st = wordState(id + ":" + i); return st.box === 0 || st.due <= now; });
  if (!idxs.length) idxs = d.words.map((w, i) => i);
  run = { deck: d, idxs, pos: 0, flipped: false };
  drawCard();
}
function drawCard() {
  const { deck, idxs, pos } = run;
  if (pos >= idxs.length) {
    $("#v-kelime").innerHTML = `
      <div class="fcstage">
        <div class="card daily-card">
          <div class="daily-lab">Deste bitti</div>
          <div class="daily-en"> ${idxs.length} kart</div>
          <p class="daily-tr">“${esc(deck.title)}” destesindeki hazır kartların hepsini gördün.</p>
          <button class="startquiz" id="backdecks">Destelere dön</button>
        </div>
      </div>`;
    $("#backdecks").onclick = renderDecks;
    return;
  }
  const w = deck.words[idxs[pos]];
  $("#v-kelime").innerHTML = `
    <div class="fcstage">
      <div class="lesson-head" style="justify-content:center"><button class="backbtn" id="fback">← Desteler</button></div>
      <div class="card fcard" id="fcard">
        <div class="w">${esc(w.en)}</div>
        <button class="bigspk" id="fspk" aria-label="Dinle">${SPK}</button>
        <div id="fanswer" style="display:none">
          <div class="m">${esc(w.tr)}</div>
          <div class="ex">${esc(w.ex)}<br><span style="color:#9aa6b2">${esc(w.xt)}</span></div>
        </div>
        <div class="hint" id="fhint">karta dokun → anlamı gör</div>
      </div>
      <div class="fc-btns" id="fbtns" style="visibility:hidden">
        <button class="fc-again" id="fagain">Bilemedim</button>
        <button class="fc-good" id="fgood">Bildim ✓</button>
      </div>
      <div class="fc-prog">${pos + 1} / ${idxs.length}</div>
    </div>`;
  $("#fback").onclick = renderDecks;
  $("#fspk").onclick = e => { e.stopPropagation(); speak(w.en); };
  speak(w.en);
  $("#fcard").onclick = () => {
    $("#fanswer").style.display = "block";
    $("#fhint").style.display = "none";
    $("#fbtns").style.visibility = "visible";
  };
  const key = deck.id + ":" + idxs[pos];
  $("#fagain").onclick = () => grade(key, false);
  $("#fgood").onclick = () => grade(key, true);
}
function grade(key, ok) {
  const st = wordState(key);
  st.box = ok ? Math.min(st.box + 1, 4) : 0;
  st.due = Date.now() + (ok ? BOX_DAYS[st.box] * 864e5 : 6e5);
  S.words[key] = st; store.write(S);
  run.pos++; drawCard();
}

/* ================== 3) TELAFFUZ ================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let prPool = [], prIdx = 0, rec = null;
function buildPool() {
  prPool = [];
  DECKS.forEach(d => d.words.forEach(w => { if (!w.en.includes("/")) prPool.push({ en: w.en, tr: w.tr }); }));
  UNITS.forEach(u => u.points.slice(0, 3).forEach(p => { if (p.en.split(" ").length <= 6 && !p.en.includes("—")) prPool.push({ en: p.en.replace(/\.$/, ""), tr: p.tr }); }));
}
function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }
function renderPron() {
  if (!prPool.length) { buildPool(); prIdx = Math.floor(Math.random() * prPool.length); }
  const item = prPool[prIdx];
  $("#v-telaffuz").innerHTML = `
    <h2 class="sec-title">Telaffuz Pratiği</h2>
    <p class="sec-sub">Önce dinle, sonra mikrofona bas ve aynısını söyle — tarayıcı seni dinleyip karşılaştırsın.</p>
    <div class="card pr-stage" style="padding:26px">
      <button class="bigspk" id="prspk" aria-label="Dinle">${SPK}</button>
      <div class="pr-word">${esc(item.en)}</div>
      <div class="pr-tr">${esc(item.tr)}</div>
      ${SR ? `
        <button class="mic" id="mic" aria-label="Konuş"><svg viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg></button>
        <div class="pr-result" id="prres">Mikrofona bas ve söyle</div>`
      : `<div class="pr-warn"><b>Bu tarayıcıda konuşma tanıma yok.</b> Telaffuz pratiği için telefon ya da bilgisayarda <b>Chrome</b> veya <b>Edge</b> kullan. Yine de dinleyip tekrar edebilirsin — sesli tekrar tek başına bile çok etkilidir.</div>`}
      <div class="pr-nav">
        <button id="prprev">← Önceki</button>
        <button id="prnext">Yeni kelime →</button>
      </div>
    </div>`;
  $("#prspk").onclick = () => speak(item.en);
  $("#prnext").onclick = () => { prIdx = Math.floor(Math.random() * prPool.length); renderPron(); };
  $("#prprev").onclick = () => { prIdx = (prIdx - 1 + prPool.length) % prPool.length; renderPron(); };
  if (SR) {
    $("#mic").onclick = () => {
      if (rec) { try { rec.stop(); } catch (e) { } rec = null; return; }
      rec = new SR();
      rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 3;
      $("#mic").classList.add("rec");
      $("#prres").textContent = "Dinliyorum…";
      rec.onresult = ev => {
        const alts = Array.from(ev.results[0]).map(a => norm(a.transcript));
        const target = norm(item.en);
        const hit = alts.some(a => a === target || a.includes(target) || target.includes(a));
        $("#prres").innerHTML = hit
          ? `<div class="good">✓ Harika, doğru söyledin!</div><div class="pr-heard">Duyulan: “${esc(alts[0])}”</div>`
          : `<div class="bad">Tam olmadı — tekrar dinleyip dene.</div><div class="pr-heard">Duyulan: “${esc(alts[0] || "...")}” · Hedef: “${esc(item.en)}”</div>`;
      };
      rec.onerror = ev => {
        $("#prres").innerHTML = ev.error === "not-allowed"
          ? `<div class="bad">Mikrofon izni gerekli — tarayıcı sorduğunda “İzin ver” de.</div>`
          : `<div class="bad">Ses alınamadı, tekrar dene.</div>`;
      };
      rec.onend = () => { $("#mic").classList.remove("rec"); if ($("#prres").textContent === "Dinliyorum…") $("#prres").textContent = "Bir şey duyamadım — tekrar dene."; rec = null; };
      try { rec.start(); } catch (e) { }
    };
  }
}

/* ================== 4) GUNLUK ================== */
function renderDaily() {
  const day = Math.floor(Date.now() / 864e5);
  const s = DAILY[day % DAILY.length];
  const learned = Object.values(S.words).filter(w => w.box >= 2).length;
  const done = UNITS.filter(u => S.units[u.id] && S.units[u.id].done).length;
  const okunan = STORIES.filter(x => S.tales[x.id]).length;
  const kurulan = Object.keys(S.kur.done).reduce((n, k) => n + (S.kur.done[k] || 0), 0);
  const turlar = S.games.rounds || 0, hiz = S.games.rush.best || 0;
  $("#v-gunluk").innerHTML = `
    <h2 class="sec-title">Günün Cümlesi</h2>
    <p class="sec-sub">Her gün bir kalıp — yarın yenisi gelir. Üç kez sesli tekrar et, gün boyu aklında kalsın.</p>
    <div class="card daily-card">
      <div class="daily-lab">Bugünün kalıbı</div>
      <div class="daily-en">${esc(s.en)}</div>
      <div class="daily-tr">${esc(s.tr)}</div>
      <div style="margin-top:12px"><button class="bigspk" id="dspk" aria-label="Dinle">${SPK}</button></div>
      <div class="daily-note"> ${esc(s.n)}</div>
    </div>
    <div class="statgrid">
      <div class="card stat"><b>${S.streak.count}</b><small>günlük seri </small></div>
      <div class="card stat"><b>${done}/10</b><small>tamamlanan ders</small></div>
      <div class="card stat"><b>${learned}</b><small>öğrenilen kelime</small></div>
      <div class="card stat"><b>${S.heard}</b><small>dinlenen ses</small></div>
      <div class="card stat"><b>${okunan}/${STORIES.length}</b><small>okunan hikaye</small></div>
      <div class="card stat"><b>${kurulan}/${BUILDER.length}</b><small>kurulan cümle</small></div>
      <div class="card stat"><b>${turlar}</b><small>oynanan tur</small></div>
      <div class="card stat"><b>${hiz}</b><small>Hız Turu rekoru</small></div>
    </div>
    <button class="startquiz" id="wq">Haftalık tekrar testi (10 soru)</button>
    <div id="wqbox"></div>`;
  $("#dspk").onclick = () => speak(s.en);
  $("#wq").onclick = weeklyQuiz;
}
function weeklyQuiz() {
  const all = [];
  DECKS.forEach(d => d.words.forEach((w, i) => { if (!w.tr.includes("/")) all.push(w); }));
  const pick = [...all].sort(() => Math.random() - .5).slice(0, 10);
  let i = 0, score = 0;
  const ask = () => {
    if (i >= pick.length) {
      $("#wqbox").innerHTML = `<div class="card daily-card" style="margin-top:14px">
        <div class="daily-en">${score}/10</div>
        <p class="daily-tr">${score >= 8 ? "Muhteşem! " : score >= 5 ? "İyi gidiyor — kartlara devam." : "Kelime destelerine biraz daha zaman ayır."}</p></div>`;
      return;
    }
    const w = pick[i];
    const wrong = [...all].filter(x => x.tr !== w.tr).sort(() => Math.random() - .5).slice(0, 3).map(x => x.tr);
    const opts = [...wrong, w.tr].sort(() => Math.random() - .5);
    $("#wqbox").innerHTML = `<div class="qq" style="margin-top:14px">
      <p>${i + 1}/10 · “${esc(w.en)}” ne demek? <button class="spk" style="vertical-align:middle" id="wqs">${SPK}</button></p>
      <div class="opts">${opts.map(o => `<button data-t="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`;
    $("#wqs").onclick = () => speak(w.en);
    document.querySelectorAll("#wqbox .opts button").forEach(b => b.onclick = () => {
      if (b.dataset.t === w.tr) { b.classList.add("ok"); score++; }
      else { b.classList.add("no"); document.querySelectorAll("#wqbox .opts button").forEach(x => { if (x.dataset.t === w.tr) x.classList.add("ok"); }); }
      setTimeout(() => { i++; ask(); }, 900);
    });
  };
  ask();
}

/* ---------- baslat ---------- */
renderUnits();
/* Ceviri butonu ancak servis ayaktaysa belirir. ceviri.js AYRI bir istek oldugu icin
   setTimeout(0) YARIS yaratir (timer, ceviri.js inmeden once atesleniyordu ve buton hic
   gelmiyordu). "load" olayinda tum klasik scriptler kesin yuklenmis olur. */
window.addEventListener("load", function () {
  if (typeof checkTranslator === "function") checkTranslator();
});

/* ================== SOZLUK (1000 kelime) ================== */
let dictPage = 0, dictQ = "", dictLevel = 0;
const LEVELS = [
  { ad: "Temel", alt: "1–1000 · en sık kullanılanlar", bas: 0, son: 1000 },
  { ad: "Orta", alt: "1001–2000 · günlük hayat", bas: 1000, son: 2000 },
  { ad: "İleri", alt: "2001–3000 · zengin anlatım", bas: 2000, son: 3000 }
];
function renderDict() {
  const inp = $("#dsearch");
  inp.value = dictQ;
  inp.oninput = () => { dictQ = inp.value.trim().toLowerCase(); drawDict(); };
  drawDict();
}
function drawDict() {
  const lvlEl = $("#dlevels"), pagesEl = $("#dpages"), listEl = $("#dlist");
  let items;

  if (dictQ) {
    items = WORDS.filter(w => w.e.toLowerCase().includes(dictQ) || w.t.toLowerCase().includes(dictQ)).slice(0, 80);
    lvlEl.innerHTML = "";
    pagesEl.innerHTML = `<span class="dinfo">${items.length} sonuç${items.length === 80 ? "+" : ""} · aramayı temizlersen seviyelere dönersin</span>`;
  } else {
    lvlEl.innerHTML = LEVELS.map((L, i) =>
      `<button class="lvl ${i === dictLevel ? "on" : ""}" data-l="${i}"><b>${L.ad}</b><i>${L.alt}</i></button>`).join("");
    lvlEl.querySelectorAll("button").forEach(b => b.onclick = () => { dictLevel = +b.dataset.l; dictPage = 0; drawDict(); });

    const L = LEVELS[dictLevel];
    const sayfaSayisi = Math.ceil((L.son - L.bas) / 100);
    pagesEl.innerHTML = Array.from({ length: sayfaSayisi }, (_, i) => {
      const a = L.bas + i * 100 + 1, b = Math.min(L.bas + (i + 1) * 100, L.son);
      return `<button class="${i === dictPage ? "on" : ""}" data-p="${i}">${a}–${b}</button>`;
    }).join("");
    pagesEl.querySelectorAll("button").forEach(b => b.onclick = () => { dictPage = +b.dataset.p; drawDict(); });

    items = WORDS.slice(L.bas + dictPage * 100, Math.min(L.bas + (dictPage + 1) * 100, L.son));
  }

  listEl.innerHTML = items.map(w => `
    <div class="dict-row">
      <span class="dm">${w.m || "•"}</span>
      <span style="cursor:pointer" data-say="${esc(w.e)}"><b>${esc(w.e)}</b><i>${esc(w.t)}</i></span>
      <button class="spk" data-say="${esc(w.e)}" aria-label="Dinle">${SPK}</button>
    </div>`).join("") || `<div style="padding:18px;color:var(--soft)">Sonuç yok — başka bir kelime dene.</div>`;
  listEl.querySelectorAll("[data-say]").forEach(el => el.onclick = () => speak(el.dataset.say));
}

/* ================== GRAMER ================== */
function renderGramer() {
  $("#v-gramer").innerHTML = `
    <h2 class="sec-title">Zamanlar ve Cümle Yapısı</h2>
    <p class="sec-sub">Önce iskeleti kur (Özne+Fiil+Nesne), sonra zamanları tek tek fethet. Her konuda formül + örnek + mini test var.</p>
    ${TENSES.map((t, i) => `
      <div class="card unit" data-g="${t.id}" tabindex="0" role="button">
        <span class="no">${i + 1}</span>
        <span><b>${esc(t.title)}</b><small>${esc(t.formula.split("→")[0])}</small></span>
      </div>`).join("")}
    <div class="card" style="padding:20px;margin-top:22px">
      <h3 class="serif" style="font-size:19px"> Cümle Kurma Oyunu</h3>
      <p style="font-size:13.5px;color:var(--soft);margin:6px 0 14px">Türkçesine bak, İngilizce kelimelere doğru sırayla dokun. Yanlış dizersen kelimeye tekrar dokunup geri alabilirsin.</p>
      <button class="startquiz" id="sbstart" style="margin-top:0">Oyunu başlat</button>
      <div id="sbox"></div>
    </div>`;
  document.querySelectorAll("[data-g]").forEach(el => {
    el.onclick = () => renderTense(el.dataset.g);
    el.onkeydown = e => { if (e.key === "Enter") renderTense(el.dataset.g); };
  });
  $("#sbstart").onclick = () => startSB();
}
function renderTense(id) {
  const t = TENSES.find(x => x.id === id);
  $("#v-gramer").innerHTML = `
    <div class="lesson">
      <div class="lesson-head"><button class="backbtn" id="gback">← Gramer</button></div>
      <h2>${esc(t.title)} <span class="badgex">${esc(t.badge)}</span></h2>
      <div class="formula">${esc(t.formula)}</div>
      <div class="intro">${esc(t.when)}</div>
      <div class="card" style="padding:6px 18px">
        ${t.ex.map(p => `
          <div class="exline">
            <button class="spk" data-say="${esc(p.en)}" aria-label="Dinle">${SPK}</button>
            <span><b>${esc(p.en)}</b><i>${esc(p.tr)}</i></span>
          </div>`).join("")}
      </div>
      <div class="qbox"><h3>Mini test</h3><div id="gquiz"></div><div class="qscore" id="gscore"></div></div>
    </div>`;
  $("#gback").onclick = renderGramer;
  document.querySelectorAll("#v-gramer [data-say]").forEach(b => b.onclick = () => speak(b.dataset.say));
  let answered = 0, correct = 0;
  $("#gquiz").innerHTML = t.quiz.map((q, qi) => `
    <div class="qq" data-q="${qi}">
      <p>${qi + 1}. ${esc(q.q)}</p>
      <div class="opts">${q.o.map((o, oi) => `<button data-o="${oi}">${esc(o)}</button>`).join("")}</div>
      <div class="expl">${esc(q.e)}</div>
    </div>`).join("");
  document.querySelectorAll("#gquiz .qq").forEach(qq => {
    const qi = +qq.dataset.q, q = t.quiz[qi];
    qq.querySelectorAll(".opts button").forEach(btn => btn.onclick = () => {
      if (qq.dataset.done) return;
      qq.dataset.done = "1"; answered++;
      if (+btn.dataset.o === q.a) { btn.classList.add("ok"); correct++; }
      else { btn.classList.add("no"); qq.querySelectorAll(".opts button")[q.a].classList.add("ok"); }
      qq.querySelector(".expl").style.display = "block";
      if (answered === t.quiz.length) {
        $("#gscore").textContent = correct === t.quiz.length ? ` ${correct}/${t.quiz.length} — mükemmel!` : `${correct}/${t.quiz.length} — örnekleri tekrar dinle, bir daha dene.`;
        $("#gscore").style.color = correct === t.quiz.length ? "var(--green)" : "var(--amber)";
      }
    });
  });
}

/* ---- cumle kurma ---- */
let sbOrder = [], sbPick = [], sbCur = 0;
function startSB() {
  sbOrder = [...SENTS].sort(() => Math.random() - .5);
  sbCur = 0;
  drawSB();
}
function drawSB() {
  if (sbCur >= sbOrder.length) {
    $("#sbox").innerHTML = `<p class="sb-ok" style="margin-top:14px"> Hepsi bitti! Tekrar başlatabilirsin.</p>`;
    return;
  }
  const s = sbOrder[sbCur];
  const words = s.en.split(" ");
  let pool = words.map((w, i) => ({ w, i })).sort(() => Math.random() - .5);
  sbPick = [];
  const draw = () => {
    $("#sbox").innerHTML = `
      <div class="sb-target" style="margin-top:16px">${sbCur + 1}/${sbOrder.length} · <b>${esc(s.tr)}</b></div>
      <div class="sb-line">${sbPick.map((p, idx) => `<button data-r="${idx}">${esc(p.w)}</button>`).join("")}</div>
      <div class="sb-pool">${pool.map((p, idx) => `<button data-a="${idx}">${esc(p.w)}</button>`).join("")}</div>
      <div id="sbres" style="min-height:26px"></div>
      <div class="pr-nav" style="justify-content:flex-start">
        <button id="sbcheck">Kontrol et</button>
        <button id="sbhear"> Dinle</button>
        <button id="sbskip">Atla →</button>
      </div>`;
    $("#sbox").querySelectorAll("[data-a]").forEach(b => b.onclick = () => { sbPick.push(pool[+b.dataset.a]); pool.splice(+b.dataset.a, 1); draw(); });
    $("#sbox").querySelectorAll("[data-r]").forEach(b => b.onclick = () => { pool.push(sbPick[+b.dataset.r]); sbPick.splice(+b.dataset.r, 1); draw(); });
    $("#sbcheck").onclick = () => {
      const guess = sbPick.map(p => p.w).join(" ");
      if (guess === s.en) {
        $("#sbres").innerHTML = `<span class="sb-ok">✓ Doğru: ${esc(s.en)}.</span>`;
        speak(s.en);
        setTimeout(() => { sbCur++; drawSB(); }, 1600);
      } else {
        $("#sbres").innerHTML = `<span class="sb-bad">Olmadı — sırayı değiştirip tekrar dene.</span>`;
      }
    };
    $("#sbhear").onclick = () => speak(s.en);
    $("#sbskip").onclick = () => { sbCur++; drawSB(); };
  };
  draw();
}

/* ================== 5) HIKAYELER ================== */
const ST_AD = ["Hepsi", "Başlangıç", "Orta", "İleri"];
let stIdx = -1, stPos = 0, stPlay = false, stSlow = false, stGen = 0, stTimer = null;

/* tek durdurma noktasi: sekme degisimi, geri donus ve tekrar hep buradan gecer */
const tale = {
  stop() {
    stGen++; stPlay = false;
    if (stTimer) { clearTimeout(stTimer); stTimer = null; }
    stopSpeak();
    document.querySelectorAll(".st-line.playing").forEach(el => el.classList.remove("playing"));
    const b = $("#stplay"); if (b) b.innerHTML = "▶︎ Tüm hikayeyi dinle";
  }
};

function renderStories() {
  stIdx = -1;
  const lvl = S.taleLvl | 0;
  const list = STORIES.filter(s => !lvl || s.lvl === lvl);
  const okunan = STORIES.filter(s => S.tales[s.id]).length;
  $("#v-hikaye").innerHTML = `
    <h2 class="sec-title">Sesli Hikayeler</h2>
    <p class="sec-sub">Her satırın altında kelimelerin Türkçe karşılığı var. Hoparlöre bas, dinle, okurken takip et. ${okunan}/${STORIES.length} hikaye okundu.</p>
    <div class="chips">${ST_AD.map((ad, i) => `<button class="chip ${i === lvl ? "on" : ""}" data-l="${i}">${ad}</button>`).join("")}</div>
    <div class="deckgrid">
      ${list.map(s => `
        <div class="card deck st-card" data-s="${s.id}" tabindex="0" role="button">
          <b>${esc(s.title)}</b>
          <small>${esc(s.titleTr)}</small>
          <small>${s.lines.length} satır · ${s.words} kelime</small>
          ${S.tales[s.id]
      ? `<span class="due" style="background:var(--green-soft);color:var(--green)">✓ okundu</span>`
      : `<span class="due">${ST_AD[s.lvl]}</span>`}
        </div>`).join("")}
    </div>`;
  document.querySelectorAll("#v-hikaye .chip").forEach(b => b.onclick = () => {
    S.taleLvl = +b.dataset.l; store.write(S); renderStories();
  });
  document.querySelectorAll("#v-hikaye .deck").forEach(el => {
    el.onclick = () => openStory(el.dataset.s);
    el.onkeydown = e => { if (e.key === "Enter") openStory(el.dataset.s); };
  });
}

/* ayni seviye icinde dolas; seviyenin sonundaysa bir ust seviyenin ilkine gec */
function stKomsu(idx) {
  const s = STORIES[idx];
  const grup = STORIES.map((x, i) => ({ x, i })).filter(o => o.x.lvl === s.lvl).map(o => o.i);
  const p = grup.indexOf(idx);
  const ilk = l => STORIES.findIndex(x => x.lvl === l);
  const son = l => { let k = -1; STORIES.forEach((x, i) => { if (x.lvl === l) k = i; }); return k; };
  return {
    prev: p === 0 ? son(s.lvl === 1 ? 3 : s.lvl - 1) : grup[p - 1],
    next: p === grup.length - 1 ? ilk(s.lvl === 3 ? 1 : s.lvl + 1) : grup[p + 1]
  };
}

function openStory(id) {
  tale.stop();
  stIdx = STORIES.findIndex(s => s.id === id);
  const s = STORIES[stIdx];
  if (!s) return renderStories();
  S.tales[s.id] = true; store.write(S);
  stSlow = false; stPos = 0;
  $("#v-hikaye").innerHTML = `
    <div class="lesson">
      <div class="lesson-head"><button class="backbtn" id="stback">← Hikayelere dön</button></div>
      <h2>${esc(s.title)} — ${esc(s.titleTr)}</h2>
      <div class="intro">${esc(s.intro)}</div>
      <div class="st-bar">
        <button id="stplay">▶︎ Tüm hikayeyi dinle</button>
        <button id="stslow"> Yavaş oku</button>
        <button id="sthide"> Çeviriyi gizle</button>
        <button id="stagain"> Tekrar</button>
      </div>
      <div class="card" id="stbody">
        ${s.lines.map((l, i) => {
    const nokta = (l.en.match(/[.!?]+$/) || [""])[0];
    return `<div class="st-line" data-i="${i}">
            <button class="spk" data-line="${i}" aria-label="Satırı dinle">${SPK}</button>
            <div class="st-main">
              <div class="st-words">${l.w.map((p, j) =>
      `<span class="wg" data-say="${esc(p[0])}"><span class="wt">${esc(p[0])}${j === l.w.length - 1 ? nokta : ""}</span><span class="wa">${esc(p[1])}</span></span>`
    ).join("")}</div>
              <div class="st-tr">${esc(l.tr)}</div>
            </div>
          </div>`;
  }).join("")}
      </div>
      <div class="pr-nav st-nav">
        <button id="stprev">← Önceki hikaye</button>
        <button id="stnext">Sonraki hikaye →</button>
      </div>
    </div>`;
  const hiz = () => stSlow ? 0.65 : 0.95;
  $("#stback").onclick = () => { tale.stop(); renderStories(); };
  document.querySelectorAll("#stbody .wg").forEach(el => el.onclick = () => {
    tale.stop(); speak(el.dataset.say, { rate: hiz() });
  });
  document.querySelectorAll("#stbody .spk").forEach(b => b.onclick = () => {
    tale.stop();
    const el = b.parentNode, g = stGen;
    el.classList.add("playing");
    speak(s.lines[+b.dataset.line].en, { rate: hiz(), onend: () => { if (g === stGen) el.classList.remove("playing"); } });
  });
  $("#stplay").onclick = () => { if (stPlay) tale.stop(); else stOynat(stPos >= s.lines.length ? 0 : stPos); };
  $("#stagain").onclick = () => stOynat(0);
  $("#stslow").onclick = () => {
    stSlow = !stSlow;
    $("#stslow").classList.toggle("on", stSlow);
    if (stPlay) { const p = stPos; stOynat(p); }
  };
  $("#sthide").onclick = () => {
    const gizli = $("#stbody").classList.toggle("st-hidden");
    $("#sthide").classList.toggle("on", gizli);
    $("#sthide").innerHTML = gizli ? " Çeviriyi göster" : " Çeviriyi gizle";
  };
  const k = stKomsu(stIdx);
  $("#stprev").onclick = () => openStory(STORIES[k.prev].id);
  $("#stnext").onclick = () => openStory(STORIES[k.next].id);
  window.scrollTo({ top: 0 });
}

function stOynat(i) {
  const s = STORIES[stIdx]; if (!s) return;
  tale.stop();
  const g = stGen;               // tale.stop() sayaci artirdi; bu tur onun kuşagi
  stPlay = true; stPos = i;
  const btn = $("#stplay"); if (btn) btn.innerHTML = "⏸ Durdur";
  const adim = () => {
    if (!stPlay || g !== stGen) return;
    document.querySelectorAll(".st-line.playing").forEach(el => el.classList.remove("playing"));
    if (stPos >= s.lines.length) { tale.stop(); stPos = 0; return; }
    const el = document.querySelector('#stbody .st-line[data-i="' + stPos + '"]');
    if (el) { el.classList.add("playing"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    const metin = s.lines[stPos].en;
    let gecti = false;
    const ilerle = () => {
      if (gecti || !stPlay || g !== stGen) return;
      gecti = true;
      if (stTimer) { clearTimeout(stTimer); }
      stPos++;
      stTimer = setTimeout(adim, 280);
    };
    speak(metin, { rate: stSlow ? 0.65 : 0.95, onend: ilerle });
    /* bazi tarayicilar onend'i hic gondermez — hikaye orada takilmasin */
    stTimer = setTimeout(ilerle, 2500 + metin.length * (stSlow ? 115 : 85));
  };
  adim();
}

/* ================== 6) CUMLE KUR ================== */
const KUR_CATS = [
  { k: "question", ad: "Soru" },
  { k: "present", ad: "Geniş Zaman" },
  { k: "past", ad: "Geçmiş Zaman" },
  { k: "future", ad: "Gelecek Zaman" }
];
const KUR_ADI = ["Kolay", "Orta", "Zor"];
let kurList = [], kurPos = 0, kurPick = [], kurPool = [], kurScore = 0, kurIpucu = false, kurYanlis = 0, kurAnahtar = "";

function kurKey(c, l) { return c + "-" + l; }
function kurBitti(c, l) { return S.kur.done[kurKey(c, l)] != null; }

function renderKur() {
  const cat = S.kur.cat, lvl = S.kur.lvl;
  $("#v-kur").innerHTML = `
    <h2 class="sec-title">Cümle Kur</h2>
    <p class="sec-sub">Türkçe cümleyi oku, İngilizce kelimelere doğru sırada dokun. Yanlış koydun mu? Yerleştirdiğin kelimeye dokun, geri gelsin.</p>
    <div class="chips">${KUR_CATS.map(c =>
    `<button class="chip ${c.k === cat ? "on" : ""}" data-c="${c.k}">${c.ad}${[1, 2, 3].every(l => kurBitti(c.k, l)) ? " ✓" : ""}</button>`).join("")}</div>
    <div class="chips">${KUR_ADI.map((ad, i) =>
      `<button class="chip ${i + 1 === lvl ? "on" : ""}" data-l="${i + 1}">${ad}${kurBitti(cat, i + 1) ? " ✓" : ""}</button>`).join("")}</div>
    <div class="card" id="kurbox" style="padding:20px"></div>`;
  document.querySelectorAll("#v-kur .chip[data-c]").forEach(b => b.onclick = () => { S.kur.cat = b.dataset.c; store.write(S); renderKur(); });
  document.querySelectorAll("#v-kur .chip[data-l]").forEach(b => b.onclick = () => { S.kur.lvl = +b.dataset.l; store.write(S); renderKur(); });

  kurList = BUILDER.filter(b => b.cat === cat && b.lvl === lvl);
  const key = kurKey(cat, lvl);
  if (kurAnahtar !== key) { kurAnahtar = key; kurPos = 0; kurScore = 0; }   /* sekme degisince yerini koru */
  if (kurPos > kurList.length) kurPos = 0;
  drawKur();
}

function drawKur() {
  const box = $("#kurbox"); if (!box) return;

  if (kurPos >= kurList.length) {
    S.kur.done[kurKey(S.kur.cat, S.kur.lvl)] = kurScore; store.write(S);
    const son = S.kur.lvl === 3;
    box.innerHTML = `
      <div style="text-align:center">
        <div class="daily-en"> ${kurScore}/${kurList.length} doğru</div>
        <p class="daily-tr">${kurScore >= kurList.length - 1 ? "Harika — bu seviyeyi bitirdin." :
        kurScore >= kurList.length / 2 ? "İyi gidiyor. Bir tur daha yaparsan kalıplar oturur." :
          "Açıklamaları tekrar okuyup bir daha dene."}</p>
        <div class="kur-btns" style="justify-content:center">
          <button id="kuragain">Tekrar oyna</button>
          <button class="go" id="kurnext">${son ? "Sonraki kategoriye geç →" : "Sonraki seviyeye geç →"}</button>
        </div>
      </div>`;
    $("#kuragain").onclick = () => { kurPos = 0; kurScore = 0; drawKur(); };
    $("#kurnext").onclick = () => {
      if (son) {
        const i = KUR_CATS.findIndex(c => c.k === S.kur.cat);
        S.kur.cat = KUR_CATS[(i + 1) % KUR_CATS.length].k;
        S.kur.lvl = 1;
      } else S.kur.lvl++;
      kurAnahtar = ""; store.write(S); renderKur();
    };
    return;
  }

  const s = kurList[kurPos];
  const dogru = s.en.split(" ");
  kurPick = []; kurIpucu = false; kurYanlis = 0;
  kurPool = dogru.concat(s.d || []).map(w => ({ w })).sort(() => Math.random() - .5);
  ciz();

  function ciz(sonuc) {
    box.innerHTML = `
      <div class="kur-prog">
        <span>${kurPos + 1}/${kurList.length}</span>
        <span class="kur-bar"><i style="width:${Math.round(kurPos / kurList.length * 100)}%"></i></span>
      </div>
      <div class="kur-tr">${esc(s.tr)}</div>
      <div class="sb-line">${kurPick.length
        ? kurPick.map((p, i) => `<button data-r="${i}">${esc(p.w)}</button>`).join("")
        : `<span class="ph">Kelimelere dokun…</span>`}</div>
      <div class="sb-pool">${kurPool.map((p, i) => `<button data-a="${i}">${esc(p.w)}</button>`).join("")}</div>
      <div id="kurres" style="min-height:26px">${sonuc || ""}</div>
      <div class="kur-btns">
        <button class="go" id="kurcheck">Kontrol et</button>
        <button id="kurhear"> Dinle</button>
        <button id="kurhint"${kurYanlis >= 2 ? ' class="blink"' : ""}> İpucu</button>
        <button id="kurskip">Geç</button>
      </div>`;
    box.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
      const i = +b.dataset.a; kurPick.push(kurPool[i]); kurPool.splice(i, 1); ciz();
    });
    box.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
      const i = +b.dataset.r; kurPool.push(kurPick[i]); kurPick.splice(i, 1); ciz();
    });
    $("#kurhear").onclick = () => speak(s.en);
    $("#kurskip").onclick = () => { kurPos++; drawKur(); };
    $("#kurhint").onclick = () => {
      kurIpucu = true;
      let j = 0;
      while (j < kurPick.length && kurPick[j].w === dogru[j]) j++;
      while (kurPick.length > j) kurPool.push(kurPick.pop());   /* ilk hatadan sonrasi havuza doner */
      const i = kurPool.findIndex(p => p.w === dogru[j]);
      ciz(`<span class="kur-tip">İpucu: sıradaki kelime yeşil çerçeveli. Bu cümle puana sayılmayacak.</span>`);
      const btns = box.querySelectorAll(".sb-pool button");
      if (i >= 0 && btns[i]) btns[i].classList.add("hint");
    };
    $("#kurcheck").onclick = () => {
      if (kurPick.map(p => p.w).join(" ") === s.en) {
        if (!kurIpucu) kurScore++;
        speak(s.en);
        ciz(`<span class="sb-ok">✓ Doğru: ${esc(s.en)}</span><div class="kur-note"> ${esc(s.note)}</div>`);
        box.querySelectorAll("button").forEach(b => b.disabled = true);
        setTimeout(() => { kurPos++; drawKur(); }, 1800);
      } else {
        kurYanlis++;
        ciz(`<span class="sb-bad">Sıra doğru değil, tekrar dene.</span>`);
      }
    };
  }
}

/* ================== 7) OYUNLAR ================== */
const GTEMA = [
  { k: "mix", ad: "Karışık" },
  { k: "food", ad: "Yemek ve İçecek" },
  { k: "animals", ad: "Hayvanlar" },
  { k: "body", ad: "Vücut" },
  { k: "home", ad: "Ev ve Eşyalar" },
  { k: "city", ad: "Şehir ve Mekânlar" },
  { k: "nature", ad: "Doğa ve Hava" },
  { k: "jobs", ad: "Meslekler" },
  { k: "clothes", ad: "Kıyafet" },
  { k: "transport", ad: "Ulaşım" },
  { k: "school", ad: "Okul ve Ofis" },
  { k: "sport", ad: "Spor ve Hobi" },
  { k: "feelings", ad: "Duygular ve Yüzler" }
];
const GAMES = [
  { k: "match", em: "", ad: "Resim Eşleştirme", alt: "Kelimeyi duy, doğru resmi seç" },
  { k: "mem", em: "", ad: "Hafıza Kartları", alt: "Resmi kelimesiyle eşleştir" },
  { k: "spell", em: "", ad: "Harfleri Sırala", alt: "Karışık harflerden kelimeyi kur" },
  { k: "rush", em: "", ad: "Hız Turu", alt: "60 saniyede kaç kelime?" }
];
let gTimer = null;

function gStop() {
  if (gTimer) { clearInterval(gTimer); gTimer = null; }
  if (mem) mem.bitti = true;
  if (rs) rs.bitti = true;
  stopSpeak();
}
function gSpeak(t) { if (S.games.sound) speak(t); }          /* ses anahtari yalniz oyunlari etkiler */
function gTemaAd(k) { const t = GTEMA.find(x => x.k === k); return t ? t.ad : "Karışık"; }

/* dort oyunun ortak kelime kaynagi — ayni turda ayni kelime iki kez cikmaz */
function pickWords(n, theme, opts) {
  opts = opts || {};
  const suz = list => list.filter(w =>
    (!opts.min || w.e.length >= opts.min) &&
    (!opts.max || w.e.length <= opts.max) &&
    (!opts.tek || w.e.indexOf(" ") < 0));
  let h = suz((opts.from || GAMEWORDS).filter(w => !theme || theme === "mix" || w.th === theme));
  if (h.length < n) h = suz(GAMEWORDS);      /* tema o uzunlukta yetmiyorsa tum havuza dus */
  return h.slice().sort(() => Math.random() - .5).slice(0, n);
}
function gCeldirici(w, n) {
  let ayni = GAMEWORDS.filter(x => x.th === w.th && x.e !== w.e);
  if (ayni.length < n) ayni = GAMEWORDS.filter(x => x.e !== w.e);
  return ayni.sort(() => Math.random() - .5).slice(0, n);
}
/* img alani ileride doldurulacak; o gun bu satir disinda kod degismeyecek */
function gGorsel(w, boy) {
  return w.img ? `<img class="gimg ${boy || ""}" src="${esc(w.img)}" alt="${esc(w.t)}" loading="lazy">`
    : `<span class="gimg-fallback ${boy || ""}" aria-hidden="true">${esc(w.e.slice(0, 1).toUpperCase())}</span>`;
}
/* oyun oynamak da gunluk seriyi beslesin (sekme gece yarisini asarak acik kalirsa da) */
function touchStreak() {
  const bugun = new Date().toISOString().slice(0, 10);
  if (S.streak.last === bugun) return;
  const dun = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.streak.count = (S.streak.last === dun) ? S.streak.count + 1 : 1;
  S.streak.last = bugun;
  store.write(S);
  const el = $("#streak"); if (el) el.textContent = " " + S.streak.count + " gün";
}
function gTurBitti() { S.games.rounds = (S.games.rounds || 0) + 1; store.write(S); touchStreak(); }

/* ---------- oyun secim ekrani ---------- */
function renderGames() {
  gStop();
  const enIyi = {
    match: (() => { const v = Object.keys(S.games.match).map(k => S.games.match[k]); return v.length ? `En iyi: ${Math.max.apply(null, v)}/10` : "Henüz oynamadın"; })(),
    mem: (() => { const v = Object.keys(S.games.mem).map(k => S.games.mem[k].hamle); return v.length ? `En iyi: ${Math.min.apply(null, v)} hamle` : "Henüz oynamadın"; })(),
    spell: (() => { const v = Object.keys(S.games.spell).map(k => S.games.spell[k]); return v.length ? `En iyi: ${Math.max.apply(null, v)}/10` : "Henüz oynamadın"; })(),
    rush: (S.games.rush.best ? `Rekor: ${S.games.rush.best} kelime` : "Henüz oynamadın")
  };
  $("#v-oyun").innerHTML = `
    <h2 class="sec-title">Oyunlar</h2>
    <p class="sec-sub">Kelimeleri oynayarak öğren. Her oyun 2-3 dakika sürer, her gün birkaç tur yeter.</p>
    <div class="deckgrid">
      ${GAMES.map(g => `
        <div class="card deck st-card" data-g="${g.k}" tabindex="0" role="button">
          <span class="game-icon" aria-hidden="true">${lineIcon(g.k === "match" ? "hikaye" : g.k === "mem" ? "kelime" : g.k === "spell" ? "pratik" : "gunluk")}</span>
          <b>${g.ad}</b>
          <small>${g.alt}</small>
          <span class="due" style="background:var(--green-soft);color:var(--green)">${enIyi[g.k]}</span>
        </div>`).join("")}
    </div>
    <p class="sec-sub" style="margin-top:22px">Tema: <b>${gTemaAd(S.games.theme)}</b> · oyunun içinden değiştirebilirsin. Toplam ${GAMEWORDS.length} resimli kelime.</p>`;
  document.querySelectorAll("#v-oyun .deck").forEach(el => {
    const ac = () => gAc(el.dataset.g);
    el.onclick = ac;
    el.onkeydown = e => { if (e.key === "Enter") ac(); };
  });
}
function gAc(k) {
  if (k === "match") matchStart();
  if (k === "mem") memMenu();
  if (k === "spell") spellMenu();
  if (k === "rush") rushIntro();
}

/* ---------- her oyun ekraninin ustundeki ortak cubuk ---------- */
function gBar() {
  return `<div class="g-head">
    <button class="backbtn" id="gback">← Oyunlara dön</button>
    <select class="g-theme" id="gtheme" aria-label="Tema seç">
      ${GTEMA.map(t => `<option value="${t.k}"${t.k === S.games.theme ? " selected" : ""}>${t.ad}</option>`).join("")}
    </select>
    <button class="g-sound${S.games.sound ? " on" : ""}" id="gsound" aria-label="Sesi aç/kapat" title="Oyun sesi">${S.games.sound ? "" : ""}</button>
  </div>`;
}
function gBarBind(yeniden) {
  $("#gback").onclick = () => { gStop(); renderGames(); };
  $("#gtheme").onchange = e => { S.games.theme = e.target.value; store.write(S); gStop(); yeniden(); };
  $("#gsound").onclick = () => {
    S.games.sound = !S.games.sound; store.write(S);
    if (!S.games.sound) stopSpeak();
    const b = $("#gsound");
    b.textContent = S.games.sound ? "" : "";
    b.classList.toggle("on", S.games.sound);
  };
}
function gYanlisListe(liste) {
  if (!liste.length) return `<p class="sec-sub" style="margin:10px 0 0">Hiç yanlışın yok — tertemiz tur! </p>`;
  return `<div class="g-wrong"><b>Tekrar bakılacaklar</b>${liste.map(w => `
    <div class="g-wrow">${gGorsel(w, "sm")}<span><b>${esc(w.e)}</b><i>${esc(w.t)}</i></span></div>`).join("")}</div>`;
}

/* ================== OYUN 1 — RESIM ESLESTIRME ================== */
let mt = null;
function matchStart(from) {
  mt = {
    list: from || pickWords(10, S.games.theme), i: 0, dogru: 0, yanlis: [],
    mod: (mt && mt.mod) || "gor", kilit: false, opts: []
  };
  matchDraw();
}
function matchDraw() {
  if (mt.i >= mt.list.length) return matchEnd();
  const w = mt.list[mt.i];
  mt.opts = [w].concat(gCeldirici(w, 3)).sort(() => Math.random() - .5);
  mt.kilit = false;
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="g-prog"><span>${mt.i + 1}/${mt.list.length}</span>
      <span class="kur-bar"><i style="width:${Math.round(mt.i / mt.list.length * 100)}%"></i></span>
      <span>${mt.dogru} doğru</span></div>
    <div class="chips">
      <button class="chip ${mt.mod === "gor" ? "on" : ""}" data-m="gor">Gör ve seç</button>
      <button class="chip ${mt.mod === "duy" ? "on" : ""}" data-m="duy">Duy ve seç</button>
    </div>
    <div class="g-target">
      <span class="g-word${mt.mod === "duy" ? " gizli" : ""}">${mt.mod === "duy" ? "• • •" : esc(w.e)}</span>
      <button class="bigspk" id="mspk" aria-label="Dinle">${SPK}</button>
    </div>
    <div class="g-opts">${mt.opts.map((o, i) => `
      <button class="g-opt" data-o="${i}"><span class="k">${i + 1}</span>${gGorsel(o, "mid")}<i class="tr"></i></button>`).join("")}</div>`;
  gBarBind(matchStart);
  $("#mspk").onclick = () => speak(w.e);           /* hoparlore basmak ses kapaliyken de calisir */
  document.querySelectorAll("#v-oyun .chip[data-m]").forEach(b => b.onclick = () => { mt.mod = b.dataset.m; matchDraw(); });
  document.querySelectorAll("#v-oyun .g-opt").forEach(b => b.onclick = () => matchSec(+b.dataset.o));
  gSpeak(w.e);
}
function matchSec(i) {
  if (mt.kilit) return;
  mt.kilit = true;
  const w = mt.list[mt.i], sec = mt.opts[i];
  const btns = document.querySelectorAll("#v-oyun .g-opt");
  const d = mt.opts.indexOf(w);
  btns[d].classList.add("ok");
  btns[d].querySelector(".tr").textContent = w.t;
  if (sec === w) {
    mt.dogru++;
    gSpeak(w.e);
    setTimeout(() => { mt.i++; matchDraw(); }, 900);
  } else {
    btns[i].classList.add("no");
    btns[i].querySelector(".tr").textContent = sec.t;
    mt.yanlis.push(w);
    setTimeout(() => { mt.i++; matchDraw(); }, 1600);   /* ceza yok, tur devam eder */
  }
}
function matchEnd() {
  const t = S.games.theme;
  S.games.match[t] = Math.max(S.games.match[t] || 0, mt.dogru);
  gTurBitti();
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="card g-end">
      <div class="daily-en">${mt.dogru}/${mt.list.length}</div>
      <p class="daily-tr">${mt.dogru === mt.list.length ? "Kusursuz! " : mt.dogru >= 7 ? "İyi gidiyor." : "Yanlışları bir tur daha çalış."}</p>
      ${gYanlisListe(mt.yanlis)}
      <div class="kur-btns" style="justify-content:center">
        <button class="go" id="mag">Tekrar oyna</button>
        ${mt.yanlis.length ? `<button id="mwrong">Yanlışları tekrar çalış</button>` : ""}
      </div>
    </div>`;
  gBarBind(matchStart);
  const y = mt.yanlis.slice();
  $("#mag").onclick = () => matchStart();
  if (y.length) $("#mwrong").onclick = () => matchStart(y.slice().sort(() => Math.random() - .5));
}

/* ================== OYUN 2 — HAFIZA KARTLARI ================== */
const MEM_LVL = [{ ad: "Kolay", cift: 6, kol: 4 }, { ad: "Orta", cift: 8, kol: 4 }, { ad: "Zor", cift: 10, kol: 5 }];
let mem = null;
function memMenu() {
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <h2 class="sec-title">Hafıza Kartları</h2>
    <p class="sec-sub">Bir kartta resim, eşinde İngilizce kelime var. İkisini bul, kelime seslendirilsin.</p>
    <div class="chips">${MEM_LVL.map((L, i) => {
    const r = S.games.mem[i];
    return `<button class="chip" data-l="${i}">${L.ad} · ${L.cift} çift${r ? ` · rekor ${r.hamle} hamle` : ""}</button>`;
  }).join("")}</div>`;
  gBarBind(memMenu);
  document.querySelectorAll("#v-oyun .chip[data-l]").forEach(b => b.onclick = () => memStart(+b.dataset.l));
}
function memStart(li) {
  const L = MEM_LVL[li];
  const ws = pickWords(L.cift, S.games.theme);
  const kart = [];
  ws.forEach((w, i) => { kart.push({ w, tip: "m", id: "m" + i }); kart.push({ w, tip: "e", id: "e" + i }); });
  mem = { li, L, kart: kart.sort(() => Math.random() - .5), acik: [], eslesen: {}, hamle: 0, t0: Date.now(), kilit: false, bitti: false };
  memDraw();
  if (gTimer) clearInterval(gTimer);
  gTimer = setInterval(memSaat, 1000);
}
function memSure() {
  const s = Math.floor((Date.now() - mem.t0) / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function memSaat() { const el = $("#msure"); if (el && mem && !mem.bitti) el.textContent = memSure(); }
function memDraw() {
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="g-prog"><span>Hamle: <b id="mhamle">${mem.hamle}</b></span><span>Süre: <b id="msure">${memSure()}</b></span><span>${mem.L.ad}</span></div>
    <div class="m-grid" style="grid-template-columns:repeat(${mem.L.kol},minmax(0,1fr));max-width:${mem.L.kol * 104}px">
      ${mem.kart.map((k, i) => `
        <button class="m-card" data-i="${i}">
          <span class="m-arka">?</span>
          <span class="m-on">${k.tip === "m" ? gGorsel(k.w, "mid") : `<b class="m-en">${esc(k.w.e)}</b>`}<i class="m-tr">${esc(k.w.t)}</i></span>
        </button>`).join("")}
    </div>`;
  gBarBind(() => memStart(mem.li));
  document.querySelectorAll("#v-oyun .m-card").forEach(b => b.onclick = () => memAc(+b.dataset.i));
  memYansit();
}
function memYansit() {
  document.querySelectorAll("#v-oyun .m-card").forEach((el, i) => {
    const k = mem.kart[i];
    el.classList.toggle("acik", mem.acik.indexOf(i) >= 0);
    el.classList.toggle("es", !!mem.eslesen[k.id]);
  });
  const h = $("#mhamle"); if (h) h.textContent = mem.hamle;
}
function memAc(i) {
  if (!mem || mem.kilit || mem.bitti) return;
  const k = mem.kart[i];
  if (mem.eslesen[k.id] || mem.acik.indexOf(i) >= 0) return;
  if (mem.acik.length >= 2) return;                 /* ucuncu karta dokunma yok sayilir */
  mem.acik.push(i);
  memYansit();
  if (mem.acik.length < 2) return;
  mem.hamle++;
  const a = mem.kart[mem.acik[0]], b = mem.kart[mem.acik[1]];
  if (a.w.e === b.w.e && a.tip !== b.tip) {
    mem.eslesen[a.id] = mem.eslesen[b.id] = true;
    mem.acik = [];
    gSpeak(a.w.e);
    memYansit();
    if (Object.keys(mem.eslesen).length === mem.kart.length) memBit();
  } else {
    mem.kilit = true;
    setTimeout(() => { if (!mem) return; mem.acik = []; mem.kilit = false; memYansit(); }, 900);
  }
}
function memBit() {
  mem.bitti = true;
  if (gTimer) { clearInterval(gTimer); gTimer = null; }
  const sn = Math.floor((Date.now() - mem.t0) / 1000);
  const eski = S.games.mem[mem.li];
  const rekor = !eski || mem.hamle < eski.hamle;
  if (rekor) S.games.mem[mem.li] = { hamle: mem.hamle, sn };
  gTurBitti();
  setTimeout(() => {
    $("#v-oyun").innerHTML = `
      ${gBar()}
      <div class="card g-end">
        <div class="daily-en">${mem.hamle} hamle</div>
        <p class="daily-tr">${mem.L.cift} çiftin hepsini ${memSure()} içinde buldun.${rekor ? "  Yeni rekor!" : ""}</p>
        <div class="kur-btns" style="justify-content:center">
          <button class="go" id="mem2">Tekrar oyna</button>
          <button id="mem3">Seviye seç</button>
        </div>
      </div>`;
    gBarBind(memMenu);
    $("#mem2").onclick = () => memStart(mem.li);
    $("#mem3").onclick = memMenu;
  }, 900);
}

/* ================== OYUN 3 — HARFLERI SIRALA ================== */
const SP_LVL = [{ ad: "Kolay", min: 3, max: 4, fazla: 0 }, { ad: "Orta", min: 5, max: 6, fazla: 0 }, { ad: "Zor", min: 7, max: 99, fazla: 2 }];
let sp = null;
function spellMenu() {
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <h2 class="sec-title">Harfleri Sırala</h2>
    <p class="sec-sub">Resme ve Türkçesine bak, harflere dokunarak İngilizcesini yaz. 10 kelimelik tur.</p>
    <div class="chips">${SP_LVL.map((L, i) => {
    const r = S.games.spell[i];
    return `<button class="chip" data-l="${i}">${L.ad} · ${L.max > 50 ? "7+" : L.min + "-" + L.max} harf${r != null ? ` · rekor ${r}/10` : ""}</button>`;
  }).join("")}</div>`;
  gBarBind(spellMenu);
  document.querySelectorAll("#v-oyun .chip[data-l]").forEach(b => b.onclick = () => spellStart(+b.dataset.l));
}
function spellStart(li) {
  const L = SP_LVL[li];
  sp = { li, L, list: pickWords(10, S.games.theme, { min: L.min, max: L.max, tek: true }), i: 0, dogru: 0, temiz: 0 };
  spellSoru();
}
function spellSoru() {
  if (sp.i >= sp.list.length) return spellEnd();
  const kelime = sp.list[sp.i].e.toLowerCase();
  const harfler = kelime.split("");
  if (sp.L.fazla) {
    const abc = "abcdefghijklmnopqrstuvwxyz".split("").filter(h => harfler.indexOf(h) < 0);
    const n = 1 + Math.floor(Math.random() * sp.L.fazla);
    abc.sort(() => Math.random() - .5).slice(0, n).forEach(h => harfler.push(h));   /* zor seviyede celdirici harf */
  }
  sp.havuz = harfler.sort(() => Math.random() - .5).map((h, i) => ({ h, id: i }));
  sp.yuva = [];
  sp.ipucu = false; sp.yanlis = 0;
  spellDraw();
}
function spellDraw(res) {
  const w = sp.list[sp.i], kelime = w.e.toLowerCase();
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="g-prog"><span>${sp.i + 1}/${sp.list.length}</span>
      <span class="kur-bar"><i style="width:${Math.round(sp.i / sp.list.length * 100)}%"></i></span>
      <span>${sp.dogru} doğru</span></div>
    <div class="sp-stage">${gGorsel(w, "big")}<div class="sp-tr">${esc(w.t)}</div></div>
    <div class="sp-slots${res === "no" ? " shake" : ""}" lang="en">
      ${Array.from({ length: kelime.length }, (_, i) => {
    const s = sp.yuva[i];
    return `<button class="sp-slot${s ? " dolu" : ""}${res === "ok" ? " ok" : ""}${res === "no" ? " no" : ""}" data-y="${i}">${s ? esc(s.h) : ""}</button>`;
  }).join("")}
    </div>
    <div class="sp-pool" lang="en">${sp.havuz.map((p, i) => `<button class="sp-tile" data-h="${i}">${esc(p.h)}</button>`).join("")}</div>
    <div id="spres" style="min-height:26px">${res === "no" ? `<span class="sb-bad">Olmadı, tekrar dene.</span>` : res === "ok" ? `<span class="sb-ok">✓ ${esc(w.e)}</span>` : ""}</div>
    <div class="kur-btns">
      <button class="go" id="spcheck">Kontrol et</button>
      <button id="sphint"> İpucu</button>
      <button id="spskip">Geç</button>
      ${sp.yanlis >= 3 ? `<button id="spshow">Cevabı göster</button>` : ""}
    </div>`;
  gBarBind(() => spellStart(sp.li));
  document.querySelectorAll("#v-oyun .sp-tile").forEach(b => b.onclick = () => {
    if (sp.yuva.length >= kelime.length) return;
    sp.yuva.push(sp.havuz[+b.dataset.h]);
    sp.havuz.splice(+b.dataset.h, 1);
    spellDraw();
  });
  document.querySelectorAll("#v-oyun .sp-slot").forEach(b => b.onclick = () => {
    const i = +b.dataset.y;
    if (!sp.yuva[i]) return;
    sp.havuz.push(sp.yuva[i]); sp.yuva.splice(i, 1);
    spellDraw();
  });
  $("#spcheck").onclick = () => {
    if (sp.yuva.map(x => x.h).join("") === kelime) {
      sp.dogru++; if (!sp.ipucu) sp.temiz++;
      gSpeak(w.e);
      spellDraw("ok");
      setTimeout(() => { sp.i++; spellSoru(); }, 1000);
    } else {
      sp.yanlis++;
      spellDraw("no");                                  /* cevap gosterilmez */
    }
  };
  $("#sphint").onclick = () => {
    sp.ipucu = true;
    while (sp.yuva.length) { sp.havuz.push(sp.yuva.pop()); }
    const i = sp.havuz.findIndex(p => p.h === kelime[0]);
    if (i >= 0) { sp.yuva.push(sp.havuz[i]); sp.havuz.splice(i, 1); }
    spellDraw();
  };
  $("#spskip").onclick = () => { sp.i++; spellSoru(); };
  if (sp.yanlis >= 3) $("#spshow").onclick = () => {
    sp.ipucu = true;
    sp.havuz = sp.havuz.concat(sp.yuva); sp.yuva = [];
    kelime.split("").forEach(h => {
      const i = sp.havuz.findIndex(p => p.h === h);
      if (i >= 0) { sp.yuva.push(sp.havuz[i]); sp.havuz.splice(i, 1); }
    });
    gSpeak(w.e);
    spellDraw();
  };
}
function spellEnd() {
  S.games.spell[sp.li] = Math.max(S.games.spell[sp.li] || 0, sp.dogru);
  gTurBitti();
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="card g-end">
      <div class="daily-en">${sp.dogru}/${sp.list.length}</div>
      <p class="daily-tr">${sp.temiz} kelimeyi ipucu almadan çözdün.</p>
      <div class="kur-btns" style="justify-content:center">
        <button class="go" id="sp2">Tekrar oyna</button>
        <button id="sp3">Seviye seç</button>
      </div>
    </div>`;
  gBarBind(spellMenu);
  $("#sp2").onclick = () => spellStart(sp.li);
  $("#sp3").onclick = spellMenu;
}

/* ================== OYUN 4 — HIZ TURU (60 sn) ================== */
let rs = null;
function rushIntro() {
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <h2 class="sec-title">Hız Turu</h2>
    <p class="sec-sub">60 saniye. Resmi gör, doğru İngilizce kelimeye dokun. Yanlış cevap 3 saniye götürür, 5'li seri 2 saniye kazandırır.</p>
    <div class="card g-end">
      <div class="daily-en">${S.games.rush.best || 0}</div>
      <p class="daily-tr">şimdiye kadarki rekorun${S.games.rush.seri ? ` · en uzun seri ${S.games.rush.seri}` : ""}</p>
      <button class="startquiz" id="rgo">Başla</button>
    </div>`;
  gBarBind(rushIntro);
  $("#rgo").onclick = rushStart;
}
function rushStart() {
  rs = { bitis: Date.now() + 60000, skor: 0, seri: 0, enSeri: 0, yanlis: [], kilit: false, bitti: false, bonus: false };
  rushSoru();
  if (gTimer) clearInterval(gTimer);
  gTimer = setInterval(rushTik, 100);
}
function rushTik() {
  if (!rs || rs.bitti) return;
  const kalan = rs.bitis - Date.now();                 /* Date.now() farki: arkaplanda sisMEZ */
  const bar = $("#rbar"), sn = $("#rsn");
  if (kalan <= 0) { rushBit(); return; }
  if (!bar) return;
  bar.style.width = Math.max(0, Math.min(100, kalan / 600)) + "%";
  sn.textContent = Math.ceil(kalan / 1000);
  bar.parentNode.classList.toggle("son", kalan <= 10000);
}
function rushSoru() {
  if (!rs || rs.bitti) return;
  const w = pickWords(1, S.games.theme)[0];
  rs.w = w;
  rs.opts = [w].concat(gCeldirici(w, 3)).sort(() => Math.random() - .5);
  rs.kilit = false;
  const kalan = Math.max(0, rs.bitis - Date.now());
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="r-top">
      <span class="r-skor">${rs.skor}</span>
      <span class="r-track${kalan <= 10000 ? " son" : ""}"><i id="rbar" style="width:${Math.min(100, kalan / 600)}%"></i></span>
      <span class="r-sn"><b id="rsn">${Math.ceil(kalan / 1000)}</b> sn</span>
    </div>
    ${rs.seri >= 5 ? `<div class="r-seri"> ${rs.seri}x seri${rs.bonus ? " · +2 sn" : ""}</div>` : `<div class="r-seri bos"></div>`}
    <div class="sp-stage">${gGorsel(w, "big")}</div>
    <div class="g-opts words">${rs.opts.map((o, i) => `
      <button class="g-opt" data-o="${i}"><span class="k">${i + 1}</span><b>${esc(o.e)}</b></button>`).join("")}</div>`;
  gBarBind(rushIntro);
  document.querySelectorAll("#v-oyun .g-opt").forEach(b => b.onclick = () => rushSec(+b.dataset.o));
}
function rushSec(i) {
  if (!rs || rs.kilit || rs.bitti) return;
  const w = rs.w, sec = rs.opts[i];
  const btns = document.querySelectorAll("#v-oyun .g-opt");
  if (sec === w) {
    rs.skor++; rs.seri++; rs.bonus = false;
    if (rs.seri > rs.enSeri) rs.enSeri = rs.seri;
    if (rs.seri % 5 === 0) { rs.bitis += 2000; rs.bonus = true; }
    gSpeak(w.e);
    btns[i].classList.add("ok");
    rushSoru();                                        /* bekleme yok — akis kesilmesin */
  } else {
    rs.kilit = true;
    rs.seri = 0; rs.bitis -= 3000;
    rs.yanlis.push(w);
    btns[i].classList.add("no");
    btns[rs.opts.indexOf(w)].classList.add("ok");
    setTimeout(() => { if (rs && !rs.bitti) rushSoru(); }, 600);
  }
}
function rushBit() {
  if (!rs || rs.bitti) return;
  rs.bitti = true;
  if (gTimer) { clearInterval(gTimer); gTimer = null; }
  const rekor = rs.skor > (S.games.rush.best || 0);
  if (rekor) S.games.rush.best = rs.skor;
  if (rs.enSeri > (S.games.rush.seri || 0)) S.games.rush.seri = rs.enSeri;
  gTurBitti();
  $("#v-oyun").innerHTML = `
    ${gBar()}
    <div class="card g-end">
      <div class="daily-en">${rs.skor} kelime</div>
      <p class="daily-tr">En uzun seri: ${rs.enSeri}${rekor ? " ·  Yeni rekor!" : ` · rekor ${S.games.rush.best}`}</p>
      ${gYanlisListe(rs.yanlis)}
      <div class="kur-btns" style="justify-content:center">
        <button class="go" id="r2">Tekrar oyna</button>
        <button id="r3">Oyunlara dön</button>
      </div>
    </div>`;
  gBarBind(rushIntro);
  $("#r2").onclick = rushStart;
  $("#r3").onclick = () => { gStop(); renderGames(); };
}

/* ---------- klavye: 1-4 sik, Enter kontrol, Esc geri ---------- */
document.addEventListener("keydown", e => {
  const v = $("#v-oyun");
  if (!v || !v.classList.contains("on")) return;
  if (e.target && /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === "Escape") { gStop(); renderGames(); return; }
  if (e.key === "Enter") { const b = $("#spcheck"); if (b) { e.preventDefault(); b.click(); } return; }
  if (/^[1-4]$/.test(e.key)) {
    const o = document.querySelectorAll("#v-oyun .g-opt");
    if (o[+e.key - 1]) o[+e.key - 1].click();
  }
});
