const db = require('../config/db');
const geolib = require('geolib');

// Lokasi kantor PTB Manyar
const kantorLat = -7.120436;
const kantorLng = 112.600460;
const radiusMeter = 2000;

// =====================
// ABSEN MASUK
// =====================
exports.absenMasuk = (req, res) => {
  let { latitude, longitude } = req.body;
  const user = req.user;

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);

  const distance = geolib.getDistance(
    { latitude, longitude },
    { latitude: kantorLat, longitude: kantorLng }
  );

  if (distance > radiusMeter) {
    return res.status(403).json({
      message: 'Diluar radius lokasi kantor',
      distance
    });
  }

  const lokasi = `${latitude},${longitude}`;
  const sqlCek = `SELECT * FROM absensi WHERE pegawai_id = ? AND tanggal = CURDATE()`;

  db.query(sqlCek, [user.pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error cek absensi', error: err });

    if (result.length > 0) {
      if (result[0].jam_keluar) {
        return res.status(409).json({
          message: 'Sudah absen masuk dan keluar hari ini',
          type: 'sudah_keluar',
          absen: result[0]
        });
      } else {
        return res.status(409).json({
          message: 'Sudah absen masuk hari ini',
          type: 'sudah_masuk',
          absen: result[0]
        });
      }
    }

    const keterlambatan = hitungKeterlambatan();
    const status = 'Hadir'; // semua dianggap hadir meskipun terlambat


    const sqlInsert = `
      INSERT INTO absensi (pegawai_id, tanggal, jam_masuk, lokasi_masuk, status, keterlambatan)
      VALUES (?, CURDATE(), CURTIME(), ?, ?, ?)
    `;
    db.query(sqlInsert, [user.pegawai_id, lokasi, status, keterlambatan], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal absen masuk', error: err2 });

      res.json({ message: 'Absensi masuk berhasil', type: 'masuk' });
    });
  });
};

// =====================
// ABSEN KELUAR
// =====================
exports.absenKeluar = (req, res) => {
  let { latitude, longitude } = req.body;
  const user = req.user;

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  const lokasi = `${latitude},${longitude}`;

  const sqlCek = `SELECT * FROM absensi WHERE pegawai_id = ? AND tanggal = CURDATE()`;

  db.query(sqlCek, [user.pegawai_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error cek absensi', error: err });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Belum absen masuk hari ini' });
    }

    if (result[0].jam_keluar) {
      return res.status(409).json({
        message: 'Sudah absen keluar hari ini',
        type: 'sudah_keluar',
        absen: result[0]
      });
    }

    const sqlUpdate = `
      UPDATE absensi 
      SET jam_keluar = CURTIME(), lokasi_keluar = ? 
      WHERE pegawai_id = ? AND tanggal = CURDATE()
    `;
    db.query(sqlUpdate, [lokasi, user.pegawai_id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal absen keluar', error: err2 });

      res.json({ message: 'Absensi keluar berhasil', type: 'keluar' });
    });
  });
};

// =====================
// RIWAYAT PEGAWAI LOGIN
// =====================
exports.getRiwayat = (req, res) => {
  const pegawai_id = req.user.pegawai_id;
  if (!pegawai_id) {
    return res.status(400).json({ message: 'pegawai_id tidak ditemukan di token' });
  }

  const sql = `SELECT * FROM absensi WHERE pegawai_id = ? ORDER BY tanggal DESC`;
  db.query(sql, [pegawai_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil riwayat', error: err });
    res.json(results);
  });
};

// =====================
// REKAP SEMUA ABSEN
// =====================
exports.getRekap = (req, res) => {
  const sql = `
    SELECT a.*, p.nama, p.nip
    FROM absensi a
    JOIN pegawai p ON a.pegawai_id = p.id
    ORDER BY a.tanggal DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil rekap', error: err });
    res.json(result);
  });
};

// =====================
// DASHBOARD STATISTIK ADMIN
// =====================
exports.getDashboardStatistik = (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_hadir,
      SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) as terlambat,
      SUM(CASE WHEN status = 'Tidak Hadir' THEN 1 ELSE 0 END) as alpha
    FROM absensi
    WHERE MONTH(tanggal) = MONTH(CURRENT_DATE())
      AND YEAR(tanggal) = YEAR(CURRENT_DATE())
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });

    const stat = {
      hadir: result[0].total_hadir,
      terlambat: result[0].terlambat,
      alpha: result[0].alpha,
    };

    res.json(stat);
  });
};

// =====================
// CHART GRAFIK HARIAN
// =====================
exports.getChartKehadiran = (req, res) => {
  const sql = `
    SELECT 
      tanggal,
      COUNT(*) AS jumlah_hadir,
      ROUND(SUM(CASE 
          WHEN status = 'Hadir' OR status = 'Terlambat' THEN 1
          ELSE 0 END) * 100 / COUNT(*), 2
      ) AS persentase
    FROM absensi
    WHERE MONTH(tanggal) = MONTH(CURRENT_DATE())
      AND YEAR(tanggal) = YEAR(CURRENT_DATE())
    GROUP BY tanggal
    ORDER BY tanggal ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data grafik', error: err });

    const chartData = result.map((row) => ({
      tanggal: row.tanggal,
      jumlah: row.jumlah_hadir,
      persentase: row.persentase,
    }));

    res.json(chartData);
  });
};

// =====================
// STATISTIK PEGAWAI LOGIN
// =====================
exports.getStatistikPegawai = (req, res) => {
  const pegawai_id = req.user.pegawai_id;
  if (!pegawai_id) return res.status(400).json({ message: 'pegawai_id tidak ditemukan' });

  const sql = `
    SELECT 
      SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) AS hadir,
      SUM(CASE WHEN status = 'Tidak Hadir' THEN 1 ELSE 0 END) AS alpha,
      SUM(CAST(keterlambatan AS UNSIGNED)) AS keterlambatan
    FROM absensi
    WHERE pegawai_id = ?
      AND MONTH(tanggal) = MONTH(CURDATE())
      AND YEAR(tanggal) = YEAR(CURDATE())
  `;

  db.query(sql, [pegawai_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil statistik', error: err });

    const { hadir = 0, alpha = 0, keterlambatan = 0 } = results[0] || {};
    const total = hadir + alpha;
    const persen = total ? Math.round((hadir / total) * 100) : 0;

    res.json({ hadir, alpha, keterlambatan, persen });
  });
};

// =====================
// Hitung keterlambatan
// =====================
function hitungKeterlambatan() {
  const now = new Date();
  const jamMasuk = new Date(now);
  jamMasuk.setHours(8, 0, 0, 0); // Masuk jam 8

  const selisihMs = now - jamMasuk;
  const selisihMenit = Math.floor(selisihMs / 60000);
  return selisihMenit > 0 ? selisihMenit : 0;
}
