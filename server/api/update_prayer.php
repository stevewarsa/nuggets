<?php /** @noinspection SqlResolve */
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
    $statement = $db->prepare('update prayer set prayer_title_tx = :prayer_title_tx, prayer_desc_tx = :prayer_desc_tx, prayer_subject_person_nm = :prayer_subject_person_nm where prayer_id = :prayer_id');
    $statement->bindValue(':prayer_title_tx', $prayer->prayerTitleTx);
    $statement->bindValue(':prayer_desc_tx', $prayer->prayerDetailsTx);
    $statement->bindValue(':prayer_subject_person_nm', $prayer->prayerSubjectPersonName);
    $statement->bindValue(':prayer_id', $prayer->prayerId);
    $statement->execute();
    $statement->close();
    $db->close();
    print_r(json_encode("success"));
} catch (Exception $e) {
    $db->close();
    error_log("An error occurred while updating the prayer: " . $e->getMessage());
    print_r(json_encode("error"));
}

