// src/services/accounts.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

const ACCOUNT_ARTS = ['mint', 'lavender', 'peach'];

// Crea nueva cuenta para el usuario
async function createAccount({ user_id, account_name, account_type, balance, account_art }) {
  if (!account_name || !account_type) {
    throw new Error('account_name y account_type son requeridos');
  }

  if (account_art !== undefined && account_art !== null && !ACCOUNT_ARTS.includes(account_art)) {
    throw new Error(`account_art debe ser uno de: ${ACCOUNT_ARTS.join(', ')}`);
  }

    const pool = await getPool();
    const accountId = uuidv4();

    await pool.query(
        `INSERT INTO accounts (id, user_id, account_name, account_type, balance, account_art) VALUES (?, ?, ?, ?, ?, ?)`,
        [accountId, user_id, account_name, account_type, balance || 0, account_art || ACCOUNT_ARTS[0]]
    );

    return accountId;

}

// Obtiene todas las cuentas de un usuario
async function getAccountsByUserId(user_id) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT * FROM accounts WHERE user_id = ?`,
        [user_id]
    );
    return rows;
}

// Actualiza nombre, tipo y arte de una cuenta
async function updateAccount({ id, account_name, account_type, account_art }) {
    if (!id) throw new Error('id es requerido');

    if (account_art !== undefined && account_art !== null && !ACCOUNT_ARTS.includes(account_art)) {
      throw new Error(`account_art debe ser uno de: ${ACCOUNT_ARTS.join(', ')}`);
    }

    const fields = [];
    const values = [];
    if (account_name !== undefined) { fields.push('account_name = ?'); values.push(account_name); }
    if (account_type !== undefined) { fields.push('account_type = ?'); values.push(account_type); }
    if (account_art !== undefined) { fields.push('account_art = ?'); values.push(account_art); }
    if (fields.length === 0) throw new Error('Sin campos para actualizar');
    values.push(id);
    const pool = await getPool();
    await pool.query(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, values);
}

// Elimina una cuenta por su ID, junto con tarjetas, transacciones, pagos y transferencias asociadas
async function deleteAccount(account_id) {
    const pool = await getPool();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [cardRows] = await conn.query(`SELECT id FROM cards WHERE account_id = ?`, [account_id]);
        const cardIds = cardRows.map(r => r.id);
        if (cardIds.length > 0) {
            await conn.query(`DELETE FROM transactions WHERE card_id IN (?)`, [cardIds]);
            await conn.query(`DELETE FROM card_payments WHERE card_id IN (?)`, [cardIds]);
            await conn.query(`DELETE FROM cards WHERE id IN (?)`, [cardIds]);
        }

        await conn.query(`DELETE FROM transactions WHERE account_id = ?`, [account_id]);
        await conn.query(`DELETE FROM card_payments WHERE account_id = ?`, [account_id]);
        await conn.query(`DELETE FROM account_transfers WHERE from_account_id = ? OR to_account_id = ?`, [account_id, account_id]);
        await conn.query(`DELETE FROM accounts WHERE id = ?`, [account_id]);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    createAccount,
    getAccountsByUserId,
    updateAccount,
    deleteAccount
};