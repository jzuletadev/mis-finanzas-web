// src/services/accounts.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// Crea nueva cuenta para el usuario
async function createAccount({ user_id, account_name, account_type, balance }) {
  if (!account_name || !account_type) {
    throw new Error('account_name y account_type son requeridos');
  }
    const pool = await getPool();
    const accountId = uuidv4();

    await pool.query(
        `INSERT INTO accounts (id, user_id, account_name, account_type, balance) VALUES (?, ?, ?, ?, ?)`,
        [accountId, user_id, account_name, account_type, balance || 0]
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

// Elimina una cuenta por su ID
async function deleteAccount(account_id) {
    const pool = await getPool();
    await pool.query(
        `DELETE FROM accounts WHERE id = ?`,
        [account_id]
    );
}

module.exports = {
    createAccount,
    getAccountsByUserId,
    deleteAccount
};