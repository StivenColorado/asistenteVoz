<?php
// archivo_actualizar.php

require 'db_connection.php'; // Incluir el archivo de conexión

// Establecer el encabezado para indicar que se espera JSON
header('Content-Type: application/json');

// Leer el cuerpo de la solicitud JSON
$data = json_decode(file_get_contents('php://input'), true);

// Verificar si se han recibido los parámetros obligatorios
if (isset($data['caso']) && isset($data['dato']) && isset($data['cedula'])) {
    $caso = $data['caso'];
    $dato = $data['dato'];
    $cedula = $data['cedula'];

    // Inicializar la consulta y la variable de tipo de dato
    $query = "";

    // Definir la consulta según el caso
    switch ($caso) {
        case 'telefono':
            $query = "UPDATE cliente SET numero_telefono = ? WHERE numero_documento = ?";
            break;
        case 'correo':
            // Limpiar espacios en el correo
            $correo = trim($dato); // Eliminar espacios en blanco

            // Validar el formato del correo
            if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(["mensaje" => "Formato de correo no válido."]);
                exit;
            }

            $query = "UPDATE cliente SET correo_electronico = ? WHERE numero_documento = ?";
            break;
        case 'nombre':
            $query = "UPDATE cliente SET nombre_completo = ? WHERE numero_documento = ?";
            break;
        case 'direccion':
            $query = "UPDATE cliente SET direccion = ? WHERE numero_documento = ?";
            break;
        case 'estado_civil':
            $query = "UPDATE cliente SET estado_civil = ? WHERE numero_documento = ?";
            break;
        case 'genero':
            $query = "UPDATE cliente SET genero = ? WHERE numero_documento = ?";
            break;
        case 'tipo_cuenta':
            $query = "UPDATE cliente SET tipo_de_cuenta = ? WHERE numero_documento = ?";
            break;
        case 'numero_cuenta':
            $query = "UPDATE cliente SET numero_cuenta = ? WHERE numero_documento = ?";
            break;
        default:
            echo json_encode(["mensaje" => "Caso no válido."]);
            exit;
    }

    // Preparar la consulta
    $stmt = $conn->prepare($query);

    // Vincular los parámetros
    $stmt->bind_param("ss", $dato, $cedula); // Vincular el dato y la cédula
    $stmt->execute(); // Ejecutar la consulta

    // Verificar si se actualizó algún registro
    if ($stmt->affected_rows > 0) {
        echo json_encode(["mensaje" => "Información actualizada correctamente."]);
    } else {
        echo json_encode(["mensaje" => "No se encontró el cliente o no se realizaron cambios."]);
    }

    // Cerrar la consulta
    $stmt->close();
} else {
    echo json_encode(["mensaje" => "Parámetros faltantes. Se requieren caso, dato y cédula."]); // Mensaje si faltan parámetros
}

// Cerrar la conexión
$conn->close();
?>
