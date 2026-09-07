<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// MEMORY PASSAGES flow — batch-updates frequency_days (box) for multiple passages in a single transaction.
require_once 'connect.php';

$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->passageIds) || !isset($input->frequencyDays)) {
    echo json_encode("error");
    exit;
}

$passageIds = $input->passageIds;
$frequencyDays = (int)$input->frequencyDays;

if (!is_array($passageIds) || count($passageIds) === 0 || $frequencyDays < 1 || $frequencyDays > 3) {
    echo json_encode("error");
    exit;
}

try {
    $pdo->beginTransaction();

    // Verify ownership of all passages in one query
    $placeholders = implode(',', array_fill(0, count($passageIds), '?'));
    $params = array_map('intval', $passageIds);
    $params[] = $current_user_id;

    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM memory_passage WHERE passage_id IN ($placeholders) AND user_id = ?");
    $checkStmt->execute($params);
    $ownedCount = (int)$checkStmt->fetchColumn();

    if ($ownedCount !== count($passageIds)) {
        throw new Exception("Unauthorized: User does not own all requested passages");
    }

    // Batch update frequency_days
    $updateStmt = $pdo->prepare("UPDATE memory_passage SET frequency_days = ? WHERE passage_id IN ($placeholders) AND user_id = ?");
    $updateParams = [$frequencyDays];
    $updateParams = array_merge($updateParams, array_map('intval', $passageIds));
    $updateParams[] = $current_user_id;
    $updateStmt->execute($updateParams);

    $pdo->commit();
    echo json_encode("success");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[update_passage_frequency.php] Error: " . $e->getMessage());
    echo json_encode("error");
}
