# حروفي الناطقة (horofi_nateqa)

Site for learning the Arabic letters: a user registers with a one-time license code, then listens to 28 letter recordings in a SoundCloud-style player that resists downloading. Live at `https://abc.alburagh.com` (deployed 2026-10-15).

## Language
- **All site text is in standard Arabic** (`lang="ar"`, Arabic digits via `toLocaleString('ar')`), including error messages, aria-labels and the admin panel. The end users are Arabic speakers. Exception: `admin_anim.php` (and `clean_anim()`'s messages, shown only there) is in US English, at the owner's request.
- The project owner chats in Persian, so replies to them are in Persian.

## Stack
Plain PHP 8 + PDO (MySQL/MariaDB on the server, SQLite locally), no framework, no Composer, no build step; it should run on any shared host with PHP. Frontend is vanilla JS + CSS; the one library is anime.js 4.5.0 (the owner's choice, for celebrations and the small moments: press rings, tiles entering, badge swap, notes, bubbles), vendored in `public/vendor/` (never a CDN). No page has a `<script>` tag for it: `party.js` loads it at idle time after the page is drawn, or at once when a moment needs it earlier (that moment waits; a press ring or a beat note is skipped meanwhile). Fonts are self-hosted too (`public/fonts/`), never Google Fonts. The main page's scripts are `defer` (order kept; `TRACKS`, `KEY`, `ANIM` are set inline before them).

## Layout
- `public/`: **web root** (the subdomain's document root must point here)
  - `index.php`: login / register / password reset (with the license code) and the player page
  - `player.js`: player (Web Audio decoding via `fetchTrack()`, waveform, swipeable cover, thumbnails, letter grid, shuffle/repeat, speed with WSOLA, stars/medals)
  - `party.js`: celebrations with anime.js (confetti burst/rain, the star that flies to a learned letter, medal pops); resolves at once with an opacity-only reward under reduced motion. Loads anime.js itself (see Stack); its functions keep their names and still return promises
  - `vendor/anime-4.5.0.umd.min.js`: anime.js (MIT, license beside it)
  - `fonts/`: Vazirmatn and Rubik woff2 (arabic + latin subsets, the files Google Fonts serves; OFL licenses beside them). `vazirmatn.css` and `rubik.css`: the player page and the certificate load both, the admin pages only Vazirmatn (as before: their headings fall back to it)
  - `anim/player.html`: the living-picture engine (the site build of the owner's editor `tools/anim-editor-sample.html`, which is not in git; `tools/anim-player.html` is the same file). Opened in an iframe as `player.html?v=…#data=…&img=…` (after `#`, so one cached copy serves every letter). Messages: see the comment above `bootPlayer()`
  - `anim_data.php`, `admin_anim.php`: a letter's living picture (JSON from the editor, checked by `clean_anim()`), and its admin page
  - `guide.js`: draws the guide letter (`guideGlyph()`) and the writing animation; shared by `writing.js` and `admin_strokes.php` so stroke coordinates line up
  - `writing.js`: writing practice overlay, guided mode (stations along each stroke, stars by off-path ratio, plays the letter via `fetchTrack()`)
  - `strokes.php`: a letter's stroke paths, only to a logged-in user sending `X-Player: 1`
  - `writing.php`: stores a letter's best writing score (1–3 stars)
  - `style.css`: all styles except the admin panel's
  - `audio.php`: serves a track XOR-scrambled with the session key, only to a logged-in user sending `X-Player: 1`
  - `img.php`: resized WebP of `public/img/*` (widths 240 and 1200), cached in `data/cache`; defines `NO_SESSION` before `lib.php`, so it opens no session (a script that needs no session does the same)
  - `progress.php`: marks a letter as listened (server-side)
  - `certificate.php`: printable certificate, only after all 28 letters are listened to
  - `admin_strokes.php`: admin tool to record each letter's stroke paths (404 for non-admins)
  - `admin.php`: admin panel (only for `is_admin` users; returns 404 for everyone else)
  - `img/NN.{webp,jpg,png}`: image for letter NN (falls back to `01`)
- `lib.php`: DB (MySQL if `data/config.php` exists, else SQLite `data/app.db`) + schema/migrations, `insert_ignore()`, `login_as()`, `current_user()`, track helpers
- `data/` (outside the web root, **not in git**): `config.php` (server only: MySQL credentials), `app.db` (local only), `media/*.mp3` (96 kbps mono since 2026-10-18; playback needs only one channel), `media-stereo/` (the earlier 320 kbps stereo copies: the editor's lead/chorus split needs stereo; WAV masters are on the owner's network backup), `cache/`, `backups/`
- CLI scripts: `import_codes.php [file.xlsx]`, `make_admin.php <user> [password|--remove]`, `backup.php`, `tools/test_anim.php` (checks `clean_anim()`), `tools/compress_media.sh` (96 kbps stereo copies of the songs in a separate folder, for the owner to listen to; never replaces the originals)

## Rules
- Design: `DESIGN.md` (tokens, rules) and `PRODUCT.md` (users: 3–5 year olds with an adult). UI changes follow them.
- Tables: `users`, `codes`, `fails`, `meta` (the schema version), `anim` / `anim_prev` (a letter's living picture and the version it replaced), `progress` (listened letters), `strokes` (track → JSON `[[[x,y],…],…]`, 0..1 of the guide square, writing order: body first, each dot its own one-point stroke), `writing` (best stars per user and letter). `progress`, `strokes` and `writing` key letters by the mp3 basename.
- Deleting a user must also delete their `progress` and `writing` rows and free their code.
- Tracks are the sorted `data/media/*.mp3`; the number prefix (`02 Ba …`) gives the Arabic name/letter in `lib.php`.
- One active session per account: `login_as()` writes a new `users.token`; `current_user()` rejects a session whose token doesn't match. Every authenticated endpoint uses `current_user()`. Exception: admins keep their token on login, so several people can use the admin account at once (the admin panel's "logout"/password reset still clears it).
- Failed login/register/reset attempts are rate-limited per IP (`MAX_FAILS`/hour).
- Schema changes go in `migrate()` in `lib.php` (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` when the column is missing), and **every schema change raises `SCHEMA_VERSION` by one**: `db()` reads the version from the `meta` table once per request and runs `migrate()` only when it is behind, so without the bump the change never reaches an existing database.
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
