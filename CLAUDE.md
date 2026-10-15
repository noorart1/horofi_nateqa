# حروفي الناطقة (horofi_nateqa)

Site for learning the Arabic letters: a user registers with a one-time license code, then listens to 28 letter recordings in a SoundCloud-style player that resists downloading. Live at `https://abc.alburagh.com` (deployed 2026-10-15).

## Language
- **All site text is in standard Arabic** (`lang="ar"`, Arabic digits via `toLocaleString('ar')`), including error messages, aria-labels and the admin panel. The end users are Arabic speakers.
- The project owner chats in Persian, so replies to them are in Persian.

## Stack
Plain PHP 8 + PDO (MySQL/MariaDB on the server, SQLite locally), no framework, no Composer, no build step; it should run on any shared host with PHP. Frontend is vanilla JS + CSS.

## Layout
- `public/`: **web root** (the subdomain's document root must point here)
  - `index.php`: login / register / password reset (with the license code) and the player page
  - `player.js`: player (Web Audio decoding via `fetchTrack()`, waveform, swipeable cover, thumbnails, letter grid, shuffle/repeat, speed with WSOLA, stars/medals)
  - `guide.js`: draws the guide letter (`guideGlyph()`) and the writing animation; shared by `writing.js` and `admin_strokes.php` so stroke coordinates line up
  - `writing.js`: writing practice overlay, guided mode (stations along each stroke, stars by off-path ratio, plays the letter via `fetchTrack()`)
  - `strokes.php`: a letter's stroke paths, only to a logged-in user sending `X-Player: 1`
  - `writing.php`: stores a letter's best writing score (1–3 stars)
  - `style.css`: all styles except the admin panel's
  - `audio.php`: serves a track XOR-scrambled with the session key, only to a logged-in user sending `X-Player: 1`
  - `img.php`: resized WebP of `public/img/*` (widths 240 and 1200), cached in `data/cache`
  - `progress.php`: marks a letter as listened (server-side)
  - `certificate.php`: printable certificate, only after all 28 letters are listened to
  - `admin_strokes.php`: admin tool to record each letter's stroke paths (404 for non-admins)
  - `admin.php`: admin panel (only for `is_admin` users; returns 404 for everyone else)
  - `img/NN.{webp,jpg,png}`: image for letter NN (falls back to `01`)
- `lib.php`: DB (MySQL if `data/config.php` exists, else SQLite `data/app.db`) + schema/migrations, `insert_ignore()`, `login_as()`, `current_user()`, track helpers
- `data/` (outside the web root, **not in git**): `config.php` (server only: MySQL credentials), `app.db` (local only), `media/*.mp3`, `cache/`, `backups/`
- CLI scripts: `import_codes.php [file.xlsx]`, `make_admin.php <user> [password|--remove]`, `backup.php`

## Rules
- Tables: `users`, `codes`, `fails`, `progress` (listened letters), `strokes` (track → JSON `[[[x,y],…],…]`, 0..1 of the guide square, writing order: body first, each dot its own one-point stroke), `writing` (best stars per user and letter). `progress`, `strokes` and `writing` key letters by the mp3 basename.
- Deleting a user must also delete their `progress` and `writing` rows and free their code.
- Tracks are the sorted `data/media/*.mp3`; the number prefix (`02 Ba …`) gives the Arabic name/letter in `lib.php`.
- One active session per account: `login_as()` writes a new `users.token`; `current_user()` rejects a session whose token doesn't match. Every authenticated endpoint uses `current_user()`. Exception: admins keep their token on login, so several people can use the admin account at once (the admin panel's "logout"/password reset still clears it).
- Failed login/register/reset attempts are rate-limited per IP (`MAX_FAILS`/hour).
- Schema changes go in `db()` in `lib.php` (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` when the column is missing).
- All SQL must run on both MySQL and SQLite: `insert_ignore()` instead of `INSERT OR IGNORE`, `REPLACE INTO`, `gmdate(NOW)` instead of `datetime('now')`, no `ON CONFLICT`/`ON DUPLICATE KEY`, VARCHAR(191) for indexed text.
- **Never commit** `license.xlsx`, `data/`, or the media/images (see `.gitignore`).
- **Testing against the real database:** use a test user named `zz_test_*` and delete only that user afterwards (free its code, delete its `progress` and `writing`). Never run a blanket `DELETE FROM users` or `UPDATE codes SET user_id = NULL`.

## Run locally
```
php import_codes.php            # once: load license.xlsx into data/app.db
php -S 127.0.0.1:8000 -t public
```

## Server
- cPanel host (CloudLinux, PHP 8.3 with `pdo_sqlite` enabled via the PHP selector). Connection details are not kept in the repo; ask the owner.
- The subdomain document root must be the `public/` folder of the app (set in cPanel → Domains; not changeable over SSH).
- Daily cron: `php backup.php` → `data/backups/app-*.sql.gz` (importable in phpMyAdmin), newest 30 kept.
- Updating: upload only the changed code files; never overwrite the server's `data/` (its `config.php` and media stay there).
