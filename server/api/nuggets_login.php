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

$cleanUser = trim($user);

try {
    // Step 1: Perform a safe parameterized lookup to check account existence
    $statement = $pdo->prepare("SELECT COUNT(*) AS user_exists FROM user WHERE user_nm = ?");
    $statement->execute([$cleanUser]);
    $row = $statement->fetch();

    if ($row && (int)$row['user_exists'] > 0) {
        error_log("[nuggets_login.php] Successfully logged in existing user: " . $cleanUser);
        echo json_encode("success");
    } else {
        // Step 2: User doesn't exist, create a new record instantly!
        error_log("[nuggets_login.php] User '" . $cleanUser . "' not found. Automatically registering new profile.");

        $insertStmt = $pdo->prepare("INSERT INTO user (user_nm) VALUES (?)");
        $insertStmt->execute([$cleanUser]);

        error_log("[nuggets_login.php] New account created for " . $cleanUser . " successfully! Returning 'success'.");
        echo json_encode("success");
    }

} catch (Exception $e) {
    error_log("[nuggets_login.php] - An operational error occurred during login/signup: " . $e->getMessage());
    http_response_code(500);
    echo json_encode("error");
}
