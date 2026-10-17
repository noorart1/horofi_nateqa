// Player: decoding, waveform, swipeable cover, letter grid, shuffle/repeat, speed.
// Expects TRACKS, KEY and ANIM globals from index.php.
const $ = id => document.getElementById(id);
const PLAY = 'M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
  PAUSE = 'M7 5h3.2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.8 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z';
const BAR = 7, GAP = 5; // waveform bar width / gap in CSS px: fat, round, toy-like
// offset/pos are in seconds of the original recording, whatever the speed
let ctx, buf, src, startAt = 0, offset = 0, playing = false, cur = -1, loadId = 0, rate = 1, stretched = {};
let viaAnim = false; // the song is playing inside the living picture (startAt is then in performance.now() seconds)
let peaks = null, hover = -1, drag = null, drawn = '', raf = 0;

const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const pos = () => !playing ? offset
  : Math.min(viaAnim ? performance.now() / 1000 - startAt : (ctx.currentTime - startAt) * rate, buf?.duration ?? Infinity);

// letters listened to the end, stored on the server so they follow the user to any device
const done = new Set(TRACKS.flatMap((t, i) => t.done ? [i] : []));
// returns the celebration (a promise) when the letter was just learned, else nothing
function markDone(i) {
  if (done.has(i)) return;
  done.add(i);
  renderDone();
  const all = done.size === TRACKS.length, medal = done.size % 7 === 0 ? $('medals').children[done.size / 7 - 1] : null;
  fetch('progress.php', { method: 'POST', headers: { 'X-Player': '1' }, body: new URLSearchParams({ t: i }) });
  const party = celebrateLetter(i, { medal, all });
  // the message comes once the star has landed, so it never hides the star's flight
  party.then(() => toast(all ? 'مبارك! أتممت جميع الحروف' : medal ? 'أحسنت! حصلت على وسام جديد' : `أحسنت! نجمة لحرف ${TRACKS[i].title}`));
  return party;
}
const MEDAL = '<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M9 2h6l3 12h-6z" fill="#6ed2f2"/><path d="M23 2h-6l-3 12h6z" fill="#9560a6"/>'
  + '<circle cx="16" cy="25" r="11" fill="#ffcb05" stroke="#e9a400" stroke-width="2.5"/>'
  + '<path d="M16 19.5l1.7 3.4 3.8.6-2.7 2.6.6 3.7-3.4-1.8-3.4 1.8.6-3.7-2.7-2.6 3.8-.6z" fill="#fff"/></svg>';
function renderDone() {
  [...$('list').children].forEach((b, j) => b.classList.toggle('done', done.has(j)));
  $('progress').textContent = `${done.size.toLocaleString('ar')} من ${TRACKS.length.toLocaleString('ar')} تم الاستماع إليها`;
  const medals = Math.floor(done.size / 7), slots = Math.floor(TRACKS.length / 7);
  $('medals').replaceChildren(...Array.from({ length: slots }, (_, k) =>
    Object.assign(document.createElement('span'), { innerHTML: MEDAL, className: k < medals ? 'on' : '' })));
  $('medals').ariaLabel = `${medals.toLocaleString('ar')} من ${slots.toLocaleString('ar')} أوسمة`;
  $('cert').hidden = done.size < TRACKS.length;
}
let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('on'), 3000);
}

TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.className = 'letter';
  b.ariaLabel = t.title;
  b.innerHTML = '<span class="num"></span><span class="g"></span><span class="n"></span><span class="w"></span><span class="eq"><i></i><i></i><i></i></span>';
  b.querySelector('.num').textContent = (i + 1).toLocaleString('ar');
  b.querySelector('.g').textContent = t.glyph || t.title;
  b.querySelector('.n').textContent = t.title;
  b.onclick = () => i === cur && buf ? (playing ? pause() : play()) : load(i);
  $('list').append(b);
});
renderDone();
enterGrid($('list'));

// --- waveform ---
function computePeaks(n) {
  const data = buf.getChannelData(0), step = Math.floor(data.length / n), out = new Float32Array(n);
  let max = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * step, e = j + step; j < e; j += 8) sum += data[j] * data[j];
    out[i] = Math.sqrt(sum / (step / 8));
    max = Math.max(max, out[i]);
  }
  return out.map(v => v / (max || 1));
}

