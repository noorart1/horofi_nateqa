<?php
declare(strict_types=1);

const ROOT = __DIR__;
const MAX_FAILS = 10; // failed login/register attempts per IP per hour

if (PHP_SAPI !== 'cli') {
    // no page of the site may be framed (clickjacking)
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: frame-ancestors 'none'");
    // a script that never needs the session (img.php) defines NO_SESSION first: no session file, no lock between requests
    if (!defined('NO_SESSION')) {
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
        session_start();
    }
}

/** Raise by one with every schema change in migrate() (a table or a column): only then do the migrations run again. */
const SCHEMA_VERSION = 1;

/**
 * MySQL when data/config.php exists (the server), else SQLite in data/app.db (local).
 * data/config.php: <?php return ['dsn' => 'mysql:host=localhost;dbname=…;charset=utf8mb4', 'user' => '…', 'pass' => '…'];
 * A request reads the schema version once; the migrations run only when it is behind SCHEMA_VERSION.
 */
function db(): PDO
{
    static $db;
    if (!$db) {
        $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
        $cfg = is_file(ROOT . '/data/config.php') ? require ROOT . '/data/config.php' : null;
        if ($cfg) {
            $db = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], $opts);
            $db->exec("SET time_zone = '+00:00'"); // timestamps in UTC, like SQLite
        } else {
            if (!is_dir(ROOT . '/data')) mkdir(ROOT . '/data', 0775, true);
            $db = new PDO('sqlite:' . ROOT . '/data/app.db', null, null, $opts);
            $db->exec('PRAGMA busy_timeout=5000;');
        }
        try {
            $v = (int)$db->query("SELECT v FROM meta WHERE k = 'schema'")->fetchColumn();
        } catch (PDOException) {
            $v = 0; // no meta table yet: a new database, or one from before SCHEMA_VERSION
        }
        if ($v < SCHEMA_VERSION) migrate($db, (bool)$cfg);
    }
    return $db;
}

