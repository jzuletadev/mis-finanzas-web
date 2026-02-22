// src/services/transactions.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// 

// Pago de deuda de tarjeta de crédito
async function payCreditCard({ user_id, card_id }) {
    if (!card_id) {
        throw new Error('card_id es requerido');
    }

    const pool = await getPool();
    // Verificar que la tarjeta exista y tenga saldo pendiente
    const [cardRows] = await pool.query(
        `SELECT * FROM cards WHERE id = ? AND user_id = ?`,
        [card_id, user_id]
    );
    if (cardRows.length === 0) {
        throw new Error('Tarjeta no encontrada');
    }

    const card = cardRows[0];
    if (card.current_balance <= 0) {
        throw new Error('No hay saldo pendiente en la tarjeta');
    }

    // verificar que la cuenta asociada tenga suficiente balance para pagar la deuda
    const [accountRows] = await pool.query(
        `SELECT * FROM accounts WHERE id = ? AND user_id = ?`,
        [card.account_id, user_id]
    );

    if (accountRows.length === 0) {
        throw new Error('Cuenta asociada no encontrada');
    }

    const account = accountRows[0];
    if (account.balance < card.current_balance) {
        throw new Error('Saldo insuficiente en la cuenta para pagar la deuda');
    }

    // Actualizar el balance de la cuenta restando el monto de la deuda
    await pool.query(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        [card.current_balance, card.account_id]
    );

    // Actualizar el balance de la tarjeta a 0
    await pool.query(
        `UPDATE cards SET current_balance = 0 WHERE id = ?`,
        [card_id]
    );
}

// Ingreso a la cuenta (INGRESOS - Sueldos, ingresos por ventas, otros ingresos, etc.)
async function income({ user_id, to_account_id, amount }) {
    if (!to_account_id || !amount) {
        throw new Error('to_account_id y amount son requeridos');
    }
    const pool = await getPool();
    // Verificar que la cuenta exista
    const [accountRows] = await pool.query(
        `SELECT * FROM accounts WHERE id = ? AND user_id = ?`,
        [to_account_id, user_id]
    );
    if (accountRows.length === 0) {
        throw new Error('Cuenta no encontrada');
    }

    // Actualizar el balance de la cuenta
    await pool.query(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        [amount, to_account_id]
    );
}

// Gasto de la cuenta (GATOS - Retiros de cajero, transferencias a terceros, otros gastos, etc.)
async function expense({ user_id, from_account_id, amount }) {
    if (!from_account_id || !amount) {
        throw new Error('from_account_id y amount son requeridos');
    }

    const pool = await getPool();
    // Verificar que la cuenta exista y tenga suficiente balance
    const [accountRows] = await pool.query(
        `SELECT * FROM accounts WHERE id = ? AND user_id = ?`,
        [from_account_id, user_id]
    );

    if (accountRows.length === 0) {
        throw new Error('Cuenta no encontrada');
    }

    const account = accountRows[0];
    if (account.balance < amount) {
        throw new Error('Saldo insuficiente en la cuenta');
    }

    // Actualizar el balance de la cuenta
    await pool.query(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        [amount, from_account_id]
    );
}

// Pago con tarjeta de débito
async function payWithDebitCard({ user_id, account_id, amount }) {
    if (!account_id || !amount) {
        throw new Error('account_id y amount son requeridos');
    }

    const pool = await getPool();
    // Verificar que la cuenta exista y tenga suficiente balance
    const [accountRows] = await pool.query(
        `SELECT * FROM accounts WHERE id = ? AND user_id = ?`,
        [account_id, user_id]
    );

    if (accountRows.length === 0) {
        throw new Error('Cuenta no encontrada');
    }
    const account = accountRows[0];
    if (account.balance < amount) {
        throw new Error('Saldo insuficiente');
    }

    // Actualizar el balance de la cuenta
    await pool.query(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        [amount, account_id]
    );
}

