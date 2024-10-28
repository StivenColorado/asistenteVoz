-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 21-10-2024 a las 14:38:11
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
-- Estructura de tabla para la tabla `cliente`
--

CREATE TABLE `cliente` (
  `id` int(11) NOT NULL,
  `nombre_completo` varchar(255) DEFAULT NULL,
  `numero_documento` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `numero_telefono` varchar(20) DEFAULT NULL,
  `estado_civil` varchar(20) DEFAULT NULL,
  `genero` varchar(10) DEFAULT NULL,
  `correo_electronico` varchar(255) DEFAULT NULL,
  `departamento` varchar(50) DEFAULT NULL,
  `ciudad` varchar(50) DEFAULT NULL,
  `tipo_de_cuenta` varchar(20) DEFAULT NULL,
  `numero_cuenta` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cliente`
--

INSERT INTO `cliente` (`id`, `nombre_completo`, `numero_documento`, `fecha_nacimiento`, `direccion`, `numero_telefono`, `estado_civil`, `genero`, `correo_electronico`, `departamento`, `ciudad`, `tipo_de_cuenta`, `numero_cuenta`) VALUES
(1, 'Camila Benitez Franco', '1114540070', '2003-12-02', 'Cra 16A # 23-11', '3165735746', 'Soltera', 'Femenino', 'camilabenitez851@gmail.com', 'Valle del Cauca', 'Palmira', 'Ahorro', '1234562996'),
(2, 'Elizabeth Chapuesgal Muñoz', '1006288078', '2001-09-12', 'Diag 67 #31a-39', '3172445380', 'Soltera', 'Femenino', 'elizachap@outlook.com', 'Valle del Cauca', 'Palmira', 'Ahorro', '1234568749'),
(3, 'Sofia Vergara Castañeda', '1114541185', '2004-12-25', 'calle 22a #16a-155', '3186702037', 'Soltera', 'Femenino', 'vergarasofia012@gmail.com', 'Valle del Cauca', 'Palmira', 'Ahorro', '1234564758'),
(4, 'Jessica Joana Barrera Balanta', '1114827330', '1992-06-25', 'Cra 2 # 6-52', '3153660485', 'soltera', 'Femenino', 'barrerajj25@gmail.com', 'Valle del Cauca', 'El Cerrito', 'Ahorro', '1234567545'),
(5, 'Brigite Tatiana Ramirez Valencia', '1127629150', '1999-09-13', 'calle 31#3e-37', '3103756134', 'soltera', 'Femenino', 'ramirezbrigitte13@gmail.com', 'Valle del Cauca', 'Palmira', 'ahorros', '1234563449');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cliente`
--
ALTER TABLE `cliente`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cliente`
--
ALTER TABLE `cliente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
