// controllers/absensiController.js
const db = require('../config/db');
const geolib = require('geolib');
const { generateTanggalKerja, getJamKerja } = require('../utils/dateUtils');
const moment = require('moment');



// Lokasi kantor PTB Manyar
const kantorLat = -7.120436;
const kantorLng = 112.600460;
const radiusMeter = 100000;

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
    return res.status(403).json({ message: 'Diluar radius lokasi kantor', distance });
  }

  const today = moment();
  const hari = today.day(); // 0 = Minggu, 6 = Sabtu
  const tanggalHariIni = today.format('YYYY-MM-DD');

  if (hari === 0) {
    return res.status(403).json({ message: 'Hari Minggu adalah hari libur' });
  }

  const lokasi = `${latitude},${longitude}`;
  const sqlCek = `SELECT * FROM absensi WHERE pegawai_id = ? AND tanggal = ?`;

  db.query(sqlCek, [user.pegawai_id, tanggalHariIni], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error cek absensi', error: err });

    if (result.length > 0) {
      const data = result[0];
      const status = data.jam_keluar ? 'Hadir' : 'Belum Pulang';
      const persen = data.jam_keluar ? '100%' : '0%';
      const keterlambatan = data.keterlambatan !== null ? formatKeterlambatan(data.keterlambatan) : '-';
      const tanggalFormatted = today.format('DD MMMM YYYY');

      return res.status(409).json({
        message: data.jam_keluar
          ? 'Sudah absen masuk dan keluar hari ini'
          : 'Sudah absen masuk hari ini',
        type: data.jam_keluar ? 'sudah_keluar' : 'sudah_masuk',
        absen: {
          ...data,
          tanggal: tanggalFormatted,
          keterlambatan,
          status,
          persen
        }
      });
    }

    const keterlambatan = hitungKeterlambatan(today);
    const status = 'Hadir';

    const sqlInsert = `
      INSERT INTO absensi (pegawai_id, tanggal, jam_masuk, lokasi_masuk, status, keterlambatan)
      VALUES (?, ?, CURTIME(), ?, ?, ?)
    `;
    db.query(sqlInsert, [user.pegawai_id, tanggalHariIni, lokasi, status, keterlambatan], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal absen masuk', error: err2 });
      res.json({ message: 'Absensi masuk berhasil', type: 'masuk' });
    });
  });
};

// ====================
// FUNGSI BANTUAN
// ====================
function hitungKeterlambatan(now) {
  const hari = now.day(); // 0 = Minggu, 6 = Sabtu
  const jamKerja = getJamKerja(hari); // Ambil jam kerja dari dateUtils

  const jamMasukWajib = moment(now.format('YYYY-MM-DD') + ' 08:00:00'); // Masuk wajib jam 08:00
  const selisihMenit = now.diff(jamMasukWajib, 'minutes');

  return selisihMenit > 0 ? selisihMenit : 0;
}

function formatKeterlambatan(menit) {
  const jam = Math.floor(menit / 60);
  const sisaMenit = menit % 60;
  if (jam > 0 && sisaMenit > 0) return `${jam} jam ${sisaMenit} menit`;
  if (jam > 0) return `${jam} jam`;
  return `${sisaMenit} menit`;
}

// =====================
// ABSEN KELUAR
// =====================

