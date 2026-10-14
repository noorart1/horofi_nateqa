<?php
// Usage: php backup.php   — consistent copy of the database into data/backups, keeping the newest 30.
// Run daily from cron, e.g.:  0 3 * * *  php /path/to/backup.php
require __DIR__ . '/lib.php';

const KEEP = 30;
$dir = ROOT . '/data/backups';
@mkdir($dir, 0775, true);
$file = "$dir/app-" . date('Y-m-d-His') . '.db';
db()->exec('VACUUM INTO ' . db()->quote($file)); // safe while the site is in use

$all = glob("$dir/app-*.db");
sort($all);
foreach (array_slice($all, 0, max(0, count($all) - KEEP)) as $old) unlink($old);
echo "Backup: $file\n";
