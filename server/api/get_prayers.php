<?php /** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf8');

if (!isset($_GET['userId'])) {
    print_r(json_encode("error"));
    exit;
}
$userId = $_GET['userId'];

error_log("[get_prayers.php] Getting prayers for user $userId ...");

$db = new SQLite3("db/memory_$userId.db");

$results = $db->query("SELECT prayer_id, prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm, archive_fl FROM prayer");

$prayers = array();
while ($row = $results->fetchArray()) {
    $prayers[] = array(
        'prayerId' => (int)$row['prayer_id'],
        'prayerTitleTx' => $row['prayer_title_tx'],
        'prayerDetailsTx' => $row['prayer_desc_tx'],
        'prayerSubjectPersonName' => $row['prayer_subject_person_nm'],
        'archiveFl' => $row['archive_fl']
    );
}

$db->close();
print_r(json_encode($prayers));
?>
