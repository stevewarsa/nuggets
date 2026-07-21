<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$includeQuoteText = $_GET['includeQuoteText'] ?? 'false';

try {
    // Dynamically adjust select list fields based on request configurations
    if ($includeQuoteText === "true") {
        $queryStr = "
            SELECT q.quote_id, qt.tag_id, q.quote_tx, q.approved, q.sent_from_user, q.source_id 
            FROM quote q 
            LEFT JOIN quote_tag qt ON q.quote_id = qt.quote_id
            WHERE q.user_id = ?
        ";
    } else {
        $queryStr = "
            SELECT q.quote_id, qt.tag_id, q.approved, q.sent_from_user, q.source_id 
            FROM quote q 
            LEFT JOIN quote_tag qt ON q.quote_id = qt.quote_id
            WHERE q.user_id = ?
        ";
    }

    $statement = $pdo->prepare($queryStr);
    $statement->execute([$current_user_id]);

    $quotesByQuoteId = array();

    while ($row = $statement->fetch()) {
        $quoteId = (int)$row['quote_id'];

        if (!isset($quotesByQuoteId[$quoteId])) {
            $quote = new stdClass;
            $quote->quoteId  = $quoteId;
            $quote->quoteTx  = ($includeQuoteText === "true") ? $row['quote_tx'] : null;
            $quote->approved = $row['approved'];
            $quote->fromUser = $row['sent_from_user'];
            $quote->sourceId = $row['source_id'] !== null ? (int)$row['source_id'] : null;
            $quote->tagIds   = array();

            if ($row['tag_id'] !== null) {
                $quote->tagIds[] = (int)$row['tag_id'];
            }

            $quotesByQuoteId[$quoteId] = $quote;
        } else {
            if ($row['tag_id'] !== null) {
                $quotesByQuoteId[$quoteId]->tagIds[] = (int)$row['tag_id'];
            }
        }
    }

    echo json_encode(array_values($quotesByQuoteId));

} catch (Exception $e) {
    error_log("An error occurred in get_quote_list.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
