const express = require('express');
const router = express.Router();
const izinController = require('../controllers/izinController');
const verifyToken = require('../middleware/authMiddleware');

// Ajukan izin (pegawai)
router.post('/', verifyToken, izinController.ajukanIzin);

// Ambil riwayat izin milik pegawai yang login
router.get('/riwayat', verifyToken, izinController.getRiwayatIzin);

// Ambil semua data izin (admin)
router.get('/all', verifyToken, izinController.getAllIzin);

// Ambil data izin berdasarkan ID pegawai tertentu
router.get('/:pegawai_id', verifyToken, izinController.getIzinByPegawai);

// Validasi izin (admin)
router.put('/validasi/:id', verifyToken, izinController.validasiIzin);

module.exports = router;
