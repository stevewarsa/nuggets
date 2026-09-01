<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

error_log("[get_objection_practice_history.php] Getting practice history for user_id $current_user_id ...");

try {
    $statement = $pdo->prepare("
        SELECT
            oph.practice_id,
            oph.objection_id,
            oph.user_id,
            oph.practiced_dt
        FROM objection_practice_history oph
        WHERE oph.user_id = ?
        ORDER BY oph.practiced_dt DESC
    ");
    $statement->execute([$current_user_id]);

    $history = array();
    while ($row = $statement->fetch()) {
        $history[] = array(
            'practiceId'    => (int)$row['practice_id'],
            'objectionId'   => (int)$row['objection_id'],
            'userId'        => $row['user_id'],
            'practicedDt'   => formatUtcIso8601($row['practiced_dt']),
        );
    }

    echo json_encode($history);

} catch (Exception $e) {
    error_log("[get_objection_practice_history.php] - An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
