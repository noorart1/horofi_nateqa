// The choice page after login (index.php): a living banner, two jelly cards (the letters or the games), the grown-ups' gear
// and a meadow with little animals. Everything that moves for long is drawn by formulas in requestAnimationFrame loops that
// stop while off screen or the tab is hidden; the cards' short entrance uses the Web Animations API. Sounds come from sfx.js
// (the player page's speaker toggle mutes them) and only follow a touch, except the jelly landing (unheard if the browser
// keeps sound locked). Under prefers-reduced-motion: the banner stays still, the cards fade in, the meadow is one picture,
// and a touch only makes its sound. LIVE (set inline by index.php) holds the banner layers, or null to keep it still.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEAN = !!navigator.connection?.saveData || /2g$/.test(navigator.connection?.effectiveType || '') || (navigator.deviceMemory || 8) < 4;
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10); // smootherstep: no jump in speed either
{ let on = true; try { on = localStorage.getItem('sfx') !== '0'; } catch {} AudioManager.set({ muted: !on, volume: 0.55 }); }

// ---------- the banner ----------
// Positions are in the banner picture's own pixels (992 × 372, from img/banner/layers.json), placed as percentages.
const BW = 992, BH = 372, hero = $('hero'), bubble = $('bubble'), A = LIVE?.at;
const put = (el, x, y, w, h) => Object.assign(el.style, { left: x / BW * 100 + '%', top: y / BH * 100 + '%', width: w / BW * 100 + '%', ...(h ? { height: h / BH * 100 + '%' } : {}) });
const pct = (v, from, len) => ((v - from) / len * 100).toFixed(1) + '%';
const make = (tag, cls, src) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, src ? { src, alt: '', decoding: 'async' } : {});
let live = false, onScreen = true, heroRaf = 0;
let arm, hand, noteEl, clefEl, markerEl, ink, ix, flies, LIDS = [], TWK = [];
// the marker turns around a point below the banner (like a hand holding it) and slides back a hair, so its cut-off end never shows
const TIP = A?.tip, AX = A?.axis, PIV = A && [TIP[0] + AX[0] * 300, TIP[1] + AX[1] * 300];

if (A) { // the marker is tappable even while the banner is still
  const pen = make('button', 'pen'), [mx, my, mw] = A.marker;
  pen.setAttribute('aria-label', 'اكتب بالقلم');
  put(pen, mx - 8, my - 9, mw - 15, BH - my + 9);
  $('boy').after(pen);
  pen.addEventListener('click', () => {
    if (live && !writing) { write(performance.now() / 1000); heroGo(); }
    AudioManager.play('scratch');
  });
}
if (LIVE && hero && !still) { // fetch and decode every layer first; until then (or if one fails) the still banner stays
  const base = make('img', 'banner', LIVE.base);
  const pics = { hand: make('img', '', LIVE.hand), forearm: make('img', '', LIVE.forearm), note: make('img', 'lay', LIVE.note), clef: make('img', 'lay', LIVE.clef), marker: make('img', 'lay', LIVE.marker) };
  Promise.all([base, ...Object.values(pics)].map(i => i.decode())).then(() => {
    Object.assign(base, { alt: 'حروفي الناطقة', width: 1200, height: 450 });
    ({ note: noteEl, clef: clefEl, marker: markerEl, hand } = pics);
    put(noteEl, ...A.note); put(clefEl, ...A.clef); put(markerEl, ...A.marker);
    noteEl.style.transformOrigin = '30% 85%'; clefEl.style.transformOrigin = '50% 90%';
    markerEl.style.transformOrigin = `${pct(PIV[0], A.marker[0], A.marker[2])} ${pct(PIV[1], A.marker[1], A.marker[3])}`;
    ink = make('canvas', 'ink'); ix = ink.getContext('2d');
    // eyelids: skin-coloured covers over each eye that drop for a blink, with a dark lash line at their edge
    const lids = [A.eyeL, A.eyeR].map(([cx, cy, d, skin]) => {
      const el = make('div', 'lid'), lid = make('i');
      put(el, cx - d / 2 - 1, cy - d / 2 - 1, d + 2, d + 2);
      lid.style.background = `linear-gradient(${skin}, color-mix(in srgb, ${skin} 85%, #7a4a30))`;
      el.append(lid); LIDS.push(lid); return el;
    });
    flies = make('div');
    // sparkles by the music (fixed spots of this banner)
    TWK = [[452, 30], [618, 70], [512, 196], [706, 214], [420, 150]].map(([x, y], k) => {
      const el = make('i', 'twk');
      el.innerHTML = '<svg viewBox="0 0 20 20"><path d="M10 0C11 7 13 9 20 10 13 11 11 13 10 20 9 13 7 11 0 10 7 9 9 7 10 0z" fill="#fff"/></svg>';
      put(el, x, y, 26); return { el, ph: k * 1.37, sp: 0.6 + (k % 3) * 0.25 };
    });
    // the raised arm: forearm and hand are cut to the same box; the hand turns at the wrist, the whole arm at the elbow
    const [ax, ay, aw, ah] = A.arm;
    arm = make('div', 'arm'); put(arm, ax, ay, aw, ah);
    arm.style.transformOrigin = `${pct(A.elbow[0], ax, aw)} ${pct(A.elbow[1], ay, ah)}`;
    hand.style.transformOrigin = `${pct(A.wrist[0], ax, aw)} ${pct(A.wrist[1], ay, ah)}`;
    arm.append(pics.forearm, hand);
    $('banner').replaceWith(base); base.id = 'banner';
    base.after(noteEl, clefEl, ink, markerEl, ...lids, flies, ...TWK.map(s => s.el), arm);
    live = true; heroGo();
  }, () => {});
}

