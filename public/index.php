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

// Arabic/Persian digits → Latin, so codes typed on an Arabic keyboard still match.
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
    $err = 'محاولات فاشلة كثيرة. يرجى المحاولة بعد ساعة.';
} elseif ($action === 'login') {
    $s = db()->prepare('SELECT id, pass FROM users WHERE username = ?');
    $s->execute([$username]);
    $u = $s->fetch();
    if ($u && password_verify($password, $u['pass'])) login_as((int)$u['id']);
    record_fail();
    $err = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
} elseif ($action === 'register') {
    $code = trim(latin_digits($_POST['code'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9_.-]{3,32}$/', $username)) {
        $err = 'يجب أن يتكون اسم المستخدم من ٣ إلى ٣٢ حرفًا إنجليزيًا أو رقمًا أو _ . -';
    } elseif (strlen($password) < 6) {
        $err = 'يجب ألا تقل كلمة المرور عن ٦ أحرف.';
    } else {
        $db = db();
        $db->exec('BEGIN IMMEDIATE');
        $s = $db->prepare('SELECT 1 FROM codes WHERE code = ? AND user_id IS NULL');
        $s->execute([$code]);
        if (!$s->fetchColumn()) {
            $db->exec('ROLLBACK');
            record_fail();
            $err = 'رمز التفعيل غير صالح أو تم استخدامه من قبل.';
        } else {
            $s = $db->prepare('SELECT 1 FROM users WHERE username = ?');
            $s->execute([$username]);
            if ($s->fetchColumn()) {
                $db->exec('ROLLBACK');
                $err = 'اسم المستخدم هذا مستخدم بالفعل.';
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
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>الحروف الناطقة</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
</head>
<body>
<?php if (!$logged): ?>
<main class="card">
  <h1>الحروف الناطقة</h1>
  <div class="tabs">
    <button type="button" data-tab="login" class="<?= $tab === 'login' ? 'on' : '' ?>">تسجيل الدخول</button>
    <button type="button" data-tab="register" class="<?= $tab === 'register' ? 'on' : '' ?>">حساب جديد برمز التفعيل</button>
  </div>
  <?php if ($err): ?><p class="err" role="alert"><?= $h($err) ?></p><?php endif ?>
  <form method="post" id="login" <?= $tab === 'login' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="login">
    <label for="lu">اسم المستخدم</label><input id="lu" name="username" dir="ltr" autocomplete="username" required value="<?= $tab === 'login' ? $h($username) : '' ?>">
    <label for="lp">كلمة المرور</label><input id="lp" name="password" type="password" dir="ltr" autocomplete="current-password" required>
    <button class="btn">دخول</button>
  </form>
  <form method="post" id="register" <?= $tab === 'register' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="register">
    <label for="rc">رمز التفعيل</label><input id="rc" name="code" dir="ltr" inputmode="numeric" autocomplete="off" required value="<?= $h($_POST['code'] ?? '') ?>">
    <label for="ru">اسم المستخدم (بالإنجليزية)</label><input id="ru" name="username" dir="ltr" autocomplete="username" required pattern="[A-Za-z0-9_.\-]{3,32}" value="<?= $tab === 'register' ? $h($username) : '' ?>">
    <label for="rp">كلمة المرور (٦ أحرف على الأقل)</label><input id="rp" name="password" type="password" dir="ltr" autocomplete="new-password" minlength="6" required>
    <button class="btn">إنشاء الحساب</button>
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
    <form method="post"><input type="hidden" name="action" value="logout"><button>تسجيل الخروج</button></form>
  </div>
  <div class="cover" id="cover" aria-label="اسحب لتغيير الحرف">
    <div class="strip" id="strip"></div>
    <span class="counter" id="counter"></span>
  </div>
  <div class="thumbs" id="thumbs"></div>
  <section class="sc">
    <div class="sc-head">
      <button id="play" class="sc-play" aria-label="تشغيل"><svg viewBox="0 0 24 24"><path id="icon" d="M8 5v14l11-7z"/></svg></button>
      <div class="sc-skip">
        <button id="prev" aria-label="السابق"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
        <button id="next" aria-label="التالي"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z"/></svg></button>
        <button id="shuffle" aria-label="تشغيل عشوائي" title="تشغيل عشوائي" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
        <button id="repeat"><svg viewBox="0 0 24 24"><path id="repeatIcon"/></svg></button>
      </div>
      <div class="sc-meta"><div class="sc-artist">الحروف الناطقة</div><div class="sc-title" id="title"></div></div>
    </div>
    <div class="wave" id="wave" role="slider" aria-label="موضع التشغيل" tabindex="0">
      <canvas id="cv"></canvas>
      <span class="t l" id="cur">0:00</span><span class="t r" id="dur">0:00</span>
    </div>
    <div class="status" id="status"></div>
  </section>
  <div class="letters-head"><h2>الحروف</h2><span id="progress"></span></div>
  <div class="letters" id="list"></div>
</main>
<script>
const TRACKS = <?= json_encode($list, JSON_UNESCAPED_UNICODE) ?>;
const KEY = Uint8Array.from(atob('<?= base64_encode($_SESSION['key']) ?>'), c => c.charCodeAt(0));
</script>
<script src="player.js?v=<?= filemtime(__DIR__ . '/player.js') ?>"></script>
<?php endif ?>
</body>
</html>
