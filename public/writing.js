// Writing practice, guided mode: the child follows each recorded stroke station by station.
// Uses player.js (TRACKS, cur, $, select, pause, fetchTrack, buf, ctx) and guide.js.
const STEP = 0.06, TOL = 0.09; // station spacing and "close enough", in widths of the pad

let W = null; // current exercise: { i, strokes, stations, si, filled, ink, errors, total, active, done }
let stopAnim = null, voice = null;

// stations every STEP along a stroke; a dot stays one station
function resample(pts) {
  const out = [pts[0]];
  let carry = 0;
  for (let k = 1; k < pts.length; k++) {
    let [ax, ay] = pts[k - 1];
    const [bx, by] = pts[k];
    let d = Math.hypot(bx - ax, by - ay);
    while (carry + d >= STEP) {
      const f = (STEP - carry) / d;
      ax += (bx - ax) * f; ay += (by - ay) * f;
      out.push([ax, ay]);
      d = Math.hypot(bx - ax, by - ay);
      carry = 0;
    }
    carry += d;
  }
  if (pts.length > 1) {
    if (out.length > 1 && carry < STEP * 0.3) out[out.length - 1] = pts.at(-1);
    else out.push(pts.at(-1));
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function distToPath(p, pts) {
  if (pts.length === 1) return dist(p, pts[0]);
  let best = Infinity;
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1], [bx, by] = pts[k], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const f = L ? Math.min(Math.max(((p[0] - ax) * dx + (p[1] - ay) * dy) / L, 0), 1) : 0;
    best = Math.min(best, Math.hypot(p[0] - ax - dx * f, p[1] - ay - dy * f));
  }
  return best;
}

// --- drawing ---
const pad = $('wPad'), pg = pad.getContext('2d');

function render(anim) {
  const S = pad.width;
  pg.clearRect(0, 0, S, S);
  guideGlyph(pg, TRACKS[W.i].glyph, S, '#dcedf7');
  pg.lineCap = pg.lineJoin = 'round';
  // every stroke as a dotted path
  pg.setLineDash([S * 0.004, S * 0.025]);
  pg.lineWidth = S * 0.016; pg.strokeStyle = '#7fb3cf';
  W.strokes.forEach(s => guideLine(pg, s, S));
  pg.setLineDash([]);
  if (anim) { // the "watch" animation
    pg.lineWidth = S * 0.045; pg.strokeStyle = '#0070b2';
    anim.forEach(s => guideLine(pg, s, S));
    return;
  }
  // the part already written, along the stations
  pg.lineWidth = S * 0.045; pg.strokeStyle = '#0070b2';
  W.stations.forEach((st, k) => {
    if (k < W.si) guideLine(pg, st, S);
    else if (k === W.si && W.filled >= 0) guideLine(pg, st.slice(0, W.filled + 1), S);
  });
  // the child's real finger line
  pg.lineWidth = S * 0.018; pg.strokeStyle = '#f14a2699';
  W.ink.forEach(l => guideLine(pg, l, S));
  if (!W.done) marker(S);
}

// green circle where to put the finger next, with an arrow toward the following station
function marker(S) {
  const st = W.stations[W.si], k = Math.max(W.filled, 0), [x, y] = st[k], r = S * 0.035;
  pg.fillStyle = '#2e9e5b';
  pg.beginPath(); pg.arc(x * S, y * S, r, 0, 2 * Math.PI); pg.fill();
  const to = st[k + 1];
  if (!to) return;
  const a = Math.atan2(to[1] - y, to[0] - x), tip = r * 2.4;
  pg.save();
  pg.translate(x * S, y * S); pg.rotate(a);
  pg.strokeStyle = pg.fillStyle = '#2e9e5b'; pg.lineWidth = S * 0.008;
  pg.beginPath(); pg.moveTo(r * 1.2, 0); pg.lineTo(tip - r * 0.5, 0); pg.stroke();
  pg.beginPath(); pg.moveTo(tip, 0); pg.lineTo(tip - r * 0.7, -r * 0.45); pg.lineTo(tip - r * 0.7, r * 0.45); pg.fill();
  pg.restore();
}

function resize() {
  if (!W) return;
  pad.width = pad.height = Math.round(pad.clientWidth * (devicePixelRatio || 1));
  render();
}
addEventListener('resize', resize);

// --- open / watch / reset ---
async function openWriting(i) {
  if (playing) pause();
  hushAnim();
  ctx ??= new AudioContext(); ctx.resume(); // inside the click, so the letter's voice may play later (iOS)
  $('wTitle').textContent = `اكتب حرف ${TRACKS[i].title}`;
  $('wMsg').textContent = 'جارٍ التحميل…';
  if (!$('writing').open) { $('writing').showModal(); openPad(pad); }
  try {
    const r = await fetch('strokes.php?t=' + i, { headers: { 'X-Player': '1' }, cache: 'no-store' });
    if (r.status === 403) return location.reload();
    if (!r.ok) throw 0;
    const strokes = await r.json();
    await guideFontReady(TRACKS[i].glyph);
    W = { i, strokes, stations: strokes.map(resample) };
    reset();
    resize();
    watch();
  } catch {
    $('wMsg').textContent = 'تعذّر تحميل المسار';
  }
}

