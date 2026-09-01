<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$objectionId = isset($_GET['objectionId']) ? (int)$_GET['objectionId'] : 0;

if ($objectionId <= 0) {
    echo json_encode("error");
    exit;
}

try {
    $statement = $pdo->prepare("
        UPDATE objection
        SET archive_fl = 'Y'
        WHERE objection_id = ? AND user_id = ?
    ");
    $statement->execute([$objectionId, $current_user_id]);

    if ($statement->rowCount() === 0) {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM objection WHERE objection_id = ? AND user_id = ?");
        $checkStmt->execute([$objectionId, $current_user_id]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            echo json_encode("error");
            exit;
        }
    }

    echo json_encode("success");

} catch (Exception $e) {
    error_log("[archive_objection.php] An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
