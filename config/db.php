<?php
$host = 'localhost';
$db   = 'videogame_store'; // este será el nombre de tu base de datos
$user = 'root';
$pass = ''; // vacío si no pusiste contraseña en phpMyAdmin
$charset = 'utf8mb4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("<h3>Error de conexión: " . $e->getMessage() . "</h3>");
}
?>
