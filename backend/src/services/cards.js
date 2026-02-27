// src/services/cards.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// Crea nueva tarjeta para el usuario
async function createCard({ user_id, account_id, card_type, card_name, credit_limit, current_balance, expiry_date, cut_off_day }) {
  if (!card_name || !card_type) {
    throw new Error('card_name y card_type son requeridos');
  }

  // Validar formato de vigencia MM/YY
  if (expiry_date && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry_date)) {
    throw new Error('expiry_date debe tener formato MM/YY (ej: 11/35)');
  }

  // Validar día de corte 1-31 (solo crédito)
  if (cut_off_day !== undefined && cut_off_day !== null) {
    const day = parseInt(cut_off_day, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      throw new Error('cut_off_day debe ser un día entre 1 y 31');
    }
  }

    const pool = await getPool();
    const cardId = uuidv4();

    await pool.query(
        `INSERT INTO cards (id, user_id, account_id, card_type, card_name, credit_limit, current_balance, expiry_date, cut_off_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cardId, user_id, account_id, card_type, card_name, credit_limit || 0, current_balance || 0, expiry_date || null, cut_off_day || null]
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

// Actualiza campos editables de una tarjeta
async function updateCard({ id, card_name, credit_limit, expiry_date, cut_off_day }) {
    if (!id) throw new Error('id es requerido');

    // Validar formato de vigencia
    if (expiry_date !== undefined && expiry_date !== null && expiry_date !== '') {
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry_date)) {
        throw new Error('expiry_date debe tener formato MM/YY (ej: 11/35)');
      }
    }

    // Validar día de corte
    if (cut_off_day !== undefined && cut_off_day !== null && cut_off_day !== '') {
      const day = parseInt(cut_off_day, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        throw new Error('cut_off_day debe ser un día entre 1 y 31');
      }
    }

    const fields = [];
    const values = [];
    if (card_name !== undefined) { fields.push('card_name = ?'); values.push(card_name); }
    if (credit_limit !== undefined) { fields.push('credit_limit = ?'); values.push(credit_limit); }
    if (expiry_date !== undefined) { fields.push('expiry_date = ?'); values.push(expiry_date || null); }
    if (cut_off_day !== undefined) { fields.push('cut_off_day = ?'); values.push(cut_off_day || null); }
    if (fields.length === 0) throw new Error('Sin campos para actualizar');
    values.push(id);
    const pool = await getPool();
    await pool.query(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, values);
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
    updateCard,
    deleteCard
};