// modules/absensi/absensiController.js
const moment = require('moment');
const dayjs = require('dayjs');
require('dayjs/locale/id');
dayjs.locale('id');

const absensiModel = require('./absensiModel');
const izinModel = require('../izin/izinModel');
const { generateTanggalKerja } = require('../../utils/dateUtils');

/* ================================
   ✅ ABSEN MASUK
   ================================ */
exports.absenMasuk = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    if (!pegawaiId) return res.status(401).json({ message: 'Pegawai ID tidak ditemukan di token' });

    const tanggalHariIni = moment().format('YYYY-MM-DD');

    const sudahAbsen = await absensiModel.cekSudahAbsenMasuk(pegawaiId, tanggalHariIni);
    if (sudahAbsen) return res.status(409).json({ message: 'Sudah absen masuk hari ini', type: 'sudah_masuk' });

    const izinDisetujui = await izinModel.cekIzinDisetujuiByUserDanTanggal(pegawaiId, tanggalHariIni);
    if (izinDisetujui) return res.status(403).json({ message: 'Tidak bisa absen, ada izin disetujui hari ini', type: 'izin_disetujui' });

    let lokasi = req.body.lokasi || (req.body.latitude && req.body.longitude ? `${req.body.latitude},${req.body.longitude}` : null);
    if (!lokasi) return res.status(400).json({ message: 'Lokasi tidak terkirim, absen dibatalkan' });

    const result = await absensiModel.insertAbsenMasuk(pegawaiId, lokasi);
    res.json({ message: 'Absen masuk berhasil', type: 'masuk', absen: result });
  } catch (err) {
    console.error('❌ Error absenMasuk:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   ✅ ABSEN KELUAR
   ================================ */
exports.absenKeluar = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    if (!pegawaiId) return res.status(401).json({ message: 'Pegawai ID tidak ditemukan di token' });

    const tanggalHariIni = moment().format('YYYY-MM-DD');

    const sudahAbsen = await absensiModel.cekSudahAbsenKeluar(pegawaiId, tanggalHariIni);
    if (sudahAbsen) return res.status(409).json({ message: 'Sudah absen pulang hari ini', type: 'sudah_keluar' });

    const izinDisetujui = await izinModel.cekIzinDisetujuiByUserDanTanggal(pegawaiId, tanggalHariIni);
    if (izinDisetujui) return res.status(403).json({ message: 'Tidak bisa absen, ada izin disetujui hari ini', type: 'izin_disetujui' });

    const dayIndex = moment().day();
    let jamPulangResmi = dayIndex === 6 ? "14:00:00" : "16:00:00";
    const sekarang = moment();
    const waktuPulangResmi = moment(`${tanggalHariIni} ${jamPulangResmi}`, "YYYY-MM-DD HH:mm:ss");
    const batasMax = moment(`${tanggalHariIni} 18:00:00`, "YYYY-MM-DD HH:mm:ss");

    if (sekarang.isBefore(waktuPulangResmi)) return res.status(403).json({ message: `Belum waktunya pulang. Jam pulang resmi: ${jamPulangResmi}`, type: 'belum_waktunya_pulang' });
    if (sekarang.isAfter(batasMax)) return res.status(403).json({ message: 'Batas waktu absen pulang (18:00) sudah terlewati', type: 'batas_waktu_terlewati' });

    let lokasi = req.body.lokasi || (req.body.latitude && req.body.longitude ? `${req.body.latitude},${req.body.longitude}` : null);

    const result = await absensiModel.insertAbsenKeluar(pegawaiId, lokasi);
    res.json({ message: 'Absen pulang berhasil', type: 'keluar', absen: result });
  } catch (err) {
    console.error('❌ Error absenKeluar:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   ✅ RIWAYAT HARI INI
   ================================ */
exports.getRiwayatHariIni = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    if (!pegawaiId) return res.status(400).json({ message: 'Pegawai ID tidak ditemukan' });

    const tanggalHariIni = moment().format('YYYY-MM-DD');
    const data = await absensiModel.getAbsenByTanggal(pegawaiId, tanggalHariIni);
    if (!data) return res.json([]);

    res.json([{
      tanggal: tanggalHariIni,
      jam_masuk: data.jam_masuk || null,
      jam_keluar: data.jam_keluar || null
    }]);
  } catch (err) {
    console.error('❌ Error getRiwayatHariIni:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   ✅ RIWAYAT ABSENSI LENGKAP
   ================================ */
exports.getRiwayatLengkap = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id ?? req.user?.id;
    const bulan = parseInt(req.query.bulan, 10);
    const tahun = parseInt(req.query.tahun, 10);

    if (!bulan || !tahun) {
      return res.status(400).json({ message: 'Parameter bulan dan tahun diperlukan.' });
    }

    const data = await absensiModel.getRiwayatLengkap(pegawaiId, bulan, tahun);

    res.json(data);
  } catch (error) {
    console.error('❌ getRiwayatLengkap error:', error);
    res.status(500).json({ message: 'Gagal mengambil data riwayat lengkap.' });
  }
};



/* ================================
   📊 STATISTIK & CHART
   ================================ */
exports.getStatistikPegawai = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    const bulan = parseInt(req.query.bulan) || (dayjs().month() + 1);
    const tahun = parseInt(req.query.tahun) || dayjs().year();
    const stats = await absensiModel.getStatistikPegawai(pegawaiId, bulan, tahun);
    res.json(stats);
  } catch (err) {
    console.error("❌ Error getStatistikPegawai:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getChartKehadiran = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    const bulan = parseInt(req.query.bulan) || (dayjs().month() + 1);
    const tahun = parseInt(req.query.tahun) || dayjs().year();
    const chart = await absensiModel.getChartKehadiran(pegawaiId, bulan, tahun);
    res.json(chart);
  } catch (err) {
    console.error("❌ Error getChartKehadiran:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getDashboardStatistik = (req, res) => {
  const userId = req.user.id;

  absensiModel.getStatistikDashboard(userId, (err, data) => {
    if (err) {
      console.error('Gagal ambil data dashboard:', err);
      return res.status(500).json({ message: 'Gagal ambil data dashboard' });
    }
    res.json(data);
  });
};


/* ================================
   📋 REKAP ADMIN
   ================================ */
exports.getRekap = (req, res) => {
  const { tanggal } = req.query;
  absensiModel.getRekap(tanggal, (err, data) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil data rekap" });
    res.json(data);
  });
};

exports.updateAbsensi = async (req, res) => {
  try {
    const { id } = req.params;
    const { jam_masuk, jam_keluar, keterlambatan } = req.body;
    await absensiModel.updateAbsensi(id, jam_masuk, jam_keluar, keterlambatan);
    res.json({ message: "Data absensi berhasil diperbarui" });
  } catch (err) {
    console.error("❌ Error updateAbsensi:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   ⏰ CRON
   ================================ */
exports.tandaiAlphaHarian = async (req, res) => {
  try {
    const result = await absensiModel.tandaiAlphaHarian();
    res.json(result);
  } catch (err) {
    console.error("❌ Error tandaiAlphaHarian:", err);
    res.status(500).json({ message: err.message });
  }
};
