<?php
declare(strict_types=1);

const ROOT = __DIR__;
const MAX_FAILS = 10; // failed login/register attempts per IP per hour

if (PHP_SAPI !== 'cli') {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
    session_start();
    // no page of the site may be framed (clickjacking)
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: frame-ancestors 'none'");
}

/**
 * MySQL when data/config.php exists (the server), else SQLite in data/app.db (local).
 * data/config.php: <?php return ['dsn' => 'mysql:host=localhost;dbname=…;charset=utf8mb4', 'user' => '…', 'pass' => '…'];
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
            [$id, $nocase, $table] = ['INT AUTO_INCREMENT PRIMARY KEY', '', ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'];
        } else {
            $db = new PDO('sqlite:' . ROOT . '/data/app.db', null, null, $opts);
            $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
            [$id, $nocase, $table] = ['INTEGER PRIMARY KEY', ' COLLATE NOCASE', '']; // MySQL's default collation already ignores case
        }
        // types valid in both databases; keys are VARCHAR(191) so MySQL can index them in utf8mb4
        foreach ([
            "users(id $id, username VARCHAR(191) NOT NULL UNIQUE$nocase, pass VARCHAR(255) NOT NULL, created DATETIME DEFAULT CURRENT_TIMESTAMP)",
            'codes(code VARCHAR(191) PRIMARY KEY, user_id INT UNIQUE)',
            'fails(ip VARCHAR(45) NOT NULL, at INT NOT NULL)',
            'progress(user_id INT NOT NULL, track VARCHAR(191) NOT NULL, PRIMARY KEY(user_id, track))',
            'strokes(track VARCHAR(191) PRIMARY KEY, data MEDIUMTEXT, updated DATETIME)',
            'writing(user_id INT NOT NULL, track VARCHAR(191) NOT NULL, stars INT, PRIMARY KEY(user_id, track))',
        ] as $t) $db->exec("CREATE TABLE IF NOT EXISTS $t$table");
        // columns added after the first release
        $cols = $cfg ? array_column($db->query('SHOW COLUMNS FROM users')->fetchAll(), 'Field')
            : array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name');
        foreach (['token VARCHAR(64)', 'is_admin INT NOT NULL DEFAULT 0', 'last_login DATETIME'] as $col) {
            if (!in_array(explode(' ', $col)[0], $cols, true)) $db->exec("ALTER TABLE users ADD COLUMN $col");
        }
    }
    return $db;
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

/** Sorted list of mp3 paths; the index is the track id. */
function tracks(): array
{
    $files = glob(ROOT . '/data/media/*.mp3');
    sort($files);
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

/** Source image file for track #i (img/02.webp for the 2nd track…), falling back to the first image. */
function track_image_file(int $i): ?string
{
    $all = glob(ROOT . '/public/img/*.{webp,jpg,jpeg,png}', GLOB_BRACE);
    sort($all);
    $own = glob(ROOT . '/public/img/' . sprintf('%02d', $i + 1) . '.{webp,jpg,jpeg,png}', GLOB_BRACE);
    return $own[0] ?? $all[0] ?? null;
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
