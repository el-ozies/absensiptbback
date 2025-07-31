const express = require('express');
const router = express.Router();
const izinController = require('../controllers/izinController');
const verifyToken = require('../middleware/authMiddleware');

// ✅ Ajukan izin (pegawai login)
router.post('/', verifyToken, izinController.ajukanIzin);

// ✅ Ambil riwayat izin milik pegawai yang login (untuk halaman pegawai)
router.get('/riwayat', verifyToken, izinController.getRiwayatIzin);

router.get('/all', verifyToken, izinController.getSemuaIzin);


router.put('/:id', izinController.validasiIzin);

// ✅ Ambil semua data izin (admin) → dengan nama pegawai
router.get('/all', verifyToken, izinController.getAllIzin);

// ✅ Ambil izin berdasarkan pegawai_id tertentu (opsional untuk admin detail pegawai)
router.get('/pegawai/:pegawai_id', verifyToken, izinController.getIzinByPegawai);

module.exports = router;
