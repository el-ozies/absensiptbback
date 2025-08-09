// modules/dashboard/dashboardModel.js
const db = require('../../config/db');
const { generateTanggalKerja } = require("../../utils/dateUtils");
const dayjs = require('dayjs');
const absensiModel = require('../absensi/absensiModel');

// ==============================
// 📊 Statistik Dashboard Pegawai
// ==============================
exports.getDashboardStatPegawai = async (pegawaiId, bulan, tahun) => {
  // Ambil riwayat lengkap (satu-satunya sumber kebenaran)
  const { riwayat, total_hadir, total_izin, total_alpha } =
    await absensiModel.getRiwayatLengkap(pegawaiId, bulan, tahun);

  // Rata-rata keterlambatan: dari field riwayat.keterlambatan yang berbentuk "X jam Y menit" / "Y menit" / "-"
  // -> konversi ke menit (hanya nilai positif), lalu ambil rata-rata pembagi = jumlah hari yang punya nilai keterlambatan > 0
  const toMinutes = (s) => {
    if (!s || s === '-' ) return 0;
    // match "X jam Y menit" atau "Y menit"
    const rJamMenit = /(\d+)\s*jam\s*(\d+)\s*menit/i;
    const rMenitOnly = /(\d+)\s*menit/i;

    if (rJamMenit.test(s)) {
      const [, j, m] = s.match(rJamMenit);
      return (parseInt(j, 10) * 60) + parseInt(m, 10);
    }
    if (rMenitOnly.test(s)) {
      const [, m] = s.match(rMenitOnly);
      return parseInt(m, 10);
    }
    return 0;
  };

  let sumMenit = 0;
  let countHari = 0;
  for (const row of riwayat) {
    const menit = toMinutes(row.keterlambatan);
    if (menit > 0) {
      sumMenit += menit;
      countHari += 1;
    }
  }
  const rata_keterlambatan = countHari > 0 ? Math.round(sumMenit / countHari) : 0;

  return {
    total_hadir: total_hadir || 0,
    total_izin: total_izin || 0,
    total_alpha: total_alpha || 0,
    rata_keterlambatan
  };
};

// ==============================
// 📊 Statistik Dashboard Admin
// ==============================
function formatDurasi(menit) {
  if (menit == null || Number.isNaN(menit) || menit <= 0) return '-';
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return jam > 0 ? `${jam} jam ${sisa} menit` : `${sisa} menit`;
}
function hitungMenitAktualNumber(tanggalYYYYMMDD, jamMasuk, jamKeluar, istirahatMenit = 60) {
  if (!jamMasuk || !jamKeluar) return 0;
  const masuk  = dayjs(`${tanggalYYYYMMDD} ${jamMasuk}`,  'YYYY-MM-DD HH:mm:ss', true);
  const keluar = dayjs(`${tanggalYYYYMMDD} ${jamKeluar}`, 'YYYY-MM-DD HH:mm:ss', true);
  if (!masuk.isValid() || !keluar.isValid()) return 0;
  const total = keluar.diff(masuk, 'minute') - (istirahatMenit || 0);
  return total > 0 ? total : 0;
}
function ambangHadirMenit(dayIndex) {
  if (dayIndex === 6) return 3 * 60; // Sabtu
  if (dayIndex === 5) return 4 * 60; // Jumat
  if (dayIndex === 0) return Infinity; // Minggu
  return 5 * 60; // Sen–Kam
}
function tentukanStatus({
  dayIndex, tanggalKey, jamMasuk, jamKeluar,
  jamWajibMulai, jamWajibAkhir, istirahatMenit, izinDisetujui
}) {
  if (dayIndex === 0) return 'Libur';
  if (izinDisetujui) return 'Izin (Disetujui)';

  const adaMasuk = !!jamMasuk;
  const adaKeluar = !!jamKeluar;

  if (!adaMasuk && !adaKeluar) return 'Alpha';

  const akhirKerja = dayjs(`${tanggalKey} ${jamWajibAkhir}`, 'YYYY-MM-DD HH:mm:ss', true);
  const batasMax   = dayjs(`${tanggalKey} 18:00:00`,          'YYYY-MM-DD HH:mm:ss', true);
  const now        = dayjs();

  if (adaMasuk && !adaKeluar) {
    if (now.isBefore(akhirKerja)) return 'Sedang Bekerja';
    if ((now.isAfter(akhirKerja) && (now.isBefore(batasMax) || now.isSame(batasMax))) || now.isSame(akhirKerja)) {
      return 'Belum Pulang';
    }
    if (now.isAfter(batasMax)) return 'Alpha';
  }

  const menitAktual = hitungMenitAktualNumber(tanggalKey, jamMasuk, jamKeluar, istirahatMenit);
  return menitAktual >= ambangHadirMenit(dayIndex) ? 'Hadir' : 'Alpha';
}

