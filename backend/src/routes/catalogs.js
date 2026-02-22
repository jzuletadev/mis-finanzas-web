// src/routes/catalogs.js
const express = require('express');
const router = express.Router();

const catalogsService = require('../services/catalogs');
const responseHandler = require('../middleware/responseHandler');
const logger = require('../utils/logger');

// GET /catalogs/categories -> obtener todas las categorías
router.get('/categories', async (req, res) => {
    try {
        logger.info('GET /catalogs/categories called');
        const categories = await catalogsService.getCategories();
        return responseHandler.success(res, categories);
    } catch (err) {
        logger.error('Error al obtener categorías', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /catalogs/categories/:type -> obtener categorías por tipo (INGRESO o GASTO)
router.get('/categories/:type', async (req, res) => {
    try {
        logger.info('GET /catalogs/categories/:type called');
        const type = req.params.type.toUpperCase();
        if (type !== 'INGRESO' && type !== 'GASTO') {
            return responseHandler.badRequest(res, 'Tipo debe ser INGRESO o GASTO');
        }
        const categories = await catalogsService.getCategoriesByType(type);
        return responseHandler.success(res, categories);
    } catch (err) {
        logger.error('Error al obtener categorías por tipo', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

// GET /catalogs/types -> obtener todos los tipos de transacción
router.get('/types', async (req, res) => {
    try {
        logger.info('GET /catalogs/types called');
        const types = await catalogsService.getTypes();
        return responseHandler.success(res, types);
    } catch (err) {
        logger.error('Error al obtener tipos de transacción', err);
        return responseHandler.error(res, 'Error interno del servidor');
    }
});

module.exports = router;
