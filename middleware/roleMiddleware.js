// middleware/authMiddleware.js
/**
 * Middleware pembatasan akses berdasarkan role user.
 * @param {string[]} allowedRoles - Contoh: ['admin', 'pegawai']
 */
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

module.exports = roleMiddleware;
