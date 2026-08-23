<?php
/** @noinspection PhpParamsInspection */
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Unified REST endpoint to fetch all memory passages fully hydrated with verse text.
require_once 'connect.php'; // Defines $current_user_id and $pdo
include_once './Passage.php';

// Safety check for user session resolution
if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized access. User session not found."]);
    exit;
}

try {
    header("Content-Type: application/json; charset=UTF-8");

    // 1. Fetch the master passage list (reconstructed from your original flow)
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
    $passageIds = array();

    while ($row = $statement->fetch()) {
        $passage = new Passage();
        $passage->passageId             = (int)$row['passage_id'];
        $passage->nuggetId              = null;
        $passage->bookId                = (int)$row['book_id'];
        $passage->bookName              = $row['book_name'];
        $passage->chapter               = (int)$row['chapter'];
        $passage->startVerse            = (int)$row['start_verse'];
        $passage->endVerse              = (int)$row['end_verse'];
        $passage->translationName       = $row['preferred_translation_cd'];
        $passage->frequencyDays         = (int)$row['frequency_days'];
        $passage->last_viewed_str       = $row['last_viewed_str'];
        $passage->last_viewed_num       = $row['last_viewed_num'] !== null ? (int)$row['last_viewed_num'] : -1;
        $passage->explanation           = $row['explanation'] ?? "";
        $passage->passageRefAppendLetter = null;
        $passage->verses                = array();
        $passage->topics                = array();

        // Key by passageId for O(1) text hydration injection inside loops
        $psgArray[$passage->passageId] = $passage;
        $passageIds[] = $passage->passageId;
    }

    if (empty($passageIds)) {
        echo json_encode(array());
        exit;
    }

    // 2. Query Text Overrides using your actual table schema columns
    $overrideStmt = $pdo->prepare("
        SELECT p_to.passage_id, p_to.passage_ref_append_letter, p_to.verse_num, p_to.override_text, p_to.words_of_christ
        FROM passage_text_override p_to
        INNER JOIN passage p ON p.passage_id = p_to.passage_id
        WHERE p.user_id = ?
    ");
    $overrideStmt->execute([$current_user_id]);

    $overrideTracker = array();
    while ($ovRow = $overrideStmt->fetch()) {
        $pid = (int)$ovRow['passage_id'];
        
        // Track that this item has an override so we skip pulling bible text later
        $overrideTracker[$pid] = true;

        if (isset($psgArray[$pid])) {
            $psgArray[$pid]->passageRefAppendLetter = $ovRow['passage_ref_append_letter'];
            
            // Build native objects using your strict system logic structures
            $verse = new Verse();
            $versePart = new VersePart();
            $versePart->verseNumber = (int)$ovRow['verse_num'];
            $versePart->versePartId = null;
            $versePart->verseText   = $ovRow['override_text'];
            $versePart->wordsOfChrist = ($ovRow['words_of_christ'] === "Y");
            
            $verse->addVersePart($versePart);
            $psgArray[$pid]->addVerse($verse);
        }
    }

    // 3. Fallback: Hydrate the remaining records directly from the verse table
    // Replicates your exact database translation and verse queries from file 3
    foreach ($psgArray as $pid => $passage) {
        if (isset($overrideTracker[$pid])) {
            continue;
        }

        // Resolve translation code to translation_id
        $tStmt = $pdo->prepare('SELECT translation_id FROM translation WHERE translation_name = ?');
        $tStmt->execute([$passage->translationName]);
        $tId = $tStmt->fetchColumn();

        if ($tId === false) {
            continue;
        }

        // Optimized query mirroring your true 'verse' table infrastructure
        $vStmt = $pdo->prepare('
            SELECT verse, verse_part_id, verse_text, is_words_of_christ
            FROM verse
            WHERE translation_id = ?
              AND book_id = ?
              AND chapter = ?
              AND verse >= ?
              AND verse <= ?
            ORDER BY verse, verse_part_id
        ');
        $vStmt->execute([
            $tId,
            $passage->bookId,
            $passage->chapter,
            $passage->startVerse,
            $passage->endVerse
        ]);

        $lastVerseNum = $passage->startVerse;
        $verse = new Verse();
        $passage->addVerse($verse);
        $hasRows = false;

        while ($vRow = $vStmt->fetch()) {
            $hasRows = true;
            $currentVerseNum = (int)$vRow["verse"];

            if ($currentVerseNum !== $lastVerseNum) {
                $lastVerseNum = $currentVerseNum;
                $verse = new Verse();
                $passage->addVerse($verse);
            }

            $versePart = new VersePart();
            $versePart->verseNumber   = $currentVerseNum;
            $versePart->versePartId   = (int)$vRow["verse_part_id"];
            $versePart->verseText     = $vRow["verse_text"];
            $versePart->wordsOfChrist = ($vRow["is_words_of_christ"] === "Y");

            $verse->addVersePart($versePart);
        }

        // If no records were matched from the translation database, clear the array placeholder
        if (!$hasRows) {
            $passage->verses = array();
        }
    }

    // Flatten array keys for sequential json list generation output
    echo json_encode(array_values($psgArray), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log("An error occurred in get_hydrated_mempsg_list.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
