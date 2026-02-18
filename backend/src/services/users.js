// src/services/users.js
const bcrypt = require('bcrypt');
const { getPool } = require('../connections/database');
const { v4: uuidv4 } = require('uuid');

// Devuelve datos del usuaio
async function getUserInfo(user_id) {
  const pool = await getPool();

  const [rows] = await pool.query(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
    [user_id]
  );

  if (!rows.length) return null;
  const u = rows[0];

  return {
    id: u.id,
    username: u.username
  };
}

// Cambia contraseña
async function changePassword({ user_id, current_password, new_password }) {
  if (String(new_password).length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const pool = await getPool();

  const [[user]] = await pool.query(
    `SELECT id, password FROM users WHERE id = ? LIMIT 1`,
    [user_id]
  );
  if (!user) throw new Error('Usuario no encontrado');

  const valid = await bcrypt.compare(current_password, user.password || '');
  if (!valid) throw new Error('La contraseña actual es incorrecta');

  const newHash = await bcrypt.hash(new_password, 10);
  await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [newHash, user_id]);

  return { ok: true, message: 'Contraseña actualizada' };
}

// Crea nuevo usuario (registro)
async function createUser(userData) {
  try {
    const { username, password } = userData;
    
    if (!username || !password) {
      return { success: false, error: 'username y password son requeridos' };
    }

    const pool = await getPool();
    const userId = uuidv4();
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crear usuario
    const userQuery = 'INSERT INTO users (id, username, password) VALUES (?, ?, ?)';
    await pool.execute(userQuery, [userId, username, hashedPassword]);

    return { success: true, data: { id: userId, message: 'Usuario creado exitosamente' } };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getUserInfo,
  changePassword,
  createUser
};