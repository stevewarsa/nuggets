<?php
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->answer)) {
    echo json_encode("error");
    exit;
}

$prompt   = $input->prompt ?? null;
$quoteTxt = $input->answer;
$sourceId = $input->sourceId ?? null;
$fromUser = $input->fromUser ?? null;

error_log("Received data: user_id=" . $current_user_id . ", prompt=" . $prompt . ", quote=" . $quoteTxt . ", sourceId=" . $sourceId);

$quoteId = -1;

try {
    // Determine the query structure securely based on input parameters and inject multi-tenant user_id
    if ($sourceId !== null && $fromUser !== null) {
        $statement = $pdo->prepare("
            INSERT INTO quote (user_id, quote_tx, sent_from_user, approved, source_id) 
            VALUES (?, ?, ?, 'Y', ?)
        ");
        $statement->execute([$current_user_id, $quoteTxt, $fromUser, $sourceId]);
    } else {
        $statement = $pdo->prepare("
            INSERT INTO quote (user_id, quote_tx, approved) 
            VALUES (?, ?, 'Y')
        ");
        $statement->execute([$current_user_id, $quoteTxt]);
    }

    // Capture the newly generated auto-increment id natively
    $quoteId = (int)$pdo->lastInsertId();

    if ($quoteId !== 0) {
        error_log("Last quote id retrieved successfully");

        $quote = new stdClass;
        $quote->quoteId = $quoteId;
        $quote->quoteTx = $quoteTxt;
        $quote->approved = 'Y';
        $quote->fromUser = $fromUser;
        $quote->sourceId = $sourceId;

        echo json_encode($quote);
    } else {
        error_log("Last Quote ID inserted not found - returning error");
        echo json_encode("error");
    }

} catch (Exception $e) {
    error_log("An error occurred in add_nonbible_memory_fact.php: " . $e->getMessage());
    echo json_encode("error");
}
