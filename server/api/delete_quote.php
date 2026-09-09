<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$quoteId = isset($_GET['quoteId']) ? (int)$_GET['quoteId'] : 0;

if ($quoteId <= 0) {
    echo json_encode("error");
    exit;
}

try {
    $statement = $pdo->prepare("DELETE FROM quote WHERE quote_id = ? AND user_id = ?");
    $statement->execute([$quoteId, $current_user_id]);

    if ($statement->rowCount() === 0) {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM quote WHERE quote_id = ? AND user_id = ?");
        $checkStmt->execute([$quoteId, $current_user_id]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            echo json_encode("error");
            exit;
        }
    }

    echo json_encode("success");

} catch (Exception $e) {
    error_log("[delete_quote.php] An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
