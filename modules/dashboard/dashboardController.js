// modules/dashboard/dashboardController.js
const db = require('../../config/db');
const dashboardModel = require('./dashboardModel');
const dayjs = require('dayjs');
const { getJamKerjaDetail } = require('../../utils/dateUtils');
// ==============================
// 📊 Statistik Dashboard Pegawai
// ==============================
exports.getDashboardPegawai = async (req, res) => {
  try {
    const pegawaiId = req.user?.pegawai_id;
    if (!pegawaiId) {
      return res.status(400).json({ message: 'Pegawai ID tidak ditemukan' });
    }

    let bulan = parseInt(req.query.bulan);
    let tahun = parseInt(req.query.tahun);
    if (isNaN(bulan) || bulan < 1 || bulan > 12) bulan = dayjs().month() + 1;
    if (isNaN(tahun) || tahun < 2000) tahun = dayjs().year();

    const data = await dashboardModel.getDashboardStatPegawai(pegawaiId, bulan, tahun);

    res.json({
      total_hadir: data.total_hadir || 0,
      total_izin: data.total_izin || 0,
      total_alpha: data.total_alpha || 0,
      rata_keterlambatan: data.rata_keterlambatan || 0
    });
  } catch (err) {
    console.error('❌ Error getDashboardPegawai:', err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 📊 Statistik Dashboard Admin
// ==============================
exports.getDashboardStatistik = async (req, res) => {
  try {
    const data = await dashboardModel.getDashboardStatistik(); // Promise mode
    return res.json(data);
  } catch (err) {
    console.error('Gagal ambil data dashboard:', err);
    return res.status(500).json({ message: 'Gagal ambil data dashboard' });
  }
};

// ==============================
// 📈 Chart Kehadiran Admin
// ==============================
exports.getChartKehadiranAdmin = (req, res) => {
  const { bulan, tahun } = req.query;
  dashboardModel.getChartKehadiranAdmin(bulan, tahun, (err, results) => {
    if (err) {
      console.error("❌ Gagal ambil data chart kehadiran admin:", err);
      return res.status(500).json({ message: "Gagal ambil chart" });
    }
    res.json(results);
  });
};

// ==============================
// 📈 Chart Kehadiran Pegawai
// ==============================
exports.getChartKehadiranPegawai = (req, res) => {
  const pegawaiId = req.user?.pegawai_id;
  if (!pegawaiId) {
    return res.status(400).json({ message: 'Pegawai ID tidak ditemukan' });
  }

  const { bulan, tahun } = req.query;
  dashboardModel.getChartKehadiranPegawai(pegawaiId, bulan, tahun, (err, results) => {
    if (err) {
      console.error("❌ Gagal ambil data chart kehadiran pegawai:", err);
      return res.status(500).json({ message: "Gagal ambil chart" });
    }
    res.json(results);
  });
};

// ==============================
// 📋 Pegawai Belum Pulang
// ==============================
exports.getBelumPulang = (req, res) => {
  dashboardModel.getBelumPulang((err, results) => {
    if (err) {
      console.error("❌ Gagal ambil data belum pulang:", err);
      return res.status(500).json({ message: "Gagal ambil data belum pulang" });
    }
    res.json(results.map(row => row.nama));
  });
};