function draw() {
  const cv = $('cv'), dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; peaks = null; }
  const n = Math.floor(w / (BAR + GAP));
  const stale = !peaks || peaks.length !== n;
  if (buf && stale) peaks = computePeaks(n);
  const played = buf ? (drag ?? pos()) / buf.duration * n : 0;
  // repaint only when a bar changes colour, not every frame (battery)
  const key = `${n}|${Math.ceil(played)}|${hover}`;
  if (!stale && key === drawn) return;
  drawn = key;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const x0 = (w - n * (BAR + GAP) + GAP) / 2; // centre the bars in the strip
  for (let i = 0; i < n; i++) {
    const v = peaks ? Math.max(peaks[i], 0.08) : 0.08;
    const on = i < played, hov = hover >= 0 && i < hover && !on;
    const bh = Math.max(BAR, v * h); // pill bars, mirrored around the middle line
    g.fillStyle = on ? '#0070b2' : hov ? '#6ed2f2' : '#ffffffb3';
    g.beginPath();
    g.roundRect ? g.roundRect(x0 + i * (BAR + GAP), (h - bh) / 2, BAR, bh, BAR / 2) : g.rect(x0 + i * (BAR + GAP), (h - bh) / 2, BAR, bh); // roundRect: Safari 16+
    g.fill();
  }
}

// the page is right-to-left: the waveform starts at the right (the canvas is mirrored in CSS)
const ratioAt = e => { const r = $('wave').getBoundingClientRect(); return Math.min(Math.max((r.right - e.clientX) / r.width, 0), 1); };
$('wave').onpointermove = e => {
  hover = Math.floor(ratioAt(e) * $('cv').clientWidth / (BAR + GAP));
  redraw();
  if (drag !== null) drag = ratioAt(e) * buf.duration;
};
$('wave').onpointerleave = () => { hover = -1; redraw(); };
$('wave').onpointerdown = e => {
  if (!buf) return;
  $('wave').setPointerCapture(e.pointerId);
  drag = ratioAt(e) * buf.duration;
  redraw();
};
$('wave').onpointerup = () => { if (drag !== null) { seek(drag); drag = null; } };
$('wave').onkeydown = e => {
  if (!buf) return;
  if (e.key === 'ArrowLeft') seek(pos() + 5); // right-to-left: forward is to the left
  else if (e.key === 'ArrowRight') seek(pos() - 5);
  else if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
};

// --- playback ---
function stopSrc() {
  if (src) { src.onended = null; src.stop(); src.disconnect(); src = null; }
}

function play() {
  if (!buf) return load(Math.max(cur, 0));
  ctx.resume();
  // a letter with a living picture plays its song there; the page follows on 'anim:play'
  if (live()) return anim.contentWindow.postMessage({ seek: offset, play: true }, location.origin);
  if (anim?.dataset.i === String(cur) && !anim.late) { // its picture is still loading: start the song there once it is up
    const a = anim, id = loadId;
    a.wanted = true; giveSong(a); // the child wants it now: no waiting for the letter to settle
    $('status').textContent = 'جارٍ التحميل…';
    Promise.race([a.ready, new Promise(r => setTimeout(r, 8000))]).then(() => {
      a.late = !live(); // it never came up: the page plays the song itself
      $('status').textContent = '';
      if (id === loadId && anim === a && !playing) play();
    });
    return;
  }
  hushAnim(); // never two songs at once
  stopSrc();
  src = ctx.createBufferSource();
  src.buffer = rate === 1 ? buf : (stretched[rate] ??= stretch(buf, rate));
  if (!meter) { meter = ctx.createAnalyser(); meter.fftSize = 512; meter.connect(ctx.destination); }
  src.connect(meter);
  src.onended = ended;
  src.start(0, offset / rate);
  startAt = ctx.currentTime - offset / rate;
  playing = true;
  setIcon();
}

