// src/services/catalogs.js
const { getPool } = require('../connections/database');

// Obtiene todas las categorías
async function getCategories() {
    const pool = await getPool();
    const [rows] = await pool.query(`SELECT * FROM categories ORDER BY type, name`);
    return rows;
}

// Obtiene categorías por tipo (INGRESO o GASTO)
async function getCategoriesByType(type) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT * FROM categories WHERE type = ? ORDER BY name`,
        [type]
    );
    return rows;
}

// Obtiene todos los tipos de transacción
async function getTypes() {
    const pool = await getPool();
    const [rows] = await pool.query(`SELECT * FROM types ORDER BY name`);
    return rows;
}

module.exports = {
    getCategories,
    getCategoriesByType,
    getTypes
};