// ====== Statistik Admin (sinkron rekap - HARI INI) ======
exports.getDashboardStatistik = () => {
  return new Promise((resolve, reject) => {
    const today = dayjs().format('YYYY-MM-DD');
    const bulan = dayjs().month() + 1;
    const tahun = dayjs().year();
    const dayIndex = dayjs(today).day();

    // Ambil master pegawai (exclude admin), + absensi hari ini, + izin yang overlap hari ini
    const sql = `
      SELECT 
        p.id AS pegawai_id, p.nama,
        a.jam_masuk, a.jam_keluar,
        CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END AS izin_hari_ini
      FROM pegawai p
      JOIN users u ON u.pegawai_id = p.id AND u.role = 'pegawai'
      LEFT JOIN absensi a 
        ON a.pegawai_id = p.id AND a.tanggal = ?
      LEFT JOIN izin i
        ON i.pegawai_id = p.id
       AND i.status = 'disetujui'
       AND ? BETWEEN DATE(i.tanggal_mulai) AND DATE(i.tanggal_selesai)
    `;

    db.query(sql, [today, today], (err, rows) => {
      if (err) return reject(err);

      // Hitung status per pegawai sesuai rekap
      // (detail jam kerja resmi)
      const { jam_masuk: jamWajibMasuk, jam_pulang: jamPulangResmi, istirahat } =
        require('../../utils/dateUtils').getJamKerjaDetail(dayIndex);

      let hadir = 0;
      let belum_pulang = 0;     // termasuk "Sedang Bekerja" & "Belum Pulang"
      let alpha_hari_ini = 0;

      for (const r of rows) {
        const status = tentukanStatus({
          dayIndex,
          tanggalKey: today,
          jamMasuk: r.jam_masuk || null,
          jamKeluar: r.jam_keluar || null,
          jamWajibMulai: jamWajibMasuk,
          jamWajibAkhir: jamPulangResmi,
          istirahatMenit: istirahat,
          izinDisetujui: !!r.izin_hari_ini
        });

        if (status === 'Hadir') hadir++;
        if (status === 'Sedang Bekerja' || status === 'Belum Pulang') belum_pulang++;
        if (status === 'Alpha') alpha_hari_ini++;
      }

      // Total pegawai aktif
      const totalPegawai = rows.length;

      // Izin menunggu validasi
      const sqlIzinMenunggu = `SELECT COUNT(*) AS izin_menunggu FROM izin WHERE status = 'menunggu'`;
      db.query(sqlIzinMenunggu, (e1, r1) => {
        if (e1) return reject(e1);
        const izin_menunggu = r1[0]?.izin_menunggu || 0;

        // Total izin disetujui HARI INI
        const sqlIzinHariIni = `
          SELECT COUNT(*) AS total_izin
          FROM izin
          WHERE status = 'disetujui'
            AND ? BETWEEN DATE(tanggal_mulai) AND DATE(tanggal_selesai)
        `;
        db.query(sqlIzinHariIni, [today], (e2, r2) => {
          if (e2) return reject(e2);
          const total_izin = r2[0]?.total_izin || 0;

          // Hari kerja bulan ini (Sen–Sab) s/d hari ini
          const hari_kerja = generateTanggalKerja(bulan, tahun).length;

          resolve({
            hadir,
            belum_pulang,
            alpha: alpha_hari_ini,  // sinkron dgn rekap: Alpha HARI INI
            total_pegawai: totalPegawai,
            izin_menunggu,
            total_izin,
            hari_kerja
          });
        });
      });
    });
  });
};

// ==============================
// 📈 Chart Kehadiran Admin
// ==============================
exports.getChartKehadiranAdmin = (bulan, tahun, callback) => {
  const tanggalKerja = generateTanggalKerja(bulan, tahun); // hasil array tanggal kerja

  const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-31`;

  const query = `
    SELECT 
      DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal,
      COUNT(*) AS jumlah_hadir
    FROM absensi
    WHERE tanggal BETWEEN ? AND ?
      AND jam_masuk IS NOT NULL
      AND jam_keluar IS NOT NULL
    GROUP BY DATE(tanggal)
  `;

  db.query(query, [startDate, endDate], (err, results) => {
    if (err) return callback(err);

    // ubah hasil DB jadi map { tanggal: jumlah_hadir }
    const hasilMap = {};
    results.forEach(row => {
      hasilMap[row.tanggal] = row.jumlah_hadir;
    });

    // Gabungkan tanggalKerja dengan hasil absensi
    const dataChart = tanggalKerja.map(tgl => {
      const [tahun, bulan, tanggal] = tgl.split('-');
      const label = `${tanggal} ${dayjs(tgl).format('MMM')}`; // contoh: 25 Jul
      return {
        tanggal: label,
        jumlah_hadir: hasilMap[tgl] || 0
      };
    });

    callback(null, dataChart);
  });
};
// ==============================
// 📈 Chart Kehadiran Pegawai
// ==============================
exports.getChartKehadiranPegawai = (pegawaiId, bulan, tahun, callback) => {
  const query = `
    SELECT
      DATE_FORMAT(tanggal, '%d %b') AS tanggal,
      CASE 
        WHEN jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL THEN 100
        WHEN jam_masuk IS NOT NULL AND jam_keluar IS NULL THEN 50
        ELSE 0
      END AS persentase
    FROM absensi
    WHERE pegawai_id = ? 
      AND MONTH(tanggal) = ? 
      AND YEAR(tanggal) = ?
    ORDER BY DATE(tanggal)
  `;
  db.query(query, [pegawaiId, bulan, tahun], (err, results) => {
    if (err) return callback(err);
    callback(null, results);
  });
};

// ==============================
// 📋 Pegawai Belum Pulang
// ==============================
exports.getBelumPulang = (callback) => {
  const query = `
    SELECT p.nama
    FROM pegawai p
    LEFT JOIN absensi a
      ON p.id = a.pegawai_id
      AND DATE(a.tanggal) = CURDATE()
    WHERE a.jam_keluar IS NULL 
      AND a.jam_masuk IS NOT NULL
  `;
  db.query(query, callback);
};