<?php
// Serves a resized WebP copy of an image in public/img, generated once and cached in data/cache.
const NO_SESSION = true; // pictures are public: no session file, so many load at once without waiting on its lock
require __DIR__ . '/../lib.php';

$name = (string)($_GET['f'] ?? '');
$width = (int)($_GET['w'] ?? 0);
$src = ROOT . '/public/img/' . $name;
// a file in public/img, or in its icon/ folder (the letters' round icons) or banner/ (the living banner's background); no other path
if (!in_array($width, IMAGE_WIDTHS, true) || !preg_match('~^(icon/|banner/)?[\w-][\w.-]*\.(webp|jpe?g|png)$~iD', $name) || !is_file($src)) {
    http_response_code(404);
    exit;
}

$out = ROOT . '/data/cache/' . strtr($name, '/', '_') . "-$width-" . image_version($src) . '.webp'; // a replaced image gets a new cache file
if (!is_file($out)) {
    $im = imagecreatefromstring(file_get_contents($src));
    if (!$im) {
        http_response_code(500);
        exit;
    }
    if (imagesx($im) > $width) { // imagecopyresampled: imagescale(IMG_BICUBIC) returns false on some system GD builds
        $h = (int)round(imagesy($im) * $width / imagesx($im));
        $small = imagecreatetruecolor($width, $h);
        imagealphablending($small, false);
        imagesavealpha($small, true); // keep PNG transparency
        imagecopyresampled($small, $im, 0, 0, 0, 0, $width, $h, imagesx($im), imagesy($im));
        $im = $small;
    }
    @mkdir(dirname($out), 0775, true);
    $tmp = "$out." . getmypid();
    imagewebp($im, $tmp, 80);
    rename($tmp, $out); // atomic, so a parallel request never serves a half-written file
}

header('Content-Type: image/webp');
header('Content-Length: ' . filesize($out));
header('Cache-Control: public, max-age=31536000, immutable');
readfile($out);
