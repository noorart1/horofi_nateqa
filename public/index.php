<?php
require __DIR__ . '/../lib.php';

// Arabic/Persian digits → Latin, so codes typed on an Arabic keyboard still match.
function latin_digits(string $s): string
{
    return strtr($s, ['۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']);
}

$err = '';
$action = $_POST['action'] ?? '';
$tab = in_array($action, ['register', 'reset'], true) ? $action : 'login';
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($action === 'logout') {
    session_destroy();
    header('Location: ./');
    exit;
} elseif (in_array($action, ['login', 'register', 'reset'], true) && too_many_fails()) {
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
        $s = $db->prepare('SELECT 1 FROM codes WHERE code = ? AND user_id IS NULL');
        $s->execute([$code]);
        $u = $db->prepare('SELECT 1 FROM users WHERE username = ?');
        $u->execute([$username]);
        if (!$s->fetchColumn()) {
            record_fail();
            $err = 'رمز التفعيل غير صالح أو تم استخدامه من قبل.';
        } elseif ($u->fetchColumn()) {
            $err = 'اسم المستخدم هذا مستخدم بالفعل.';
        } else {
            $db->beginTransaction();
            $db->prepare('INSERT INTO users(username, pass) VALUES (?, ?)')->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
            $id = (int)$db->lastInsertId();
            // claiming the code only if still free makes two registrations with one code at once safe
            $claim = $db->prepare('UPDATE codes SET user_id = ? WHERE code = ? AND user_id IS NULL');
            $claim->execute([$id, $code]);
            if ($claim->rowCount() === 1) {
                $db->commit();
                login_as($id);
            }
            $db->rollBack();
            $err = 'رمز التفعيل غير صالح أو تم استخدامه من قبل.';
        }
    }
} elseif ($action === 'reset') {
    // the license code is tied to exactly one user, so username + code proves ownership
    $code = trim(latin_digits($_POST['code'] ?? ''));
    if (strlen($password) < 6) {
        $err = 'يجب ألا تقل كلمة المرور عن ٦ أحرف.';
    } else {
        $s = db()->prepare('SELECT u.id FROM users u JOIN codes c ON c.user_id = u.id WHERE u.username = ? AND c.code = ?');
        $s->execute([$username, $code]);
        $id = $s->fetchColumn();
        if ($id) {
            db()->prepare('UPDATE users SET pass = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
            login_as((int)$id);
        }
        record_fail();
        $err = 'اسم المستخدم أو رمز التفعيل غير صحيح.';
    }
}

$me = current_user();
if (!$me && !empty($_SESSION['uid'])) { // logged in on another device, or the account was removed
    $_SESSION = [];
    session_destroy();
    $err = 'انتهت جلستك لأنه تم تسجيل الدخول إلى حسابك من جهاز آخر.';
}
$logged = (bool)$me;
if ($logged) {
    $s = db()->prepare('SELECT track FROM progress WHERE user_id = ?');
    $s->execute([$me['id']]);
    $heard = array_flip($s->fetchAll(PDO::FETCH_COLUMN));
    $s = db()->prepare('SELECT track, stars FROM writing WHERE user_id = ?');
    $s->execute([$me['id']]);
    $stars = $s->fetchAll(PDO::FETCH_KEY_PAIR);
    $stroked = array_flip(db()->query('SELECT track FROM strokes')->fetchAll(PDO::FETCH_COLUMN));
    $list = [];
    $animated = is_file(__DIR__ . '/anim/player.html') ? array_flip(db()->query('SELECT track FROM anim')->fetchAll(PDO::FETCH_COLUMN)) : [];
    foreach (tracks() as $i => $f) {
        $list[] = ['title' => track_title($f), 'glyph' => track_glyph($f), 'img' => track_image($i, 1200),
            'thumb' => track_image($i, 240), 'done' => isset($heard[basename($f)]),
            'strokes' => isset($stroked[basename($f)]), 'stars' => (int)($stars[basename($f)] ?? 0),
            'anim' => isset($animated[basename($f)]) ? 'anim_data.php?track=' . rawurlencode(basename($f)) : null];
    }
}
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES);
$animPlayer = !empty($animated) ? 'anim/player.html?v=' . image_version(__DIR__ . '/anim/player.html') : null;
$banner = image_url('headerontop.jpg', 1200);
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>حروفي الناطقة</title>
<link rel="preload" href="fonts/vazirmatn-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= filemtime(__DIR__ . '/fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="fonts/rubik.css?v=<?= filemtime(__DIR__ . '/fonts/rubik.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= filemtime(__DIR__ . '/style.css') ?>">
<?php if (!empty($list[0]['img'])): ?><link rel="preload" as="image" href="<?= $h($list[0]['img']) ?>" fetchpriority="high"><?php endif /* the first cover: the page's largest picture, found before player.js runs */ ?>
<?php if ($animPlayer && ($_SERVER['HTTP_SAVE_DATA'] ?? '') !== 'on'): ?><link rel="prefetch" href="<?= $h($animPlayer) ?>"><?php endif /* the living-picture player, cached before the first one is needed */ ?>
</head>
<body>
<?php if (!$logged): ?>
<main class="card">
  <?php if ($banner): ?><img class="banner" src="<?= $h($banner) ?>" alt="حروفي الناطقة" width="1200" height="450" fetchpriority="high"><?php endif ?>
  <h1>حروفي الناطقة</h1>
  <div class="tabs">
    <button type="button" data-tab="login" class="<?= $tab === 'login' ? 'on' : '' ?>">تسجيل الدخول</button>
    <button type="button" data-tab="register" class="<?= $tab === 'register' ? 'on' : '' ?>">حساب جديد</button>
  </div>
  <?php if ($err): ?><p class="err" role="alert"><?= $h($err) ?></p><?php endif ?>
  <form method="post" id="login" <?= $tab === 'login' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="login">
    <label for="lu">اسم المستخدم</label><input id="lu" name="username" dir="ltr" autocomplete="username" required value="<?= $tab === 'login' ? $h($username) : '' ?>">
    <label for="lp">كلمة المرور</label><input id="lp" name="password" type="password" dir="ltr" autocomplete="current-password" required>
    <button class="btn">دخول</button>
    <button type="button" class="link" data-tab="reset">نسيت كلمة المرور؟</button>
  </form>
  <form method="post" id="reset" <?= $tab === 'reset' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="reset">
    <p class="hint">أدخل اسم المستخدم ورمز التفعيل الذي سجّلت به، ثم اختر كلمة مرور جديدة.</p>
    <label for="xu">اسم المستخدم</label><input id="xu" name="username" dir="ltr" autocomplete="username" required value="<?= $tab === 'reset' ? $h($username) : '' ?>">
    <label for="xc">رمز التفعيل</label><input id="xc" name="code" dir="ltr" inputmode="numeric" autocomplete="off" required>
    <label for="xp">كلمة المرور الجديدة (٦ أحرف على الأقل)</label><input id="xp" name="password" type="password" dir="ltr" autocomplete="new-password" minlength="6" required>
    <button class="btn">تغيير كلمة المرور</button>
    <button type="button" class="link" data-tab="login">العودة إلى تسجيل الدخول</button>
  </form>
  <form method="post" id="register" <?= $tab === 'register' ? '' : 'hidden' ?>>
    <input type="hidden" name="action" value="register">
    <label for="rc">رمز التفعيل</label><input id="rc" name="code" dir="ltr" inputmode="numeric" autocomplete="off" required value="<?= $tab === 'register' ? $h($_POST['code'] ?? '') : '' ?>">
    <label for="ru">اسم المستخدم (بالإنجليزية)</label><input id="ru" name="username" dir="ltr" autocomplete="username" required pattern="[A-Za-z0-9_.\-]{3,32}" value="<?= $tab === 'register' ? $h($username) : '' ?>">
    <label for="rp">كلمة المرور (٦ أحرف على الأقل)</label><input id="rp" name="password" type="password" dir="ltr" autocomplete="new-password" minlength="6" required>
    <button class="btn">إنشاء الحساب</button>
  </form>
</main>
<script>
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  const tab = b.dataset.tab;
  document.querySelectorAll('.tabs [data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
  document.querySelectorAll('main form').forEach(f => f.hidden = f.id !== tab);
  document.querySelector('.err')?.remove();
});
</script>
<?php else: ?>
<main class="player-page" oncontextmenu="return false">
  <?php if ($banner): ?><img class="banner" src="<?= $h($banner) ?>" alt="حروفي الناطقة" width="1200" height="450"><?php endif ?>
  <div class="top">
    <span><?= $h($me['username']) ?><?php if ($me['is_admin']): ?> · <a href="admin.php">لوحة الإدارة</a><?php endif ?></span>
    <form method="post"><input type="hidden" name="action" value="logout"><button>تسجيل الخروج</button></form>
  </div>
  <div class="cover" id="cover" aria-label="اسحب لتغيير الحرف">
    <div class="strip" id="strip"></div>
    <span class="counter" id="counter"></span>
  </div>
  <div class="thumbs" id="thumbs"></div>
  <section class="sc" aria-label="مشغّل الحروف">
    <div class="sc-stage">
      <div class="badge" id="badge" aria-hidden="true"><span id="badgeGlyph"></span></div>
      <div class="sc-meta">
        <h2 class="sc-title" id="title"></h2>
        <button id="writeBtn" class="write-btn" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20z"/><path d="M13.8 6.8l3.4 3.4"/></svg>تمرين الكتابة</button>
      </div>
    </div>
    <div class="sc-controls">
      <button id="prev" class="skip" aria-label="السابق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      <button id="play" class="sc-play" aria-label="تشغيل"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="icon" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg></button>
      <button id="next" class="skip" aria-label="التالي"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    </div>
    <div class="wave" id="wave" role="slider" aria-label="موضع التشغيل" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
      <canvas id="cv"></canvas>
    </div>
    <div class="sc-times"><span id="cur">0:00</span><span class="status" id="status" role="status"></span><span id="dur">0:00</span></div>
    <div class="sc-grown" role="group" aria-label="إعدادات للكبار">
      <button id="shuffle" aria-label="تشغيل عشوائي" title="تشغيل عشوائي" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
      <button id="repeat"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="repeatIcon"/></svg></button>
      <button id="speed" class="speed" aria-label="سرعة التشغيل" title="سرعة التشغيل"></button>
      <button id="camera" aria-label="حركة الكاميرا في الصورة الحية" title="حركة الكاميرا في الصورة الحية" aria-pressed="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h10.5a2 2 0 0 1 2 2v1.6l3.6-2.4a.6.6 0 0 1 .9.5v7.6a.6.6 0 0 1-.9.5l-3.6-2.4v1.6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/></svg></button>
    </div>
  </section>
  <div class="letters-head"><h2>الحروف</h2><span id="progress"></span></div>
  <div class="rewards"><span id="medals" role="img"></span><a id="cert" href="certificate.php" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5v1A3.5 3.5 0 0 0 8 10M17 5.5h2.5v1A3.5 3.5 0 0 1 16 10M12 13v4M8.5 20h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>شهادتك</a></div>
  <div class="letters" id="list"></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="writing" class="writing" aria-labelledby="wTitle">
    <div class="w-head"><h2 id="wTitle"></h2><button id="wClose" class="w-close" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <canvas id="wPad" class="w-pad" aria-label="اكتب الحرف بإصبعك على المسار"></canvas>
    <p id="wMsg" class="w-msg" role="status"></p>
    <div class="w-btns">
      <button id="wWatch" class="btn alt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>شاهد مرة أخرى</button>
      <button id="wRetry" class="btn alt" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/></svg>أعد المحاولة</button>
      <button id="wNext" class="btn" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>الحرف التالي</button>
    </div>
  </dialog>
</main>
<script>
const TRACKS = <?= json_encode($list, JSON_UNESCAPED_UNICODE) ?>;
const KEY = Uint8Array.from(atob('<?= base64_encode($_SESSION['key']) ?>'), c => c.charCodeAt(0));
const ANIM = <?= json_encode($animPlayer) ?>;
</script>
<!-- deferred, in this order, after the page is parsed; TRACKS, KEY and ANIM above are already set (party.js loads anime.js itself) -->
<script defer src="party.js?v=<?= filemtime(__DIR__ . '/party.js') ?>"></script>
<script defer src="player.js?v=<?= filemtime(__DIR__ . '/player.js') ?>"></script>
<script defer src="guide.js?v=<?= filemtime(__DIR__ . '/guide.js') ?>"></script>
<script defer src="writing.js?v=<?= filemtime(__DIR__ . '/writing.js') ?>"></script>
<?php endif ?>
</body>
</html>