// The boy waves by one smooth formula drawn every frame (no keyframes, so no corners in the motion):
// - always: a slow, tiny breathing sway of the forearm and the hand;
// - in a wave: the hand swings at the wrist and the forearm a little at the elbow, a moment later and the other way. Each wave
//   fades in and out with a soft envelope (zero speed at both ends); how many swings, how wide and how fast change a little
//   every time, and the next comes 3 to 5 s later.
let W8V = null, nextWave = Infinity;
function wave(swings = Math.round(rnd(2, 4))) {
  const hz = rnd(2.1, 2.6);
  W8V = { t0: performance.now() / 1000, hz, amp: rnd(0.85, 1.15), dur: swings / hz + 0.35 };
  nextWave = W8V.t0 + W8V.dur + rnd(3, 5);
}
function armPose(t) {
  let h = 1.6 * Math.sin(2 * Math.PI * t / 2.9 + 1), f = -1.1 * Math.sin(2 * Math.PI * t / 3.6); // breathing
  if (W8V) {
    const s = t - W8V.t0, u = s / W8V.dur;
    if (u >= 1) W8V = null;
    else {
      const env = ease(u / 0.18) * (1 - ease((u - 0.62) / 0.38)), w = 2 * Math.PI * W8V.hz, a = W8V.amp * env;
      h += a * (-14 * Math.sin(w * s) + 5);        // swing, with the hand cocked back a little while waving
      f += a * (5 * Math.sin(w * (s - 0.07)) - 3); // the forearm follows, the other way, and lifts a bit
    }
  }
  return [h, f];
}
// the red marker writes a little wavy line on the white card now and then; the ink stays a moment and fades
let writeAt = 3.5, writing = null; const STROKES = [];
function write(t) { writing = { t0: t, pts: [] }; STROKES.push(writing); writeAt = t + 2 + rnd(5, 8); }
function markerPose(t) { // [angle in degrees (negative turns the tip left, onto the card), slide back in px]
  let ang = 0.5 * Math.sin(t * 1.3), back = 0;
  if (writing) {
    const s = t - writing.t0;
    if (s < 0.3) { ang += -1.5 * ease(s / 0.3); back = 3 * ease(s / 0.3); }                       // lift a little, to the start
    else if (s < 1.5) { const u = ease((s - 0.3) / 1.2); ang += -1.5 - 6.5 * u; back = 1.5 + 1.8 * Math.cos(u * Math.PI * 7); } // write: across, waving
    else if (s < 1.9) { const e = 1 - ease((s - 1.5) / 0.4); ang += -8 * e; back = 3 * e; }        // back to rest
    else { writing.done = t; writing = null; }
  }
  return [ang, back];
}
function tipAt(ang, back) { // where the tip is, in banner pixels, for that pose
  const a = ang * Math.PI / 180, vx = TIP[0] - PIV[0], vy = TIP[1] - PIV[1];
  return [PIV[0] + vx * Math.cos(a) - vy * Math.sin(a) + AX[0] * back, PIV[1] + vx * Math.sin(a) + vy * Math.cos(a) + AX[1] * back];
}
function drawInk(t) {
  const w = hero.clientWidth, h = hero.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (ink.width !== Math.round(w * dpr)) { ink.width = Math.round(w * dpr); ink.height = Math.round(h * dpr); }
  ix.setTransform(ink.width / BW, 0, 0, ink.height / BH, 0, 0); ix.clearRect(0, 0, BW, BH);
  ix.lineCap = ix.lineJoin = 'round'; ix.lineWidth = 3.2; ix.strokeStyle = '#d8232a';
  for (let i = STROKES.length - 1; i >= 0; i--) {
    const st = STROKES[i], a = st.done ? 1 - ease((t - st.done - 1.2) / 1) : 1;
    if (a <= 0) { STROKES.splice(i, 1); continue; }
    if (st.pts.length < 2) continue;
    ix.globalAlpha = a; ix.beginPath(); st.pts.forEach(([px, py], k) => k ? ix.lineTo(px, py) : ix.moveTo(px, py)); ix.stroke();
  }
  ix.globalAlpha = 1;
}
// blinks: fast down, a beat closed, a bit slower up; every 2.5 to 5.5 s, sometimes twice
let blinkAt = 2.5, blinkTwice = false;
const lidCurve = s => s < 0 ? 0 : s < 0.07 ? s / 0.07 : s < 0.1 ? 1 : s < 0.2 ? 1 - (s - 0.1) / 0.1 : 0;
// coloured notes float up from the headphones (the party palette of DESIGN.md)
const FLY = [], NOTE_COL = ['#6ed2f2', '#9560a6', '#7cc242', '#ffffff', '#e9a400'];
const NOTE_SVG = ['<svg viewBox="0 0 24 30"><path d="M9 3v17.5a5 4 0 1 0 3 3.5V9l8 3V6z" fill="C"/></svg>',
  '<svg viewBox="0 0 30 30"><path d="M9 5l17-4v19.5a5 4 0 1 1-3-3.6V7.5L12 10v13.5a5 4 0 1 1-3-3.6z" fill="C"/></svg>'];
