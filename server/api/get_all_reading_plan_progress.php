<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

try {
	// Select and sort data while safely restricting data access via user_id
	$statement = $pdo->prepare("
        SELECT day_of_week, book_name, book_id, chapter, date_read 
        FROM reading_plan_progress 
        WHERE user_id = ? 
        ORDER BY date_read DESC, chapter DESC
    ");
	$statement->execute([$current_user_id]);

	$readingRecords = array();
	while ($row = $statement->fetch()) {
		$obj = new stdClass;
		$obj->bookId    = (int)$row['book_id'];
		$obj->bookName  = $row['book_name'];
		$obj->chapter   = (int)$row['chapter'];
		$obj->dateRead  = $row['date_read'];
		$obj->dayOfWeek = $row['day_of_week'];
		$readingRecords[] = $obj;
	}

	echo json_encode($readingRecords);

} catch (Exception $e) {
	error_log("An error occurred in get_all_reading_plan_progress.php: " . $e->getMessage());
	http_response_code(500);
	echo json_encode(["error" => "Internal server error"]);
}
