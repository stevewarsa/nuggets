<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

$topicNm = $input->topicNm ?? null;

$response = new stdClass;
$response->topicId = -1;
$response->message = "error";

if (!$topicNm || empty(trim($topicNm))) {
    error_log("Topic was empty, returning...");
    echo json_encode($response);
    exit;
}

error_log("Inserting new topic " . $topicNm . " for user_id=" . $current_user_id . "...");

try {
    // Insert statement with multi-tenant isolation tracking
    $statement = $pdo->prepare("INSERT INTO tag (user_id, tag_name) VALUES (?, ?)");
    $statement->execute([$current_user_id, trim($topicNm)]);

    // Get the newly generated tag_id using MariaDB's native mechanism
    $response->topicId = (int)$pdo->lastInsertId();
    $response->message = "success";

    error_log("New topic id " . $response->topicId . " retrieved successfully.");

} catch (Exception $e) {
    error_log("An error occurred in add_new_topic.php: " . $e->getMessage());
}

echo json_encode($response);