// Pago con tarjeta de crédito
async function payWithCreditCard({ user_id, card_id, amount }) {
    if (!card_id || !amount) {
        throw new Error('card_id y amount son requeridos');
    }
    const pool = await getPool();

    // Verificar que la tarjeta exista y tenga suficiente crédito
    const [cardRows] = await pool.query(
        `SELECT * FROM cards WHERE id = ? AND user_id = ?`,
        [card_id, user_id]
    );

    if (cardRows.length === 0) {
        throw new Error('Tarjeta no encontrada');
    }

    const card = cardRows[0];

    if (card.current_balance + amount > card.credit_limit) {
        throw new Error('Límite de crédito excedido');
    }

    // Actualizar el balance de la tarjeta
    await pool.query(
        `UPDATE cards SET current_balance = current_balance + ? WHERE id = ?`,
        [amount, card_id]
    );
}

// Crea una nueva transacción
async function createTransaction({ user_id, account_id, card_id, type_id, category_id, amount, description }) {
    if (!account_id || !amount || !type_id) {
        throw new Error('account_id, amount y type_id son requeridos');
    }
    const pool = await getPool();
    const transactionId = uuidv4();

    // extraer el tipo de transaccion
    const [typeRows] = await pool.query(
        `SELECT name FROM types WHERE id = ?`,
        [type_id]
    );
    if (typeRows.length === 0) {
        throw new Error('Tipo de transacción no encontrado');
    }
    const typeName = typeRows[0].name;

    // extraer la categoría de transacción
    const [categoryRows] = await pool.query(
        `SELECT type FROM categories WHERE id = ?`,
        [category_id]
    );
    if (categoryRows.length === 0) {
        throw new Error('Categoría no encontrada');
    }
    const categoryType = categoryRows[0].type;

    if (categoryType === 'INGRESO') {
        await income({ user_id, to_account_id: account_id, amount });

    } else if (categoryType === 'GASTO') {
        if (typeName === 'COMPRA_TARJETA') {
            // verificar si es de credito o debito
            const [cardRows] = await pool.query(
                `SELECT card_type FROM cards WHERE id = ? AND user_id = ?`,
                [card_id, user_id]
            );

            if (cardRows.length === 0) {
                throw new Error('Tarjeta no encontrada');
            }

            const cardType = cardRows[0].card_type;
            if (cardType === 'DEBITO') {
                await payWithDebitCard({ user_id, account_id, amount });
            } else {
                await payWithCreditCard({ user_id, card_id, amount });
            }
        } else if (typeName === 'PAGO_TARJETA') {
            await payCreditCard({ user_id, account_id, amount });
        } else {
            await expense({ user_id, from_account_id: account_id, amount });
        }
    }

    await pool.query(
        `INSERT INTO transactions (id, user_id, account_id, card_id, type_id, category_id, amount, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [transactionId, user_id, account_id, card_id || null, type_id, category_id || null, amount, description || '']
    );
    return transactionId;
}

// Obtiene todas las transacciones de un usuario
async function getTransactionsByUserId(user_id) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT t.*, ty.name AS type_name, c.name AS category_name, c.type AS category_type
            FROM transactions t
            JOIN types ty ON t.type_id = ty.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ?`,
        [user_id]
    );
    return rows;
}

// Obtiene todas las transacciones de una tarjeta
async function getTransactionsByCardId(card_id) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT t.*, ty.name AS type_name, c.name AS category_name, c.type AS category_type
            FROM transactions t
            JOIN types ty ON t.type_id = ty.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.card_id = ?`,
        [card_id]
    );
    return rows;
}

// Obtiene todas las transacciones de una cuenta
async function getTransactionsByAccountId(account_id) {
    const pool = await getPool();
    const [rows] = await pool.query(
        `SELECT * FROM transactions WHERE account_id = ?`,
        [account_id]
    );
    return rows;
}

module.exports = {
    createTransaction,
    getTransactionsByUserId,
    getTransactionsByCardId,
    getTransactionsByAccountId
};