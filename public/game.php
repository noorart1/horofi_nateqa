<?php
// «دنياي السعيدة»: five card games for a logged-in user (game-data.js holds the words, levels and badges; game.js the
// games). Children's profiles and progress live in the browser (localStorage), so a family shares one account.
require __DIR__ . '/../lib.php';

if (!current_user()) {
    header('Location: ./');
    exit;
}
// which pictures exist: a card needs its word card, picture and cut-out (tools/game_cards.php)
$have = array_map('basename', glob(__DIR__ . '/img/game/*.webp') ?: []);
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
<script>const GAME_FILES = new Set(<?= json_encode($have) ?>);</script>
<script defer src="party.js?v=<?= $v('party.js') ?>"></script>
<script defer src="game-data.js?v=<?= $v('game-data.js') ?>"></script>
<script defer src="game.js?v=<?= $v('game.js') ?>"></script>
</body>
</html>
