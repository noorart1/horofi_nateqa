<?php
// A letter's living picture (see clean_anim), for anim/player.html; only for a logged-in user.
require __DIR__ . '/../lib.php';
session_write_close();

if (!current_user()) {
    http_response_code(403);
    exit;
}
$track = basename((string)($_GET['track'] ?? ''));
$s = db()->prepare('SELECT data, updated FROM anim WHERE track = ?');
$s->execute([in_array($track, array_map('basename', tracks()), true) ? $track : '']);
$row = $s->fetch();
if (!$row) {
    http_response_code(404);
    exit;
}
$etag = '"' . md5($row['updated'] . '-' . strlen($row['data'])) . '"';
header('Content-Type: application/json');
header('Cache-Control: private, no-cache'); // cached, but checked against the ETag every time
header("ETag: $etag");
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
echo $row['data'];