exports.absenKeluar = (req, res) => {
  let { latitude, longitude } = req.body;
  const user = req.user;

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);

  const distance = geolib.getDistance(
    { latitude, longitude },
    { latitude: kantorLat, longitude: kantorLng }
  );

  if (distance > radiusMeter) {
    return res.status(403).json({ message: 'Diluar radius lokasi kantor', distance });
  }

  const lokasi = `${latitude},${longitude}`;
  const today = moment();
  const hari = today.day(); // 0 = Minggu
  const tanggalHariIni = today.format('YYYY-MM-DD');

  if (hari === 0) {
    return res.status(403).json({ message: 'Hari Minggu adalah hari libur' });
  }

  const sqlCek = `SELECT * FROM absensi WHERE pegawai_id = ? AND tanggal = ?`;

  db.query(sqlCek, [user.pegawai_id, tanggalHariIni], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error cek absensi', error: err });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Belum absen masuk hari ini' });
    }

    const data = result[0];

    if (data.jam_keluar) {
      // Sudah absen keluar → kembalikan data yang diformat
      const status = 'Hadir';
      const persen = '100%';
      const keterlambatan = data.keterlambatan !== null ? formatKeterlambatan(data.keterlambatan) : '-';
      const tanggalFormatted = today.format('DD MMMM YYYY');

      return res.status(409).json({
        message: 'Sudah absen keluar hari ini',
        type: 'sudah_keluar',
        absen: {
          ...data,
          tanggal: tanggalFormatted,
          keterlambatan,
          status,
          persen
        }
      });
    }

    const sqlUpdate = `
      UPDATE absensi 
      SET jam_keluar = CURTIME(), lokasi_keluar = ? 
      WHERE pegawai_id = ? AND tanggal = ?
    `;
    db.query(sqlUpdate, [lokasi, user.pegawai_id, tanggalHariIni], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal absen keluar', error: err2 });

      // Ambil kembali data terbaru setelah update
      db.query(sqlCek, [user.pegawai_id, tanggalHariIni], (err3, result2) => {
        if (err3) return res.status(500).json({ message: 'Gagal ambil ulang data', error: err3 });

        const updated = result2[0];
        const status = 'Hadir';
        const persen = '100%';
        const keterlambatan = updated.keterlambatan !== null ? formatKeterlambatan(updated.keterlambatan) : '-';
        const tanggalFormatted = today.format('DD MMMM YYYY');

        res.json({
          message: 'Absensi keluar berhasil',
          type: 'keluar',
          absen: {
            ...updated,
            tanggal: tanggalFormatted,
            keterlambatan,
            status,
            persen
          }
        });
      });
    });
  });
};

// ====================
// FUNGSI BANTUAN
// ====================
function formatKeterlambatan(menit) {
  const jam = Math.floor(menit / 60);
  const sisaMenit = menit % 60;
  if (jam > 0 && sisaMenit > 0) return `${jam} jam ${sisaMenit} menit`;
  if (jam > 0) return `${jam} jam`;
  return `${sisaMenit} menit`;
}

// =====================
// RIWAYAT
// =====================

exports.getRiwayatLengkap = (req, res) => {
  const pegawai_id = req.user.pegawai_id;
  const bulan = req.query.bulan ? parseInt(req.query.bulan) : moment().month();
  const tahun = req.query.tahun ? parseInt(req.query.tahun) : moment().year();

  const sqlAktif = `SELECT tanggal_aktif FROM pegawai WHERE id = ?`;

  db.query(sqlAktif, [pegawai_id], (errAktif, aktifData) => {
  if (errAktif) return res.status(500).json({ message: 'Gagal ambil data pegawai', error: errAktif });

  if (!aktifData || aktifData.length === 0) {
    return res.status(404).json({ message: 'Data pegawai tidak ditemukan' });
  }

  const tanggalAktif = moment(aktifData[0].tanggal_aktif).startOf('day');
    const semuaTanggal = generateTanggalKerja(bulan, tahun);
    const allDates = semuaTanggal.filter(tgl => moment(tgl).isSameOrAfter(tanggalAktif));

    const sqlAbsensi = `SELECT * FROM absensi WHERE pegawai_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?`;
    const sqlIzin = `SELECT tanggal_mulai, tanggal_selesai FROM izin WHERE pegawai_id = ? AND status = 'Disetujui'`;

    db.query(sqlAbsensi, [pegawai_id, bulan + 1, tahun], (err, absensiData) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil absensi', error: err });

      db.query(sqlIzin, [pegawai_id], (err2, izinData) => {
        if (err2) return res.status(500).json({ message: 'Gagal ambil izin', error: err2 });

        const riwayatMap = {};
        const tanggalIzin = new Set();

        izinData.forEach(row => {
          const mulai = moment(row.tanggal_mulai);
          const selesai = moment(row.tanggal_selesai);
          while (mulai.isSameOrBefore(selesai)) {
            tanggalIzin.add(mulai.format('YYYY-MM-DD'));
            mulai.add(1, 'day');
          }
        });

        absensiData.forEach(row => {
          const tgl = moment(row.tanggal).format('YYYY-MM-DD');
          riwayatMap[tgl] = row;
        });

        const now = moment();

const hasil = allDates.map(tgl => {
  const date = moment(tgl);
  const hari = date.day(); // 0=minggu, 1=senin, ..., 6=sabtu
  const jamKerja = getJamKerja(hari);
  const jamPulangWajib = moment(tgl + ' 08:00:00').add(jamKerja, 'hours');
  const now = moment();

  const tanggalFormatted = date.format('DD MMMM YYYY');
  const jamWajibFormatted = `${jamKerja} jam`;

  if (riwayatMap[tgl]) {
    const row = riwayatMap[tgl];
    let status = 'Alpha';
    let persen = 0;

    if (row.jam_masuk && row.jam_keluar) {
      status = 'Hadir';
      persen = 100;
    } else if (row.jam_masuk && !row.jam_keluar) {
      status = now.isAfter(jamPulangWajib) ? 'Hadir' : 'Belum Pulang';
      persen = now.isAfter(jamPulangWajib) ? 0 : 50;
    }

    return {
      tanggal: tanggalFormatted,
      jam_wajib: jamWajibFormatted,
      jam_masuk: row.jam_masuk,
      jam_keluar: row.jam_keluar,
      keterlambatan: row.keterlambatan || 0,
      status,
      persen
    };
  }

  if (tanggalIzin.has(tgl)) {
    return {
      tanggal: tanggalFormatted,
      jam_wajib: jamWajibFormatted,
      jam_masuk: null,
      jam_keluar: null,
      keterlambatan: 0,
      status: 'Izin',
      persen: 50
    };
  }

  return {
    tanggal: tanggalFormatted,
    jam_wajib: jamWajibFormatted,
    jam_masuk: null,
    jam_keluar: null,
    keterlambatan: 0,
    status: 'Alpha',
    persen: 0
  };
});


        res.json(hasil.reverse());
      });
    });
  });
};




