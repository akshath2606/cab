<?php
$servername = "localhost"; // Change if needed
$username = "root"; // Change to your MySQL username
$password = "ak@123452006"; // Change to your MySQL password
$database = "SignIn"; // Database name

// Create connection
$conn = new mysqli($localhost, $root, '$ak@123452006', $SignIn);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
