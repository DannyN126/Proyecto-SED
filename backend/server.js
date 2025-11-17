// server.js
// Servidor HTTP local y seguro (sin dependencias externas).
// Integra router, rutas y controladores construidos manualmente.

const http = require('http');
const { router } = require('./lib/router');
const { indexRoutes } = require('./routes/index.routes');

// ================== Configuración ==================
const PORT = process.env.PORT || 5000;
const HOST = 'localhost'; // solo entorno local
const BASE_URL = `http://${HOST}:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ================== Registro de rutas ==================
router.use('/api', indexRoutes);

// ================== Creación del servidor ==================
const server = http.createServer(async (req, res) => {
  try {
    // Cabeceras de seguridad básicas en TODAS las respuestas
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // CORS deshabilitado por defecto (proyecto local)
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin');

    // Manejar preflight (navegadores modernos)
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Pasar al router
    await router.route(req, res);
  } catch (error) {
    console.error('[Server Error]', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ msg: 'Error interno del servidor' }));
  }
});

// ================== Manejo global de errores ==================
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ================== Manejo de apagado seguro ==================
function gracefulShutdown() {
  console.log('\n[Apagando servidor...]');
  server.close(() => {
    console.log('Servidor detenido correctamente.');
    process.exit(0);
  });

  // Forzar salida tras 3 segundos si no se cierra
  setTimeout(() => {
    console.error('Cierre forzado.');
    process.exit(1);
  }, 3000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// ================== Arranque ==================
server.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en ${BASE_URL}`);
  console.log(`Entorno: ${NODE_ENV}`);
  console.log('Rutas base disponibles en /api/');
});

console.log('📡 Iniciando ejecución de server.js...');

