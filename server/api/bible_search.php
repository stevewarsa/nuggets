<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Imports headers, establishes $pdo, parses json payload, and isolates $current_user_id
require_once 'connect.php';
include_once('./Passage.php'); // Keeps your native OOP class models

// Grab the pre-parsed JSON parameters safely from our connect.php global wrapper
$input = json_decode(json_encode($GLOBAL_JSON_INPUT), true);

$translations = $input['translations'] ?? [];
$testament    = $input['testament'] ?? 'both';
$book         = $input['book'] ?? 'All';
$txt          = $input['searchPhrase'] ?? '';

error_log("[bible_search.php] Received search string: " . $txt);

if (empty($translations)) {
    echo json_encode([]);
    exit;
}

// --- Step 1: Map text translation names to MariaDB translation_ids ---
$transPlaceholders = implode(',', array_fill(0, count($translations), '?'));
$transMapStmt = $pdo->prepare("SELECT translation_id, translation_name FROM translation WHERE translation_name IN ($transPlaceholders)");
$transMapStmt->execute($translations);

$translationIdMap = [];
while ($tRow = $transMapStmt->fetch()) {
    $translationIdMap[$tRow['translation_id']] = $tRow['translation_name'];
}
$translationIds = array_keys($translationIdMap);

if (empty($translationIds)) {
    echo json_encode([]);
    exit;
}

// --- Step 2: Build the Main Optimized Search Query ---
$params = [];

// Removed UPPER() from both the inner subquery and outer query to let MariaDB handle case-insensitivity natively
$selectSql = "
    SELECT 
        v.chapter, 
        v.verse, 
        v.verse_part_id, 
        v.verse_text, 
        v.is_words_of_christ,
        v.translation_id,
        b.book_name, 
        b._id AS book_id
    FROM verse v
    INNER JOIN book b ON b._id = v.book_id
    INNER JOIN (
        SELECT DISTINCT v2.translation_id, v2.book_id, v2.chapter, v2.verse
        FROM verse v2
        WHERE v2.translation_id IN (" . implode(',', array_fill(0, count($translationIds), '?')) . ")
          AND v2.verse_text LIKE ?
    ) matches ON v.translation_id = matches.translation_id 
             AND v.book_id = matches.book_id 
             AND v.chapter = matches.chapter 
             AND v.verse = matches.verse
    WHERE v.translation_id IN (" . implode(',', array_fill(0, count($translationIds), '?')) . ")
";

// Bind params for the inner subquery lookups
$params = array_merge($params, $translationIds);

// Format the wildcard string - REMOVED strtoupper() so the raw keyword maps directly
$modSearchString = $txt;
$modSearchString = str_replace('*', '%', $modSearchString);
if (strpos($modSearchString, "%") !== 0) {
    $modSearchString = "%" . $modSearchString;
}
if (substr($modSearchString, -1) !== "%") {
    $modSearchString = $modSearchString . "%";
}
$params[] = $modSearchString;

// Bind params for the outer query filters
$params = array_merge($params, $translationIds);

// Inject logical testament restrictions into the outer selection pool
if ($testament == 'new') {
    $selectSql .= " AND v.book_id >= 40";
} else if ($testament == 'old') {
    $selectSql .= " AND v.book_id <= 39";
} else if ($testament == 'gospels') {
    $selectSql .= " AND v.book_id >= 40 AND v.book_id <= 43";
} else if ($testament == 'pauls_letters') {
    $selectSql .= " AND v.book_id >= 45 AND v.book_id <= 57";
} else if ($testament == 'non_pauline_letters') {
    $selectSql .= " AND v.book_id >= 58 AND v.book_id <= 65";
}

if ($book != null && $book != "All") {
    $selectSql .= " AND b.book_name = ?";
    $params[] = $book;
}

$selectSql .= " ORDER BY v.translation_id, b._id, v.chapter, v.verse, v.verse_part_id";

// --- Step 3: Stream and Assemble the Object Model Tree ---
$stmt = $pdo->prepare($selectSql);
$stmt->execute($params);

$arrayName = array();
$passageGroup = [];

while ($row = $stmt->fetch()) {
    $tName = $translationIdMap[$row['translation_id']];
    $groupKey = $tName . "_" . $row['book_id'] . "_" . $row['chapter'] . "_" . $row['verse'];

    if (!isset($passageGroup[$groupKey])) {
        $passage = new Passage();
        $passage->passageId = -1;
        $passage->bookId = $row["book_id"];
        $passage->bookName = $row["book_name"];
        $passage->chapter = $row["chapter"];
        $passage->startVerse = $row["verse"];
        $passage->endVerse = $row["verse"];
        $passage->translationId = $tName;
        $passage->translationName = $tName;

        $verseObj = new Verse();
        $verseObj->passageId = -1;

        $passage->addVerse($verseObj);
        $passageGroup[$groupKey] = [
                'passage' => $passage,
                'verse'   => $verseObj
        ];
    }

    $versePart = new VersePart();
    $versePart->verseNumber = $row["verse"];
    $versePart->versePartId = $row["verse_part_id"];
    $versePart->verseText = $row["verse_text"];
    $isWOC = $row["is_words_of_christ"];
    $versePart->wordsOfChrist = ($isWOC === "Y" || $isWOC === "y" || $isWOC === "1" || $isWOC === 1 || $isWOC === true);

    $passageGroup[$groupKey]['verse']->addVersePart($versePart);
}

foreach ($passageGroup as $group) {
    $arrayName[] = $group['passage'];
}

// Standard output return handling (preferences block safely removed)
echo json_encode($arrayName);
