// src/services/cards.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// Crea nueva tarjeta para el usuario
async function createCard({ user_id, account_id, card_type, card_name, credit_limit, current_balance, due_date }) {
  if (!card_name || !card_type) {
    throw new Error('card_name y card_type son requeridos');
  }
    const pool = await getPool();
    const cardId = uuidv4();

    await pool.query(
        `INSERT INTO cards (id, user_id, account_id, card_type, card_name, credit_limit, current_balance, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cardId, user_id, account_id, card_type, card_name, credit_limit || 0, current_balance || 0, due_date]
    );

    return cardId;
}

// Obtiene todas las tarjetas de un usuario
async function getCardsByUserId(user_id) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT * FROM cards WHERE user_id = ?`,
        [user_id]
    );
    return rows;
}

// Elimina una tarjeta por su ID
async function deleteCard(card_id) {
    const pool = await getPool();
    await pool.query(
        `DELETE FROM cards WHERE id = ?`,
        [card_id]
    );
}

module.exports = {
    createCard,
    getCardsByUserId,
    deleteCard
};