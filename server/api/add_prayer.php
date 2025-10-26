<?php
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
/** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept");
header("Content-Type: application/json; charset=utf8; Accept: application/json");

$request = file_get_contents("php://input");
$input = json_decode($request);

$user = $input->userId;
$prayerTitleTx = $input->prayerTitleTx;
$prayerDetailsTx = $input->prayerDetailsTx;
$prayerSubjectPersonName = $input->prayerSubjectPersonName;
$prayerPriorityCd = isset($input->prayerPriorityCd) ? trim($input->prayerPriorityCd) : '';
$db = null;
try {
    $db = new SQLite3("db/memory_$user.db");

    // --- Insert into prayer table ---
    $statement = $db->prepare("
        INSERT INTO prayer (prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm)
        VALUES (:prayer_title, :prayer_desc, :prayer_subject_person)
    ");
    $statement->bindValue(":prayer_title", $prayerTitleTx);
    $statement->bindValue(":prayer_desc", $prayerDetailsTx);
    $statement->bindValue(":prayer_subject_person", $prayerSubjectPersonName);
    $statement->execute();
    $statement->close();

    // --- Get the newly generated prayer_id ---
    $results = $db->query("SELECT last_insert_rowid() AS prayer_id");
    $prayerId = -1;
    if ($row = $results->fetchArray(SQLITE3_ASSOC)) {
        $prayerId = $row["prayer_id"];
    }

    // --- Conditionally insert into prayer_frequency ---
    if ($prayerId > 0 && $prayerPriorityCd !== '') {
        $freqStmt = $db->prepare("
            INSERT INTO prayer_frequency (prayer_id, prayer_priority_cd)
            VALUES (:prayer_id, :prayer_priority_cd)
        ");
        $freqStmt->bindValue(":prayer_id", $prayerId);
        $freqStmt->bindValue(":prayer_priority_cd", $prayerPriorityCd);
        $freqStmt->execute();
        $freqStmt->close();
        error_log("[add_prayer.php] Inserted prayer_frequency for prayer_id={$prayerId}");
    }

    $db->close();

    print_r(json_encode($prayerId));
} catch (Exception $e) {
    if ($db) $db->close();
    error_log("An error occurred while adding the prayer: " . $e->getMessage());
    print_r(json_encode("error"));
}
?>