let nextFly = 1.2;
function spawnNote(t, burst) {
  const el = make('i', 'fly'), fromCup = burst || Math.random() < 0.75;
  el.innerHTML = NOTE_SVG[Math.random() < 0.6 ? 0 : 1].replace('C', NOTE_COL[Math.floor(Math.random() * NOTE_COL.length)]);
  el.style.opacity = 0; flies.append(el);
  FLY.push({ el, t0: t, life: rnd(2.4, 3.2), x0: fromCup ? rnd(930, 960) : rnd(820, 880), y0: fromCup ? rnd(200, 225) : rnd(25, 45),
    dx: rnd(-150, -60), dy: rnd(-230, -170), sway: rnd(8, 16), sp: rnd(2.2, 3.2), rot: rnd(-18, 18), size: rnd(0.75, 1.15) });
}
function heroFrame(now) {
  heroRaf = 0;
  if (!onScreen || document.hidden) return;
  const t = now / 1000;
  if (!W8V && t >= nextWave) wave();
  const [h, f] = armPose(t);
  hand.style.rotate = h.toFixed(2) + 'deg'; arm.style.rotate = f.toFixed(2) + 'deg';
  // the printed notes sway and bounce a little to a slow beat (about 100 a minute)
  const beat = t * 1.67 * Math.PI;
  noteEl.style.transform = `translateY(${(-3 * Math.abs(Math.sin(beat))).toFixed(2)}%) rotate(${(5 * Math.sin(beat / 2)).toFixed(2)}deg)`;
  clefEl.style.transform = `translateY(${(-3 * Math.abs(Math.sin(beat + 1.2))).toFixed(2)}%) rotate(${(-6 * Math.sin(beat / 2 + 0.8)).toFixed(2)}deg)`;
  if (t > blinkAt + 0.25) { blinkTwice = !blinkTwice && Math.random() < 0.25; blinkAt = t + (blinkTwice ? 0.32 : rnd(2.5, 5.5)); }
  const lid = lidCurve(t - blinkAt).toFixed(3);
  LIDS.forEach(l => l.style.transform = `scaleY(${lid})`);
  if (!writing && t >= writeAt) write(t);
  const [mang, mback] = markerPose(t), k = hero.clientWidth / BW;
  markerEl.style.transform = `translate(${(AX[0] * mback * k).toFixed(2)}px, ${(AX[1] * mback * k).toFixed(2)}px) rotate(${mang.toFixed(2)}deg)`;
  if (writing && t - writing.t0 >= 0.3 && t - writing.t0 < 1.5) writing.pts.push(tipAt(mang, mback));
  drawInk(t);
  TWK.forEach(s => { const v = Math.max(0, Math.sin(t * s.sp * 2 + s.ph)) ** 3; s.el.style.transform = `scale(${v.toFixed(3)}) rotate(${((t * 40 + s.ph * 50) % 360).toFixed(1)}deg)`; s.el.style.opacity = v.toFixed(3); });
  if (t >= nextFly) { spawnNote(t); nextFly = t + rnd(0.9, 1.6); }
  for (let i = FLY.length - 1; i >= 0; i--) {
    const n = FLY[i], u = (t - n.t0) / n.life;
    if (u >= 1) { n.el.remove(); FLY.splice(i, 1); continue; }
    const x = n.x0 + n.dx * u + n.sway * Math.sin(u * n.sp * Math.PI * 2), y = n.y0 + n.dy * (1 - (1 - u) ** 1.6);
    const sc = n.size * Math.min(1, u / 0.15) * (0.7 + 0.3 * u), op = Math.min(1, u / 0.1) * (1 - ease((u - 0.65) / 0.35));
    n.el.style.transform = `translate(${(x * k).toFixed(1)}px, ${(y / BH * hero.clientHeight).toFixed(1)}px) rotate(${(n.rot * Math.sin(u * 5)).toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    n.el.style.opacity = op.toFixed(3);
  }
  heroRaf = requestAnimationFrame(heroFrame);
}
function heroGo() { if (live && !heroRaf && onScreen && !document.hidden) heroRaf = requestAnimationFrame(heroFrame); }
if (hero) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; heroGo(); }).observe(hero);
document.addEventListener('visibilitychange', heroGo);
// tap the boy: three swings, a hello bubble, three notes and a short hello
$('boy')?.addEventListener('click', () => {
  AudioManager.play('hello');
  if (still) return;
  if (live) { wave(3); heroGo(); for (let k = 0; k < 3; k++) setTimeout(() => spawnNote(performance.now() / 1000, true), k * 160); }
  bubble.getAnimations().forEach(a => a.cancel());
  bubble.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.08)', offset: .12 }, { opacity: 1, transform: 'scale(1)', offset: .2 },
    { opacity: 1, transform: 'scale(1)', offset: .85 }, { opacity: 0, transform: 'scale(.8)' }], { duration: 1800, easing: 'ease-out' });
});

// ---------- the cards: they drop in like jelly once a visit (sessionStorage), then each hops three times with a sun ring ----------
const row = $('choose'), cards = [...row.querySelectorAll('a')], timers = [];
const FALL = 560, JELLY = 1000, LAG = 200;
const spring = (n, amp, k, w) => Array.from({ length: n }, (_, j) => { const t = j / (n - 1); return 1 + amp * Math.exp(-k * t) * Math.cos(w * t); });
let first = false;
try { first = !sessionStorage.getItem('choice-in'); sessionStorage.setItem('choice-in', '1'); } catch {}
function drop() {
  AudioManager.live(); // asks for sound now, so it may be allowed by the time the cards land
  row.classList.remove('wait');
  cards.forEach((el, i) => {
    const r = el.getBoundingClientRect(), high = r.bottom + 40, delay = i * LAG;
    el.style.transformOrigin = '50% 100%';
    el.animate([
      { transform: `translateY(${-high}px) scale(.94,1.06)`, easing: 'cubic-bezier(.55,0,1,.45)' },
      { transform: 'translateY(-30px) scale(.86,1.16)', offset: .9, easing: 'linear' },
      { transform: 'translateY(0) scale(.88,1.12)' },
    ], { duration: FALL, delay, fill: 'backwards' }).onfinish = () => land(el, i, i ? 1 : -1);
    const sh = make('i', 'ground');
    sh.style.cssText = `left:${el.offsetLeft + el.offsetWidth * 0.1}px; top:${el.offsetTop + el.offsetHeight - 2}px; width:${el.offsetWidth * 0.8}px`;
    row.append(sh); el.shadow = sh;
    sh.animate([{ transform: 'scale(.25)', opacity: 0 }, { transform: 'scale(.6)', opacity: .4, offset: .6 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: FALL, delay, fill: 'backwards', easing: 'cubic-bezier(.55,0,1,.45)' });
  });
}
function land(el, i, side) { // squash, a splash of the card's own colour, a jelly wobble, then stand still
  if (AudioManager.live()) AudioManager.play('land');
  splat(el);
  row.animate([{ transform: 'none' }, { transform: 'translate(0,3px)' }, { transform: 'translate(0,-2px)' }, { transform: 'none' }], { duration: 240 });
  const ys = spring(32, -0.3, 4.2, 5.2 * Math.PI), sway = ys.map((_, j) => { const t = j / 31; return side * 6 * Math.exp(-4 * t) * Math.sin(4.2 * Math.PI * t); });
  el.animate(ys.map((sy, j) => ({ transform: `skewX(${sway[j].toFixed(2)}deg) scale(${(1 / Math.sqrt(sy)).toFixed(3)}, ${sy.toFixed(3)})` })), { duration: JELLY })
    .onfinish = () => { el.style.transformOrigin = ''; el.shadow?.remove(); hops(el, i, 700 + i * 1400); };
  el.shadow.animate(ys.map(sy => ({ transform: `scaleX(${(1 / Math.sqrt(sy)).toFixed(3)})` })), { duration: JELLY });
}
function splat(el) {
  const r = el.getBoundingClientRect(), col = getComputedStyle(el).getPropertyValue('--goo').trim();
  for (let k = 0; k < 9; k++) {
    const g = make('i', 'goo'), s = 8 + (k % 3) * 5, dir = k < 5 ? -1 : 1, dx = dir * (14 + (k % 4) * 12), up = 10 + (k % 3) * 12;
    Object.assign(g.style, { width: s + 'px', height: s + 'px', left: r.left + r.width * (k < 5 ? 0.12 : 0.88) - s / 2 + 'px', top: r.bottom - s / 2 - 2 + 'px', background: col, opacity: .85 });
    document.body.append(g);
    g.animate([
      { transform: 'translate(0,0) scale(.4)' },
      { transform: `translate(${dx * 0.6}px,${-up}px) scale(1, 1.2)`, offset: .35 },
      { transform: `translate(${dx}px,2px) scale(1.5,.45)`, offset: .7, opacity: .8 },
      { transform: `translate(${dx}px,2px) scale(1.7,.35)`, opacity: 0 },
    ], { duration: 900, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => g.remove();
  }
}
function hops(el, i, wait, n = 3) { // "tap me": a jelly hop with a sun ring, the two cards taking turns, then quiet for good
  if (!n) return;
  timers.push(setTimeout(() => {
    el.style.transformOrigin = '50% 100%';
    el.animate([
      { transform: 'none' }, { transform: 'scale(1.06,.9)', offset: .14 }, { transform: 'translateY(-16px) scale(.95,1.06)', offset: .32 },
      { transform: 'translateY(0) scale(1.08,.9)', offset: .5 }, { transform: 'scale(.97,1.03)', offset: .64 }, { transform: 'scale(1.02,.98)', offset: .78 }, { transform: 'none' },
    ], { duration: 1300, easing: 'ease-in-out' }).onfinish = () => el.style.transformOrigin = '';
    el.animate([{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1300, pseudoElement: '::after' });
    hops(el, i, 2800, n - 1);
  }, wait));
}
// a touch during any of it stops it at once, the cards back in place, so the link works without waiting
row.addEventListener('pointerdown', () => {
  timers.splice(0).forEach(clearTimeout);
  row.getAnimations({ subtree: true }).forEach(a => a.cancel());
  row.querySelectorAll('.ground').forEach(g => g.remove());
  cards.forEach(el => el.style.transformOrigin = '');
  row.classList.remove('wait');
  AudioManager.play('bubble');
}, true);
// start once the pictures are decoded (never drop an empty card); after 2 s without them, just show the page as it is
const decoded = Promise.all([...row.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
Promise.race([decoded.then(() => true), new Promise(r => setTimeout(() => r(false), 2000))]).then(ok => {
  const enter = ok && first;
  if (!ok || still) row.classList.remove('wait');
  if (enter && still) cards.forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], 400));
  else if (enter) drop();
  else if (ok && !still) cards.forEach((el, i) => hops(el, i, 700 + i * 1400));
  nextWave = performance.now() / 1000 + (enter ? 1.7 : 0.6); // the boy first waves once the cards have landed
});

// the games' badges: game.js keeps them in this browser, per child; show the current child's count, or nothing yet
try {
  const store = JSON.parse(localStorage.getItem('horofi-happy-world-1')) || {}, n = Object.keys(store.profiles?.[store.current]?.badges || {}).length;
  if (n) { const m = $('medals'); m.lastChild.textContent = n.toLocaleString('ar'); m.setAttribute('aria-label', 'الأوسمة: ' + n.toLocaleString('ar')); m.hidden = false; }
} catch {}

// ---------- the grown-ups' gear: held for a second it opens (its ring fills); a quick tap only shows a hint ----------
const gear = $('gear'), menu = $('menu'), tip = $('tip');
let hold = null, tipOff = 0;
const openMenu = on => { menu.hidden = !on; gear.setAttribute('aria-expanded', String(on)); };
gear.addEventListener('pointerdown', e => {
  if (e.button) return;
  e.preventDefault(); gear.classList.add('holding');
  hold = setTimeout(() => { hold = null; gear.classList.remove('holding'); openMenu(true); AudioManager.play('pop'); }, 1000);
});
const letGo = () => {
  if (!hold) return;
  clearTimeout(hold); hold = null; gear.classList.remove('holding');
  tip.classList.add('on'); clearTimeout(tipOff); tipOff = setTimeout(() => tip.classList.remove('on'), 1600);
};
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => gear.addEventListener(t, letGo));
gear.addEventListener('contextmenu', e => e.preventDefault()); // a long press on a phone would open the system menu
// the keyboard (Enter, Space) and screen readers send a click without a pointer (detail 0): grown-ups only, so it opens at once
gear.addEventListener('click', e => { if (!e.detail) { openMenu(menu.hidden); if (!menu.hidden) menu.querySelector('a, button').focus(); } });
addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !gear.contains(e.target)) openMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { openMenu(false); gear.focus(); } });

// ---------- the meadow: grass and a few little animals from the book's world ----------
const OUT = '#3a2a1a';
function blob(c, x, y, rx, ry, rot, fill, line = OUT, lw = 1.3) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fillStyle = fill; c.fill(); if (line) { c.lineWidth = lw; c.strokeStyle = line; c.stroke(); } }
const eye = (c, x, y, r = 1.6) => { blob(c, x, y, r, r, 0, '#111', null); blob(c, x + r * 0.35, y - r * 0.35, r * 0.35, r * 0.35, 0, '#fff', null); };
const smooth = u => u * u * (3 - 2 * u);
function pingPong(t, period, pause = 0.18) { const p = ((t / period) % 2 + 2) % 2, half = p < 1 ? p : 2 - p, u = Math.min(1, Math.max(0, (half - pause / 2) / (1 - pause))); return { u: smooth(u), dir: p < 1 ? 1 : -1, moving: u > 0 && u < 1 }; }
const DRAW = {
  butterfly(c, t, k) {
    const f = 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + k)), col = [['#ff7eb6', '#ffd166'], ['#9b5de5', '#00bbf9']][k % 2];
    for (const s of [-1, 1]) { c.save(); c.scale(f, 1); blob(c, s * 7, -5, 8, 6, s * 0.5, col[0]); blob(c, s * 5, 5, 5, 4, -s * 0.4, col[1]); c.restore(); }
    c.fillStyle = '#3b2412'; c.fillRect(-1.2, -8, 2.4, 16); c.strokeStyle = '#3b2412'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -8); c.lineTo(-3, -13); c.moveTo(0, -8); c.lineTo(3, -13); c.stroke();
  },
  ladybug(c, t, k, st) {
    const o = st.open;
    c.strokeStyle = '#111'; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { const w = st.moving ? Math.sin(t * 16 + i * 2) * 1.5 : 0; c.beginPath(); c.moveTo(i * 4, 3); c.lineTo(i * 4 + 2 + w, 8); c.stroke(); }
    if (o > 0) for (const s of [-1, 1]) blob(c, -2, s * 2, 9 * o, 4, s * 0.6, 'rgba(230,240,255,.6)', 'rgba(80,80,120,.6)', 0.6);
    blob(c, 8, 0, 4.5, 4, 0, '#111', null); eye(c, 10, -1.5, 0.9);
    c.beginPath(); c.moveTo(11, -3); c.lineTo(14, -6); c.moveTo(11, 3); c.lineTo(14, 6); c.stroke();
    for (const s of [-1, 1]) { c.save(); c.rotate(-s * o * 0.6); blob(c, 0, s * 0.01, 9, 7.5, 0, '#e8262b', '#111', 1); c.restore(); }
    c.strokeStyle = '#111'; c.beginPath(); c.moveTo(4, 0); c.lineTo(-9, 0); c.stroke();
    for (const [x, y] of [[2, -4], [-4, -3], [-1, 3.5], [-5, 3], [3, 3]]) blob(c, x, y, 1.6, 1.6, 0, '#111', null);
  },
  snail(c, t, k) {
    const stretch = 1 + 0.08 * Math.sin(t * 2.2 + k), ant = Math.sin(t * 1.7 + k) * 0.25;
    c.save(); c.scale(stretch, 1);
    c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, 8, 13, 5); c.quadraticCurveTo(15, 0, 11, -2); c.lineTo(-10, 3); c.closePath(); c.fillStyle = '#e8c48a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 1.2; for (const [a, l] of [[ant - 0.5, 9], [ant - 0.2, 10]]) { const ex = 12 + Math.sin(a) * l * 0.4 + l * 0.2, ey = -2 - Math.cos(a) * l; c.beginPath(); c.moveTo(11, -1); c.lineTo(ex, ey); c.stroke(); blob(c, ex, ey, 1.5, 1.5, 0, '#e8c48a'); }
    blob(c, -2, -4, 9, 9, 0, '#c9773a'); c.strokeStyle = '#7a3f17'; c.lineWidth = 1.3; c.beginPath();
    for (let a = 0; a < 12; a += 0.2) { const r = 8 - a * 0.6, x = -2 + Math.cos(a) * r, y = -4 + Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    eye(c, 13.5, 0.5, 0.9);
  },
  worm(c, t, k) { // peeks out of its hole now and then
    const up = Math.max(0, Math.sin(t * 0.6 + k * 1.3)), h = up * 22;
    blob(c, 0, 4, 9, 3, 0, '#4a2c17', null);
    if (h > 1) { c.save(); c.beginPath(); c.rect(-20, -40, 40, 44); c.clip();
      c.lineCap = 'round'; c.strokeStyle = '#e88a9a'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 4);
      for (let i = 1; i <= 6; i++) { const y = 4 - h * i / 6, x = Math.sin(t * 3 + i * 0.8) * 2.5 * i / 6; c.lineTo(x, y); } c.stroke();
      const hx = Math.sin(t * 3 + 4.8) * 2.5, hy = 4 - h; eye(c, hx - 1.3, hy + 1, 0.9); eye(c, hx + 1.3, hy + 1, 0.9); c.restore(); }
    blob(c, 0, 5.5, 9, 1.6, 0, '#6b4226', null);
  },
};
// where each one lives (x as a share of the width, y in px from the top of the meadow), and its sound
const FOLK = [
  { t: 'snail', x: 0.16, y: 104, r: 50, per: 30, s: 1.5, snd: 'snail' },
  { t: 'ladybug', x: 0.62, y: 108, r: 70, per: 7, s: 1.4, snd: 'ladybug' },
  { t: 'worm', x: 0.86, y: 104, r: 0, s: 1.4, snd: 'worm' },
  { t: 'butterfly', x: 0.36, y: 46, r: 70, s: 1.3, fly: true, snd: 'flutter' },
  { t: 'butterfly', x: 0.74, y: 34, r: 55, s: 1.1, fly: true, k: 1, snd: 'flutter' },
];
const cv = $('meadow'), g = cv.getContext('2d'), hop = new Map(); // animal → when it was tapped
let W = 0, H = 0, dpr = 1, meadowRaf = 0, meadowSeen = true, lastDraw = 0;
function where(f, t) {
  const st = { x: f.x * W, y: f.y, dir: 1, moving: false, open: 0 };
  if (f.fly) { const u = t * 0.4 + (f.k || 0) * 2; st.x += f.r * Math.sin(u); st.y += 10 * Math.sin(u * 2.1) - 4 * Math.sin(t * 3); st.dir = Math.cos(u) >= 0 ? 1 : -1; }
  else if (f.per) { const m = pingPong(t + (f.k || 0) * 3, f.per, 0.15); st.x += f.r * (m.u - 0.5); st.dir = m.dir; st.moving = m.moving;
    if (f.t === 'ladybug') { const w = (t % 7) / 7; st.open = w > 0.86 ? Math.sin((w - 0.86) / 0.14 * Math.PI) : 0; } } // now and then it opens its wings
  const h0 = hop.get(f); if (h0 != null) { const p = (t - h0) / 0.45; if (p < 1) st.y -= Math.sin(p * Math.PI) * 22; else hop.delete(f); }
  return st;
}
function drawMeadow(t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const top = 74; // a soft hill of grass with blades along its top, and three flowers
  g.fillStyle = '#7cc242';
  g.beginPath(); g.moveTo(0, top + 10); for (let x = 0; x <= W; x += 20) g.lineTo(x, top + 6 * Math.sin(x / 90) + 4); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.strokeStyle = '#5ea832'; g.lineWidth = 2; g.lineCap = 'round';
  for (let x = 6; x < W; x += 11) { const y = top + 6 * Math.sin(x / 90) + 6, sway = still ? 0 : Math.sin(t * 1.4 + x / 40) * 2; g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + sway, y - 4, x + sway * 1.6, y - 9 - (x % 3) * 2); g.stroke(); }
  for (const [x, c] of [[0.08, '#ff7eb6'], [0.47, '#ffd166'], [0.93, '#9b5de5']]) { const fx = x * W, fy = top + 2; blob(g, fx, fy, 4, 4, 0, c, null); blob(g, fx, fy, 1.6, 1.6, 0, '#fff7c2', null); }
  FOLK.forEach((f, k) => { const st = where(f, t); g.save(); g.translate(st.x, st.y); g.scale(st.dir * f.s, f.s); DRAW[f.t](g, t, f.k ?? k, st); g.restore(); f.at = st; });
}
function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; if (still) drawMeadow(2); }
function meadowFrame(now) {
  meadowRaf = 0;
  if (!meadowSeen || document.hidden) return;
  if (!LEAN || now - lastDraw > 30) { lastDraw = now; drawMeadow(now / 1000); } // a weak phone draws 30 frames a second
  meadowRaf = requestAnimationFrame(meadowFrame);
}
const meadowGo = () => { if (!still && !meadowRaf && meadowSeen && !document.hidden) meadowRaf = requestAnimationFrame(meadowFrame); };
addEventListener('resize', size); size();
new IntersectionObserver(([e]) => { meadowSeen = e.isIntersecting; meadowGo(); }).observe(cv);
document.addEventListener('visibilitychange', meadowGo);
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const f = FOLK.filter(f => f.at).map(f => [f, Math.hypot(f.at.x - x, f.at.y - y)]).sort((a, b) => a[1] - b[1])[0];
  if (f && f[1] < 44) { if (!still) hop.set(f[0], performance.now() / 1000); AudioManager.play(f[0].snd); }
});
