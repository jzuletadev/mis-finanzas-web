// src/middleware/cookieJwtAuth.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'my_jwt_secret_key';

module.exports = function cookieJwtAuth(req, res, next) {
  const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null);

  if (!token) return res.status(403).json({ message: 'No autorizado' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};