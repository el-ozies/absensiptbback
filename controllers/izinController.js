const db = require('../config/db'); // koneksi mysql

exports.ajukanIzin = (req, res) => {
  const { tanggal_mulai, tanggal_selesai, keterangan } = req.body;
  const pegawai_id = req.user.pegawai_id;

  if (!pegawai_id) {
    return res.status(400).json({ message: 'Pegawai ID tidak ditemukan di token.' });
  }

  const sql = `
    INSERT INTO izin (pegawai_id, tanggal_mulai, tanggal_selesai, keterangan, status)
    VALUES (?, ?, ?, ?, 'menunggu')
  `;

  db.query(sql, [pegawai_id, tanggal_mulai, tanggal_selesai, keterangan], (err) => {
    if (err) {
      console.error('[❌ ERROR] Gagal insert izin:', err);
      return res.status(500).json({ message: 'Gagal mengajukan izin', error: err });
    }

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

exports.getRiwayatIzin = (req, res) => {
  const pegawai_id = req.user.pegawai_id;
  const sql = `SELECT tanggal_mulai, tanggal_selesai, keterangan, status FROM izin WHERE pegawai_id = ? ORDER BY created_at DESC`;
  db.query(sql, [pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data izin', error: err });
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
