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

error_log("[get_prayers.php] Getting prayer sessions ...");

$db = new SQLite3("db/memory_$userId.db");

$results = $db->query("
    SELECT session_id, prayer_id, user_id, prayer_date_time, prayer_note_tx
    FROM prayer_session
    ORDER BY prayer_date_time DESC
");
$prayerSessions = array();
while ($row = $results->fetchArray()) {
    $prayerSessions[] = array(
        'sessionId' => (int)$row['session_id'],
        'prayerId' => (int)$row['prayer_id'],
        'userId' => $row['user_id'],
        'dateTime' => $row['prayer_date_time'],
        'prayerNoteTx' => $row['prayer_note_tx']
    );
}

$db->close();
print_r(json_encode($prayerSessions));
?>
