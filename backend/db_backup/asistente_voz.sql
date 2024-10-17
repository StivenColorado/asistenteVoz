-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 17-10-2024 a las 17:18:40
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `asistente_voz`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `correo_electronico` varchar(100) NOT NULL,
  `numero_telefono` varchar(15) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre_completo`, `numero_documento`, `correo_electronico`, `numero_telefono`, `fecha_nacimiento`) VALUES
(1, 'Juan Pérez', '12345678', 'juan.perez@example.com', '555-0101', '1985-05-20'),
(2, 'María López', '87654321', 'maria.lopez@example.com', '555-0102', '1990-03-15'),
(3, 'Carlos García', '23456789', 'carlos.garcia@example.com', '555-0103', '1988-11-10'),
(4, 'Ana Martínez', '34567890', 'ana.martinez@example.com', '555-0104', '1992-07-22'),
(5, 'Luis Rodríguez', '45678901', 'luis.rodriguez@example.com', '555-0105', '1980-01-30'),
(6, 'Sofía Fernández', '56789012', 'sofia.fernandez@example.com', '555-0106', '1987-09-05'),
(7, 'Pedro Sánchez', '67890123', 'pedro.sanchez@example.com', '555-0107', '1995-12-12'),
(8, 'Laura Gómez', '78901234', 'laura.gomez@example.com', '555-0108', '1993-02-28'),
(9, 'Javier Torres', '89012345', 'javier.torres@example.com', '555-0109', '1989-04-16'),
(10, 'Claudia Ruiz', '90123456', 'claudia.ruiz@example.com', '555-0110', '1991-10-01');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`),
  ADD UNIQUE KEY `correo_electronico` (`correo_electronico`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
