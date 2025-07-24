const db = require('../config/db'); // koneksi mysql

exports.ajukanIzin = (req, res) => {
  const { pegawai_id, tanggal_mulai, tanggal_selesai, keterangan } = req.body;
  const sql = `INSERT INTO izin (pegawai_id, tanggal_mulai, tanggal_selesai, keterangan) VALUES (?, ?, ?, ?)`;
  db.query(sql, [pegawai_id, tanggal_mulai, tanggal_selesai, keterangan], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Izin berhasil diajukan' });
  });
};

exports.getIzinByPegawai = (req, res) => {
  const { pegawai_id } = req.params;
  db.query(`SELECT * FROM izin WHERE pegawai_id = ? ORDER BY id DESC`, [pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
};

exports.getAllIzin = (req, res) => {
  db.query(`SELECT izin.*, p.nama FROM izin JOIN pegawai p ON p.id = izin.pegawai_id ORDER BY izin.id DESC`, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
};

exports.validasiIzin = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.query(`UPDATE izin SET status = ? WHERE id = ?`, [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Status izin diperbarui' });
  });
};
