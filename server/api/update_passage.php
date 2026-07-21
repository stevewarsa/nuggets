<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->passage)) {
    echo json_encode("error");
    exit;
}

error_log("[update_passage.php] Processing update for user_id: " . $current_user_id);

$passageId               = $input->passage->passageId;
$chapter                 = $input->passage->chapter;
$startVerse              = $input->passage->startVerse;
$endVerse                = $input->passage->endVerse;
$translation             = $input->passage->translationName;
$frequency               = $input->passage->frequencyDays;
$newText                 = $input->newText ?? null;
$passageRefAppendLetter = $input->passageRefAppendLetter ?? null;
$explanation             = $input->passage->explanation ?? null;

try {
    $pdo->beginTransaction();

    // --- Step 1: Verify Parent Ownership (Multi-Tenant Security Check) ---
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM passage WHERE passage_id = ? AND user_id = ?");
    $checkStmt->execute([$passageId, $current_user_id]);
    if ((int)$checkStmt->fetchColumn() === 0) {
        throw new Exception("Unauthorized: User does not own passage_id {$passageId}");
    }

    // --- Step 2: Update core passage data ---
    $statement = $pdo->prepare('UPDATE passage SET chapter = ?, start_verse = ?, end_verse = ? WHERE passage_id = ? AND user_id = ?');
    $statement->execute([$chapter, $startVerse, $endVerse, $passageId, $current_user_id]);

    // --- Step 3: Update core memory configurations ---
    $statement = $pdo->prepare('UPDATE memory_passage SET preferred_translation_cd = ?, frequency_days = ? WHERE passage_id = ? AND user_id = ?');
    $statement->execute([$translation, $frequency, $passageId, $current_user_id]);

    // --- Step 4: Handle explanation details using native UPSERT ---
    if ($explanation !== null) {
        $statement = $pdo->prepare('
            INSERT INTO passage_explanation (passage_id, explanation) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE explanation = VALUES(explanation)
        ');
        $statement->execute([$passageId, $explanation]);
    }

    // --- Step 5: Handle text overrides using conditional updates ---
    if ($newText !== null) {
        $statement = $pdo->prepare('
            INSERT INTO passage_text_override (passage_id, verse_num, override_text, passage_ref_append_letter) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                verse_num = VALUES(verse_num), 
                override_text = VALUES(override_text), 
                passage_ref_append_letter = VALUES(passage_ref_append_letter)
        ');
        $statement->execute([$passageId, $startVerse, $newText, $passageRefAppendLetter]);
    } else if ($passageRefAppendLetter !== null) {
        $statement = $pdo->prepare('UPDATE passage_text_override SET passage_ref_append_letter = ? WHERE passage_id = ?');
        $statement->execute([$passageRefAppendLetter, $passageId]);
    }

    $pdo->commit();
    echo json_encode("success");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[update_passage.php] - Fail crash occurred: " . $e->getMessage());
    echo json_encode("error");
}
