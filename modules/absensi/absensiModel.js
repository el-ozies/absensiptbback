// modules/absensi/absensiModel.js
const db = require('../../config/db');
const moment = require('moment');
const dayjs = require('dayjs');
require('dayjs/locale/id');
dayjs.locale('id');

// 💡 utils date
const { generateTanggalKerja, getJamKerjaDetail } = require('../../utils/dateUtils');

/* ================================
   Helpers aman (no NaN)
   ================================ */

// format menit → "X jam Y menit" | "Y menit" | "-"
function formatDurasi(menit) {
  if (menit == null || Number.isNaN(menit) || menit <= 0) return '-';
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return jam > 0 ? `${jam} jam ${sisa} menit` : `${sisa} menit`;
}

// hitung menit aktual numerik (flat minus istirahat seperti utils kamu)
function hitungMenitAktualNumber(tanggalYYYYMMDD, jamMasuk, jamKeluar, istirahatMenit = 60) {
  if (!jamMasuk || !jamKeluar) return 0;
  const masuk  = dayjs(`${tanggalYYYYMMDD} ${jamMasuk}`,  'YYYY-MM-DD HH:mm:ss', true);
  const keluar = dayjs(`${tanggalYYYYMMDD} ${jamKeluar}`, 'YYYY-MM-DD HH:mm:ss', true);
  if (!masuk.isValid() || !keluar.isValid()) return 0;
  const total = keluar.diff(masuk, 'minute') - (istirahatMenit || 0);
  return total > 0 ? total : 0;
}

// jam kerja aktual (string, pakai tanggal+jam)
function hitungJamKerjaSafe(tanggalYYYYMMDD, jamMasuk, jamKeluar, istirahatMenit = 60) {
  const menit = hitungMenitAktualNumber(tanggalYYYYMMDD, jamMasuk, jamKeluar, istirahatMenit);
  return menit > 0 ? formatDurasi(menit) : '-';
}

// keterlambatan (string) dari jam wajib masuk
function hitungKeterlambatanSafe(tanggalYYYYMMDD, jamMasuk, jamWajibMasuk) {
  if (!jamMasuk || !jamWajibMasuk) return '-';
  const masuk = dayjs(`${tanggalYYYYMMDD} ${jamMasuk}`,      'YYYY-MM-DD HH:mm:ss', true);
  const wajib = dayjs(`${tanggalYYYYMMDD} ${jamWajibMasuk}`, 'YYYY-MM-DD HH:mm:ss', true);
  if (!masuk.isValid() || !wajib.isValid()) return '-';
  const diffMenit = masuk.diff(wajib, 'minute');
  return diffMenit > 0 ? formatDurasi(diffMenit) : '-';
}

// ambang hadir (menit) berdasarkan dayIndex (0=Min,1=Sen,...,6=Sab)
function ambangHadirMenit(dayIndex) {
  if (dayIndex === 6) return 3 * 60; // Sabtu
  if (dayIndex === 5) return 4 * 60; // Jumat
  if (dayIndex === 0) return Infinity; // Minggu (libur, tak dihitung)
  return 5 * 60; // Sen–Kam
}

// tentukan status sesuai aturanmu
function tentukanStatus({
  dayIndex,
  tanggalKey,         // "YYYY-MM-DD"
  jamMasuk,           // "HH:mm:ss" | null
  jamKeluar,          // "HH:mm:ss" | null
  jamWajibMulai,      // "HH:mm:ss" | null
  jamWajibAkhir,      // "HH:mm:ss" | null
  istirahatMenit,     // number
  izinDisetujui,      // boolean
}) {
  if (dayIndex === 0) return 'Libur';
  if (izinDisetujui) return 'Izin (Disetujui)';

  const adaMasuk = !!jamMasuk;
  const adaKeluar = !!jamKeluar;

  if (!adaMasuk && !adaKeluar) return 'Alpha';

  const akhirKerja = dayjs(`${tanggalKey} ${jamWajibAkhir}`, 'YYYY-MM-DD HH:mm:ss', true);
  const batasMax   = dayjs(`${tanggalKey} 18:00:00`,         'YYYY-MM-DD HH:mm:ss', true);
  const now        = dayjs();

  // belum checkout
  if (adaMasuk && !adaKeluar) {
    if (now.isBefore(akhirKerja)) return 'Sedang Bekerja';
    if ((now.isAfter(akhirKerja) && (now.isBefore(batasMax) || now.isSame(batasMax))) || now.isSame(akhirKerja)) {
      return 'Belum Pulang';
    }
    if (now.isAfter(batasMax)) return 'Alpha';
  }

  // sudah checkout → cek ambang menit aktual
  const menitAktual = hitungMenitAktualNumber(tanggalKey, jamMasuk, jamKeluar, istirahatMenit);
  return menitAktual >= ambangHadirMenit(dayIndex) ? 'Hadir' : 'Alpha';
}

