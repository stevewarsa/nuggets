<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// MEMORY PASSAGES flow — bulk-imports memory passages from another user into the current user's list.
// Receives a JSON body: { user: "target_username", sourcePassageIds: [1, 2, 3] }
// For each source passage, checks if the target user already has an identical passage
// (same book_id, chapter, start_verse, end_verse). Skips duplicates, imports the rest.
// Returns: { imported: N, skipped: N, totalRequested: N }
require_once 'connect.php';

$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->sourcePassageIds) || !is_array($input->sourcePassageIds) || count($input->sourcePassageIds) === 0) {
    echo json_encode(["error" => "No passage IDs provided"]);
    exit;
}

$sourcePassageIds = array_map('intval', $input->sourcePassageIds);
$totalRequested = count($sourcePassageIds);

try {
    $pdo->beginTransaction();

    // Fetch the source passages with their memory_passage data
    $placeholders = implode(',', array_fill(0, count($sourcePassageIds), '?'));
    $fetchStmt = $pdo->prepare("
        SELECT p.book_id, p.chapter, p.start_verse, p.end_verse, m.preferred_translation_cd
        FROM passage p
        INNER JOIN memory_passage m ON m.passage_id = p.passage_id AND m.user_id = p.user_id
        WHERE p.passage_id IN ($placeholders)
    ");
    $fetchStmt->execute($sourcePassageIds);
    $sourcePassages = $fetchStmt->fetchAll();

    if (count($sourcePassages) === 0) {
        $pdo->rollBack();
        echo json_encode(["imported" => 0, "skipped" => 0, "totalRequested" => $totalRequested]);
        exit;
    }

    // Fetch the target user's existing passages to check for duplicates
    $existingStmt = $pdo->prepare("
        SELECT book_id, chapter, start_verse, end_verse
        FROM passage
        WHERE user_id = ?
    ");
    $existingStmt->execute([$current_user_id]);
    $existingPassages = $existingStmt->fetchAll();

    // Build a set of existing passage signatures for fast lookup
    $existingSet = [];
    foreach ($existingPassages as $row) {
        $key = $row['book_id'] . ':' . $row['chapter'] . ':' . $row['start_verse'] . ':' . $row['end_verse'];
        $existingSet[$key] = true;
    }

    $imported = 0;
    $skipped = 0;

    $insertPassageStmt = $pdo->prepare('
        INSERT INTO passage (user_id, book_id, chapter, start_verse, end_verse)
        VALUES (?, ?, ?, ?, ?)
    ');

    $insertMemoryPassageStmt = $pdo->prepare('
        INSERT INTO memory_passage (user_id, passage_id, preferred_translation_cd, frequency_days)
        VALUES (?, ?, ?, 1)
    ');

    foreach ($sourcePassages as $row) {
        $key = $row['book_id'] . ':' . $row['chapter'] . ':' . $row['start_verse'] . ':' . $row['end_verse'];

        if (isset($existingSet[$key])) {
            $skipped++;
            continue;
        }

        // Insert into passage table
        $insertPassageStmt->execute([
            $current_user_id,
            (int)$row['book_id'],
            (int)$row['chapter'],
            (int)$row['start_verse'],
            (int)$row['end_verse'],
        ]);

        $newPassageId = (int)$pdo->lastInsertId();

        // Insert into memory_passage table
        $insertMemoryPassageStmt->execute([
            $current_user_id,
            $newPassageId,
            $row['preferred_translation_cd'],
        ]);

        // Mark as existing to prevent dupes within the same batch
        $existingSet[$key] = true;
        $imported++;
    }

    $pdo->commit();

    echo json_encode([
        "imported" => $imported,
        "skipped" => $skipped,
        "totalRequested" => $totalRequested
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[import_memory_passages.php] Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
