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

$objectionId = (int)($input->objectionId ?? 0);

if ($objectionId <= 0) {
    echo json_encode("error");
    exit;
}

try {
    $pdo->beginTransaction();

    // --- Insert practice history entry ---
    $statement = $pdo->prepare("
        INSERT INTO objection_practice_history (objection_id, user_id)
        VALUES (?, ?)
    ");
    $statement->execute([
        $objectionId,
        $current_user_id
    ]);

    $practiceId = (int)$pdo->lastInsertId();

    // --- Update last_practiced_dt on the objection ---
    $updateStmt = $pdo->prepare("
        UPDATE objection
        SET last_practiced_dt = NOW()
        WHERE objection_id = ? AND user_id = ?
    ");
    $updateStmt->execute([$objectionId, $current_user_id]);

    $pdo->commit();
    echo json_encode($practiceId);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[add_objection_practice.php] An error occurred: " . $e->getMessage());
    echo json_encode("error");
}
