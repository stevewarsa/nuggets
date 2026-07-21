<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';
include_once './Book.php';
include_once './Passage.php';

try {
    // A single optimized multi-tenant query pulling all structural properties simultaneously
    // Replaced implicit joins with explicit JOIN structures and dropped the 'queued' constraint entirely
    $statement = $pdo->prepare("
        SELECT 
            p.passage_id, 
            p.book_id, 
            p.chapter, 
            p.start_verse, 
            p.end_verse,
            b.book_name,
            m.preferred_translation_cd, 
            m.frequency_days, 
            m.last_viewed_str, 
            m.last_viewed_num,
            pe.explanation
        FROM passage p
        INNER JOIN memory_passage m ON m.passage_id = p.passage_id AND m.user_id = p.user_id
        INNER JOIN book b ON b._id = p.book_id
        LEFT JOIN passage_explanation pe ON pe.passage_id = p.passage_id
        WHERE p.user_id = ?
    ");

    $statement->execute([$current_user_id]);
    $psgArray = array();

    while ($row = $statement->fetch()) {
        $passage = new Passage();
        $passage->passageId       = (int)$row['passage_id'];
        $passage->bookId          = (int)$row['book_id'];
        $passage->bookName        = $row['book_name'];
        $passage->chapter         = (int)$row['chapter'];
        $passage->startVerse      = (int)$row['start_verse'];
        $passage->endVerse        = (int)$row['end_verse'];
        $passage->translationName = $row['preferred_translation_cd'];
        $passage->frequencyDays   = (int)$row['frequency_days'];
        $passage->last_viewed_str = $row['last_viewed_str'];
        $passage->last_viewed_num = $row['last_viewed_num'] !== null ? (int)$row['last_viewed_num'] : 0;
        $passage->explanation     = $row['explanation'] ?? "";

        $psgArray[] = $passage;
    }

    echo json_encode($psgArray);

} catch (Exception $e) {
    error_log("An error occurred in get_mempsg_list.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
