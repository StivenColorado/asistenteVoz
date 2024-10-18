<?php
// archivo.php (el nombre del archivo puede ser diferente)

require 'db_connection.php'; // Incluir el archivo de conexión

// Establecer el encabezado para indicar que se espera JSON
header('Content-Type: application/json');

// Leer el cuerpo de la solicitud JSON
$data = json_decode(file_get_contents('php://input'), true);

// Verificar si se ha recibido la cédula
if (isset($data['cedula'])) {
    // Eliminar espacios en blanco
    $cedula = trim($data['cedula']);

    // Validar la cédula
    if (!validateCedula($cedula)) {
        echo json_encode(["mensaje" => "Cédula no válida."]); // Mensaje si la cédula no es válida
        exit();
    }

    // Preparar la consulta
    $stmt = $conn->prepare("SELECT * FROM cliente WHERE numero_documento = ?");
    $stmt->bind_param("s", $cedula); // Vincular el parámetro
    $stmt->execute(); // Ejecutar la consulta
    $result = $stmt->get_result(); // Obtener el resultado

    // Verificar si se encontró el cliente
    if ($result->num_rows > 0) {
        // Obtener los datos del cliente
        $cliente = $result->fetch_assoc();
        // Enviar la información del cliente
        echo json_encode($cliente); // Retornar datos en formato JSON
    } else {
        echo json_encode(["mensaje" => "Cliente no encontrado."]); // Mensaje si no se encuentra
    }

    // Cerrar la consulta
    $stmt->close();
} else {
    echo json_encode(["mensaje" => "Cédula no proporcionada."]); // Mensaje si no se proporciona cédula
}

// Cerrar la conexión
$conn->close();

// Función para validar la cédula
function validateCedula($cedula) {
    // Verifica que la cédula contenga solo números y que tenga una longitud válida
    return preg_match('/^\d{8,10}$/', $cedula);
}
?>
