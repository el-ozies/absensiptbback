const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/masuk', verifyToken, absensiController.absenMasuk);
router.post('/keluar', verifyToken, absensiController.absenKeluar);
router.get('/rekap', verifyToken, absensiController.getRekap);
router.get('/chart', verifyToken, absensiController.getChartKehadiran);
router.get('/riwayat', verifyToken, absensiController.getRiwayat);
router.get('/statistik', verifyToken, absensiController.getStatistikPegawai);



module.exports = router;
