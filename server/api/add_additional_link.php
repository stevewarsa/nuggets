<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->key)) {
    echo json_encode("error");
    exit;
}

$key    = $input->key;
$label  = $input->label ?? null;
$action = $input->action ?? null;

error_log("add_additional_link.php - Received data: user_id=" . $current_user_id . ", key=" . $key . ", label=" . $label . ", action=" . $action);

try {
    // Insert statement explicitly tracking the global multi-tenant user_id column
    $statement = $pdo->prepare("
        INSERT INTO additional_link (user_id, key_tx, label, action) 
        VALUES (?, ?, ?, ?)
    ");

    $statement->execute([
        $current_user_id,
        $key,
        $label,
        $action
    ]);

    error_log("Inserted new link successfully...");
    echo json_encode("success");

} catch (Exception $e) {
    error_log("An error occurred in add_additional_link.php: " . $e->getMessage());
    echo json_encode("error");
}
