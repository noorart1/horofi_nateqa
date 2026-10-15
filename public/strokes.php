<?php
// Stroke paths of one letter for the writing practice, for the logged-in player only.
require __DIR__ . '/../lib.php';
session_write_close();

if (!current_user() || ($_SERVER['HTTP_X_PLAYER'] ?? '') !== '1') {
    http_response_code(403);
    exit;
}
$file = tracks()[(int)($_GET['t'] ?? -1)] ?? null;
$s = db()->prepare('SELECT data FROM strokes WHERE track = ?');
$s->execute([$file ? basename($file) : '']);
$data = $s->fetchColumn();
if (!$data) {
    http_response_code(404);
    exit;
}
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo $data;
