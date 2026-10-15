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
db()->prepare('INSERT INTO writing(user_id, track, stars) VALUES (?, ?, ?)
    ON CONFLICT(user_id, track) DO UPDATE SET stars = MAX(stars, excluded.stars)')->execute([$u['id'], basename($file), $stars]);
http_response_code(204);
