// controllers/user.controller.js
// Controlador seguro de usuarios locales
// Usa autenticación del middleware y responde solo con datos no sensibles.

const pool = require('../lib/database.js');

// Helper para respuestas seguras JSON (router nativo)
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

class UserController {
  // ================== Usuario normal ==================
    async getUserData(req, res) {
        try {
        const userId = req.user?.id;
        if (!userId) return json(res, 401, { msg: 'No autenticado' });

      // Seleccionar campos seguros únicamente
        const [rows] = await pool.query(
        'SELECT id, username, role, created_at, session_expiry FROM users WHERE id = ? LIMIT 1',
        [userId]
    );

        const user = rows[0];
            if (!user) return json(res, 404, { msg: 'Usuario no encontrado' });

        return json(res, 200, { data: user });
        } catch (error) {
        console.error('[getUserData]', error);
        return json(res, 500, { msg: 'Error al obtener datos de usuario' });
    }
    }

  // ================== Administrador ==================
  async getAdminData(req, res) {
    try {
      // Este endpoint muestra lista general sin contraseñas
      const [rows] = await pool.query(
        'SELECT id, username, role, created_at, session_expiry FROM users ORDER BY id ASC'
      );

      return json(res, 200, {
        total: rows.length,
        users: rows
      });
    } catch (error) {
      console.error('[getAdminData]', error);
      return json(res, 500, { msg: 'Error al obtener datos de admin' });
    }
  }

  // ================== Superadministrador ==================
  async getSuperAdminData(req, res) {
    try {
      // Información de auditoría básica
      const [users] = await pool.query(
        'SELECT id, username, role, session_id, session_expiry FROM users'
      );
      const [products] = await pool.query(
        'SELECT id, name, price, seller_id FROM products'
      );

      return json(res, 200, {
        msg: 'Panel de control SuperAdmin',
        totalUsuarios: users.length,
        totalProductos: products.length,
        usuarios: users,
        productos: products
      });
    } catch (error) {
      console.error('[getSuperAdminData]', error);
      return json(res, 500, { msg: 'Error al obtener datos de SuperAdmin' });
    }
  }
}

const userController = new UserController();
module.exports = { userController };
