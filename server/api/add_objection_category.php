<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input) {
    echo json_encode("error");
    exit;
}

$categoryName = trim($input->categoryName ?? '');
$parentId     = isset($input->parentId) && $input->parentId !== null ? (int)$input->parentId : null;

if ($categoryName === '') {
    echo json_encode("error");
    exit;
}

try {
    $statement = $pdo->prepare("
        INSERT INTO objection_category (user_id, category_nm, parent_id)
        VALUES (?, ?, ?)
    ");
    $statement->execute([
        $current_user_id,
        $categoryName,
        $parentId
    ]);

    $categoryId = (int)$pdo->lastInsertId();
    echo json_encode($categoryId);

} catch (Exception $e) {
    error_log("[add_objection_category.php] An error occurred: " . $e->getMessage());
    echo json_encode("error");
}
