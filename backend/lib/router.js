// lib/router.js
// Router seguro y local, sin dependencias externas.
// Compatible con tu servidor HTTP nativo.

const MAX_BODY_SIZE = 1_000_000; // 1 MB de límite para evitar DoS
const BODY_TIMEOUT_MS = 10_000;  // 10 segundos para recibir el body

class Router {
    constructor() {
        this._routes = [];
        this._baseURL = `http://localhost:${process.env.PORT || 5000}`;
}

  // ======== Registro de rutas ========
    use(url, callback) {
    const _url = new URL(url, this._baseURL).pathname;
    const basePath = _url.replace(/^\/+|\/$/g, '');

    callback.routes.forEach(route => {
        const { method, controller, path: rPath, middlewares = [] } = route;
        let path = '/' + basePath;
        let params = [];

        rPath.split('/').forEach((p, i) => {
        if (p) {
            const key = p.startsWith(':') ? p.slice(1) : null;
        if (key) {
            params[i + 1] = key;
            path += '/([^/]+)'; // segment variable seguro
        } else {
            path += '/' + p;
        }
        }
    });

    const regex = new RegExp(`${path}$`);
    this._routes.push({ path: regex, method: method.toLowerCase(), controller, params, middlewares });
    });
}

  // ======== Enrutamiento principal ========
    async route(req, res) {
    const url = new URL(req.url, this._baseURL);
    const method = req.method.toLowerCase();

    const route = this._routes.find(_route => {
        const methodMatch = _route.method === method;
        const pathMatch = url.pathname.match(_route.path);
        return methodMatch && pathMatch;
    });

    if (!route) {
        return this.notFound(res);
    }

    try {
        req.params = this.getParams(url.pathname, route.params);
        req.query = this.getQuery(url);
        req.body = await this.parseBody(req, res);

      // Ejecutar middlewares secuenciales
    for (const mw of route.middlewares) {
        let nextCalled = false;
        const next = () => (nextCalled = true);
        await mw(req, res, next);
        if (!nextCalled) return; // middleware terminó la respuesta
    }

      // Ejecutar el controlador asociado
    await route.controller(req, res);
    } catch (err) {
        console.error('[router.route]', err);
        this.internalError(res);
    }
}

  // ======== Parseo del body con límites ========
  parseBody(req, res) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalSize = 0;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        res.writeHead(408, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ msg: 'Tiempo de espera agotado (body demasiado grande)' }));
        req.destroy();
        reject(new Error('Timeout en lectura de body'));
      }, BODY_TIMEOUT_MS);

      req.on('data', chunk => {
        totalSize += chunk.length;
        if (totalSize > MAX_BODY_SIZE) {
          clearTimeout(timer);
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ msg: 'El cuerpo excede el tamaño máximo permitido (1MB)' }));
          req.destroy();
          reject(new Error('Payload Too Large'));
        } else {
          chunks.push(chunk);
        }
      });

      req.on('end', () => {
        if (timedOut) return;
        clearTimeout(timer);
        if (chunks.length === 0) return resolve({});

        try {
          const raw = Buffer.concat(chunks).toString();
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            return resolve(raw ? JSON.parse(raw) : {});
          }
          // Si no es JSON, devolver texto plano
          resolve({ raw });
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ msg: 'JSON inválido' }));
          reject(new Error('JSON inválido'));
        }
      });

      req.on('error', err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ======== 404 ========
  notFound(res) {
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({ msg: 'Recurso no encontrado' }));
  }

  // ======== 500 ========
  internalError(res) {
    res.writeHead(500, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({ msg: 'Error interno del servidor' }));
  }

  // ======== Extracción de parámetros ========
  getParams(pathname, params) {
    const parts = pathname.split('/');
    const obj = {};
    parts.forEach((p, i) => {
      if (params[i + 1]) obj[params[i + 1]] = p;
    });
    return obj;
  }

  // ======== Query ========
  getQuery(_url) {
    const query = {};
    for (const name of _url.searchParams.keys()) {
      query[name] = _url.searchParams.get(name);
    }
    return query;
  }
}

const router = new Router();
module.exports = { router };
