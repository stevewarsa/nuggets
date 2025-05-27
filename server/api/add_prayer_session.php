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
$prayerId = $input->prayerId;
$prayerNoteTx = $input->prayerNoteTx;
$prayerSubjectPersonName = $input->prayerSubjectPersonName;

// now insert prayer
$db = new SQLite3("db/memory_$user.db");
$statement = $db->prepare("insert into prayer_session (prayer_id, user_id, prayer_note_tx) values(:prayer_id,:user_id,:prayer_note_tx)");
$statement->bindValue(":prayer_id", $prayerId);
$statement->bindValue(":user_id", $user);
$statement->bindValue(":prayer_note_tx", $prayerNoteTx);
$statement->execute();
$statement->close();

// now get the newly generated passage_id
$results = $db->query("SELECT last_insert_rowid() as session_id");
$sessionId = -1;
while ($row = $results->fetchArray()) {
    $sessionId = $row["session_id"];
    break;
}
$db->close();

print_r(json_encode($sessionId));
