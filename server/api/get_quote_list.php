<?php /** @noinspection SqlNoDataSourceInspection */
/** @noinspection SqlDialectInspection */
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf8');

$user = $_GET['user'];
$includeQuoteText = $_GET['includeQuoteText'];

$db = new SQLite3('db/memory_' . $user . '.db');
$quotesByQuoteId = array();
if ($includeQuoteText == "true") {
	$results = $db->query("SELECT q.quote_id, tag_id, quote_tx, approved, sent_from_user, source_id " .
		"FROM quote q LEFT OUTER JOIN quote_tag qt on q.quote_id = qt.quote_id");
} else {
	$results = $db->query("SELECT q.quote_id, tag_id, approved, sent_from_user, source_id " .
		"FROM quote q LEFT OUTER JOIN quote_tag qt on q.quote_id = qt.quote_id");
}
while ($row = $results->fetchArray()) {
    if (!array_key_exists($row['quote_id'], $quotesByQuoteId)) {
        $quote = new stdClass;
        $quote->quoteId = $row['quote_id'];
		if ($includeQuoteText == "true") {
			$quote->quoteTx = $row['quote_tx'];
		} else {
			$quote->quoteTx = null;
		}
        $quote->approved = $row['approved'];
        $quote->fromUser = $row['sent_from_user'];
        $quote->sourceId = $row['source_id'];
        $quote->tagIds = array();
        if ($row['tag_id'] != null) {
            array_push($quote->tagIds, $row['tag_id']);
        }
        $quotesByQuoteId[$row['quote_id']] = $quote;
    } else {
        if ($row['tag_id'] != null) {
            array_push($quotesByQuoteId[$row['quote_id']]->tagIds, $row['tag_id']);
        }
    }
}
$db->close();
print_r(json_encode(array_values($quotesByQuoteId)));
