<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Safe extraction of parameters coming via URL query parameters
$translation = $_GET['translation'] ?? '';
$book        = $_GET['book'] ?? '';
$chapter     = $_GET['chapter'] ?? 0;
$startVerse  = $_GET['start'] ?? 0;
$endVerse    = $_GET['end'] ?? 0;

// --- Step 1: Look up book_id inside the shared database ---
$translStmt = $pdo->prepare('SELECT _id FROM book WHERE book_name = ?');
$translStmt->execute([$book]);
$bookRow = $translStmt->fetch();
$bookId = $bookRow ? (int)$bookRow["_id"] : -1;

$nuggetId = -1;

try {
    // --- Step 2: Insert into the multi-tenant nugget table ---
    $statement = $pdo->prepare('
        INSERT INTO nugget (user_id, book_id, chapter, start_verse, end_verse) 
        VALUES (?, ?, ?, ?, ?)
    ');
    $statement->execute([
        $current_user_id,
        $bookId,
        $chapter,
        $startVerse,
        $endVerse
    ]);

    // Grab the auto-incremented primary key generated natively by MariaDB
    $nuggetId = (int)$pdo->lastInsertId();

    echo json_encode($nuggetId);

} catch (Exception $e) {
    error_log("An error occurred in add_nonmemory_passage.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
