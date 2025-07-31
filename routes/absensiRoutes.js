const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const verifyToken = require('../middleware/authMiddleware');

// Absensi pegawai
router.post('/masuk', verifyToken, absensiController.absenMasuk);
router.post('/keluar', verifyToken, absensiController.absenKeluar);
router.get('/riwayat', verifyToken, absensiController.getRiwayatLengkap);

// Statistik & Chart
router.get('/statistik', verifyToken, absensiController.getStatistikPegawai);
router.get('/chart', verifyToken, absensiController.getChartKehadiran);
router.get('/dashboard', verifyToken, absensiController.getDashboardStatistik);
router.get('/dashboard', verifyToken, absensiController.getDashboardStatistik);

// Rekap Admin
router.get('/rekap', verifyToken, absensiController.getRekap);

// Cronjob: Penanda Alpha harian
router.post('/tandai-alpha', absensiController.tandaiAlphaHarian);

module.exports = router;