// the song reached its end (here or in the living picture): the letter is learned, then on to the next one
function ended() {
  playing = viaAnim = false; offset = 0; setIcon();
  const party = markDone(cur), id = loadId;
  const go = () => {
    if (id !== loadId || playing) return; // the child picked something else during the party
    if (repeat === 'one') return play();
    if (repeat === 'all' || shuffle || cur < TRACKS.length - 1) load(nextIndex()); // 'next' stops after the last letter
  };
  party ? party.then(go) : go(); // the next letter waits for the celebration
}

function pause() {
  if (buf) offset = pos();
  if (viaAnim) hushAnim();
  stopSrc();
  playing = viaAnim = false;
  setIcon();
}

function seek(t) {
  offset = Math.min(Math.max(t, 0), buf.duration - 0.05);
  if (live()) { // the living picture jumps too; the page's clock follows its 'anim:play'
    if (playing) startAt = performance.now() / 1000 - offset;
    anim.contentWindow.postMessage({ seek: offset, play: playing }, location.origin);
    return redraw();
  }
  if (playing) play();
  redraw();
}

function setIcon() {
  $('icon').setAttribute('d', playing ? PAUSE : PLAY);
  $('play').ariaLabel = playing ? 'إيقاف مؤقت' : 'تشغيل';
  $('list').classList.toggle('playing', playing);
  ambient(playing); // bubbles and stars drift behind the page while a song plays
  redraw();
}

// --- swipeable cover ---
TRACKS.forEach(t => {
  const img = document.createElement('img');
  img.alt = t.title;
  img.draggable = false;
  $('strip').append(img);
});
const imgs = [...$('strip').children];
imgs[0].fetchPriority = 'high'; // the first cover is the page's largest picture (its LCP)

TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.className = 'thumb';
  b.ariaLabel = t.title;
  b.innerHTML = `<img loading="lazy" alt="" draggable="false"><b></b>`;
  b.querySelector('img').src = t.thumb;
  b.querySelector('b').textContent = t.glyph || t.title;
  b.onclick = () => i !== cur && select(i);
  $('thumbs').append(b);
});
// load only the current image and its neighbours
const ensureImg = j => { if (imgs[j] && !imgs[j].src) imgs[j].src = TRACKS[j].img; };
const stripTo = (i, px = 0) => $('strip').style.transform = `translateX(calc(${i * 100}% + ${px}px))`;

let sw = null; // active swipe: {x, y, t, dx, locked}
$('cover').onpointerdown = e => {
  if (e.button > 0) return;
  sw = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, locked: false };
  ensureImg(cur - 1); ensureImg(cur + 1);
};
$('cover').onpointermove = e => {
  if (!sw) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.locked) {
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) return (sw = null); // vertical: let the page scroll
    if (Math.abs(dx) < 6) return;
    sw.locked = true;
    $('cover').setPointerCapture(e.pointerId);
    $('cover').classList.add('dragging');
  }
  // dragging right reveals the next letter (RTL); resist past the first/last one
  const edge = (dx > 0 && cur === TRACKS.length - 1) || (dx < 0 && cur === 0);
  sw.dx = edge ? dx / 3 : dx;
  stripTo(cur, sw.dx);
};
$('cover').onpointerup = $('cover').onpointercancel = () => {
  if (!sw) return;
  const { dx, t, locked } = sw;
  sw = null;
  $('cover').classList.remove('dragging');
  if (!locked) return;
  const w = $('cover').clientWidth, fast = performance.now() - t < 250 && Math.abs(dx) > 30;
  const step = Math.abs(dx) > w * 0.2 || fast ? Math.sign(dx) : 0;
  const next = Math.min(Math.max(cur + step, 0), TRACKS.length - 1);
  next === cur ? stripTo(cur) : select(next);
};

// change letter; keep playing if it was playing, otherwise just show it
function select(i) {
  if (playing) return load(i);
  remember(i);
  ++loadId;
  pause();
  buf = null; peaks = null; offset = 0; stretched = {};
  show(i);
  $('dur').textContent = '0:00';
  $('status').textContent = '';
}

