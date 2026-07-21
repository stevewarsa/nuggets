<?php
// connect.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$host = '127.0.0.1';
$db   = 'nuggets';
$user = 'devuser';
$pass = 'Galatians2v20';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

// Global variable to hold parsed JSON input if a service needs it later
$GLOBAL_JSON_INPUT = null;
// New Line: Check for 'user' OR 'userId' coming from the URL query or form parameters
$incoming_user_nm = $_REQUEST['user'] ?? $_REQUEST['userId'] ?? null;

// If username isn't in URL parameters, check if it's inside a raw JSON body payload
if (!$incoming_user_nm) {
    $raw_body = file_get_contents('php://input');
    if (!empty($raw_body)) {
        $GLOBAL_JSON_INPUT = json_decode($raw_body);
        // Look for typical variations like 'userId' or 'user' inside the payload object
        $incoming_user_nm = $GLOBAL_JSON_INPUT->userId ?? $GLOBAL_JSON_INPUT->user ?? null;
    }
}

$current_user_id = 0;

if ($incoming_user_nm) {
    $stmt = $pdo->prepare("SELECT user_id FROM user WHERE user_nm = ?");
    $stmt->execute([$incoming_user_nm]);
    $user_row = $stmt->fetch();

    if ($user_row) {
        $current_user_id = (int)$user_row['user_id'];
    }
}

// --- ADD THE PUBLIC EXCLUSION GATE HERE ---
// Identify which script file is running right now
$current_script = basename($_SERVER['SCRIPT_NAME']);

// List files that DO NOT require a user context to execute
$public_endpoints = [
    'get_all_users.php',
    'nuggets_login.php'
];

// Only block the request if it's not a public page and we failed to find a valid user_id
if (!in_array($current_script, $public_endpoints) && $current_user_id === 0) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized or unknown user account"]);
    exit;
}