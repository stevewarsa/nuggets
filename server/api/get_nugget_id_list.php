<?php /** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection PhpParamsInspection */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf8");

$user = $_GET["user"];
$db = new SQLite3("db/memory_$user.db");

$results = $db->query("
SELECT 
    n.nugget_id,
    n.book_id,
    n.chapter,
    n.start_verse,
    n.end_verse,
    t.tag_id,
    t.tag_name
FROM nugget n
LEFT JOIN tag_nugget tn ON n.nugget_id = tn.nugget_id
LEFT JOIN tag t ON tn.tag_id = t.tag_id
");

$passages = array();
while ($row = $results->fetchArray()) {
    $nuggetId = $row["nugget_id"];

    // If we haven't seen this nugget yet, create the base object
    if (!isset($passages[$nuggetId])) {
        $obj = new stdClass;
        $obj->passageId = (int)$nuggetId;
        $obj->bookId = (int)$row["book_id"];
        $obj->chapter = (int)$row["chapter"];
        $obj->startVerse = (int)$row["start_verse"];
        $obj->endVerse = (int)$row["end_verse"];

        // You may want to initialize these even if not set in DB yet
        $obj->bookName = "";
        $obj->translationId = "";
        $obj->translationName = "";
        $obj->verseText = "";
        $obj->frequencyDays = 0;
        $obj->last_viewed_str = "";
        $obj->last_viewed_num = 0;
        $obj->passageRefAppendLetter = "";
        $obj->verses = array();
        $obj->topics = array();  // will fill below
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

$db->close();
print_r(json_encode(array_values($passages)));
