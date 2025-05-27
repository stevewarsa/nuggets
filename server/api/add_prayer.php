<?php /** @noinspection SqlResolve */
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

// now insert prayer
$db = new SQLite3("db/memory_$user.db");
$statement = $db->prepare("insert into prayer (prayer_title_tx, prayer_desc_tx, prayer_subject_person_nm) values(:prayer_title,:prayer_desc,:prayer_subject_person)");
$statement->bindValue(":prayer_title", $prayerTitleTx);
$statement->bindValue(":prayer_desc", $prayerDetailsTx);
$statement->bindValue(":prayer_subject_person", $prayerSubjectPersonName);
$statement->execute();
$statement->close();

// now get the newly generated passage_id
$results = $db->query("SELECT last_insert_rowid() as prayer_id");
$prayerId = -1;
while ($row = $results->fetchArray()) {
    $prayerId = $row["prayer_id"];
    break;
}
$db->close();

print_r(json_encode($prayerId));
