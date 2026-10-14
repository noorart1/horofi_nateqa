<?php
// Serves a track only to a logged-in player, XOR-scrambled with the session key,
// so the network response is not a playable file and the URL can't be opened directly.
require __DIR__ . '/../lib.php';

$key = $_SESSION['key'] ?? null;
session_write_close();
if (empty($_SESSION['uid']) || !$key || ($_SERVER['HTTP_X_PLAYER'] ?? '') !== '1') {
    http_response_code(403);
    exit;
}
$file = tracks()[(int)($_GET['t'] ?? -1)] ?? null;
if (!$file) {
    http_response_code(404);
    exit;
}

$data = file_get_contents($file);
$len = strlen($data);
header('Content-Type: application/octet-stream');
header('Cache-Control: no-store');
header('Content-Length: ' . $len);
echo $data ^ substr(str_repeat($key, intdiv($len, strlen($key)) + 1), 0, $len);
