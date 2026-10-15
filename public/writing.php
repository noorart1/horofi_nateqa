<?php
// Stores the best writing-practice score (1–3 stars) of a letter, for the logged-in user.
require __DIR__ . '/../lib.php';
session_write_close();

$u = current_user();
if (!$u || $_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_PLAYER'] ?? '') !== '1') {
    http_response_code(403);
    exit;
}
$file = tracks()[(int)($_POST['t'] ?? -1)] ?? null;
if (!$file) {
    http_response_code(404);
    exit;
}
$stars = min(max((int)($_POST['stars'] ?? 0), 1), 3);
// keep the best score: add the row if new, else raise it (two statements that work in MySQL and SQLite)
$key = [$u['id'], basename($file)];
db()->prepare(insert_ignore() . ' INTO writing(user_id, track, stars) VALUES (?, ?, ?)')->execute([...$key, $stars]);
db()->prepare('UPDATE writing SET stars = ? WHERE user_id = ? AND track = ? AND stars < ?')->execute([$stars, ...$key, $stars]);
http_response_code(204);
