<?php
// «دنياي السعيدة»: five card games for a logged-in user (game-data.js holds the words, levels and badges; game.js the
// games). Children's profiles and progress live in the browser (localStorage), so a family shares one account.
require __DIR__ . '/../lib.php';

$user = current_user();
if (!$user) {
    header('Location: ./');
    exit;
}
// which pictures exist, with their versions (a card needs its word card, picture and cut-out: tools/game_cards.php)
$have = [];
foreach (glob(__DIR__ . '/img/game/*.webp') ?: [] as $f) $have[basename($f)] = image_version($f);
$v = fn($f) => filemtime(__DIR__ . "/$f");
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>دنياي السعيدة · حروفي الناطقة</title>
<link rel="stylesheet" href="fonts/vazirmatn.css?v=<?= $v('fonts/vazirmatn.css') ?>">
<link rel="stylesheet" href="fonts/rubik.css?v=<?= $v('fonts/rubik.css') ?>">
<link rel="stylesheet" href="style.css?v=<?= $v('style.css') ?>">
</head>
<body>
<main class="game-page" id="app" aria-live="polite"></main>
<script>const GAME_FILES = <?= json_encode((object)$have) ?>, USER_NAME = <?= json_encode($user['username'], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?>;</script>
<script defer src="party.js?v=<?= $v('party.js') ?>"></script>
<script defer src="sfx.js?v=<?= $v('sfx.js') ?>"></script>
<script defer src="game-data.js?v=<?= $v('game-data.js') ?>"></script>
<script defer src="game.js?v=<?= $v('game.js') ?>"></script>
</body>
</html>
