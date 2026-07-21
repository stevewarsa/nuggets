<?php
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';
include_once('./Tag.php');
include_once('./Passage.php');

try {
    if (isset($_REQUEST['tagId'])) {
        // --- Responsibility A: Pull passages linked to a specific category ID ---
        // Cross-references your target tables while securely isolating records via user_id
        $statement = $pdo->prepare("
            SELECT p.nugget_id, p.book_id, p.chapter, p.start_verse, p.end_verse 
            FROM tag t
            INNER JOIN tag_nugget tp ON t.tag_id = tp.tag_id AND t.user_id = tp.user_id
            INNER JOIN nugget p ON tp.nugget_id = p.nugget_id AND tp.user_id = p.user_id
            WHERE t.tag_id = ? AND t.user_id = ?
            ORDER BY p.book_id, p.chapter, p.start_verse
        ");
        $statement->execute([(int)$_REQUEST['tagId'], $current_user_id]);

        $arrayName = array();
        while ($row = $statement->fetch()) {
            $passage = new Passage();
            $passage->passageId  = (int)$row['nugget_id'];
            $passage->bookId     = (int)$row['book_id'];
            $passage->chapter    = (int)$row['chapter'];
            $passage->startVerse = (int)$row['start_verse'];
            $passage->endVerse   = (int)$row['end_verse'];
            $arrayName[] = $passage;
        }

        echo json_encode($arrayName);

    } else {
        // --- Responsibility B: Standard listing of available topics/tags ---
        // MariaDB lowercase sorting is handled efficiently using native LOWER() string conversions
        $statement = $pdo->prepare("
            SELECT tag_id, tag_name 
            FROM tag 
            WHERE user_id = ? OR global_fl = 'Y'
            ORDER BY LOWER(tag_name) ASC
        ");
        $statement->execute([$current_user_id]);

        $arrayName = array();
        while ($row = $statement->fetch()) {
            $tag = new Tag();
            $tag->id   = (int)$row['tag_id'];
            $tag->name = $row['tag_name'];
            $arrayName[] = $tag;
        }

        // This guarantees an untainted JSON array payload string (e.g. '[]' if empty)
        echo json_encode($arrayName);
    }

} catch (Exception $e) {
    error_log("An error occurred in get_tag_list.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([]); // Safe empty collection fallback ensures React never blows up
}