// =====================
// STATISTIK PEGAWAI
// =====================
exports.getStatistikPegawai = (req, res) => {
  const pegawai_id = req.user.pegawai_id;
  const bulan = req.query.bulan ? parseInt(req.query.bulan) : moment().month();
  const tahun = req.query.tahun ? parseInt(req.query.tahun) : moment().year();

  const tanggalKerja = generateTanggalKerja(bulan, tahun);

  const sqlAbsensi = `
    SELECT * FROM absensi 
    WHERE pegawai_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?
  `;
  const sqlIzin = `
    SELECT tanggal_mulai, tanggal_selesai FROM izin 
    WHERE pegawai_id = ? AND status = 'Disetujui'
  `;

  db.query(sqlAbsensi, [pegawai_id, bulan + 1, tahun], (err, absensiData) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil absensi', error: err });

    db.query(sqlIzin, [pegawai_id], (err2, izinData) => {
      if (err2) return res.status(500).json({ message: 'Gagal ambil izin', error: err2 });

      const riwayatMap = {};
      const izinSet = new Set();

      // Isi izin tanggal satu per satu ke dalam Set
      izinData.forEach(row => {
        const mulai = moment(row.tanggal_mulai);
        const selesai = moment(row.tanggal_selesai);
        while (mulai.isSameOrBefore(selesai)) {
          izinSet.add(mulai.format('YYYY-MM-DD'));
          mulai.add(1, 'day');
        }
      });

      // Isi data absensi ke Map berdasarkan tanggal
      absensiData.forEach(row => {
        const tgl = moment(row.tanggal).format('YYYY-MM-DD');
        riwayatMap[tgl] = row;
      });

      // Hitung statistik
      let hadir = 0;
      let alpha = 0;
      let izin = 0;
      let totalKeterlambatan = 0;
      let totalPersen = 0;

      tanggalKerja.forEach(tgl => {
        const date = moment(tgl);
        const hari = date.day(); // 0 = Minggu, 6 = Sabtu
        const jamKerja = getJamKerja(hari);
        const jamPulangWajib = moment(tgl + ' 08:00:00').add(jamKerja, 'hours');
        const now = moment();

        let persen = 0;

        if (riwayatMap[tgl]) {
          const row = riwayatMap[tgl];
          totalKeterlambatan += parseInt(row.keterlambatan || 0);

          if (row.jam_masuk && row.jam_keluar) {
            persen = 100;
            hadir++;
          } else if (row.jam_masuk && !row.jam_keluar) {
            if (now.isAfter(jamPulangWajib)) {
              persen = 0;
              hadir++;
            } else {
              persen = 50;
            }
          } else {
            alpha++;
          }
        } else if (izinSet.has(tgl)) {
          persen = 50;
          izin++;
        } else {
          alpha++;
        }

        totalPersen += persen;
      });

      const jumlahHari = tanggalKerja.length;
      const rataRataPersen = jumlahHari > 0 ? Math.round(totalPersen / jumlahHari) : 0;

      res.json({
        hadir,
        alpha,
        izin,
        keterlambatan: totalKeterlambatan,
        keterlambatan_formatted: formatKeterlambatan(totalKeterlambatan),
        persen: rataRataPersen
      });
    });
  });
};



