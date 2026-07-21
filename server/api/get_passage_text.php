<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';
include_once('./Passage.php'); // Keeps your native OOP class models

// Safe extraction of parameters coming via URL query parameters
$translation = $_GET['translation'] ?? '';
$book        = $_GET['book'] ?? '';
$chapter     = (int)($_GET['chapter'] ?? 0);
$startVerse  = (int)($_GET['start'] ?? 0);
$endVerse    = (int)($_GET['end'] ?? 0);

try {
    // Single consolidated query pulling metrics grouped securely by the translation name string
    $statement = $pdo->prepare('
        SELECT v.verse, v.verse_part_id, v.verse_text, v.is_words_of_christ, v.book_id 
        FROM verse v
        INNER JOIN book b ON v.book_id = b._id 
        INNER JOIN translation t ON v.translation_id = t.translation_id
        WHERE t.translation_name = ? 
          AND b.book_name = ? 
          AND v.chapter = ? 
          AND v.verse >= ? 
          AND v.verse <= ? 
        ORDER BY v.verse, v.verse_part_id
    ');

    $statement->execute([$translation, $book, $chapter, $startVerse, $endVerse]);

    $passage = new Passage();
    $passage->passageId = -1;
    $passage->chapter = $chapter;
    $passage->startVerse = $startVerse;
    $passage->endVerse = $endVerse;
    $passage->bookId = 0; // Fallback initialization value

    $lastVerse = $startVerse;
    $verse = new Verse();
    $passage->addVerse($verse);
    $hasRows = false;

    while ($row = $statement->fetch()) {
        $hasRows = true;
        $passage->bookId = (int)$row["book_id"];
        $currentVerse = (int)$row["verse"];

        if ($currentVerse !== $lastVerse) {
            $lastVerse = $currentVerse;
            $verse = new Verse();
            $passage->addVerse($verse);
        }

        $versePart = new VersePart();
        $versePart->verseNumber = $currentVerse;
        $versePart->versePartId = (int)$row["verse_part_id"];
        $versePart->verseText   = $row["verse_text"];
        $versePart->wordsOfChrist = ($row["is_words_of_christ"] === "Y");

        $verse->addVersePart($versePart);
    }

    // Return empty payload array matching original expected behavior if no verses were found
    echo json_encode($hasRows ? $passage : null);

} catch (Exception $e) {
    error_log("An error occurred in get_passage_text.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
