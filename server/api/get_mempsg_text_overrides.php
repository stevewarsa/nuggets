<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';
include_once('./Passage.php'); // Keeps your native OOP class models

try {
    // Because passage_text_override doesn't have user_id, we join passage to enforce multi-tenant separation
    $statement = $pdo->prepare("
        SELECT 
            p_to.passage_id, 
            p_to.passage_ref_append_letter, 
            p_to.verse_num, 
            p_to.override_text, 
            p_to.words_of_christ
        FROM passage_text_override p_to
        INNER JOIN passage p ON p.passage_id = p_to.passage_id
        WHERE p.user_id = ?
    ");
    $statement->execute([$current_user_id]);

    $psgArray = array();
    while ($row = $statement->fetch()) {
        $passage = new Passage();
        $passage->passageId               = (int)$row["passage_id"];
        $passage->passageRefAppendLetter = $row["passage_ref_append_letter"];

        $verse = new Verse();
        $passage->addVerse($verse);

        $versePart = new VersePart();
        $versePart->verseNumber = (int)$row["verse_num"];
        $versePart->verseText   = $row["override_text"];
        $versePart->wordsOfChrist = ($row["words_of_christ"] === "Y");

        $verse->addVersePart($versePart);
        $psgArray[] = $passage;
    }

    echo json_encode($psgArray);

} catch (Exception $e) {
    error_log("An error occurred in get_mempsg_text_overrides.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
