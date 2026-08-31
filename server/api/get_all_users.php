<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';

try {
    // Query users along with their last active timestamp
    $stmt = $pdo->query("SELECT user_id, user_nm, last_active_dt FROM user ORDER BY user_nm ASC");

    $userArray = array();

    while ($row = $stmt->fetch()) {
        $userName = $row['user_nm'];

        $obj = new stdClass;
        $obj->userName     = $userName;
        $obj->fileName     = "memory_" . $userName . ".db";

        // Use the real last active timestamp from the database, falling
        // back to a neutral placeholder if the column is null.
        if ($row['last_active_dt'] !== null) {
            $timestamp = strtotime($row['last_active_dt']);
            $obj->numLastMod   = $timestamp;
            $obj->lastModified = date('F d Y, H:i:s', $timestamp);
        } else {
            $obj->numLastMod   = 0;
            $obj->lastModified = 'Never';
        }

        $obj->userId       = (int)$row['user_id'];

        $userArray[] = $obj;
    }

    echo json_encode($userArray);

} catch (Exception $e) {
    error_log("An error occurred in get_all_users.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
