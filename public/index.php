<?php
require __DIR__ . '/../lib.php';

function login_as(int $id): never
{
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    $_SESSION['key'] = random_bytes(32);
    header('Location: ./');
    exit;
}

// Persian/Arabic digits → Latin, so codes typed on a Persian keyboard still match.
function latin_digits(string $s): string
{
    return strtr($s, ['۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']);
}

$err = '';
$action = $_POST['action'] ?? '';
$tab = $action === 'register' ? 'register' : 'login';
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($action === 'logout') {
    session_destroy();
    header('Location: ./');
    exit;
} elseif (($action === 'login' || $action === 'register') && too_many_fails()) {
    $err = 'تعداد تلاش‌های ناموفق زیاد است. یک ساعت دیگر دوباره امتحان کنید.';
} elseif ($action === 'login') {
    $s = db()->prepare('SELECT id, pass FROM users WHERE username = ?');
    $s->execute([$username]);
    $u = $s->fetch();
    if ($u && password_verify($password, $u['pass'])) login_as((int)$u['id']);
    record_fail();
    $err = 'نام کاربری یا رمز عبور اشتباه است.';
} elseif ($action === 'register') {
    $code = trim(latin_digits($_POST['code'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9_.-]{3,32}$/', $username)) {
        $err = 'نام کاربری باید ۳ تا ۳۲ حرف انگلیسی، عدد یا _ . - باشد.';
    } elseif (strlen($password) < 6) {
        $err = 'رمز عبور حداقل ۶ کاراکتر باشد.';
    } else {
        $db = db();
        $db->exec('BEGIN IMMEDIATE');
        $s = $db->prepare('SELECT 1 FROM codes WHERE code = ? AND user_id IS NULL');
        $s->execute([$code]);
        if (!$s->fetchColumn()) {
            $db->exec('ROLLBACK');
            record_fail();
            $err = 'کد لایسنس نامعتبر است یا قبلاً استفاده شده.';
        } else {
            $s = $db->prepare('SELECT 1 FROM users WHERE username = ?');
            $s->execute([$username]);
            if ($s->fetchColumn()) {
                $db->exec('ROLLBACK');
                $err = 'این نام کاربری قبلاً گرفته شده.';
            } else {
                $db->prepare('INSERT INTO users(username, pass) VALUES (?, ?)')->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
                $id = (int)$db->lastInsertId();
                $db->prepare('UPDATE codes SET user_id = ? WHERE code = ?')->execute([$id, $code]);
                $db->exec('COMMIT');
                login_as($id);
            }
        }
    }
}

$logged = !empty($_SESSION['uid']);
if ($logged) {
    $s = db()->prepare('SELECT username FROM users WHERE id = ?');
    $s->execute([$_SESSION['uid']]);
    $me = $s->fetchColumn();
    if ($me === false) { // user was deleted: end the stale session
        session_destroy();
        header('Location: ./');
        exit;
    }
    $list = [];
    foreach (tracks() as $i => $f) $list[] = ['title' => track_title($f), 'glyph' => track_glyph($f), 'img' => track_image($i)];
}
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
?>
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>حروف ناطقه</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root { --bg:#f5f1ea; --card:#fffdf9; --ink:#2b2622; --muted:#7a7068; --accent:#1f6f5c; --line:#e4ddd2; --err:#b3261e; }
* { box-sizing:border-box; }
body { margin:0; min-height:100vh; background:var(--bg); color:var(--ink); font-family:Vazirmatn, Tahoma, sans-serif; display:flex; justify-content:center; padding:24px 16px; }
.card { width:100%; max-width:440px; background:var(--card); border:1px solid var(--line); border-radius:18px; padding:24px; align-self:flex-start; }
h1 { font-size:1.3rem; margin:0 0 16px; text-align:center; }
.tabs { display:flex; gap:6px; background:var(--bg); padding:4px; border-radius:12px; margin-bottom:18px; }
.tabs button { flex:1; border:0; background:none; padding:9px; border-radius:9px; font:inherit; color:var(--muted); cursor:pointer; }
.tabs button.on { background:var(--card); color:var(--ink); font-weight:600; box-shadow:0 1px 3px #0001; }
label { display:block; font-size:.9rem; margin:12px 0 6px; color:var(--muted); }
input { width:100%; padding:11px 12px; border:1px solid var(--line); border-radius:10px; font:inherit; background:#fff; }
input:focus { outline:2px solid var(--accent); border-color:transparent; }
.btn { width:100%; margin-top:18px; padding:12px; border:0; border-radius:10px; background:var(--accent); color:#fff; font:inherit; font-weight:600; cursor:pointer; }
.err { background:#fbe9e7; color:var(--err); padding:10px 12px; border-radius:10px; font-size:.9rem; }
[hidden] { display:none !important; }
/* player */
.player-page { width:100%; max-width:760px; align-self:flex-start; }
.top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; color:var(--muted); font-size:.9rem; }
.top button { border:0; background:none; color:var(--sc); font:inherit; cursor:pointer; }
.cover { width:100%; height:auto; border-radius:6px; display:block; background:#ddd; user-select:none; -webkit-user-drag:none; pointer-events:none; box-shadow:0 6px 24px #0002; }
/* SoundCloud-like player */
:root { --sc:#ff5500; }
.sc { background:#fff; border:1px solid #e5e5e5; border-radius:6px; margin-top:14px; padding:16px; direction:ltr; }
.sc-head { display:flex; align-items:center; gap:14px; }
.sc-play { flex:none; width:56px; height:56px; border-radius:50%; border:0; background:var(--sc); color:#fff; cursor:pointer; display:grid; place-items:center; transition:transform .1s; }
.sc-play:hover { transform:scale(1.05); }
.sc-play svg { width:26px; height:26px; fill:currentColor; }
.sc-meta { min-width:0; flex:1; text-align:right; direction:rtl; }
.sc-artist { font-size:.8rem; color:#999; }
.sc-title { font-size:1.15rem; font-weight:700; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sc-skip { display:flex; gap:4px; }
.sc-skip button { border:0; background:none; color:#333; cursor:pointer; padding:6px; border-radius:50%; }
.sc-skip button:hover { background:#f2f2f2; }
.sc-skip svg { width:20px; height:20px; fill:currentColor; display:block; }
.wave { position:relative; height:80px; margin-top:14px; cursor:pointer; touch-action:none; }
.wave canvas { width:100%; height:100%; display:block; }
.wave .t { position:absolute; top:28px; font-size:.7rem; padding:1px 4px; background:#111c; font-variant-numeric:tabular-nums; pointer-events:none; }
.wave .t.l { left:0; color:var(--sc); } .wave .t.r { right:0; color:#ccc; }
.status { text-align:center; color:#999; font-size:.8rem; min-height:1.2em; margin-top:6px; }
/* letter grid */
.letters-head { display:flex; justify-content:space-between; align-items:baseline; margin:22px 2px 10px; }
.letters-head h2 { font-size:1rem; margin:0; }
.letters-head span { font-size:.8rem; color:#999; }
.letters { display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; }
@media (max-width:560px) { .letters { grid-template-columns:repeat(4, 1fr); } }
.letter { position:relative; aspect-ratio:1 / 1.1; border:1px solid #e8e8e8; background:#fff; border-radius:12px; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:0; font:inherit; color:#333;
  transition:transform .12s, border-color .12s, box-shadow .12s; }
.letter:hover { border-color:var(--sc); transform:translateY(-2px); box-shadow:0 4px 12px #ff550022; }
.letter:focus-visible { outline:2px solid var(--sc); outline-offset:2px; }
.letter .g { font-size:2rem; font-weight:700; line-height:1.1; }
.letter .n { font-size:.72rem; color:#999; }
.letter .num { position:absolute; top:5px; right:7px; font-size:.62rem; color:#bbb; }
.letter.done::after { content:'✓'; position:absolute; top:4px; left:7px; font-size:.7rem; color:#2e9e5b; }
.letter.on { background:var(--sc); border-color:var(--sc); color:#fff; box-shadow:0 6px 16px #ff550044; }
.letter.on .n, .letter.on .num, .letter.on.done::after { color:#fffd; }
.eq { display:none; position:absolute; bottom:6px; gap:2px; height:10px; align-items:flex-end; }
.letter.on .eq { display:flex; }
.eq i { width:3px; height:30%; background:currentColor; border-radius:1px; }
.playing .letter.on .eq i { animation:eq .8s ease-in-out infinite alternate; }
.eq i:nth-child(2) { animation-delay:-.3s !important; } .eq i:nth-child(3) { animation-delay:-.55s !important; }
@keyframes eq { from { height:20%; } to { height:100%; } }
@media (prefers-reduced-motion:reduce) { .letter, .playing .letter.on .eq i { transition:none; animation:none; } }
</style>
</head>
<body>
<?php if (!$logged): ?>
<main class="card">
  <h1>حروف ناطقه</h1>
  <div class="tabs">
    <button type="button" data-tab="login" class="<?= $tab === 'login' ? 'on' : '' ?>">ورود</button>
    <button type="button" data-tab="register" class="<?= $tab === 'register' ? 'on' : '' ?>">ثبت‌نام با کد لایسنس</button>
  </div>
  <?php if ($err): ?><p class="err" role="alert"><?= $h($err) ?></p><?php endif ?>
  <form method="post" id="login" <?= $tab === 'login' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="login">
    <label for="lu">نام کاربری</label><input id="lu" name="username" dir="ltr" autocomplete="username" required value="<?= $tab === 'login' ? $h($username) : '' ?>">
    <label for="lp">رمز عبور</label><input id="lp" name="password" type="password" dir="ltr" autocomplete="current-password" required>
    <button class="btn">ورود</button>
  </form>
  <form method="post" id="register" <?= $tab === 'register' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="register">
    <label for="rc">کد لایسنس</label><input id="rc" name="code" dir="ltr" inputmode="numeric" autocomplete="off" required value="<?= $h($_POST['code'] ?? '') ?>">
    <label for="ru">نام کاربری (انگلیسی)</label><input id="ru" name="username" dir="ltr" autocomplete="username" required pattern="[A-Za-z0-9_.\-]{3,32}" value="<?= $tab === 'register' ? $h($username) : '' ?>">
    <label for="rp">رمز عبور (حداقل ۶ کاراکتر)</label><input id="rp" name="password" type="password" dir="ltr" autocomplete="new-password" minlength="6" required>
    <button class="btn">ساخت حساب</button>
  </form>
</main>
<script>
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  document.getElementById('login').hidden = b.dataset.tab !== 'login';
  document.getElementById('register').hidden = b.dataset.tab !== 'register';
});
</script>
<?php else: ?>
<main class="player-page" oncontextmenu="return false">
  <div class="top">
    <span><?= $h($me) ?></span>
    <form method="post"><input type="hidden" name="action" value="logout"><button>خروج</button></form>
  </div>
  <img class="cover" id="cover" alt="" draggable="false">
  <section class="sc">
    <div class="sc-head">
      <button id="play" class="sc-play" aria-label="پخش"><svg viewBox="0 0 24 24"><path id="icon" d="M8 5v14l11-7z"/></svg></button>
      <div class="sc-skip">
        <button id="prev" aria-label="قبلی"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
        <button id="next" aria-label="بعدی"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z"/></svg></button>
      </div>
      <div class="sc-meta"><div class="sc-artist">حروف ناطقه</div><div class="sc-title" id="title"></div></div>
    </div>
    <div class="wave" id="wave" role="slider" aria-label="موقعیت" tabindex="0">
      <canvas id="cv"></canvas>
      <span class="t l" id="cur">0:00</span><span class="t r" id="dur">0:00</span>
    </div>
    <div class="status" id="status"></div>
  </section>
  <div class="letters-head"><h2>حروف</h2><span id="progress"></span></div>
  <div class="letters" id="list"></div>
</main>
<script>
const TRACKS = <?= json_encode($list, JSON_UNESCAPED_UNICODE) ?>;
const KEY = Uint8Array.from(atob('<?= base64_encode($_SESSION['key']) ?>'), c => c.charCodeAt(0));
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
  $('progress').textContent = `${done.size.toLocaleString('fa')} از ${TRACKS.length.toLocaleString('fa')} شنیده شده`;
}

TRACKS.forEach((t, i) => {
  const b = document.createElement('button');
  b.className = 'letter';
  b.ariaLabel = t.title;
  b.innerHTML = '<span class="num"></span><span class="g"></span><span class="n"></span><span class="eq"><i></i><i></i><i></i></span>';
  b.querySelector('.num').textContent = (i + 1).toLocaleString('fa');
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
  src.onended = () => { playing = false; offset = 0; setIcon(); markDone(cur); if (cur < TRACKS.length - 1) load(cur + 1); };
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
  $('play').ariaLabel = playing ? 'توقف' : 'پخش';
  $('list').classList.toggle('playing', playing);
}

function show(i) {
  cur = i;
  $('title').textContent = TRACKS[i]?.title ?? '';
  $('cover').src = TRACKS[i]?.img ?? '';
  [...$('list').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.ariaCurrent = j === i ? 'true' : null; });
}

async function load(i) {
  ctx ??= new AudioContext();
  ctx.resume();
  const id = ++loadId;
  pause();
  buf = null; peaks = null; offset = 0;
  show(i);
  $('dur').textContent = '0:00';
  $('status').textContent = 'در حال بارگذاری…';
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
    if (id === loadId) $('status').textContent = 'خطا در بارگذاری صدا';
  }
}

$('play').onclick = () => playing ? pause() : play();
$('prev').onclick = () => load(cur > 0 ? cur - 1 : 0);
$('next').onclick = () => load(Math.min(cur + 1, TRACKS.length - 1));

(function tick() {
  if (buf) $('cur').textContent = fmt(drag ?? pos());
  draw();
  requestAnimationFrame(tick);
})();

show(0); // no autoplay: browsers block audio before a click
</script>
<?php endif ?>
</body>
</html>
