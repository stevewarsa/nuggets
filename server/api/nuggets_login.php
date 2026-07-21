<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers and connects to MariaDB via the single global connection file
require_once 'connect.php';

$user = $_GET["user"] ?? '';

error_log("[nuggets_login.php] User " . $user . " is attempting to log into Nuggets...");

if (empty(trim($user))) {
    echo json_encode("error");
    exit;
}

try {
    // Perform a safe parameterized lookup to confirm account existence
    $statement = $pdo->prepare("SELECT COUNT(*) AS user_exists FROM user WHERE user_nm = ?");
    $statement->execute([trim($user)]);
    $row = $statement->fetch();

    if ($row && (int)$row['user_exists'] > 0) {
        error_log("[nuggets_login.php] Successfully logged in existing user " . $user . "! Returning 'success'.");
        echo json_encode("success");
    } else {
        error_log("[nuggets_login.php] User profile '" . $user . "' not found in the user table. Denying entry.");
        // Returns a non-success flag to trigger React's failure hooks cleanly
        echo json_encode("unauthorized");
    }

} catch (Exception $e) {
    error_log("[nuggets_login.php] - An operational error occurred during login: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
