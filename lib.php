<?php
declare(strict_types=1);

const ROOT = __DIR__;
const MAX_FAILS = 10; // failed login/register attempts per IP per hour

if (PHP_SAPI !== 'cli') {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
    session_start();
}

function db(): PDO
{
    static $db;
    if (!$db) {
        $db = new PDO('sqlite:' . ROOT . '/data/app.db', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
            CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                pass TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS codes(code TEXT PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id));
            CREATE TABLE IF NOT EXISTS fails(ip TEXT NOT NULL, at INTEGER NOT NULL);');
    }
    return $db;
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

/** Image for track #i (img/02.webp for the 2nd track…), falls back to the first image. */
function track_image(int $i): string
{
    $all = glob(ROOT . '/public/img/*.{webp,jpg,jpeg,png}', GLOB_BRACE);
    sort($all);
    $own = glob(ROOT . '/public/img/' . sprintf('%02d', $i + 1) . '.{webp,jpg,jpeg,png}', GLOB_BRACE);
    $f = $own[0] ?? $all[0] ?? null;
    return $f ? 'img/' . basename($f) : '';
}
