<?php
// db_connection.php
// Este archivo maneja la conexión a la base de datos.
// require_once 'validate_origin.php';

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "asistente_voz";

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(array("error" => "Conexión fallida: " . $conn->connect_error)));
}

// Configurar el conjunto de caracteres
$conn->set_charset("utf8");
?>