function reset() {
  stopAnim?.(); stopAnim = null;
  Object.assign(W, { si: 0, filled: -1, ink: [], errors: 0, total: 0, active: false, done: false });
  $('wRetry').hidden = $('wNext').hidden = true;
  $('wMsg').textContent = 'ضع إصبعك على الدائرة الخضراء';
  render();
}

function watch() {
  reset();
  $('wMsg').textContent = 'شاهد كيف يُكتب الحرف';
  stopAnim = guideAnimate(W.strokes, render, () => {
    stopAnim = null;
    $('wMsg').textContent = 'ضع إصبعك على الدائرة الخضراء';
    render();
  });
}

function closeWriting() {
  stopAnim?.(); stopAnim = null;
  try { voice?.stop(); } catch {}
  W = null;
}

// --- guided writing ---
const at = e => [e.offsetX / pad.clientWidth, e.offsetY / pad.clientWidth];
let pointer = null;

pad.onpointerdown = e => {
  if (!W || W.done || pointer !== null) return;
  if (stopAnim) { stopAnim(); stopAnim = null; } // a touch ends the demo
  const p = at(e), st = W.stations[W.si];
  if (dist(p, st[Math.max(W.filled, 0)]) > TOL) { // must start (or resume) on the green circle
    $('wMsg').textContent = 'ابدأ من الدائرة الخضراء';
    return render();
  }
  pointer = e.pointerId;
  pad.setPointerCapture(e.pointerId);
  W.active = true;
  W.ink.push([p]);
  if (W.filled < 0) W.filled = 0;
  $('wMsg').textContent = '';
  advance(p);
};

pad.onpointermove = e => {
  if (!W?.active || e.pointerId !== pointer) return;
  const p = at(e);
  W.ink.at(-1).push(p);
  W.total++;
  if (distToPath(p, W.strokes[W.si]) > 2 * TOL) W.errors++;
  advance(p);
};

pad.onpointerup = pad.onpointercancel = e => {
  if (e.pointerId !== pointer) return;
  pointer = null;
  if (W) W.active = false; // progress on an unfinished stroke stays; the child resumes from the circle
};

// fill the next station(s) in order once the finger is close; no skipping ahead
function advance(p) {
  const st = W.stations[W.si];
  while (W.filled + 1 < st.length && dist(p, st[W.filled + 1]) < TOL) W.filled++;
  if (W.filled === st.length - 1) {
    const r = pad.getBoundingClientRect(), [ex, ey] = st.at(-1);
    if (W.si < W.stations.length - 1) strokeSparkle(r.left + ex * r.width, r.top + ey * r.width); // the last one gets the big party
    W.si++; W.filled = -1; W.active = false; pointer = null; // next stroke starts with a new touch
    if (W.si === W.stations.length) return finish();
  }
  render();
}

function finish() {
  W.done = true;
  render();
  const ratio = W.total ? W.errors / W.total : 0, stars = ratio < 0.1 ? 3 : ratio < 0.25 ? 2 : 1;
  $('wMsg').innerHTML = `<span class="stars">${`<b>${STAR}</b>`.repeat(stars)}</span><br>`;
  $('wMsg').append(['', 'أحسنت! حاول مرة أخرى لتحصل على نجوم أكثر', 'جيد جدًا!', 'ممتاز!'][stars]);
  celebrateWriting($('wMsg').querySelectorAll('.stars b'), pad, stars);
  $('wRetry').hidden = false;
  $('wNext').hidden = nextWritable() < 0;
  say(W.i);
  const t = TRACKS[W.i];
  if (stars > t.stars) { t.stars = stars; renderStars(); }
  fetch('writing.php', { method: 'POST', headers: { 'X-Player': '1' }, body: new URLSearchParams({ t: W.i, stars }) });
}

// the letter's own recording, through player.js (reuses the loaded one when it is the current letter)
async function say(i) {
  try {
    const b = i === cur && buf ? buf : await fetchTrack(i);
    try { voice?.stop(); } catch {}
    voice = ctx.createBufferSource();
    voice.buffer = b;
    voice.connect(ctx.destination);
    ctx.resume();
    voice.start();
  } catch {}
}

function nextWritable() {
  for (let k = 1; k < TRACKS.length; k++) {
    const j = (W.i + k) % TRACKS.length;
    if (TRACKS[j].strokes) return j;
  }
  return -1;
}

function renderStars() {
  [...$('list').children].forEach((b, j) => {
    const n = TRACKS[j].stars;
    b.querySelector('.w').innerHTML = '<i></i>'.repeat(n); // small stars drawn in CSS
    b.querySelector('.w').ariaLabel = n ? `الكتابة: ${n.toLocaleString('ar')} من ٣ نجوم` : null;
  });
}

$('writeBtn').onclick = () => openWriting(cur);
$('wWatch').onclick = () => W && watch();
$('wRetry').onclick = () => W && reset();
$('wNext').onclick = () => {
  const j = nextWritable();
  try { voice?.stop(); } catch {}
  select(j);
  openWriting(j);
};
$('wClose').onclick = () => $('writing').close();
$('writing').onclose = closeWriting;
renderStars();
