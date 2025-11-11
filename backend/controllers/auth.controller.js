// controllers/auth.controller.js
// Controlador seguro de autenticación local
// Depende del middleware authMiddleware.js (helpers para token y cookie)
// y de lib/database.js (pool MySQL local)

const pool = require('../lib/database.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { issueSessionToken, getSessionCookieAttributes } = require('../middleware/authMiddleware');

// ==================== Configuración ====================
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || '3600'); // 1 hora por defecto

// Helper para respuestas JSON seguras
function json(res, status, body) {
    try {
        res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(body ?? {}));
    } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"msg":"Error interno"}');
    }
}

class AuthController {
  // ========== Registro ==========
    async register(req, res) {
        try {
            const { username, password, role = 'user' } = req.body;

            if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return json(res, 400, { msg: 'Datos inválidos' });
        }

        const allowedRoles = ['user', 'admin', 'superadmin'];
            if (!allowedRoles.includes(role)) {
        return json(res, 400, { msg: 'Rol inválido' });
        }

      // Evitar duplicados
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) {
        return json(res, 400, { msg: 'El usuario ya existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
        username.trim(),
        hashedPassword,
        role
      ]);

      return json(res, 201, { msg: 'Usuario registrado exitosamente' });
    } catch (error) {
      console.error('[register]', error);
      return json(res, 500, { msg: 'Error en el servidor' });
    }
  }

  // ========== Login ==========
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return json(res, 400, { msg: 'Username y password requeridos' });
      }

      const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
      const user = rows[0];

      if (!user) {
        return json(res, 401, { msg: 'Credenciales incorrectas' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return json(res, 401, { msg: 'Credenciales incorrectas' });
      }

      // Generar session_id aleatorio
      const sessionId = crypto.randomUUID();
      const expiry = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

      
      // Guardar sesión en BD
      /*await pool.query(
        'UPDATE users SET session_id = ?, session_expiry = ? WHERE id = ?',
        [sessionId, expiry, user.id]
      );*/


      // Crear token firmado localmente
      const token = issueSessionToken({
        userId: user.id,
        sessionId,
        ttlSeconds: SESSION_TTL_SECONDS
      });

      // Construir cabecera Set-Cookie
      const cookieAttrs = getSessionCookieAttributes();
      const cookieHeader = `${cookieAttrs[0]}${token}; ${cookieAttrs.slice(1).join('; ')}`;

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': cookieHeader,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      });
      res.end(
        JSON.stringify({
          msg: 'Login exitoso',
          role: user.role,
          expiresIn: SESSION_TTL_SECONDS
        })
      );
    } catch (error) {
      console.error('[login]', error);
      return json(res, 500, { msg: 'Error en el servidor' });
    }
  }

  // ========== Logout ==========
  async logout(req, res) {
    try {
      const { user } = req;
      if (!user) return json(res, 401, { msg: 'No autenticado' });

      await pool.query('UPDATE users SET session_id = NULL, session_expiry = NULL WHERE id = ?', [
        user.id
      ]);

      // Borrar cookie local
      const cookieAttrs = getSessionCookieAttributes();
      const deleteCookie = `${cookieAttrs[0]}; Max-Age=0; ${cookieAttrs.slice(1).join('; ')}`;

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': deleteCookie
      });
      res.end(JSON.stringify({ msg: 'Sesión cerrada correctamente' }));
    } catch (error) {
      console.error('[logout]', error);
      return json(res, 500, { msg: 'Error al cerrar sesión' });
    }
  }
}

const authController = new AuthController();
module.exports = { authController };
