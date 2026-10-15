<?php
// Marks a letter as listened to the end, for the logged-in user.
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
db()->prepare(insert_ignore() . ' INTO progress(user_id, track) VALUES (?, ?)')->execute([$u['id'], basename($file)]);
http_response_code(204);
