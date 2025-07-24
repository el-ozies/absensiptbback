const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const bearer = req.headers.authorization;
  if (!bearer) return res.status(403).json({ message: 'Token tidak ditemukan' });

  const token = bearer.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token tidak valid' });

    console.log('[✅ AUTH] Token decoded:', decoded); // 👉 DEBUG DI SINI
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
