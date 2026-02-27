// src/routes/accounts.js
const express = require('express');
const router = express.Router();

const accountService = require('../services/accounts');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');

// POST /accounts/create  -> crear nueva cuenta para el usuario
router.post('/create', async (req, res) => {
    try {
        logger.info('POST /accounts/create called');
        const accountData = req.body || {};
        const result = await accountService.createAccount(accountData);
        if (!result) {
            return responseHandler.badRequest(res, 'Error al crear cuenta');
        }
        return responseHandler.success(res, { message: 'Cuenta creada', accountId: result });
    } catch (err) {
        logger.error('Error en creación de cuenta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /accounts/user/:userId  -> obtener cuentas de un usuario
router.get('/user/:userId', async (req, res) => {
    try {
        logger.info('GET /accounts/user/:userId called');
        const userId = req.params.userId;
        const accounts = await accountService.getAccountsByUserId(userId);
        return responseHandler.success(res, accounts);
    } catch (err) {
        logger.error('Error al obtener cuentas de usuario', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// PUT /accounts/:accountId  -> actualizar nombre/tipo de cuenta
router.put('/:accountId', async (req, res) => {
    try {
        logger.info('PUT /accounts/:accountId called');
        const accountId = req.params.accountId;
        const { account_name, account_type } = req.body || {};
        await accountService.updateAccount({ id: accountId, account_name, account_type });
        return responseHandler.success(res, { message: 'Cuenta actualizada' });
    } catch (err) {
        logger.error('Error al actualizar cuenta', err);
        const known = ['id es requerido', 'Sin campos para actualizar'];
        if (known.some(m => err.message?.includes(m))) return responseHandler.badRequest(res, err.message);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// DELETE /accounts/:accountId  -> eliminar cuenta por ID
router.delete('/:accountId', async (req, res) => {
    try {
        logger.info('DELETE /accounts/:accountId called');
        const accountId = req.params.accountId;
        await accountService.deleteAccount(accountId);
        return responseHandler.success(res, { message: 'Cuenta eliminada' });
    } catch (err) {
        logger.error('Error al eliminar cuenta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

module.exports = router;