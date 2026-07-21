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

$prayerTitleTx           = $input->prayerTitleTx ?? '';
$prayerDetailsTx         = $input->prayerDetailsTx ?? '';
$prayerSubjectPersonName = $input->prayerSubjectPersonName ?? '';
$prayerPriorityCd        = isset($input->prayerPriorityCd) ? trim($input->prayerPriorityCd) : '';

try {
    // Begin a native SQL transaction block to ensure atomic integrity across tables
    $pdo->beginTransaction();

    // --- Step 1: Insert into the multi-tenant prayer table ---
    $statement = $pdo->prepare("
        INSERT INTO prayer (user_id, prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm) 
        VALUES (?, ?, ?, ?)
    ");
    $statement->execute([
        $current_user_id,
        $prayerTitleTx,
        $prayerDetailsTx,
        $prayerSubjectPersonName
    ]);

    // Grab the auto-incremented primary key generated natively by MariaDB
    $prayerId = (int)$pdo->lastInsertId();

    // --- Step 2: Conditionally insert into prayer_frequency ---
    if ($prayerId > 0 && $prayerPriorityCd !== '') {
        $freqStmt = $pdo->prepare("
            INSERT INTO prayer_frequency (prayer_id, prayer_priority_cd) 
            VALUES (?, ?)
        ");
        $freqStmt->execute([
            $prayerId,
            $prayerPriorityCd
        ]);
        error_log("[add_prayer.php] Inserted prayer_frequency for prayer_id={$prayerId}");
    }

    // Commit changes safely to MariaDB
    $pdo->commit();

    echo json_encode($prayerId);

} catch (Exception $e) {
    // Roll back changes if any step in the sequence fails
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("An error occurred while adding the prayer: " . $e->getMessage());
    echo json_encode("error");
}
