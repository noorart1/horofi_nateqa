<?php
// Printable completion certificate, only once the user has listened to every letter.
require __DIR__ . '/../lib.php';

$u = current_user();
if (!$u) {
    header('Location: ./');
    exit;
}
$s = db()->prepare('SELECT track FROM progress WHERE user_id = ?');
$s->execute([$u['id']]);
$left = count(array_diff(array_map('basename', tracks()), $s->fetchAll(PDO::FETCH_COLUMN)));
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>شهادة حروفي الناطقة</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="fonts/rubik.css?v=<?= filemtime(__DIR__ . '/fonts/rubik.css') ?>">
<style>
  body { margin:0; padding:24px 16px; background:#e6f5fc; color:#123a5c; font-family:Vazirmatn, Tahoma, sans-serif; text-align:center; }
  .cert { max-width:720px; margin:0 auto; background:#fff; border:12px solid #ffcb05; outline:3px dashed #0070b2; outline-offset:-22px; border-radius:32px;
    padding:48px 28px; box-shadow:0 10px 0 #e9a400, 0 18px 26px -12px #00507a55; }
  .big { display:block; width:96px; height:96px; margin:0 auto; }
  h1 { font-family:Rubik, Vazirmatn, sans-serif; font-weight:800; font-size:2.4rem; margin:12px 0 20px; color:#004f80; }
  p { font-size:1.25rem; line-height:2; margin:8px 0; }
  input { font-family:Rubik, Vazirmatn, sans-serif; font-weight:800; font-size:2rem; text-align:center; border:0; border-bottom:3px dashed #e9a400;
    background:none; width:min(100%, 420px); color:#0070b2; }
  input:focus { outline:none; border-bottom-color:#0070b2; }
  .date { color:#4f6b82; font-size:1rem; margin-top:24px; }
  .btns { margin-top:26px; display:flex; gap:12px; justify-content:center; }
  .btns a, .btns button { font:inherit; font-weight:700; font-size:1.1rem; padding:12px 28px; border-radius:999px; border:0; cursor:pointer; text-decoration:none;
    background:#0070b2; color:#fff; box-shadow:0 5px 0 #004f80, 0 11px 14px -8px #00507a40; }
  .btns a { background:#fff; color:#0070b2; box-shadow:0 5px 0 #cfe6f2, 0 11px 14px -8px #00507a40; }
  .btns :is(a, button):active { transform:translateY(4px); box-shadow:none; }
  .fx { position:fixed; inset:0; pointer-events:none; z-index:40; overflow:hidden; }
  .fx .bit { position:absolute; display:block; border-radius:3px; }
  .fx .bit svg { width:100%; height:100%; display:block; }
  @media print { body { background:#fff; padding:0; } .btns, .fx { display:none; } .cert { box-shadow:none; } input { border:0; } }
</style>
</head>
<body>
<?php if ($left): ?>
  <div class="cert">
    <svg class="big" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#ffcb05" stroke="#e9a400" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <p>بقي <?= strtr((string)$left, array_combine(range(0, 9), ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'])) ?> من الحروف. استمع إليها كلها لتحصل على الشهادة!</p>
    <div class="btns"><a href="./">العودة</a></div>
  </div>
<?php else: ?>
  <div class="cert">
    <svg class="big" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="#ffcb05" stroke="#e9a400" stroke-width="2.5"/><path d="M20 12h-8v3a9 9 0 0 0 9 9M44 12h8v3a9 9 0 0 1-9 9" fill="none" stroke="#e9a400" stroke-width="3.5" stroke-linecap="round"/><path d="M32 34v10" stroke="#e9a400" stroke-width="5"/><rect x="21" y="44" width="22" height="8" rx="3" fill="#0070b2"/><path d="M32 13l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7z" fill="#fff"/></svg>
    <h1>شهادة إتمام</h1>
    <p>تشهد «حروفي الناطقة» بأنّ</p>
    <input aria-label="اسم الطالب" value="<?= $h($u['username']) ?>">
    <p>قد أتمّ الاستماع إلى الحروف العربية الثمانية والعشرين بنجاح.</p>
    <p class="date" id="date"></p>
  </div>
  <div class="btns"><button onclick="print()">طباعة</button><a href="./">العودة</a></div>
  <script>document.getElementById('date').textContent = new Date().toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });</script>
  <script src="party.js?v=<?= filemtime(__DIR__ . '/party.js') ?>"></script>
  <script>rain(140); burst(innerWidth / 2, 160, 50, 1.4);</script>
<?php endif ?>
</body>
</html>
