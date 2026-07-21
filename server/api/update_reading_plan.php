<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in unified CORS headers, handles OPTIONS requests, and connects to MariaDB
require_once 'connect.php';

// Check for required URL parameter criteria matching original validation rules
if (!isset($_GET['dayOfWeek'], $_GET['book'], $_GET['bookId'], $_GET['chapter'])) {
    error_log("Input variables don't exist - exiting");
    echo json_encode("error");
    exit();
}

$dayOfWeek = $_GET['dayOfWeek'];
$book      = $_GET['book'];
$bookId    = $_GET['bookId'];
$chapter   = $_GET['chapter'];

try {
    // Insert statement with explicit multi-tenant user_id tracking
    $statement = $pdo->prepare('
        INSERT INTO reading_plan_progress (user_id, day_of_week, book_name, book_id, chapter) 
        VALUES (?, ?, ?, ?, ?)
    ');

    $statement->execute([
        $current_user_id,
        $dayOfWeek,
        $book,
        (int)$bookId,
        (int)$chapter
    ]);

    echo json_encode("success");

} catch (Exception $e) {
    error_log("An error occurred in update_reading_plan.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
