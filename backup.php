<?php
// Usage: php backup.php   — consistent copy of the database into data/backups, keeping the newest 30.
// Run daily from cron, e.g.:  0 3 * * *  php /path/to/backup.php
// MySQL: app-….sql.gz (can be imported in phpMyAdmin); SQLite: app-….db
require __DIR__ . '/lib.php';

const KEEP = 30;
$dir = ROOT . '/data/backups';
@mkdir($dir, 0775, true);
$db = db();
$stamp = date('Y-m-d-His');

if (is_mysql()) {
    $file = "$dir/app-$stamp.sql.gz";
    $gz = gzopen($file, 'wb6');
    $db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT'); // one point in time while the site is in use
    foreach ($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
        gzwrite($gz, "DROP TABLE IF EXISTS `$t`;\n" . $db->query("SHOW CREATE TABLE `$t`")->fetch(PDO::FETCH_NUM)[1] . ";\n");
        foreach ($db->query("SELECT * FROM `$t`", PDO::FETCH_NUM) as $row) {
            $vals = array_map(fn($v) => $v === null ? 'NULL' : $db->quote((string)$v), $row);
            gzwrite($gz, "INSERT INTO `$t` VALUES (" . implode(',', $vals) . ");\n");
        }
    }
    $db->exec('COMMIT');
    gzclose($gz);
} else {
    $file = "$dir/app-$stamp.db";
    $db->exec('VACUUM INTO ' . $db->quote($file)); // safe while the site is in use
}

$all = glob("$dir/app-*");
sort($all);
foreach (array_slice($all, 0, max(0, count($all) - KEEP)) as $old) unlink($old);
echo "Backup: $file\n";