/* ================================
   🔍 VALIDASI ABSENSI
   ================================ */
exports.cekSudahAbsenMasuk = (pegawaiId, tanggal) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 1 FROM absensi 
      WHERE pegawai_id = ? AND tanggal = ? AND jam_masuk IS NOT NULL 
      LIMIT 1
    `;
    db.query(sql, [pegawaiId, tanggal], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.length > 0);
    });
  });
};

exports.cekSudahAbsenKeluar = (pegawaiId, tanggal) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 1 FROM absensi 
      WHERE pegawai_id = ? AND tanggal = ? AND jam_keluar IS NOT NULL 
      LIMIT 1
    `;
    db.query(sql, [pegawaiId, tanggal], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.length > 0);
    });
  });
};

/* ================================
   📝 INSERT ABSENSI
   ================================ */
exports.insertAbsenMasuk = (pegawaiId, lokasi) => {
  return new Promise((resolve, reject) => {
    const tanggal = moment().format('YYYY-MM-DD');
    const jam_masuk = moment().format('HH:mm:ss');
    const sql = `
      INSERT INTO absensi (pegawai_id, tanggal, jam_masuk, lokasi_masuk)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [pegawaiId, tanggal, jam_masuk, lokasi], (err, result) => {
      if (err) return reject(err);
      resolve({ id: result.insertId, tanggal, jam_masuk, lokasi_masuk: lokasi });
    });
  });
};

exports.insertAbsenKeluar = (pegawaiId, lokasi) => {
  return new Promise((resolve, reject) => {
    const tanggal = moment().format('YYYY-MM-DD');
    const jam_keluar = moment().format('HH:mm:ss');
    const sql = `
      UPDATE absensi 
      SET jam_keluar = ?, lokasi_keluar = ? 
      WHERE pegawai_id = ? AND tanggal = ?
    `;
    db.query(sql, [jam_keluar, lokasi, pegawaiId, tanggal], (err) => {
      if (err) return reject(err);
      resolve({ tanggal, jam_keluar, lokasi_keluar: lokasi });
    });
  });
};

/* ================================
   📅 AMBIL ABSENSI
   ================================ */
exports.getAbsenByTanggal = (pegawaiId, tanggal) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM absensi 
      WHERE pegawai_id = ? AND tanggal = ? 
      LIMIT 1
    `;
    db.query(sql, [pegawaiId, tanggal], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
};

/* ================================
   📜 RIWAYAT LENGKAP (status final)
   ================================ */
exports.getRiwayatLengkap = (pegawaiId, bulan, tahun) => {
  return new Promise((resolve, reject) => {
    const awalBulan  = dayjs(`${tahun}-${String(bulan).padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
    const akhirBulan = dayjs(awalBulan).endOf('month').format('YYYY-MM-DD');

    const sqlAbsensi = `
      SELECT tanggal, jam_masuk, jam_keluar
      FROM absensi
      WHERE pegawai_id = ? AND tanggal BETWEEN ? AND ?
    `;

    const sqlIzin = `
      SELECT tanggal_mulai, tanggal_selesai
      FROM izin
      WHERE pegawai_id = ?
        AND status = 'disetujui'
        AND (
          (tanggal_mulai BETWEEN ? AND ?)
          OR (tanggal_selesai BETWEEN ? AND ?)
          OR (? BETWEEN tanggal_mulai AND tanggal_selesai)
          OR (? BETWEEN tanggal_mulai AND tanggal_selesai)
        )
    `;

    db.query(sqlAbsensi, [pegawaiId, awalBulan, akhirBulan], (err, absensiRows) => {
      if (err) return reject(err);

      db.query(sqlIzin, [pegawaiId, awalBulan, akhirBulan, awalBulan, akhirBulan, awalBulan, akhirBulan], (err2, izinRows) => {
        if (err2) return reject(err2);

        const tanggalKerja = generateTanggalKerja(bulan, tahun); // ["YYYY-MM-DD", ...] (tanpa Minggu, s/d hari ini)

        // Map absensi per tanggal
        const mapAbsensi = {};
        for (const a of absensiRows) {
          const key = dayjs(a.tanggal).format('YYYY-MM-DD');
          mapAbsensi[key] = { jam_masuk: a.jam_masuk, jam_keluar: a.jam_keluar };
        }

        // Ekspansi izin ke set tanggal
        const izinSet = new Set();
        for (const i of izinRows) {
          let tMulai = dayjs(i.tanggal_mulai).startOf('day');
          const tSelesai = dayjs(i.tanggal_selesai).startOf('day');
          while (tMulai.diff(tSelesai, 'day') <= 0) {
            izinSet.add(tMulai.format('YYYY-MM-DD'));
            tMulai = tMulai.add(1, 'day');
          }
        }

        let total_hadir = 0;
        let total_izin  = 0;
        let total_alpha = 0;

        const riwayat = tanggalKerja.map((tgl) => {
          const dayIndex = dayjs(tgl).day();
          const { jam_masuk: jamWajibMasuk, jam_pulang: jamPulangResmi, istirahat, jam_kerja } = getJamKerjaDetail(dayIndex);

          const rec    = mapAbsensi[tgl] || {};
          const masuk  = rec.jam_masuk || null;
          const keluar = rec.jam_keluar || null;

          // status
          let status = tentukanStatus({
            dayIndex,
            tanggalKey: tgl,
            jamMasuk: masuk,
            jamKeluar: keluar,
            jamWajibMulai: jamWajibMasuk,
            jamWajibAkhir: jamPulangResmi,
            istirahatMenit: istirahat,
            izinDisetujui: izinSet.has(tgl),
          });

          // hitung ringkasan (hari kerja saja; tanggalKerja memang tanpa Minggu)
          if (status === 'Hadir') total_hadir++;
          else if (status.startsWith('Izin')) total_izin++;
          else if (status === 'Alpha') total_alpha++;

          return {
            tanggal: dayjs(tgl).locale('id').format('dddd, D MMMM YYYY'),
            jam_wajib: jam_kerja,                                // "08:00 - 16:00"
            jam_masuk: masuk || '-',
            jam_pulang: keluar || '-',                           // catatan: frontend boleh tampil "jam_keluar"
            jam_aktual: (masuk && keluar) ? hitungJamKerjaSafe(tgl, masuk, keluar, istirahat) : '-',
            keterlambatan: masuk ? hitungKeterlambatanSafe(tgl, masuk, jamWajibMasuk) : '-',
            status,
          };
        });

        resolve({
          riwayat,
          total_hadir,
          total_izin,
          total_alpha,
          total_hari_kerja: tanggalKerja.length,
        });
      });
    });
  });
};


/* ================================
   📋 REKAP ADMIN (pakai aturan yang sama)
   ================================ */
exports.getRekap = (tanggal, callback) => {
  if (!tanggal) return callback(null, []);
  const hari = dayjs(tanggal).day(); // 0=Min..6=Sab
  if (hari === 0) return callback(null, []); // Minggu

  const sql = `
    SELECT DISTINCT
      p.id AS pegawai_id, p.nama, p.nip,
      a.id AS absensi_id, a.jam_masuk, a.jam_keluar,
      i.status AS status_izin
    FROM pegawai p
    JOIN users u
      ON u.pegawai_id = p.id
     AND u.role = 'pegawai'                 -- ⬅️ hanya pegawai
    LEFT JOIN absensi a 
      ON p.id = a.pegawai_id 
     AND a.tanggal = ?
    LEFT JOIN izin i 
      ON p.id = i.pegawai_id 
     AND ? BETWEEN DATE(i.tanggal_mulai) AND DATE(i.tanggal_selesai)
     AND i.status = 'disetujui'
    ORDER BY p.nama ASC
  `;

  db.query(sql, [tanggal, tanggal], (err, results) => {
    if (err) return callback(err);

    const { jam_masuk: jamWajibMasuk, jam_pulang: jamPulangResmi, istirahat } = getJamKerjaDetail(hari);
    const now = dayjs();

    const data = results.map(row => {
      let jam_aktual = 0;
      if (row.jam_masuk && row.jam_keluar) {
        const menitAkt = hitungMenitAktualNumber(tanggal, row.jam_masuk, row.jam_keluar, istirahat);
        jam_aktual = menitAkt / 60;
      }

      let status = 'Alpha';
      if (row.status_izin) {
        status = 'Izin';
      } else if (row.jam_masuk && !row.jam_keluar) {
        const akhirKerja = dayjs(`${tanggal} ${jamPulangResmi}`, 'YYYY-MM-DD HH:mm:ss', true);
        const batasMax   = dayjs(`${tanggal} 18:00:00`,          'YYYY-MM-DD HH:mm:ss', true);
        if (now.isBefore(akhirKerja)) status = 'Sedang Bekerja';
        else if ((now.isAfter(akhirKerja) && (now.isBefore(batasMax) || now.isSame(batasMax))) || now.isSame(akhirKerja)) status = 'Belum Pulang';
        else status = 'Alpha';
      } else if (row.jam_masuk && row.jam_keluar) {
        const menitAkt = hitungMenitAktualNumber(tanggal, row.jam_masuk, row.jam_keluar, istirahat);
        status = menitAkt >= ambangHadirMenit(hari) ? 'Hadir' : 'Alpha';
      }

      let jam_wajib = 0;
      if (hari >= 1 && hari <= 4) jam_wajib = 7; // Sen–Kam
      else if (hari === 5) jam_wajib = 6;        // Jumat
      else if (hari === 6) jam_wajib = 5;        // Sabtu

      return {
        absensi_id: row.absensi_id || null,
        pegawai_id: row.pegawai_id,
        nama: row.nama,
        nip: row.nip,
        tanggal,
        jam_wajib,
        jam_masuk: row.jam_masuk || '',
        jam_keluar: row.jam_keluar || '',
        jam_aktual: jam_aktual.toFixed(1),
        keterlambatan: row.jam_masuk ? hitungKeterlambatanSafe(tanggal, row.jam_masuk, jamWajibMasuk) : '-',
        status
      };
    });

    callback(null, data);
  });
};


/* ================================
   🛠 UPDATE ABSENSI
   ================================ */
exports.updateAbsensi = (id, jam_masuk, jam_keluar, keterlambatan) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE absensi 
      SET jam_masuk = ?, jam_keluar = ?, keterlambatan = ? 
      WHERE id = ?
    `;
    db.query(sql, [jam_masuk || null, jam_keluar || null, keterlambatan || 0, id], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

/* ================================
   ⏰ CRON: Tandai Alpha Harian
   ================================ */
exports.tandaiAlphaHarian = () => {
  return new Promise((resolve, reject) => {
    const today = moment().format('YYYY-MM-DD');
    const sql = `
      INSERT INTO absensi (pegawai_id, tanggal, status)
      SELECT p.id, ?, 'Alpha'
      FROM pegawai p
      JOIN users u
        ON u.pegawai_id = p.id
       AND u.role = 'pegawai'                   -- ⬅️ hanya pegawai
      WHERE p.id NOT IN (
        SELECT pegawai_id FROM absensi WHERE tanggal = ?
      )
    `;
    db.query(sql, [today, today], (err) => {
      if (err) return reject(err);
      resolve({ message: 'Berhasil tandai alpha' });
    });
  });
};


/* ================================
   📊 Statistik Dashboard (opsional tetap)
   ================================ */
exports.getStatistikDashboard = (pegawaiId, callback) => {
  const bulanIni = dayjs().month() + 1;
  const tahunIni = dayjs().year();

  // Tetap sederhana (tidak menghitung ambang di SQL). Kalau mau disesuaikan
  // ke ambang menit aktual, kita bisa bikin view/CASE yang cukup panjang.
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM absensi 
        WHERE pegawai_id = ? 
        AND jam_masuk IS NOT NULL 
        AND jam_keluar IS NOT NULL 
        AND MONTH(tanggal) = ? 
        AND YEAR(tanggal) = ?) AS total_hadir,

      (SELECT COUNT(*) FROM absensi 
        WHERE pegawai_id = ? 
        AND jam_masuk IS NOT NULL 
        AND jam_keluar IS NULL 
        AND HOUR(NOW()) >= 18
        AND MONTH(tanggal) = ? 
        AND YEAR(tanggal) = ?) AS belum_pulang,

      (SELECT COUNT(*) FROM izin 
        WHERE pegawai_id = ? 
        AND status = 'disetujui'
        AND MONTH(tanggal_mulai) = ? 
        AND YEAR(tanggal_mulai) = ?) AS total_izin
  `;

  db.query(sql, [
    pegawaiId, bulanIni, tahunIni,
    pegawaiId, bulanIni, tahunIni,
    pegawaiId, bulanIni, tahunIni
  ], (err, result) => {
    if (err) return callback(err);
    callback(null, result[0]);
  });
};
