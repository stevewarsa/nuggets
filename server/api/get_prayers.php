<?php
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

error_log("[get_prayers.php] Getting prayers for user_id $current_user_id ...");

try {
    // Select prayers with their frequencies, filtered by the multi-tenant integer user_id
    $statement = $pdo->prepare("
        SELECT 
            p.prayer_id, 
            p.prayer_title_tx, 
            p.prayer_desc_tx, 
            p.prayer_subject_person_nm, 
            p.archive_fl, 
            f.prayer_priority_cd 
        FROM prayer p 
        LEFT JOIN prayer_frequency f ON p.prayer_id = f.prayer_id
        WHERE p.user_id = ?
    ");
    $statement->execute([$current_user_id]);

    $prayers = array();
    while ($row = $statement->fetch()) {
        $prayers[] = array(
            'prayerId'                => (int)$row['prayer_id'],
            'prayerTitleTx'           => $row['prayer_title_tx'],
            'prayerDetailsTx'         => $row['prayer_desc_tx'],
            'prayerSubjectPersonName' => $row['prayer_subject_person_nm'],
            'archiveFl'               => $row['archive_fl'],
            'prayerPriorityCd'        => $row['prayer_priority_cd']
        );
    }

    echo json_encode($prayers);

} catch (Exception $e) {
    error_log("[get_prayers.php] - An error occurred: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
