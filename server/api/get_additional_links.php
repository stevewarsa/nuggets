<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

error_log("get_additional_links.php - Received data for user_id=" . $current_user_id);

try {
    // Select entries filtered cleanly by the multi-tenant user_id column
    $statement = $pdo->prepare("SELECT key_tx, label, action FROM additional_link WHERE user_id = ?");
    $statement->execute([$current_user_id]);

    $linksArray = array();
    while ($row = $statement->fetch()) {
        $link = new stdClass;
        $link->key = $row['key_tx'];
        $link->label = $row['label'];
        $link->action = $row['action'];
        $linksArray[] = $link;
    }

    echo json_encode($linksArray);

} catch (Exception $e) {
    error_log("An error occurred in get_additional_links.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
