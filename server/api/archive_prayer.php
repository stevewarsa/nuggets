<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Safe extraction of parameters coming via URL query parameters
$prayerId = $_GET['prayerId'] ?? null;

if ($prayerId === null) {
    echo json_encode("error");
    exit;
}

error_log("[archive_prayer.php] Archiving prayer for user_id $current_user_id with prayerId $prayerId...");

$returnVal = "error";

try {
    // Isolate the operation to the current multi-tenant user
    $statement = $pdo->prepare("UPDATE prayer SET archive_fl = 'Y' WHERE prayer_id = ? AND user_id = ?");
    $statement->execute([$prayerId, $current_user_id]);

    // Check if any rows were actually modified
    $numChanges = $statement->rowCount();
    error_log("[archive_prayer.php] Archiving prayer for user_id $current_user_id with prayerId $prayerId... There were $numChanges rows updated.");

    if ($numChanges > 0) {
        $returnVal = "success";
    }

} catch (Exception $e) {
    error_log("[archive_prayer.php] - An error occurred while archiving the prayer: " . $e->getMessage());
}

echo json_encode($returnVal);
