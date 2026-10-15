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
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:24px 16px; background:#f5f1ea; color:#2b2622; font-family:Vazirmatn, Tahoma, sans-serif; text-align:center; }
  .cert { max-width:720px; margin:0 auto; background:#fffdf9; border:10px double #c9a227; border-radius:12px; padding:40px 24px; }
  .cert .big { font-size:4rem; line-height:1; }
  h1 { font-size:2rem; margin:12px 0 24px; color:#1f6f5c; }
  p { font-size:1.2rem; line-height:2; margin:8px 0; }
  input { font:inherit; font-size:1.8rem; font-weight:700; text-align:center; border:0; border-bottom:2px dashed #c9a227; background:none; width:min(100%, 420px); color:#2b2622; }
  .date { color:#7a7068; font-size:1rem; margin-top:24px; }
  .btns { margin-top:20px; display:flex; gap:10px; justify-content:center; }
  .btns a, .btns button { font:inherit; font-size:1.1rem; padding:12px 24px; border-radius:12px; border:0; cursor:pointer; text-decoration:none; background:#1f6f5c; color:#fff; }
  .btns a { background:#e4ddd2; color:#2b2622; }
  @media print { body { background:#fff; padding:0; } .btns { display:none; } input { border:0; } }
</style>
</head>
<body>
<?php if ($left): ?>
  <div class="cert">
    <div class="big">⭐</div>
    <p>بقي <?= strtr((string)$left, array_combine(range(0, 9), ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'])) ?> من الحروف. استمع إليها كلها لتحصل على الشهادة!</p>
    <div class="btns"><a href="./">العودة</a></div>
  </div>
<?php else: ?>
  <div class="cert">
    <div class="big">🏆</div>
    <h1>شهادة إتمام</h1>
    <p>تشهد «حروفي الناطقة» بأنّ</p>
    <input aria-label="اسم الطالب" value="<?= $h($u['username']) ?>">
    <p>قد أتمّ الاستماع إلى الحروف العربية الثمانية والعشرين بنجاح.</p>
    <p class="date" id="date"></p>
  </div>
  <div class="btns"><button onclick="print()">طباعة</button><a href="./">العودة</a></div>
  <script>document.getElementById('date').textContent = new Date().toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });</script>
<?php endif ?>
</body>
</html>
