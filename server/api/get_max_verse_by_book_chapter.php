<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';

// Safe extraction of parameters coming via URL query parameters
$translation = $_GET['translation'] ?? '';

try {
    // Single consolidated query pulling metrics grouped securely by the translation name string
    $stmt = $pdo->prepare('
        SELECT b.book_name, v.chapter, MAX(v.verse) AS max_verse 
        FROM verse v
        INNER JOIN book b ON b._id = v.book_id
        INNER JOIN translation t ON t.translation_id = v.translation_id
        WHERE t.translation_name = ?
        GROUP BY b.book_name, v.chapter, b._id
        ORDER BY b._id, v.chapter
    ');
    $stmt->execute([$translation]);

    $arrayName = array();
    while ($row = $stmt->fetch()) {
        $bookName = $row['book_name'];

        if (!isset($arrayName[$bookName])) {
            $arrayName[$bookName] = array();
        }

        // Cast numerical results cleanly to match original array payload specs
        $arrayName[$bookName][] = array((int)$row['chapter'], (int)$row['max_verse']);
    }

    $responseJson = json_encode($arrayName);
    error_log('Returning response JSON ' . $responseJson);

    echo $responseJson;

} catch (Exception $e) {
    error_log("An error occurred in get_max_verse_by_book_chapter.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
