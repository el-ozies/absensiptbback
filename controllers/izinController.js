const db = require('../config/db'); // koneksi mysql

// ✅ Ajukan izin oleh pegawai
exports.ajukanIzin = (req, res) => {
  const { tanggal_mulai, tanggal_selesai, keterangan } = req.body;
  const pegawai_id = req.user?.pegawai_id;

  if (!pegawai_id) return res.status(400).json({ message: 'Pegawai ID tidak ditemukan di token.' });
  if (!tanggal_mulai || !tanggal_selesai || !keterangan) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
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

// ✅ Ambil izin berdasarkan ID pegawai (bisa dipakai admin/detail pegawai)
exports.getIzinByPegawai = (req, res) => {
  const { pegawai_id } = req.params;
  const sql = `SELECT * FROM izin WHERE pegawai_id = ? ORDER BY id DESC`;

  db.query(sql, [pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data izin', error: err });
    res.json(result);
  });
};

exports.getSemuaIzin = (req, res) => {
  const sql = `
    SELECT izin.*, pegawai.nama 
    FROM izin 
    JOIN pegawai ON izin.pegawai_id = pegawai.id 
    WHERE izin.status = 'menunggu'
    ORDER BY izin.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal memuat data izin', error: err });
    res.json(result);
  });
};

// ✅ Ambil riwayat izin untuk pegawai yang sedang login
exports.getRiwayatIzin = (req, res) => {
  const pegawai_id = req.user?.pegawai_id;

  if (!pegawai_id) return res.status(400).json({ message: 'Pegawai ID tidak ditemukan.' });

  const sql = `
    SELECT 
      tanggal_mulai, 
      tanggal_selesai, 
      keterangan, 
      status 
    FROM izin 
    WHERE pegawai_id = ? 
    ORDER BY created_at DESC
  `;
  db.query(sql, [pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil riwayat izin', error: err });
    res.json(result);
  });
};

// ✅ Ambil semua data izin untuk admin (dengan join nama pegawai)
exports.getAllIzin = (req, res) => {
  const sql = `
    SELECT 
      izin.id,
      izin.pegawai_id,
      p.nama AS nama,
      izin.tanggal_mulai,
      izin.tanggal_selesai,
      izin.keterangan,
      izin.status,
      izin.created_at
    FROM izin
    JOIN pegawai p ON p.id = izin.pegawai_id
    ORDER BY izin.id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('[❌ ERROR] Gagal mengambil data izin:', err);
      return res.status(500).json({ message: 'Gagal mengambil data izin', error: err });
    }
    res.json(result);
  });
};

// ✅ Validasi izin oleh admin (ubah status jadi disetujui/ditolak)
exports.validasiIzin = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid. Hanya boleh "disetujui" atau "ditolak".' });
  }

  const sql = `UPDATE izin SET status = ? WHERE id = ?`;
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal validasi izin', error: err });
    res.json({ message: 'Status izin berhasil diperbarui' });
  });
};
