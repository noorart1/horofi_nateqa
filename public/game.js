// «دنياي السعيدة»: five games on the card pictures, for 3 to 8 year olds who can't read yet: pictures lead (no words are spoken;
// the sounds are synthesized effects from sfx.js),
// the Arabic text on screen is for the adult beside them. Data and difficulty table: game-data.js. Profiles and progress
// stay in this browser (localStorage). Mistakes never cost anything: a wrong try just shakes, and the answer glows after a few.
const app = document.getElementById('app');
const ar = n => Number(n).toLocaleString('ar');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const file = path => path.split('/').pop();
const WORDS = GAME_WORDS.filter(w => [w.card, w.pic, w.cut].every(u => Object.hasOwn(GAME_FILES, file(u))));
// versioned addresses: the server lets a browser keep them a year without asking again (.htaccess)
for (const w of WORDS) for (const k of ['card', 'pic', 'cut']) w[k] += '?v=' + GAME_FILES[file(w[k])];
const byN = Object.fromEntries(WORDS.map(w => [w.n, w]));
// each card's word starts with its letter (card NN = letter NN); alif as printed on the card
const glyph = w => w.n === '01' ? 'أ' : 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'[+w.n - 1];
const still = matchMedia('(prefers-reduced-motion: reduce)');
const sfx = name => AudioManager.play(name);
// the speaker toggle on the letters page (remembered per browser) also mutes the games
const syncSound = () => { let on = true; try { on = localStorage.getItem('sfx') !== '0'; } catch {} AudioManager.set({ muted: !on, volume: 0.7 }); };
const MINUTES = 15; // a rest is suggested after this much play
const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// ---------- drawn icons (DESIGN.md: no emoji) ----------
const I = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-5h4v5"/>',
  map: '<path d="M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  chest: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10a8 5.5 0 0 1 16 0"/><path d="M10.5 12.5h3v3h-3z"/>',
  play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  word: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8"/>',
  memory: '<rect x="3.5" y="6" width="9" height="13" rx="2" transform="rotate(-8 8 12.5)"/><rect x="11.5" y="5" width="9" height="13" rx="2" transform="rotate(8 16 11.5)"/>',
  shadow: '<path d="M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19H5z"/>',
  letter: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>',
  missing: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  first: '<path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  animals: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 11c-3 0-5.5 3.5-5.5 6a2.5 2.5 0 0 0 3.5 2.2 5 5 0 0 1 4 0A2.5 2.5 0 0 0 17.5 17c0-2.5-2.5-6-5.5-6z"/>',
  explorer: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  champion: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5v1A3.5 3.5 0 0 0 8 10M17 5.5h2.5v1A3.5 3.5 0 0 1 16 10M12 13v4M8.5 20h7"/>',
};
I.letters = I.letter; I.puzzle = I.shadow;
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[name]}</svg>`;
const starRow = (n, of = 3) => `<span class="g-stars" role="img" aria-label="${ar(n)} من ${ar(of)}">${Array.from({ length: of }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span>`;

// ---------- profiles (this browser) ----------
const KEY = 'horofi-happy-world-1';
let store;
try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { store = {}; }
store.profiles ||= {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
let me = store.profiles[store.current] || null;
const blank = age => ({ level: Array(5).fill(GAME_AGES[age].level), best: Array(5).fill(0), plays: Array(5).fill(0),
  points: 0, badges: {}, words: {}, animals: [], letters: 0, placed: 0, found: 0 });
function newProfile(name, avatar, age) {
  const id = Date.now().toString(36);
  store.profiles[id] = { id, name, avatar, age, ...blank(age) };
  return use(id);
}
function use(id) { me = store.profiles[id]; store.current = id; save(); started = Date.now(); syncSound(); return me; }

// ---------- pictures: fetched once, decoded, kept ----------
// As the page opens every picture is fetched in the background (the map's and profiles' first), at most 4 at a time so a
// weak connection isn't choked, and decoded. A failed one is tried again after 1, 2 and 4 seconds, then left out until the
// connection comes back. A board is drawn only when all its pictures are decoded, so none is ever seen blank or half.
const PICS = new Map(); // url → { state: 'wait' | 'ok' | 'bad', img (kept, so the browser keeps it ready), ok: Promise<boolean> }
const queue = [];
let busy = 0;
function pic(url, soon) {
  let p = PICS.get(url);
  if (!p) { p = { state: 'wait', tries: 0 }; p.ok = new Promise(r => p.done = r); PICS.set(url, p); queue.push(url); }
  const i = soon ? queue.indexOf(url) : -1;
  if (i > 0) queue.unshift(...queue.splice(i, 1));
  pump();
  return p.ok;
}
function pump() {
  while (busy < 4 && queue.length) {
    const url = queue.shift(), p = PICS.get(url), img = new Image();
    busy++;
    img.src = url;
    img.decode().then(() => { p.img = img; p.state = 'ok'; p.done(true); }, () => {
      if (++p.tries <= 3) return setTimeout(() => { queue.unshift(url); pump(); }, 500 << p.tries);
      p.state = 'bad'; p.done(false);
    }).finally(() => { busy--; pump(); });
  }
}
const isOk = url => PICS.get(url)?.state === 'ok';
const bad = w => [w.card, w.pic, w.cut].some(u => PICS.get(u)?.state === 'bad');
const live = () => WORDS.filter(w => !bad(w)); // the words a board may use now
function retryBad() { for (const [url, p] of PICS) if (p.state === 'bad') { PICS.delete(url); pic(url); } }
// outside the games (map, profiles…) a picture not decoded yet waits as a softly breathing disc, never half drawn
function hold() {
  app.querySelectorAll('img[src]').forEach(img => {
    const url = img.getAttribute('src');
    if (!url || isOk(url)) return;
    img.removeAttribute('src');
    img.classList.add('g-pend');
    const show = () => pic(url, true).then(ok => { if (ok) { img.src = url; img.classList.remove('g-pend'); } else img.retry = show; });
    show();
  });
}
addEventListener('online', () => { retryBad(); app.querySelectorAll('.g-pend').forEach(img => img.retry?.()); });

const at = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

// ---------- screens ----------
let started = Date.now(), rested = false, G = null, auto = 0;
const leave = () => { if (G) G.timers.forEach(clearTimeout); G = null; clearTimeout(auto); };
const go = (html, cls = '') => { app.className = 'game-page ' + cls; app.innerHTML = html; hold(); scrollTo(0, 0); };
const topBtn = (act, name, label, extra = '') => `<button class="g-round" data-act="${act}" aria-label="${label}" ${extra}>${icon(name)}</button>`;

function profiles() {
  leave();
  const list = Object.values(store.profiles);
  if (!list.length) return create();
  go(`<div class="g-top">${homeLink()}</div>
    <section class="g-panel"><h2>من سيلعب؟</h2>
      <div class="g-kids">${list.map(p => `<button class="g-kid" data-act="pick" data-id="${p.id}"><img src="${byN[p.avatar]?.pic || WORDS[0].pic}" alt=""><b>${esc(p.name)}</b></button>`).join('')}
        <button class="g-kid add" data-act="create">${icon('plus')}<b>طفل جديد</b></button></div></section>`);
}

let draft = null;
const AVATARS = ['01', '08', '04', '20', '21', '12', '18', '25'].filter(n => byN[n]);
function create() {
  leave();
  draft ||= { avatar: '01', age: null };
  const avatars = AVATARS;
  go(`<div class="g-top">${homeLink()}</div>
    <section class="g-panel g-form">
      <h2>طفل جديد</h2>
      <p class="g-hint">يملأ هذه الصفحة أحد الكبار.</p>
      <label for="kidName">اسم الطفل</label><input id="kidName" maxlength="20" placeholder="بطلنا" value="${esc(draft.name ?? USER_NAME)}">
      <h3>اختر صورته</h3>
      <div class="g-opts small">${avatars.map(n => `<button class="g-opt ${draft.avatar === n ? 'right' : ''}" data-act="avatar" data-n="${n}" aria-pressed="${draft.avatar === n}" aria-label="صورة"><img src="${byN[n].pic}" alt=""></button>`).join('')}</div>
      <h3>كم عمره؟</h3>
      <div class="g-ages">${GAME_AGES.map((a, i) => `<button class="g-age ${draft.age === i ? 'on' : ''}" data-act="age" data-i="${i}" aria-pressed="${draft.age === i}"><img src="${byN[a.pic]?.cut || ''}" alt=""><b>${a.label}</b></button>`).join('')}</div>
      <button class="btn" data-act="made" ${draft.age === null ? 'disabled' : ''}>ابدأ اللعب</button>
    </section>`);
  app.querySelector('#kidName').oninput = e => { draft.name = e.target.value; };
}

function map() {
  leave();
  if (!me) return profiles();
  if (!rested && Date.now() - started > MINUTES * 60000) return rest();
  const stars = me.best.reduce((a, b) => a + b, 0);
  go(`<div class="g-top">${homeLink()}
      <button class="g-me" data-act="profile" aria-label="ملفّي"><img src="${byN[me.avatar]?.pic || WORDS[0].pic}" alt=""><b>${esc(me.name)}</b></button>
      <span class="g-count">${starRow(1, 1)}${ar(stars)}</span>
      ${topBtn('treasure', 'chest', 'كنزي')}
      <button class="g-me" data-act="ages" aria-label="العمر"><img src="${byN[GAME_AGES[me.age].pic]?.cut || ''}" alt=""><b>${GAME_AGES[me.age].label}</b></button>
    </div>
    <section class="g-map">
      <svg class="g-path" viewBox="0 0 100 500" preserveAspectRatio="none" aria-hidden="true"><path d="M72 40C72 120 28 80 28 140S72 210 72 260 28 320 28 360 50 420 50 460"/></svg>
      ${GAME_STATIONS.map((s, si) => `<button class="g-station s${si} ${me.best[si] ? 'won' : ''}" data-act="station" data-i="${si}">
        <span class="g-disc">${icon(s.id)}</span><b>${s.place}</b><small>${s.name}</small>${starRow(me.best[si])}</button>`).join('')}
    </section>
    <button class="btn g-go" data-act="station" data-i="${Math.max(0, me.best.indexOf(0))}">${icon('play')}هيا نلعب</button>`, 'g-map-page');
}

function rest() {
  go(`<section class="g-panel g-center">${icon('first', 'g-big')}<h2>حان وقت الراحة!</h2>
    <p class="g-hint">لعب ${esc(me.name)} ${ar(MINUTES)} دقيقة. يمكن للكبار متابعة اللعب.</p>
    <div class="g-end"><a class="btn" href="./?letters">العودة إلى الحروف</a><button class="btn alt" data-act="morePlay">متابعة اللعب</button></div></section>`);
}

// ---------- the game frame, scoring and difficulty ----------
const ageLevel = () => GAME_AGES[me.age].level;
function start(si) {
  leave();
  const L = me.level[si], r = GAME_LEVELS[L].rounds;
  G = { si, L, round: 0, rounds: GAME_STATIONS[si].id === 'memory' ? Math.ceil(r / 2) : r, earned: 0, max: 0, bonus: 0,
    rightRow: 0, wrongRow: 0, perfect: true, used: new Set(), timers: [] };
  me.plays[si]++;
  save();
  sfx('welcome');
  round();
}
const after = (fn, ms) => { const g = G, t = setTimeout(() => g === G && fn(), ms); G.timers.push(t); };
function frame(hint, body) {
  go(`<div class="g-top">${topBtn('map', 'map', 'الخريطة')}
      <span class="g-dots" role="img" aria-label="الجولة ${ar(G.round + 1)} من ${ar(G.rounds)}">${Array.from({ length: G.rounds }, (_, k) => `<i class="${k < G.round ? 'on' : k === G.round ? 'now' : ''}"></i>`).join('')}</span></div>
    <section class="g-panel">${hint ? `<p class="g-hint">${hint}</p>` : ''}${body}</section>`, 'g-play');
}
const WAIT = '<div class="g-wait" role="status" aria-label="لحظة…"><i></i><i></i><i></i></div>';
// each game picks its board's words and returns them with the drawing; the board is drawn once all their pictures are
// decoded (a small waiting mark until then). A word whose picture failed is left out and the board is chosen again.
function round() {
  G.roundWrongs = 0; G.hinted = false; G.lock = false;
  const t = G.board = {}, now = () => G?.board === t;
  if (live().length < 12) { // the connection is down: wait for the pictures to come back
    frame('', WAIT);
    retryBad();
    return Promise.all(WORDS.flatMap(w => [w.card, w.pic, w.cut]).map(u => pic(u))).then(() => now() && round());
  }
  const [ws, draw] = ({ word: wordRound, memory: memoryRound, shadow: shadowRound, letter: letterRound, missing: missingRound })[GAME_STATIONS[G.si].id]();
  const urls = ws.flatMap(w => [w.card, w.pic, w.cut]);
  if (urls.every(isOk)) return draw();
  frame('', WAIT);
  Promise.all(urls.map(u => pic(u, true))).then(oks => now() && (oks.every(Boolean) ? draw() : round()));
}
// a target not used yet in this game (pictures repeat only when all were used)
function fresh(pool, n = 1, not = []) {
  let left = pool.filter(w => !G.used.has(w.n) && !not.includes(w.n));
  if (left.length < n) { G.used.clear(); left = pool.filter(w => !not.includes(w.n)); }
  const out = shuffle(left).slice(0, n);
  out.forEach(w => G.used.add(w.n));
  return out;
}
// distractors: very easy takes the other kind (animal vs thing), harder levels the same kind, so they look alike
function others(target, n, not = []) {
  const pool = live().filter(w => w.n !== target.n && !not.includes(w.n));
  const same = shuffle(pool.filter(w => w.kind === target.kind)), diff = shuffle(pool.filter(w => w.kind !== target.kind));
  return (G.L === 0 ? [...diff, ...same] : G.L >= 2 ? [...same, ...diff] : shuffle(pool)).slice(0, n);
}
const optBtn = w => `<button class="g-opt" data-n="${w.n}" aria-label="صورة"><img src="${w.pic}" alt="" draggable="false"></button>`;

// one answer: 100 points on the first try, 70 on the second, 50 after that
function scored(tries, n) {
  G.earned += tries === 1 ? 100 : tries === 2 ? 70 : 50;
  G.max += 100;
  if (tries === 1) { G.rightRow++; G.wrongRow = 0; }
  if (n) {
    me.words[n] = (me.words[n] || 0) + 1;
    if (byN[n].kind === 'animal' && !me.animals.includes(n)) me.animals.push(n);
  }
  // three right in a row: one level up for the next round, at most one above the age's level
  if (G.rightRow >= 3) { G.L = Math.min(G.L + 1, ageLevel() + 1, 3); G.rightRow = 0; }
  badges();
}
// a wrong try: shake, and after a few (or two in a row) the answer glows; three in a row: one level down
function missed(el, glow) {
  G.perfect = false;
  G.roundWrongs++;
  G.wrongRow++;
  G.rightRow = 0;
  if (el) { el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); }
  sfx('wrong');
  if (glow && (G.roundWrongs >= GAME_LEVELS[G.L].hintAfter || G.wrongRow >= 2)) { glow(); G.hinted = true; setTimeout(() => sfx('hint'), 350); }
  if (G.wrongRow >= 3) { G.L = Math.max(0, G.L - 1); G.wrongRow = 0; }
}
const cheer = el => burst(...at(el), 30);
function roundDone(delay = 1300) {
  if (!G.hinted) G.bonus += 20; // a round without the glowing help
  G.round++;
  G.lock = true;
  after(() => G.round >= G.rounds ? finish() : round(), delay);
}

function finish() {
  const { si } = G, allBefore = me.best.every(Boolean), pct = G.max ? G.earned / G.max : 1, stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1, points = G.earned + G.bonus;
  me.best[si] = Math.max(me.best[si], stars);
  me.points += points;
  me.level[si] = G.L;
  award('first');
  if (GAME_STATIONS[si].id === 'memory' && G.perfect) award('memory');
  if (me.best.every(Boolean)) award('champion');
  save();
  const next = (si + 1) % GAME_STATIONS.length, little = me.age === 0;
  leave();
  go(`<section class="g-panel g-center">
      ${starRow(stars)}
      <h2>${stars === 3 ? 'رائع!' : 'أحسنت!'}</h2>
      ${little ? '' : `<p class="g-points">${ar(points)} نقطة</p>`}
      <div class="g-end"><button class="btn" data-act="station" data-i="${next}">${icon(GAME_STATIONS[next].id)}${GAME_STATIONS[next].name}</button>
        <button class="btn alt" data-act="map">الخريطة</button></div>
    </section>`);
  app.querySelectorAll('.g-stars i.on').forEach((s, k) => { s.style.animationDelay = k * 180 + 'ms'; setTimeout(() => sfx('star'), 900 + k * 180); });
  rain(stars === 3 ? 120 : 60);
  sfx('victory');
  if (!allBefore && me.best.every(Boolean)) setTimeout(() => sfx('celebrate'), 1500); // the last of the five games
  // a three-year-old goes on by itself to the next game
  if (little) auto = setTimeout(() => start(next), 6000);
}

// ---------- badges ----------
function badges() {
  if (me.animals.length >= 5) award('animals');
  if (me.letters >= 5) award('letters');
  if (me.placed >= 10) award('puzzle');
  if (me.found >= 5) award('explorer');
}
function award(id) {
  if (me.badges[id]) return;
  me.badges[id] = Date.now();
  save();
  const b = GAME_BADGES.find(x => x.id === id);
  const pop = document.createElement('div');
  pop.className = 'g-award';
  pop.setAttribute('role', 'status');
  pop.innerHTML = `<span class="g-badge on">${icon(id)}</span><b>${b.name}</b>`;
  document.body.append(pop);
  setTimeout(() => { burst(...at(pop.firstChild), 40); sfx('badge'); }, 300);
  setTimeout(() => pop.remove(), 3600);
}

function treasure() {
  leave();
  go(`<div class="g-top">${topBtn('map', 'map', 'الخريطة')}<h2 class="g-title">كنزي</h2></div>
    <section class="g-panel">
      <div class="g-badges">${GAME_BADGES.map(b => `<div class="g-badge-card">
        <span class="g-badge ${me.badges[b.id] ? 'on' : ''}">${icon(me.badges[b.id] ? b.id : 'lock')}</span><b>${b.name}</b><small>${b.about}</small></div>`).join('')}</div></section>`);
}

function profile() {
  leave();
  const words = Object.entries(me.words).filter(([n]) => byN[n]).sort((a, b) => b[1] - a[1]);
  go(`<div class="g-top">${topBtn('map', 'map', 'الخريطة')}<h2 class="g-title">${esc(me.name)}</h2></div>
    <section class="g-panel">
      <div class="g-who"><img src="${byN[me.avatar]?.pic || WORDS[0].pic}" alt=""><div><b>${esc(me.name)}</b><span>${GAME_AGES[me.age].label}</span>
        <span>${starRow(1, 1)} ${ar(me.best.reduce((a, b) => a + b, 0))} · الأوسمة ${ar(Object.keys(me.badges).length)} من ${ar(GAME_BADGES.length)}${me.age ? ` · ${ar(me.points)} نقطة` : ''}</span></div></div>
      <label for="kidName">الاسم</label><input id="kidName" maxlength="20" value="${esc(me.name)}">
      <h3>الألعاب</h3>
      <ul class="g-games">${GAME_STATIONS.map((s, i) => `<li>${icon(s.id)}<b>${s.name}</b>${starRow(me.best[i])}<small>${GAME_LEVELS[me.level[i]].name} · لُعبت ${ar(me.plays[i])} مرّة</small></li>`).join('')}</ul>
      <h3>الكلمات التي تدرّب عليها (${ar(words.length)})</h3>
      ${words.length ? `<div class="g-words">${words.map(([n, c]) => `<span class="g-word-mini"><img src="${byN[n].card}" alt="${byN[n].word}"><i>${ar(c)}</i></span>`).join('')}</div>` : '<p class="g-hint">لا شيء بعد.</p>'}
      <div class="g-end"><button class="btn alt" data-act="kids">تغيير الطفل</button></div>
    </section>`);
  // the name can be changed here at any time (saved as it is typed; an empty field keeps the old name)
  app.querySelector('#kidName').oninput = e => {
    const v = e.target.value.trim();
    if (!v) return;
    me.name = v; save();
    app.querySelectorAll('.g-title, .g-who b').forEach(el => el.textContent = v);
  };
}

// ---------- age: the one thing a grown-up changes ----------
function ages() {
  leave();
  go(`<div class="g-top">${topBtn('map', 'map', 'الخريطة')}<h2 class="g-title">كم عمره؟</h2></div>
    <section class="g-panel"><div class="g-ages">${GAME_AGES.map((a, i) => `<button class="g-age ${me.age === i ? 'on' : ''}" data-act="setAge" data-i="${i}" aria-pressed="${me.age === i}"><img src="${byN[a.pic]?.cut || ''}" alt=""><b>${a.label}</b></button>`).join('')}</div></section>`);
}

// ---------- 1. the word and its picture ----------
function wordRound() {
  const [target] = fresh(live());
  const opts = shuffle([target, ...others(target, GAME_LEVELS[G.L].options - 1)]);
  return [opts, () => {
    frame('هذه كلمة: المس صورتها.', `<img class="g-word" src="${target.card}" alt="${target.word}" draggable="false"><div class="g-opts">${opts.map(optBtn).join('')}</div>`);
    pickOne(target);
  }];
}
// answer by tapping one picture (games 1 and 4)
function pickOne(target, onRight = () => {}) {
  let tries = 1;
  app.querySelectorAll('.g-opt').forEach(b => b.onclick = () => {
    if (G.lock) return;
    sfx('bubble');
    if (b.dataset.n !== target.n) {
      tries++;
      return missed(b, () => app.querySelector(`.g-opt[data-n="${target.n}"]`).classList.add('hint'));
    }
    G.lock = true;
    b.classList.add('right');
    sfx('correct');
    cheer(b);
    onRight();
    scored(tries, target.n);
    roundDone();
  });
}

// ---------- 2. where is my pair? ----------
// a card turns over: it narrows to its edge, changes face and opens again (just the face change under reduced motion).
// b.up is its side at once, so a second tap mid-turn finds it already turning.
function turn(b, down) {
  b.up = !down;
  if (calm.matches) return b.classList.toggle('back', down);
  b.animate([{ transform: 'none' }, { transform: 'perspective(500px) rotateY(90deg)' }], { duration: 120, easing: 'ease-in' }).onfinish = () => {
    b.classList.toggle('back', down);
    b.animate([{ transform: 'perspective(500px) rotateY(-90deg)' }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
  };
}
function memoryRound() {
  const ws = fresh(live(), GAME_LEVELS[G.L].pairs), shadow = G.L >= 2; // from level 2: a picture and its shadow
  return [ws, () => {
    const cards = shuffle(ws.flatMap(w => [[w, false], [w, shadow]]));
    // the cards start face up: the child looks for the level's view seconds, then they turn over one by one
    frame('انظر جيّدًا إلى الصور وتذكّر أماكنها…',
      `<div class="g-peek" role="progressbar" aria-label="وقت النظر"><i></i></div><div class="g-opts g-mem">${cards.map(([w, sh]) => `<button class="g-opt" data-n="${w.n}" aria-label="بطاقة"><img src="${sh ? w.cut : w.pic}" class="${sh ? 'g-sil' : ''}" alt="" draggable="false"></button>`).join('')}</div>`);
    const all = [...app.querySelectorAll('.g-opt')];
    G.lock = true;
    const peek = app.querySelector('.g-peek'), view = GAME_LEVELS[G.L].view * 1000;
    peek.firstChild.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: view, fill: 'forwards' }); // the looking time runs out
    after(() => {
      peek.classList.add('done');
      all.forEach((b, i) => after(() => { turn(b, true); if (!(i % 2)) sfx('flip'); }, i * 70));
      after(() => {
        app.querySelector('.g-hint').textContent = shadow ? 'اقلب بطاقتين: الصورة وظلّها.' : 'اقلب بطاقتين وابحث عن الصورتين المتشابهتين.';
        G.lock = false;
      }, all.length * 70 + 260);
    }, view);
    let open = [], misses = 0, found = 0;
    all.forEach(b => b.onclick = () => {
      if (G.lock || b.up) return;
      turn(b, false);
      sfx('flip');
      open.push(b);
      if (open.length < 2) return;
      const [x, y] = open;
      open = [];
      if (x.dataset.n === y.dataset.n) {
        x.classList.add('pair'); y.classList.add('pair');
        sfx('match');
        scored(misses <= 1 ? 1 : misses <= 3 ? 2 : 3, x.dataset.n); // turning over wrong cards is how memory is played
        misses = 0;
        if (++found === ws.length) { cheer(y); setTimeout(() => sfx('correct'), 350); roundDone(1600); }
        return;
      }
      misses++;
      G.perfect = false;
      G.lock = true;
      after(() => {
        turn(x, true); turn(y, true); G.lock = false;
        sfx('flip');
        // after three misses in a row, a pair that is still hidden glows for a moment
        if (misses >= 3) {
          const n = all.find(c => !c.up)?.dataset.n;
          const two = all.filter(c => !c.up && c.dataset.n === n);
          two.forEach(c => c.classList.add('hint'));
          after(() => two.forEach(c => c.classList.remove('hint')), 1500);
          G.hinted = true;
          sfx('hint');
        }
      }, 900);
    });
  }];
}

// ---------- drag a picture onto its place (games 3 and 5), or tap it and then tap the place ----------
function dragKit(drop) {
  let picked = null;
  const open = () => [...app.querySelectorAll('.g-slot.open')];
  const select = p => { if (p) sfx('bubble'); picked = picked === p ? null : p; app.querySelectorAll('.g-piece').forEach(x => x.classList.toggle('picked', x === picked)); };
  // the nearest open place within 30px of the finger: big targets for small hands
  const hit = (x, y) => {
    let best = null, bd = Infinity;
    for (const s of open()) {
      const r = s.getBoundingClientRect(), m = 30;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - r.left - r.width / 2, y - r.top - r.height / 2);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };
  app.querySelectorAll('.g-piece').forEach(p => p.onpointerdown = e => {
    if (G.lock || e.button > 0) return;
    e.preventDefault();
    const r = p.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    let ghost = null;
    p.setPointerCapture(e.pointerId);
    p.onpointermove = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!ghost) {
        if (Math.hypot(dx, dy) < 8) return;
        ghost = p.cloneNode(true);
        ghost.className = 'g-piece g-ghost';
        Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
        document.body.append(ghost);
        p.classList.add('lifted');
        select(null);
        sfx('pickup');
      }
      sfx('move'); // rate-limited inside: a soft breath while the picture travels
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
      const s = hit(ev.clientX, ev.clientY);
      open().forEach(x => x.classList.toggle('over', x === s));
    };
    p.onpointerup = p.onpointercancel = ev => {
      p.onpointermove = p.onpointerup = p.onpointercancel = null;
      open().forEach(x => x.classList.remove('over'));
      if (!ghost) return select(p); // a tap: picked, now tap the place
      const s = ev.type === 'pointerup' && hit(ev.clientX, ev.clientY);
      if (s && drop(p, s)) return ghost.remove();
      // not there: it glides back home
      ghost.animate([{ transform: ghost.style.transform }, { transform: 'none' }], { duration: still.matches ? 1 : 380, easing: 'cubic-bezier(.2,.8,.2,1)' })
        .onfinish = () => { ghost.remove(); p.classList.remove('lifted'); };
    };
  });
  app.querySelectorAll('.g-slot').forEach(s => s.onclick = () => {
    if (!picked || G.lock || !s.classList.contains('open')) return;
    const p = picked;
    select(null);
    drop(p, s);
  });
}
// a piece dropped on a place: right puts it there, wrong shakes it and (after a few) lights its place
function placer(onPlaced) {
  const tries = {};
  return (p, s) => {
    const n = p.dataset.n;
    if (s.dataset.n !== n) {
      tries[n] = (tries[n] || 1) + 1;
      p.classList.remove('lifted');
      missed(p, () => (app.querySelector(`.g-slot.open[data-n="${n}"]`) || app.querySelector('.g-slot.open'))?.classList.add('hint'));
      return false;
    }
    s.classList.remove('open', 'hint', 'over');
    s.classList.add('done');
    sfx('snap');
    if (s.dataset.img) sfx('appear'); // the vanished picture is back
    s.innerHTML = `<img src="${byN[n][s.dataset.img || 'cut']}" alt="">`;
    p.remove();
    cheer(s);
    scored(tries[n] || 1, n);
    onPlaced(s);
    return true;
  };
}

// ---------- 3. put it in its place (shadows) ----------
function shadowRound() {
  const k = GAME_LEVELS[G.L].drag, [first] = fresh(live());
  const ws = [first, ...others(first, k - 1)]; // from level 2 the shadows are of the same kind, so they look alike
  return [ws, () => {
    frame('اسحب كلّ صورة إلى ظلّها.',
      `<div class="g-slots">${shuffle(ws).map(w => `<div class="g-slot open" data-n="${w.n}"><img class="g-sil" src="${w.cut}" alt=""></div>`).join('')}</div>
       <div class="g-tray">${shuffle(ws).map(w => `<button class="g-piece" data-n="${w.n}" aria-label="صورة"><img src="${w.cut}" alt="" draggable="false"></button>`).join('')}</div>`);
    let left = ws.length;
    dragKit(placer(() => { me.placed++; badges(); if (!--left) roundDone(1600); }));
  }];
}

// ---------- 4. which picture starts with this letter? ----------
function letterRound() {
  const [target] = fresh(live());
  const opts = shuffle([target, ...others(target, GAME_LEVELS[G.L].options - 1)]);
  return [opts, () => {
    frame('أيّ صورة تبدأ كلمتها بهذا الحرف؟', `<div class="g-letter" role="img" aria-label="الحرف ${glyph(target)}">${glyph(target)}</div><div class="g-opts">${opts.map(optBtn).join('')}</div>`);
    // the answer brings its word card in the letter's place: the same letter, now in red at the start of the word
    pickOne(target, () => { me.letters++; app.querySelector('.g-letter').outerHTML = `<img class="g-word" src="${target.card}" alt="${target.word}">`; });
  }];
}

// ---------- 5. who vanished? ----------
function missingRound() {
  const lv = GAME_LEVELS[G.L], shown = fresh(live(), lv.items), gone = shuffle(shown).slice(0, lv.missing);
  const extra = Math.max(lv.options, gone.length + 1) - gone.length;
  const opts = shuffle([...gone, ...others(gone[0], extra, shown.map(w => w.n))]);
  return [[...shown, ...opts], () => {
    frame('انظر جيّدًا… ثمّ أعِد الصورة التي اختفت إلى مكانها.',
      `<div class="g-timer"><i style="animation-duration:${lv.view}s"></i></div>
       <div class="g-slots g-shown">${shown.map(w => `<div class="g-slot pic" data-n="${w.n}" data-img="pic"><img src="${w.pic}" alt=""></div>`).join('')}</div>`);
    after(() => {
      app.querySelector('.g-timer').remove();
      sfx('disappear');
      gone.forEach(w => {
        const s = app.querySelector(`.g-slot[data-n="${w.n}"]`);
        const img = s.firstChild;
        img.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.3) rotate(25deg)', opacity: 0 }], { duration: still.matches ? 1 : 450, easing: 'ease-in', fill: 'forwards' })
          .onfinish = () => { img.remove(); s.classList.add('open'); };
      });
      app.querySelector('.g-panel').insertAdjacentHTML('beforeend',
        `<div class="g-tray">${opts.map(w => `<button class="g-piece pic" data-n="${w.n}" aria-label="صورة"><img src="${w.pic}" alt="" draggable="false"></button>`).join('')}</div>`);
      let left = gone.length;
      // the open places only exist after the vanishing animation; until then a drop finds no place and glides back
      dragKit(placer(() => { me.found++; badges(); if (!--left) roundDone(1800); }));
    }, lv.view * 1000);
  }];
}

// ---------- taps ----------
const act = {
  pick: b => { use(b.dataset.id); map(); },
  create: () => { draft = null; create(); },
  // the form is not redrawn on a choice (that would replay the pictures' entrance): only the marks move
  avatar: b => { draft.avatar = b.dataset.n; mark(b, 'right'); },
  age: b => { draft.age = +b.dataset.i; mark(b, 'on'); app.querySelector('[data-act="made"]').disabled = false; },
  made: () => { if (draft.age === null) return; newProfile((draft.name ?? USER_NAME).trim() || 'بطلنا', draft.avatar, draft.age); draft = null; map(); },
  map, treasure, profile, ages, kids: profiles,
  station: b => start(+b.dataset.i),
  // a new age starts every game at that age's level (stars and badges stay)
  setAge: b => { if (me.age !== +b.dataset.i) { me.age = +b.dataset.i; me.level = Array(5).fill(ageLevel()); save(); } map(); },
  morePlay: () => { rested = true; map(); },
};
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && !b.disabled) { sfx('pop'); act[b.dataset.act]?.(b); }
});

function mark(b, cls) {
  b.parentNode.querySelectorAll('button').forEach(x => { x.classList.toggle(cls, x === b); x.setAttribute('aria-pressed', x === b); });
}
function homeLink() { return `<a class="g-round" href="./?letters" aria-label="العودة إلى الحروف">${icon('home')}</a>`; }

if (WORDS.length < 12) go('<section class="g-panel"><p class="g-hint">لا توجد بطاقات كافية بعد.</p></section>');
else {
  const first = [...Object.values(store.profiles).map(p => byN[p.avatar]?.pic), ...GAME_AGES.map(a => byN[a.pic]?.cut), ...AVATARS.map(n => byN[n].pic)];
  first.forEach(u => u && pic(u));
  addEventListener('load', () => WORDS.forEach(w => [w.card, w.pic, w.cut].forEach(u => pic(u)))); // the rest after the page has loaded, so the tab doesn't spin
  syncSound(); me ? map() : profiles();
}
