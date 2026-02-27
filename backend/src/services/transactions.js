// src/services/transactions.js
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// 

// Pago de deuda de tarjeta de crédito (total o parcial)
async function payCreditCard({ user_id, card_id, amount }) {
    if (!card_id) {
        throw new Error('card_id es requerido');
    }

    const pool = await getPool();
    // Verificar que la tarjeta exista, sea de crédito y tenga saldo pendiente
    const [cardRows] = await pool.query(
        `SELECT * FROM cards WHERE id = ? AND user_id = ?`,
        [card_id, user_id]
    );
    if (cardRows.length === 0) {
        throw new Error('Tarjeta no encontrada');
    }

    const card = cardRows[0];

    if (card.card_type !== 'CREDITO') {
        throw new Error('Solo se pueden pagar tarjetas de crédito');
    }

    if (card.current_balance <= 0) {
        throw new Error('No hay saldo pendiente en la tarjeta');
    }

    // Determinar el monto a pagar: si se provee amount se hace pago parcial, si no, pago total
    const amountToPay = amount !== undefined && amount !== null
        ? parseFloat(amount)
        : card.current_balance;

    if (amountToPay <= 0) {
        throw new Error('El monto a pagar debe ser mayor a 0');
    }
    if (amountToPay > card.current_balance) {
        throw new Error('El monto supera el saldo pendiente de la tarjeta');
    }

    // verificar que la cuenta asociada exista y tenga suficiente balance
    const [accountRows] = await pool.query(
        `SELECT * FROM accounts WHERE id = ? AND user_id = ?`,
        [card.account_id, user_id]
    );

    if (accountRows.length === 0) {
        throw new Error('Cuenta asociada no encontrada');
    }

    const account = accountRows[0];
    if (account.balance < amountToPay) {
        throw new Error('Saldo insuficiente en la cuenta para pagar la deuda');
    }

    // Actualizar el balance de la cuenta restando el monto pagado
    await pool.query(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        [amountToPay, card.account_id]
    );

    // Reducir el balance de la tarjeta en el monto pagado
    await pool.query(
        `UPDATE cards SET current_balance = current_balance - ? WHERE id = ?`,
        [amountToPay, card_id]
    );

    return { amountPaid: amountToPay, linkedAccountId: card.account_id };
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
            // card_id es obligatorio para compras con tarjeta
            if (!card_id) {
                throw new Error('card_id es requerido para compras con tarjeta');
            }

            // Obtener la tarjeta con su cuenta asociada
            const [cardRows] = await pool.query(
                `SELECT card_type, account_id FROM cards WHERE id = ? AND user_id = ?`,
                [card_id, user_id]
            );

            if (cardRows.length === 0) {
                throw new Error('Tarjeta no encontrada');
            }

            const cardData = cardRows[0];

            // Validar que la tarjeta pertenezca a la cuenta/banco seleccionado
            if (cardData.account_id !== account_id) {
                throw new Error('La tarjeta no pertenece a la cuenta seleccionada');
            }

            if (cardData.card_type === 'DEBITO') {
                // Para débito se descuenta de la cuenta vinculada a la tarjeta
                await payWithDebitCard({ user_id, account_id: cardData.account_id, amount });
            } else {
                // Para crédito se incrementa el saldo de la tarjeta
                await payWithCreditCard({ user_id, card_id, amount });
            }

        } else if (typeName === 'PAGO_TARJETA') {
            // card_id es obligatorio para pago de tarjeta
            if (!card_id) {
                throw new Error('card_id es requerido para pago de tarjeta');
            }

            // Obtener la cuenta asociada a la tarjeta para validar que coincida
            const [cardForPayment] = await pool.query(
                `SELECT account_id, card_type FROM cards WHERE id = ? AND user_id = ?`,
                [card_id, user_id]
            );
            if (cardForPayment.length === 0) {
                throw new Error('Tarjeta no encontrada');
            }

            // La cuenta enviada debe coincidir con la cuenta vinculada a la tarjeta de crédito
            if (cardForPayment[0].account_id !== account_id) {
                throw new Error('La cuenta seleccionada no corresponde a la cuenta asociada a la tarjeta');
            }

            // BUG FIX: se pasa card_id (antes se pasaba account_id por error)
            const payResult = await payCreditCard({ user_id, card_id, amount });
            // Usar el monto real pagado para registrar la transacción correctamente
            amount = payResult.amountPaid;

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