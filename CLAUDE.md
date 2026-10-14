# الحروف الناطقة (horofi_nateqa)

Site for learning the Arabic letters: a user registers with a one-time license code, then listens to 28 letter recordings in a SoundCloud-style player that resists downloading. Target domain: `abc.alburagh.com` (not deployed yet).

## Language
- **All site text is in standard Arabic** (`lang="ar"`, Arabic digits via `toLocaleString('ar')`), including error messages, aria-labels and the admin panel. The end users are Arabic speakers.
- The project owner chats in Persian, so replies to them are in Persian.

## Stack
Plain PHP 8 + SQLite (PDO), no framework, no Composer, no build step; it should run on any shared host with PHP. Frontend is vanilla JS + CSS.

## Layout
- `public/`: **web root** (the subdomain's document root must point here)
  - `index.php`: login / register / password reset (with the license code) and the player page
  - `player.js`: player (Web Audio decoding, waveform, swipeable cover, thumbnails, letter grid, shuffle/repeat, speed with WSOLA)
  - `style.css`: all styles except the admin panel's
  - `audio.php`: serves a track XOR-scrambled with the session key, only to a logged-in user sending `X-Player: 1`
  - `img.php`: resized WebP of `public/img/*` (widths 240 and 1200), cached in `data/cache`
  - `progress.php`: marks a letter as listened (server-side)
  - `admin.php`: admin panel (only for `is_admin` users; returns 404 for everyone else)
  - `img/NN.{webp,jpg,png}`: image for letter NN (falls back to `01`)
- `lib.php`: DB + schema/migrations, `login_as()`, `current_user()`, track helpers
- `data/` (outside the web root, **not in git**): `app.db`, `media/*.mp3`, `cache/`, `backups/`
- CLI scripts: `import_codes.php [file.xlsx]`, `make_admin.php <user> [password|--remove]`, `backup.php`

## Rules
- Tracks are the sorted `data/media/*.mp3`; the number prefix (`02 Ba …`) gives the Arabic name/letter in `lib.php`.
- One active session per account: `login_as()` writes a new `users.token`; `current_user()` rejects a session whose token doesn't match. Every authenticated endpoint uses `current_user()`.
- Failed login/register/reset attempts are rate-limited per IP (`MAX_FAILS`/hour).
- Schema changes go in `db()` in `lib.php` (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` when the column is missing).
- **Never commit** `license.xlsx`, `data/`, or the media/images (see `.gitignore`).
- **Testing against the real database:** use a test user named `zz_test_*` and delete only that user afterwards (free its code, delete its `progress`). Never run a blanket `DELETE FROM users` or `UPDATE codes SET user_id = NULL`.

## Run locally
```
php import_codes.php            # once: load license.xlsx into data/app.db
php -S 127.0.0.1:8000 -t public
```

## Deploy (when the owner says the subdomain is ready)
Upload everything except `.git`; the document root is `public/`; `data/` must be writable; run `import_codes.php` and `make_admin.php`; set up a daily cron for `php backup.php` (ideally with an offsite copy too).
