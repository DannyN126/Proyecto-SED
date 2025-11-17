// lib/router.js
// Router seguro y local, sin dependencias externas.
// Compatible con tu servidor HTTP nativo.

const MAX_BODY_SIZE = 1_000_000; // 1 MB
const BODY_TIMEOUT_MS = 10_000;  // 10 segundos

class Router {

  constructor() {
    this._routes = [];
    this._baseURL = `http://localhost:${process.env.PORT || 5000}`;
  }

  // ============================
  // REGISTRO DE RUTAS
  // ============================
  use(url, callback) {
    const _url = new URL(url, this._baseURL).pathname;
    const basePath = _url.replace(/^\/+|\/$/g, '');

    callback.routes.forEach(route => {
      const {
        method,
        controller,
        path: rPath,
        middlewares = []
      } = route;

      let path = '/' + basePath;
      let params = [];

      // Procesar segmentos del path
      rPath.split('/').forEach(p => {
        if (!p) return;

        if (p.startsWith(':')) {
          const key = p.slice(1);
          params.push(key);
          path += '/([^/]+)'; 
        } else {
          path += '/' + p;
        }
      });

      // corregir barras dobles
      path = path.replace(/\/+/g, '/');

      // generar regex final
      const regex = new RegExp(`^${path}$`);

      this._routes.push({
        path: regex,
        method: method.toLowerCase(),
        controller,
        params,
        middlewares
      });
    });
  }

  // ============================
  // ENRUTAMIENTO PRINCIPAL
  // ============================
  async route(req, res) {

    const url = new URL(req.url, this._baseURL);
    const method = req.method.toLowerCase();

    const route = this._routes.find(r => {
      const methodMatch = r.method === method;
      const pathMatch = url.pathname.match(r.path);
      return methodMatch && pathMatch;
    });

    if (!route) {
      return this.notFound(res);
    }

    try {
      req.params = this.getParams(url.pathname, route);
      req.query = this.getQuery(url);
      req.body = await this.parseBody(req, res);

      // ejecutar middlewares en cadena
      for (const mw of route.middlewares) {
        let nextCalled = false;

        const next = () => nextCalled = true;

        await mw(req, res, next);

        if (!nextCalled) return;
      }

      // ejecutar controlador final
      await route.controller(req, res);

    } catch (err) {
      console.error('[router.route]', err);
      this.internalError(res);
    }
  }

  // ============================
  // PARSEO DEL BODY
  // ============================
  parseBody(req, res) {
    return new Promise((resolve, reject) => {

      const chunks = [];
      let totalSize = 0;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        res.writeHead(408, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ msg: 'Tiempo de espera agotado' }));
        req.destroy();
        reject(new Error('Timeout body'));
      }, BODY_TIMEOUT_MS);

      req.on('data', chunk => {
        totalSize += chunk.length;

        if (totalSize > MAX_BODY_SIZE) {
          clearTimeout(timer);
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ msg: 'El cuerpo excede 1MB' }));
          req.destroy();
          return reject(new Error('Payload too large'));
        }

        chunks.push(chunk);
      });

      req.on('end', () => {
        if (timedOut) return;
        clearTimeout(timer);

        if (chunks.length === 0) return resolve({});

        try {
          const raw = Buffer.concat(chunks).toString();
          const contentType = req.headers['content-type'] || '';

          if (contentType.includes('application/json')) {
            resolve(raw ? JSON.parse(raw) : {});
          } else {
            resolve({ raw });
          }

        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
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

  // ============================
  // ERRORES 404 y 500
  // ============================
  notFound(res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ msg: 'Recurso no encontrado' }));
  }

  internalError(res) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ msg: 'Error interno del servidor' }));
  }

  // ============================
  // EXTRAER PARAMETROS
  // ============================
  getParams(pathname, route) {
    const match = pathname.match(route.path);
    const params = {};

    if (!match) return params;

    route.params.forEach((key, i) => {
      params[key] = match[i + 1];
    });

    return params;
  }

  // ============================
  // QUERY STRING
  // ============================
  getQuery(url) {
    const obj = {};

    for (const name of url.searchParams.keys()) {
      obj[name] = url.searchParams.get(name);
    }

    return obj;
  }
}

const router = new Router();
module.exports = { router };
