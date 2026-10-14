<?php
// Admin panel: users, codes, password reset, logout, delete. Only for users with is_admin = 1 (see make_admin.php).
require __DIR__ . '/../lib.php';

$me = current_user();
if (!$me || !$me['is_admin']) {
    http_response_code(404);
    exit;
}
$_SESSION['csrf'] ??= bin2hex(random_bytes(16));
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
$msg = '';
$db = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
        http_response_code(400);
        exit;
    }
    $id = (int)($_POST['id'] ?? 0);
    switch ($_POST['action'] ?? '') {
        case 'reset':
            if (strlen($_POST['password'] ?? '') < 6) {
                $msg = 'يجب ألا تقل كلمة المرور عن ٦ أحرف.';
                break;
            }
            $db->prepare('UPDATE users SET pass = ?, token = NULL WHERE id = ?')->execute([password_hash($_POST['password'], PASSWORD_DEFAULT), $id]);
            $msg = 'تم تغيير كلمة المرور وتسجيل خروج المستخدم.';
            break;
        case 'logout':
            $db->prepare('UPDATE users SET token = NULL WHERE id = ?')->execute([$id]);
            $msg = 'تم تسجيل خروج المستخدم.';
            break;
        case 'delete':
            if ($id === (int)$me['id']) {
                $msg = 'لا يمكنك حذف حسابك.';
                break;
            }
            $db->beginTransaction();
            $db->prepare('UPDATE codes SET user_id = NULL WHERE user_id = ?')->execute([$id]);
            $db->prepare('DELETE FROM progress WHERE user_id = ?')->execute([$id]);
            $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            $db->commit();
            $msg = 'تم حذف المستخدم وأصبح رمز التفعيل متاحًا من جديد.';
            break;
        case 'add_codes':
            $ins = $db->prepare('INSERT OR IGNORE INTO codes(code) VALUES (?)');
            $n = 0;
            foreach (preg_split('/\s+/', trim($_POST['codes'] ?? '')) as $c) {
                if ($c !== '' && $ins->execute([$c])) $n += $ins->rowCount();
            }
            $msg = 'تمت إضافة ' . number_format($n) . ' رمز جديد.';
            break;
    }
    $_SESSION['flash'] = $msg;
    header('Location: admin.php' . (isset($_GET['q']) ? '?q=' . rawurlencode($_GET['q']) : ''));
    exit;
}
$msg = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);

