<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->objection)) {
    echo json_encode("error");
    exit;
}

$obj = $input->objection;
$objectionId = (int)($obj->objectionId ?? 0);

if ($objectionId <= 0) {
    echo json_encode("error");
    exit;
}

error_log("[update_objection.php] Processing update for user_id=$current_user_id, objectionId=$objectionId");

try {
    $pdo->beginTransaction();

    // --- Step 1: Update objection, verifying ownership ---
    $statement = $pdo->prepare('
        UPDATE objection
        SET objection_tx = ?,
            category_id  = ?
        WHERE objection_id = ? AND user_id = ?
    ');
    $statement->execute([
        trim($obj->objectionText ?? ''),
        (int)($obj->categoryId ?? 0),
        $objectionId,
        $current_user_id
    ]);

    if ($statement->rowCount() === 0) {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM objection WHERE objection_id = ? AND user_id = ?");
        $checkStmt->execute([$objectionId, $current_user_id]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            throw new Exception("Unauthorized: User does not own objection_id $objectionId");
        }
    }

    // --- Step 2: Replace answers (delete old, insert new) ---
    $deleteStmt = $pdo->prepare("DELETE FROM objection_answer WHERE objection_id = ?");
    $deleteStmt->execute([$objectionId]);

    $answers = $obj->answers ?? array();
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
    echo json_encode("success");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[update_objection.php] An error occurred: " . $e->getMessage());
    echo json_encode("error");
}
