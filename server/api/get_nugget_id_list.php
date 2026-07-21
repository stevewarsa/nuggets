<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Prepare multi-tenant isolated query
/** @var PDO $pdo this is populated inside connect.php */
$stmt = $pdo->prepare("
    SELECT 
        n.nugget_id, 
        n.book_id, 
        n.chapter, 
        n.start_verse, 
        n.end_verse, 
        t.tag_id, 
        t.tag_name 
    FROM nugget n 
    LEFT JOIN tag_nugget tn ON n.nugget_id = tn.nugget_id AND tn.user_id = n.user_id
    LEFT JOIN tag t ON tn.tag_id = t.tag_id AND t.user_id = n.user_id
    WHERE n.user_id = ? OR n.global_fl = 'Y'
");

/** @var string $current_user_id his is populated inside connect.php */
$stmt->execute([$current_user_id]);
$passages = array();

while ($row = $stmt->fetch()) {
    $nuggetId = $row["nugget_id"];

    // If we haven't seen this nugget yet, create the base object
    if (!isset($passages[$nuggetId])) {
        $obj = new stdClass;
        $obj->passageId = (int)$nuggetId;
        $obj->bookId = (int)$row["book_id"];
        $obj->chapter = (int)$row["chapter"];
        $obj->startVerse = (int)$row["start_verse"];
        $obj->endVerse = (int)$row["end_verse"];

        // Match original schema object definitions
        $obj->bookName = "";
        $obj->translationId = "";
        $obj->translationName = "";
        $obj->verseText = "";
        $obj->frequencyDays = 0;
        $obj->last_viewed_str = "";
        $obj->last_viewed_num = 0;
        $obj->passageRefAppendLetter = "";
        $obj->verses = array();
        $obj->topics = array();
        $obj->explanation = "";

        $passages[$nuggetId] = $obj;
    }

    // Add tag if it exists (tag_id can be NULL due to LEFT JOIN)
    if (!is_null($row["tag_id"])) {
        $topic = new stdClass;
        $topic->id = (int)$row["tag_id"];
        $topic->name = $row["tag_name"];
        $passages[$nuggetId]->topics[] = $topic;
    }
}

// print_r combined with json_encode adds messy string debug formats.
// Echoing raw json_encode outputs a clean production payload directly to React.
echo json_encode(array_values($passages));
