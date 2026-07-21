<?php
/** @noinspection SqlResolve */
/** @noinspection SqlNoDataSourceInspection */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';

try {
	// Query the registered multi-tenant accounts out of the target table
	$stmt = $pdo->query("SELECT user_id, user_nm FROM user ORDER BY user_nm ASC");

	$userArray = array();

	// We get a fallback timestamp for our mocked file metrics
	$mockTime = time();
	$mockDate = date('F d Y, H:i:s', $mockTime);

	while ($row = $stmt->fetch()) {
		$userName = $row['user_nm'];

		$obj = new stdClass;
		// Mocking the legacy filesystem properties so your React front-end doesn't crash
		$obj->userName     = $userName;
		$obj->fileName     = "memory_" . $userName . ".db";
		$obj->numLastMod   = $mockTime;
		$obj->lastModified = $mockDate;

		// Optional: If your React app starts using the actual database ID, it's ready here
		$obj->userId       = (int)$row['user_id'];

		$userArray[] = $obj;
	}

	echo json_encode($userArray);

} catch (Exception $e) {
	error_log("An error occurred in get_all_users.php: " . $e->getMessage());
	http_response_code(500);
	echo json_encode(["error" => "Internal server error"]);
}
