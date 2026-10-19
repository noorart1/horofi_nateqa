<?php
// Admin tool: record the stroke paths of each letter for the writing practice (see guide.js for the coordinates).
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

/** Strokes JSON from the admin, checked and rounded; [] means "remove". Null if malformed. */
function clean_strokes(string $json): ?array
{
    $in = json_decode($json, true);
    if (!is_array($in) || count($in) > 30) return null;
    $out = [];
    foreach ($in as $stroke) {
        if (!is_array($stroke) || !$stroke || count($stroke) > 500) return null;
        $pts = [];
        foreach ($stroke as $p) {
            if (!is_array($p) || count($p) !== 2 || !is_numeric($p[0] ?? null) || !is_numeric($p[1] ?? null)) return null;
            $pts[] = [round(min(max((float)$p[0], 0), 1), 3), round(min(max((float)$p[1], 0), 1), 3)];
        }
        $out[] = $pts;
    }
    return $out;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '') || !isset($files[$t])) {
        http_response_code(400);
        exit;
    }
    $strokes = clean_strokes($_POST['data'] ?? '');
    if ($strokes === null) {
        $_SESSION['flash'] = 'Invalid stroke data.';
    } elseif (!$strokes) {
        $db->prepare('DELETE FROM strokes WHERE track = ?')->execute([basename($files[$t])]);
        $_SESSION['flash'] = 'The letter\'s strokes were removed.';
    } else {
        $db->prepare('REPLACE INTO strokes(track, data, updated) VALUES (?, ?, ?)') // REPLACE works in MySQL and SQLite
            ->execute([basename($files[$t]), json_encode($strokes), gmdate(NOW)]);
        $_SESSION['flash'] = 'The letter\'s strokes were saved.';
    }
    header("Location: admin_strokes.php?t=$t");
    exit;
}
$msg = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
$saved = $db->query('SELECT track, data FROM strokes')->fetchAll(PDO::FETCH_KEY_PAIR);
$cur = isset($files[$t]) ? $files[$t] : null;
?>
<!doctype html>
<html lang="en-US" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Writing strokes</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<style>
.admin { width:100%; max-width:1000px; }
.bar-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-top h1 { font-size:1.3rem; margin:0; }
.bar-top a { color:var(--accent); text-decoration:none; }
.ok { background:#e7f5ec; color:#1e6b3c; padding:10px 12px; border-radius:10px; margin-bottom:16px; }
.cols { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 480px); gap:16px; align-items:start; }
@media (max-width:760px) { .cols { grid-template-columns:1fr; } }
.picks { display:grid; grid-template-columns:repeat(auto-fill, minmax(84px, 1fr)); gap:8px; }
.picks a { display:block; text-align:center; text-decoration:none; color:var(--ink); background:var(--card); border:1px solid var(--line); border-radius:10px; padding:8px 4px; }
.picks a b { display:block; font-size:1.6rem; }
.picks a small { font-size:.72rem; color:var(--muted); }
.picks a.has small { color:#1e6b3c; }
.picks a.on { border-color:var(--accent); outline:2px solid var(--accent); }
.pad { background:#fff; border:1px solid var(--line); border-radius:12px; aspect-ratio:1; width:100%; display:block; touch-action:none; cursor:crosshair; }
.tools { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.tools button { flex:1; width:auto; margin:0; padding:10px; }
.tools .alt { background:var(--bg); color:var(--ink); }
.hint { margin:8px 0 0; }
.snap { display:flex; gap:8px; align-items:center; color:var(--ink); }
.snap input { width:auto; }
</style>
</head>
<body>
<main class="admin">
  <div class="bar-top"><h1>Writing strokes</h1><a href="admin.php">Back to the admin panel</a></div>
  <?php if ($msg): ?><p class="ok" role="status"><?= $h($msg) ?></p><?php endif ?>
  <div class="cols">
    <nav class="picks">
      <?php foreach ($files as $i => $f): $has = isset($saved[basename($f)]); ?>
      <a href="?t=<?= $i ?>" class="<?= $has ? 'has' : '' ?> <?= $i === $t ? 'on' : '' ?>"<?= $i === $t ? ' aria-current="true"' : '' ?>>
        <b lang="ar"><?= $h(track_glyph($f)) ?></b><span lang="ar"><?= $h(track_title($f)) ?></span><br><small><?= $has ? 'Recorded' : 'Not recorded' ?></small>
      </a>
      <?php endforeach ?>
    </nav>
    <?php if ($cur): ?>
    <section>
      <canvas id="pad" class="pad" aria-label="Draw the letter's strokes in order"></canvas>
      <p class="hint">Draw the strokes in writing order: the body of the letter first, then the dots, each dot with a single tap.</p>
      <label class="snap"><input type="checkbox" id="snap" checked> Auto-correct: a rough drawing is enough, the line is moved to the middle of the letter</label>
      <form method="post" class="tools" id="save">
        <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>">
        <input type="hidden" name="data" id="data">
        <button type="button" class="btn alt" id="undo">Undo</button>
        <button type="button" class="btn alt" id="clear">Clear</button>
        <button type="button" class="btn alt" id="preview">Preview</button>
        <button type="button" class="btn alt" id="fix" title="Move the drawn strokes to the middle of the letter (saved only when you press Save)">Correct</button>
        <button class="btn">Save</button>
      </form>
    </section>
    <?php endif ?>
  </div>
</main>
<?php if ($cur): ?>
<script src="guide.js?v=<?= filemtime(__DIR__ . '/guide.js') ?>"></script>
<script>
const GLYPH = <?= json_encode(track_glyph($cur), JSON_UNESCAPED_UNICODE) ?>;
let strokes = <?= $saved[basename($cur)] ?? '[]' ?>, live = null, stopAnim = null;
const pad = document.getElementById('pad'), g = pad.getContext('2d');
const MIN_GAP = 0.02; // keep points about 2% of the box apart

function render(list = strokes) {
  const S = pad.width;
  g.clearRect(0, 0, S, S);
  guideGlyph(g, GLYPH, S, '#e9e4dc');
  if (snapOn()) { // the centreline that strokes snap to
    g.fillStyle = '#c8bfb3';
    for (const i of skel) g.fillRect((i % N) * S / N, ((i / N) | 0) * S / N, S / N, S / N);
  }
  g.lineCap = g.lineJoin = 'round';
  g.lineWidth = S * 0.025; g.strokeStyle = '#0070b2';
  list.forEach(s => guideLine(g, s, S));
  if (live) { g.strokeStyle = '#f14a26'; guideLine(g, live, S); }
  // stroke numbers at each start, so the order is visible
  g.font = `700 ${S * 0.035}px Vazirmatn, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  list.forEach((s, k) => {
    g.fillStyle = '#f14a26'; g.beginPath(); g.arc(s[0][0] * S, s[0][1] * S, S * 0.025, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillText(String(k + 1), s[0][0] * S, s[0][1] * S);
  });
}
function resize() { pad.width = pad.height = Math.round(pad.clientWidth * (devicePixelRatio || 1)); render(); }
const at = e => [Math.min(Math.max(e.offsetX / pad.clientWidth, 0), 1), Math.min(Math.max(e.offsetY / pad.clientWidth, 0), 1)];
const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) >= MIN_GAP;

pad.onpointerdown = e => {
  if (live) return;
  stopAnim?.();
  pad.setPointerCapture(e.pointerId);
  live = [at(e)];
  render();
};
pad.onpointermove = e => {
  if (!live) return;
  const p = at(e);
  if (far(p, live.at(-1))) { live.push(p); render(); }
};
pad.onpointerup = pad.onpointercancel = e => {
  if (!live) return;
  const p = at(e);
  // end exactly where the finger lifted (a tap stays a single-point dot)
  if (live.length > 1) live[live.length - 1] = p; else if (far(p, live[0])) live.push(p);
  strokes.push(tidy(live).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]));
  live = null;
  render();
};
// --- snap to the letter's centreline, so a shaky hand still records a clean path ---
// The admin gives the order and direction; the font gives the exact shape.
const N = 200; // centreline grid, in cells per box side
let skel = [], near = null; // centreline cells; nearest centreline cell of every cell
const snapOn = () => document.getElementById('snap').checked;
document.getElementById('snap').onchange = () => render();

function buildCentreline() {
  const c = new OffscreenCanvas(N, N), x = c.getContext('2d');
  guideGlyph(x, GLYPH, N, '#000');
  const a = x.getImageData(0, 0, N, N).data, m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = a[i * 4 + 3] > 127 ? 1 : 0;
  thin(m);
  near = new Int32Array(N * N).fill(-1);
  const q = [];
  for (let i = 0; i < N * N; i++) if (m[i]) { near[i] = i; q.push(i); }
  skel = q.slice();
  for (let h = 0; h < q.length; h++) { // breadth-first from every centreline cell at once
    const i = q[h], x0 = i % N, y0 = (i / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x1 = x0 + dx, y1 = y0 + dy, j = y1 * N + x1;
      if (x1 >= 0 && y1 >= 0 && x1 < N && y1 < N && near[j] < 0) { near[j] = near[i]; q.push(j); }
    }
  }
}

// Zhang–Suen thinning: peel the letter's outline until a 1-cell-wide centreline is left
function thin(m) {
  const P = (x, y) => m[y * N + x];
  for (let changed = true; changed;) {
    changed = false;
    for (const pass of [0, 1]) {
      const del = [];
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
        if (!P(x, y)) continue;
        const p = [P(x, y - 1), P(x + 1, y - 1), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1), P(x - 1, y + 1), P(x - 1, y), P(x - 1, y - 1)];
        const b = p.reduce((s, v) => s + v, 0);
        if (b < 2 || b > 6) continue;
        let t = 0;
        for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) t++;
        if (t !== 1) continue;
        if (pass ? p[0] * p[2] * p[6] || p[0] * p[4] * p[6] : p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) continue;
        del.push(y * N + x);
      }
      for (const i of del) m[i] = 0;
      changed ||= del.length > 0;
    }
  }
}

const smooth = (pts, r) => pts.map((p, i) => {
  if (i === 0 || i === pts.length - 1) return p;
  const w = pts.slice(Math.max(0, i - r), i + r + 1);
  return [w.reduce((s, q) => s + q[0], 0) / w.length, w.reduce((s, q) => s + q[1], 0) / w.length];
});

// shaky stroke → smoothed, pulled onto the centreline (when within 10% of it), about 2% apart
function tidy(pts) {
  if (!snapOn() || !near) return pts;
  const snapped = smooth(pts, 3).map(p => {
    const cx = Math.min(Math.max(Math.floor(p[0] * N), 0), N - 1), cy = Math.min(Math.max(Math.floor(p[1] * N), 0), N - 1);
    const j = near[cy * N + cx];
    if (j < 0) return p;
    const q = [(j % N + 0.5) / N, (((j / N) | 0) + 0.5) / N];
    return Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.1 ? q : p;
  });
  const out = [snapped[0]];
  for (const p of snapped.slice(1)) if (far(p, out.at(-1))) out.push(p);
  if (snapped.length > 1 && out.length === 1) out.push(snapped.at(-1));
  return smooth(out, 1);
}

document.getElementById('undo').onclick = () => { stopAnim?.(); strokes.pop(); render(); };
document.getElementById('clear').onclick = () => { stopAnim?.(); strokes = []; render(); };
document.getElementById('fix').onclick = () => {
  stopAnim?.();
  const was = document.getElementById('snap').checked;
  document.getElementById('snap').checked = true;
  strokes = strokes.map(s => tidy(s).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]));
  document.getElementById('snap').checked = was;
  render();
};
document.getElementById('preview').onclick = () => {
  stopAnim?.();
  stopAnim = guideAnimate(strokes, render, () => render());
};
document.getElementById('save').onsubmit = () => { document.getElementById('data').value = JSON.stringify(strokes); };
addEventListener('resize', resize);
guideFontReady(GLYPH).then(() => { buildCentreline(); resize(); });
</script>
<?php endif ?>
</body>
</html>
