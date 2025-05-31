<?php /** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlResolve */
/** @noinspection PhpParamsInspection */
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf8');

if (!isset($_GET['userId']) || !isset($_GET['prayerId'])) {
    print_r(json_encode("error"));
    exit;
}
$userId = $_GET['userId'];
$prayerId = $_GET['prayerId'];

error_log("[archive_prayer.php] Archiving prayer for user $userId with prayerId $prayerId...");

$db = new SQLite3("db/memory_$userId.db");

try {
    /** @noinspection SqlResolve */
    $statement = $db->prepare("update prayer set archive_fl = 'Y' where prayer_id = :prayer_id");
    $statement->bindValue(':prayer_id', $prayerId);
    $statement->execute();
} catch (PDOException $pdoException) {
    // Handle PDOException, which is specific to database operations
    error_log("[archive_prayer.php] - An error occurred while archiving the prayer - PDOException: " . $pdoException->getMessage());
} catch (Exception $e) {
    error_log("[archive_prayer.php] - An error occurred while archiving the prayer: " . $e->getMessage());
}
if (isset($statement)) {
    $statement->close();
}
// now see if any rows were updated
$returnVal = "error";
$numChanges = $db->changes();
error_log("[archive_prayer.php] Archiving prayer for user $userId with prayerId $prayerId...  There were $numChanges ");
if ($numChanges > 0) {
    $returnVal = "success";
}
$db->close();
print_r(json_encode($returnVal));