function show(i, scroll = true) {
  cur = i;
  redraw();
  $('title').textContent = TRACKS[i]?.title ?? '';
  const glyph = TRACKS[i]?.glyph === 'ا' ? 'أ' : TRACKS[i]?.glyph || ''; // as printed on the card (display only: strokes key on the plain glyph)
  if ($('badgeGlyph').textContent !== glyph) {
    const first = !$('badgeGlyph').textContent;
    $('badgeGlyph').textContent = glyph;
    if (!first) swapBadge($('badgeGlyph'));
  }
  $('writeBtn').hidden = !TRACKS[i]?.strokes;
  showAnim(i);
  $('speed').disabled = !!(ANIM && TRACKS[i]?.anim); // the living picture sings at its own speed
  $('camera').hidden = !(ANIM && TRACKS[i]?.anim);
  ensureImg(i - 1); ensureImg(i); ensureImg(i + 1);
  stripTo(i);
  $('counter').textContent = `${(i + 1).toLocaleString('ar')} / ${TRACKS.length.toLocaleString('ar')}`;
  [...$('thumbs').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.ariaCurrent = j === i ? 'true' : null; });
  if (scroll) $('thumbs').children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  [...$('list').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.ariaCurrent = j === i ? 'true' : null; });
}

// "back" history for the previous button in shuffle mode
function remember(i) { if (cur >= 0 && i !== cur) backStack.push(cur); }

// A phone that asks to save data, is on 2G or has under 4 GB of memory loads only what is on screen
const LEAN = !!navigator.connection?.saveData || /2g$/.test(navigator.connection?.effectiveType || '') || (navigator.deviceMemory || 8) < 4;

// one letter's mp3, fetched and unscrambled with the session key; the last few are kept, so going back is instant
// (two on a phone with little memory: each is about 1.5 MB)
const bytes = new Map(), BYTES_KEPT = (navigator.deviceMemory || 8) < 4 ? 2 : 4;
function trackBytes(i) {
  if (!bytes.has(i)) {
    const p = (async () => {
      const r = await fetch('audio.php?t=' + i, { headers: { 'X-Player': '1' }, cache: 'no-store' });
      if (r.status === 403) location.reload();
      if (!r.ok) throw 0;
      const a = new Uint8Array(await r.arrayBuffer());
      for (let j = 0; j < a.length; j++) a[j] ^= KEY[j % KEY.length];
      return a;
    })();
    bytes.set(i, p);
    p.catch(() => { if (bytes.get(i) === p) bytes.delete(i); }); // a failed fetch is tried again next time
    if (bytes.size > BYTES_KEPT) bytes.delete(bytes.keys().next().value);
  }
  return bytes.get(i);
}
// ...and decoded (writing.js uses it too). The latest decode is shared: the player, the waveform and the living
// picture all use this one AudioBuffer (a decoded song is about 15 MB). A copy goes in: decoding takes over the bytes.
let decoded = null;
function fetchTrack(i) {
  if (decoded?.i !== i) {
    ctx ??= new AudioContext();
    const p = trackBytes(i).then(a => ctx.decodeAudioData(a.slice().buffer));
    decoded = { i, p };
    p.catch(() => { if (decoded?.p === p) decoded = null; });
  }
  return decoded.p;
}

