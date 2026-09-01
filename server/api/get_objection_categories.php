<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

error_log("[get_objection_categories.php] Getting categories for user_id $current_user_id ...");

try {
    // Fetch all categories for the user, plus child/objection counts so the
    // drill-down UI can show badges without extra round-trips.
    $statement = $pdo->prepare("
        SELECT
            c.category_id,
            c.category_nm,
            c.parent_id,
            c.sort_order,
            (SELECT COUNT(*) FROM objection_category c2 WHERE c2.parent_id = c.category_id) AS child_count,
            (SELECT COUNT(*) FROM objection o WHERE o.category_id = c.category_id AND o.archive_fl = 'N') AS objection_count
        FROM objection_category c
        WHERE c.user_id = ?
        ORDER BY c.sort_order, c.category_nm
    ");
    $statement->execute([$current_user_id]);

    $categories = array();
    while ($row = $statement->fetch()) {
        $categories[] = array(
            'categoryId'          => (int)$row['category_id'],
            'userId'              => (string)$current_user_id,
            'categoryName'        => $row['category_nm'],
            'parentId'            => $row['parent_id'] !== null ? (int)$row['parent_id'] : null,
            'sortOrder'           => (int)$row['sort_order'],
            'childCategoryCount'  => (int)$row['child_count'],
            'objectionCount'      => (int)$row['objection_count'],
        );
    }

    echo json_encode($categories);

} catch (Exception $e) {
    error_log("[get_objection_categories.php] - An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
