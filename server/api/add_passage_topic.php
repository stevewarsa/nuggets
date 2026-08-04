<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlResolve */
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */

// BROWSE BIBLE flow — associates topics (tags) with a nugget via the tag_nugget table.
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input) {
    echo json_encode("error");
    exit;
}

$topicIds  = $input->topicIds ?? [];
$nuggetId = $input->nuggetId ?? 0;

error_log("[add_passage_topic.php] Received data: user_id=$current_user_id, topicIds=" . json_encode($topicIds) . ", nuggetId=$nuggetId");

$response = "error";

if (count($topicIds) != 0 && $nuggetId > 0) {
    error_log("[add_passage_topic.php] Adding passage/topic mappings...");

    try {
        // Encase the multi-row insert loop inside a database transaction for top performance
        $pdo->beginTransaction();

        $statement = $pdo->prepare("
            INSERT INTO tag_nugget (user_id, tag_id, nugget_id) 
            VALUES (?, ?, ?)
        ");

        foreach ($topicIds as $topicId) {
            $statement->execute([
                $current_user_id,
                (int)$topicId,
                (int)$nuggetId
            ]);
        }

        $pdo->commit();
        $response = "success";
        error_log("[add_passage_topic.php] passage/topic mappings added. sending back success");

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[add_passage_topic.php] Database execution crash: " . $e->getMessage());
        $response = "error";
    }
} else {
    error_log("[add_passage_topic.php] Unable to add passage/topic mappings - criteria unmet.");
}

echo json_encode($response);
