<?php
/** @noinspection SqlDialectInspection */
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->quote)) {
    echo json_encode("error");
    exit;
}

$quote = $input->quote;

error_log("[update_quote.php] Received data: user_id=" . $current_user_id . ", quoteTx=" . $quote->quoteTx . ", sourceId=" . ($quote->sourceId ?? 'null') . ", quoteId=" . $quote->quoteId);

try {
    // Isolate the update operation strictly to the current multi-tenant user's record
    $statement = $pdo->prepare('UPDATE quote SET quote_tx = ? WHERE quote_id = ? AND user_id = ?');
    $statement->execute([
        $quote->quoteTx,
        (int)$quote->quoteId,
        $current_user_id
    ]);

    echo json_encode("success");

} catch (Exception $e) {
    error_log("An error occurred while updating the quote: " . $e->getMessage());
    echo json_encode("error");
}
