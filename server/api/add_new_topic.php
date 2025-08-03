<?php /** @noinspection PhpParamsInspection */
/** @noinspection SqlDialectInspection */
/** @noinspection SqlNoDataSourceInspection */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept");
header("Content-Type: application/json; charset=utf8; Accept: application/json");

$request = file_get_contents("php://input");
error_log("Received data:" . $request);
$input = json_decode($request);

$user = $input->user;
$topicNm = $input->topicNm;

$response = new stdClass;
$response->topicId = -1;
$response->message = "error";

if (!$topicNm || empty($topicNm) || $topicNm == "") {
    error_log("Topic was empty, returning...");
    print_r(json_encode($response));
    return;
}
$db = new SQLite3("db/memory_" . $user . ".db");
error_log("Inserting new topic " . $topicNm . "...");
$statement = $db->prepare("insert into tag (tag_name) values (:topicName)");
$statement->bindValue(":topicName", $topicNm);
$statement->execute();
$statement->close();
// now get the newly generated tag_id
error_log("Inserted tag/topic " . $topicNm . "... now getting last tag id inserted");
$results = $db->query("SELECT last_insert_rowid() as topic_id");
while ($row = $results->fetchArray()) {
    $response->topicId = $row["topic_id"];
    $response->message = "success";
    error_log("New topic id " . $response->topicId . " retrieved");
    break;
}
$db->close();

print_r(json_encode($response));
