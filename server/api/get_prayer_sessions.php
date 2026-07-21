<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// The target schema keeps user_id as a VARCHAR string for this specific table.
// We extract the original string representation from the incoming query string.
$userStringName = $_GET['userId'] ?? '';

if (empty($userStringName)) {
    echo json_encode("error");
    exit;
}

error_log("[get_prayer_sessions.php] Getting prayer sessions for user $userStringName...");

try {
    // Isolate the query using the user name string to match the target schema definition
    $statement = $pdo->prepare("
        SELECT session_id, prayer_id, user_id, prayer_date_time, prayer_note_tx 
        FROM prayer_session 
        WHERE user_id = ?
        ORDER BY prayer_date_time DESC
    ");
    $statement->execute([$userStringName]);

    $prayerSessions = array();
    while ($row = $statement->fetch()) {
        $prayerSessions[] = array(
            'sessionId'    => (int)$row['session_id'],
            'prayerId'     => (int)$row['prayer_id'],
            'userId'       => $row['user_id'],
            'dateTime'     => $row['prayer_date_time'],
            'prayerNoteTx' => $row['prayer_note_tx']
        );
    }

    echo json_encode($prayerSessions);

} catch (Exception $e) {
    error_log("[get_prayer_sessions.php] - An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
