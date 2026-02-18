// src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authService = require('../services/auth');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');
const { parseDuration } = require('../utils/parseDuration');

const SECRET_KEY     = process.env.JWT_SECRET || 'my_jwt_secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'my_jwt_refresh_secret_key';
const TOKEN_EXP      = process.env.JWT_EXPIRATION || '1h';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRATION || '10h';

const isCloudEnvironment = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'; // Ambos están en la nube

const COOKIE_SECURE  = isCloudEnvironment; // true en prod/test (HTTPS en la nube)
// Para dominios cruzados en la nube, usar 'None' con Secure: true
const COOKIE_SAMESITE = isCloudEnvironment ? 'None' : 'Lax';

// Función auxiliar para configurar cookies con opciones optimizadas para móviles
function getCookieOptions(maxAge) {
  const baseOptions = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: '/',
    maxAge
  };

  // En entornos de nube (test/prod), agregar configuraciones adicionales para compatibilidad
  if (isCloudEnvironment) {
    // No establecer domain específico para permitir subdominios
    return baseOptions;
  }

  return baseOptions;
}

function msFromStr(s) { return parseDuration(s) * 1000; }

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    logger.info('/auth/login called');
    const { username, password } = req.body;

    if (!username || !password) {
      return responseHandler.badRequest(res, 'Nombre de usuario y contraseña son requeridos');
    }

    const result = await authService.login({ username, password });
    
    if (!result.ok) {
      logger.warn('Fallo en inicio de sesión', { username });
      return responseHandler.unauthorized(res, result.error);
    }

    const { tokens, user } = result;

    // Cookies HttpOnly (para navegadores web que las soporten)
    res.cookie('access_token', tokens.accessToken, getCookieOptions(msFromStr(TOKEN_EXP)));
    res.cookie('refresh_token', tokens.refreshToken, getCookieOptions(msFromStr(REFRESH_EXP)));

    logger.info('Login successful, cookies set for user:', user.id);

    // Devolver tokens también en el response body para móviles y casos donde cookies no funcionen
    return responseHandler.success(res, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken, // Agregar refresh token para móviles
      user,
      expires_in: msFromStr(TOKEN_EXP) / 1000 // tiempo de expiración en segundos
    });
  } catch (err) {
    logger.error('Error en proceso de login', err);
    return responseHandler.error(res, 'Error interno del servidor');
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;
    if (!refreshToken) {
      return responseHandler.unauthorized(res, 'Refresh token no presente');
    }

    // Verificar que exista en BD y no esté expirado
    const stored = await authService.getRefreshToken(refreshToken);
    if (!stored) {
      return responseHandler.unauthorized(res, 'Refresh token inválido');
    }

    // Validar firma y exp
    jwt.verify(refreshToken, REFRESH_SECRET, (err, payload) => {
      if (err) return responseHandler.unauthorized(res, 'Refresh token inválido o expirado');

      // Emitir nuevo access token (puedes rotar refresh si quieres)
      const accessToken = jwt.sign({
        sub: payload.sub,
        user: payload.user
      }, SECRET_KEY, { expiresIn: TOKEN_EXP });

      res.cookie('access_token', accessToken, getCookieOptions(msFromStr(TOKEN_EXP)));

      // Devolver tanto access como refresh token para móviles
      return responseHandler.success(res, { 
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: msFromStr(TOKEN_EXP) / 1000
      });
    });
  } catch (err) {
    return responseHandler.error(res, 'Error al refrescar token');
  }
});

// GET /auth/logout
router.get('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.query?.refresh_token;
    if (refreshToken) {
      await authService.deleteRefreshToken(refreshToken);
    }
  } catch (err) {
    logger.warn('Error deleting refresh token during logout:', err);
  }

  // Limpiar cookies con las mismas opciones que se usaron para crearlas
  const clearOptions = getCookieOptions(0); // maxAge 0 para limpiar
  delete clearOptions.maxAge; // clearCookie no usa maxAge
  
  res.clearCookie('access_token', clearOptions);
  res.clearCookie('refresh_token', clearOptions);

  logger.info('Logout successful, cookies cleared');
  return responseHandler.success(res, { message: 'Logout exitoso' });
});

// GET /auth/validate
router.get('/validate', (req, res) => {
  const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return responseHandler.unauthorized(res, 'No autorizado. Token no encontrado.');
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return responseHandler.unauthorized(res, 'Token inválido o expirado.');
    return responseHandler.success(res, { message: 'Token válido', user });
  });
});

module.exports = router;