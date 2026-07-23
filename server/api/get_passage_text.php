<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

require_once 'connect.php';
include_once('./Passage.php');

$translation = $_GET['translation'] ?? '';
$book        = $_GET['book'] ?? '';
$chapter     = (int)($_GET['chapter'] ?? 0);
$startVerse  = (int)($_GET['start'] ?? 0);
$endVerse    = (int)($_GET['end'] ?? 0);

try {

    // First resolve translation name to ID
    $translationStatement = $pdo->prepare('
        SELECT translation_id
        FROM translation
        WHERE translation_name = ?
    ');

    $translationStatement->execute([$translation]);
    $translationId = $translationStatement->fetchColumn();

    if ($translationId === false) {
        echo json_encode(null);
        exit;
    }


    // Then resolve book name to ID
    $bookStatement = $pdo->prepare('
        SELECT _id
        FROM book
        WHERE book_name = ?
    ');

    $bookStatement->execute([$book]);
    $bookId = $bookStatement->fetchColumn();

    if ($bookId === false) {
        echo json_encode(null);
        exit;
    }


    // Now use the optimized verse lookup
    $statement = $pdo->prepare('
        SELECT verse,
               verse_part_id,
               verse_text,
               is_words_of_christ,
               book_id
        FROM verse
        WHERE translation_id = ?
          AND book_id = ?
          AND chapter = ?
          AND verse >= ?
          AND verse <= ?
        ORDER BY verse, verse_part_id
    ');

    $statement->execute([
        $translationId,
        $bookId,
        $chapter,
        $startVerse,
        $endVerse
    ]);


    $passage = new Passage();
    $passage->passageId = -1;
    $passage->chapter = $chapter;
    $passage->startVerse = $startVerse;
    $passage->endVerse = $endVerse;
    $passage->bookId = 0;

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
        $versePart->verseText = $row["verse_text"];
        $versePart->wordsOfChrist = ($row["is_words_of_christ"] === "Y");

        $verse->addVersePart($versePart);
    }

    echo json_encode($hasRows ? $passage : null);

} catch (Exception $e) {
    error_log("An error occurred in get_passage_text.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}