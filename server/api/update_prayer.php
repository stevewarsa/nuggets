<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */

// Pulls in headers, connects to MariaDB, and automatically populates $pdo and $current_user_id
require_once 'connect.php';

$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->prayer)) {
    echo json_encode("error");
    exit;
}

$prayer = $input->prayer;

error_log("[update_prayer.php] Processing update for user_id=" . $current_user_id . ", prayerId=" . $prayer->prayerId);

try {
    $pdo->beginTransaction();

    // --- Step 1: Update prayer details with multi-tenant security verification ---
    $statement = $pdo->prepare('
        UPDATE prayer 
        SET prayer_title_tx = ?, 
            prayer_desc_tx = ?, 
            prayer_subject_person_nm = ? 
        WHERE prayer_id = ? AND user_id = ?
    ');
    $statement->execute([
        $prayer->prayerTitleTx,
        $prayer->prayerDetailsTx,
        $prayer->prayerSubjectPersonName,
        $prayer->prayerId,
        $current_user_id
    ]);

    // Securely check if the user actually owns this row before modifying dependencies
    if ($statement->rowCount() === 0) {
        // Double-check if record exists at all to differentiate between "no changes made" vs "unauthorized"
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM prayer WHERE prayer_id = ? AND user_id = ?");
        $checkStmt->execute([$prayer->prayerId, $current_user_id]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            throw new Exception("Unauthorized: User does not own prayer_id {$prayer->prayerId}");
        }
    }

    // --- Step 2: Handle the prayer_frequency table ---
    $priorityCd = isset($prayer->prayerPriorityCd) ? trim($prayer->prayerPriorityCd) : '';

    if ($priorityCd === '') {
        // Delete existing frequency entry if priority code is cleared
        $deleteStmt = $pdo->prepare('DELETE FROM prayer_frequency WHERE prayer_id = ?');
        $deleteStmt->execute([$prayer->prayerId]);
        error_log("[update_prayer.php] Deleted prayer_frequency for prayer_id={$prayer->prayerId}");
    } else {
        // Native MariaDB UPSERT pattern replaces separate SELECT COUNT and update/insert blocks
        $upsertStmt = $pdo->prepare('
            INSERT INTO prayer_frequency (prayer_id, prayer_priority_cd, date_time_added) 
            VALUES (?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
                prayer_priority_cd = VALUES(prayer_priority_cd), 
                date_time_added = NOW()
        ');
        $upsertStmt->execute([$prayer->prayerId, $priorityCd]);
        error_log("[update_prayer.php] Handled upsert for prayer_frequency on prayer_id={$prayer->prayerId}");
    }

    $pdo->commit();
    echo json_encode("success");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("An error occurred while updating the prayer: " . $e->getMessage());
    echo json_encode("error");
}
