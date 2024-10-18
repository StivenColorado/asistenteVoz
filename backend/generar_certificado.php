<?php
// Mostrar todos los errores
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once('TCPDF/tcpdf.php');
require 'db_connection.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['cedula']) || empty($data['cedula'])) {
    echo json_encode(['error' => 'Cédula no proporcionada.']);
    exit();
}

$cedula = $data['cedula'];

// Modificar la consulta para incluir el correo electrónico
$stmt = $conn->prepare("SELECT nombre_completo, tipo_de_cuenta, numero_cuenta, correo_electronico FROM cliente WHERE numero_documento = ?");
$stmt->bind_param('s', $cedula);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    $nombreCompleto = $user['nombre_completo'];
    $tipoCuenta = $user['tipo_de_cuenta'];
    $numeroCuenta = $user['numero_cuenta'];
    $correoElectronico = $user['correo_electronico'];

    // Crear el PDF usando TCPDF
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

    // Eliminar encabezado y pie de página por defecto
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);

    // Establecer márgenes
    $pdf->SetMargins(20, 20, 20);

    // Agregar página
    $pdf->AddPage();

    // Colocar la primera imagen (bancasena.png) en la parte superior
    $pdf->Image(__DIR__ . '/public/bancasena.png', 15, 15, 180);

    // Agregar el contenido del certificado
    $pdf->SetFont('helvetica', 'B', 16);
    $pdf->Cell(0, 10, 'Banco BancaSena', 0, 1, 'C');

    $fechaHora = date('Y-m-d H:i:s');
    $pdf->SetFont('helvetica', '', 12);
    $pdf->MultiCell(0, 10, "Te informa que has generado un certificado por medio de nuestro asistente con fecha y hora: $fechaHora", 0, 'C', 0, 1, '', '', true);
    $pdf->Ln(10);

    $pdf->MultiCell(0, 10, "Señores a quienes pueda interesar:", 0, 'C', 0, 1, '', '', true);
    $pdf->Ln(10);

    $pdf->MultiCell(0, 10, "BancaSena certifica a el/la señor@ $nombreCompleto, con número de documento: $cedula, que tiene una cuenta de tipo '$tipoCuenta' con número '$numeroCuenta'.", 0, 'C', 0, 1, '', '', true);

    // Colocar la segunda imagen (pic.jpg) en la parte inferior
    $pdf->Image(__DIR__ . '/public/pic.jpg', 15, 180, 180);

    $pdf->Ln(20);

    $pdf->SetFont('helvetica', 'I', 10);
    $pdf->MultiCell(0, 10, "Creado y desarrollado por Sennova - Stiven Colorado - Stivenchoo@gmail.com", 0, 'C', 0, 1, '', '', true);

    // Guardar el PDF
    $directoryPath = __DIR__ . '/certificados';
    if (!file_exists($directoryPath)) {
        mkdir($directoryPath, 0777, true);
    }

    $filePath = $directoryPath . '/certificado_' . $cedula . '.pdf';
    $pdf->Output($filePath, 'F');

    // Enviar correo electrónico
    $mail = new PHPMailer\PHPMailer\PHPMailer(); // Cambia aquí para el namespace
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';  // Configura tu servidor SMTP
    $mail->SMTPAuth = true;
    $mail->Username = 'stivenchoo@gmail.com';  // Tu correo
    $mail->Password = 'pumd yiuq tltf ifvu';  // Tu contraseña de aplicación
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('no-reply@bancasena.com', 'BancaSena');
    $mail->addAddress($correoElectronico, $nombreCompleto);
    $mail->Subject = 'Generación de certificado bancaSena';
    $mail->Body = "Es un placer servirte {$nombreCompleto}, aquí tienes tu certificado generado desde el asistente.";
    $mail->addAttachment($filePath);

    if (!$mail->send()) {
        echo json_encode(['error' => 'Error al enviar el correo: ' . $mail->ErrorInfo]);
    } else {
        $pdfUrl = '/certificados/certificado_' . $cedula . '.pdf';
        echo json_encode([
            'success' => true,
            'message' => 'Certificado generado y enviado exitosamente.',
            'pdf_url' => $pdfUrl
        ]);
    }
} else {
    echo json_encode(['error' => 'Usuario no encontrado.']);
}

$stmt->close();
$conn->close();
