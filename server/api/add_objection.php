<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input) {
    echo json_encode("error");
    exit;
}

$categoryId     = (int)($input->categoryId ?? 0);
$objectionText  = trim($input->objectionText ?? '');
$answers        = $input->answers ?? array();

if ($categoryId <= 0 || $objectionText === '') {
    echo json_encode("error");
    exit;
}

try {
    $pdo->beginTransaction();

    // --- Step 1: Insert the objection ---
    $statement = $pdo->prepare("
        INSERT INTO objection (user_id, category_id, objection_tx, archive_fl)
        VALUES (?, ?, ?, 'N')
    ");
    $statement->execute([
        $current_user_id,
        $categoryId,
        $objectionText
    ]);

    $objectionId = (int)$pdo->lastInsertId();

    // --- Step 2: Insert each answer ---
    $sortOrder = 0;
    $answerStmt = $pdo->prepare("
        INSERT INTO objection_answer (objection_id, answer_type_cd, answer_tx, source_text, source_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    foreach ($answers as $ans) {
        $answerText = trim($ans->answerText ?? '');
        if ($answerText === '') {
            continue;
        }
        $answerStmt->execute([
            $objectionId,
            $ans->answerTypeCd ?? 'short',
            $answerText,
            !empty($ans->sourceText) ? $ans->sourceText : null,
            !empty($ans->sourceUrl) ? $ans->sourceUrl : null,
            $sortOrder++
        ]);
    }

    $pdo->commit();

    // Return the new objection id
    echo json_encode($objectionId);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[add_objection.php] An error occurred: " . $e->getMessage());
    echo json_encode("error");
}
