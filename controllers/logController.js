//opsional
const db = require('../config/db');

exports.getLogAktivitas = (req, res) => {
  const sql = `
    SELECT l.*, u.username
    FROM log_aktivitas l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.timestamp DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil log' });
    res.json(result);
  });
};

exports.logAktivitas = (user_id, aktivitas) => {
  const sql = `INSERT INTO log_aktivitas (user_id, aktivitas) VALUES (?, ?)`;
  db.query(sql, [user_id, aktivitas], (err) => {
    if (err) console.error('Gagal log aktivitas:', err.message);
  });
};
