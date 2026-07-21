<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input) {
    echo json_encode("error");
    exit;
}

$prayerId     = $input->prayerId;
$prayerNoteTx = $input->prayerNoteTx ?? null;

// The target schema keeps user_id as a VARCHAR string for this specific table.
// We extract the original string representation from our global variable ecosystem.
$userStringName = $_REQUEST['user'] ?? $input->userId ?? '';

$sessionId = -1;

try {
    // --- Insert into the target prayer_session table ---
    $statement = $pdo->prepare("
        INSERT INTO prayer_session (prayer_id, user_id, prayer_note_tx) 
        VALUES (?, ?, ?)
    ");
    $statement->execute([
        $prayerId,
        $userStringName,
        $prayerNoteTx
    ]);

    // Grab the auto-incremented primary key generated natively by MariaDB
    $sessionId = (int)$pdo->lastInsertId();

    echo json_encode($sessionId);

} catch (Exception $e) {
    error_log("An error occurred in add_prayer_session.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
