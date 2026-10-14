<?php
// Usage: php make_admin.php <username>             — give an existing user admin access (panel: /admin.php)
//        php make_admin.php <username> <password>  — same, creating the user (no license code needed) or setting its password
//        php make_admin.php <username> --remove
require __DIR__ . '/lib.php';

$user = $argv[1] ?? exit("Usage: php make_admin.php <username> [<password> | --remove]\n");
$arg = $argv[2] ?? null;

if ($arg === '--remove') {
    $s = db()->prepare('UPDATE users SET is_admin = 0 WHERE username = ?');
    $s->execute([$user]);
    exit($s->rowCount() ? "Admin removed.\n" : "No such user: $user\n");
}
if ($arg !== null) {
    if (strlen($arg) < 6) exit("Password must be at least 6 characters.\n");
    $hash = password_hash($arg, PASSWORD_DEFAULT);
    $s = db()->prepare('UPDATE users SET pass = ?, token = NULL WHERE username = ?');
    $s->execute([$hash, $user]);
    if (!$s->rowCount()) {
        if (!preg_match('/^[A-Za-z0-9_.-]{3,32}$/', $user)) exit("Invalid username.\n");
        db()->prepare('INSERT INTO users(username, pass) VALUES (?, ?)')->execute([$user, $hash]);
        echo "Created user $user.\n";
    }
}
$s = db()->prepare('UPDATE users SET is_admin = 1 WHERE username = ?');
$s->execute([$user]);
echo $s->rowCount() ? "$user is admin.\n" : "No such user: $user\n";
