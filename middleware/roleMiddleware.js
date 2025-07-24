//opsional, untuk batasi admin/pegawai
// middleware/roleMiddleware.js
module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
};
