// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const bearer = req.headers.authorization;

  // Validasi format Bearer Token
  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Token tidak ditemukan atau format salah' });
  }

  const token = bearer.split(' ')[1];

  // Verifikasi token JWT
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('[❌ AUTH] Token tidak valid:', err.message);
      return res.status(401).json({ message: 'Token tidak valid', error: err.message });
    }

    // Validasi jika role pegawai harus punya pegawai_id
    if (decoded.role === 'pegawai' && !decoded.pegawai_id) {
      return res.status(400).json({ message: 'Token tidak berisi pegawai_id' });
    }

    // ✅ Debug jika berhasil
    console.log('[✅ AUTH] Token valid. Data user:', decoded);

    req.user = decoded; // payload disimpan untuk digunakan di route selanjutnya
    next();
  });
};

module.exports = verifyToken;
