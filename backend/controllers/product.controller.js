// controllers/product.controller.js
// Controlador local y seguro de productos.
// Requiere autenticación previa (req.user provisto por authMiddleware).

const pool = require('../lib/database.js');

// Helper de respuesta segura para router nativo
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

// Validadores locales
function isValidPrice(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0;
}
function isValidText(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 255;
}

class ProductController {
  // ======== Crear producto ========
    async addProduct(req, res) {
        try {
        const { name, price, image_url } = req.body;
        const sellerId = req.user?.id;

        if (!sellerId) return json(res, 401, { msg: 'No autenticado' });
        if (!isValidText(name) || !isValidPrice(price)) {
        return json(res, 400, { msg: 'Datos inválidos' });
    }

    const [result] = await pool.execute(
        'INSERT INTO products (name, price, image_url, seller_id) VALUES (?, ?, ?, ?)',
        [name.trim(), price, image_url?.trim() || null, sellerId]
    );

        return json(res, 201, {
        msg: 'Producto agregado correctamente',
        productId: result.insertId
    });
        } catch (error) {
        console.error('[addProduct]', error);
        return json(res, 500, { msg: 'Error al agregar producto' });
    }
    }

  // ======== Actualizar producto ========
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, price, image_url } = req.body;
      const sellerId = req.user?.id;

      if (!sellerId) return json(res, 401, { msg: 'No autenticado' });
      if (!id || isNaN(Number(id))) return json(res, 400, { msg: 'ID inválido' });
      if (!isValidText(name) || !isValidPrice(price)) {
        return json(res, 400, { msg: 'Datos inválidos' });
      }

      const [result] = await pool.execute(
        'UPDATE products SET name = ?, price = ?, image_url = ? WHERE id = ? AND seller_id = ?',
        [name.trim(), price, image_url?.trim() || null, id, sellerId]
      );

      if (result.affectedRows === 0) {
        return json(res, 404, { msg: 'Producto no encontrado o no autorizado' });
      }

      return json(res, 200, { msg: 'Producto actualizado correctamente' });
    } catch (error) {
      console.error('[updateProduct]', error);
      return json(res, 500, { msg: 'Error al actualizar producto' });
    }
  }

  // ======== Eliminar producto ========
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;

      if (!sellerId) return json(res, 401, { msg: 'No autenticado' });
      if (!id || isNaN(Number(id))) return json(res, 400, { msg: 'ID inválido' });

      const [result] = await pool.execute(
        'DELETE FROM products WHERE id = ? AND seller_id = ?',
        [id, sellerId]
      );

      if (result.affectedRows === 0) {
        return json(res, 404, { msg: 'Producto no encontrado o no autorizado' });
      }

      return json(res, 200, { msg: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('[deleteProduct]', error);
      return json(res, 500, { msg: 'Error al eliminar producto' });
    }
  }

  // ======== Obtener productos del vendedor ========
  async getAllProducts(req, res) {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) return json(res, 401, { msg: 'No autenticado' });

      const [products] = await pool.execute(
        'SELECT id, name, price, image_url, seller_id FROM products WHERE seller_id = ? ORDER BY id ASC',
        [sellerId]
      );

      return json(res, 200, { total: products.length, products });
    } catch (error) {
      console.error('[getAllProducts]', error);
      return json(res, 500, { msg: 'Error al obtener productos' });
    }
  }
}

const productController = new ProductController();
module.exports = { productController };
