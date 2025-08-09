// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const bearer = req.headers.authorization;
  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Token tidak ditemukan atau format salah' });
  }

  const token = bearer.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[❌ AUTH] Token tidak valid:', err.message);
      }
      return res.status(401).json({ message: 'Token tidak valid', error: err.message });
    }

    if (decoded.role === 'pegawai' && !decoded.pegawai_id) {
      return res.status(400).json({ message: 'Token tidak berisi pegawai_id' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[✅ AUTH] Token valid. User:', decoded);
    }

    req.user = decoded;
    next();
  });
};

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!allowedRoles.includes(role)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[🚫 ROLE] Akses ditolak. Dibutuhkan: ${allowedRoles.join(', ')}, tetapi user adalah: ${role}`);
      }
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
};

module.exports = { verifyToken, roleMiddleware };
