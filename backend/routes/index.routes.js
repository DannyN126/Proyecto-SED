// routes/index.routes.js
// Rutas seguras principales del backend local.
// Protege endpoints con middlewares de autenticación y autorización.

const { authController } = require('../controllers/auth.controller');
const { userController } = require('../controllers/user.controller');
const { productController } = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/authMiddleware');

class IndexRoutes {
    constructor() {
    this.routes = [
      // ==================== Autenticación ====================
        { method: 'post', path: '/register', controller: authController.register },
        { method: 'post', path: '/login', controller: authController.login },
        { method: 'post', path: '/logout', controller: authController.logout, middlewares: [authenticate] },

      // ==================== Usuario común ====================
    {
        method: 'get',
        path: '/user/data',
        controller: userController.getUserData,
        middlewares: [authenticate, authorize(['user', 'admin', 'superadmin'])]
    },

      // ==================== Administración ====================
        {
        method: 'get',
        path: '/admin/data',
        controller: userController.getAdminData,
        middlewares: [authenticate, authorize(['admin', 'superadmin'])]
    },
        {
        method: 'get',
        path: '/superadmin/data',
        controller: userController.getSuperAdminData,
        middlewares: [authenticate, authorize(['superadmin'])]
        },

      // ==================== Productos (solo usuarios autenticados) ====================
        {
        method: 'post',
        path: '/product',
        controller: productController.addProduct,
        middlewares: [authenticate, authorize(['user', 'admin', 'superadmin'])]
        },
        {
        method: 'put',
        path: '/product/:id',
        controller: productController.updateProduct,
        middlewares: [authenticate, authorize(['user', 'admin', 'superadmin'])]
        },
        {
        method: 'delete',
        path: '/product/:id',
        controller: productController.deleteProduct,
        middlewares: [authenticate, authorize(['user', 'admin', 'superadmin'])]
    },
        {
        method: 'get',
        path: '/products',
        controller: productController.getAllProducts,
        middlewares: [authenticate, authorize(['user', 'admin', 'superadmin'])]
    }
    ];
}
}

const indexRoutes = new IndexRoutes();
module.exports = { indexRoutes };
