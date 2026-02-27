// src/routes/cards.js
const express = require('express');
const router = express.Router();

const cardService = require('../services/cards');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');

// POST /cards/create  -> crear nueva tarjeta para el usuario
router.post('/create', async (req, res) => {
    try {
        logger.info('POST /cards/create called');
        const cardData = req.body || {};
        const result = await cardService.createCard(cardData);
        if (!result) {
            return responseHandler.badRequest(res, 'Error al crear tarjeta');
        }
        return responseHandler.success(res, { message: 'Tarjeta creada', cardId: result });
    } catch (err) {
        logger.error('Error en creación de tarjeta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /cards/user/:userId  -> obtener tarjetas de un usuario
router.get('/user/:userId', async (req, res) => {
    try {
        logger.info('GET /cards/user/:userId called');
        const userId = req.params.userId;
        const cards = await cardService.getCardsByUserId(userId);
        return responseHandler.success(res, cards);
    } catch (err) {
        logger.error('Error al obtener tarjetas de usuario', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// PUT /cards/:cardId  -> actualizar nombre/límite/vigencia/corte de tarjeta
router.put('/:cardId', async (req, res) => {
    try {
        logger.info('PUT /cards/:cardId called');
        const cardId = req.params.cardId;
        const { card_name, credit_limit, expiry_date, cut_off_day } = req.body || {};
        await cardService.updateCard({ id: cardId, card_name, credit_limit, expiry_date, cut_off_day });
        return responseHandler.success(res, { message: 'Tarjeta actualizada' });
    } catch (err) {
        logger.error('Error al actualizar tarjeta', err);
        const known = ['id es requerido', 'Sin campos para actualizar', 'expiry_date debe tener formato', 'cut_off_day debe ser'];
        if (known.some(m => err.message?.includes(m))) return responseHandler.badRequest(res, err.message);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// DELETE /cards/:cardId  -> eliminar tarjeta por ID
router.delete('/:cardId', async (req, res) => {
    try {
        logger.info('DELETE /cards/:cardId called');
        const cardId = req.params.cardId;
        await cardService.deleteCard(cardId);
        return responseHandler.success(res, { message: 'Tarjeta eliminada' });
    } catch (err) {
        logger.error('Error al eliminar tarjeta', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

module.exports = router;