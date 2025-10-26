<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept');
header('Content-Type: application/json; charset=utf8; Accept: application/json');

$request = file_get_contents('php://input');
error_log("[update_prayer.php] Received json: $request");
$input = json_decode($request);

$user = $input->userId;
$prayer = $input->prayer;
error_log("[update_prayer.php] Received data: user=" . $user . ", prayerId=" . $prayer->prayerId . ", prayerTitleTx=" . $prayer->prayerTitleTx . ", prayerDetailsTx=$prayer->prayerDetailsTx, prayerSubjectPersonName==$prayer->prayerSubjectPersonName");

$db = new SQLite3("db/memory_$user.db");

try {
    // --- Update the prayer table ---
    $statement = $db->prepare('
        UPDATE prayer 
        SET prayer_title_tx = :prayer_title_tx, 
            prayer_desc_tx = :prayer_desc_tx, 
            prayer_subject_person_nm = :prayer_subject_person_nm 
        WHERE prayer_id = :prayer_id
    ');
    $statement->bindValue(':prayer_title_tx', $prayer->prayerTitleTx);
    $statement->bindValue(':prayer_desc_tx', $prayer->prayerDetailsTx);
    $statement->bindValue(':prayer_subject_person_nm', $prayer->prayerSubjectPersonName);
    $statement->bindValue(':prayer_id', $prayer->prayerId);
    $statement->execute();
    $statement->close();

    // --- Handle the prayer_frequency table ---
    $priorityCd = isset($prayer->prayerPriorityCd) ? trim($prayer->prayerPriorityCd) : '';

    if ($priorityCd === '') {
        // If priority code is empty/null -> delete any existing record
        $deleteStmt = $db->prepare('DELETE FROM prayer_frequency WHERE prayer_id = :prayer_id');
        $deleteStmt->bindValue(':prayer_id', $prayer->prayerId);
        $deleteStmt->execute();
        $deleteStmt->close();
        error_log("[update_prayer.php] Deleted prayer_frequency for prayer_id={$prayer->prayerId}");
    } else {
        // Check if record exists
        $checkStmt = $db->prepare('SELECT COUNT(*) as count FROM prayer_frequency WHERE prayer_id = :prayer_id');
        $checkStmt->bindValue(':prayer_id', $prayer->prayerId);
        $result = $checkStmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);
        $exists = $row && $row['count'] > 0;
        $checkStmt->close();

        if ($exists) {
            // Update existing record
            $updateStmt = $db->prepare('
                UPDATE prayer_frequency 
                SET prayer_priority_cd = :prayer_priority_cd, 
                    date_time_added = CURRENT_TIMESTAMP 
                WHERE prayer_id = :prayer_id
            ');
            $updateStmt->bindValue(':prayer_priority_cd', $priorityCd);
            $updateStmt->bindValue(':prayer_id', $prayer->prayerId);
            $updateStmt->execute();
            $updateStmt->close();
            error_log("[update_prayer.php] Updated prayer_frequency for prayer_id={$prayer->prayerId}");
        } else {
            // Insert new record
            $insertStmt = $db->prepare('
                INSERT INTO prayer_frequency (prayer_id, prayer_priority_cd)
                VALUES (:prayer_id, :prayer_priority_cd)
            ');
            $insertStmt->bindValue(':prayer_id', $prayer->prayerId);
            $insertStmt->bindValue(':prayer_priority_cd', $priorityCd);
            $insertStmt->execute();
            $insertStmt->close();
            error_log("[update_prayer.php] Inserted prayer_frequency for prayer_id={$prayer->prayerId}");
        }
    }

    $db->close();
    print_r(json_encode("success"));
} catch (Exception $e) {
    $db->close();
    error_log("An error occurred while updating the prayer: " . $e->getMessage());
    print_r(json_encode("error"));
}
?>
