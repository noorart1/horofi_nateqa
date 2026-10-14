// Player: decoding, waveform, swipeable cover, letter grid, shuffle/repeat.
// Expects TRACKS and KEY globals from index.php.
const $ = id => document.getElementById(id);
const PLAY = 'M8 5v14l11-7z', PAUSE = 'M6 5h4v14H6zm8 0h4v14h-4z';
const BAR = 3, GAP = 1; // waveform bar width / gap in CSS px
let ctx, buf, src, startAt = 0, offset = 0, playing = false, cur = -1, loadId = 0;
let peaks = null, hover = -1, drag = null;

const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const pos = () => playing ? Math.min(ctx.currentTime - startAt, buf.duration) : offset;

// letters listened to the end, per browser (convenience only)
let done = new Set();
try { done = new Set(JSON.parse(localStorage.getItem('done') || '[]')); } catch {}
function markDone(i) {
  done.add(i);
  try { localStorage.setItem('done', JSON.stringify([...done])); } catch {}
  renderDone();
}
function renderDone() {
  [...$('list').children].forEach((b, j) => b.classList.toggle('done', done.has(j)));
  $('progress').textContent = `${done.size.toLocaleString('ar')} من ${TRACKS.length.toLocaleString('ar')} تم الاستماع إليها`;
}

TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.className = 'letter';
  b.ariaLabel = t.title;
  b.innerHTML = '<span class="num"></span><span class="g"></span><span class="n"></span><span class="eq"><i></i><i></i><i></i></span>';
  b.querySelector('.num').textContent = (i + 1).toLocaleString('ar');
  b.querySelector('.g').textContent = t.glyph || t.title;
  b.querySelector('.n').textContent = t.title;
  b.onclick = () => i === cur && buf ? (playing ? pause() : play()) : load(i);
  $('list').append(b);
});
renderDone();

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
  if (buf && (!peaks || peaks.length !== n)) peaks = computePeaks(n);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const base = h * 0.7; // SoundCloud style: bars above, faint reflection below
  const played = buf ? (drag ?? pos()) / buf.duration * n : 0;
  for (let i = 0; i < n; i++) {
    const v = peaks ? Math.max(peaks[i], 0.03) : 0.03;
    const on = i < played, hov = hover >= 0 && i < hover && !on;
    g.fillStyle = on ? '#ff5500' : hov ? '#ffb38a' : '#c9c9c9';
    g.fillRect(i * (BAR + GAP), base - v * base, BAR, v * base);
    g.fillStyle = on ? '#ffbb99' : hov ? '#ffd9c4' : '#e6e6e6';
    g.fillRect(i * (BAR + GAP), base + 1, BAR, v * (h - base - 1));
  }
}

const ratioAt = e => { const r = $('wave').getBoundingClientRect(); return Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1); };
$('wave').onpointermove = e => {
  hover = Math.floor(ratioAt(e) * $('cv').clientWidth / (BAR + GAP));
  if (drag !== null) drag = ratioAt(e) * buf.duration;
};
$('wave').onpointerleave = () => hover = -1;
$('wave').onpointerdown = e => {
  if (!buf) return;
  $('wave').setPointerCapture(e.pointerId);
  drag = ratioAt(e) * buf.duration;
};
$('wave').onpointerup = () => { if (drag !== null) { seek(drag); drag = null; } };
$('wave').onkeydown = e => {
  if (!buf) return;
  if (e.key === 'ArrowRight') seek(pos() + 5);
  else if (e.key === 'ArrowLeft') seek(pos() - 5);
  else if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
};

// --- playback ---
function stopSrc() {
  if (src) { src.onended = null; src.stop(); src.disconnect(); src = null; }
}

function play() {
  if (!buf) return load(Math.max(cur, 0));
  ctx.resume();
  stopSrc();
  src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => {
    playing = false; offset = 0; setIcon(); markDone(cur);
    if (repeat === 'one') return play();
    if (repeat === 'all') load(nextIndex()); // otherwise stop after this letter
  };
  src.start(0, offset);
  startAt = ctx.currentTime - offset;
  playing = true;
  setIcon();
}

function pause() {
  if (buf) offset = pos();
  stopSrc();
  playing = false;
  setIcon();
}

function seek(t) {
  offset = Math.min(Math.max(t, 0), buf.duration - 0.05);
  if (playing) play();
}

function setIcon() {
  $('icon').setAttribute('d', playing ? PAUSE : PLAY);
  $('play').ariaLabel = playing ? 'إيقاف مؤقت' : 'تشغيل';
  $('list').classList.toggle('playing', playing);
}

// --- swipeable cover ---
TRACKS.forEach(t => {
  const img = document.createElement('img');
  img.alt = t.title;
  img.draggable = false;
  $('strip').append(img);
});
const imgs = [...$('strip').children];

// ponytail: thumbnails reuse the full-size images (lazy-loaded); generate small thumbs if bandwidth matters
TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.className = 'thumb';
  b.ariaLabel = t.title;
  b.innerHTML = `<img loading="lazy" alt="" draggable="false"><b></b>`;
  b.querySelector('img').src = t.img;
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
  buf = null; peaks = null; offset = 0;
  show(i);
  $('dur').textContent = '0:00';
  $('status').textContent = '';
}

function show(i, scroll = true) {
  cur = i;
  $('title').textContent = TRACKS[i]?.title ?? '';
  ensureImg(i - 1); ensureImg(i); ensureImg(i + 1);
  stripTo(i);
  $('counter').textContent = `${(i + 1).toLocaleString('ar')} / ${TRACKS.length.toLocaleString('ar')}`;
  [...$('thumbs').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.ariaCurrent = j === i ? 'true' : null; });
  if (scroll) $('thumbs').children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  [...$('list').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.ariaCurrent = j === i ? 'true' : null; });
}

// "back" history for the previous button in shuffle mode
function remember(i) { if (cur >= 0 && i !== cur) backStack.push(cur); }

async function load(i, track = true) {
  if (track) remember(i);
  ctx ??= new AudioContext();
  ctx.resume();
  const id = ++loadId;
  pause();
  buf = null; peaks = null; offset = 0;
  show(i);
  $('dur').textContent = '0:00';
  $('status').textContent = 'جارٍ التحميل…';
  try {
    const r = await fetch('audio.php?t=' + i, { headers: { 'X-Player': '1' }, cache: 'no-store' });
    if (r.status === 403) return location.reload();
    if (!r.ok) throw 0;
    const a = new Uint8Array(await r.arrayBuffer());
    for (let j = 0; j < a.length; j++) a[j] ^= KEY[j % KEY.length];
    const decoded = await ctx.decodeAudioData(a.buffer);
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
  off: { next: 'all', label: 'بدون تكرار', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z' },
  all: { next: 'one', label: 'تشغيل الكل بالتكرار', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z' },
  one: { next: 'off', label: 'تكرار الحرف', d: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z' },
};
let shuffle = false, repeat = 'off';
const backStack = []; // letters played before, so "previous" works in shuffle mode
try { shuffle = localStorage.getItem('shuffle') === '1'; repeat = REPEAT[localStorage.getItem('repeat')] ? localStorage.getItem('repeat') : 'off'; } catch {}

function renderModes() {
  $('shuffle').classList.toggle('on', shuffle);
  $('shuffle').ariaPressed = String(shuffle);
  $('repeat').classList.toggle('on', repeat !== 'off');
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

(function tick() {
  if (buf) $('cur').textContent = fmt(drag ?? pos());
  draw();
  requestAnimationFrame(tick);
})();

show(0, false); // no autoplay: browsers block audio before a click
