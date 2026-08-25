<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Returns distinct words from the verse table, grouped by translation and section.
// The frontend uses this as an autocomplete dictionary for the Bible Search phrase field.
// Structure: { "asv": { "both": ["word1","word2",...], "new": [...], "old": [...], ... }, "kjv": { ... } }
// Sections: both, new (NT), old (OT), gospels, pauls_letters, non_pauline_letters
//
// Performance strategy: one simple query fetching translation_id, book_id, verse_text
// (no joins, no regex in SQL). Word extraction and bucketing happen in PHP, which is
// far faster than MariaDB's REGEXP_REPLACE on 440K rows. The result is cached to a JSON
// file so subsequent requests are instant. Pass ?refresh=1 to force a rebuild.
require_once 'connect.php';

$cacheFile = __DIR__ . '/dictionary_cache.json';
$forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] == '1';

// Serve from cache if it exists and no refresh is requested
if (!$forceRefresh && file_exists($cacheFile)) {
    header('Content-Type: application/json');
    readfile($cacheFile);
    exit;
}

// Section definitions: [book_id_min, book_id_max]
$sections = [
    'both'                 => [1, 66],
    'new'                  => [40, 66],
    'old'                  => [1, 39],
    'gospels'              => [40, 43],
    'pauls_letters'        => [45, 57],
    'non_pauline_letters'  => [58, 65],
];

// Precompute book_id range for each section so we can bucket in one pass
// Structure: result[translation_name][section_name] = [word1, word2, ...]
$result = [];

// Fetch translation name mapping
$transMapStmt = $pdo->query("SELECT translation_id, translation_name FROM translation ORDER BY translation_name");
$translationIdMap = [];
while ($tRow = $transMapStmt->fetch()) {
    $translationIdMap[$tRow['translation_id']] = $tRow['translation_name'];
}

if (empty($translationIdMap)) {
    echo json_encode(new stdClass());
    exit;
}

// Initialize result structure with empty arrays for each translation/section
foreach ($translationIdMap as $transName) {
    $result[$transName] = [];
    foreach ($sections as $sectionName => $range) {
        $result[$transName][$sectionName] = [];
    }
}

// Single query: fetch only the columns we need, unbuffered so we don't hold
// all 440K rows in PHP memory at once. No joins, no regex — just raw text.
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);
$sql = "SELECT translation_id, book_id, verse_text FROM verse WHERE verse_text IS NOT NULL AND verse_text != ''";
$stmt = $pdo->prepare($sql);
$stmt->execute();

// Track which words we've seen per translation/section to keep them distinct.
// Using a Set-like structure: wordSets[transName][sectionName] = [word => true]
$wordSets = [];
foreach ($translationIdMap as $transName) {
    $wordSets[$transName] = [];
    foreach ($sections as $sectionName => $range) {
        $wordSets[$transName][$sectionName] = [];
    }
}

while ($row = $stmt->fetch()) {
    $transId = $row['translation_id'];
    $bookId  = (int)$row['book_id'];
    $text    = $row['verse_text'];

    if (!isset($translationIdMap[$transId])) {
        continue;
    }

    $transName = $translationIdMap[$transId];

    // Extract words: replace non-alpha with spaces, lowercase, split
    // preg_replace is faster than MariaDB's REGEXP_REPLACE for this
    $cleaned = preg_replace('/[^a-zA-Z]+/', ' ', $text);
    $lowered = strtolower($cleaned);
    $words = explode(' ', $lowered);

    foreach ($words as $word) {
        $word = trim($word);
        if ($word === '') {
            continue;
        }

        // Determine which sections this book_id belongs to
        foreach ($sections as $sectionName => $range) {
            if ($bookId >= $range[0] && $bookId <= $range[1]) {
                $wordSets[$transName][$sectionName][$word] = true;
            }
        }
    }
}

// Close the cursor to release the unbuffered query
$stmt->closeCursor();
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);

// Convert sets to sorted arrays
foreach ($wordSets as $transName => $sectionWords) {
    foreach ($sectionWords as $sectionName => $wordSet) {
        $words = array_keys($wordSet);
        sort($words, SORT_STRING);
        $result[$transName][$sectionName] = $words;
    }
}

$json = json_encode($result);

// Write to cache file for instant subsequent loads
file_put_contents($cacheFile, $json);

header('Content-Type: application/json');
echo $json;