// =====================
// REKAP (Admin)
// =====================
exports.getRekap = (req, res) => {
  const { tanggal } = req.query;
  if (!tanggal) return res.status(400).json({ message: 'Tanggal wajib diisi' });

  const sqlPegawai = 'SELECT id, nama, nip, tanggal_aktif FROM pegawai';
  db.query(sqlPegawai, (errPegawai, pegawaiRows) => {
    if (errPegawai) return res.status(500).json({ message: 'Gagal mengambil data pegawai', error: errPegawai });

    const aktifTanggal = moment(tanggal);

    // Filter pegawai yang belum aktif pada tanggal tersebut
    const pegawaiAktif = pegawaiRows.filter(p =>
      !p.tanggal_aktif || moment(p.tanggal_aktif).isSameOrBefore(aktifTanggal, 'day')
    );

    const sqlAbsensi = `SELECT * FROM absensi WHERE tanggal = ?`;
    db.query(sqlAbsensi, [tanggal], (errAbsen, absensiRows) => {
      if (errAbsen) return res.status(500).json({ message: 'Gagal mengambil data absensi', error: errAbsen });

      const sqlIzin = `
        SELECT * FROM izin 
        WHERE status = 'Disetujui' 
          AND tanggal_mulai <= ? 
          AND tanggal_selesai >= ?
      `;
      db.query(sqlIzin, [tanggal, tanggal], (errIzin, izinRows) => {
        if (errIzin) return res.status(500).json({ message: 'Gagal mengambil data izin', error: errIzin });

        const dataRekap = [];
        const izinMap = new Map();
        izinRows.forEach(i => izinMap.set(i.pegawai_id, true));

        const absenMap = new Map();
        absensiRows.forEach(row => absenMap.set(row.pegawai_id, row));

        const today = moment(tanggal);
        const hari = today.day();
        const jamKerja = getJamKerja(hari);
        const jamPulangWajib = moment(`${tanggal} 08:00:00`).add(jamKerja, 'hours');

        pegawaiAktif.forEach(pegawai => {
          const row = absenMap.get(pegawai.id);
          const isIzin = izinMap.has(pegawai.id);

          let status = 'Alpha';
          let jam_masuk = '-';
          let jam_keluar = '-';
          let kehadiran = '0%';

          if (row) {
            jam_masuk = row.jam_masuk || '-';
            jam_keluar = row.jam_keluar || '-';

            if (row.jam_masuk && row.jam_keluar) {
              status = 'Hadir';
              kehadiran = '100%';
            } else if (row.jam_masuk && !row.jam_keluar) {
              status = 'Hadir';
              kehadiran = '0%';
            }
          } else if (isIzin) {
            status = 'Izin';
            kehadiran = '50%';
          }

          dataRekap.push({
            tanggal: today.format('DD MMMM YYYY'),
            nama: pegawai.nama,
            nip: pegawai.nip,
            jam_masuk,
            jam_keluar,
            status,
            kehadiran
          });
        });

        res.json(dataRekap);
      });
    });
  });
};





// =====================
// CHART KEHADIRAN
// =====================
exports.getChartKehadiran = (req, res) => {
  const bulan = parseInt(req.query.bulan);
  const tahun = parseInt(req.query.tahun);

  if (!bulan || !tahun) {
    return res.status(400).json({ message: 'Parameter bulan dan tahun wajib diisi' });
  }

  const sql = `
    SELECT 
      tanggal,
      COUNT(*) AS total_absen,
      SUM(CASE WHEN jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL THEN 1 ELSE 0 END) AS hadir_lengkap
    FROM absensi
    WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
    GROUP BY tanggal
    ORDER BY tanggal ASC
  `;

  db.query(sql, [bulan, tahun], (err, results) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data chart', error: err });

    const formatted = results.map(row => {
      const persentase = row.total_absen > 0
        ? Math.round((row.hadir_lengkap / row.total_absen) * 100)
        : 0;

      return {
        tanggal: new Date(row.tanggal).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        jumlah: row.hadir_lengkap,
        persentase
      };
    });

    res.json(formatted);
  });
};


