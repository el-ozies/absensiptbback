// modules/absensi/absensiRoutes.js
const express = require('express');
const router = express.Router();
const absensiController = require('./absensiController');
const { verifyToken } = require('../../middleware/authMiddleware');

/* ==============================
   📌 CRUD & Riwayat Absensi Pegawai
   ============================== */

// ✅ Absen Masuk
router.post('/masuk', verifyToken, absensiController.absenMasuk);

// ✅ Absen Pulang
router.post('/keluar', verifyToken, absensiController.absenKeluar);

// ✅ Riwayat Hari Ini (untuk Absen.jsx)
router.get('/riwayat-hari-ini', verifyToken, absensiController.getRiwayatHariIni);

// ✅ Riwayat Lengkap Absensi Pegawai (filter bulan & tahun)
router.get('/riwayat-lengkap', verifyToken, absensiController.getRiwayatLengkap);

// (alias opsional untuk kompat FE/BE lama)
router.get('/riwayat', verifyToken, absensiController.getRiwayatLengkap);

/* ==============================
   📋 Rekap Admin
   ============================== */

// ✅ Rekap Absensi Semua Pegawai (filter tanggal)
router.get('/rekap', verifyToken, absensiController.getRekap);

// ✅ Update Data Absensi
// ⚠️ Perbaikan: JANGAN pakai '/absensi/:id' karena router ini dimount di '/absensi'
router.put('/:id', verifyToken, absensiController.updateAbsensi);

/* ==============================
   ⏰ Cron / Otomatisasi
   ============================== */

// ✅ Tandai Pegawai Alpha Harian
router.post('/tandai-alpha', absensiController.tandaiAlphaHarian);

/* ==============================
   📊 Dashboard (kalau masih dipakai oleh FE)
   ============================== */

router.get('/dashboard', verifyToken, absensiController.getDashboardStatistik);
router.get('/statistik', verifyToken, absensiController.getStatistikPegawai);
router.get('/chart', verifyToken, absensiController.getChartKehadiran);

module.exports = router;
