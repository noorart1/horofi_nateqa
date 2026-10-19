<?php
// Admin tool: when each half-line of a song's poem is sung, for the karaoke light on the card (lyrics.js).
// Play the song and tap the half-line on the picture as it starts (or "music only" when the singing stops); then save.
require __DIR__ . '/../lib.php';

$me = current_user();
if (!$me || !$me['is_admin']) {
    http_response_code(404);
    exit;
}
$_SESSION['csrf'] ??= bin2hex(random_bytes(16));
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
$db = db();
$files = tracks();
$t = min(max((int)($_GET['t'] ?? 0), 0), max(count($files) - 1, 0));

/** Cues from the admin, checked and rounded: [[seconds, half-line 0..3 or -1], …] in time order. Null if malformed. */
function clean_lyrics(string $json): ?array
{
    $in = json_decode($json, true);
    if (!is_array($in) || count($in) > 600) return null;
    $out = [];
    foreach ($in as $c) {
        if (!is_array($c) || count($c) !== 2 || !is_numeric($c[0] ?? null) || !is_int($c[1] ?? null) || $c[1] < -1 || $c[1] > 3) return null;
        $out[] = [round(min(max((float)$c[0], 0), 3600), 2), $c[1]];
    }
    usort($out, fn($a, $b) => $a[0] <=> $b[0]);
    return $out;
}

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $files) {
    if (!hash_equals($_SESSION['csrf'], (string)($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('Bad request');
    }
    $track = basename($files[$t]);
    $cues = clean_lyrics((string)($_POST['data'] ?? ''));
    if ($cues === null) $msg = 'Not saved: the data is invalid.';
    elseif (!$cues) {
        $db->prepare('DELETE FROM lyrics WHERE track = ?')->execute([$track]);
        $msg = 'This letter\'s timing was removed.';
    } else {
        $db->prepare('REPLACE INTO lyrics(track, data, updated) VALUES (?, ?, ?)')->execute([$track, json_encode($cues), gmdate(NOW)]);
        $msg = 'Timing saved (' . count($cues) . ' cues).';
    }
}
$saved = $db->query('SELECT track, data FROM lyrics')->fetchAll(PDO::FETCH_KEY_PAIR);
$cues = $files ? json_decode($saved[basename($files[$t])] ?? '[]') : [];
?>
<!doctype html>
<html lang="en-US" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poem timing</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<style>
.admin { width:100%; max-width:1100px; }
.bar-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-top h1 { font-size:1.3rem; margin:0; }
.bar-top a { color:var(--accent); text-decoration:none; }
.ok { background:#e7f5ec; color:#1e6b3c; padding:10px 12px; border-radius:10px; margin-bottom:16px; }
.picks { display:grid; grid-template-columns:repeat(auto-fill, minmax(70px, 1fr)); gap:6px; margin-bottom:16px; }
.picks a { display:block; text-align:center; text-decoration:none; color:var(--ink); background:var(--card); border:1px solid var(--line); border-radius:10px; padding:6px 4px; }
.picks a b { display:block; font-size:1.4rem; }
.picks a small { font-size:.7rem; color:var(--muted); }
.picks a.has small { color:#1e6b3c; }
.picks a.on { border-color:var(--accent); outline:2px solid var(--accent); }
.cols { display:grid; grid-template-columns:minmax(0, 440px) minmax(0, 1fr); gap:18px; align-items:start; }
@media (max-width:800px) { .cols { grid-template-columns:1fr; } }
.lyr-card { position:relative; aspect-ratio:1299 / 1594; border-radius:16px; overflow:hidden; background:#fff; border:1px solid var(--line); }
.lyr-card img { width:100%; height:100%; object-fit:contain; display:block; }
.lyr-card .lyr i { pointer-events:auto; cursor:pointer; outline:2px dashed #0070b255; outline-offset:-2px; }
.lyr-card .lyr i::after { content:attr(data-n); position:absolute; top:-10px; right:-6px; width:22px; height:22px; border-radius:50%; background:var(--blue); color:#fff;
  font:700 .8rem/22px Vazirmatn, sans-serif; text-align:center; font-style:normal; }
.lyr-card.rec .lyr i { outline-color:#c2261b99; }
.tools { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
.tools button { width:auto; margin:0; padding:10px 16px; }
.tools .rec.on { background:var(--err); box-shadow:0 5px 0 #8a1a12; }
audio { width:100%; }
table { width:100%; border-collapse:collapse; background:var(--card); border-radius:12px; overflow:hidden; font-size:.9rem; }
td, th { padding:5px 8px; border-bottom:1px solid var(--line); text-align:start; }
tr.now td { background:#fff6cc; }
td input { width:90px; padding:4px 6px; border-radius:8px; }
td select { padding:4px 6px; border-radius:8px; border:2px solid var(--line); font:inherit; }
td button { width:auto; margin:0; padding:4px 10px; font-size:.85rem; }
.list { max-height:420px; overflow:auto; border-radius:12px; border:1px solid var(--line); }
</style>
</head>
<body>
<main class="admin">
  <div class="bar-top"><h1>Poem timing</h1><a href="admin.php">Back to the admin panel</a></div>
  <?php if ($msg): ?><p class="ok" role="status"><?= $h($msg) ?></p><?php endif ?>
  <nav class="picks">
    <?php foreach ($files as $i => $f): ?>
      <a href="?t=<?= $i ?>" class="<?= $i === $t ? 'on' : '' ?> <?= isset($saved[basename($f)]) ? 'has' : '' ?>"><b lang="ar"><?= $h(track_glyph($f)) ?></b><small><?= isset($saved[basename($f)]) ? 'Timed' : '—' ?></small></a>
    <?php endforeach ?>
  </nav>
  <?php if ($files): ?>
  <div class="cols">
    <div>
      <div class="lyr-card" id="card"><img src="<?= $h(track_image($t, 1200)) ?>" alt=""><div class="lyr" id="lyr"></div></div>
    </div>
    <div>
      <p class="hint">1. Press Record (the song starts). 2. Tap each half-line on the picture the moment it starts being sung (or press 1–4), and Music only (or 0) when the singing stops. 3. Play from the start to preview, then Save.</p>
      <audio id="audio" controls preload="auto"></audio>
      <div class="tools">
        <button id="rec" class="btn rec">Record</button>
        <button id="quiet" class="btn alt">Music only</button>
        <button id="restart" class="btn alt">From the start</button>
        <button id="early" class="btn alt" title="All cues a tenth of a second earlier">−0.1 s</button>
        <button id="late" class="btn alt" title="All cues a tenth of a second later">+0.1 s</button>
        <button id="guess" class="btn alt">Rough guess</button>
        <button id="clear" class="btn alt">Clear all</button>
      </div>
      <form method="post" id="form">
        <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="data" id="data">
        <div class="tools"><button class="btn">Save</button></div>
      </form>
      <div class="list"><table><thead><tr><th>Time (s)</th><th>Half-line</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    </div>
  </div>
  <?php endif ?>
</main>
<?php if ($files): ?>
<script src="lyrics.js?v=<?= filemtime(__DIR__ . '/lyrics.js') ?>"></script>
<script>
const $ = id => document.getElementById(id), audio = $('audio');
const KEY = Uint8Array.from(atob('<?= base64_encode($_SESSION['key'] ?? '') ?>'), c => c.charCodeAt(0));
const LINE = ['1 (top right)', '2 (top left)', '3 (bottom right)', '4 (bottom left)'];
let cues = <?= json_encode($cues) ?>, recording = false, bytes = null;
lyricsBoxes($('lyr'));
lyricsPicture($('lyr'), document.querySelector('#card img').src);
[...$('lyr').children].forEach((b, k) => b.dataset.n = k + 1);

// the song comes scrambled with this session's key, like on the player page
fetch('audio.php?t=<?= $t ?>', { headers: { 'X-Player': '1' }, cache: 'no-store' }).then(r => r.arrayBuffer()).then(b => {
  bytes = new Uint8Array(b);
  for (let j = 0; j < bytes.length; j++) bytes[j] ^= KEY[j % KEY.length];
  audio.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
});

const sort = () => cues.sort((a, b) => a[0] - b[0]);
function rows() {
  $('rows').innerHTML = cues.map(([s, l], i) => `<tr data-i="${i}"><td><input type="number" step="0.05" min="0" value="${s}" data-f="t"></td>
    <td><select data-f="l"><option value="-1" ${l < 0 ? 'selected' : ''}>Music only</option>${LINE.map((n, k) => `<option value="${k}" ${k === l ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
    <td><button class="btn alt" data-go>▶</button> <button class="btn alt" data-del>Delete</button></td></tr>`).join('');
}
$('rows').onchange = e => {
  const i = +e.target.closest('tr').dataset.i, f = e.target.dataset.f;
  if (f === 't') cues[i][0] = Math.max(0, +e.target.value); else cues[i][1] = +e.target.value;
  sort(); rows();
};
$('rows').onclick = e => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i;
  if (e.target.hasAttribute('data-del')) { cues.splice(i, 1); rows(); }
  if (e.target.hasAttribute('data-go')) { audio.currentTime = Math.max(0, cues[i][0] - 1); audio.play(); }
};
// a cue at the moment of the tap
function mark(line) {
  if (!recording) return;
  const t = Math.round(audio.currentTime * 100) / 100;
  cues = cues.filter(c => Math.abs(c[0] - t) > 0.15); // a second tap on the same moment replaces it
  cues.push([t, line]); sort(); rows();
}
$('lyr').onclick = e => { const b = e.target.closest('i'); if (b) mark(+b.dataset.k); };
$('quiet').onclick = () => mark(-1);
addEventListener('keydown', e => {
  if (e.target.matches('input, select')) return;
  if (e.key >= '1' && e.key <= '4') mark(+e.key - 1);
  if (e.key === '0') mark(-1);
  if (e.key === ' ') { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
});
$('rec').onclick = () => {
  recording = !recording;
  $('rec').classList.toggle('on', recording); $('card').classList.toggle('rec', recording);
  $('rec').textContent = recording ? 'Stop recording' : 'Record';
  if (recording && audio.paused) audio.play();
};
$('restart').onclick = () => { audio.currentTime = 0; audio.play(); };
const shift = d => { cues.forEach(c => c[0] = Math.max(0, Math.round((c[0] + d) * 100) / 100)); rows(); };
$('early').onclick = () => shift(-0.1);
$('late').onclick = () => shift(0.1);
$('clear').onclick = () => { if (confirm('Clear all cues?')) { cues = []; rows(); } };
$('form').onsubmit = () => { $('data').value = JSON.stringify(cues); };

// a rough first guess: the song's sung phrases from the loudness of the voice band (200–3500 Hz), split where it
// dips, and the half-lines given in turn. The music is in the same band, so: a start to correct, never the answer.
$('guess').onclick = async () => {
  if (!bytes) return;
  if (cues.length && !confirm('The guess replaces the current cues. Continue?')) return;
  const ac = new AudioContext(), buf = await ac.decodeAudioData(bytes.slice().buffer), sr = 8000;
  const off = new OfflineAudioContext(1, Math.ceil(buf.duration * sr), sr), src = off.createBufferSource();
  const hp = off.createBiquadFilter(), lp = off.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 200; lp.type = 'lowpass'; lp.frequency.value = 3500;
  src.buffer = buf; src.connect(hp); hp.connect(lp); lp.connect(off.destination); src.start();
  const d = (await off.startRendering()).getChannelData(0), hop = sr / 20, env = [];
  for (let i = 0; i + hop <= d.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += d[j] * d[j]; env.push(Math.sqrt(s / hop)); }
  const sm = env.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 3); j <= Math.min(env.length - 1, i + 3); j++) { s += env[j]; n++; } return s / n; });
  const sorted = [...sm].sort((a, b) => a - b), low = sorted[Math.floor(sorted.length * 0.3)], loud = sorted[Math.floor(sorted.length * 0.6)];
  // a phrase starts where the voice band gets loud after a dip (a fifth of a second under the quiet level)
  const out = []; let k = 0, run = 0, dipped = true, sung = false;
  sm.forEach((v, i) => {
    const t = i / 20;
    if (v < low) {
      run++;
      if (run >= 4) dipped = true;
      if (run === 40 && sung) out.push([Math.round((t - 1.95) * 100) / 100, -1]); // two quiet seconds: music only
      return;
    }
    run = 0;
    if (v > loud && dipped && (!out.length || t - out[out.length - 1][0] > 1.2)) { out.push([Math.round(t * 100) / 100, k++ % 4]); dipped = false; sung = true; }
  });
  cues = out; rows(); ac.close();
};
rows();
(function frame() { // the preview: the card lights up with the song, and the row being sung is marked
  const t = audio.paused ? null : audio.currentTime;
  lyricsShow($('lyr'), cues, t);
  let n = -1; if (t != null) cues.forEach((c, i) => { if (c[0] <= t) n = i; });
  [...$('rows').children].forEach((tr, i) => tr.classList.toggle('now', i === n));
  requestAnimationFrame(frame);
})();
</script>
<?php endif ?>
</body>
</html>
