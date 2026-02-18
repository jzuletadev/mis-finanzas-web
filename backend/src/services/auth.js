// src/services/auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../connections/database');
const { parseDuration } = require('../utils/parseDuration');

const SECRET_KEY     = process.env.JWT_SECRET || 'my_jwt_secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'my_jwt_refresh_secret_key';
const TOKEN_EXP      = process.env.JWT_EXPIRATION || '1h';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRATION || '10h';

function expiryDateFromNowStr(str) {
  const seconds = parseDuration(str);
  return new Date(Date.now() + (seconds * 1000));
}

// Busca usuario por username
async function findUserByUsername(username) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE username = ? LIMIT 1`,
    [username]
  );
    
  return rows[0] || null;
}

// Inserta refresh token en whitelist
async function insertRefreshToken(userId, token, expiresAt) {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );
}

// Obtiene refresh token válido
async function getRefreshToken(token) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

// Elimina refresh token
async function deleteRefreshToken(token) {
  const pool = await getPool();
  await pool.query(`DELETE FROM refresh_tokens WHERE token = ?`, [token]);
}

// Iniciar sesión: valida username/password y emite tokens
async function login({ username, password }) {
  const user = await findUserByUsername(username);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const okPass = await bcrypt.compare(password, user.password);
  if (!okPass) return { ok: false, error: 'Credenciales inválidas' };
  
  // Payload JWT simple
  const payload = {
    sub: user.id,
    user: user.username
  };

  // Tokens
  const accessToken  = jwt.sign(payload,  SECRET_KEY,     { expiresIn: TOKEN_EXP });
  const refreshToken = jwt.sign(payload,  REFRESH_SECRET, { expiresIn: REFRESH_EXP });

  // Persistencia refresh
  const refreshExpDate = expiryDateFromNowStr(REFRESH_EXP);
  await insertRefreshToken(user.id, refreshToken, refreshExpDate);

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username
    },
    tokens: { accessToken, refreshToken }
  };
}

module.exports = {
  login,
  getRefreshToken,
  deleteRefreshToken
};