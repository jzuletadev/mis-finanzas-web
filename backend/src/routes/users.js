// src/routes/users.js
const express = require('express');
const router = express.Router();

const userService = require('../services/users');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');
const cookieJwtAuth = require('../middleware/cookieJwtAuth'); // <- usa JWT desde cookies

// GET /users/me  -> datos básicos (provenientes del JWT y JOINs)
router.get('/me', cookieJwtAuth, async (req, res) => {
  try {
    logger.info('GET /users/me called');
    const userId = req.user?.sub;
    if (!userId) return responseHandler.unauthorized(res, 'No autorizado');

    const data = await userService.getUserInfo(userId);
    if (!data) return responseHandler.notFound(res, 'Usuario no encontrado');

    return responseHandler.success(res, data); // data.services ya viene poblado
  } catch (err) {
    logger.error('Error al obtener datos de usuario', err);
    return responseHandler.error(res, 'Error al obtener datos de usuario');
  }
});

// POST /users/create  -> registro de nuevo usuario
router.post('/create', async (req, res) => {
  try {
    logger.info('POST /users/create called');
    const userData = req.body || {};
    const result = await userService.createUser(userData);

    if (!result.success) {
      return responseHandler.badRequest(res, result.error || 'Error al crear usuario');
    }
    return responseHandler.success(res, { message: 'Usuario creado', userId: result.data.id });
  } catch (err) {
    logger.error('Error en creación de usuario', err);
    return responseHandler.error(res, 'Error interno del servidor');
  } 
});

// POST /users/change-password  (protegido, userId sale del JWT)
router.post('/change-password', cookieJwtAuth, async (req, res) => {
  try {
    logger.info('POST /users/change-password called');
    const userId = req.user?.sub;
    const { current_password, new_password } = req.body || {};

    if (!userId || !current_password || !new_password) {
      return responseHandler.badRequest(res, 'Faltan datos');
    }

    const r = await userService.changePassword({ user_id: userId, current_password, new_password });
    return responseHandler.success(res, r);
  } catch (err) {
    logger.error('POST /users/change-password', err);
    return responseHandler.error(res, err.message || 'No se pudo cambiar la contraseña');
  }
});

module.exports = router;