// --- living picture: the letter's animation (anim/player.html, made in the owner's editor) over its cover ---
// One player: the page's buttons and waveform drive the picture ({seek, play} messages), and the page keeps time with its
// own clock (waveform, minutes, the star at the end). Only the current letter's picture gets the song, handed over as the
// page's own decoded copy (animSong); the neighbours' pictures load ahead with just their picture and data, asleep and
// out of sight, so a swipe finds them drawn. A picture also sleeps while the cover is scrolled out of view.
const frames = new Map(); // letter → its iframe: the current letter's and its neighbours'
let anim = null, coverSeen = true; // the current letter's iframe, if it has an animation
const hasAnim = i => !!(ANIM && TRACKS[i]?.anim);
const tell = (f, m) => f?.contentWindow?.postMessage(m, location.origin);
function animFrame(i) {
  if (frames.has(i)) return frames.get(i);
  const f = Object.assign(document.createElement('iframe'), { className: 'anim-frame', title: `الصورة الحية لحرف ${TRACKS[i].title}` });
  f.allow = 'autoplay';
  f.dataset.i = i;
  f.ready = new Promise(r => f.isReady = r);
  frames.set(i, f);
  const abs = u => encodeURIComponent(new URL(u, location.href).href); // the player resolves links against its own folder
  f.src = `${ANIM}#data=${abs(TRACKS[i].anim)}&img=${abs(TRACKS[i].img)}`; // after #: one cached player for every letter
  $('cover').insertBefore(f, $('counter')); // fades in over the still picture once drawn; if it fails, the picture stays
  return f;
}
// the current picture gets the song once it is drawn: the page's decoded copy, and a key for its kept analysis. It waits
// until the letter has stayed a moment (SETTLE ms), so swiping past a letter does not fetch its 1.5 MB, unless play is pressed.
const SETTLE = 800;
function giveSong(f) {
  if (f.gotSong || f !== anim || !f.classList.contains('shown')) return;
  const wait = f.wanted ? 0 : SETTLE - (performance.now() - f.curSince);
  if (wait > 0) { clearTimeout(f.settle); f.settle = setTimeout(() => giveSong(f), wait); return; }
  f.gotSong = true;
  const i = +f.dataset.i;
  Promise.all([fetchTrack(i), trackBytes(i)]).then(([b, a]) => {
    if (cur === i && !buf) { buf = b; $('dur').textContent = fmt(b.duration); redraw(); }
    if (anim === f && f.gotSong) f.contentWindow?.animSong?.(b, `${TRACKS[i].anim}|${a.length}`);
  }, () => { f.gotSong = false; });
}
function showAnim(i) {
  const keep = (LEAN ? [i] : [i, i - 1, i + 1]).filter(hasAnim);
  for (const [j, f] of frames) if (!keep.includes(j)) { f.src = 'about:blank'; f.remove(); frames.delete(j); } // blank first: its memory goes at once
  if (anim && anim.dataset.i !== String(i)) { // no longer the current letter: it lets go of its song and sleeps
    anim.classList.remove('cur', 'ready');
    anim.gotSong = false;
    anim.ready = new Promise(r => anim.isReady = r);
    tell(anim, { drop: true }); tell(anim, { sleep: true });
  }
  anim = hasAnim(i) ? animFrame(i) : null; // the current one first, so it loads first
  if (anim && !anim.classList.contains('cur')) { anim.classList.add('cur'); anim.curSince = performance.now(); anim.wanted = false; tell(anim, { sleep: !coverSeen }); giveSong(anim); }
  keep.forEach(animFrame);
}
// the current letter's living picture is up and has its song: it plays the letter
const live = () => !!(anim?.classList.contains('ready') && anim.dataset.i === String(cur));
function hushAnim() { tell(anim, 'stop'); }
// the picture stops drawing while the cover is out of view (a hidden tab stops it by itself)
new IntersectionObserver(([e]) => { coverSeen = e.isIntersecting; tell(anim, { sleep: !coverSeen }); }).observe($('cover'));
// the camera moving between the singers is the viewer's choice (off unless turned on; remembered per browser)
let camera = false;
try { camera = localStorage.getItem('camera') === '1'; } catch {}
const tellCamera = (f = anim) => tell(f, { camera });
function renderCamera() {
  $('camera').classList.toggle('on', camera);
  $('camera').ariaPressed = String(camera);
}
$('camera').onclick = () => {
  camera = !camera;
  renderCamera();
  frames.forEach(f => tellCamera(f));
  try { localStorage.setItem('camera', camera ? '1' : '0'); } catch {}
};
renderCamera();
addEventListener('message', e => {
  const f = e.origin === location.origin && [...frames.values()].find(x => x.contentWindow === e.source);
  if (!f) return;
  if (e.data === 'anim:shown') { f.classList.add('shown'); tellCamera(f); if (f === anim) giveSong(f); else tell(f, { sleep: true }); }
  if (e.data === 'anim:ready' && f.gotSong) { f.classList.add('ready'); f.isReady(); }
  if (f !== anim) return; // a neighbour loading ahead
  if (e.data === 'anim:play') { // from its own ▶ or from ours: the page follows
    stopSrc();
    ctx?.resume(); // inside the child's tap, so the next letter may start by itself later
    startAt = performance.now() / 1000 - offset; // it goes on from where it stopped
    playing = viaAnim = true;
    setIcon();
  } else if (e.data === 'anim:ended' && viaAnim) ended(); // the whole song was heard, like the end of a recording
});