$stats = $db->query('SELECT COUNT(*) total, COUNT(user_id) used FROM codes')->fetch();
$q = trim($_GET['q'] ?? '');
$s = $db->prepare("SELECT u.id, u.username, u.created, u.last_login, u.is_admin, u.token IS NOT NULL online, c.code,
        (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) heard
    FROM users u LEFT JOIN codes c ON c.user_id = u.id
    WHERE :q = '' OR u.username LIKE :like OR c.code = :q
    ORDER BY u.id DESC LIMIT 200");
$s->execute(['q' => $q, 'like' => "%$q%"]);
$users = $s->fetchAll();
$codeState = null;
if ($q !== '' && !$users) {
    $c = $db->prepare('SELECT user_id FROM codes WHERE code = ?');
    $c->execute([$q]);
    $row = $c->fetch();
    $codeState = $row === false ? 'رمز غير موجود.' : 'هذا الرمز متاح ولم يُستخدم بعد.';
}
$tracks = count(tracks());
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>لوحة الإدارة</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<style>
.admin { width:100%; max-width:1000px; }
.admin h1 { font-size:1.3rem; margin:0; }
.bar-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.bar-top a { color:var(--accent); text-decoration:none; }
.stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:16px; }
.stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
.stat b { display:block; font-size:1.5rem; }
.stat span { color:var(--muted); font-size:.85rem; }
.box { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; margin-bottom:16px; }
.search { display:flex; gap:8px; }
.search input { flex:1; }
.search button, .box .btn { width:auto; margin:0; padding:10px 18px; }
.ok { background:#e7f5ec; color:#1e6b3c; padding:10px 12px; border-radius:10px; margin-bottom:16px; }
.tbl { width:100%; border-collapse:collapse; font-size:.88rem; }
.tbl th, .tbl td { padding:9px 8px; border-bottom:1px solid var(--line); text-align:right; vertical-align:middle; }
.tbl th { color:var(--muted); font-weight:600; font-size:.8rem; }
.tbl td.ltr { direction:ltr; text-align:right; }
.acts { display:flex; gap:6px; flex-wrap:wrap; }
.acts form { display:flex; gap:4px; }
.acts input { width:120px; padding:5px 8px; font-size:.8rem; }
.acts button { border:1px solid var(--line); background:#fff; border-radius:8px; padding:5px 10px; font:inherit; font-size:.8rem; cursor:pointer; }
.acts .danger { color:var(--err); }
.dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#ccc; margin-left:6px; }
.dot.on { background:#2e9e5b; }
details summary { cursor:pointer; color:var(--accent); }
textarea { width:100%; min-height:90px; margin:10px 0; padding:10px; border:1px solid var(--line); border-radius:10px; font:inherit; direction:ltr; }
@media (max-width:700px) { .tbl .hide-sm { display:none; } }
</style>
</head>
<body>
<main class="admin">
  <div class="bar-top"><h1>لوحة الإدارة</h1><a href="./">العودة إلى المشغّل</a></div>
  <?php if ($msg): ?><p class="ok" role="status"><?= $h($msg) ?></p><?php endif ?>

  <div class="stats">
    <div class="stat"><b><?= number_format($db->query('SELECT COUNT(*) FROM users')->fetchColumn()) ?></b><span>المستخدمون</span></div>
    <div class="stat"><b><?= number_format($stats['used']) ?></b><span>رموز مستخدمة</span></div>
    <div class="stat"><b><?= number_format($stats['total'] - $stats['used']) ?></b><span>رموز متاحة</span></div>
    <div class="stat"><b><?= number_format($stats['total']) ?></b><span>كل الرموز</span></div>
  </div>

  <form class="box search" method="get">
    <input name="q" value="<?= $h($q) ?>" placeholder="ابحث باسم المستخدم أو رمز التفعيل" dir="auto">
    <button class="btn">بحث</button>
  </form>
  <?php if ($codeState): ?><p class="ok"><?= $h($codeState) ?></p><?php endif ?>

  <div class="box" style="overflow-x:auto">
    <table class="tbl">
      <tr><th>المستخدم</th><th>رمز التفعيل</th><th class="hide-sm">التسجيل</th><th class="hide-sm">آخر دخول</th><th class="hide-sm">الاستماع</th><th>إجراءات</th></tr>
      <?php foreach ($users as $u): ?>
      <tr>
        <td class="ltr"><span class="dot <?= $u['online'] ? 'on' : '' ?>" title="<?= $u['online'] ? 'جلسة نشطة' : 'لا توجد جلسة' ?>"></span><?= $h($u['username']) ?><?= $u['is_admin'] ? ' (مدير)' : '' ?></td>
        <td class="ltr"><?= $h($u['code'] ?? '—') ?></td>
        <td class="ltr hide-sm"><?= $h(substr((string)$u['created'], 0, 10)) ?></td>
        <td class="ltr hide-sm"><?= $h(substr((string)$u['last_login'], 0, 16)) ?></td>
        <td class="hide-sm"><?= (int)$u['heard'] ?> / <?= $tracks ?></td>
        <td>
          <div class="acts">
            <form method="post">
              <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
              <input type="hidden" name="action" value="reset"><input name="password" placeholder="كلمة مرور جديدة" minlength="6" required dir="ltr">
              <button>تغيير</button>
            </form>
            <form method="post">
              <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
              <input type="hidden" name="action" value="logout"><button>تسجيل خروج</button>
            </form>
            <?php if ((int)$u['id'] !== (int)$me['id']): ?>
            <form method="post" onsubmit="return confirm('حذف هذا المستخدم؟ سيصبح رمز التفعيل متاحًا من جديد.')">
              <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
              <input type="hidden" name="action" value="delete"><button class="danger">حذف</button>
            </form>
            <?php endif ?>
          </div>
        </td>
      </tr>
      <?php endforeach ?>
      <?php if (!$users): ?><tr><td colspan="6" style="text-align:center;color:var(--muted)">لا يوجد مستخدمون.</td></tr><?php endif ?>
    </table>
  </div>

  <details class="box">
    <summary>إضافة رموز تفعيل جديدة</summary>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= $h($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="add_codes">
      <textarea name="codes" placeholder="رمز في كل سطر"></textarea>
      <button class="btn">إضافة</button>
    </form>
  </details>
</main>
</body>
</html>