// =====================
// DASHBOARD ADMIN
// =====================
// controllers/absensiController.js
exports.getDashboardStatistik = (req, res) => {
  const bulan = moment().month() + 1;
  const tahun = moment().year();

  const sqlHadir = `
    SELECT COUNT(*) AS total FROM absensi 
    WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
    AND jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL
  `;

  const sqlTerlambat = `
    SELECT COUNT(*) AS total FROM absensi 
    WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
    AND keterlambatan > 0
  `;

  const sqlIzinMenunggu = `
    SELECT COUNT(*) AS total FROM izin 
    WHERE status = 'Menunggu Validasi'
  `;

  const sqlPegawai = `SELECT COUNT(*) AS total FROM pegawai`;

  const tanggalKerja = generateTanggalKerja(bulan - 1, tahun);
  const hariKerjaBulanIni = tanggalKerja.length;

  db.query(sqlHadir, [bulan, tahun], (err, dataHadir) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data hadir', err });

    db.query(sqlTerlambat, [bulan, tahun], (err2, dataTerlambat) => {
      if (err2) return res.status(500).json({ message: 'Gagal ambil data terlambat', err2 });

      db.query(sqlIzinMenunggu, (err3, dataIzin) => {
        if (err3) return res.status(500).json({ message: 'Gagal ambil data izin', err3 });

        db.query(sqlPegawai, (err4, dataPegawai) => {
          if (err4) return res.status(500).json({ message: 'Gagal ambil data pegawai', err4 });

          return res.json({
            hadir: dataHadir[0].total,
            terlambat: dataTerlambat[0].total,
            izin_menunggu: dataIzin[0].total,
            total_pegawai: dataPegawai[0].total,
            hari_kerja: hariKerjaBulanIni,
          });
        });
      });
    });
  });
};


// =====================
// FUNCTION BANTUAN
// =====================
function hitungKeterlambatan() {
  const now = new Date();
  const jamMasuk = new Date(now);
  jamMasuk.setHours(8, 0, 0, 0);
  const selisihMs = now - jamMasuk;
  const selisihMenit = Math.floor(selisihMs / 60000);
  return selisihMenit > 0 ? selisihMenit : 0;
}

function formatKeterlambatan(menit) {
  const jam = Math.floor(menit / 60);
  const sisaMenit = menit % 60;
  if (jam > 0 && sisaMenit > 0) return `${jam} jam ${sisaMenit} menit`;
  if (jam > 0) return `${jam} jam`;
  return `${sisaMenit} menit`;
}

function formatRiwayat(item) {
  const keterlambatan = item.keterlambatan !== null ? formatKeterlambatan(item.keterlambatan) : '-';
  const persen = (item.jam_masuk && item.jam_keluar) ? '100%' : '-';
  const status = !item.jam_keluar ? 'Belum Pulang' : 'Selesai';
  const tanggalFormatted = new Date(item.tanggal).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return {
    ...item,
    tanggal: tanggalFormatted,
    keterlambatan,
    persen,
    status
  };
}



// Tambahkan logika auto-mark alpha harian (bisa dipanggil lewat cronjob harian)
exports.tandaiAlphaHarian = (req, res) => {
  const hariIni = moment().format('YYYY-MM-DD');
  const hari = moment().day(); // 0 = Minggu

  if (hari === 0) {
    return res.json({ message: 'Hari Minggu, tidak ada penandaan Alpha' });
  }

  const sqlPegawai = `SELECT id FROM pegawai`;
  db.query(sqlPegawai, (err, pegawaiList) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil pegawai', error: err });

    let selesai = 0;

    pegawaiList.forEach((pegawai) => {
      const sqlAbsen = `SELECT id FROM absensi WHERE pegawai_id = ? AND tanggal = ?`;
      db.query(sqlAbsen, [pegawai.id, hariIni], (err2, resultAbsen) => {
        if (err2) return;

        if (resultAbsen.length === 0) {
          const sqlIzin = `
            SELECT id FROM izin 
            WHERE pegawai_id = ? AND status = 'Disetujui' 
            AND ? BETWEEN tanggal_mulai AND tanggal_selesai
          `;
          db.query(sqlIzin, [pegawai.id, hariIni], (err3, resultIzin) => {
            if (err3) return;

            if (resultIzin.length === 0) {
              const sqlAlpha = `
                INSERT INTO absensi (pegawai_id, tanggal, status, is_alpha)
                VALUES (?, ?, 'Tidak Hadir', 1)
              `;
              db.query(sqlAlpha, [pegawai.id, hariIni], () => {});
            }

            selesai++;
            if (selesai === pegawaiList.length) {
              res.json({ message: 'Penandaan Alpha selesai untuk semua pegawai' });
            }
          });
        } else {
          selesai++;
          if (selesai === pegawaiList.length) {
            res.json({ message: 'Penandaan Alpha selesai untuk semua pegawai' });
          }
        }
      });
    });
  });
};
