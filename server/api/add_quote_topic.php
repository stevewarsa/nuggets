<?php
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */

// Pulls in unified headers, handles OPTIONS requests, connects to MariaDB, and sets $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input) {
    $response = new stdClass;
    $response->message = "error";
    echo json_encode($response);
    exit;
}

$topics  = $input->topics ?? [];
$quoteId = $input->quoteId ?? 0;

error_log("[add_quote_topic.php] Received data: user_id=" . $current_user_id . ", topicIds=" . json_encode($topics) . ", quoteId=" . $quoteId);

$response = new stdClass;
$response->quoteId = $quoteId;

if (empty($topics) || $quoteId <= 0) {
    if (empty($topics)) {
        error_log("[add_quote_topic.php] Topics array was empty, returning...");
    } else {
        error_log("[add_quote_topic.php] Quote id is " . $quoteId . ", returning...");
    }
    $response->topics = array();
    $response->message = "error";
    echo json_encode($response);
    exit;
}

try {
    $pdo->beginTransaction();

    if ($topics[0]->id == -1) {
        // --- Path A: Inserting a brand new tag/topic and mapping it ---
        error_log("[add_quote_topic.php] Inserting new tag/topic...");
        $topic = $topics[0];
        
        $statement = $pdo->prepare("INSERT INTO tag (user_id, tag_name) VALUES (?, ?)");
        $statement->execute([$current_user_id, $topic->name]);
        
        // Grab the auto-incremented primary key ID assigned natively by MariaDB
        $topicId = (int)$pdo->lastInsertId();
        $topic->id = $topicId;
        error_log("[add_quote_topic.php] New tag id {$topicId} retrieved");

        if ($topic->id > 0) {
            // Also map this newly created tag to the quote right away
            $assocStatement = $pdo->prepare("INSERT INTO quote_tag (tag_id, quote_id) VALUES (?, ?)");
            $assocStatement->execute([$topic->id, $quoteId]);

            $response->topics = array($topic);
            $response->message = "success";
        } else {
            $response->topics = array();
            $response->message = "error";
        }

    } else {
        // --- Path B: Mapping existing tag IDs to the quote ---
        error_log("[add_quote_topic.php] Inserting quote/topic mappings...");
        
        $statement = $pdo->prepare("INSERT INTO quote_tag (tag_id, quote_id) VALUES (?, ?)");
        foreach ($topics as $topic) {
            $statement->execute([(int)$topic->id, $quoteId]);
        }
        
        $response->message = "success";
        $response->topics = $topics;
        error_log("[add_quote_topic.php] Quote/topic mappings inserted successfully.");
    }

    $pdo->commit();
    echo json_encode($response);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[add_quote_topic.php] - A database error occurred: " . $e->getMessage());
    $response->topics = array();
    $response->message = "error";
    echo json_encode($response);
}
