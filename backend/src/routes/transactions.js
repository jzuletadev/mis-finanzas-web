// src/routes/transactions.js
const express = require('express');
const router = express.Router();

const transactionstService = require('../services/transactions');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');

// para hacer una transferncia entre cuentas
// se debe hace run gasto en una cuenta y un ingreso en la otra cuenta, ambos con la misma categoría de transferencia

// POST /transactions/create -> crear nueva transacción
router.post('/create', async (req, res) => {
    try {
        logger.info('POST /transactions/create called');
        const transactionData = req.body || {};

        const result = await transactionstService.createTransaction(transactionData);
        if (!result) {
            return responseHandler.badRequest(res, 'Error al crear transacción');
        }

        return responseHandler.success(res, { message: 'Transacción creada', transactionId: result });
    } catch (err) {
        logger.error('Error en creación de transacción', err);
        const knownErrors = [
            'Saldo insuficiente',
            'Cuenta no encontrada',
            'Tarjeta no encontrada',
            'Límite de crédito excedido',
            'No hay saldo pendiente',
            'Cuenta asociada no encontrada',
            'Categoría no encontrada',
            'Tipo de transacción no encontrado',
            'account_id, amount y type_id son requeridos',
            'card_id es requerido para compras con tarjeta',
            'card_id es requerido para pago de tarjeta',
            'La tarjeta no pertenece a la cuenta seleccionada',
            'La cuenta seleccionada no corresponde a la cuenta asociada a la tarjeta',
            'El monto supera el saldo pendiente de la tarjeta',
            'El monto a pagar debe ser mayor a 0',
            'Solo se pueden pagar tarjetas de crédito',
        ];
        const isBusinessError = knownErrors.some(msg => err.message?.includes(msg));
        if (isBusinessError) {
            return responseHandler.badRequest(res, err.message);
        }
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /transactions/user/:userId -> obtener transacciones de un usuario
router.get('/user/:userId', async (req, res) => {
    try {
        logger.info('GET /transactions/user/:userId called');
        const userId = req.params.userId;
        const transactions = await transactionstService.getTransactionsByUserId(userId);
        return responseHandler.success(res, transactions);
    } catch (err) {
        logger.error('Error al obtener transacciones de usuario', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /transactions/card/:cardId -> obtener transacciones de una tarjeta
router.get('/card/:cardId', async (req, res) => {
    try {
        logger.info('GET /transactions/card/:cardId called');
        const cardId = req.params.cardId;
        const transactions = await transactionstService.getTransactionsByCardId(cardId);
        return responseHandler.success(res, transactions);
    } catch (err) {
        logger.error('Error al obtener transacciones de tarjeta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /transactions/account/:accountId -> obtener transacciones de una cuenta
router.get('/account/:accountId', async (req, res) => {
    try {
        logger.info('GET /transactions/account/:accountId called');
        const accountId = req.params.accountId;
        const transactions = await transactionstService.getTransactionsByAccountId(accountId);
        return responseHandler.success(res, transactions);
    }
    catch (err) {
        logger.error('Error al obtener transacciones de cuenta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

module.exports = router;