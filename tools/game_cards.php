<?php
// php tools/game_cards.php
// Copies the owner's game cards from public/img/extra-game1 (named by letter: "ب.webp" = word card, "ب+.webp" = picture)
// to public/img/game/NN.webp and NNp.webp, and cuts each picture out of its coloured disc into NNc.webp (transparent),
// which the games use for shadows and for dragging. Run it again after adding or replacing cards.
$from = __DIR__ . '/../public/img/extra-game1';
$to = __DIR__ . '/../public/img/game';
@mkdir($to);
foreach (preg_split('//u', 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', -1, PREG_SPLIT_NO_EMPTY) as $k => $c) {
    $nn = sprintf('%02d', $k + 1);
    foreach (['' => '', '+' => 'p'] as $suf => $out) {
        if (is_file("$from/$c$suf.webp")) copy("$from/$c$suf.webp", "$to/$nn$out.webp");
    }
    if (is_file("$to/{$nn}p.webp")) {
        cutout("$to/{$nn}p.webp", "$to/{$nn}c.webp");
        echo "$nn ";
    } else echo "\n$nn ($c): no picture\n";
}
echo "\n";

/**
 * The picture sits on a flat disc of one colour: everything outside the disc goes, then a flood fill from the disc's rim
 * removes the disc colour up to the drawing's outlines, then one more pass clears the blended pixels along that edge.
 */
function cutout(string $src, string $dst): void
{
    $im = imagecreatefromwebp($src);
    imagepalettetotruecolor($im);
    $w = imagesx($im); $h = imagesy($im); $cx = $w / 2; $cy = $h / 2; $r = min($w, $h) / 2;
    $rgb = fn($x, $y) => [($c = imagecolorat($im, $x, $y)) >> 16 & 255, $c >> 8 & 255, $c & 255];
    // the disc colour: the most common colour on a ring just inside the rim
    $votes = [];
    for ($a = 0; $a < 360; $a += 2) {
        [$R, $G, $B] = $rgb((int)($cx + cos(deg2rad($a)) * $r * 0.93), (int)($cy + sin(deg2rad($a)) * $r * 0.93));
        $key = ($R >> 3) . ',' . ($G >> 3) . ',' . ($B >> 3);
        $votes[$key][] = [$R, $G, $B];
    }
    uasort($votes, fn($p, $q) => count($q) <=> count($p));
    $bg = array_map(fn($i) => array_sum(array_column(reset($votes), $i)) / count(reset($votes)), [0, 1, 2]);
    $far = fn($p, $tol) => abs($p[0] - $bg[0]) + abs($p[1] - $bg[1]) + abs($p[2] - $bg[2]) > $tol;

    $gone = array_fill(0, $w * $h, false);
    $stack = [];
    for ($y = 0; $y < $h; $y++) for ($x = 0; $x < $w; $x++) {
        $d = hypot($x + .5 - $cx, $y + .5 - $cy);
        if ($d > $r * 0.96) $gone[$y * $w + $x] = true;
        elseif ($d > $r * 0.9 && !$far($rgb($x, $y), 60)) $stack[] = [$x, $y];
    }
    while ($stack) {
        [$x, $y] = array_pop($stack);
        $i = $y * $w + $x;
        if ($gone[$i] || $far($rgb($x, $y), 60)) continue;
        $gone[$i] = true;
        foreach ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [$dx, $dy]) {
            $nx = $x + $dx; $ny = $y + $dy;
            if ($nx >= 0 && $ny >= 0 && $nx < $w && $ny < $h && !$gone[$ny * $w + $nx]) $stack[] = [$nx, $ny];
        }
    }
    $edge = $gone;
    for ($y = 1; $y < $h - 1; $y++) for ($x = 1; $x < $w - 1; $x++) {
        $i = $y * $w + $x;
        if (!$gone[$i] && ($gone[$i - 1] || $gone[$i + 1] || $gone[$i - $w] || $gone[$i + $w]) && !$far($rgb($x, $y), 150)) $edge[$i] = true;
    }
    $out = imagecreatetruecolor($w, $h);
    imagealphablending($out, false);
    imagesavealpha($out, true);
    $clear = imagecolorallocatealpha($out, 0, 0, 0, 127);
    for ($y = 0; $y < $h; $y++) for ($x = 0; $x < $w; $x++) {
        imagesetpixel($out, $x, $y, $edge[$y * $w + $x] ? $clear : imagecolorat($im, $x, $y));
    }
    imagewebp($out, $dst, 90);
}
