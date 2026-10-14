<?php
// Usage: php import_codes.php [license.xlsx]   — safe to re-run, existing codes are kept.
require __DIR__ . '/lib.php';

$file = $argv[1] ?? __DIR__ . '/license.xlsx';
$zip = new ZipArchive();
if ($zip->open($file) !== true) exit("Cannot open $file\n");

$shared = [];
if (($xml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
    foreach ((new SimpleXMLElement($xml))->si as $si) $shared[] = strip_tags($si->asXML());
}
$sheet = new SimpleXMLElement($zip->getFromName('xl/worksheets/sheet1.xml'));

$ins = db()->prepare('INSERT OR IGNORE INTO codes(code) VALUES (?)');
db()->beginTransaction();
$total = $new = 0;
foreach ($sheet->sheetData->row as $row) {
    foreach ($row->c as $c) {
        $t = (string)$c['t'];
        $v = $t === 's' ? $shared[(int)$c->v] : ($t === 'inlineStr' ? (string)$c->is->t : (string)$c->v);
        $v = trim($v);
        if ($v === '') continue;
        $ins->execute([$v]);
        $total++;
        $new += $ins->rowCount();
    }
}
db()->commit();
echo "$total codes read, $new new.\n";
