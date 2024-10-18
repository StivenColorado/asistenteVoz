<?php
require_once('TCPDF/tcpdf.php'); // Asegúrate de que la ruta a TCPDF es correcta

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$cedula = isset($data['cedula']) ? $data['cedula'] : null;

if ($cedula) {
    // Conéctate a tu base de datos y consulta la información del usuario
    $conn = new mysqli('localhost', 'usuario', 'contraseña', 'nombre_base_datos');

    if ($conn->connect_error) {
        die(json_encode(['error' => 'Conexión fallida: ' . $conn->connect_error]));
    }

    $stmt = $conn->prepare("SELECT nombre_completo, tipo_cuenta, numero_cuenta FROM clientes WHERE numero_documento = ?");
    $stmt->bind_param('s', $cedula);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $nombreCompleto = $user['nombre_completo'];
        $tipoCuenta = $user['tipo_cuenta'];
        $numeroCuenta = $user['numero_cuenta'];
        
        // Generar el PDF
        $pdf = new TCPDF();
        $pdf->AddPage();
        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, 'Banco BancaSena', 0, 1, 'C');
        
        $fechaHora = date('Y-m-d H:i:s');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->MultiCell(0, 10, "Te informa que has generado un certificado por medio de nuestro asistente con fecha y hora: $fechaHora", 0, 'C', 0, 1, '', '', true);
        $pdf->Ln(10);
        
        $pdf->MultiCell(0, 10, "Señores a quienes pueda interesar:", 0, 'L', 0, 1, '', '', true);
        $pdf->Ln(10);
        
        $pdf->MultiCell(0, 10, "BancaSena certifica a el/la señor@ $nombreCompleto, con número de documento: $cedula, que tiene una cuenta de tipo '$tipoCuenta' con número '$numeroCuenta'.", 0, 'L', 0, 1, '', '', true);
        
        // Cerrar y output el PDF
        $pdf->Output('certificado.pdf', 'D'); // Esto forzará la descarga del PDF
    } else {
        echo json_encode(['error' => 'Usuario no encontrado.']);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['error' => 'Cédula no proporcionada.']);
}
?>
