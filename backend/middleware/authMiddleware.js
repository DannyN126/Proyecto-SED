// middleware/authMiddleware.js
// Autenticación y autorización locales, sin dependencias externas.
// - Usa HMAC-SHA256 (crypto nativo) para firmar/verificar tokens tipo "JWT minimalista".
// - Verifica expiración y existencia en BD (session_id + session_expiry).
// - Parseo de cookies robusto (sin libs).
// - Compatible con el router nativo (req, res, next).

const crypto = require('crypto');
const pool = require('../lib/database.js');

// ======== Configuración por entorno (local) ========
const AUTH_SECRET = process.env.AUTH_SECRET || 'cambia-ESTO-por-un-secreto-local-fuerte';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session';
const SESSION_LEEWAY_SEC = Number(process.env.SESSION_LEEWAY_SEC || '10'); // tolerancia reloj (segundos)

// ======== Utilidades internas ========

// Base64 URL-Safe
const b64u = {
    encode: (buf) =>
    Buffer.from(buf)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, ''),
    decode: (str) =>
    Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
};

// Crea firma HS256
function signHS256(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest();
}

// Serializa un token tipo JWT: header.payload.signature (Base64URL)
function createToken(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encHeader = b64u.encode(JSON.stringify(header));
    const encPayload = b64u.encode(JSON.stringify(payload));
    const toSign = `${encHeader}.${encPayload}`;
    const signature = b64u.encode(signHS256(toSign, secret));
    return `${toSign}.${signature}`;
}

// Verifica token (firma + exp). Lanza Error si inválido.
function verifyToken(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Formato de token inválido');
        const [encHeader, encPayload, encSig] = parts;
        const toSign = `${encHeader}.${encPayload}`;
        const expected = b64u.encode(signHS256(toSign, secret));
  // Comparación constante para evitar timing attacks
        const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(encSig));
    if (!ok) throw new Error('Firma inválida');
        const payloadStr = b64u.decode(encPayload).toString('utf8');
    let payload;
    try {
        payload = JSON.parse(payloadStr);
    } catch {
    throw new Error('Payload inválido');
    }

  // Verificar expiración (exp en segundos desde epoch)
  if (typeof payload.exp !== 'number') throw new Error('exp faltante');
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp + SESSION_LEEWAY_SEC) throw new Error('Token expirado');

  return payload; // { sub, sid, role?, iat, exp }
}

// Parseo robusto de cookies
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(val);
    } catch {
      // Si falla decodeURIComponent, guardamos crudo
      out[key] = val;
    }
  }
  return out;
}

// Respuesta JSON segura (router nativo)
function json(res, status, body) {
  try {
    const payload = JSON.stringify(body ?? {});
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(payload);
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end('{"msg":"Error interno"}');
  }
}

// ======== Middleware: Autenticación ========
// Requiere que el login haya establecido en BD: users.session_id y users.session_expiry
// y que el controlador de login emita un token (veremos ese archivo luego).
async function authenticate(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return json(res, 401, { msg: 'No autenticado' });
    }

    let payload;
    try {
      payload = verifyToken(token, AUTH_SECRET); // { sub: userId, sid, exp, iat }
    } catch (err) {
      return json(res, 401, { msg: 'Sesión inválida', err: 'AUTH_TOKEN_INVALID' });
    }

    const userId = Number(payload.sub);
    const sessionId = String(payload.sid || '');

    if (!Number.isInteger(userId) || !sessionId) {
      return json(res, 401, { msg: 'Token inválido' });
    }

    // Validar contra BD: que la sesión exista y no esté expirada
    const [rows] = await pool.query(
      'SELECT id, username, role, session_id, session_expiry FROM users WHERE id = ? AND session_id = ? LIMIT 1',
      [userId, sessionId]
    );
    const user = rows[0];

    if (!user) {
      return json(res, 403, { msg: 'Sesión no encontrada' });
    }

    // Verificar expiración en BD (defensa en profundidad)
    const now = Date.now();
    if (!user.session_expiry || new Date(user.session_expiry).getTime() + (SESSION_LEEWAY_SEC * 1000) < now) {
      return json(res, 401, { msg: 'Sesión expirada' });
    }

    // Adjuntar identidad mínima al request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return next();
  } catch (error) {
    // No exponer detalles internos
    return json(res, 500, { msg: 'Error en autenticación' });
  }
}

// ======== Middleware: Autorización por rol ========
function authorize(roles = []) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return json(res, 401, { msg: 'No autenticado' });
      }
      if (Array.isArray(roles) && roles.length > 0) {
        if (!roles.includes(req.user.role)) {
          return json(res, 403, { msg: 'No autorizado' });
        }
      }
      return next();
    } catch (error) {
      return json(res, 500, { msg: 'Error en autorización' });
    }
  };
}

// ======== Helpers para el controlador de login (opcional) ========
// Estos helpers pueden reutilizarse desde el auth.controller para emitir el token.
// Se dejan exportados para mantener una única fuente de verdad.
function issueSessionToken({ userId, sessionId, ttlSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, Number(ttlSeconds || 3600)); // mínimo 1 minuto
  const payload = { sub: userId, sid: sessionId, iat: now, exp };
  return createToken(payload, AUTH_SECRET);
}

function getSessionCookieAttributes() {
  // En local, 'Secure' puede omitirse si no usas HTTPS;
  // se mantiene como falso por defecto para compatibilidad con http://localhost
  const attrs = [
    `${SESSION_COOKIE_NAME}=`, // el valor se adjunta en el controlador
    'HttpOnly',
    'SameSite=Strict',
    'Path=/' // cookie válida para toda la app
  ];
  // Si estás sirviendo por HTTPS local (proxy), puedes activar Secure:
  if (process.env.COOKIE_SECURE === 'true') {
    attrs.push('Secure');
  }
  return attrs;
}

module.exports = {
  authenticate,
  authorize,
  // helpers para el controlador de auth (login/logout)
  issueSessionToken,
  getSessionCookieAttributes
};