async function load(i, track = true) {
  if (track) remember(i);
  ctx ??= new AudioContext();
  ctx.resume();
  const id = ++loadId;
  pause();
  buf = null; peaks = null; offset = 0; stretched = {};
  show(i);
  $('dur').textContent = '0:00';
  $('status').textContent = 'جارٍ التحميل…';
  try {
    const decoded = await fetchTrack(i);
    if (id !== loadId) return; // a newer track was picked meanwhile
    buf = decoded;
    $('dur').textContent = fmt(buf.duration);
    $('status').textContent = '';
    play();
  } catch {
    if (id === loadId) $('status').textContent = 'تعذّر تحميل الصوت';
  }
}

$('play').onclick = () => playing ? pause() : play();
// --- shuffle / repeat (remembered per browser) ---
const REPEAT = {
  next: { next: 'all', label: 'تشغيل الحروف بالتتابع', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z' },
  all: { next: 'one', label: 'تشغيل الكل بالتكرار', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z' },
  one: { next: 'next', label: 'تكرار الحرف', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z' },
};
let shuffle = false, repeat = 'next'; // default: go on to the next letter by itself
const backStack = []; // letters played before, so "previous" works in shuffle mode
try { shuffle = localStorage.getItem('shuffle') === '1'; repeat = REPEAT[localStorage.getItem('repeat')] ? localStorage.getItem('repeat') : 'next'; } catch {}

function renderModes() {
  $('shuffle').classList.toggle('on', shuffle);
  $('shuffle').ariaPressed = String(shuffle);
  $('repeat').classList.toggle('on', repeat !== 'next');
  $('repeat').ariaLabel = $('repeat').title = REPEAT[repeat].label;
  $('repeatIcon').setAttribute('d', REPEAT[repeat].d);
  try { localStorage.setItem('shuffle', shuffle ? '1' : '0'); localStorage.setItem('repeat', repeat); } catch {}
}
$('shuffle').onclick = () => { shuffle = !shuffle; renderModes(); };
$('repeat').onclick = () => { repeat = REPEAT[repeat].next; renderModes(); };
renderModes();

// next letter (random in shuffle mode), wrapping from the last back to the first
function nextIndex() {
  if (shuffle && TRACKS.length > 1) {
    let n;
    do n = Math.floor(Math.random() * TRACKS.length); while (n === cur);
    return n;
  }
  return (cur + 1) % TRACKS.length;
}

$('prev').onclick = () => {
  if (buf && pos() > 3) return seek(0); // like most players: first press restarts the letter
  const p = shuffle && backStack.length ? backStack.pop() : Math.max(cur - 1, 0);
  load(p, false);
};
$('next').onclick = () => load(nextIndex());

// --- playback speed (slower speech keeps its pitch) ---
const SPEEDS = [1, 0.75, 0.5];
try { rate = SPEEDS.includes(+localStorage.getItem('rate')) ? +localStorage.getItem('rate') : 1; } catch {}
function renderSpeed() {
  $('speed').textContent = rate.toLocaleString('ar') + '×';
  $('speed').classList.toggle('on', rate !== 1);
}
$('speed').onclick = () => {
  const was = playing;
  if (was) pause();
  rate = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
  renderSpeed();
  try { localStorage.setItem('rate', rate); } catch {}
  if (was) play();
};
renderSpeed();

// WSOLA time-stretch: each output frame is taken from near its ideal input position,
// shifted to where it best continues the previous frame, so the speech slows down without dropping in pitch.
function stretch(b, r) {
  const N = 1024, Hs = N / 2, tol = 256, len = b.length, chans = b.numberOfChannels;
  const ref = b.getChannelData(0);
  const outLen = Math.ceil(len / r) + N;
  const out = ctx.createBuffer(chans, outLen, b.sampleRate);
  const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const norm = new Float32Array(outLen);
  let prev = 0;
  for (let k = 0, o = 0; o + N <= outLen; k++, o += Hs) {
    const target = Math.round(k * Hs * r), nat = prev + Hs;
    if (target + tol + N >= len || nat + Hs >= len) break;
    let best = target;
    if (k > 0) {
      let bestC = -Infinity;
      for (let p = Math.max(0, target - tol); p <= target + tol; p += 4) {
        let c = 0;
        for (let j = 0; j < Hs; j += 8) c += ref[p + j] * ref[nat + j];
        if (c > bestC) { bestC = c; best = p; }
      }
    }
    for (let c = 0; c < chans; c++) {
      const inp = b.getChannelData(c), dst = out.getChannelData(c);
      for (let j = 0; j < N; j++) dst[o + j] += inp[best + j] * win[j];
    }
    for (let j = 0; j < N; j++) norm[o + j] += win[j];
    prev = best;
  }
  for (let c = 0; c < chans; c++) {
    const dst = out.getChannelData(c);
    for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) dst[i] /= norm[i];
  }
  return out;
}

// the frame loop runs only while playing or dragging; anything else that changes the waveform calls redraw()
function redraw() { raf ||= requestAnimationFrame(tick); }
function tick() {
  raf = 0;
  if (buf) {
    const t = drag ?? pos();
    $('cur').textContent = fmt(t);
    $('wave').ariaValueNow = String(Math.round(t / buf.duration * 100));
    $('wave').ariaValueText = `${fmt(t)} من ${fmt(buf.duration)}`;
  }
  draw();
  sing();
  if (playing || drag !== null) redraw();
}

// the letter sings: its badge hops and swells with the loudness of its own song
let meter = null, level = 0, loud = 2, prevTarget = 0, lastBeat = 0;
const still = matchMedia('(prefers-reduced-motion: reduce)');
const wave = new Uint8Array(512);
// loudness of the moment being heard, on the analyser's 0..128 scale. A living picture plays the song in its own frame,
// so then it is read from the page's copy of the same recording, at the same moment and over the same 512 samples.
function loudness() {
  if (!playing) return null;
  let sum = 0;
  if (viaAnim) {
    if (!buf) return null;
    const d = buf.getChannelData(0), i = Math.floor(pos() * buf.sampleRate);
    for (let j = i; j < Math.min(i + 512, d.length); j++) sum += d[j] * d[j];
    return Math.sqrt(sum / 512) * 128;
  }
  if (!meter) return null;
  meter.getByteTimeDomainData(wave);
  for (const v of wave) sum += (v - 128) * (v - 128);
  return Math.sqrt(sum / wave.length);
}
function sing() {
  let target = 0;
  const rms = loudness();
  if (rms !== null) {
    loud = Math.max(rms, loud * 0.997, 2); // loudest moment so far, slowly forgotten: every song hops the same amount
    target = (rms / loud) ** 2; // squared, so beats hop and the quiet parts rest
    // a strong beat (loud and rising) sends a note out of the letter
    const now = performance.now();
    if (target > 0.5 && target > prevTarget * 1.25 && now - lastBeat > 380) { lastBeat = now; singNote($('badge')); }
  }
  prevTarget = target;
  level += (target - level) * (target > level ? 0.5 : 0.15); // quick rise, slow fall
  if (level < 0.002) level = 0;
  // "reduce motion" (e.g. Windows' Animation effects off) gets a gentle pulse only: no hop, no tilt
  $('badge').style.transform = !level ? '' : still.matches ? `scale(${1 + level * 0.05})`
    : `translateY(${-level * 16}px) scale(${1 + level * 0.14}) rotate(${Math.sin(performance.now() / 260) * level * 6}deg)`;
  // the card picture breathes with the song (about 1%); left still under "reduce motion", and a living picture moves by itself
  $('cover').style.transform = level && !still.matches && !viaAnim ? `scale(${1 + level * 0.012})` : '';
  if (level && !playing) redraw(); // let it settle after a pause
}
addEventListener('resize', redraw);

show(0, false); // no autoplay: browsers block audio before a click
