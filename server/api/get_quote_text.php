<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$quoteId = $_GET['quoteId'] ?? null;

if ($quoteId === null) {
    echo json_encode(null);
    exit;
}

try {
    // Parameterized search isolated cleanly to the matching user record
    $statement = $pdo->prepare("SELECT quote_tx FROM quote WHERE quote_id = ? AND user_id = ?");
    $statement->execute([(int)$quoteId, $current_user_id]);

    $quote = null;
    if ($row = $statement->fetch()) {
        $quote = $row['quote_tx'];
    }

    echo json_encode($quote);

} catch (Exception $e) {
    error_log("An error occurred in get_quote_text.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
