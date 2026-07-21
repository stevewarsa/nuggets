<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

try {
    // Select history records safely restricted by history_record_type and the multi-tenant user_id
    $statement = $pdo->prepare("
        SELECT passage_id, date_viewed_str, date_viewed_long 
        FROM history 
        WHERE history_record_type = 'MEM_PRACTICE' AND user_id = ? 
        ORDER BY date_viewed_long DESC
    ");
    $statement->execute([$current_user_id]);

    $arrayName = array();
    while ($row = $statement->fetch()) {
        $historyRec = new stdClass;
        $historyRec->passageId      = (int)$row['passage_id'];
        $historyRec->dateViewedStr  = $row['date_viewed_str'];
        $historyRec->dateViewedLong = (int)$row['date_viewed_long'];
        $arrayName[] = $historyRec;
    }

    echo json_encode($arrayName);

} catch (Exception $e) {
    error_log("An error occurred in get_mem_practice_history.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
