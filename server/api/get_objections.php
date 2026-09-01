<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

error_log("[get_objections.php] Getting objections for user_id $current_user_id ...");

$categoryId = isset($_GET['categoryId']) ? (int)$_GET['categoryId'] : null;
$includeAnswers = isset($_GET['includeAnswers']) ? filter_var($_GET['includeAnswers'], FILTER_VALIDATE_BOOLEAN) : false;
$includeArchived = isset($_GET['includeArchived']) ? filter_var($_GET['includeArchived'], FILTER_VALIDATE_BOOLEAN) : false;

try {
    // When a categoryId is provided, return only objections in that category.
    // When no categoryId is given, return all objections for the user (optionally
    // filtered by archive flag) — used by the practice screen.
    if ($categoryId !== null) {
        $sql = "
            SELECT o.objection_id, o.category_id, o.objection_tx, o.archive_fl,
                   o.last_practiced_dt, c.category_nm
            FROM objection o
            JOIN objection_category c ON o.category_id = c.category_id
            WHERE o.user_id = ? AND o.category_id = ?
        ";
        $params = [$current_user_id, $categoryId];
    } else {
        $sql = "
            SELECT o.objection_id, o.category_id, o.objection_tx, o.archive_fl,
                   o.last_practiced_dt, c.category_nm
            FROM objection o
            JOIN objection_category c ON o.category_id = c.category_id
            WHERE o.user_id = ?
        ";
        $params = [$current_user_id];
    }

    if (!$includeArchived) {
        $sql .= " AND o.archive_fl = 'N'";
    }
    $sql .= " ORDER BY o.objection_tx";

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    $objections = array();
    while ($row = $statement->fetch()) {
        $obj = array(
            'objectionId'      => (int)$row['objection_id'],
            'userId'           => (string)$current_user_id,
            'categoryId'       => (int)$row['category_id'],
            'objectionText'    => $row['objection_tx'],
            'archiveFl'        => $row['archive_fl'],
            'lastPracticedDt'  => $row['last_practiced_dt'] !== null ? formatUtcIso8601($row['last_practiced_dt']) : null,
            'categoryName'     => $row['category_nm'],
        );
        $objections[] = $obj;
    }

    // Optionally fetch answers for each objection
    if ($includeAnswers && count($objections) > 0) {
        $objectionIds = array_column($objections, 'objectionId');
        $placeholders = implode(',', array_fill(0, count($objectionIds), '?'));
        $answerStmt = $pdo->prepare("
            SELECT answer_id, objection_id, answer_type_cd, answer_tx, source_text, source_url, sort_order
            FROM objection_answer
            WHERE objection_id IN ($placeholders)
            ORDER BY sort_order, answer_id
        ");
        $answerStmt->execute($objectionIds);

        $answersByObj = array();
        while ($aRow = $answerStmt->fetch()) {
            $answersByObj[(int)$aRow['objection_id']][] = array(
                'answerId'      => (int)$aRow['answer_id'],
                'objectionId'   => (int)$aRow['objection_id'],
                'answerTypeCd'  => $aRow['answer_type_cd'],
                'answerText'    => $aRow['answer_tx'],
                'sourceText'    => $aRow['source_text'] !== null ? $aRow['source_text'] : null,
                'sourceUrl'     => $aRow['source_url'] !== null ? $aRow['source_url'] : null,
                'sortOrder'     => (int)$aRow['sort_order'],
            );
        }

        foreach ($objections as &$obj) {
            $obj['answers'] = isset($answersByObj[$obj['objectionId']]) ? $answersByObj[$obj['objectionId']] : array();
        }
    }

    echo json_encode($objections);

} catch (Exception $e) {
    error_log("[get_objections.php] - An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