/** Brings any older database up to SCHEMA_VERSION without losing data; every step may run again safely. */
function migrate(PDO $db, bool $mysql): void
{
    [$id, $nocase, $table] = $mysql ? ['INT AUTO_INCREMENT PRIMARY KEY', '', ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4']
        : ['INTEGER PRIMARY KEY', ' COLLATE NOCASE', '']; // MySQL's default collation already ignores case
    if (!$mysql) $db->exec('PRAGMA journal_mode=WAL;'); // kept in the file: once is enough
    // types valid in both databases; keys are VARCHAR(191) so MySQL can index them in utf8mb4
    foreach ([
        "users(id $id, username VARCHAR(191) NOT NULL UNIQUE$nocase, pass VARCHAR(255) NOT NULL, created DATETIME DEFAULT CURRENT_TIMESTAMP)",
        'codes(code VARCHAR(191) PRIMARY KEY, user_id INT UNIQUE)',
        'fails(ip VARCHAR(45) NOT NULL, at INT NOT NULL)',
        'progress(user_id INT NOT NULL, track VARCHAR(191) NOT NULL, PRIMARY KEY(user_id, track))',
        'strokes(track VARCHAR(191) PRIMARY KEY, data MEDIUMTEXT, updated DATETIME)',
        'writing(user_id INT NOT NULL, track VARCHAR(191) NOT NULL, stars INT, PRIMARY KEY(user_id, track))',
        'anim(track VARCHAR(191) PRIMARY KEY, data MEDIUMTEXT, updated DATETIME)', // a letter's living picture (see clean_anim)
        'anim_prev(track VARCHAR(191) PRIMARY KEY, data MEDIUMTEXT, updated DATETIME)', // the version it replaced, to undo a mistake
        'meta(k VARCHAR(191) PRIMARY KEY, v VARCHAR(191))', // the schema version
    ] as $t) $db->exec("CREATE TABLE IF NOT EXISTS $t$table");
    // columns added after the first release
    $cols = $mysql ? array_column($db->query('SHOW COLUMNS FROM users')->fetchAll(), 'Field')
        : array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name');
    foreach (['token VARCHAR(64)', 'is_admin INT NOT NULL DEFAULT 0', 'last_login DATETIME'] as $col) {
        if (!in_array(explode(' ', $col)[0], $cols, true)) $db->exec("ALTER TABLE users ADD COLUMN $col");
    }
    $db->prepare('REPLACE INTO meta(k, v) VALUES (?, ?)')->execute(['schema', (string)SCHEMA_VERSION]);
}

function is_mysql(): bool
{
    return db()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
}

/** "INSERT IGNORE" (MySQL) / "INSERT OR IGNORE" (SQLite): skip rows whose key already exists. */
function insert_ignore(): string
{
    return is_mysql() ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
}

const NOW = 'Y-m-d H:i:s'; // gmdate(NOW): current UTC time for DATETIME columns, in both databases

/**
 * Start a session for user $id. A new token logs out any other device of this user,
 * except for admins: the owners share the admin account, so an admin keeps the current token.
 */
function login_as(int $id): never
{
    session_regenerate_id(true);
    $s = db()->prepare('SELECT is_admin, token FROM users WHERE id = ?');
    $s->execute([$id]);
    $u = $s->fetch();
    $token = $u['is_admin'] && $u['token'] ? $u['token'] : bin2hex(random_bytes(16));
    db()->prepare('UPDATE users SET token = ?, last_login = ? WHERE id = ?')->execute([$token, gmdate(NOW), $id]);
    $_SESSION = ['uid' => $id, 'token' => $token, 'key' => random_bytes(32)];
    header('Location: ./');
    exit;
}

/** The logged-in user, or null if not logged in, deleted, or logged in on another device since. */
function current_user(): ?array
{
    if (empty($_SESSION['uid'])) return null;
    $s = db()->prepare('SELECT id, username, is_admin, token FROM users WHERE id = ?');
    $s->execute([$_SESSION['uid']]);
    $u = $s->fetch();
    return $u && $u['token'] && hash_equals($u['token'], (string)($_SESSION['token'] ?? '')) ? $u : null;
}

function too_many_fails(): bool
{
    db()->prepare('DELETE FROM fails WHERE at < ?')->execute([time() - 3600]);
    $s = db()->prepare('SELECT COUNT(*) FROM fails WHERE ip = ?');
    $s->execute([$_SERVER['REMOTE_ADDR'] ?? '']);
    return $s->fetchColumn() >= MAX_FAILS;
}

function record_fail(): void
{
    db()->prepare('INSERT INTO fails VALUES (?, ?)')->execute([$_SERVER['REMOTE_ADDR'] ?? '', time()]);
}

/** Sorted list of mp3 paths; the index is the track id. Looked up once per request. */
function tracks(): array
{
    static $files = null;
    if ($files === null) {
        $files = glob(ROOT . '/data/media/*.mp3') ?: [];
        sort($files);
    }
    return $files;
}

const LETTERS = ['ألف', 'باء', 'تاء', 'ثاء', 'جيم', 'حاء', 'خاء', 'دال', 'ذال', 'راء', 'زاي', 'سين', 'شين', 'صاد',
    'ضاد', 'طاء', 'ظاء', 'عين', 'غين', 'فاء', 'قاف', 'كاف', 'لام', 'ميم', 'نون', 'هاء', 'واو', 'ياء'];

function track_glyph(string $file): string
{
    return mb_substr('ابتثجحخدذرزسشصضطظعغفقكلمنهوي', (int)pathinfo($file, PATHINFO_FILENAME) - 1, 1);
}

/** Arabic letter name from the file's number prefix ("02 Ba …" → باء), else the cleaned file name. */
function track_title(string $file): string
{
    $name = pathinfo($file, PATHINFO_FILENAME);
    return LETTERS[(int)$name - 1] ?? trim(preg_replace(['/^\d+\s*/', '/\s*Master G2$/i'], '', $name));
}

/** Source image file for track #i (img/02.webp for the 2nd track…, webp before jpg before png), falling back to the first image. */
function track_image_file(int $i): ?string
{
    static $all = null; // the folder is listed once per request, not twice per letter
    if ($all === null) {
        $all = glob(ROOT . '/public/img/*.{webp,jpg,jpeg,png}', GLOB_BRACE) ?: [];
        sort($all);
    }
    $nn = sprintf('%02d', $i + 1);
    foreach (['webp', 'jpg', 'jpeg', 'png'] as $ext) {
        if (in_array($f = ROOT . "/public/img/$nn.$ext", $all, true)) return $f;
    }
    return $all[0] ?? null;
}

const IMAGE_WIDTHS = [240, 1200]; // thumbnail, cover

/** Version of an image file: copying a file on Windows keeps its old mtime, so the size counts too. */
function image_version(string $file): string
{
    return filemtime($file) . '-' . filesize($file);
}

/** URL of a resized WebP copy of public/img/$name; the version in the URL lets browsers cache it forever. */
function image_url(string $name, int $width): string
{
    $f = ROOT . '/public/img/' . $name;
    return is_file($f) ? 'img.php?f=' . rawurlencode($name) . "&w=$width&v=" . image_version($f) : '';
}

function track_image(int $i, int $width): string
{
    $f = track_image_file($i);
    return $f ? image_url(basename($f), $width) : '';
}

/**
 * A letter's living picture as exported by the owner's editor (kind "horofi-anim"), checked before it is stored.
 * Null if it can't be stored, with the reason (in Arabic) in $why. Unknown keys are kept on purpose: the engine
 * gains fields over time, and the player never shows text from the file as HTML, so caps and types are the guard.
 */
function clean_anim(string $json, ?string &$why = null): ?array
{
    $why = null;
    try {
        if (strlen($json) > 3 << 20) throw new RuntimeException('حجم الملف أكبر من ٣ ميغابايت.');
        $j = json_decode($json, false, 64); // objects stay objects, so {} and [] can be told apart
        if (!$j instanceof stdClass) throw new RuntimeException('الملف ليس JSON صالحًا.');
        if (($j->kind ?? null) !== 'horofi-anim') throw new RuntimeException('هذا الملف ليس ملف صورة حية من المحرر.');
        if (($j->schema ?? null) !== 1) throw new RuntimeException('إصدار الملف (schema) غير مدعوم في الموقع.');
        $d = $j->data ?? null;
        if (!$d instanceof stdClass || !is_array($d->frame ?? null) || count($d->frame) !== 5
            || count(array_filter($d->frame, fn($v) => is_int($v) || is_float($v))) !== 5 || !is_array($d->sway ?? null)) {
            throw new RuntimeException('بيانات الصورة الحية ناقصة (frame أو sway).');
        }
        foreach (['singers' => [6, 'المغنين'], 'sway' => [40, 'المناطق'], 'critters' => [40, 'الحيوانات']] as $k => [$max, $what]) {
            if (count((array)($d->$k ?? [])) > $max) throw new RuntimeException("عدد $what أكثر من $max.");
        }
        if (count((array)($j->sheets ?? [])) > 8) throw new RuntimeException('عدد أوراق الفم أكثر من 8.');
        anim_check($j);
    } catch (RuntimeException $e) {
        $why = $e->getMessage();
        return null;
    }
    return json_decode($json, true);
}

/** Every value inside an animation: embedded files only as images/sounds of a capped size, short plain text, finite numbers. */
function anim_check(mixed $v): void
{
    if (is_array($v) || $v instanceof stdClass) {
        foreach ($v as $k => $x) {
            if (is_string($k)) anim_check($k);
            anim_check($x);
        }
    } elseif (is_float($v) && !is_finite($v)) { // e.g. 1e999 decodes to INF
        throw new RuntimeException('في الملف رقم غير صالح.');
    } elseif (is_string($v) && str_starts_with($v, 'data:')) {
        [$head, $b64] = explode(',', $v, 2) + [1 => ''];
        if (!preg_match('~^data:(image/(?:png|jpeg|webp)|audio/(?:mpeg|wav|ogg|mp4))(?:;[\w.+=-]+)*;base64$~D', $head, $m)) {
            throw new RuntimeException('ملف مضمّن من نوع غير مسموح: ' . mb_substr($head, 5, 40));
        }
        $bin = base64_decode($b64, true);
        if ($bin === false) throw new RuntimeException('ملف مضمّن تالف (' . $m[1] . ').');
        $image = str_starts_with($m[1], 'image/');
        if (strlen($bin) > ($image ? 1 << 20 : 800 << 10)) {
            throw new RuntimeException($image ? 'صورة مضمّنة أكبر من ١ ميغابايت.' : 'صوت مضمّن أكبر من ٨٠٠ كيلوبايت.');
        }
    } elseif (is_string($v)) {
        if (mb_strlen($v) > 200) throw new RuntimeException('نص أطول من ٢٠٠ حرف: ' . mb_substr($v, 0, 30) . '…');
        if (preg_match('~<\s*/?\s*[a-z!?]~i', $v)) throw new RuntimeException('نص يحتوي على وسم HTML: ' . mb_substr($v, 0, 40));
    }
}

/** Same letter, whatever hamza form the editor wrote (the alif track's glyph is a plain ا). */
function same_letter(string $a, string $b): bool
{
    $plain = fn($s) => strtr(trim($s), ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا']);
    return $plain($a) === $plain($b);
}
