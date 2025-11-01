// lib/database.js
// Conexión segura y local a MySQL usando mysql2/promise.
// Adaptado para la tienda de videojuegos "GameStoreDB".
// Proyecto 100% local (sin SSL ni dependencias externas).

const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// ========== Logger básico ==========
const logger = {
  info: (...args) => console.info('[DB]', ...args),
  warn: (...args) => console.warn('[DB]', ...args),
  error: (...args) => console.error('[DB]', ...args)
};

// ========== Variables de entorno o valores por defecto ==========
const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = 'Reunieronlas7esferasdeldragon?',
  DB_NAME = 'GameStoreDB',
  DB_PORT = '3306',
  DB_CONNECTION_LIMIT = '10',
  NODE_ENV = 'development',
  DB_SSL = 'false',
  DB_SSL_CA_PATH = ''
} = process.env;

// Validación mínima
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  logger.error('❌ Faltan variables de entorno de base de datos. Revisa .env');
  if (NODE_ENV === 'production') process.exit(1);
}

// ========== Configuración SSL opcional (no usada en entorno local) ==========
let sslOptions = undefined;
if (DB_SSL === 'true') {
  try {
    const ca = DB_SSL_CA_PATH ? fs.readFileSync(DB_SSL_CA_PATH) : undefined;
    sslOptions = ca ? { ca } : { rejectUnauthorized: true };
    logger.info('🔐 Conexión SSL activada para la base de datos');
  } catch (err) {
    logger.error('No se pudo leer DB_SSL_CA_PATH:', err.message);
    if (NODE_ENV === 'production') process.exit(1);
  }
}

// ========== Crear pool de conexiones ==========
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: Number(DB_CONNECTION_LIMIT),
  queueLimit: 0,
  connectTimeout: 10_000,
  acquireTimeout: 10_000,
  ...(sslOptions ? { ssl: sslOptions } : {})
});

// ========== Probar conexión (solo en modo desarrollo) ==========
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT NOW() AS time');
      logger.info(`✅ Conectado a ${DB_NAME} correctamente (${rows[0].time})`);
    } finally {
      conn.release();
    }
  } catch (error) {
    logger.error('Error al conectar a la base de datos:', error.message || error);
    if (NODE_ENV === 'production') {
      logger.error(' Entorno de producción sin conexión. Saliendo...');
      process.exit(1);
    } else {
      logger.warn('Modo desarrollo: continuar aunque no se pudo conectar.');
    }
  }
}

const RUN_DB_TEST =
  process.env.RUN_DB_TEST === 'true' || NODE_ENV === 'development';
if (RUN_DB_TEST) {
  testConnection().catch(err => logger.error('testConnection falló:', err));
}

// ========== Exportar pool ==========
module.exports = pool;
