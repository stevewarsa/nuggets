<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Safe extraction of parameters coming via URL query parameters
$passageId     = $_GET['passageId'] ?? null;
$lastViewedNum = $_GET['lastViewedNum'] ?? null;
$lastViewedStr = isset($_GET['lastViewedStr']) ? urldecode($_GET['lastViewedStr']) : null;

if ($passageId === null) {
    echo json_encode("error");
    exit;
}

try {
    // Isolate the update operation strictly to the current multi-tenant user's record
    $statement = $pdo->prepare('
        UPDATE memory_passage 
        SET last_viewed_str = ?, 
            last_viewed_num = ? 
        WHERE passage_id = ? AND user_id = ?
    ');

    $statement->execute([
        $lastViewedStr,
        $lastViewedNum !== null ? (int)$lastViewedNum : null,
        (int)$passageId,
        $current_user_id
    ]);

    echo json_encode("success");

} catch (Exception $e) {
    error_log("An error occurred in update_last_viewed.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
