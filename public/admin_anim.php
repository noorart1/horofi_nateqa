<?php
// Admin tool: upload each letter's living picture (the JSON file exported by the owner's editor, see clean_anim).
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
$track = isset($files[$t]) ? basename($files[$t]) : '';

/** Why the file doesn't fit this letter's picture on the site (the editor's page has another shape), or null. */
function page_mismatch(array $anim, int $t): ?string
{
    $img = track_image_file($t);
    [$iw, $ih] = $img ? getimagesize($img) : [0, 0];
    [$pw, $ph] = array_map('floatval', array_values((array)($anim['page'] ?? [])) + [0, 0]);
    if (!$iw || !$ih || $pw <= 0 || $ph <= 0 || abs($pw / $ph - $iw / $ih) < 0.005) return null;
    return 'The file was made on a ' . round($pw) . '×' . round($ph) . " picture, but this letter's picture on the site is {$iw}×{$ih}"
        . ', so the mouths would land in the wrong place. Open ' . basename($img) . ' from the site in the editor, then export the file again.';
}

// download the stored file, for a backup or to edit it again
if (isset($_GET['dl'])) {
    $s = $db->prepare('SELECT data FROM anim WHERE track = ?');
    $s->execute([$track]);
    $data = $s->fetchColumn();
    if ($data === false) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="anim-' . pathinfo($track, PATHINFO_FILENAME) . '.json"');
    echo $data;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$_POST && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) { // over post_max_size: PHP drops the whole form
        $_SESSION['flash'] = ['err', 'The file is larger than the server allows.'];
        header("Location: admin_anim.php?t=$t");
        exit;
    }
    if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '') || $track === '') {
        http_response_code(400);
        exit;
    }
    // keep the version being replaced or deleted (one is enough), so a mistake can be undone
    $keep = fn() => $db->prepare('REPLACE INTO anim_prev SELECT track, data, updated FROM anim WHERE track = ?')->execute([$track]);
    $flash = null;
    switch ($_POST['action'] ?? '') {
        case 'upload':
            $up = $_FILES['file'] ?? null;
            if (!$up || $up['error'] === UPLOAD_ERR_NO_FILE) {
                $flash = ['err', 'Choose a file first.'];
            } elseif (in_array($up['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                $flash = ['err', 'The file is larger than the server allows.'];
            } elseif ($up['error'] !== UPLOAD_ERR_OK) {
                $flash = ['err', 'The upload failed. Please try again.'];
            } elseif (($anim = clean_anim($json = file_get_contents($up['tmp_name']), $why)) === null) {
                $flash = ['err', "The file was not saved: $why"];
            } elseif (!same_letter((string)($anim['letter'] ?? ''), track_glyph($files[$t])) && empty($_POST['force'])) {
                $flash = ['err', 'This file was made for the letter ' . ($anim['letter'] ?? '?') . ', not ' . track_glyph($files[$t]) . '. It was not saved.'];
            } elseif ($why = page_mismatch($anim, $t)) { // made on another picture: every mouth would sit off its face
                $flash = ['err', $why];
            } else {
                $db->beginTransaction();
                $keep();
                $db->prepare('REPLACE INTO anim(track, data, updated) VALUES (?, ?, ?)')->execute([$track, $json, gmdate(NOW)]);
                $db->commit();
                $flash = ['ok', 'Living picture saved for ' . track_title($files[$t]) . '.'];
            }
            break;
        case 'delete':
            $db->beginTransaction();
            $keep();
            $db->prepare('DELETE FROM anim WHERE track = ?')->execute([$track]);
            $db->commit();
            $flash = ['ok', 'Living picture deleted. You can bring it back with "Restore previous".'];
            break;
        case 'restore': // swap the current version and the kept one
            $get = function (string $table) use ($db, $track) {
                $s = $db->prepare("SELECT data, updated FROM $table WHERE track = ?");
                $s->execute([$track]);
                return $s->fetch();
            };
            $prev = $get('anim_prev');
            if ($prev) {
                $now = $get('anim');
                $db->beginTransaction();
                $db->prepare('REPLACE INTO anim(track, data, updated) VALUES (?, ?, ?)')->execute([$track, $prev['data'], $prev['updated']]);
                $now ? $db->prepare('REPLACE INTO anim_prev(track, data, updated) VALUES (?, ?, ?)')->execute([$track, $now['data'], $now['updated']])
                    : $db->prepare('DELETE FROM anim_prev WHERE track = ?')->execute([$track]);
                $db->commit();
                $flash = ['ok', 'The previous version was restored.'];
            }
            break;
    }
    $_SESSION['flash'] = $flash;
    header("Location: admin_anim.php?t=$t");
    exit;
}
[$kind, $msg] = $_SESSION['flash'] ?? [null, ''];
unset($_SESSION['flash']);
$saved = [];
foreach ($db->query('SELECT track, updated, LENGTH(data) size FROM anim')->fetchAll() as $r) $saved[$r['track']] = $r;
$prev = array_flip($db->query('SELECT track FROM anim_prev')->fetchAll(PDO::FETCH_COLUMN));
$player = __DIR__ . '/anim/player.html';
$kb = fn($n) => number_format($n / 1024) . ' KB';
?>
<!doctype html>
<html lang="en-US" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Living Pictures</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<style>
.admin { width:100%; max-width:1100px; }
.bar-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-top h1 { font-size:1.3rem; margin:0; }
.bar-top a { color:var(--accent); text-decoration:none; }
.ok { background:#e7f5ec; color:#1e6b3c; padding:10px 12px; border-radius:10px; margin-bottom:16px; }
.bad { background:#fdecea; color:var(--err); padding:10px 12px; border-radius:10px; margin-bottom:16px; }
.cols { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 420px); gap:16px; align-items:start; }
@media (max-width:860px) { .cols { grid-template-columns:1fr; } .side { order:-1; } }
.box { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; overflow-x:auto; }
.tbl { width:100%; border-collapse:collapse; font-size:.88rem; }
.tbl th, .tbl td { padding:8px 6px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }
.tbl th { color:var(--muted); font-weight:600; font-size:.8rem; }
.tbl tr.on td { background:var(--bg); }
.tbl b { font-size:1.4rem; }
.tbl a { color:var(--accent); text-decoration:none; }
.has { color:#1e6b3c; }
.none { color:var(--muted); }
.acts { display:flex; gap:6px; flex-wrap:wrap; }
.acts form { display:flex; gap:4px; }
.acts button, .acts a { border:1px solid var(--line); background:#fff; border-radius:8px; padding:5px 10px; font:inherit; font-size:.8rem; cursor:pointer; color:var(--ink); }
.acts .danger { color:var(--err); }
.up { display:flex; flex-direction:column; gap:10px; }
.up input[type=file] { font:inherit; font-size:.85rem; }
.up .btn { margin:0; }
.anim-preview { width:100%; border:0; border-radius:12px; aspect-ratio:var(--ratio); background:#fff; display:block; margin-bottom:12px; }
.hint { margin:8px 0 0; }
</style>
</head>
<body>
<main class="admin">
  <div class="bar-top"><h1>Living Pictures</h1><a href="admin.php">Back to the admin panel</a></div>
  <?php if ($msg): ?><p class="<?= $kind === 'ok' ? 'ok' : 'bad' ?>" role="<?= $kind === 'ok' ? 'status' : 'alert' ?>"><?= $h($msg) ?></p><?php endif ?>
  <?php if (!is_file($player)): ?><p class="bad">The player file anim/player.html is missing on the server.</p><?php endif ?>
  <div class="cols">
    <div class="box">
      <table class="tbl">
        <tr><th>Letter</th><th>Status</th><th>Last updated</th><th>Size</th><th>Actions</th></tr>
        <?php foreach ($files as $i => $f): $a = $saved[basename($f)] ?? null; ?>
        <tr class="<?= $i === $t ? 'on' : '' ?>">
          <td><a href="?t=<?= $i ?>"<?= $i === $t ? ' aria-current="true"' : '' ?>><b><?= $h(track_glyph($f)) ?></b> <?= $h(track_title($f)) ?></a></td>
          <td class="<?= $a ? 'has' : 'none' ?>"><?= $a ? 'Saved' : 'None' ?></td>
          <td dir="ltr"><?= $a ? $h(substr((string)$a['updated'], 0, 16)) : '—' ?></td>
          <td><?= $a ? $kb($a['size']) : '—' ?></td>
          <td>
            <div class="acts">
              <a href="?t=<?= $i ?>"><?= $a ? 'Preview' : 'Upload' ?></a>
              <?php if ($a): ?>
              <a href="?t=<?= $i ?>&amp;dl=1">Download</a>
              <form method="post" action="?t=<?= $i ?>" onsubmit="return confirm('Delete the living picture for this letter?')">
                <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="delete">
                <button class="danger">Delete</button>
              </form>
              <?php endif ?>
              <?php if (isset($prev[basename($f)])): ?>
              <form method="post" action="?t=<?= $i ?>" onsubmit="return confirm('Restore the previous version? The current one is kept in its place.')">
                <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="restore">
                <button>Restore previous</button>
              </form>
              <?php endif ?>
            </div>
          </td>
        </tr>
        <?php endforeach ?>
      </table>
    </div>
    <?php if ($track !== ''): $a = $saved[$track] ?? null; [$iw, $ih] = ($img = track_image_file($t)) ? getimagesize($img) : [4, 5]; ?>
    <section class="box side">
      <h2 style="font-size:1.1rem;margin:0 0 12px"><?= $h(track_title($files[$t])) ?> (<?= $h(track_glyph($files[$t])) ?>)</h2>
      <?php if ($a && is_file($player)): ?>
      <iframe class="anim-preview" id="frame" title="Living picture preview" allow="autoplay" style="--ratio:<?= (int)$iw ?> / <?= (int)$ih ?>"></iframe>
      <?php endif ?>
      <form class="up" method="post" enctype="multipart/form-data" id="up">
        <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="upload">
        <input type="hidden" name="force" id="force" value="">
        <label for="file"><?= $a ? 'Replace with a new file' : 'Upload the living picture file' ?> (JSON from the editor, up to 3 MB)</label>
        <input type="file" name="file" id="file" accept=".json,application/json" required>
        <button class="btn"><?= $a ? 'Replace' : 'Upload' ?></button>
      </form>
      <p class="hint">In the editor, use this card's own picture: public/img/<?= $h($img ? basename($img) : '—') ?> (<?= (int)$iw ?>×<?= (int)$ih ?>).<?= $a ? ' The current version is kept before it is replaced.' : '' ?></p>
    </section>
    <?php endif ?>
  </div>
</main>
<?php if ($track !== ''): ?>
<script>
// a file made for another letter: ask, then send it again with force=1 (the server refuses it otherwise)
const LETTER = <?= json_encode(track_glyph($files[$t]), JSON_UNESCAPED_UNICODE) ?>, plain = s => String(s ?? '').trim().replace(/[أإآ]/g, 'ا');
document.getElementById('up').onsubmit = async e => {
  const form = e.target, file = document.getElementById('file').files[0];
  if (!file || form.dataset.checked) return;
  e.preventDefault();
  let letter = null;
  try { letter = JSON.parse(await file.text()).letter; } catch {} // a broken file gets the server's message
  if (letter != null && plain(letter) !== plain(LETTER)) {
    if (!confirm(`This file was made for the letter ${letter}, not ${LETTER}. Save it for this letter anyway?`)) return;
    document.getElementById('force').value = '1';
  }
  form.dataset.checked = '1';
  form.requestSubmit();
};
<?php if (($saved[$track] ?? null) && is_file($player)): ?>
// preview: the same player as the letter page, the song unscrambled here and handed over as a blob: URL
(async () => {
  const KEY = Uint8Array.from(atob('<?= base64_encode($_SESSION['key'] ?? '') ?>'), c => c.charCodeAt(0));
  const abs = u => encodeURIComponent(new URL(u, location.href).href);
  let audio = '';
  try {
    const r = await fetch('audio.php?t=<?= $t ?>', { headers: { 'X-Player': '1' }, cache: 'no-store' });
    if (r.ok && KEY.length) {
      const a = new Uint8Array(await r.arrayBuffer());
      for (let j = 0; j < a.length; j++) a[j] ^= KEY[j % KEY.length];
      audio = URL.createObjectURL(new Blob([a], { type: 'audio/mpeg' }));
    }
  } catch {}
  document.getElementById('frame').src = <?= json_encode('anim/player.html?v=' . image_version($player)) ?>
    + '&data=' + abs(<?= json_encode('anim_data.php?track=' . rawurlencode($track)) ?>)
    + '&img=' + abs(<?= json_encode(track_image($t, 1200)) ?>) + (audio ? '&audio=' + abs(audio) : '');
})();
<?php endif ?>
</script>
<?php endif ?>
</body>
</html>
