<?php
// php tools/test_anim.php: clean_anim() accepts the sample export and rejects broken or unsafe files.
require __DIR__ . '/../lib.php';

$ok = file_get_contents(__DIR__ . '/anim-fa.json');
$j = json_decode($ok, true);
$with = function (callable $f) use ($j) { $f($j); return json_encode($j); };
$cases = [
    'sample' => [$ok, true],
    'wrong kind' => [$with(function (&$j) { $j['kind'] = 'other'; }), false],
    'newer schema' => [$with(function (&$j) { $j['schema'] = 2; }), false],
    'broken JSON' => [substr($ok, 0, -5), false],
    'over 3 MB' => [$with(function (&$j) { $j['pad'] = str_repeat('a', 3 << 20); }), false],
    'text/html data URI' => [$with(function (&$j) { $j['data']['x'] = 'data:text/html;base64,' . base64_encode('<script>alert(1)</script>'); }), false],
    'script in a name' => [$with(function (&$j) { $j['data']['singers'][0]['name'] = '<script>alert(1)</script>'; }), false],
    'bad base64' => [$with(function (&$j) { $j['data']['singers'][0]['tap'] = ['s' => 'custom', 'data' => 'data:audio/mpeg;base64,@@@']; }), false],
    'custom tap sound' => [$with(function (&$j) { $j['data']['singers'][0]['tap'] = ['s' => 'custom', 'data' => 'data:audio/mpeg;base64,' . base64_encode('ID3')]; }), true],
    'too many singers' => [$with(function (&$j) { $j['data']['singers'] = array_fill(0, 7, $j['data']['singers'][0]); }), false],
    'infinite number' => [str_replace('"zoom":2.2', '"zoom":1e999', $ok), false],
    'unknown keys kept' => [$with(function (&$j) { $j['data']['future'] = ['a' => 1]; }), true],
];
$fails = 0;
foreach ($cases as $name => [$json, $want]) {
    $got = clean_anim($json, $why) !== null;
    if ($got !== $want) $fails++;
    printf("%s %s%s\n", $got === $want ? 'ok  ' : 'FAIL', $name, $why ? " ($why)" : '');
}
assert(str_contains($ok, '"zoom":2.2')); // the infinite-number case edits this text
exit($fails ? 1 : 0);
