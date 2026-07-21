<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';

try {
    // Single query execution targeting the shared book and verse tables
    $stmt = $pdo->query('
        SELECT b.book_name, MAX(v.chapter) AS max_chapter 
        FROM verse v
        INNER JOIN book b ON b._id = v.book_id 
        GROUP BY b.book_name, b._id 
        ORDER BY b._id
    ');

    $arrayName = array();
    while ($row = $stmt->fetch()) {
        $obj = new stdClass;
        $obj->bookName   = $row['book_name'];
        $obj->maxChapter = (int)$row['max_chapter'];
        $arrayName[] = $obj;
    }

    $responseJson = json_encode($arrayName);
    error_log('Returning response JSON ' . $responseJson);

    echo $responseJson;

} catch (Exception $e) {
    error_log("An error occurred in get_max_chapter_by_book.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
