// modules/izin/izinModel.js
const db = require('../../config/db');

// ✅ Cek apakah ada izin disetujui pada tanggal tertentu
exports.cekIzinDisetujuiByUserDanTanggal = (pegawaiId, tanggal) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id FROM izin
      WHERE pegawai_id = ? 
        AND status = 'disetujui'
        AND ? BETWEEN tanggal_mulai AND tanggal_selesai
      LIMIT 1
    `;
    db.query(sql, [pegawaiId, tanggal], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.length > 0); // true jika ada izin
    });
  });
};

// ✅ Cek apakah ada izin overlap (pending/disetujui) pada tanggal tertentu
exports.cekIzinOverlap = (pegawaiId, tanggal) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id FROM izin
      WHERE pegawai_id = ?
        AND status IN ('menunggu', 'disetujui')
        AND ? BETWEEN tanggal_mulai AND tanggal_selesai
      LIMIT 1
    `;
    db.query(sql, [pegawaiId, tanggal], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.length > 0); // true jika ada izin overlap
    });
  });
};

// ✅ Ajukan izin baru (status default = menunggu)
exports.ajukanIzin = (pegawaiId, alasan, mulai, selesai) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO izin (pegawai_id, keterangan, tanggal_mulai, tanggal_selesai, status)
      VALUES (?, ?, ?, ?, 'menunggu')
    `;
    db.query(sql, [pegawaiId, alasan, mulai, selesai], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Ambil semua izin milik pegawai tertentu (untuk admin detail pegawai)
exports.getIzinByPegawai = (pegawaiId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM izin WHERE pegawai_id = ? ORDER BY tanggal_mulai DESC`;
    db.query(sql, [pegawaiId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Ambil semua izin yang berstatus 'menunggu' (untuk validasi admin)
exports.getSemuaIzin = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT izin.*, p.nama 
      FROM izin 
      JOIN pegawai p ON izin.pegawai_id = p.id 
      WHERE izin.status = 'menunggu'
      ORDER BY izin.id DESC
    `;
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Ambil riwayat izin pegawai login
exports.getRiwayatIzin = (pegawaiId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') AS tanggal_mulai, 
        DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') AS tanggal_selesai, 
        keterangan, 
        status 
      FROM izin 
      WHERE pegawai_id = ? 
      ORDER BY created_at DESC
    `;
    db.query(sql, [pegawaiId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Ambil semua izin (admin)
exports.getAllIzin = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        izin.id,
        izin.pegawai_id,
        p.nama AS nama,
        DATE_FORMAT(izin.tanggal_mulai, '%Y-%m-%d') AS tanggal_mulai,
        DATE_FORMAT(izin.tanggal_selesai, '%Y-%m-%d') AS tanggal_selesai,
        izin.keterangan,
        izin.status,
        DATE_FORMAT(izin.created_at, '%Y-%m-%d') AS created_at
      FROM izin
      JOIN pegawai p ON p.id = izin.pegawai_id
      ORDER BY izin.id DESC
    `;
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Update status izin (disetujui atau ditolak)
exports.validasiIzin = (id, status) => {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE izin SET status = ? WHERE id = ?`;
    db.query(sql, [status, id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Ambil semua tanggal sudah absen masuk
exports.getTanggalSudahAbsen = (pegawaiId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tgl
      FROM absensi
      WHERE pegawai_id = ? AND jam_masuk IS NOT NULL
    `;
    db.query(sql, [pegawaiId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.tgl));
    });
  });
};

// ✅ Ambil semua tanggal izin disetujui
exports.getTanggalIzinDisetujui = (pegawaiId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') AS start,
             DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') AS end
      FROM izin
      WHERE pegawai_id = ? AND status = 'disetujui'
    `;
    db.query(sql, [pegawaiId], (err, rows) => {
      if (err) return reject(err);
      let result = [];
      rows.forEach(row => {
        let start = new Date(row.start);
        let end = new Date(row.end);
        while (start <= end) {
          result.push(start.toISOString().split('T')[0]);
          start.setDate(start.getDate() + 1);
        }
      });
      resolve(result);
    });
  });
};

// ✅ Ambil daftar tanggal yang dikunci (absen/izin disetujui)
exports.getDisabledDates = (pegawaiId, callback) => {
  const query = `
    SELECT tanggal_mulai AS tanggal
    FROM izin
    WHERE pegawai_id = ? AND status = 'disetujui'
    
    UNION
    
    SELECT tanggal_selesai AS tanggal
    FROM izin
    WHERE pegawai_id = ? AND status = 'disetujui'
    
    UNION
    
    SELECT DATE(tanggal) AS tanggal
    FROM absensi
    WHERE pegawai_id = ?
  `;

  db.query(query, [pegawaiId, pegawaiId, pegawaiId], (err, results) => {
    if (err) return callback(err, null);

    // Pastikan hasil unik & format YYYY-MM-DD
    const disabledDates = [...new Set(results.map(row => {
      const date = new Date(row.tanggal);
      return date.toISOString().split('T')[0];
    }))];

    callback(null, disabledDates);
  });
};
