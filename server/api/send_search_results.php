<?php
/** @noinspection PhpParamsInspection */

// Pulls in unified CORS headers, global preflight options, and parses the JSON body
require_once 'connect.php';

// Reuse the pre-parsed JSON payload object populated by connect.php
$input = $GLOBAL_JSON_INPUT;

if (!$input || !isset($input->emailTo) || !isset($input->searchResults)) {
    echo json_encode("failure-missing parameters");
    exit;
}

$emailTo       = $input->emailTo;
$searchResults = $input->searchResults;
$searchParam   = $input->searchParam ?? null;

// Isolate and escape search configurations safely
$book         = htmlspecialchars($searchParam->book ?? 'All', ENT_QUOTES, 'UTF-8');
$translation  = htmlspecialchars($searchParam->translation ?? 'NIV', ENT_QUOTES, 'UTF-8');
$testament    = htmlspecialchars($searchParam->testament ?? 'both', ENT_QUOTES, 'UTF-8');
$searchPhrase = htmlspecialchars($searchParam->searchPhrase ?? '', ENT_QUOTES, 'UTF-8');
$fromUser     = htmlspecialchars($searchParam->user ?? 'Unknown User', ENT_QUOTES, 'UTF-8');

error_log("[send_search_results.php] Emailing " . $emailTo . " with search results from " . $fromUser);

// Assemble the results table safely escaping strings to prevent email HTML formatting breakages
$resultsTable = "
<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse;'>
    <thead>
        <tr style='background-color: #f2f2f2;'>
            <th>Passage Ref</th>
            <th>Passage Text</th>
        </tr>
    </thead>
    <tbody>
";

foreach ($searchResults as $thisResult) {
    if (is_array($thisResult) && count($thisResult) >= 2) {
        $ref  = htmlspecialchars($thisResult[0], ENT_QUOTES, 'UTF-8');
        $text = htmlspecialchars($thisResult[1], ENT_QUOTES, 'UTF-8');
        $resultsTable .= "<tr><td><strong>{$ref}</strong></td><td>{$text}</td></tr>";
    }
}
$resultsTable .= "</tbody></table>";

// Formulate dynamic email structural frames
$resultCount = count($searchResults);
$bodyHeader  = "<h3>Search Phrase: {$searchPhrase}, Scope: {$testament}, Book: {$book}, Translation: {$translation}</h3>";
$bodyHeader .= "<h5>({$resultCount} results)</h5>";

$msg = "
<html>
<head>
    <title>Search Results from {$fromUser}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; }
        table { width: 100%; max-width: 800px; margin-top: 15px; }
        th, td { text-align: left; }
    </style>
</head>
<body>
    {$bodyHeader}
    {$resultsTable}
</body>
</html>
";

$headers  = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: Nuggets Application <noreply@localhost>" . "\r\n"; // Added standard fallback sender metadata

$result = "failure";

try {
    if (mail($emailTo, "Search results from " . $fromUser, $msg, $headers)) {
        error_log("[send_search_results.php] The search results have been successfully emailed.");
        $result = "success";
    } else {
        error_log("[send_search_results.php] PHP native mail transmission reported an engine failure.");
        $result = "failure-email engine rejected send";
    }
} catch (Exception $e) {
    error_log("[send_search_results.php] Error executing mail function: " . $e->getMessage());
    $result = "failure-" . $e->getMessage();
}

echo json_encode($result);
